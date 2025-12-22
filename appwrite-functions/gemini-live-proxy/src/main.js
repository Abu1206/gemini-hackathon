import { Client } from "@appwrite.io/sdk";
import WebSocket from "ws";

// This is the Appwrite Function that proxies WebSocket connections to Gemini Live API
export default async ({ req, res, log, error }) => {
  // Get Gemini API key from environment variables
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  if (!GEMINI_API_KEY) {
    return res.json({ error: "GEMINI_API_KEY not configured" }, 500);
  }

  // Handle WebSocket upgrade request
  if (req.headers.upgrade === "websocket") {
    log("WebSocket connection requested");

    // Create WebSocket server for client connection
    const wss = new WebSocket.Server({ noServer: true });

    wss.on("connection", (clientWs) => {
      log("Client WebSocket connected");

      // Connect to Gemini Live API
      const geminiWsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent`;

      const geminiWs = new WebSocket(geminiWsUrl, {
        headers: {
          Authorization: `Bearer ${GEMINI_API_KEY}`,
          "Content-Type": "application/json",
        },
      });

      geminiWs.on("open", () => {
        log("Connected to Gemini Live API");

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

      // Forward messages from client to Gemini
      clientWs.on("message", (data) => {
        if (geminiWs.readyState === WebSocket.OPEN) {
          geminiWs.send(data);
        }
      });

      // Forward messages from Gemini to client
      geminiWs.on("message", (data) => {
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(data);
        }
      });

      // Handle errors
      geminiWs.on("error", (err) => {
        error("Gemini WebSocket error:", err);
        clientWs.close();
      });

      clientWs.on("error", (err) => {
        error("Client WebSocket error:", err);
        geminiWs.close();
      });

      // Handle close
      geminiWs.on("close", () => {
        log("Gemini WebSocket closed");
        clientWs.close();
      });

      clientWs.on("close", () => {
        log("Client WebSocket closed");
        geminiWs.close();
      });
    });

    // Upgrade the HTTP connection to WebSocket
    wss.handleUpgrade(req, req.socket, Buffer.alloc(0), (ws) => {
      wss.emit("connection", ws, req);
    });

    return; // Don't send HTTP response for WebSocket
  }

  // Regular HTTP endpoint (for testing)
  return res.json({
    message: "Gemini Live API Proxy",
    status: "ready",
    endpoint: "Connect via WebSocket",
  });
};
