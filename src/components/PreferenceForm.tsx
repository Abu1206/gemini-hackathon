"use client";

import { useState } from "react";
import { SearchParameters } from "@/lib/agent/types";

interface Props {
  onSearch: (params: SearchParameters) => void;
}

export default function PreferenceForm({ onSearch }: Props) {
  const [params, setParams] = useState<SearchParameters>({
    location: "",
    budget: 50,
    age: 25,
    occasion: "",
    isSeasonal: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(params);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="glass fade-in"
      style={{
        padding: "40px",
        maxWidth: "600px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}
    >
      <h2
        className="gradient-text"
        style={{ fontSize: "2rem", textAlign: "center" }}
      >
        Where shall we go?
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <label style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          Select Location
        </label>
        <input
          type="text"
          placeholder="e.g. Lagos, Nigeria"
          value={params.location}
          onChange={(e) => setParams({ ...params, location: e.target.value })}
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid var(--glass-border)",
            padding: "16px",
            borderRadius: "12px",
            color: "white",
            fontSize: "1rem",
          }}
          required
        />
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <label style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Budget ($)
          </label>
          <input
            type="number"
            value={params.budget}
            onChange={(e) =>
              setParams({ ...params, budget: Number(e.target.value) })
            }
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid var(--glass-border)",
              padding: "16px",
              borderRadius: "12px",
              color: "white",
            }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <label style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Your Age
          </label>
          <input
            type="number"
            value={params.age}
            onChange={(e) =>
              setParams({ ...params, age: Number(e.target.value) })
            }
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid var(--glass-border)",
              padding: "16px",
              borderRadius: "12px",
              color: "white",
            }}
          />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <label style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          The Occasion
        </label>
        <input
          type="text"
          placeholder="e.g. Birthday party, romantic dinner, family outing..."
          value={params.occasion}
          onChange={(e) => setParams({ ...params, occasion: e.target.value })}
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid var(--glass-border)",
            padding: "16px",
            borderRadius: "12px",
            color: "white",
            fontSize: "1rem",
          }}
          required
        />
      </div>

      <button
        type="submit"
        className="btn-primary"
        style={{ width: "100%", marginTop: "12px" }}
      >
        Start Scout 🚀
      </button>

      <p
        style={{
          textAlign: "center",
          fontSize: "0.8rem",
          color: "var(--accent-gold)",
          opacity: 0.8,
        }}
      >
        ⚡ Powered by Gemini 3 & Social Intelligence
      </p>
    </form>
  );
}
