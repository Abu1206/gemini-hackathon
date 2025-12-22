import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

interface LiveAPIConfig {
  apiKey: string;
  model?: string;
}

interface LiveAPIState {
  isConnected: boolean;
  isStreaming: boolean;
  error: string | null;
}

export function useLiveAPI(config: LiveAPIConfig) {
  const [state, setState] = useState<LiveAPIState>({
    isConnected: false,
    isStreaming: false,
    error: null,
  });

  const socketRef = useRef<Socket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    console.log("[LiveAPI] Connecting to Socket.IO proxy...");

    // Connect to our Next.js API route proxy
    const socket = io({
      path: "/api/live-proxy",
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[LiveAPI] Connected to proxy");
      setState((prev) => ({ ...prev, isConnected: true, error: null }));
    });

    socket.on("audio-response", (data: string) => {
      try {
        const response = JSON.parse(data);

        // Handle server audio chunks
        if (response.serverContent?.modelTurn?.parts) {
          const parts = response.serverContent.modelTurn.parts;
          for (const part of parts) {
            if (part.inlineData?.data) {
              // Decode base64 audio and queue for playback
              const audioData = atob(part.inlineData.data);
              const audioArray = new Uint8Array(audioData.length);
              for (let i = 0; i < audioData.length; i++) {
                audioArray[i] = audioData.charCodeAt(i);
              }

              // Convert to Float32Array for Web Audio API
              const float32 = new Float32Array(audioArray.length / 2);
              const dataView = new DataView(audioArray.buffer);
              for (let i = 0; i < float32.length; i++) {
                float32[i] = dataView.getInt16(i * 2, true) / 32768.0;
              }

              audioBufferRef.current.push(float32);
              playAudioQueue();
            }
          }
        }
      } catch (err) {
        console.error("[LiveAPI] Message parse error:", err);
      }
    });

    socket.on("error", (error: any) => {
      console.error("[LiveAPI] Socket error:", error);
      setState((prev) => ({
        ...prev,
        error: error.message || "Connection error",
        isConnected: false,
      }));
    });

    socket.on("disconnect", () => {
      console.log("[LiveAPI] Disconnected");
      setState((prev) => ({ ...prev, isConnected: false }));
    });
  }, []);

  const playAudioQueue = useCallback(() => {
    if (isPlayingRef.current || audioBufferRef.current.length === 0) {
      return;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
    }

    const ctx = audioContextRef.current;
    const chunk = audioBufferRef.current.shift()!;

    const audioBuffer = ctx.createBuffer(1, chunk.length, 24000);
    audioBuffer.copyToChannel(chunk, 0);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    isPlayingRef.current = true;
    source.onended = () => {
      isPlayingRef.current = false;
      playAudioQueue(); // Play next chunk
    };

    source.start();
  }, []);

  const sendAudio = useCallback((audioData: ArrayBuffer) => {
    if (!socketRef.current?.connected) {
      return;
    }

    // Convert ArrayBuffer to base64
    const uint8 = new Uint8Array(audioData);
    let binary = "";
    for (let i = 0; i < uint8.length; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    const base64 = btoa(binary);

    socketRef.current.emit("audio", base64);
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    audioBufferRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    sendAudio,
  };
}
