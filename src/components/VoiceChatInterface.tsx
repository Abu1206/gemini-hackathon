"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Venue } from "@/lib/agent/types";
import { motion, AnimatePresence } from "framer-motion";
import { useTwilioVoice } from "@/hooks/useTwilioVoice";
import { useGeminiLive } from "@/hooks/useGeminiLive";

interface Props {
  currentVenues: Venue[];
}

interface Message {
  role: "user" | "agent";
  content: string;
  data?: any;
  type?: "text" | "images" | "reviews" | "web_results";
  thoughts?: string;
}

// Voice Activity Visualization Component
const VoiceActivityBar = ({
  isActive,
  transcript,
}: {
  isActive: boolean;
  transcript: string;
}) => {
  const [audioLevel, setAudioLevel] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setAudioLevel(0);
      return;
    }

    // Simulate audio level animation
    const interval = setInterval(() => {
      setAudioLevel(Math.random() * 100);
    }, 100);

    return () => clearInterval(interval);
  }, [isActive]);

  if (!isActive && !transcript) return null;

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        background: "rgba(10, 10, 12, 0.98)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--glass-border)",
        zIndex: 10000,
        padding: "16px 24px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {/* Voice Activity Visualization */}
        {isActive && (
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            {Array.from({ length: 20 }).map((_, i) => {
              const height = isActive
                ? Math.max(4, (audioLevel / 100) * 30 * Math.random())
                : 4;
              return (
                <motion.div
                  key={i}
                  animate={{
                    height: `${height}px`,
                    opacity: isActive ? 0.8 : 0.3,
                  }}
                  transition={{ duration: 0.1 }}
                  style={{
                    width: "3px",
                    background: "var(--accent-gold)",
                    borderRadius: "2px",
                    minHeight: "4px",
                  }}
                />
              );
            })}
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          {transcript ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                margin: 0,
                color: "var(--text-primary)",
                fontSize: "1rem",
                fontWeight: 500,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {transcript}
            </motion.p>
          ) : isActive ? (
            <p
              style={{
                margin: 0,
                color: "var(--text-secondary)",
                fontSize: "0.9rem",
                fontStyle: "italic",
              }}
            >
              Listening...
            </p>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
};

export default function VoiceChatInterface({ currentVenues }: Props) {
  const [isInitialized, setIsInitialized] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [currentResult, setCurrentResult] = useState<Message | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const fullTranscriptRef = useRef("");
  const currentVenuesRef = useRef<Venue[]>(currentVenues);
  const audioBufferRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const geminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";

  // Build system prompt
  const systemPrompt = `You are a helpful travel assistant. You have information about these venues: ${JSON.stringify(
    currentVenuesRef.current
  )}. 
  Provide recommendations, answer questions about venues, and help with travel planning. 
  Keep responses concise and conversational. You can interrupt the user or be interrupted during the conversation.`;

  // Initialize Gemini Live connection
  const {
    isConnected: isGeminiConnected,
    connect: connectGemini,
    disconnect: disconnectGemini,
    sendAudio: sendAudioToGemini,
    completeTurn,
    error: geminiError,
  } = useGeminiLive({
    apiKey: geminiApiKey,
    systemPrompt,
    onTranscript: (text) => {
      fullTranscriptRef.current += text;
      setTranscript(fullTranscriptRef.current);
    },
    onTextChunk: (text) => {
      const agentMessage: Message = {
        role: "agent",
        content: text,
        type: "text",
      };
      setCurrentResult(agentMessage);
      setMessages((prev) => {
        // Avoid duplicate messages
        if (prev.length > 0 && prev[prev.length - 1].role === "agent") {
          // Update last message if it's from agent
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: updated[updated.length - 1].content + text,
          };
          return updated;
        }
        return [...prev, agentMessage];
      });
    },
    onAudioChunk: (audioData) => {
      audioBufferRef.current.push(audioData);
      playNextAudioChunk();
    },
  });

  // Initialize Twilio voice capture
  const {
    isListening,
    startListening,
    stopListening,
    playAudio,
    error: voiceError,
  } = useTwilioVoice((audioData) => {
    // Send audio directly to Gemini Live via WebSocket (real-time streaming)
    if (isGeminiConnected) {
      // Send audio chunk immediately for continuous streaming
      sendAudioToGemini(audioData, false);
    }
  });

  // Play audio queue from Gemini responses
  const playNextAudioChunk = useCallback(() => {
    if (isPlayingRef.current || audioBufferRef.current.length === 0) {
      setIsSpeaking(audioBufferRef.current.length > 0);
      return;
    }

    const audioData = audioBufferRef.current.shift()!;
    isPlayingRef.current = true;
    setIsSpeaking(true);

    playAudio(audioData).finally(() => {
      isPlayingRef.current = false;
      // Play next chunk immediately for continuous playback
      setTimeout(playNextAudioChunk, 10);
    });
  }, [playAudio]);

  // Keep refs in sync
  useEffect(() => {
    currentVenuesRef.current = currentVenues;
  }, [currentVenues]);

  // Connect to Gemini when component mounts
  useEffect(() => {
    if (geminiApiKey && !isGeminiConnected) {
      connectGemini();
    }
  }, [geminiApiKey, isGeminiConnected, connectGemini]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectGemini();
      stopListening();
    };
  }, [disconnectGemini, stopListening]);

  // Toggle listening
  const toggleListening = useCallback(async () => {
    try {
      if (isListening) {
        // Mark turn as complete when stopping
        completeTurn();
        stopListening();
      } else {
        // Ensure Gemini is connected before starting
        if (!isGeminiConnected) {
          if (geminiApiKey) {
            connectGemini();
            // Wait a bit for connection
            await new Promise((resolve) => setTimeout(resolve, 500));
          } else {
            setError("Gemini API key not configured");
            return;
          }
        }

        fullTranscriptRef.current = "";
        setTranscript("");
        await startListening();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error toggling voice");
      console.error("Error toggling listening:", err);
    }
  }, [isListening, startListening, stopListening, isGeminiConnected, geminiApiKey, connectGemini, completeTurn]);

  // Update error state
  useEffect(() => {
    if (voiceError) {
      setError(voiceError);
    } else if (geminiError) {
      setError(geminiError);
    }
  }, [voiceError, geminiError]);

  return (
    <>
      <AnimatePresence>
        {(isListening || transcript) && (
          <VoiceActivityBar isActive={isListening} transcript={transcript} />
        )}
      </AnimatePresence>

      {/* Messages Display */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          maxHeight: "60vh",
          overflowY: "auto",
          marginBottom: "20px",
          padding: "16px",
          borderRadius: "12px",
          background: "rgba(255, 255, 255, 0.05)",
          border: "1px solid var(--glass-border)",
        }}
      >
        {messages.length === 0 ? (
          <p style={{ color: "var(--text-secondary)", textAlign: "center" }}>
            {!isInitialized
              ? "Initializing voice chat..."
              : "Start talking to the AI..."}
          </p>
        ) : (
          messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                marginBottom: "12px",
                padding: "12px",
                borderRadius: "8px",
                background:
                  msg.role === "user"
                    ? "rgba(168, 144, 108, 0.2)"
                    : "rgba(100, 150, 200, 0.2)",
                borderLeft: `3px solid ${
                  msg.role === "user"
                    ? "var(--accent-gold)"
                    : "var(--accent-blue)"
                }`,
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: "var(--text-primary)",
                  fontSize: "0.9rem",
                }}
              >
                <strong>{msg.role === "user" ? "You" : "AI"}:</strong>{" "}
                {msg.content}
              </p>
            </motion.div>
          ))
        )}
      </motion.div>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            padding: "12px 16px",
            borderRadius: "8px",
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "#ef4444",
            marginBottom: "16px",
            fontSize: "0.9rem",
          }}
        >
          {error}
        </motion.div>
      )}

      {/* Voice Control Button */}
      <motion.button
        onClick={toggleListening}
        disabled={!isInitialized || !isGeminiConnected}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        style={{
          position: "fixed",
          bottom: "30px",
          right: "30px",
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          background: isListening ? "var(--accent-gold)" : isGeminiConnected ? "var(--accent-blue)" : "#666",
          border: "none",
          color: "white",
          fontSize: "24px",
          cursor: isInitialized && isGeminiConnected ? "pointer" : "not-allowed",
          opacity: isInitialized && isGeminiConnected ? 1 : 0.5,
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
        }}
        title={
          !isGeminiConnected
            ? "Connecting to Gemini..."
            : isListening
            ? "Stop recording"
            : "Start recording"
        }
      >
        {isListening ? "⏹" : "🎤"}
      </motion.button>

      {/* Status Indicator */}
      {(isSpeaking || isListening) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: "fixed",
            bottom: "100px",
            right: "30px",
            background: "rgba(10, 10, 12, 0.9)",
            backdropFilter: "blur(10px)",
            padding: "12px 20px",
            borderRadius: "24px",
            border: "1px solid var(--glass-border)",
            color: "var(--text-secondary)",
            fontSize: "0.9rem",
            zIndex: 9998,
          }}
        >
          {isSpeaking ? "AI is speaking..." : "Listening..."}
        </motion.div>
      )}
    </>
  );
}
