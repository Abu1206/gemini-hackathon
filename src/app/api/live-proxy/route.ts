import { Server } from "socket.io";
import { WebSocket } from "ws";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Check if this is a WebSocket upgrade request
  if (!res.socket.server.io) {
    console.log("Initializing Socket.IO server...");

    const io = new Server(res.socket.server, {
      path: "/api/live-proxy",
      addTrailingSlash: false,
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    res.socket.server.io = io;

    io.on("connection", (socket) => {
      console.log("Client connected:", socket.id);

      let geminiWs = null;
      let systemPrompt = "";

      // Handle setup
      socket.on("setup", (data: any) => {
        systemPrompt = data.systemPrompt || "";
        console.log("Setup received with system prompt");
      });

      // Handle end of turn signal
      socket.on("end-turn", () => {
        if (geminiWs && geminiWs.readyState === WebSocket.OPEN) {
          const message = {
            clientContent: {
              turns: [],
              turnComplete: true,
            },
          };
          geminiWs.send(JSON.stringify(message));
        }
      });

      // Handle audio data from client
      socket.on("audio", async (audioData) => {
        if (!geminiWs || geminiWs.readyState !== WebSocket.OPEN) {
          // Initialize Gemini WebSocket connection
          const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

          if (!GEMINI_API_KEY) {
            socket.emit("error", { message: "API key not configured" });
            return;
          }

          // Use API key as query parameter instead of Authorization header
          const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${GEMINI_API_KEY}`;

          console.log("Connecting to Gemini Live API...");

          geminiWs = new WebSocket(wsUrl);

          geminiWs.on("open", () => {
            console.log("Connected to Gemini Live API");

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
            geminiWs.send(JSON.stringify(setupMessage));
          });

          geminiWs.on("message", (data) => {
            try {
              const response = JSON.parse(data.toString());
              
              // Forward full response to client
              socket.emit("audio-response", JSON.stringify(response));
              
              // Also emit transcript updates if available
              if (response.serverContent?.modelTurn?.parts) {
                const parts = response.serverContent.modelTurn.parts;
                for (const part of parts) {
                  if (part.text) {
                    socket.emit("transcript", part.text);
                  }
                }
              }
            } catch (err) {
              console.error("Error parsing Gemini message:", err);
              // If not JSON, forward as-is (shouldn't happen but handle it)
              socket.emit("audio-response", data.toString());
            }
          });

          geminiWs.on("error", (error) => {
            console.error("Gemini WebSocket error:", error);
            socket.emit("error", { 
              message: "Gemini connection error",
              details: error.toString()
            });
          });

          geminiWs.on("close", (code, reason) => {
            console.log(`Gemini WebSocket closed: code=${code}, reason=${reason}`);
            geminiWs = null;
          });
        }

        // Forward audio to Gemini with turnComplete: false for continuous streaming
        if (geminiWs && geminiWs.readyState === WebSocket.OPEN) {
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
              turnComplete: false, // Continuous streaming for natural conversation
            },
          };

          geminiWs.send(JSON.stringify(message));
        }
      });

      socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
        if (geminiWs) {
          geminiWs.close();
          geminiWs = null;
        }
      });
    });
  }

  res.status(200).json({ status: "Socket.IO server running" });
}
