# MantleMe

MantleMe is an AI-powered research engine for exploring Mantle’s onchain economy. A user can ask a natural-language question about MNT, TVL, liquidity, DeFi protocols, wallet activity, or risk and receive a structured report with sources, methodology, and known data limitations.

The project is designed to make Mantle research easier to understand and repeat. It combines live market and protocol data with Mantle’s official Agent Skills, then presents the findings through dashboard metrics, a historical TVL chart, ecosystem deep dives, and downloadable Markdown reports.

## Project scope

MantleMe currently supports:

- MNT price, market-cap, and 24-hour movement research.
- Mantle TVL history and timestamp-based trend analysis.
- DEX liquidity and protocol research.
- Transparent, derived risk scoring based on available inputs.
- AI-generated deep dives into Mantle ecosystem updates.
- Source attribution, freshness labels, and explicit unavailable-data states.

Wallet and whale analytics are not estimated. They remain unavailable until a verified Mantle indexer endpoint is configured.

## How Mantle AI Agent Skills are used

MantleMe vendors the official [`mantle-xyz/mantle-skills`](https://github.com/mantle-xyz/mantle-skills) repository under `skills/`. The skills are used as task-specific operating instructions for the AI agent rather than as static content displayed to users.

For each research request:

1. The query is classified and routed to the narrowest relevant Mantle skill:
   - `mantle-network-primer`
   - `mantle-data-indexer`
   - `mantle-portfolio-analyst`
   - `mantle-defi-operator`
   - `mantle-risk-evaluator`
2. The selected skill’s `SKILL.md` is loaded into the agent context.
3. Its workflow, data-quality requirements, safety rules, and output structure guide the research process.
4. The agent can call approved read-only tools from `@mantleio/mantle-mcp` to verify Mantle chain, token, liquidity, lending, protocol, registry, and indexer information.
5. The collected evidence is synthesized into a sourced report.

MantleMe intentionally blocks transaction-building, signing, and broadcasting tools. It uses the Mantle stack for research and verification only.

Learn more about the underlying approach in the [Mantle Agent Skills documentation](https://mantle-xyz.github.io/mantle-agent-scaffold/concepts/skills/).

## Research workflow

```text
User question
  → select an official Mantle skill
  → load its instructions and guardrails
  → gather public dashboard data
  → call relevant read-only Mantle MCP tools
  → generate a structured, sourced report
```

If a required wallet, indexer endpoint, or dataset is missing, the agent reports the gap instead of producing a fabricated result.

## Example

Ask:

```text
Analyze Mantle TVL trends and ecosystem risk.
```

MantleMe routes the request to the relevant DeFi research workflow, compares timestamped TVL history, evaluates available liquidity and market signals, and returns a report containing:

- Current Mantle TVL and its source.
- The measured seven-day change.
- Relevant market and liquidity context.
- A transparent calculated risk score and model coverage.
- Missing factors and data-quality caveats.

The report opens in the dashboard drawer and can be downloaded as Markdown.


MantleMe demonstrates how an AI agent can select specialized Mantle workflows, collect evidence from multiple data sources, apply consistent research guardrails, and explain both its findings and its limitations.

The dashboard also provides a workflow other builders can extend with additional skills, protocols, indexers, or scoring methodologies.

## Data sources

- **CoinGecko:** MNT price, market cap, and 24-hour change.
- **DEX Screener:** Mantle DEX liquidity.
- **DeFiLlama:** Mantle historical chain TVL.
- **Mantle MCP:** Read-only Mantle chain, protocol, token, liquidity, lending, registry, and indexer tools.
- **OpenAI:** Tool selection and report synthesis.




## Run locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env`:

   ```env
   OPENAI_API_KEY=your-openai-api-key

   # Optional historical analytics providers
   MANTLE_SUBGRAPH_ENDPOINT=
   MANTLE_SQL_INDEXER_ENDPOINT=
   ```

3. Start the application:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

The official Mantle skills are stored under `skills/`. `skills/MANTLE_SKILLS_REVISION` records the upstream commit used by this project.
