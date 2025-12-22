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

      // Handle audio data from client
      socket.on("audio", async (audioData) => {
        if (!geminiWs || geminiWs.readyState !== WebSocket.OPEN) {
          // Initialize Gemini WebSocket connection
          const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

          if (!GEMINI_API_KEY) {
            socket.emit("error", { message: "API key not configured" });
            return;
          }

          geminiWs = new WebSocket(
            "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent",
            {
              headers: {
                Authorization: `Bearer ${GEMINI_API_KEY}`,
              },
            }
          );

          geminiWs.on("open", () => {
            console.log("Connected to Gemini Live API");

            // Send setup message
            const setupMessage = {
              setup: {
                model: "models/gemini-3-flash-preview",
                generation_config: {
                  response_modalities: ["AUDIO"],
                  speech_config: {
                    voice_config: {
                      prebuilt_voice_config: {
                        voice_name: "Aoede",
                      },
                    },
                  },
                },
              },
            };

            geminiWs.send(JSON.stringify(setupMessage));
          });

          geminiWs.on("message", (data) => {
            // Forward Gemini response to client
            socket.emit("audio-response", data.toString());
          });

          geminiWs.on("error", (error) => {
            console.error("Gemini WebSocket error:", error);
            socket.emit("error", { message: "Gemini connection error" });
          });

          geminiWs.on("close", () => {
            console.log("Gemini WebSocket closed");
          });
        }

        // Forward audio to Gemini
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
              turnComplete: true,
            },
          };

          geminiWs.send(JSON.stringify(message));
        }
      });

      socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
        if (geminiWs) {
          geminiWs.close();
        }
      });
    });
  }

  res.status(200).json({ status: "Socket.IO server running" });
}
