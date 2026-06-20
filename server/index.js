// ExpenseAI Backend — securely proxies AI Advisor chat requests to Anthropic.
//
// Why this exists: the React app cannot safely call the Anthropic API directly
// from the browser, because that would require putting your API key inside
// frontend code, where anyone could view and steal it. This tiny server holds
// the key instead, and the frontend talks to THIS server.

import "dotenv/config";
import express from "express";
import cors from "cors";
import Anthropic from "@anthropic-ai/sdk";

const app = express();
const PORT = process.env.PORT || 3001;

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn(
    "\n⚠️  WARNING: ANTHROPIC_API_KEY is not set.\n" +
    "   Create a file named '.env' in the /server folder with:\n" +
    "   ANTHROPIC_API_KEY=your-key-here\n" +
    "   Get a key at https://console.anthropic.com\n"
  );
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Simple in-memory rate limiting (per server process) to avoid runaway costs.
const requestLog = [];
const MAX_REQUESTS_PER_MINUTE = 20;

function isRateLimited() {
  const now = Date.now();
  while (requestLog.length && now - requestLog[0] > 60_000) requestLog.shift();
  if (requestLog.length >= MAX_REQUESTS_PER_MINUTE) return true;
  requestLog.push(now);
  return false;
}

app.post("/api/chat", async (req, res) => {
  try {
    if (isRateLimited()) {
      return res.status(429).json({ error: "Too many requests — please wait a moment and try again." });
    }

    const { system, messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Missing 'messages' array." });
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: system || "You are a helpful personal finance assistant.",
      messages,
    });

    res.json({ content: response.content });
  } catch (err) {
    console.error("Anthropic API error:", err.message);

    // Friendly, specific messages for the most common setup issues —
    // shown directly in the chat so the user isn't stuck guessing.
    const msg = err.message || "";

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(200).json({
        error: "🔧 AI Advisor isn't set up yet. Add your Anthropic API key to server/.env to enable this feature — see the README for steps. Everything else in the app works without it!"
      });
    }

    if (msg.includes("credit balance is too low") || msg.includes("insufficient_quota")) {
      return res.status(200).json({
        error: "💳 AI Advisor needs API credits to respond. This feature is paid separately from the rest of the app — add credit at console.anthropic.com if you'd like to use it, or just ignore this tab. Everything else in ExpenseAI works for free!"
      });
    }

    if (msg.includes("authentication") || msg.includes("invalid x-api-key") || msg.includes("401")) {
      return res.status(200).json({
        error: "🔑 The API key in server/.env looks invalid. Double-check it was copied correctly from console.anthropic.com."
      });
    }

    res.status(200).json({ error: "AI request failed. Check the backend terminal for details." });
  }
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`✅ ExpenseAI backend running at http://localhost:${PORT}`);
});