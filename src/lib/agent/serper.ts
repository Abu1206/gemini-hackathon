export interface SerperResult {
  title: string;
  link: string;
  snippet: string;
}

export class SerperService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async search(query: string, limit: number = 5): Promise<SerperResult[]> {
    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: query,
        num: limit,
      }),
    });

    if (!response.ok) {
      throw new Error(`Serper API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.organic || [];
  }

  async searchSocialBuzz(query: string): Promise<SerperResult[]> {
    return this.search(query, 10);
  }

  async searchImages(query: string): Promise<string[]> {
    const response = await fetch("https://google.serper.dev/images", {
      method: "POST",
      headers: {
        "X-API-KEY": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: query,
        num: 15, // Increase to 15 to ensure we get enough valid ones after filtering
      }),
    });

    if (!response.ok) {
      console.warn(`Serper Image API error: ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    return (data.images || [])
      .map((img: any) => img.imageUrl)
      .filter((url: string) => {
        const lower = url.toLowerCase();
        return !lower.includes("tiktok.com") && !lower.includes("facebook.com");
      });
  }

  async getVibeContext(location: string, occasion: string): Promise<string> {
    const queries = [
      `site:tiktok.com trending fun places in ${location} for ${occasion}`,
      `site:x.com must visit ${location} ${occasion} spots`,
      `recent reviews for fun spots in ${location}`,
    ];

    try {
      const results = await Promise.all(
        queries.map((q) => this.searchSocialBuzz(q))
      );
      const flattened = results.flat();

      return flattened
        .map((r) => `[${r.title}]: ${r.snippet}`)
        .join("\n---\n")
        .slice(0, 4000); // Limit context size for Gemini
    } catch (error) {
      console.error("Serper context gathering failed:", error);
      return "No real-time social data available.";
    }
  }
}
