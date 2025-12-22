"use client";

import { useState, useEffect, useRef } from "react";
import { Venue } from "@/lib/agent/types";

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [transcript, setTranscript] = useState("");

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Initialize Speech Recognition
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
          if (transcript) {
            handleSendMessage(transcript);
          }
        };
      }
    }
  }, [transcript]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setTranscript("");
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const playAudio = (base64Audio: string) => {
    try {
      const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
      audio.onplay = () => setIsSpeaking(true);
      audio.onended = () => setIsSpeaking(false);
      audio.onerror = (e) => {
        console.error("Audio playback error", e);
        setIsSpeaking(false);
      };
      audio.play();
    } catch (e) {
      console.error("Failed to play audio", e);
      setIsSpeaking(false);
    }
  };

  const handleSendMessage = async (text: string) => {
    // Add user message immediately
    const newMessages = [...messages, { role: "user" as const, content: text }];
    setMessages(newMessages);
    setTranscript("");

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
      const audioData = data.audio;

      // Add agent message
      setMessages((prev) => [
        ...prev,
        { role: "agent", content: agentResponse },
      ]);

      // Play audio response
      if (audioData) {
        playAudio(audioData);
      }
    } catch (error) {
      console.error("Chat error:", error);
      // Fallback if audio fails? Just text is fine for now
    }
  };

  if (!isOpen) {
    return (
      <button
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
      </button>
    );
  }

  return (
    <div
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
        <h3
          style={{ margin: 0, fontSize: "1rem", color: "var(--accent-gold)" }}
        >
          Live Vibe Session
        </h3>
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
          <p
            style={{
              color: "var(--text-secondary)",
              textAlign: "center",
              fontSize: "0.9rem",
              marginTop: "40px",
            }}
          >
            Tap the mic and ask me anything about these venues!
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
              background:
                msg.role === "user"
                  ? "rgba(201, 160, 80, 0.2)"
                  : "rgba(255, 255, 255, 0.05)",
              padding: "10px 14px",
              borderRadius: "12px",
              maxWidth: "80%",
              fontSize: "0.9rem",
              lineHeight: "1.4",
            }}
          >
            {msg.content}
          </div>
        ))}
      </div>

      {/* Visualizer / Status */}
      {(isListening || isSpeaking) && (
        <div
          style={{
            height: "60px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "4px",
          }}
        >
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="visualizer-bar"
              style={{
                width: "4px",
                height: "20px",
                background: "var(--accent-gold)",
                borderRadius: "2px",
                animation: `pulse 0.5s infinite ease-in-out ${i * 0.1}s`,
              }}
            />
          ))}
          <style jsx>{`
            @keyframes pulse {
              0%,
              100% {
                height: 10px;
                opacity: 0.5;
              }
              50% {
                height: 30px;
                opacity: 1;
              }
            }
          `}</style>
        </div>
      )}

      {/* Controls */}
      <div
        style={{
          padding: "20px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          borderTop: "1px solid var(--glass-border)",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {transcript && (
          <div
            style={{
              fontSize: "0.8rem",
              color: "var(--text-secondary)",
              marginBottom: "8px",
            }}
          >
            "{transcript}"
          </div>
        )}
        <button
          onClick={toggleListening}
          style={{
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            background: isListening ? "#ff4444" : "var(--accent-gold)",
            color: "var(--bg-primary)",
            border: "none",
            fontSize: "1.5rem",
            cursor: "pointer",
            transition: "all 0.3s ease",
            boxShadow: isListening ? "0 0 20px rgba(255, 68, 68, 0.5)" : "none",
          }}
        >
          {isListening ? "⏹" : "🎤"}
        </button>
      </div>
    </div>
  );
}
