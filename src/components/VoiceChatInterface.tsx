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
}

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
              v.name.includes("Natural")
          ) || voices[0];
        setSelectedVoice(preferredVoice || null);
      };

      loadVoices();
      if (synthesisRef.current?.onvoiceschanged !== undefined) {
        synthesisRef.current.onvoiceschanged = loadVoices;
      }

      // Setup STT
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = "en-US";

        recognitionRef.current.onresult = (event: any) => {
          const current = event.resultIndex;
          const transcriptText = event.results[current][0].transcript;
          setTranscript(transcriptText);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
          // Only send if we actually have text and weren't just toggled off manually
          // accessing state in event listener is tricky, checking transcript length in a ref would be better
          // but for this simple version, we'll let the effect/state flow handle it manually or check non-empty
        };
      }
    }
  }, []);

  // Trigger send when listening stops and we have a transcript
  useEffect(() => {
    if (!isListening && transcript.trim().length > 0) {
      handleSendMessage(transcript);
    }
  }, [isListening]); // Only trigger when listening state transitions to false

  const speak = (text: string) => {
    if (!synthesisRef.current) return;

    // Cancel current speech
    synthesisRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
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

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setTranscript("");
      // Cancel any current speaking
      synthesisRef.current?.cancel();
      setIsSpeaking(false);

      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (e) {
        console.error("Mic start error", e);
      }
    }
  };

  const handleSendMessage = async (text: string) => {
    const newMessages = [...messages, { role: "user" as const, content: text }];
    setMessages(newMessages);
    setTranscript("");
    setIsProcessing(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          currentVenues: currentVenues,
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const data = await response.json();
      const agentResponse = data.response;

      setMessages((prev) => [
        ...prev,
        { role: "agent", content: agentResponse },
      ]);

      speak(agentResponse);
    } catch (error) {
      console.error("Chat error:", error);
      speak("Sorry, I had trouble verifying that vibe. Try again?");
    } finally {
      setIsProcessing(false);
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
          width: "350px",
          height: "500px",
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
            onClick={() => {
              synthesisRef.current?.cancel();
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
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
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
                Tap the mic to vibe check.
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
                padding: "10px 14px",
                borderRadius: "16px",
                borderBottomRightRadius: msg.role === "user" ? "4px" : "16px",
                borderTopLeftRadius: msg.role === "agent" ? "4px" : "16px",
                maxWidth: "85%",
                fontSize: "0.95rem",
                lineHeight: "1.5",
              }}
            >
              {msg.content}
            </motion.div>
          ))}
          {/* Scroll anchor */}
          <div id="scroll-anchor" />
        </div>

        {/* Status & Visualizer */}
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
          {/* Dynamic Status Text */}
          <AnimatePresence mode="wait">
            <motion.p
              key={
                isListening
                  ? "list"
                  : isProcessing
                  ? "proc"
                  : isSpeaking
                  ? "speak"
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
                ? "Analyzing the vibe..."
                : isSpeaking
                ? "Speaking..."
                : transcript
                ? "Processing..."
                : ""}
            </motion.p>
          </AnimatePresence>

          {/* Controls */}
          <button
            onClick={toggleListening}
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              background: isListening
                ? "#ff4444"
                : isProcessing
                ? "var(--text-secondary)"
                : "var(--accent-gold)",
              color: "var(--bg-primary)",
              border: "none",
              fontSize: "1.5rem",
              cursor: isProcessing ? "default" : "pointer",
              transition: "all 0.3s ease",
              boxShadow: isListening
                ? "0 0 25px rgba(255, 68, 68, 0.6)"
                : "0 4px 15px rgba(201, 160, 80, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: isListening ? "scale(1.1)" : "scale(1)",
            }}
            disabled={isProcessing}
          >
            {isListening ? (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                ⏹
              </motion.div>
            ) : isProcessing ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              >
                ⏳
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
