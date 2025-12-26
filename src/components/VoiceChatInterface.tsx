"use client";

import { useState, useEffect, useRef } from "react";
import { Venue } from "@/lib/agent/types";
import { motion, AnimatePresence } from "framer-motion";

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
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [transcript, setTranscript] = useState("");
  const [selectedVoice, setSelectedVoice] =
    useState<SpeechSynthesisVoice | null>(null);

  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Initialize TTS and STT
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Setup TTS
      synthesisRef.current = window.speechSynthesis;

      const loadVoices = () => {
        const voices = synthesisRef.current?.getVoices() || [];
        // Try to find a nice natural voice
        const preferredVoice =
          voices.find(
            (v) =>
              v.name.includes("Google US English") ||
              v.name.includes("Samantha") ||
              v.name.includes("Microsoft Zira")
          ) || voices[0];
        setSelectedVoice(preferredVoice);
      };

      loadVoices();
      if (synthesisRef.current) {
        synthesisRef.current.onvoiceschanged = loadVoices;
      }

      // Setup STT
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setTranscript(transcript);
          handleUserMessage(transcript);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          setIsListening(false);
        };
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthesisRef.current) {
        synthesisRef.current.cancel();
      }
    };
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const speak = (text: string) => {
    if (!synthesisRef.current) return;

    // Cancel current speech
    synthesisRef.current.cancel();

    // Strip markdown (asterisks, etc) for cleaner speech
    const cleanText = text.replace(/[*#_`]/g, "");

    const utterance = new SpeechSynthesisUtterance(cleanText);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    utterance.pitch = 1.0;
    utterance.rate = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synthesisRef.current.speak(utterance);
  };

  const handleUserMessage = async (userText: string) => {
    const userMessage: Message = {
      role: "user",
      content: userText,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsProcessing(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          currentVenues,
        }),
      });

      const data = await response.json();

      const agentMessage: Message = {
        role: "agent",
        content: data.text,
        data: data.data,
        type: data.type || "text",
        thoughts: data.thoughts,
      };

      setMessages((prev) => [...prev, agentMessage]);
      speak(data.text);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        role: "agent",
        content: "Sorry, I encountered an error. Please try again.",
      };
      setMessages((prev) => [...prev, errorMessage]);
      speak(errorMessage.content);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition not supported in this browser");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
      setTranscript("");
    }
  };

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
              Vibe Confidant
            </h3>
          </div>
          <button
            onClick={() => setIsOpen(false)}
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

        {/* Chat Messages */}
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
                Tap the mic and ask me anything about these venues!
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

              {/* RENDER IMAGES - CAROUSEL */}
              {msg.type === "images" && msg.data && Array.isArray(msg.data) && (
                <div
                  style={{
                    display: "flex",
                    overflowX: "auto",
                    gap: "8px",
                    marginTop: "8px",
                    paddingBottom: "8px",
                    scrollBehavior: "smooth",
                    scrollbarWidth: "thin",
                  }}
                >
                  {msg.data.map((url: string, imgIdx: number) => (
                    <motion.img
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: imgIdx * 0.1 }}
                      key={imgIdx}
                      src={url}
                      alt="Venue visual"
                      style={{
                        minWidth: "150px",
                        height: "120px",
                        objectFit: "cover",
                        borderRadius: "8px",
                      }}
                    />
                  ))}
                </div>
              )}

              {/* RENDER REVIEWS */}
              {msg.type === "reviews" &&
                msg.data &&
                Array.isArray(msg.data) && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      marginTop: "8px",
                    }}
                  >
                    {msg.data.map((review: any, rIdx: number) => (
                      <div
                        key={rIdx}
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          padding: "8px",
                          borderRadius: "8px",
                          fontSize: "0.85rem",
                        }}
                      >
                        <div
                          style={{
                            fontWeight: "bold",
                            marginBottom: "4px",
                            color: "var(--accent-gold)",
                          }}
                        >
                          {review.title}
                        </div>
                        <div style={{ color: "var(--text-secondary)" }}>
                          {review.snippet}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              {/* RENDER WEB RESULTS */}
              {msg.type === "web_results" &&
                msg.data &&
                Array.isArray(msg.data) && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      marginTop: "8px",
                    }}
                  >
                    {msg.data.map((res: any, rIdx: number) => (
                      <a
                        key={rIdx}
                        href={res.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "block",
                          background: "rgba(255,255,255,0.05)",
                          padding: "10px",
                          borderRadius: "8px",
                          textDecoration: "none",
                          color: "inherit",
                          border: "1px solid var(--glass-border)",
                        }}
                      >
                        <div
                          style={{
                            fontWeight: "bold",
                            color: "var(--accent-gold)",
                            fontSize: "0.9rem",
                            marginBottom: "4px",
                          }}
                        >
                          {res.title}
                        </div>
                        <div
                          style={{
                            fontSize: "0.8rem",
                            color: "var(--text-secondary)",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {res.snippet}
                        </div>
                      </a>
                    ))}
                  </div>
                )}
            </motion.div>
          ))}
        </div>

        {/* Controls */}
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
              key={
                isListening
                  ? "listening"
                  : isProcessing
                  ? "processing"
                  : isSpeaking
                  ? "speaking"
                  : "idle"
              }
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
              {isListening
                ? "Listening..."
                : isProcessing
                ? "Thinking..."
                : isSpeaking
                ? "Speaking..."
                : ""}
            </motion.p>
          </AnimatePresence>

          {/* Mic Button */}
          <button
            onClick={toggleListening}
            disabled={isProcessing || isSpeaking}
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              background: isListening
                ? "#ff4444"
                : isProcessing || isSpeaking
                ? "#888"
                : "var(--accent-gold)",
              color: "var(--bg-primary)",
              border: "none",
              fontSize: "1.5rem",
              cursor: isProcessing || isSpeaking ? "not-allowed" : "pointer",
              transition: "all 0.3s ease",
              boxShadow: isListening
                ? "0 0 25px rgba(255, 68, 68, 0.6)"
                : "0 4px 15px rgba(201, 160, 80, 0.3)",
              transform: isListening ? "scale(1.1)" : "scale(1)",
            }}
          >
            {isListening ? (
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
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
