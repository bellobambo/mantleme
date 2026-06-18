import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy_key',
});

const MNT_ADDRESS = '0x78c1b0c915c4faa5fffa6cabf0219da63d7f4cb8';
const DAY_SECONDS = 86_400;

export type DataStatus = 'fresh' | 'stale' | 'unavailable' | 'derived';

export type DataMetadata = {
  source: string;
  sourceUrl?: string;
  updatedAt?: string;
  status: DataStatus;
  methodology: string;
};

export type TokenData = {
  usd?: number;
  usd_24h_change?: number;
  usd_market_cap?: number;
  liquidityUsd?: number;
  pairs?: number;
  metadata: DataMetadata;
  liquidityMetadata: DataMetadata;
};

export type TVLData = {
  tvl?: number;
  change7d?: number;
  date?: string;
  comparisonDate?: string;
  history?: Array<{ date: number; tvl: number }>;
  metadata: DataMetadata;
};

export type WalletData = {
  activeWhales?: number;
  topWhaleBalance?: string;
  metadata: DataMetadata;
};

export type RiskFactor = {
  label: string;
  value: string;
  score: number;
  weight: number;
  source: string;
};

export type RiskData = {
  score?: string;
  numericScore?: number;
  coverage?: number;
  level?: string;
  factors: RiskFactor[];
  unavailableFactors: string[];
  metadata: DataMetadata;
};

export type ResearchContext = {
  token: TokenData;
  tvl: TVLData;
  wallet: WalletData;
  risk: RiskData;
};

function isoFromUnix(timestamp?: number) {
  return timestamp ? new Date(timestamp * 1000).toISOString() : undefined;
}

function freshnessStatus(updatedAt?: string, staleAfterMs = 10 * 60 * 1000): DataStatus {
  if (!updatedAt) return 'unavailable';
  return Date.now() - new Date(updatedAt).getTime() <= staleAfterMs ? 'fresh' : 'stale';
}

async function fetchDexLiquidity() {
  try {
    const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${MNT_ADDRESS}`, {
      next: { revalidate: 60 },
      headers: { accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`DEX Screener responded with ${response.status}`);

    const payload = await response.json();
    const mantlePairs = (payload.pairs || [])
      .filter((pair: { chainId?: string; liquidity?: { usd?: number } }) =>
        pair.chainId === 'mantle' && Number.isFinite(pair.liquidity?.usd))
      .sort((a: { liquidity?: { usd?: number } }, b: { liquidity?: { usd?: number } }) =>
        (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));

    const updatedAt = new Date().toISOString();
    return {
      liquidityUsd: mantlePairs.reduce(
        (total: number, pair: { liquidity?: { usd?: number } }) => total + (pair.liquidity?.usd || 0),
        0,
      ),
      pairs: mantlePairs.length,
      metadata: {
        source: 'DEX Screener',
        sourceUrl: `https://dexscreener.com/mantle/${MNT_ADDRESS}`,
        updatedAt,
        status: 'fresh' as DataStatus,
        methodology: 'Sum of reported USD liquidity across MNT pairs on Mantle.',
      },
    };
  } catch {
    return {
      metadata: {
        source: 'DEX Screener',
        status: 'unavailable' as DataStatus,
        methodology: 'DEX liquidity unavailable; no fallback value is substituted.',
      },
    };
  }
}

export async function executeTokenSkill() {
  const dexDataPromise = fetchDexLiquidity();

  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=mantle&vs_currencies=usd&include_market_cap=true&include_24hr_change=true&include_last_updated_at=true',
      {
        next: { revalidate: 60 },
        headers: { accept: 'application/json' },
      },
    );
    if (!response.ok) throw new Error(`CoinGecko responded with ${response.status}`);

    const payload = await response.json();
    const mantle = payload.mantle;
    if (!Number.isFinite(mantle?.usd)) throw new Error('CoinGecko returned no Mantle price');

    const updatedAt = isoFromUnix(mantle.last_updated_at);
    const dexData = await dexDataPromise;
    const data: TokenData = {
      usd: mantle.usd,
      usd_24h_change: Number.isFinite(mantle.usd_24h_change) ? mantle.usd_24h_change : undefined,
      usd_market_cap: Number.isFinite(mantle.usd_market_cap) ? mantle.usd_market_cap : undefined,
      liquidityUsd: dexData.liquidityUsd,
      pairs: dexData.pairs,
      metadata: {
        source: 'CoinGecko',
        sourceUrl: 'https://www.coingecko.com/en/coins/mantle',
        updatedAt,
        status: freshnessStatus(updatedAt, 5 * 60 * 1000),
        methodology: 'CoinGecko aggregated MNT/USD price, 24-hour change and market capitalization.',
      },
      liquidityMetadata: dexData.metadata,
    };
    return { name: 'Token Research', data };
  } catch {
    const dexData = await dexDataPromise;
    const data: TokenData = {
      liquidityUsd: dexData.liquidityUsd,
      pairs: dexData.pairs,
      metadata: {
        source: 'CoinGecko',
        status: 'unavailable',
        methodology: 'Price and market-cap data unavailable; no fallback price is substituted.',
      },
      liquidityMetadata: dexData.metadata,
    };
    return { name: 'Token Research', data };
  }
}

export async function executeTVLSkill() {
  try {
    const response = await fetch('https://api.llama.fi/v2/historicalChainTvl/Mantle', {
      next: { revalidate: 300 },
      headers: { accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`DeFiLlama responded with ${response.status}`);

    const payload = await response.json();
    const history = (Array.isArray(payload) ? payload : [])
      .filter((point): point is { date: number; tvl: number } =>
        Number.isFinite(point?.date) && Number.isFinite(point?.tvl))
      .sort((a, b) => a.date - b.date);
    if (history.length === 0) throw new Error('DeFiLlama returned no Mantle TVL');

    const latest = history[history.length - 1];
    const targetTimestamp = latest.date - (7 * DAY_SECONDS);
    const comparison = [...history].reverse().find((point) => point.date <= targetTimestamp);
    const change7d = comparison?.tvl
      ? ((latest.tvl - comparison.tvl) / comparison.tvl) * 100
      : undefined;
    const updatedAt = isoFromUnix(latest.date);

    const data: TVLData = {
      tvl: latest.tvl,
      change7d,
      date: updatedAt,
      comparisonDate: isoFromUnix(comparison?.date),
      history: history.slice(-365),
      metadata: {
        source: 'DeFiLlama',
        sourceUrl: 'https://defillama.com/chain/Mantle',
        updatedAt,
        status: freshnessStatus(updatedAt, 48 * 60 * 60 * 1000),
        methodology: comparison
          ? 'Latest completed daily chain TVL compared with the closest record at or before exactly seven days earlier.'
          : 'Latest completed daily chain TVL; no valid seven-day comparison record was available.',
      },
    };
    return { name: 'TVL Analysis', data };
  } catch {
    const data: TVLData = {
      metadata: {
        source: 'DeFiLlama',
        status: 'unavailable',
        methodology: 'TVL data unavailable; no fallback value is substituted.',
      },
    };
    return { name: 'TVL Analysis', data };
  }
}

export async function executeWalletSkill() {
  const data: WalletData = {
    metadata: {
      source: 'Not configured',
      status: 'unavailable',
      methodology: 'Requires an indexed Mantle holder and transfer dataset with labeled contract, bridge, exchange and treasury addresses.',
    },
  };
  return { name: 'Wallet Tracking', data };
}

function liquidityScore(liquidityUsd: number, marketCap: number) {
  const ratio = liquidityUsd / marketCap;
  if (ratio >= 0.025) return 90;
  if (ratio >= 0.01) return 75;
  if (ratio >= 0.005) return 60;
  return 35;
}

function volatilityScore(change24h: number) {
  const magnitude = Math.abs(change24h);
  if (magnitude <= 3) return 90;
  if (magnitude <= 7) return 75;
  if (magnitude <= 12) return 55;
  return 30;
}

function tvlTrendScore(change7d: number) {
  if (change7d >= 0) return 85;
  if (change7d >= -5) return 70;
  if (change7d >= -10) return 50;
  return 30;
}

function gradeForScore(score: number) {
  if (score >= 85) return { grade: 'A', level: 'Low measured risk' };
  if (score >= 75) return { grade: 'B', level: 'Moderate-low measured risk' };
  if (score >= 60) return { grade: 'C', level: 'Moderate measured risk' };
  if (score >= 45) return { grade: 'D', level: 'Elevated measured risk' };
  return { grade: 'E', level: 'High measured risk' };
}

export async function executeRiskSkill(token: TokenData, tvl: TVLData) {
  const factors: RiskFactor[] = [];

  if (Number.isFinite(token.liquidityUsd) && Number.isFinite(token.usd_market_cap) && token.usd_market_cap! > 0) {
    const ratio = token.liquidityUsd! / token.usd_market_cap!;
    factors.push({
      label: 'DEX liquidity / market cap',
      value: `${(ratio * 100).toFixed(2)}%`,
      score: liquidityScore(token.liquidityUsd!, token.usd_market_cap!),
      weight: 30,
      source: 'DEX Screener + CoinGecko',
    });
  }

  if (Number.isFinite(token.usd_24h_change)) {
    factors.push({
      label: '24h price movement',
      value: `${token.usd_24h_change!.toFixed(2)}%`,
      score: volatilityScore(token.usd_24h_change!),
      weight: 20,
      source: 'CoinGecko',
    });
  }

  if (Number.isFinite(tvl.change7d)) {
    factors.push({
      label: '7d TVL trend',
      value: `${tvl.change7d!.toFixed(2)}%`,
      score: tvlTrendScore(tvl.change7d!),
      weight: 20,
      source: 'DeFiLlama',
    });
  }

  const availableWeight = factors.reduce((total, factor) => total + factor.weight, 0);
  const numericScore = availableWeight
    ? Math.round(factors.reduce((total, factor) => total + factor.score * factor.weight, 0) / availableWeight)
    : undefined;
  const grade = numericScore === undefined ? undefined : gradeForScore(numericScore);
  const unavailableFactors = [
    'Holder concentration',
    'Whale net flows',
    'Contract/admin-key risk',
  ];

  const data: RiskData = {
    score: grade?.grade,
    numericScore,
    coverage: availableWeight,
    level: grade?.level,
    factors,
    unavailableFactors,
    metadata: {
      source: 'MantleMe transparent risk model v1',
      updatedAt: new Date().toISOString(),
      status: numericScore === undefined ? 'unavailable' : 'derived',
      methodology: availableWeight
        ? `Weighted score normalized across available factors only, covering ${availableWeight}% of the full model. Missing factors are excluded, not estimated.`
        : 'Insufficient sourced inputs to calculate a score.',
    },
  };
  return { name: 'Risk Scoring', data };
}

function displayNumber(value?: number, suffix = '') {
  return Number.isFinite(value) ? `${value!.toFixed(2)}${suffix}` : 'Unavailable';
}

export async function generateReport(query: string, dataContext: ResearchContext) {
  if (!process.env.OPENAI_API_KEY) {
    return `# Mantle Research Report: ${query}

## Data quality
- **Price source:** ${dataContext.token.metadata.source} (${dataContext.token.metadata.status})
- **TVL source:** ${dataContext.tvl.metadata.source} (${dataContext.tvl.metadata.status})
- **Wallet analytics:** ${dataContext.wallet.metadata.status}
- **Risk model:** ${dataContext.risk.metadata.source} (${dataContext.risk.metadata.status})

## Token metrics
- **Current price:** ${Number.isFinite(dataContext.token.usd) ? `$${dataContext.token.usd}` : 'Unavailable'}
- **24h change:** ${displayNumber(dataContext.token.usd_24h_change, '%')}
- **Market cap:** ${Number.isFinite(dataContext.token.usd_market_cap) ? `$${dataContext.token.usd_market_cap}` : 'Unavailable'}
- **DEX liquidity:** ${Number.isFinite(dataContext.token.liquidityUsd) ? `$${dataContext.token.liquidityUsd}` : 'Unavailable'}

## TVL analysis
- **Current TVL:** ${Number.isFinite(dataContext.tvl.tvl) ? `$${dataContext.tvl.tvl}` : 'Unavailable'}
- **7d change:** ${displayNumber(dataContext.tvl.change7d, '%')}
- **Methodology:** ${dataContext.tvl.metadata.methodology}

## Wallet tracking
${dataContext.wallet.metadata.methodology}

## Calculated risk
- **Grade:** ${dataContext.risk.score || 'Unavailable'}
- **Numeric score:** ${dataContext.risk.numericScore ?? 'Unavailable'}
- **Model coverage:** ${dataContext.risk.coverage ?? 0}%
- **Methodology:** ${dataContext.risk.metadata.methodology}
- **Unavailable factors:** ${dataContext.risk.unavailableFactors.join(', ')}

*Add OPENAI_API_KEY to enable narrative AI synthesis. No unavailable values are replaced with fabricated defaults.*`;
  }

  const prompt = `You are a Mantle DeFi Research Agent. The user asked: "${query}".
Use only the supplied data. Never invent missing values, holder statistics, wallet activity, risk factors, sources, or dates.
Clearly distinguish sourced measurements from derived scores and state when data is unavailable.

Data: ${JSON.stringify(dataContext)}

Format with:
- Executive Summary
- Data Quality and Sources
- Token Metrics
- Protocol/TVL Trends
- Wallet Data Availability
- Calculated Risk Assessment and Missing Factors
Make it professional, concise, and highly informative.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: prompt }],
    });
    return response.choices[0].message.content || '# Report unavailable';
  } catch {
    return '# Error generating report\n\nPlease check the OpenAI API key and service availability.';
  }
}
