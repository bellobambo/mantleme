"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ConfigProvider, Drawer, Dropdown } from "antd";
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
  ChevronDown,
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
    metadata?: DataMetadata;
    liquidityMetadata?: DataMetadata;
  };
  tvl?: {
    tvl?: number;
    change7d?: number;
    date?: string;
    comparisonDate?: string;
    history?: Array<{ date: number; tvl: number }>;
    metadata?: DataMetadata;
  };
  wallet?: {
    activeWhales?: number;
    topWhaleBalance?: string;
    metadata?: DataMetadata;
  };
  risk?: {
    score?: string;
    numericScore?: number;
    coverage?: number;
    level?: string;
    metadata?: DataMetadata;
  };
};

type DataMetadata = {
  source: string;
  updatedAt?: string;
  status: "fresh" | "stale" | "unavailable" | "derived";
  methodology: string;
};

const skills = [
  { name: "mantle-network-primer", label: "Network Primer", detail: "Official Mantle context", icon: Network },
  { name: "mantle-data-indexer", label: "Data Indexer", detail: "Historical analytics workflow", icon: Activity },
  { name: "mantle-portfolio-analyst", label: "Portfolio Analyst", detail: "Balances and exposure", icon: Wallet },
  { name: "mantle-defi-operator", label: "DeFi Operator", detail: "Protocols and liquidity", icon: Zap },
  { name: "mantle-risk-evaluator", label: "Risk Evaluator", detail: "Safety and risk guardrails", icon: ShieldCheck },
];

const ecosystemUpdates = [
  {
    tag: "APRIL 2026 · CHAT-NATIVE",
    title: "Mantle flows in daily chat",
    copy: "Purr-Fect Claw brings Mantle AI Agent Skills to WhatsApp, Line, Kakao and more.",
    href: "https://x.com/pieverse_io/status/2039674214375117111?s=20",
  },
  {
    tag: "APRIL 2026 · PROMPT-TO-DEFI",
    title: "INFINIT on Mantle",
    copy: "One prompt can swap through LI.FI or lend and borrow through Aave on Mantle.",
    href: "https://x.com/Infinit_Labs/status/2041486236733624627?s=20",
  },
  {
    tag: "APRIL 2026 · LIVE INTEL",
    title: "Fluxion × Elfa AI",
    copy: "The intel you needed mid-trade is now inside the terminal: real-time social alpha, asset queries and trade setups without leaving Fluxion.",
    href: "https://x.com/Fluxion_network/status/2041472520906506347?s=20",
  },
  {
    tag: "MARCH 2026 · COMMUNITY",
    title: "When AI Meets Mantle",
    copy: "We introduced AI Agent Skills & Scaffold on Mantle, allowing faster integration, more accurate execution, built for connected environments.",
    href: "https://x.com/Mantle_Official/status/2032422157880619166?s=20",
  },
  {
    tag: "MARCH 2026 · TURING TEST",
    title: "OpenClaw agents can now trade on Mantle",
    copy: "Ask it to look up a token, check prices and execute all via natural language on @byreal_io.",
    href: "https://x.com/byreal_io/status/2029498273623379991?s=20",
  },
  {
    tag: "OCTOBER 2025 · AUTONOMOUS PAYMENTS",
    title: "x402 facilitator × Questflow",
    copy: "Questflow's x402 facilitator enables autonomous, real-time payments embedded directly into Mantle's modular chain.",
    href: "https://x.com/Mantle_Official/status/1982662047621079157?s=20",
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

function formatSource(metadata?: DataMetadata, isLoading = false) {
  if (isLoading) return "Loading source…";
  if (!metadata) return "";
  if (!metadata.updatedAt) return `${metadata.source} · ${metadata.status}`;

  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - new Date(metadata.updatedAt).getTime()) / 1000));
  const elapsed = elapsedSeconds < 60
    ? `${elapsedSeconds}s ago`
    : elapsedSeconds < 3600
      ? `${Math.floor(elapsedSeconds / 60)}m ago`
      : elapsedSeconds < 86_400
        ? `${Math.floor(elapsedSeconds / 3600)}h ago`
        : `${Math.floor(elapsedSeconds / 86_400)}d ago`;

  return `${metadata.source} · ${elapsed}`;
}

function formatReportForDisplay(report: string) {
  let formatted = report.replace(
    /(?:collected_at_utc|Collected at UTC):\s*(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)/gi,
    (_, timestamp: string) => {
      const collectedAt = new Date(timestamp);
      if (Number.isNaN(collectedAt.getTime())) return `Collected: ${timestamp}`;

      const dateStr = new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "UTC",
        timeZoneName: "short",
      }).format(collectedAt);

      return `Collected: ${dateStr}`;
    },
  );

  formatted = formatted.replace(
    /(\s*[-*]\s+)(?:\*\*)?([a-z0-9_]+)(?:\*\*)?:(?:\*\*)?/g,
    (_, prefix: string, key: string) => {
      const titleCaseKey = key
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      const finalKey = titleCaseKey
        .replace(/\bUsd\b/g, "USD")
        .replace(/\bId\b/g, "ID")
        .replace(/\bLp\b/g, "LP")
        .replace(/\bLb\b/g, "LB")
        .replace(/\bV3\b/gi, "V3")
        .replace(/\bAave\b/gi, "Aave");

      return `${prefix}**${finalKey}**:`;
    }
  );

  return formatted;
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
  const [activeDeepDive, setActiveDeepDive] = useState<string | null>(null);
  const [isSavingPdf, setIsSavingPdf] = useState(false);

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

  const runResearch = async (researchQuery: string, deepDiveTitle?: string) => {
    const trimmedQuery = researchQuery.trim();
    if (!trimmedQuery || isLoading) return;

    setQuery(trimmedQuery);
    setIsLoading(true);
    setActiveDeepDive(deepDiveTitle || null);
    setError("");
    setResult(null);
    setActiveSkills([]);

    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmedQuery }),
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
      setActiveDeepDive(null);
    }
  };

  const handleResearch = (event?: FormEvent) => {
    event?.preventDefault();
    void runResearch(query);
  };

  const handleDeepDive = (update: (typeof ecosystemUpdates)[number]) => {
    const researchQuery = [
      `Deep dive into this Mantle ecosystem signal: "${update.title}".`,
      update.copy,
      `Explain what it is, how it works, why it matters to Mantle users and builders,`,
      `the key opportunities, dependencies and risks, and practical next steps.`,
      `Source context: ${update.href}`,
    ].join(" ");

    void runResearch(researchQuery, update.title);
  };

  const reportFilename = `mantle-research-${new Date().toISOString().split("T")[0]}`;

  const handleMarkdownDownload = () => {
    if (!result) return;
    const url = URL.createObjectURL(new Blob([formatReportForDisplay(result)], { type: "text/markdown" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${reportFilename}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handlePdfDownload = async () => {
    if (!result || isSavingPdf) return;
    setIsSavingPdf(true);

    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 48;
      const contentWidth = pageWidth - margin * 2;
      let y = margin;

      const ensureSpace = (height: number) => {
        if (y + height <= pageHeight - margin) return;
        pdf.addPage();
        y = margin;
      };

      pdf.setTextColor(36, 91, 67);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(18);
      pdf.text("MantleMe Research Report", margin, y);
      y += 22;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(95, 119, 108);
      pdf.text(`Generated ${new Date().toLocaleString()}`, margin, y);
      y += 28;

      const lines = formatReportForDisplay(result || "")
        .replace(/```[\s\S]*?```/g, (block) => block.replace(/```[a-z]*\n?/gi, "").replace(/```/g, ""))
        .split("\n");

      for (const rawLine of lines) {
        const headingMatch = rawLine.match(/^(#{1,3})\s+(.+)$/);
        const isListItem = /^\s*[-*]\s+/.test(rawLine);
        const text = rawLine
          .replace(/^(#{1,6})\s+/, "")
          .replace(/^\s*[-*]\s+/, "- ")
          .replace(/\*\*(.*?)\*\*/g, "$1")
          .replace(/`([^`]+)`/g, "$1")
          .replace(/\[(.*?)\]\((.*?)\)/g, "$1 ($2)")
          .replace(/[^\x20-\x7E]/g, " ")
          .trim();

        if (!text) {
          y += 8;
          continue;
        }

        const fontSize = headingMatch ? (headingMatch[1].length === 1 ? 16 : headingMatch[1].length === 2 ? 13 : 11) : 10;
        const lineHeight = fontSize * 1.45;
        pdf.setFont("helvetica", headingMatch ? "bold" : "normal");
        pdf.setFontSize(fontSize);
        pdf.setTextColor(36, 91, 67);

        const wrapped = pdf.splitTextToSize(text, contentWidth - (isListItem ? 10 : 0)) as string[];
        ensureSpace(wrapped.length * lineHeight + (headingMatch ? 7 : 2));
        pdf.text(wrapped, margin + (isListItem ? 10 : 0), y);
        y += wrapped.length * lineHeight + (headingMatch ? 7 : 2);
      }

      pdf.save(`${reportFilename}.pdf`);
    } finally {
      setIsSavingPdf(false);
    }
  };

  const metrics = [
    {
      label: "MNT price",
      value: isMetricsLoading ? "Loading…" : formatMoney(data.token?.usd, false),
      delta: data.token?.usd_24h_change,
      note: formatSource(data.token?.metadata, isMetricsLoading),
    },
    {
      label: "Mantle TVL",
      value: isMetricsLoading ? "Loading…" : formatMoney(data.tvl?.tvl),
      delta: data.tvl?.change7d,
      note: formatSource(data.tvl?.metadata, isMetricsLoading),
    },
    {
      label: "Market cap",
      value: isMetricsLoading ? "Loading…" : formatMoney(data.token?.usd_market_cap),
      note: formatSource(data.token?.metadata, isMetricsLoading),
    },
    {
      label: "DEX liquidity",
      value: isMetricsLoading ? "Loading…" : formatMoney(data.token?.liquidityUsd),
      note: isMetricsLoading
        ? "Loading source…"
        : data.token?.pairs !== undefined
          ? `${data.token.pairs} tracked MNT pairs · ${formatSource(data.token.liquidityMetadata)}`
          : formatSource(data.token?.liquidityMetadata),
    },
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

        <div className="network-actions">
          <div className="network-pill"><span className="live-dot" /> Mantle Mainnet <b>LIVE</b></div>
          <a className="get-mnt-link" href="https://www.mantle.xyz/mnt" target="_blank" rel="noreferrer">
            Get MNT
            <ExternalLink size={13} />
          </a>
        </div>

        <section className="sidebar-section">
          <div className="section-heading">
            <span>Ecosystem signal</span>
            <Sparkles size={14} />
          </div>
          <div className="update-list">
            {ecosystemUpdates.map((update) => (
              <article className="update-card" key={update.title}>
                <div className="update-card-meta">
                  <span>{update.tag}</span>
                  <a href={update.href} target="_blank" rel="noreferrer" aria-label={`Open source for ${update.title}`}>
                    <ExternalLink size={12} />
                  </a>
                </div>
                <strong>{update.title}</strong>
                <p>{update.copy}</p>
                <button
                  className="update-learn-more"
                  disabled={isLoading}
                  onClick={() => handleDeepDive(update)}
                  type="button"
                >
                  {activeDeepDive === update.title ? <Loader2 className="spin" size={13} /> : <Sparkles size={13} />}
                  {activeDeepDive === update.title ? "Researching…" : "Learn more"}
                </button>
              </article>
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
        </header>

        <section className="metrics-grid">
          {metrics.map((metric) => (
            <div className="metric-card" key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              {metric.delta !== undefined ? (
                <>
                  <small className={metric.delta >= 0 ? "positive" : "negative"}>
                    {metric.delta >= 0 ? "+" : ""}{metric.delta.toFixed(2)}%
                  </small>
                  {metric.note && <small className="metric-source">{metric.note}</small>}
                </>
              ) : metric.note ? <small className="metric-source">{metric.note}</small> : null}
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
                <div className="chart-stat">
                  <strong>{formatMoney(data.tvl?.tvl)}</strong>
                  <span className="chart-live-label">
                    {data.tvl?.metadata?.status === "fresh" && <i className="live-dot" />}
                    {formatSource(data.tvl?.metadata, isMetricsLoading)}
                  </span>
                </div>
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
                  const active = activeSkills.includes(skill.name);
                  return (
                    <div className={`skill-row ${active ? "active" : ""}`} key={skill.name}>
                      <div className="skill-icon">{isLoading ? <Loader2 className="spin" size={17} /> : <Icon size={17} />}</div>
                      <div><strong>{skill.label}</strong><span>{skill.detail}</span></div>
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
          <div className="drawer-title" style={{ display: "flex", alignItems: "center", gap: "32px" }}>
            <div>
              <span>GENERATED OUTPUT</span>
              <strong>MantleMe research report</strong>
            </div>
            <div style={{ display: "flex", gap: "16px", fontSize: "12px" }}>
              <a href="https://docs.mantle.xyz/" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "6px", opacity: 0.8, textDecoration: "none", color: "var(--green)", fontWeight: 600 }}>
                <ExternalLink size={14} />
                Mantle Docs
              </a>
              <a href="https://www.mantle.xyz/ecosystem" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "6px", opacity: 0.8, textDecoration: "none", color: "var(--green)", fontWeight: 600 }}>
                <ExternalLink size={14} />
                Ecosystem
              </a>
            </div>
          </div>
        }
        placement="right"
        width="min(760px, 100vw)"
        open={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        destroyOnHidden
        extra={
          <Dropdown
            placement="bottomRight"
            trigger={["click"]}
            menu={{
              items: [
                { key: "pdf", icon: <FileText size={14} />, label: "Download as PDF" },
                { key: "markdown", icon: <Download size={14} />, label: "Download as Markdown" },
              ],
              onClick: ({ key }) => {
                if (key === "pdf") void handlePdfDownload();
                if (key === "markdown") handleMarkdownDownload();
              },
            }}
          >
            <button className="drawer-save" disabled={isSavingPdf} type="button">
              {isSavingPdf ? <Loader2 className="spin" size={15} /> : <Download size={15} />}
              {isSavingPdf ? "Saving…" : "Save"}
              <ChevronDown size={13} />
            </button>
          </Dropdown>
        }
      >
        <div className="report-content prose">
          <ReactMarkdown>{formatReportForDisplay(result || "")}</ReactMarkdown>
        </div>
      </Drawer>
    </main>
    </ConfigProvider>
  );
}
