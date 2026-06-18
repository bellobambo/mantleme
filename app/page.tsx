"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ConfigProvider, Drawer } from "antd";
import ReactMarkdown from "react-markdown";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  Bot,
  BrainCircuit,
  Check,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Network,
  Search,
  ShieldCheck,
  Sparkles,
  Wallet,
  Zap,
} from "lucide-react";

type ResearchData = {
  token?: {
    usd?: number;
    usd_24h_change?: number;
    usd_market_cap?: number;
    liquidityUsd?: number;
    pairs?: number;
  };
  tvl?: {
    tvl?: number;
    change7d?: number;
    history?: Array<{ date: number; tvl: number }>;
  };
  wallet?: { activeWhales?: number; topWhaleBalance?: string };
  risk?: { score?: string; liquidityRisk?: string; concentrationRisk?: string };
};

const skills = [
  { name: "Token Research", detail: "Price, liquidity & pairs", icon: Activity },
  { name: "TVL Analysis", detail: "Protocol growth trends", icon: Network },
  { name: "Wallet Tracking", detail: "Transactions & whale flows", icon: Wallet },
  { name: "Risk Scoring", detail: "Liquidity & concentration", icon: ShieldCheck },
  { name: "Report Skill", detail: "Structured AI synthesis", icon: FileText },
];

const ecosystemUpdates = [
  {
    tag: "APRIL 2026 · CHAT-NATIVE",
    title: "Mantle flows in daily chat",
    copy: "Purr-Fect Claw brings Mantle AI Agent Skills to WhatsApp, Line, Kakao and more.",
    href: "https://x.com/Mantle_Official/status/2044771070276956579?s=20",
  },
  {
    tag: "APRIL 2026 · PROMPT-TO-DEFI",
    title: "INFINIT on Mantle",
    copy: "One prompt can swap through LI.FI or lend and borrow through Aave on Mantle.",
    href: "https://x.com/Mantle_Official/status/2044771070276956579?s=20",
  },
  {
    tag: "APRIL 2026 · LIVE INTEL",
    title: "Fluxion × Elfa AI",
    copy: "Real-time social alpha, asset queries and trade setups now live inside the trading terminal.",
    href: "https://x.com/Mantle_Official/status/2044771070276956579?s=20",
  },
  {
    tag: "MARCH 2026 · COMMUNITY",
    title: "When AI Meets Mantle",
    copy: "Mantle's creator initiative helps researchers, builders and creators explore practical AI workflows.",
    href: "https://x.com/Mantle_Official/status/2044771070276956579?s=20",
  },
  {
    tag: "LIVE · TURING TEST",
    title: "ClawHack Phase 1",
    copy: "A live build track expanding Mantle's agentic economy through useful, demonstrable agent experiences.",
    href: "https://x.com/Mantle_Official/status/2044771070276956579?s=20",
  },
];

const suggestedQueries = [
  "Analyze Mantle TVL trends and ecosystem risk",
  "Research MNT price, liquidity and market health",
  "Track whale flows and concentration risk on Mantle",
];

function formatMoney(value?: number, compact = true) {
  if (value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: 2,
  }).format(value);
}

const chartRanges = [
  { label: "7D", days: 7 },
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "1Y", days: 365 },
];

function TvlChart({ history = [] }: { history?: Array<{ date: number; tvl: number }> }) {
  const [rangeDays, setRangeDays] = useState(30);
  const values = useMemo(() => history.slice(-rangeDays), [history, rangeDays]);
  const dateLabel = (timestamp?: number) =>
    timestamp
      ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: rangeDays > 90 ? "2-digit" : undefined })
          .format(new Date(timestamp * 1000))
      : "—";

  return (
    <div className="chart-area">
      <div className="chart-controls" aria-label="TVL chart time range">
        {chartRanges.map((range) => (
          <button
            className={rangeDays === range.days ? "active" : ""}
            key={range.label}
            onClick={() => setRangeDays(range.days)}
            type="button"
          >
            {range.label}
          </button>
        ))}
      </div>
      <div className="recharts-shell" aria-label={`Mantle total value locked over ${rangeDays} days, plotted by date in USD`}>
        {values.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={values} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
              <defs>
                <linearGradient id="tvlFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#245b43" stopOpacity={0.24} />
                  <stop offset="72%" stopColor="#245b43" stopOpacity={0.04} />
                  <stop offset="100%" stopColor="#245b43" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#245b43" strokeDasharray="3 7" strokeOpacity={0.12} vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={dateLabel}
                axisLine={false}
                tickLine={false}
                minTickGap={35}
                tick={{ fill: "#5f776c", fontSize: 10 }}
                tickMargin={12}
              />
              <YAxis
                tickFormatter={(value) => formatMoney(Number(value))}
                axisLine={false}
                tickLine={false}
                width={65}
                tick={{ fill: "#5f776c", fontSize: 10 }}
                tickMargin={8}
                domain={["dataMin", "dataMax"]}
              />
              <Tooltip
                cursor={{ stroke: "#245b43", strokeDasharray: "3 4", strokeOpacity: 0.3 }}
                labelFormatter={(label) => dateLabel(Number(label))}
                formatter={(value) => [formatMoney(Number(value), false), "TVL"]}
                contentStyle={{
                  background: "#245b43",
                  border: "none",
                  borderRadius: 10,
                  boxShadow: "0 12px 30px rgba(15, 47, 33, 0.18)",
                  color: "#f3f4f1",
                  fontSize: 12,
                }}
                itemStyle={{ color: "#f3f4f1" }}
                labelStyle={{ color: "#f3f4f1", opacity: 0.75 }}
              />
              <Area
                type="monotone"
                dataKey="tvl"
                stroke="#245b43"
                strokeWidth={2.25}
                fill="url(#tvlFill)"
                activeDot={{ r: 4, fill: "#245b43", stroke: "#f3f4f1", strokeWidth: 2.5 }}
                dot={false}
                animationDuration={600}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : <div className="chart-empty">TVL history is currently unavailable.</div>}
      </div>
      <div className="chart-axis-caption"><span>TVL (USD)</span><span>Date</span></div>
    </div>
  );
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [activeSkills, setActiveSkills] = useState<string[]>([]);
  const [data, setData] = useState<ResearchData>({});
  const [error, setError] = useState("");
  const [isMetricsLoading, setIsMetricsLoading] = useState(true);
  const [isReportOpen, setIsReportOpen] = useState(false);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const response = await fetch("/api/research");
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Dashboard data request failed");
        setData(payload.data || {});
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Unable to load Mantle market data");
      } finally {
        setIsMetricsLoading(false);
      }
    };

    void loadDashboardData();
  }, []);

  const handleResearch = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!query.trim() || isLoading) return;
    setIsLoading(true);
    setError("");
    setResult(null);
    setActiveSkills([]);

    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Research request failed");
      setActiveSkills(payload.skillsUsed || []);
      setResult(payload.report || null);
      setData(payload.data || {});
      setIsReportOpen(Boolean(payload.report));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to run the research agent");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const url = URL.createObjectURL(new Blob([result], { type: "text/markdown" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `mantle-research-${new Date().toISOString().split("T")[0]}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const metrics = [
    { label: "MNT price", value: isMetricsLoading ? "Loading…" : formatMoney(data.token?.usd, false), delta: data.token?.usd_24h_change },
    { label: "Mantle TVL", value: isMetricsLoading ? "Loading…" : formatMoney(data.tvl?.tvl), delta: data.tvl?.change7d },
    { label: "Market cap", value: isMetricsLoading ? "Loading…" : formatMoney(data.token?.usd_market_cap), delta: undefined },
    { label: "Risk score", value: data.risk?.score || "A-", note: data.risk?.liquidityRisk || "Low liquidity risk" },
  ];

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#245b43",
          colorText: "#245b43",
          colorBgElevated: "#f3f4f1",
          borderRadius: 8,
          fontFamily: '"PT Sans", Arial, Helvetica, sans-serif',
        },
      }}
    >
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">M</div>
          <div>
            <strong>MantleMe</strong>
            <span>ONCHAIN INTELLIGENCE</span>
          </div>
        </div>

        <div className="network-pill"><span /> Mantle Mainnet <b>LIVE</b></div>

        <section className="sidebar-section">
          <div className="section-heading">
            <span>Ecosystem signal</span>
            <Sparkles size={14} />
          </div>
          <div className="update-list">
            {ecosystemUpdates.map((update) => (
              <a className="update-card" href={update.href} target="_blank" rel="noreferrer" key={update.title}>
                <div><span>{update.tag}</span><ExternalLink size={12} /></div>
                <strong>{update.title}</strong>
                <p>{update.copy}</p>
              </a>
            ))}
          </div>
        </section>

      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">MANTLEME · RESEARCH AGENT</p>
            <h1>Research the onchain economy.</h1>
          </div>
          <div className="system-status"><span /> Agent engine operational</div>
        </header>

        <section className="metrics-grid">
          {metrics.map((metric) => (
            <div className="metric-card" key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              {metric.delta !== undefined ? (
                <small className={metric.delta >= 0 ? "positive" : "negative"}>
                  {metric.delta >= 0 ? "+" : ""}{metric.delta.toFixed(2)}%
                </small>
              ) : <small>{metric.note || "Live market context"}</small>}
            </div>
          ))}
        </section>

        <div className="dashboard-grid">
          <section className="main-column">
            <div className="panel hero-panel">
              <div className="hero-copy">
                <span className="hero-kicker"><BrainCircuit size={15} /> MODULAR AI RESEARCH</span>
                <h2>Ask Mantle.<br /><em>Get structured intelligence.</em></h2>
                <p>Analyze tokens, protocols, wallets and risk with live onchain data and specialized agent skills.</p>
              </div>

              <form className="research-form" onSubmit={handleResearch}>
                <Search size={20} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="What do you want to research on Mantle?"
                  aria-label="Mantle research query"
                />
                <button disabled={!query.trim() || isLoading}>
                  {isLoading ? <Loader2 className="spin" size={18} /> : <Zap size={18} />}
                  {isLoading ? "Researching" : "Run agent"}
                </button>
              </form>

              <div className="query-chips">
                {suggestedQueries.map((suggestion) => (
                  <button type="button" onClick={() => setQuery(suggestion)} key={suggestion}>{suggestion}</button>
                ))}
              </div>
              {error && <p className="error-message">{error}</p>}
            </div>

            <div className="panel chart-panel">
              <div className="panel-header">
                <div><span>MANTLE NETWORK</span><h3>Total value locked</h3></div>
                <div className="chart-stat"><strong>{formatMoney(data.tvl?.tvl)}</strong><span>LIVE DATA</span></div>
              </div>
              <TvlChart history={data.tvl?.history} />
            </div>

          </section>

          <aside className="right-column">
            <section className="panel">
              <div className="panel-header compact"><div><span>AGENT LAYER</span><h3>Research skills</h3></div><Bot size={20} /></div>
              <div className="skills-list">
                {skills.map((skill, index) => {
                  const Icon = skill.icon;
                  const active = activeSkills.includes(skill.name) || (skill.name === "Report Skill" && Boolean(result));
                  return (
                    <div className={`skill-row ${active ? "active" : ""}`} key={skill.name}>
                      <div className="skill-icon">{isLoading ? <Loader2 className="spin" size={17} /> : <Icon size={17} />}</div>
                      <div><strong>{skill.name}</strong><span>{skill.detail}</span></div>
                      <div className="skill-state">{active ? <Check size={14} /> : index + 1}</div>
                    </div>
                  );
                })}
              </div>
            </section>
            {result && (
              <button className="report-trigger" onClick={() => setIsReportOpen(true)}>
                <FileText size={17} />
                View latest report
              </button>
            )}

          </aside>
        </div>
      </section>
      <Drawer
        className="report-drawer"
        title={
          <div className="drawer-title">
            <span>GENERATED OUTPUT</span>
            <strong>MantleMe research report</strong>
          </div>
        }
        placement="right"
        width="min(760px, 100vw)"
        open={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        destroyOnHidden
        extra={
          <button className="drawer-download" onClick={handleDownload} type="button">
            <Download size={15} />
            Download .md
          </button>
        }
      >
        <div className="report-content prose"><ReactMarkdown>{result || ""}</ReactMarkdown></div>
      </Drawer>
    </main>
    </ConfigProvider>
  );
}
