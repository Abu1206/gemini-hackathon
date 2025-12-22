import { NextRequest, NextResponse } from "next/server";
import { AgentOrchestrator } from "@/lib/agent/orchestrator";
import { SearchParameters } from "@/lib/agent/types";

export async function POST(req: NextRequest) {
  try {
    const params: SearchParameters = await req.json();

    const geminiKey = process.env.GEMINI_API_KEY;
    const serperKey = process.env.SERPER_API_KEY;

    if (!geminiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is missing in environment." },
        { status: 500 }
      );
    }

    const orchestrator = new AgentOrchestrator(geminiKey, serperKey);
    const { steps, results } = await orchestrator.runDiscovery(params);

    return NextResponse.json({ steps, results });
  } catch (error: any) {
    console.error("API Scout Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
