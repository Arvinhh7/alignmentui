"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import {
  Zap, ShoppingCart, TrendingUp, ArrowRight, Activity,
  MessageCircle, Smartphone, Mic2, Shirt, Wrench,
  Store, Globe, Shield, CheckCircle, Circle,
  ChevronRight, AlertCircle, BarChart2, RefreshCw,
  Package, CreditCard, Cpu, Radio,
} from "lucide-react";

// ── Design tokens (commerce accent = violet) ───────────────────────────────────
const V = {
  accent:      "#6D4AE8",
  accentBg:    "#F0EEFF",
  accentLight: "#EDE8FF",
  accentBorder:"#C4B5FD",
};

// ── Mock data ──────────────────────────────────────────────────────────────────
const MOCK_METRICS = {
  queries:     12_847,
  brands:      842,
  commits:     3_291,
  gmv:         847_293,
  successRate: 25.62,
  delta: {
    queries:  +18.4,
    brands:   +7.2,
    commits:  +22.1,
    gmv:      +19.8,
  },
};

// Customer Agent registry — 7 named agents (no "demo" suffix) across 5 surfaces and 6 countries.
// Surface = integration channel (encoded in badge color/icon). Region = primary market (shown as secondary label).
type Surface = "WhatsApp Bot" | "Phone OS" | "Voice" | "Fashion AI" | "Custom";

const CUSTOMER_AGENTS: { key: string; name: string; surface: Surface; region: string }[] = [
  { key: "rufus",           name: "Rufus",           surface: "WhatsApp Bot", region: "🇺🇸 US"     },
  { key: "mila",            name: "Mila Shopping",   surface: "WhatsApp Bot", region: "🇲🇽 Mexico" },
  { key: "chatloop",        name: "ChatLoop",         surface: "WhatsApp Bot", region: "🇮🇳 India"  },
  { key: "hayl",            name: "Hayl",            surface: "Voice",        region: "🇺🇸 US"     },
  { key: "stylr",           name: "Stylr AI",        surface: "Fashion AI",   region: "🇫🇷 France" },
  { key: "pixel-concierge", name: "Pixel Concierge", surface: "Phone OS",     region: "🇯🇵 Japan"  },
  { key: "kartly",          name: "Kartly AI",       surface: "Phone OS",     region: "🇰🇷 Korea"  },
];

const CUSTOMER_AGENT_BY_KEY: Record<string, typeof CUSTOMER_AGENTS[number]> =
  Object.fromEntries(CUSTOMER_AGENTS.map(ca => [ca.key, ca]));

const PROTOCOL_STEPS = [
  { icon: Shield,       id: "01", title: "Identity",   sub: "Agent presents signed credentials",    color: "#1a7a4c" },
  { icon: Globe,        id: "02", title: "Query",      sub: "\"Find me X under $Y, ships in Z\"",   color: V.accent  },
  { icon: BarChart2,    id: "03", title: "Quote",      sub: "Brand agents return ranked offers",     color: "#d9a85c" },
  { icon: CheckCircle,  id: "04", title: "Commit",     sub: "Consumer agent selects & confirms",    color: "#1a7a4c" },
  { icon: CreditCard,   id: "05", title: "Settlement", sub: "Alignment clears USDC, brands paid",   color: V.accent  },
];

// Product-brand pairs — bound so the feed never shows a mismatched combo
const LIVE_CATALOG: { product: string; brand: string }[] = [
  { product: "Nike Air Max 97 · White / Silver",      brand: "Nike"       },
  { product: "Allbirds Wool Runner · Natural Grey",    brand: "Allbirds"   },
  { product: "Samsung Galaxy S25 · Phantom Black",     brand: "Samsung"    },
  { product: "Patagonia Nano Puff Jacket · Blue",      brand: "Patagonia"  },
  { product: "Apple AirPods Pro (Gen 3)",             brand: "Apple"      },
  { product: "Lululemon Align Shorts 6\"",            brand: "Lululemon"  },
  { product: "Dyson V15 Detect Absolute",             brand: "Dyson"      },
  { product: "Dr. Martens 1460 · Cherry Red",         brand: "Dr. Martens"},
  { product: "Fellow Opus Grinder · Matte Black",     brand: "Fellow"     },
  { product: "Razer Blade 16 Gaming Laptop",          brand: "Razer"      },
];

// Brand names used in the live feed (must match BRAND_META keys in shared BrandLogo component)


// Surface-level icon + tint (controls badge appearance in Live Feed + sort emoji in Customer Agents).
const AGENT_META: Record<Surface, { Icon: typeof MessageCircle; color: string; bg: string; emoji: string }> = {
  "WhatsApp Bot": { Icon: MessageCircle, color: "#1a7a4c",  bg: "rgba(26,122,76,0.10)",  emoji: "💬"  },
  "Phone OS":     { Icon: Smartphone,    color: "#6D4AE8",  bg: "rgba(109,74,232,0.10)", emoji: "📱"  },
  "Voice":        { Icon: Mic2,          color: "#d9a85c",  bg: "rgba(217,168,92,0.10)", emoji: "🎙️" },
  "Fashion AI":   { Icon: Shirt,         color: "#B5453A",  bg: "rgba(181,69,58,0.10)",  emoji: "👗"  },
  "Custom":       { Icon: Wrench,        color: "#9E9484",  bg: "rgba(158,148,132,0.10)", emoji: "🔧" },
};

interface TxItem {
  id: number;
  product: string;
  amount: number;
  agentKey: string;    // key into CUSTOMER_AGENT_BY_KEY
  brand: string;
  status: "commit" | "quote" | "query";
  ts: string;
}

function mkTx(id: number): TxItem {
  const item    = LIVE_CATALOG[Math.floor(Math.random() * LIVE_CATALOG.length)];
  const agent   = CUSTOMER_AGENTS[Math.floor(Math.random() * CUSTOMER_AGENTS.length)];
  const price   = Math.round((29 + Math.random() * 470) * 100) / 100;
  const weights = [0.26, 0.45, 0.29];
  let r = Math.random(), st: TxItem["status"] = "commit";
  if (r > weights[0] + weights[1]) st = "query";
  else if (r > weights[0]) st = "quote";
  const now = new Date();
  const s = `${now.getHours().toString().padStart(2,"0")}:${now.getMinutes().toString().padStart(2,"0")}:${now.getSeconds().toString().padStart(2,"0")}`;
  return {
    id,
    product:  item.product,
    amount:   price,
    agentKey: agent.key,
    brand:    item.brand,
    status:   st,
    ts:       s,
  };
}

function fmt(n: number, d = 0) {
  return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function PulseDot({ color }: { color: string }) {
  return (
    <span className="relative inline-flex w-2 h-2 flex-shrink-0">
      <span className="absolute inline-flex h-full w-full rounded-full animate-ping opacity-60"
        style={{ backgroundColor: color }} />
      <span className="relative inline-flex rounded-full w-2 h-2"
        style={{ backgroundColor: color }} />
    </span>
  );
}

function Delta({ v }: { v: number }) {
  const pos = v >= 0;
  return (
    <span className={`text-xs font-medium flex items-center gap-0.5 ${pos ? "text-sage" : "text-red-soft"}`}>
      <TrendingUp className={`w-3 h-3 ${pos ? "" : "rotate-180"}`} />
      {pos ? "+" : ""}{v}%
    </span>
  );
}

function StatusPill({ status }: { status: TxItem["status"] }) {
  if (status === "commit")
    return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sage-bg text-sage">COMMIT</span>;
  if (status === "quote")
    return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-caution-bg text-caution">QUOTE</span>;
  return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-warm text-ink-3">QUERY</span>;
}

// BrandLogo wrapper: maps display name → shared BrandLogo component
function BrandLogoByName({ name, size = 14 }: { name: string; size?: number }) {
  return <BrandLogo brandId={name.toLowerCase().replace(/[\s.]/g, "")} name={name} size={size} />;
}

// Left-panel agent badge: name only (surface encoded in icon+color, region not shown here).
function AgentBadge({ agentKey }: { agentKey: string }) {
  const ca   = CUSTOMER_AGENT_BY_KEY[agentKey];
  if (!ca) return null;
  const meta = AGENT_META[ca.surface];
  const Icon = meta.Icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap"
      style={{ backgroundColor: meta.bg, color: meta.color }}
    >
      <Icon className="w-3 h-3 flex-shrink-0" />
      <span>{ca.name}</span>
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AgenticCommerceOverview() {
  const [feed, setFeed]               = useState<TxItem[]>([]);
  const [ticks, setTicks]             = useState(0);
  const [agentsTotal, setAgentsTotal] = useState(1247);   // active Customer Agent instances across the network
  const [live, setLive]               = useState(true);
  const idRef = useRef(1);

  // Seed feed
  useEffect(() => {
    const initial = Array.from({ length: 7 }, () => mkTx(idRef.current++));
    setFeed(initial);
  }, []);

  // Live ticker — events tick by 1, agentsTotal by 1–3 each cycle
  // (7 categories × thousands of instances each = active fleet that dwarfs the Live window)
  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => {
      setTicks(t => t + 1);
      setFeed(prev => [mkTx(idRef.current++), ...prev].slice(0, 7));
      setAgentsTotal(n => n + 1 + Math.floor(Math.random() * 3));   // +1 to +3
    }, 2800);
    return () => clearInterval(id);
  }, [live]);

  const metrics = MOCK_METRICS;

  // Customer Agents leaderboard — always exactly 7 entries (all registered agents),
  // sorted by live activity from the feed.
  const agentCounts = feed.reduce((acc, tx) => {
    acc[tx.agentKey] = (acc[tx.agentKey] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const customerAgentsRanked = CUSTOMER_AGENTS
    .map(ca => ({
      ...ca,
      count: agentCounts[ca.key] ?? 0,
      meta: AGENT_META[ca.surface],
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-8 pb-12">

      {/* ── Module header ─────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border"
            style={{ background: V.accentBg, borderColor: V.accentBorder, color: V.accent }}>
            <Cpu className="w-3 h-3" />
            Layer 3 · Agentic Commerce
          </span>
          <span className="flex items-center gap-1.5 text-xs text-ink-3">
            <PulseDot color="#1a7a4c" />
            Live · last 24h
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-ink leading-tight mb-2">
          The open routing layer for AI commerce.
        </h1>
        <p className="text-sm text-ink-2 max-w-2xl leading-relaxed">
          Consumer Agents — WhatsApp bots, Phone OS assistants, Voice apps — call Alignment to
          discover, quote, and commit purchases across any brand. Brands expose a{" "}
          <span className="font-semibold text-ink">Brand Agent</span> once; every Consumer Agent
          finds them. You pay only on cleared transactions.
        </p>
      </div>

      {/* ── KPI bar ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Consumer Agent queries",   value: fmt(metrics.queries),       icon: Radio,      delta: metrics.delta.queries,  accent: V.accent    },
          { label: "Brand Agents reachable",   value: fmt(metrics.brands),        icon: Store,      delta: metrics.delta.brands,   accent: "#1a7a4c"   },
          { label: "Successful commits",        value: fmt(metrics.commits),       icon: CheckCircle,delta: metrics.delta.commits,  accent: "#1a7a4c"   },
          { label: "Cleared GMV",               value: `$${fmt(metrics.gmv)}`,    icon: CreditCard, delta: metrics.delta.gmv,      accent: V.accent    },
        ].map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label}
              className="bg-surface border border-divider-light rounded-xl p-4 shadow-elevation-sm hover:shadow-elevation-md transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-surface-warm">
                  <Icon className="w-4 h-4 text-ink-2" />
                </div>
                <Delta v={m.delta} />
              </div>
              <div className="text-2xl font-bold font-mono text-ink tabular-nums">{m.value}</div>
              <div className="text-xs text-ink-3 mt-0.5">{m.label}</div>
            </div>
          );
        })}
      </div>

      {/* ── Success rate bar ───────────────────────────────────────────── */}
      <div className="bg-ink rounded-2xl p-5 md:p-6 relative overflow-hidden">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 1px,transparent 40px),repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 1px,transparent 40px)" }} />
        <div className="relative flex flex-col md:flex-row md:items-center gap-5">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-white/50 uppercase tracking-wider">
                Quote → Commit success rate
              </span>
              <span className="text-xs font-bold text-white font-mono tabular-nums">
                {metrics.successRate.toFixed(2)}%
              </span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${metrics.successRate}%`, background: "linear-gradient(90deg, #1a7a4c, #2ecc71)" }}
              />
            </div>
            <div className="flex items-center justify-between mt-1 text-[10px] text-white/40 font-mono">
              <span>0%</span>
              <span>Industry avg ~18%  ·  Alignment {metrics.successRate}%</span>
              <span>100%</span>
            </div>
          </div>
          <div className="flex items-center gap-6 shrink-0">
            <div className="text-center">
              <div className="text-xl font-bold text-white font-mono">{fmt(metrics.queries - metrics.commits)}</div>
              <div className="text-[10px] text-white/40 mt-0.5">queries lost</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-white font-mono">{fmt(metrics.commits)}</div>
              <div className="text-[10px] text-white/40 mt-0.5">cleared</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Live Activity ─────────────────────────────────────────────── */}
      <div className="space-y-3">
        {/* Unified header — single streaming indicator + pause control for both panels */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Activity className="w-4 h-4 text-ink-2" />
            <span className="text-sm font-semibold text-ink">Live Activity</span>
            <span className="flex items-center gap-1.5 text-[11px] text-ink-3 font-mono">
              <PulseDot color={live ? "#1a7a4c" : "#9E9484"} />
              {live ? "· streaming" : "· paused"}
            </span>
          </div>
          <button
            onClick={() => setLive(l => !l)}
            className="text-[11px] px-2.5 py-1 rounded-lg bg-surface-warm border border-divider-light text-ink-2 hover:text-ink transition-colors"
          >
            {live ? "Pause" : "Resume"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-5">

          {/* Left panel — transaction feed */}
          <div className="md:col-span-3 bg-surface border border-divider-light rounded-2xl shadow-elevation-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-divider-light">
              <span className="text-xs font-semibold text-ink-2 uppercase tracking-wider">Product Agents</span>
              <span className="text-[10px] text-ink-3 font-mono">{ticks} events</span>
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-5 py-2 bg-canvas border-b border-divider-light text-[10px] font-semibold text-ink-3 uppercase tracking-wider">
              <span>Product</span>
              <span className="text-right">Agent</span>
              <span className="text-right">Amount</span>
              <span className="text-right">Status</span>
            </div>

            <div className="divide-y divide-divider-light/50 overflow-hidden" style={{ maxHeight: 370 }}>
              {feed.map((tx, i) => (
                <div
                  key={tx.id}
                  className={`grid grid-cols-[1fr_auto_auto_auto] gap-3 px-5 py-2.5 items-center transition-all duration-300 ${
                    i === 0 ? "bg-sage-bg/40 animate-fade-in" : "bg-surface hover:bg-canvas"
                  }`}
                  style={{ opacity: Math.max(0.45, 1 - i * 0.065) }}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-ink truncate">{tx.product}</p>
                    <p className="text-[10px] text-ink-3 font-mono mt-0.5 flex items-center gap-1.5">
                      <span>{tx.ts}</span>
                      <span>·</span>
                      <BrandLogoByName name={tx.brand} size={12} />
                      <span className="text-ink-2 font-sans">{tx.brand}</span>
                    </p>
                  </div>
                  <AgentBadge agentKey={tx.agentKey} />
                  <span className="text-xs font-mono font-semibold text-ink tabular-nums text-right">
                    ${fmt(tx.amount, 2)}
                  </span>
                  <span className="flex justify-end">
                    <StatusPill status={tx.status} />
                  </span>
                </div>
              ))}
            </div>

            <div className="px-5 py-2.5 border-t border-divider-light bg-canvas flex items-center justify-end">
              <Link href="/dashboard/agentic-commerce/quotes"
                className="text-[11px] text-ink-2 hover:text-ink flex items-center gap-1 transition-colors">
                Full Quote Log <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Right panel — Customer Agents list (mirrors left panel structure, no bars) */}
          <div className="md:col-span-2 bg-surface border border-divider-light rounded-2xl shadow-elevation-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-divider-light">
              <span className="text-xs font-semibold text-ink-2 uppercase tracking-wider">Customer Agents</span>
              <span className="text-[10px] text-ink-3 font-mono tabular-nums">{fmt(agentsTotal)} agents</span>
            </div>

            {/* Column headers — match left panel */}
            <div className="grid grid-cols-[1fr_auto] gap-3 px-5 py-2 bg-canvas border-b border-divider-light text-[10px] font-semibold text-ink-3 uppercase tracking-wider">
              <span>Agent</span>
              <span className="text-right">Events</span>
            </div>

            <div className="divide-y divide-divider-light/50 overflow-hidden" style={{ maxHeight: 370 }}>
              {customerAgentsRanked.map((a) => {
                const Icon = a.meta.Icon;
                return (
                  <div
                    key={a.key}
                    className="grid grid-cols-[1fr_auto] gap-3 px-5 py-2.5 items-center bg-surface hover:bg-canvas transition-colors"
                  >
                    <div className="min-w-0">
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap"
                        style={{ backgroundColor: a.meta.bg, color: a.meta.color }}
                      >
                        <Icon className="w-3 h-3 flex-shrink-0" />
                        <span>{a.name}</span>
                      </span>
                      <p className="text-[10px] text-ink-3 font-mono mt-0.5 whitespace-nowrap">
                        {a.region}
                      </p>
                    </div>
                    <span className="text-xs font-mono font-semibold text-ink tabular-nums text-right">
                      {a.count}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="px-5 py-2.5 border-t border-divider-light bg-canvas flex items-center justify-end">
              <Link href="/dashboard/agentic-commerce/integration?role=consumer"
                className="text-[11px] text-ink-2 hover:text-ink flex items-center gap-1 transition-colors">
                Browse all agents <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Protocol flow ──────────────────────────────────────────────── */}
      <div className="bg-surface border border-divider-light rounded-2xl shadow-elevation-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-semibold text-ink flex items-center gap-2">
              <Globe className="w-4 h-4 text-ink-2" />
              The Alignment Protocol — 5 steps
            </h2>
            <p className="text-xs text-ink-3 mt-0.5">Open spec built on MCP · transparent · no hidden ranking</p>
          </div>
          <Link href="/dashboard/agentic-commerce/integration?role=protocol"
            className="text-xs text-ink-2 hover:text-ink flex items-center gap-1 transition-colors">
            Read spec <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="flex items-stretch gap-0">
          {PROTOCOL_STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.id} className="flex items-center flex-1 min-w-0">
                <div className="flex-1 bg-canvas border border-divider-light rounded-xl p-4 text-center space-y-1.5">
                  <div className="flex items-center justify-center mx-auto w-8 h-8 rounded-lg"
                    style={{ backgroundColor: step.color + "18" }}>
                    <Icon className="w-4 h-4" style={{ color: step.color }} />
                  </div>
                  <div className="text-[10px] font-mono text-ink-3">{step.id}</div>
                  <div className="text-xs font-bold text-ink">{step.title}</div>
                  <p className="text-[10px] text-ink-3 leading-snug hidden md:block">{step.sub}</p>
                </div>
                {i < PROTOCOL_STEPS.length - 1 && (
                  <div className="flex-shrink-0 px-1">
                    <ArrowRight className="w-3.5 h-3.5 text-ink-3" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Why queries fail ──────────────────────────────────────────── */}
      <div className="bg-surface border border-divider-light rounded-2xl shadow-elevation-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-ink flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-ink-2" />
              Why {fmt(metrics.queries - metrics.commits)} queries didn&apos;t convert
            </h2>
            <p className="text-xs text-ink-3 mt-0.5">Actionable failure breakdown — optimize these to lift GMV</p>
          </div>
          <Link href="/dashboard/agentic-commerce/performance"
            className="text-xs text-ink-2 hover:text-ink flex items-center gap-1 transition-colors">
            Deep analysis <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: "Lost on price",     pct: 38, color: "#B5453A", bg: "bg-red-soft-bg"    },
            { label: "Out of stock",      pct: 24, color: "#d9a85c", bg: "bg-caution-bg"     },
            { label: "Schema mismatch",   pct: 18, color: V.accent,  bg: V.accentBg          },
            { label: "BA timeout / 5xx",  pct: 12, color: "#9E9484", bg: "bg-surface-warm"   },
            { label: "User abandoned",    pct:  8, color: "#C8BFB0", bg: "bg-canvas"         },
          ].map((f) => (
            <div key={f.label} className="space-y-2">
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-ink-2 font-medium truncate">{f.label}</span>
                <span className="font-mono font-bold text-ink shrink-0 ml-2">{f.pct}%</span>
              </div>
              <div className="h-1.5 bg-surface-warm rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${f.pct * 2.5}%`, backgroundColor: f.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Role entry ────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-ink-3 uppercase tracking-wider">Get started</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Brand */}
          <Link href="/dashboard/agentic-commerce/integration?role=brand"
            className="group bg-surface border border-divider-light hover:border-ink/20 hover:shadow-elevation-md rounded-2xl p-5 space-y-3 transition-all">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-sage-bg flex items-center justify-center">
                <Store className="w-5 h-5 text-sage" />
              </div>
              <ChevronRight className="w-4 h-4 text-ink-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div>
              <div className="font-semibold text-ink text-sm">I&apos;m a brand</div>
              <div className="text-xs text-ink-3 mt-0.5">Open my catalog to Consumer Agents</div>
            </div>
            <p className="text-xs text-ink-2 leading-relaxed">
              Expose your catalog as a Brand Agent. Consumer Agents across WhatsApp, Phone OS,
              and voice apps discover and purchase. Pay ~8% only on cleared transactions.
            </p>
            <div className="text-xs font-medium text-sage flex items-center gap-1">
              Connect catalog <ArrowRight className="w-3 h-3" />
            </div>
          </Link>

          {/* Consumer Agent builder */}
          <Link href="/dashboard/agentic-commerce/integration?role=consumer"
            className="group bg-surface border border-divider-light hover:border-ink/20 hover:shadow-elevation-md rounded-2xl p-5 space-y-3 transition-all"
            style={{ borderColor: V.accentBorder }}>
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: V.accentBg }}>
                <Cpu className="w-5 h-5" style={{ color: V.accent }} />
              </div>
              <ChevronRight className="w-4 h-4 text-ink-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div>
              <div className="font-semibold text-ink text-sm">I build Consumer Agents</div>
              <div className="text-xs text-ink-3 mt-0.5">Connect to brand catalog network</div>
            </div>
            <p className="text-xs text-ink-2 leading-relaxed">
              One API call → ranked quotes from 842 brand catalogs. Built on open MCP protocol.
              Earn 1–3% referral fee on every cleared transaction you originate.
            </p>
            <div className="text-xs font-medium flex items-center gap-1" style={{ color: V.accent }}>
              Get API key <ArrowRight className="w-3 h-3" />
            </div>
          </Link>

          {/* Protocol */}
          <Link href="/dashboard/agentic-commerce/integration?role=protocol"
            className="group bg-surface border border-divider-light hover:border-ink/20 hover:shadow-elevation-md rounded-2xl p-5 space-y-3 transition-all">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-surface-warm flex items-center justify-center">
                <Globe className="w-5 h-5 text-ink-2" />
              </div>
              <ChevronRight className="w-4 h-4 text-ink-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div>
              <div className="font-semibold text-ink text-sm">Read the protocol</div>
              <div className="text-xs text-ink-3 mt-0.5">Open spec · built on MCP</div>
            </div>
            <p className="text-xs text-ink-2 leading-relaxed">
              Identity → Query → Quote → Commit → Settlement. Open spec, fork it, implement it.
              No paid placement, no hidden ranking. Transparent clearing.
            </p>
            <div className="text-xs font-medium text-ink-2 flex items-center gap-1">
              View spec <ArrowRight className="w-3 h-3" />
            </div>
          </Link>
        </div>
      </div>

      {/* ── Inner vs Outer Ring ────────────────────────────────────────── */}
      <div className="bg-surface border border-divider-light rounded-2xl shadow-elevation-sm p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-ink flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-ink-2" />
            Where Alignment plays
          </h2>
          <p className="text-xs text-ink-3 mt-0.5">
            AI shopping is splitting into two rings. We serve the Outer Ring.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-canvas border border-divider-light rounded-xl p-5 space-y-2 opacity-70">
            <div className="text-[10px] font-mono text-ink-3 uppercase tracking-wider">Inner Ring · Not our market</div>
            <div className="font-semibold text-ink text-sm">Shopping inside AI chat platforms</div>
            <p className="text-xs text-ink-2 leading-relaxed">
              Claude / ChatGPT / Perplexity user asks for products → AI completes order in its
              own walled garden. These platforms integrate with brands directly. No open Broker needed.
            </p>
          </div>
          <div className="rounded-xl p-5 space-y-2 border-2"
            style={{ background: V.accentBg, borderColor: V.accentBorder }}>
            <div className="text-[10px] font-mono uppercase tracking-wider font-semibold" style={{ color: V.accent }}>
              Outer Ring · Alignment lives here
            </div>
            <div className="font-semibold text-ink text-sm">Consumer Agents outside any AI platform</div>
            <p className="text-xs text-ink-2 leading-relaxed">
              Autonomous shopping agents embedded in <em>WhatsApp, Phone OS, voice assistants,
              vertical shopping startups</em>. They don&apos;t own the brand network — they call ours.
            </p>
          </div>
        </div>
      </div>

      {/* ── Layer 2 vs Layer 3 ─────────────────────────────────────────── */}
      <div className="bg-canvas border border-divider-light rounded-2xl p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-surface rounded-xl p-4 space-y-1.5 border border-divider-light">
            <div className="font-mono text-ink-3 uppercase tracking-wider text-[10px]">Layer 2 — GEO</div>
            <div className="font-semibold text-ink">&quot;Be mentioned by AI&quot;</div>
            <p className="text-ink-2 leading-relaxed">
              Optimize how LLMs <em>describe</em> your brand in chat. Measured in mentions, citations, sentiment.
            </p>
            <Link href="/dashboard/geo-monitor" className="text-ink-2 hover:text-ink flex items-center gap-1 pt-1 transition-colors">
              Go to GEO module <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="rounded-xl p-4 space-y-1.5 border-2"
            style={{ background: V.accentBg, borderColor: V.accentBorder }}>
            <div className="font-mono uppercase tracking-wider text-[10px] font-semibold" style={{ color: V.accent }}>
              Layer 3 — Agentic Commerce · You&apos;re here
            </div>
            <div className="font-semibold text-ink">&quot;Be transacted with by Consumer Agents&quot;</div>
            <p className="text-ink-2 leading-relaxed">
              Expose a machine-callable Brand Agent. Consumer Agents call you, get a quote, commit a purchase.
              Measured in queries, quotes, commits, GMV.
            </p>
          </div>
        </div>
      </div>

      {/* ── Walk-away ─────────────────────────────────────────────────── */}
      <div className="text-center py-10 border-t border-divider-light">
        <p className="text-xl md:text-2xl font-bold text-ink leading-snug max-w-2xl mx-auto">
          Every brand reachable by Consumer Agents.<br />
          Every Consumer Agent finds the right brand.
        </p>
        <p className="text-ink-3 text-xs mt-3 font-mono tracking-wider">
          // open infrastructure for AI commerce · built on MCP · no walled garden
        </p>
      </div>

    </div>
  );
}
