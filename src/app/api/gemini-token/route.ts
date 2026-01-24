export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return Response.json(
        { error: "GEMINI_API_KEY not configured" },
        { status: 500 }
      );
    }

    // Return the API key directly (sessionId in this case)
    // In production, you might want to use a more secure method
    return Response.json({
      sessionId: apiKey,
      success: true,
    });
  } catch (error) {
    console.error("Error generating Gemini token:", error);
    return Response.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}
