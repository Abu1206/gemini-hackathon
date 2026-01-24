import { useEffect, useRef, useState, useCallback } from "react";

interface GeminiLiveConfig {
  apiKey: string;
  systemPrompt?: string;
  onTranscript?: (text: string) => void;
  onAudioChunk?: (audioData: ArrayBuffer) => void;
  onTextChunk?: (text: string) => void;
}

interface GeminiLiveState {
  isConnected: boolean;
  isStreaming: boolean;
  error: string | null;
}

export function useGeminiLive(config: GeminiLiveConfig) {
  const [state, setState] = useState<GeminiLiveState>({
    isConnected: false,
    isStreaming: false,
    error: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const audioBufferRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const setupSentRef = useRef(false);

  // Initialize audio context for playback
  const initAudioOutput = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)({
        sampleRate: 24000,
      });
    }
    return audioContextRef.current;
  }, []);

  // Play audio chunks from Gemini
  const playAudioChunk = useCallback(async (audioData: ArrayBuffer) => {
    try {
      const ctx = await initAudioOutput();

      // Convert PCM Int16 to Float32
      const pcmData = new Int16Array(audioData);
      const float32Data = new Float32Array(pcmData.length);

      for (let i = 0; i < pcmData.length; i++) {
        float32Data[i] = pcmData[i] / 32768.0;
      }

      const audioBuffer = ctx.createBuffer(1, float32Data.length, 24000);
      const channelData = audioBuffer.getChannelData(0);
      channelData.set(float32Data);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.start();
    } catch (err) {
      console.error("Error playing audio chunk:", err);
    }
  }, [initAudioOutput]);

  // Connect to Gemini Live API
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${config.apiKey}`;
      
      console.log("[GeminiLive] Connecting to Gemini Live API...");
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      setupSentRef.current = false;

      ws.onopen = () => {
        console.log("[GeminiLive] Connected to Gemini Live API");
        setState((prev) => ({ ...prev, isConnected: true, error: null }));

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
                  text: config.systemPrompt || "You are a helpful assistant.",
                },
              ],
            },
          },
        };

        console.log("[GeminiLive] Sending setup message...");
        ws.send(JSON.stringify(setupMessage));
        setupSentRef.current = true;
      };

      ws.onmessage = async (event) => {
        try {
          const response = JSON.parse(event.data);

          // Handle server content
          if (response.serverContent?.modelTurn?.parts) {
            const parts = response.serverContent.modelTurn.parts;

            for (const part of parts) {
              // Handle text/transcript
              if (part.text) {
                if (config.onTextChunk) {
                  config.onTextChunk(part.text);
                }
                if (config.onTranscript) {
                  config.onTranscript(part.text);
                }
              }

              // Handle audio
              if (part.inlineData?.data) {
                const audioData = atob(part.inlineData.data);
                const audioArray = new Uint8Array(audioData.length);
                for (let i = 0; i < audioData.length; i++) {
                  audioArray[i] = audioData.charCodeAt(i);
                }

                if (config.onAudioChunk) {
                  config.onAudioChunk(audioArray.buffer);
                } else {
                  // Auto-play if no callback provided
                  playAudioChunk(audioArray.buffer);
                }
              }
            }
          }
        } catch (err) {
          console.error("[GeminiLive] Error parsing message:", err);
        }
      };

      ws.onerror = (error) => {
        console.error("[GeminiLive] WebSocket error:", error);
        setState((prev) => ({
          ...prev,
          error: "Connection error",
          isConnected: false,
        }));
      };

      ws.onclose = (event) => {
        console.log("[GeminiLive] WebSocket closed:", event.code, event.reason);
        setState((prev) => ({ ...prev, isConnected: false }));
        setupSentRef.current = false;
      };
    } catch (err) {
      console.error("[GeminiLive] Connection error:", err);
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Connection failed",
        isConnected: false,
      }));
    }
  }, [config.apiKey, config.systemPrompt, config.onTranscript, config.onAudioChunk, config.onTextChunk, playAudioChunk]);

  // Send audio to Gemini
  const sendAudio = useCallback(
    (audioData: ArrayBuffer, turnComplete: boolean = false) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        console.warn("[GeminiLive] WebSocket not connected, cannot send audio");
        return;
      }

      if (!setupSentRef.current) {
        console.warn("[GeminiLive] Setup not sent yet, waiting...");
        return;
      }

      try {
        // Convert ArrayBuffer to base64
        const uint8Array = new Uint8Array(audioData);
        const binaryString = String.fromCharCode.apply(
          null,
          Array.from(uint8Array)
        );
        const base64Audio = btoa(binaryString);

        const message = {
          clientContent: {
            turns: [
              {
                role: "user",
                parts: [
                  {
                    inlineData: {
                      mimeType: "audio/pcm",
                      data: base64Audio,
                    },
                  },
                ],
              },
            ],
            turnComplete,
          },
        };

        wsRef.current.send(JSON.stringify(message));
        setState((prev) => ({ ...prev, isStreaming: true }));
      } catch (err) {
        console.error("[GeminiLive] Error sending audio:", err);
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : "Failed to send audio",
        }));
      }
    },
    []
  );

  // Mark turn as complete
  const completeTurn = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    const message = {
      clientContent: {
        turns: [],
        turnComplete: true,
      },
    };

    wsRef.current.send(JSON.stringify(message));
    setState((prev) => ({ ...prev, isStreaming: false }));
  }, []);

  // Disconnect
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setupSentRef.current = false;
    setState((prev) => ({ ...prev, isConnected: false, isStreaming: false }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    sendAudio,
    completeTurn,
  };
}

