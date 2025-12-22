"use client";

import { AgentStep } from "@/lib/agent/types";
import { Brain, Search, TrendingUp, Sparkles, CheckCircle } from "lucide-react";

interface Props {
  steps: AgentStep[];
}

const getStepIcon = (index: number, status: string) => {
  const icons = [Brain, Search, TrendingUp, Sparkles, CheckCircle];
  const Icon = icons[index % icons.length];
  return (
    <Icon
      size={20}
      color={
        status === "completed" ? "var(--accent-gold)" : "var(--text-secondary)"
      }
    />
  );
};

export default function AgentTimeline({ steps }: Props) {
  return (
    <div
      className="fade-in"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        width: "100%",
      }}
    >
      <h3
        style={{
          color: "var(--accent-gold)",
          fontSize: "1.1rem",
          textTransform: "uppercase",
          letterSpacing: "0.15em",
          textAlign: "center",
          marginBottom: "8px",
          fontWeight: "700",
        }}
      >
        🧠 Agent Reasoning Process
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {steps.map((step, i) => (
          <div
            key={step.id}
            className="glass premium-card"
            style={{
              padding: "20px 24px",
              borderLeft:
                step.status === "completed"
                  ? "4px solid var(--accent-gold)"
                  : step.status === "error"
                  ? "4px solid #ff4444"
                  : "4px solid var(--text-secondary)",
              animation: "slideInLeft 0.4s ease forwards",
              animationDelay: `${i * 0.1}s`,
              opacity: 0,
              transform: "translateX(-20px)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "16px",
              }}
            >
              <div
                style={{
                  marginTop: "2px",
                  animation:
                    step.status === "executing"
                      ? "pulse 1.5s ease-in-out infinite"
                      : "none",
                }}
              >
                {getStepIcon(i, step.status)}
              </div>

              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "8px",
                  }}
                >
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: "1rem",
                      color:
                        step.status === "completed"
                          ? "white"
                          : "var(--text-secondary)",
                    }}
                  >
                    {step.action}
                  </span>
                  <span
                    style={{
                      fontSize: "0.7rem",
                      textTransform: "uppercase",
                      padding: "4px 10px",
                      borderRadius: "12px",
                      background:
                        step.status === "completed"
                          ? "rgba(201,160,80,0.2)"
                          : step.status === "error"
                          ? "rgba(255,68,68,0.2)"
                          : "rgba(255,255,255,0.1)",
                      color:
                        step.status === "completed"
                          ? "var(--accent-gold)"
                          : step.status === "error"
                          ? "#ff4444"
                          : "var(--text-secondary)",
                      fontWeight: "700",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {step.status}
                  </span>
                </div>

                {step.thoughtSignature && (
                  <div
                    style={{
                      fontSize: "0.88rem",
                      color: "var(--accent-gold)",
                      fontStyle: "italic",
                      background: "rgba(201,160,80,0.08)",
                      padding: "12px 14px",
                      borderRadius: "8px",
                      borderLeft: "2px solid var(--accent-gold)",
                      lineHeight: "1.5",
                    }}
                  >
                    💭 {step.thoughtSignature}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {steps.length > 0 && (
        <div style={{ textAlign: "center", padding: "16px" }}>
          <div
            className="spinner"
            style={{
              border: "3px solid var(--glass-border)",
              borderTop: "3px solid var(--accent-gold)",
              borderRadius: "50%",
              width: "28px",
              height: "28px",
              margin: "0 auto",
              animation: "spin 1s linear infinite",
            }}
          ></div>
          <p
            style={{
              marginTop: "12px",
              fontSize: "0.85rem",
              color: "var(--text-secondary)",
              fontStyle: "italic",
            }}
          >
            Processing next step...
          </p>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        @keyframes slideInLeft {
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}
