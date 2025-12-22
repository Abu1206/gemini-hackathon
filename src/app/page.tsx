"use client";

import { useState } from "react";
import PreferenceForm from "@/components/PreferenceForm";
import AgentTimeline from "@/components/AgentTimeline";
import VenueCard from "@/components/VenueCard";
import { SearchParameters, AgentStep, Venue } from "@/lib/agent/types";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Compass } from "lucide-react";

export default function Home() {
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [results, setResults] = useState<Venue[]>([]);
  const [hasStarted, setHasStarted] = useState(false);

  const handleSearch = async (params: SearchParameters) => {
    setHasStarted(true);
    setIsDiscovering(true);
    setSteps([]);
    setResults([]);

    try {
      const response = await fetch("/api/scout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error("Scout API connection failed.");
      }

      const data = await response.json();

      // Animate the steps sequentially for the "Agentic" feel
      for (const step of data.steps) {
        setSteps((prev) => [...prev, step]);
        await new Promise((r) => setTimeout(r, 1200));
      }

      setResults(data.results);
    } catch (error: any) {
      console.error("Discovery failed:", error);
      setSteps([
        {
          id: "error",
          action: "Connection failed",
          status: "error",
          timestamp: new Date(),
          thoughtSignature:
            "Please ensure GEMINI_API_KEY is set in your .env.local file.",
        },
      ]);
    } finally {
      setIsDiscovering(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at top right, #1a1a2e, #050505)",
        padding: "40px 20px",
      }}
    >
      <header style={{ textAlign: "center", marginBottom: "60px" }}>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "12px",
            background: "rgba(201, 160, 80, 0.1)",
            padding: "8px 20px",
            borderRadius: "50px",
            border: "1px solid rgba(201, 160, 80, 0.3)",
            marginBottom: "24px",
          }}
        >
          <Sparkles size={16} color="var(--accent-gold)" />
          <span
            style={{
              color: "var(--accent-gold)",
              fontWeight: "600",
              fontSize: "0.8rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Gemini 3 Marathon Agent
          </span>
        </motion.div>
        <h1
          className="gradient-text"
          style={{
            fontSize: "4.5rem",
            marginBottom: "16px",
            lineHeight: "1.1",
          }}
        >
          VibeScout
        </h1>
        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: "1.25rem",
            maxWidth: "700px",
            margin: "0 auto",
            fontWeight: "300",
          }}
        >
          Your autonomous scout for local adventures. We don&apos;t just
          search—we analyze real-time social buzz to verify the vibe.
        </p>
      </header>

      <main style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <AnimatePresence mode="wait">
          {!hasStarted && (
            <motion.div
              key="form"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.5 }}
            >
              <PreferenceForm onSearch={handleSearch} />

              <div
                style={{
                  marginTop: "40px",
                  display: "flex",
                  justifyContent: "center",
                  gap: "40px",
                  color: "var(--text-secondary)",
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <p
                    style={{
                      fontSize: "1.5rem",
                      color: "white",
                      fontWeight: "600",
                    }}
                  >
                    24/7
                  </p>
                  <p style={{ fontSize: "0.8rem" }}>Monitoring</p>
                </div>
                <div style={{ textAlign: "center" }}>
                  <p
                    style={{
                      fontSize: "1.5rem",
                      color: "white",
                      fontWeight: "600",
                    }}
                  >
                    TikTok
                  </p>
                  <p style={{ fontSize: "0.8rem" }}>Insight</p>
                </div>
                <div style={{ textAlign: "center" }}>
                  <p
                    style={{
                      fontSize: "1.5rem",
                      color: "white",
                      fontWeight: "600",
                    }}
                  >
                    90%
                  </p>
                  <p style={{ fontSize: "0.8rem" }}>Accuracy</p>
                </div>
              </div>
            </motion.div>
          )}

          {hasStarted && isDiscovering && (
            <motion.div
              key="scouting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fade-in"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "40px",
              }}
            >
              <div style={{ textAlign: "center", width: "100%" }}>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "12px",
                    marginBottom: "16px",
                  }}
                >
                  <div
                    className="spinner"
                    style={{
                      width: "24px",
                      height: "24px",
                      borderWidth: "3px",
                    }}
                  ></div>
                  <h2 style={{ fontSize: "1.8rem", margin: 0 }}>
                    Agent is Scouting...
                  </h2>
                </div>
                <p
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: "0.95rem",
                  }}
                >
                  Watch the AI reason through your request in real-time
                </p>
              </div>

              {/* Make the timeline the star of the show */}
              <div style={{ width: "100%", maxWidth: "800px" }}>
                <AgentTimeline steps={steps} />
              </div>

              {steps.length === 0 && (
                <p
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: "0.9rem",
                    fontStyle: "italic",
                  }}
                >
                  Initializing autonomous reasoning engine...
                </p>
              )}
            </motion.div>
          )}

          {!isDiscovering && results.length > 0 && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="fade-in"
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "end",
                  marginBottom: "48px",
                  borderBottom: "1px solid var(--glass-border)",
                  paddingBottom: "24px",
                }}
              >
                <div>
                  <h2 style={{ fontSize: "2.5rem", marginBottom: "8px" }}>
                    The Scout Report
                  </h2>
                  <p style={{ color: "var(--text-secondary)" }}>
                    Consensus from real-time social signals and search data.
                  </p>
                </div>
                <button
                  onClick={() => setHasStarted(false)}
                  className="btn-primary"
                  style={{
                    background: "transparent",
                    color: "var(--accent-gold)",
                    border: "1px solid var(--accent-gold)",
                  }}
                >
                  Start New Scouting
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
                  gap: "40px",
                }}
              >
                {results.map((venue) => (
                  <VenueCard key={venue.id} venue={venue} />
                ))}
              </div>

              <div
                className="glass"
                style={{
                  marginTop: "80px",
                  padding: "40px",
                  textAlign: "center",
                }}
              >
                <Compass
                  size={40}
                  color="var(--accent-gold)"
                  style={{ marginBottom: "20px" }}
                />
                <h3 style={{ fontSize: "1.8rem", marginBottom: "16px" }}>
                  Want real-time updates?
                </h3>
                <p
                  style={{
                    color: "var(--text-secondary)",
                    marginBottom: "32px",
                    maxWidth: "500px",
                    margin: "0 auto 32px",
                  }}
                >
                  As a Marathon Agent, VibeScout can keep monitoring these spots
                  for you. We&apos;ll ping you if the crowd energy shifts or if
                  a last-minute event pops up.
                </p>
                <button className="btn-primary">
                  Enable Continuous Monitoring
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer
        style={{
          marginTop: "120px",
          textAlign: "center",
          padding: "60px",
          opacity: 0.6,
        }}
      >
        <p>
          &copy; 2025 VibeScout Agent Laboratory &bull; Build What&apos;s Next
        </p>
        <p style={{ fontSize: "0.8rem", marginTop: "12px" }}>
          Lagos &bull; London &bull; NYC &bull; Tokyo
        </p>
      </footer>
    </div>
  );
}
