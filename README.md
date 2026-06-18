# Mantle AI Research Agent

A lightweight, modular AI agent that analyzes Mantle DeFi tokens, wallets, and protocols. Built with Next.js, this agent coordinates multiple "skills" to gather onchain data and compile structured markdown reports via an intuitive dashboard.

## 🚀 Features
- **Modular AI Agent Skills**: Dynamically loads and executes specific skills based on the query.
  - **Token Research Skill**: Real-time price, liquidity, and token metrics.
  - **TVL Analysis Skill**: Protocol growth and chain-level TVL trends.
  - **Wallet Tracking Skill**: Whale tracking and large transfer analysis.
  - **Risk Scoring Skill**: Liquidity and concentration risk assessment.
- **Dynamic Dashboard**: Beautiful UI built with Next.js and Tailwind CSS 4.
- **Onchain Data Integrations**: Live data fetching from CoinGecko, DeFiLlama, and Mantle APIs.
- **Downloadable Reports**: Exports AI-generated insights as a structured Markdown file.

## 🛠️ Tech Stack
- **Frontend**: Next.js (React), Tailwind CSS, Framer Motion
- **Backend Agent Engine**: Next.js API Routes, Node.js
- **AI Layer**: OpenAI API (gpt-4o-mini)
- **Data Layer**: DeFiLlama API, CoinGecko API

## 🏃‍♂️ How to Run

1. Clone and install dependencies:
   ```bash
   npm install
   ```

2. Add your API Keys to a `.env` file:
   ```env
   OPENAI_API_KEY=your-openai-api-key
   ```
   *(Note: The agent gracefully falls back to static template generation if the key is missing)*

3. Start the Development Server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) and enter a query like `"Analyze Mantle TVL and token risks"`.

## 📂 Project Architecture
- `app/page.tsx`: The main Dashboard UI with interactive animations.
- `app/api/research/route.ts`: API endpoint acting as the orchestrator.
- `lib/agent.ts`: Contains the modular Skill definitions and LLM integration.

Built for **Track 2: The Research Agent**.
