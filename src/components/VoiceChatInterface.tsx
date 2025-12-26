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

// Voice Activity Visualization Component
const VoiceActivityBar = ({ 
  isActive, 
  transcript 
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

        {/* Transcript Display */}
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
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [currentResult, setCurrentResult] = useState<Message | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] =
    useState<SpeechSynthesisVoice | null>(null);

  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  const finalTranscriptRef = useRef("");
  const interimTranscriptRef = useRef("");
  const handleUserMessageRef = useRef<((text: string) => Promise<void>) | null>(null);
  const currentResultRef = useRef<Message | null>(null);
  const currentVenuesRef = useRef<Venue[]>(currentVenues);

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
    if (!userText.trim()) return;

    setIsProcessing(true);
    setTranscript("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "user" as const, content: userText },
          ],
          currentVenues: currentVenuesRef.current,
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

      setCurrentResult(agentMessage);
      currentResultRef.current = agentMessage;
      speak(data.text);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        role: "agent",
        content: "Sorry, I encountered an error. Please try again.",
      };
      setCurrentResult(errorMessage);
      currentResultRef.current = errorMessage;
      speak(errorMessage.content);
    } finally {
      setIsProcessing(false);
    }
  };

  // Store handler in ref for use in useEffect
  handleUserMessageRef.current = handleUserMessage;

  // Keep refs in sync
  useEffect(() => {
    currentResultRef.current = currentResult;
  }, [currentResult]);

  useEffect(() => {
    currentVenuesRef.current = currentVenues;
  }, [currentVenues]);

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

      // Setup STT with interim results for real-time transcript
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = "en-US";

        recognitionRef.current.onresult = (event: any) => {
          let interim = "";
          let final = "";

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              final += transcript + " ";
            } else {
              interim += transcript;
            }
          }

          if (interim) {
            interimTranscriptRef.current = interim;
            setInterimTranscript(interim);
          }

          if (final) {
            finalTranscriptRef.current += final;
            setTranscript(finalTranscriptRef.current);
            setInterimTranscript("");
            interimTranscriptRef.current = "";
          }
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
          // Process the final transcript if we have one
          const finalText = (
            finalTranscriptRef.current + " " + interimTranscriptRef.current
          ).trim();
          if (finalText && handleUserMessageRef.current) {
            handleUserMessageRef.current(finalText);
          }
          finalTranscriptRef.current = "";
          interimTranscriptRef.current = "";
          setTranscript("");
          setInterimTranscript("");
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          setIsListening(false);
          finalTranscriptRef.current = "";
          interimTranscriptRef.current = "";
          setTranscript("");
          setInterimTranscript("");

          // Handle different error types with user-friendly messages
          let errorMessage = "Speech recognition error occurred.";
          switch (event.error) {
            case "network":
              errorMessage = "Network error: Please check your internet connection and try again.";
              break;
            case "no-speech":
              errorMessage = "No speech detected. Please try speaking again.";
              break;
            case "audio-capture":
              errorMessage = "Microphone not found or not accessible. Please check your microphone permissions.";
              break;
            case "not-allowed":
              errorMessage = "Microphone permission denied. Please allow microphone access in your browser settings.";
              break;
            case "aborted":
              // User stopped manually, don't show error
              return;
            case "service-not-allowed":
              errorMessage = "Speech recognition service not available. Please try again later.";
              break;
            default:
              errorMessage = `Speech recognition error: ${event.error}. Please try again.`;
          }
          
          setError(errorMessage);
          // Auto-dismiss error after 5 seconds
          setTimeout(() => setError(null), 5000);
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

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition not supported in this browser");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      // Clear any previous errors when starting a new recording
      setError(null);
      recognitionRef.current.start();
      setIsListening(true);
      setTranscript("");
      setInterimTranscript("");
      finalTranscriptRef.current = "";
      interimTranscriptRef.current = "";
    }
  };

  const displayTranscript = transcript || interimTranscript;

  return (
    <>
      {/* Voice Activity Bar at Top */}
      <VoiceActivityBar
        isActive={isListening || isProcessing}
        transcript={displayTranscript}
      />

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          style={{
            position: "fixed",
            top: "80px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "90vw",
            maxWidth: "500px",
            background: "rgba(220, 38, 38, 0.95)",
            backdropFilter: "blur(20px)",
            borderRadius: "12px",
            border: "1px solid rgba(220, 38, 38, 0.5)",
            boxShadow: "0 10px 40px rgba(220, 38, 38, 0.3)",
            zIndex: 10001,
            padding: "16px 20px",
            marginTop: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
          }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                color: "#fff",
                fontSize: "0.95rem",
                fontWeight: 500,
                marginBottom: "4px",
              }}
            >
              ⚠️ Error
            </div>
            <div
              style={{
                color: "rgba(255, 255, 255, 0.9)",
                fontSize: "0.85rem",
                lineHeight: "1.4",
              }}
            >
              {error}
            </div>
          </div>
          <button
            onClick={() => setError(null)}
            style={{
              background: "transparent",
              border: "none",
              color: "#fff",
              cursor: "pointer",
              fontSize: "1.2rem",
              padding: "4px 8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "4px",
              transition: "background 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            ✕
          </button>
        </motion.div>
      )}

      {/* Results Display */}
      {currentResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            position: "fixed",
            top: "80px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "90vw",
            maxWidth: "800px",
            background: "rgba(10, 10, 12, 0.95)",
            backdropFilter: "blur(20px)",
            borderRadius: "16px",
            border: "1px solid var(--glass-border)",
            boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
            zIndex: 9999,
            padding: "24px",
            marginTop: "16px",
          }}
        >
          {/* Editable Result Content */}
          <div style={{ marginBottom: "16px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "12px",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "1.1rem",
                  color: "var(--accent-gold)",
                  fontWeight: 600,
                }}
              >
                Response
              </h3>
              <button
                onClick={() => setCurrentResult(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  fontSize: "1.2rem",
                  padding: "4px 8px",
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                color: "var(--text-primary)",
                fontSize: "1rem",
                lineHeight: "1.6",
                marginBottom: "16px",
              }}
            >
              {currentResult.content}
            </div>

            {/* RENDER IMAGES - CAROUSEL */}
            {currentResult.type === "images" &&
              currentResult.data &&
              Array.isArray(currentResult.data) && (
                <div
                  style={{
                    display: "flex",
                    overflowX: "auto",
                    gap: "12px",
                    marginTop: "16px",
                    paddingBottom: "8px",
                    scrollBehavior: "smooth",
                  }}
                >
                  {currentResult.data.map((url: string, imgIdx: number) => (
                    <motion.img
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: imgIdx * 0.1 }}
                      key={imgIdx}
                      src={url}
                      alt="Venue visual"
                      style={{
                        minWidth: "200px",
                        height: "150px",
                        objectFit: "cover",
                        borderRadius: "8px",
                      }}
                    />
                  ))}
                </div>
              )}

            {/* RENDER REVIEWS */}
            {currentResult.type === "reviews" &&
              currentResult.data &&
              Array.isArray(currentResult.data) && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    marginTop: "16px",
                  }}
                >
                  {currentResult.data.map((review: any, rIdx: number) => (
                    <div
                      key={rIdx}
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        padding: "12px",
                        borderRadius: "8px",
                        fontSize: "0.9rem",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: "bold",
                          marginBottom: "6px",
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
            {currentResult.type === "web_results" &&
              currentResult.data &&
              Array.isArray(currentResult.data) && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    marginTop: "16px",
                  }}
                >
                  {currentResult.data.map((res: any, rIdx: number) => (
                    <a
                      key={rIdx}
                      href={res.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "block",
                        background: "rgba(255,255,255,0.05)",
                        padding: "12px",
                        borderRadius: "8px",
                        textDecoration: "none",
                        color: "inherit",
                        border: "1px solid var(--glass-border)",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background =
                          "rgba(255,255,255,0.1)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background =
                          "rgba(255,255,255,0.05)";
                      }}
                    >
                      <div
                        style={{
                          fontWeight: "bold",
                          color: "var(--accent-gold)",
                          fontSize: "0.95rem",
                          marginBottom: "6px",
                        }}
                      >
                        {res.title}
                      </div>
                      <div
                        style={{
                          fontSize: "0.85rem",
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

            {/* Action Buttons */}
            <div
              style={{
                display: "flex",
                gap: "12px",
                marginTop: "20px",
                paddingTop: "16px",
                borderTop: "1px solid var(--glass-border)",
              }}
            >
              <button
                onClick={() => {
                  if (currentResult) {
                    handleUserMessage(
                      "Can you modify or change the previous response?"
                    );
                  }
                }}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  background: "rgba(201, 160, 80, 0.2)",
                  border: "1px solid var(--accent-gold)",
                  borderRadius: "8px",
                  color: "var(--accent-gold)",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  fontWeight: 500,
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(201, 160, 80, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(201, 160, 80, 0.2)";
                }}
              >
                Modify Response
              </button>
              <button
                onClick={() => setCurrentResult(null)}
                style={{
                  padding: "10px 16px",
                  background: "transparent",
                  border: "1px solid var(--glass-border)",
                  borderRadius: "8px",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--text-primary)";
                  e.currentTarget.style.color = "var(--text-primary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--glass-border)";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }}
              >
                Clear
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Mic Button - Always Visible */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={toggleListening}
        disabled={isProcessing || isSpeaking}
        style={{
          position: "fixed",
          bottom: "30px",
          right: "30px",
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          background:
            isListening
              ? "#ff4444"
              : isProcessing || isSpeaking
              ? "#888"
              : "var(--accent-gold)",
          color: "var(--bg-primary)",
          border: "none",
          boxShadow: isListening
            ? "0 0 25px rgba(255, 68, 68, 0.6)"
            : "0 4px 20px rgba(201, 160, 80, 0.4)",
          cursor: isProcessing || isSpeaking ? "not-allowed" : "pointer",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.5rem",
          transition: "all 0.3s ease",
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
      </motion.button>

      {/* Status Indicator */}
      {(isProcessing || isSpeaking) && (
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
          {isProcessing ? "Processing..." : "Speaking..."}
        </motion.div>
      )}
    </>
  );
}
