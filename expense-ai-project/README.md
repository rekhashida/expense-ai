# 💸 ExpenseAI — Smart Budget Tracker

An AI-powered personal finance app built with React + Vite, featuring UPI payment tracking (GPay, Paytm, PhonePe & more), income tracking, category-wise budgets, spending predictions, savings goals, recurring expenses, and a Claude-powered AI financial advisor.

## ✨ Features

- 📊 **Dashboard** — budget ring, income vs expense vs net savings, spending predictions, category budget progress, payment method usage, 6-month trend
- 💰 **Income Tracking** — log salary, freelance, business, rental, and other income; see net savings automatically
- 🎯 **Category Budgets** — set a spending limit per category (Food, Bills, Shopping, etc.), not just one overall number
- 🔮 **Spending Predictions** — a live "at this rate you'll spend ₹X by month end" projection based on your daily average
- 💳 **UPI Integration** — track expenses by GPay, Paytm, PhonePe, BHIM, Amazon Pay, CRED, Navi, Cash, Card, Net Banking
- 📋 **History** — separate Expenses / Income views, filter by month/category/payment method, search, CSV export
- 🎯 **Savings Goals** — set targets, track progress, quick-add contributions
- 🔄 **Recurring Expenses** — subscriptions, EMIs, rent with due-date reminders
- 🤖 **AI Advisor** — chat with Claude AI about your spending, get personalized tips, powered by a secure backend
- 👤 **User Profile** — avatar, personal info, UPI IDs, budget settings, currency
- 🔔 **Smart Alerts** — budget threshold warnings, recurring payment reminders

## 🚀 Getting Started

This project has two parts that both need to run at the same time:
1. **Frontend** (the app itself) — in the root folder
2. **Backend** (powers the AI Advisor chat) — in the `/server` folder

### Prerequisites
- [Node.js](https://nodejs.org/) version 18 or higher
- An Anthropic API key (only needed for the AI Advisor) — get one free at [console.anthropic.com](https://console.anthropic.com)

### Step 1 — Install and run the frontend

Open a terminal in the project's root folder:

\`\`\`bash
npm install
npm run dev
\`\`\`

This starts the app at `http://localhost:5173`. You can open that right away — everything except the AI Advisor tab will work immediately (expenses, income, budgets, goals, recurring bills, UPI tracking, profile).

### Step 2 — Install and run the backend (for AI Advisor)

Open a **second terminal** (keep the first one running) and go into the `server` folder:

\`\`\`bash
cd server
npm install
\`\`\`

Then create your API key file:
1. Copy `.env.example` to a new file named `.env`
2. Open `.env` and paste your real Anthropic API key in place of `sk-ant-your-key-here`

Then start the backend:

\`\`\`bash
npm start
\`\`\`

You should see:
\`\`\`
✅ ExpenseAI backend running at http://localhost:3001
\`\`\`

Now go back to your browser at `http://localhost:5173`, open the **AI tab**, and chat with your AI financial advisor — it now works fully, using your real spending, income, and budget data.

> Keep both terminals open while using the app: one running the frontend (`npm run dev`), one running the backend (`npm start` inside `/server`).

### Building for Production

\`\`\`bash
npm run build
\`\`\`

This creates an optimized `dist/` folder. See the **Deployment** section below for putting this online.

## 📁 Project Structure

\`\`\`
expense-ai-project/
├── index.html              # HTML entry point
├── package.json            # Frontend dependencies & scripts
├── vite.config.js          # Vite config (includes dev proxy to backend)
├── src/
│   ├── main.jsx             # React entry point
│   └── App.jsx              # Main application (all features)
├── server/                  # Backend — powers the AI Advisor securely
│   ├── index.js              # Express server, calls Anthropic API
│   ├── package.json          # Backend dependencies
│   ├── .env.example          # Copy this to .env and add your API key
│   └── .gitignore
└── README.md                # This file
\`\`\`

## 🔒 Why does the AI Advisor need a backend?

The AI Advisor sends your spending summary to Claude and gets advice back. That requires an API key. Putting an API key directly in frontend code is unsafe — anyone visiting your site could view it in their browser and use it (and your bill) themselves. The `/server` folder solves this: your key lives only on the server, never in the browser, and the frontend just talks to your own backend at `/api/chat`.

## 🌐 Deployment

When you're ready to put this online (not just on your own computer), you'll deploy the frontend and backend separately:

- **Frontend** → any static host: Vercel, Netlify, GitHub Pages, Cloudflare Pages
- **Backend** → any Node host: Render, Railway, Fly.io, or a Vercel/Netlify serverless function

Ask your AI assistant (Claude) to walk you through deploying to your preferred platform when you're ready — the steps differ slightly by host.

## 💾 Data Storage

All your expense, income, goal, and budget data is stored in your browser's `localStorage` — it stays on your device. Only the AI Advisor sends data externally, and only a summarized version (totals, categories, not raw transaction details) to power its advice.

## 🛠️ Built With

- React 18 + Vite (frontend)
- Express + Anthropic SDK (backend)
- Claude AI (Sonnet 4.6) for the financial advisor chat

## 📜 License

This project was generated for personal use. Feel free to modify and extend it however you like!