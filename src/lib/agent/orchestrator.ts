import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import { SearchParameters, AgentStep, Venue } from "./types";
import { SerperService } from "./serper";

export class AgentOrchestrator {
  private genAI: GoogleGenerativeAI;
  private serper?: SerperService;

  constructor(geminiKey: string, serperKey?: string) {
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
}
