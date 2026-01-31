import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const testKey = process.env.GEMINI_API_KEY;

  if (!testKey) {
    return NextResponse.json(
      {
        error: "GEMINI_API_KEY is not configured",
        status: "failed",
        hint: "Add GEMINI_API_KEY to your .env file",
      },
      { status: 500 }
    );
  }

  console.log("Testing Gemini connection...");
  console.log("API Key starts with:", testKey.substring(0, 10));

  // Try to create a simple test without actual audio
  const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${testKey}`;

  return NextResponse.json({
    status: "configured",
    apiKeyExists: true,
    apiKeyPrefix: testKey.substring(0, 10) + "...",
    wsUrl: wsUrl.substring(0, 100) + "...",
    instructions:
      "API key is configured. Check server logs for connection issues.",
    timestamp: new Date().toISOString(),
  });
}
