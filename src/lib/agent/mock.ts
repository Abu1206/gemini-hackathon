import { Venue, SearchParameters, AgentStep } from "./types";

export const MOCK_VENUES: Venue[] = [
  {
    id: "1",
    name: "The Winter Terrace",
    location: { address: "Lagos Island, Nigeria", lat: 6.45, lng: 3.42 },
    priceLevel: 3,
    vibeScore: 92,
    vibeSummary:
      "High-energy outdoor lounge with premium Christmas lights and Afrobeat fusion.",
    worthItFactor: "Definitely worth it for the views, but book early.",
    pros: ["Stunning Lagos skyline", "Trendy crowd", "Seasonal cocktails"],
    cons: ["Wait times can be long", "Valet parking is chaotic"],
    socialHighlights: [
      {
        platform: "tiktok",
        content: "The lights here are insane! Best Christmas vibe in Lagos.",
        sentiment: "positive",
      },
      {
        platform: "x",
        content: "Winter Terrace is actually worth the hype this year.",
        sentiment: "positive",
      },
    ],
    imageUrl:
      "https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&w=800&q=80",
    website: "https://winterterrace.com",
    socialLinks: {
      instagram: "https://instagram.com/winterterrace",
      tiktok: "https://tiktok.com/@winterterrace",
      twitter: "https://twitter.com/winterterrace",
    },
    userReviews: [
      {
        author: "Sarah M.",
        rating: 5,
        comment:
          "Absolutely stunning views! The ambiance is perfect for a special night out. The cocktails are pricey but worth every penny.",
        date: "2024-12-15",
        platform: "google",
      },
      {
        author: "ChiChi_Lagos",
        rating: 4,
        comment:
          "Great vibe and the DJ was amazing! Just be prepared to wait if you don't have a reservation.",
        date: "2024-12-18",
        platform: "instagram",
      },
      {
        author: "Michael O.",
        rating: 5,
        comment:
          "Best rooftop experience in Lagos! The Christmas decorations this year are next level.",
        date: "2024-12-20",
        platform: "google",
      },
      {
        author: "Tunde A.",
        rating: 4,
        comment:
          "Love the energy here! Perfect spot for a date night or hanging with friends.",
        date: "2024-12-10",
        platform: "yelp",
      },
    ],
  },
];

export async function* simulateDiscovery(
  params: SearchParameters
): AsyncGenerator<AgentStep | { results: Venue[] }> {
  const steps: Omit<AgentStep, "id" | "timestamp">[] = [
    {
      action: `Locating base spots in ${params.location} within budget...`,
      status: "executing",
    },
    {
      action: `Filtering by age (${params.age}) and occasion (${params.occasion})...`,
      status: "executing",
    },
    {
      action: `Scanning TikTok for trending videos in ${params.location}...`,
      status: "executing",
    },
    {
      action: `Analyzing X sentiment for real-time crowd energy...`,
      status: "executing",
    },
    {
      action: `Calculating "Worth-It" factor using Gemini 3...`,
      status: "executing",
    },
  ];

  for (let i = 0; i < steps.length; i++) {
    await new Promise((r) => setTimeout(r, 2000)); // Increased delay for readability
    yield {
      id: `step-${i}`,
      timestamp: new Date(),
      ...steps[i],
      status: "completed",
      thoughtSignature: `Reasoned that ${
        params.occasion === "date"
          ? "privacy and mood"
          : "group energy and shared experience"
      } is priority for ${params.location}.`,
    } as AgentStep;
  }

  // Generate dynamic mock results based on location
  const dynamicVenues: Venue[] = [
    {
      ...MOCK_VENUES[0],
      location: {
        ...MOCK_VENUES[0].location,
        address: `${params.location} City Center`,
      },
      name: `The ${params.location} Terrace`,
      vibeSummary: `High-energy outdoor lounge in ${params.location} with premium lights and local fusion.`,
    },
  ];

  yield { results: dynamicVenues };
}
