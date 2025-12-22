import { NextResponse } from "next/server";
import { AgentOrchestrator } from "@/lib/agent/orchestrator";

export async function POST(request: Request) {
  try {
    const { messages, currentVenues } = await request.json();

    const orchestrator = new AgentOrchestrator(
      process.env.GEMINI_API_KEY!,
      process.env.SERPER_API_KEY
    );

    const result = await orchestrator.chat(messages, currentVenues);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Chat API Error:", error);
    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 }
    );
  }
}
