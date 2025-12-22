"use client";

import { useState, useEffect, useRef } from "react";
import { Venue } from "@/lib/agent/types";
import { motion, AnimatePresence } from "framer-motion";
import { useLiveAPI } from "@/hooks/useLiveAPI";
import { AudioRecorder } from "@/utils/audioRecorder";

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

const BrainProcess = ({ thoughts }: { thoughts: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!thoughts) return null;

  return (
    <div style={{ marginBottom: "8px", width: "100%" }}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          background: "rgba(0, 255, 170, 0.1)",
          border: "1px solid rgba(0, 255, 170, 0.3)",
          color: "rgba(0, 255, 170, 0.8)",
          padding: "4px 8px",
          borderRadius: "4px",
          fontSize: "0.75rem",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          width: "100%",
          textAlign: "left",
          fontFamily: "monospace",
        }}
      >
        <span>{isExpanded ? "▼" : "▶"}</span>
        <span>Reasoning Process</span>
      </button>
      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          style={{
            background: "rgba(0, 0, 0, 0.3)",
            border: "1px solid rgba(0, 255, 170, 0.1)",
            borderTop: "none",
            borderRadius: "0 0 4px 4px",
            padding: "8px",
            fontSize: "0.75rem",
            color: "rgba(0, 255, 170, 0.7)",
            fontFamily: "monospace",
            whiteSpace: "pre-wrap",
            overflowX: "hidden",
            maxHeight: "200px",
            overflowY: "auto",
          }}
        >
          {thoughts}
        </motion.div>
      )}
    </div>
  );
};

export default function VoiceChatInterface({ currentVenues }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [statusText, setStatusText] = useState("");

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";

  const liveAPI = useLiveAPI({ apiKey });

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const toggleLiveChat = async () => {
    if (!isActive) {
      // Start Live API session
      if (!apiKey) {
        alert("Please add NEXT_PUBLIC_GEMINI_API_KEY to your .env.local file");
        return;
      }

      setStatusText("Connecting...");
      liveAPI.connect();

      // Wait a moment for connection
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (liveAPI.isConnected) {
        setStatusText("Listening...");
        setIsActive(true);

        // Start audio recording
        audioRecorderRef.current = new AudioRecorder();
        await audioRecorderRef.current.start((audioData) => {
          liveAPI.sendAudio(audioData);
        });
      } else {
        setStatusText("Connection failed");
      }
    } else {
      // Stop Live API session
      setStatusText("");
      setIsActive(false);

      if (audioRecorderRef.current) {
        audioRecorderRef.current.stop();
        audioRecorderRef.current = null;
      }

      liveAPI.disconnect();
    }
  };

  useEffect(() => {
    if (liveAPI.isStreaming) {
      setStatusText("Agent speaking...");
    } else if (liveAPI.isConnected && isActive) {
      setStatusText("Listening...");
    }
  }, [liveAPI.isStreaming, liveAPI.isConnected, isActive]);

  if (!isOpen) {
    return (
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        style={{
          position: "fixed",
          bottom: "30px",
          right: "30px",
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          background: "var(--accent-gold)",
          color: "var(--bg-primary)",
          border: "none",
          boxShadow: "0 4px 20px rgba(201, 160, 80, 0.4)",
          cursor: "pointer",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.5rem",
        }}
      >
        🎤
      </motion.button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        style={{
          position: "fixed",
          bottom: "30px",
          right: "30px",
          width: "90vw",
          maxWidth: "400px",
          height: "80vh",
          maxHeight: "600px",
          background: "rgba(10, 10, 12, 0.95)",
          backdropFilter: "blur(20px)",
          borderRadius: "24px",
          border: "1px solid var(--glass-border)",
          boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px",
            borderBottom: "1px solid var(--glass-border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "1.2rem" }}>✨</span>
            <h3
              style={{
                margin: 0,
                fontSize: "1rem",
                color: "var(--accent-gold)",
                fontWeight: 600,
              }}
            >
              Vibe Confidant (Live)
            </h3>
          </div>
          <button
            onClick={() => {
              if (isActive) {
                toggleLiveChat();
              }
              setIsOpen(false);
            }}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontSize: "1.2rem",
            }}
          >
            ✕
          </button>
        </div>

        {/* Chat History */}
        <div
          ref={chatContainerRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            scrollBehavior: "smooth",
          }}
        >
          {messages.length === 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                opacity: 0.6,
                gap: "10px",
              }}
            >
              <span style={{ fontSize: "2rem" }}>🎙️</span>
              <p
                style={{
                  color: "var(--text-secondary)",
                  textAlign: "center",
                  fontSize: "0.9rem",
                  margin: 0,
                }}
              >
                Tap the mic to start a live conversation!
              </p>
              <p
                style={{
                  color: "var(--text-secondary)",
                  textAlign: "center",
                  fontSize: "0.75rem",
                  margin: 0,
                  fontStyle: "italic",
                }}
              >
                Powered by Gemini Live API
              </p>
            </div>
          )}
          {messages.map((msg, i) => (
            <motion.div
              initial={{ opacity: 0, x: msg.role === "user" ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              key={i}
              style={{
                alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                background:
                  msg.role === "user"
                    ? "rgba(201, 160, 80, 0.2)"
                    : "rgba(255, 255, 255, 0.05)",
                color: msg.role === "user" ? "var(--text-primary)" : "#ddd",
                padding: "12px 16px",
                borderRadius: "16px",
                borderBottomRightRadius: msg.role === "user" ? "4px" : "16px",
                borderTopLeftRadius: msg.role === "agent" ? "4px" : "16px",
                maxWidth: "90%",
                fontSize: "0.95rem",
                lineHeight: "1.5",
              }}
            >
              <div style={{ marginBottom: msg.data ? "8px" : "0" }}>
                {msg.role === "agent" && msg.thoughts && (
                  <BrainProcess thoughts={msg.thoughts} />
                )}
                {msg.content}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Status & Controls */}
        <div
          style={{
            minHeight: "80px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            paddingBottom: "10px",
          }}
        >
          {/* Status Text */}
          <AnimatePresence mode="wait">
            <motion.p
              key={statusText}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              style={{
                color: "var(--text-secondary)",
                fontSize: "0.8rem",
                marginBottom: "8px",
                height: "1rem",
              }}
            >
              {statusText}
            </motion.p>
          </AnimatePresence>

          {/* Mic Button */}
          <button
            onClick={toggleLiveChat}
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              background: isActive
                ? "#ff4444"
                : liveAPI.error
                ? "#888"
                : "var(--accent-gold)",
              color: "var(--bg-primary)",
              border: "none",
              fontSize: "1.5rem",
              cursor: "pointer",
              transition: "all 0.3s ease",
              boxShadow: isActive
                ? "0 0 25px rgba(255, 68, 68, 0.6)"
                : "0 4px 15px rgba(201, 160, 80, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: isActive ? "scale(1.1)" : "scale(1)",
            }}
          >
            {isActive ? (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                ⏹
              </motion.div>
            ) : (
              "🎤"
            )}
          </button>

          {liveAPI.error && (
            <p
              style={{
                color: "#ff4444",
                fontSize: "0.7rem",
                marginTop: "8px",
              }}
            >
              {liveAPI.error}
            </p>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
