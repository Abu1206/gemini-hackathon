#!/usr/bin/env node

/**
 * Debug script to test Gemini Live API connection
 * Run with: node debug-gemini.js
 */

const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

// Load .env file manually since this is a standalone script
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...valueParts] = trimmed.split("=");
      const value = valueParts.join("=").trim();
      if (key && value) {
        process.env[key] = value;
      }
    }
  });
}

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("❌ GEMINI_API_KEY not set!");
  console.error(
    "Make sure .env file exists and contains: GEMINI_API_KEY=AIzaSy..."
  );
  process.exit(1);
}

console.log("🔍 Testing Gemini Live API connection...");
console.log("API Key:", apiKey.substring(0, 10) + "...");

const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;

console.log("Connecting to:", wsUrl.substring(0, 80) + "...");

const ws = new WebSocket(wsUrl);

const timeout = setTimeout(() => {
  console.error("❌ Connection timeout after 10 seconds");
  ws.close();
  process.exit(1);
}, 10000);

ws.on("open", () => {
  console.log("✓ WebSocket connected!");
  clearTimeout(timeout);

  console.log("Sending setup message...");
  const setupMessage = {
    setup: {
      model: "models/gemini-2.0-flash-exp",
      generationConfig: {
        responseModalities: ["TEXT"],
      },
      systemInstruction: {
        parts: [{ text: "Hello" }],
      },
    },
  };

  ws.send(JSON.stringify(setupMessage));

  setTimeout(() => {
    console.log("✓ Setup sent, closing...");
    ws.close();
    process.exit(0);
  }, 1000);
});

ws.on("message", (data) => {
  console.log(
    "📨 Received message:",
    data.toString().substring(0, 100) + "..."
  );
});

ws.on("error", (error) => {
  clearTimeout(timeout);
  console.error("❌ WebSocket error:");
  console.error("  Type:", error.constructor.name);
  console.error("  Message:", error.message);
  if (error instanceof AggregateError) {
    console.error("  AggregateError details:");
    for (const err of error.errors) {
      console.error("    -", err.message || err);
    }
  }
  process.exit(1);
});

ws.on("close", (code, reason) => {
  console.log("Connection closed:", code, reason ? reason.toString() : "");
  process.exit(0);
});
