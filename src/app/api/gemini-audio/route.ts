import { NextRequest, NextResponse } from "next/server";
import { WebSocket } from "ws";

// Store active Gemini connections per session
const sessionConnections = new Map<
  string,
  {
    ws: WebSocket;
    createdAt: number;
  }
>();

// Clean up old connections
setInterval(() => {
  const now = Date.now();
  for (const [key, conn] of sessionConnections.entries()) {
    if (now - conn.createdAt > 30 * 60 * 1000) {
      // 30 minutes
      conn.ws.close();
      sessionConnections.delete(key);
    }
  }
}, 5 * 60 * 1000); // Check every 5 minutes

// Health check endpoint
export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;
  return NextResponse.json({
    status: "ok",
    apiKeyConfigured: !!apiKey,
    apiKeyPrefix: apiKey ? apiKey.substring(0, 10) + "..." : "NOT SET",
    timestamp: new Date().toISOString(),
  });
}

async function getOrCreateGeminiConnection(
  sessionId: string,
  systemPrompt: string
) {
  // Return existing connection if still open
  if (sessionConnections.has(sessionId)) {
    const conn = sessionConnections.get(sessionId)!;
    if (conn.ws.readyState === WebSocket.OPEN) {
      return conn.ws;
    } else {
      // Remove dead connection
      sessionConnections.delete(sessionId);
    }
  }

  // Create new connection
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;

  console.log("Connecting to Gemini WebSocket...");

  return new Promise<WebSocket>((resolve, reject) => {
    let connected = false;
    const ws = new WebSocket(wsUrl);

    // Add connection timeout
    const connectionTimeout = setTimeout(() => {
      if (!connected) {
        console.error("WebSocket connection timeout");
        ws.close();
        reject(new Error("Gemini connection timeout after 10 seconds"));
      }
    }, 10000); // 10 second timeout

    ws.on("open", () => {
      connected = true;
      clearTimeout(connectionTimeout);
      console.log("✓ Connected to Gemini for session:", sessionId);

      // Send setup message
      const setupMessage = {
        setup: {
          model: "models/gemini-2.0-flash-exp",
          generationConfig: {
            responseModalities: ["AUDIO", "TEXT"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: "Aoede",
                },
              },
            },
          },
          systemInstruction: {
            parts: [
              {
                text: systemPrompt || "You are a helpful assistant.",
              },
            ],
          },
        },
      };

      console.log("Sending setup message to Gemini...");
      ws.send(JSON.stringify(setupMessage));

      // Store connection
      sessionConnections.set(sessionId, {
        ws,
        createdAt: Date.now(),
      });

      resolve(ws);
    });

    ws.on("error", (error) => {
      connected = true;
      clearTimeout(connectionTimeout);
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("WebSocket error event:", errorMsg);
      console.error("Error type:", error instanceof Error ? error.constructor.name : typeof error);
      if (error instanceof AggregateError) {
        console.error("AggregateError details:", error.errors);
      }
      reject(new Error(`Failed to connect to Gemini: ${errorMsg}`));
    });

    ws.on("close", (code, reason) => {
      console.log("WebSocket closed:", code, reason ? reason.toString() : "no reason");
      sessionConnections.delete(sessionId);
    });
  });
}

export async function POST(req: NextRequest) {
  let timeoutHandle: NodeJS.Timeout | null = null;
  
  try {
    console.log("=== POST /api/gemini-audio ===");
    const { sessionId, systemPrompt, audioData } = await req.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    if (!audioData) {
      return NextResponse.json(
        { error: "audioData is required" },
        { status: 400 }
      );
    }

    console.log("✓ Received request for session:", sessionId);
    console.log("✓ Audio data size:", audioData.length, "bytes");

    // Get or create Gemini connection
    console.log("Connecting to Gemini...");
    const ws = await getOrCreateGeminiConnection(
      sessionId,
      systemPrompt || ""
    );

    console.log("✓ Got Gemini connection, WebSocket state:", ws.readyState);

    // Send audio to Gemini
    const message = {
      clientContent: {
        turns: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: "audio/pcm",
                  data: audioData,
                },
              },
            ],
          },
        ],
        turnComplete: false,
      },
    };

    console.log("Sending audio to Gemini...");
    ws.send(JSON.stringify(message));
    console.log("✓ Audio sent to Gemini");

    // Create a ReadableStream that will emit responses
    const stream = new ReadableStream({
      start(controller) {
        let hasReceivedMessage = false;
        let messageCount = 0;

        const onMessage = (data: WebSocket.Data) => {
          try {
            messageCount++;
            console.log(`📨 Received message #${messageCount}`);
            const response = JSON.parse(data.toString());
            hasReceivedMessage = true;

            console.log("Sending response to client, turnComplete:", response.serverContent?.turnComplete);

            // Send response back to client as SSE
            controller.enqueue(
              `data: ${JSON.stringify(response)}\n\n`
            );

            // Check if this is the end of the response
            if (response.serverContent?.turnComplete) {
              console.log("✓ Turn complete, closing stream");
              ws.removeListener("message", onMessage);
              // Small delay before closing
              setTimeout(() => {
                controller.close();
              }, 100);
            }
          } catch (err) {
            console.error("Error parsing Gemini message:", err);
            ws.removeListener("message", onMessage);
            controller.close();
          }
        };

        const onError = (error: Error) => {
          console.error("WebSocket error during streaming:", error);
          ws.removeListener("message", onMessage);
          ws.removeListener("error", onError);
          controller.close();
        };

        ws.on("message", onMessage);
        ws.on("error", onError);

        // Timeout after 30 seconds
        timeoutHandle = setTimeout(() => {
          console.log("⏱️ Stream timeout (30s), closing");
          ws.removeListener("message", onMessage);
          ws.removeListener("error", onError);
          controller.close();
        }, 30000);
      },
    });

    console.log("✓ Returning stream response");
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("❌ ERROR in gemini-audio API:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    console.error("Error message:", errorMessage);
    if (error instanceof Error && error.stack) {
      console.error("Stack trace:", error.stack);
    }
    return NextResponse.json(
      {
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

// Cleanup endpoint
export async function DELETE(req: NextRequest) {
  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    const conn = sessionConnections.get(sessionId);
    if (conn) {
      conn.ws.close();
      sessionConnections.delete(sessionId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in cleanup:", error);
    return NextResponse.json(
      { error: "Failed to cleanup session" },
      { status: 500 }
    );
  }
}
