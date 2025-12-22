export type VibeScore = number; // 0-100

export interface SocialSnippet {
  platform: "tiktok" | "x" | "reddit" | "instagram" | "reviews";
  content: string;
  sentiment: "positive" | "neutral" | "negative";
  url?: string;
}

export interface UserReview {
  author: string;
  rating: number; // 1-5
  comment: string;
  date: string;
  platform?: "google" | "yelp" | "tripadvisor" | "instagram" | "tiktok";
}

export interface SocialLinks {
  instagram?: string;
  tiktok?: string;
  twitter?: string;
  facebook?: string;
}

export interface Venue {
  id: string;
  name: string;
  location: {
    address: string;
    lat: number;
    lng: number;
  };
  priceLevel: number; // 1-4
  vibeScore: VibeScore;
  vibeSummary: string;
  worthItFactor: string;
  pros: string[];
  cons: string[];
  socialHighlights: SocialSnippet[];
  imageUrl?: string;
  website?: string;
  socialLinks?: SocialLinks;
  userReviews?: UserReview[];
  priceBreakdown?: string; // e.g., "Cocktails: $15, Entry: $20"
  costFriendlinessReview?: string; // "Great value for the vibe"
}

export interface SearchParameters {
  location: string;
  budget: number;
  age: number;
  occasion: string; // Free-text input
  interests?: string[];
  isSeasonal?: boolean; // e.g. Christmas
}

export interface AgentStep {
  id: string;
  timestamp: Date;
  action: string; // e.g. "Scanning Google Maps for cafes..."
  status: "pending" | "executing" | "completed" | "error";
  thoughtSignature?: string; // Internal reasoning summary
}
