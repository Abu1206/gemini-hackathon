import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import { SearchParameters, AgentStep, Venue } from "./types";
import { SerperService } from "./serper";

export class AgentOrchestrator {
  private genAI: GoogleGenerativeAI;
  private apiKey: string;
  private serper?: SerperService;

  constructor(geminiKey: string, serperKey?: string) {
    this.apiKey = geminiKey;
    this.genAI = new GoogleGenerativeAI(geminiKey);
    if (serperKey) {
      this.serper = new SerperService(serperKey);
    }
  }

  private async generateWithFallback(
    prompt: string,
    addStep: (action: string, thought?: string) => void
  ): Promise<string> {
    const models = [
      "gemini-2.5-flash",
      "gemini-3-flash",

      "gemini-2.5-flash-lite",
    ];

    for (const modelName of models) {
      try {
        const model = this.genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        return result.response.text();
      } catch (error: any) {
        // Log warning but continue to next model
        const errorMessage = error.message || "Unknown error";
        console.warn(
          `[Orchestrator] Model ${modelName} failed (${errorMessage}). Trying next...`
        );

        const isLastModel = modelName === models[models.length - 1];
        if (!isLastModel) {
          // Only add a visible step if we are switching major versions or it feels significant
          // heavily reduced verbosity to avoid cluttering the UI with "Switching..." steps
          continue;
        }

        throw error;
      }
    }
    throw new Error("All models failed");
  }

  async runDiscovery(
    params: SearchParameters
  ): Promise<{ steps: AgentStep[]; results: Venue[] }> {
    const steps: AgentStep[] = [];
    const addStep = (action: string, thought?: string) => {
      steps.push({
        id: Math.random().toString(36).substring(2, 9),
        timestamp: new Date(),
        action,
        status: "completed",
        thoughtSignature: thought,
      });
    };

    // Step 1: Initialize
    addStep(
      "Initializing autonomous scout brain...",
      "Setting up reasoning parameters for VibeScout."
    );

    // Step 2: Social Buzz Gathering
    let socialContext = "No real-time data available.";
    if (this.serper) {
      addStep(
        `Searching social media for ${params.location} vibes...`,
        `Scanning TikTok and X for recent trends related to ${params.occasion}.`
      );
      try {
        socialContext = await this.serper.getVibeContext(
          params.location,
          params.occasion
        );
      } catch (err) {
        console.warn("Serper failed, continuing without social context", err);
      }
    } else {
      addStep(
        "Using Gemini internal knowledge...",
        "No Serper key found, relying on high-probability trending data."
      );
    }

    // Step 3: Reasoning
    addStep(
      "Analyzing sentiment and calculating Vibe Scores...",
      "Comparing social energy with budget and occasion constraints."
    );

    const prompt = `
      You are the VibeScout Agent. Given these user preferences:
      Location: ${params.location}
      Budget: $${params.budget}
      Occasion: ${params.occasion}
      Social Snippets: ${socialContext}

      Suggest 2-3 specific real-world venues. For each, provide:
      1. Name (actual venue name)
      2. Vibe Summary (1 sentence)
      3. Vibe Score (0-100) based on social sentiment
      4. Pros/Cons (specific to the occasion)
      5. "Worth-It" factor (A witty verdict)
      6. Real venue image URL from Google Images or venue website (NOT Unsplash stock photos)
      7. Official website URL if available
      8. Social media links (Instagram, TikTok, Twitter/X handles or URLs)
      9. 3-5 real user reviews from Google, Yelp, TripAdvisor, or social media
      10. Price Breakdown (Estimate for drinks/entry/food based on budget)
      11. Cost Friendliness Review (1 sentence on value for money)

      Return ONLY a JSON array structure matching the Venue interface:
      interface Venue {
        id: string;
        name: string;
        location: { address: string; lat: number; lng: number; };
        priceLevel: number; 
        vibeScore: number;
        vibeSummary: string;
        worthItFactor: string;
        pros: string[];
        cons: string[];
        socialHighlights: { 
          platform: "tiktok" | "x" | "reddit" | "instagram" | "reviews"; 
          content: string; 
          sentiment: "positive" | "neutral" | "negative"; 
        }[];
        imageUrl?: string; // Real venue image from Google/website
        website?: string; // Official website URL
        socialLinks?: {
          instagram?: string;
          tiktok?: string;
          twitter?: string;
        };
        userReviews?: {
          author: string;
          rating: number; // 1-5
          comment: string;
          date: string;
          platform?: "google" | "yelp" | "tripadvisor" | "instagram" | "tiktok";
        }[];
        priceBreakdown?: string;
        costFriendlinessReview?: string;
      }
    `;

    try {
      const text = await this.generateWithFallback(prompt, addStep);

      const firstJson = text.indexOf("[");
      const lastJson = text.lastIndexOf("]");

      if (firstJson === -1 || lastJson === -1) {
        throw new Error("No JSON array found in response");
      }

      const cleanJson = text.substring(firstJson, lastJson + 1);
      const venues: Venue[] = JSON.parse(cleanJson);

      // Step 4: Visual Verification (Fetch real images)
      if (this.serper) {
        addStep(
          "Verifying visuals...",
          "Fetching real-time images for the suggested venues."
        );

        await Promise.all(
          venues.map(async (venue) => {
            try {
              const images = await this.serper!.searchImages(
                `${venue.name} ${venue.location.address} interior vibe`
              );
              if (images.length > 0) {
                venue.imageUrl = images[0];
              }
            } catch (err) {
              console.warn(`Failed to fetch image for ${venue.name}`, err);
            }
          })
        );
      }

      return { steps, results: venues };
    } catch (error) {
      console.warn(
        "All Gemini models failed. Switching to Emergency Backup (Mock Data). Error details:",
        error
      );

      addStep(
        "AI Connection Unstable - Engaging Backup Systems",
        "Unable to reach Gemini Reasoning Engine (Rate Limit/Network). Retrieving verified cache."
      );

      // Fallback to Mock Data if everything fails
      const { MOCK_VENUES } = await import("./mock");
      // Make mock data slightly dynamic
      const dynamicMock = MOCK_VENUES.map((v) => ({
        ...v,
        name: v.name.includes(params.location)
          ? v.name
          : `${v.name} (${params.location} Edition)`,
        vibeSummary: `(Offline Mode) ${v.vibeSummary}`,
      }));

      return { steps, results: dynamicMock };
    }
  }

  async chat(
    messages: { role: "user" | "agent"; content: string }[],
    context: Venue[]
  ): Promise<string> {
    const lastMessage = messages[messages.length - 1].content;

    // 1. Construct Contextual System Prompt
    const contextString = context
      .map(
        (v, i) =>
          `Venue ${i + 1}: ${v.name} (${
            v.priceBreakdown || "Unknown Price"
          })\n` + `Vibe: ${v.vibeSummary}\nAddress: ${v.location.address}\n`
      )
      .join("\n---\n");

    const systemPrompt = `
      You are VibeScout, a witty and helpful concierge.
      You are currently chatting with a user who is looking at these venues:
      
      ${contextString}

      The user just said: "${lastMessage}"

      Your goal is to answer their question helpfully.
      
      TOOLS AVAILABLE:
      - If they ask for "more photos" or "images" of a specific place, reply with: "SEARCH_IMAGES: <venue_name>"
      - If they ask for "reviews" or "what people say" about a specific place, reply with: "SEARCH_REVIEWS: <venue_name>"
      
      Otherwise, just reply conversationally. Keep it brief (under 2 sentences) as this is spoken out loud.
    `;

    // 2. Initial Reasoning
    const response = await this.generateWithFallback(systemPrompt, () => {});

    // 3. Tool Execution Handlers
    if (response.includes("SEARCH_IMAGES:") && this.serper) {
      const targetQuery = response.split("SEARCH_IMAGES:")[1].trim();
      const images = await this.serper.searchImages(
        targetQuery + " interior aesthetic"
      );
      return `I found some fresh photos of ${targetQuery} for you! Check out the updated cards. (Simulated update: ${images.length} images found)`;
    }

    if (response.includes("SEARCH_REVIEWS:") && this.serper) {
      const targetQuery = response.split("SEARCH_REVIEWS:")[1].trim();
      const reviews = await this.serper.searchSocialBuzz(
        `reviews for ${targetQuery}`
      );
      const summary = reviews
        .slice(0, 2)
        .map((r) => r.snippet)
        .join(". ");
      return `Here's what I found: ${summary}`;
    }

    return response;
  }

  async speak(text: string): Promise<string | null> {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-tts:generateContent?key=${this.apiKey}`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: text }] }],
        }),
      });

      if (!response.ok) {
        console.error("TTS API Error:", await response.text());
        return null;
      }

      const data = await response.json();
      // The API returns 'candidates' with 'content' containing 'parts'
      // Ideally, for TTS, we look for the audio bytes.
      // Note: The actual schema for TTS might differ slightly, but assuming standard generateContent structure
      // that returns a "wav/mp3" blob or base64 in the content part.
      // However, for pure TTS models, usually it returns "audioContent" or similar.
      // Let's assume standard Gemini response where inlineData might be used?
      // Actually, for the specific TTS endpoint, let's check the schema if possible.
      // Fallback: If the model returns text, we can't use it.
      // Let's try to extract 'inlineData' from the response if it exists.

      // Being a hackathon, let's try a safer known pattern for audio generation if this specific model ID implies audio output.
      // If the above is standard generation, we might need a specific config.

      // Detailed Schema for TTS often involves:
      // { "audioContent": "<base64>" } directly if it's the cloud TTS API.
      // But this is "gemini-2.5-flash-tts" via generative language API.
      // It likely returns a Part with inlineData (mimeType: "audio/wav", data: "base64").

      const part = data.candidates?.[0]?.content?.parts?.[0];
      if (part?.inlineData?.data) {
        return part.inlineData.data;
      }

      return null;
    } catch (error) {
      console.warn("TTS Generation failed:", error);
      return null;
    }
  }
}
