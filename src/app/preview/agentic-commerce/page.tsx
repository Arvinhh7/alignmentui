"use client";

/**
 * Standalone preview — no auth required.
 * Access at http://localhost:3000/preview/agentic-commerce
 */

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  Zap, TrendingUp, ArrowRight, Activity,
  MessageCircle, Smartphone, Mic2, Shirt, Wrench,
  Store, Globe, Shield, CheckCircle,
  ChevronRight, AlertCircle, BarChart2,
  CreditCard, Cpu, Radio,
} from "lucide-react";

// ── Commerce accent (violet) ──────────────────────────────────────────────────
const V = {
  accent:      "#6D4AE8",
  accentBg:    "#F0EEFF",
  accentBorder:"#C4B5FD",
};

// ── Mock data ─────────────────────────────────────────────────────────────────
const MOCK = {
  queries:     12_847,
  brands:        842,
  commits:      3_291,
  gmv:        847_293,
  successRate:   25.62,
  delta: { queries: +18.4, brands: +7.2, commits: +22.1, gmv: +19.8 },
};

const AGENT_SURFACES = [
  { icon: MessageCircle, name: "WhatsApp Bot",    sub: "shopping bots in chat",         count: 4821, pct: 38, color: "#1a7a4c" },
  { icon: Smartphone,    name: "Phone OS Agent",  sub: "OS-level purchasing agents",    count: 3204, pct: 25, color: V.accent  },
  { icon: Mic2,          name: "Voice Assistant", sub: "voice-assistant shopping",      count: 2569, pct: 20, color: "#d9a85c" },
  { icon: Shirt,         name: "Vertical AI",     sub: "category AIs (fashion, food…)", count: 1541, pct: 12, color: "#B5453A" },
  { icon: Wrench,        name: "Custom Agent",    sub: "any third-party shopper",       count:  712, pct:  5, color: "#9E9484" },
];

const PROTOCOL_STEPS = [
  { icon: Shield,      id: "01", title: "Identity",   sub: "Agent presents signed credentials",   color: "#1a7a4c" },
  { icon: Globe,       id: "02", title: "Query",      sub: "\"Find me X under $Y, ships in Z\"",  color: V.accent  },
  { icon: BarChart2,   id: "03", title: "Quote",      sub: "Brand agents return ranked offers",    color: "#d9a85c" },
  { icon: CheckCircle, id: "04", title: "Commit",     sub: "Consumer agent selects & confirms",   color: "#1a7a4c" },
  { icon: CreditCard,  id: "05", title: "Settlement", sub: "Alignment clears USDC, brands paid",  color: V.accent  },
];

const LIVE_PRODUCTS = [
  "Nike Air Max 97 · White / Silver",
  "Allbirds Wool Runner · Natural Grey",
  "Samsung Galaxy S25 · Phantom Black",
  "Patagonia Nano Puff Jacket · Blue",
  "Apple AirPods Pro (Gen 3)",
  "Lululemon Align Shorts 6\"",
  "Dyson V15 Detect Absolute",
  "Dr. Martens 1460 · Cherry Red",
  "Fellow Opus Grinder · Matte Black",
  "Razer Blade 16 Gaming Laptop",
  "Ember Travel Mug² · Black",
  "Sonos Era 300 · White",
];

interface TxItem {
  id: number; product: string; amount: number;
  agent: string; brand: string;
  status: "commit" | "quote" | "query"; ts: string;
}
let _id = 1;
function mkTx(): TxItem {
  const product = LIVE_PRODUCTS[Math.floor(Math.random() * LIVE_PRODUCTS.length)];
  const price = Math.round((29 + Math.random() * 470) * 100) / 100;
  const agents = ["WhatsApp Bot", "Phone OS", "Voice", "Fashion AI", "Custom"];
  const brands = ["Nike", "Apple", "Samsung", "Allbirds", "Lululemon", "Dyson"];
  const r = Math.random();
  const status: TxItem["status"] = r < 0.26 ? "commit" : r < 0.71 ? "quote" : "query";
  const now = new Date();
  return {
    id: _id++, product, amount: price,
    agent: agents[Math.floor(Math.random() * agents.length)],
    brand: brands[Math.floor(Math.random() * brands.length)],
    status,
    ts: `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`,
  };
}
function fmt(n: number, d = 0) {
  return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}

function PulseDot({ color }: { color: string }) {
  return (
    <span className="relative inline-flex w-2 h-2 flex-shrink-0">
      <span className="absolute inline-flex h-full w-full rounded-full animate-ping opacity-60" style={{ backgroundColor: color }} />
      <span className="relative inline-flex rounded-full w-2 h-2" style={{ backgroundColor: color }} />
    </span>
  );
}
function Delta({ v }: { v: number }) {
  return (
    <span className={`text-xs font-medium flex items-center gap-0.5 ${v >= 0 ? "text-sage" : "text-red-soft"}`}>
      <TrendingUp className={`w-3 h-3 ${v < 0 ? "rotate-180" : ""}`} />
      {v >= 0 ? "+" : ""}{v}%
    </span>
  );
}
function StatusPill({ s }: { s: TxItem["status"] }) {
  if (s === "commit") return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sage-bg text-sage">COMMIT</span>;
  if (s === "quote")  return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-caution-bg text-caution">QUOTE</span>;
  return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-warm text-ink-3">QUERY</span>;
}

export default function AgenticCommercePreview() {
  const [feed, setFeed] = useState<TxItem[]>([]);
  const [ticks, setTicks] = useState(0);
  const [live, setLive] = useState(true);

  useEffect(() => {
    setFeed(Array.from({ length: 9 }, mkTx));
  }, []);

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => {
      setTicks(t => t + 1);
      setFeed(prev => [mkTx(), ...prev].slice(0, 15));
    }, 1300);
    return () => clearInterval(id);
  }, [live]);

  return (
    <div className="min-h-screen bg-canvas">
      {/* Preview banner */}
      <div className="bg-ink text-ink-inv text-xs py-2 px-6 text-center font-mono">
        <span className="opacity-60">// DEV PREVIEW · </span>
        <span>Agentic Commerce · Layer 3</span>
        <span className="opacity-40 ml-4">localhost:3000/preview/agentic-commerce</span>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* ── Module header ──────────────────────────────────────────────── */}
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
          <h1 className="text-3xl md:text-4xl font-bold text-ink leading-tight mb-2">
            The open routing layer for AI commerce.
          </h1>
          <p className="text-sm text-ink-2 max-w-2xl leading-relaxed">
            Consumer Agents — WhatsApp bots, Phone OS assistants, Voice apps — call Alignment to
            discover, quote, and commit purchases across any brand catalog.{" "}
            <strong className="text-ink">One API. 842 brands. Every Consumer Agent.</strong>
          </p>
        </div>

        {/* ── KPI bar ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Consumer Agent queries", value: fmt(MOCK.queries),      icon: Radio,       delta: MOCK.delta.queries  },
            { label: "Brand Agents reachable", value: fmt(MOCK.brands),       icon: Store,       delta: MOCK.delta.brands   },
            { label: "Successful commits",      value: fmt(MOCK.commits),      icon: CheckCircle, delta: MOCK.delta.commits  },
            { label: "Cleared GMV",             value: `$${fmt(MOCK.gmv)}`,   icon: CreditCard,  delta: MOCK.delta.gmv      },
          ].map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.label} className="bg-surface border border-divider-light rounded-xl p-4 shadow-elevation-sm hover:shadow-elevation-md transition-all">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-surface-warm flex items-center justify-center">
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

        {/* ── Success rate strip ────────────────────────────────────────── */}
        <div className="bg-ink rounded-2xl p-5 md:p-6 relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: "repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 1px,transparent 40px),repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 1px,transparent 40px)" }} />
          <div className="relative flex flex-col md:flex-row md:items-center gap-5">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1.5">
                <span className="text-xs font-mono text-white/50 uppercase tracking-wider">Quote → Commit rate</span>
                <span className="text-sm font-bold text-white font-mono">{MOCK.successRate.toFixed(2)}%</span>
                <span className="text-[10px] text-white/30 font-mono">vs industry avg ~18%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000"
                  style={{ width: `${MOCK.successRate}%`, background: "linear-gradient(90deg,#1a7a4c,#2ecc71)" }} />
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-white/30 font-mono">
                <span>0%</span><span>100%</span>
              </div>
            </div>
            <div className="flex items-center gap-6 shrink-0 border-l border-white/10 pl-6">
              <div>
                <div className="text-xl font-bold text-white font-mono tabular-nums">{fmt(MOCK.queries - MOCK.commits)}</div>
                <div className="text-[10px] text-white/40 mt-0.5">queries didn&apos;t convert</div>
              </div>
              <div>
                <div className="text-xl font-bold text-white font-mono tabular-nums">{fmt(MOCK.commits)}</div>
                <div className="text-[10px] text-white/40 mt-0.5">cleared today</div>
              </div>
              <div>
                <div className="text-xl font-bold text-white font-mono tabular-nums">${fmt(MOCK.gmv)}</div>
                <div className="text-[10px] text-white/40 mt-0.5">GMV today</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Live feed + Agent breakdown ───────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-5">

          {/* Live feed */}
          <div className="md:col-span-3 bg-surface border border-divider-light rounded-2xl shadow-elevation-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-divider-light">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-ink-2" />
                <span className="text-sm font-semibold text-ink">Live Transaction Feed</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-[11px] text-ink-3">
                  <PulseDot color={live ? "#1a7a4c" : "#9E9484"} />
                  {live ? "streaming" : "paused"}
                </span>
                <button onClick={() => setLive(l => !l)}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-surface-warm border border-divider-light text-ink-2 hover:text-ink transition-colors">
                  {live ? "Pause" : "Resume"}
                </button>
              </div>
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-5 py-2 bg-canvas border-b border-divider-light text-[10px] font-semibold text-ink-3 uppercase tracking-wider">
              <span>Product</span>
              <span className="text-right">Agent</span>
              <span className="text-right">Amount</span>
              <span className="text-right">Status</span>
            </div>

            <div className="divide-y divide-divider-light/50 overflow-hidden" style={{ maxHeight: 390 }}>
              {feed.map((tx, i) => (
                <div key={tx.id}
                  className={`grid grid-cols-[1fr_auto_auto_auto] gap-3 px-5 py-2.5 items-center transition-all duration-300 ${i === 0 ? "bg-sage-bg/30" : "bg-surface hover:bg-canvas"}`}
                  style={{ opacity: Math.max(0.4, 1 - i * 0.06) }}>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-ink truncate">{tx.product}</p>
                    <p className="text-[10px] text-ink-3 font-mono">{tx.ts} · {tx.brand}</p>
                  </div>
                  <span className="text-[11px] text-ink-2 whitespace-nowrap">{tx.agent}</span>
                  <span className="text-xs font-mono font-semibold text-ink tabular-nums text-right">${fmt(tx.amount, 2)}</span>
                  <span className="flex justify-end"><StatusPill s={tx.status} /></span>
                </div>
              ))}
            </div>

            <div className="px-5 py-2.5 border-t border-divider-light bg-canvas flex items-center justify-between">
              <span className="text-[10px] text-ink-3 font-mono">{ticks} events this session</span>
              <span className="text-[11px] text-ink-3 flex items-center gap-1">
                Full Quote Log <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* Agent sources */}
          <div className="md:col-span-2 bg-surface border border-divider-light rounded-2xl shadow-elevation-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-divider-light">
              <Cpu className="w-4 h-4 text-ink-2" />
              <span className="text-sm font-semibold text-ink">Consumer Agent Sources</span>
            </div>
            <div className="p-5 space-y-4">
              {AGENT_SURFACES.map((a) => {
                const Icon = a.icon;
                return (
                  <div key={a.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md flex items-center justify-center bg-surface-warm">
                          <Icon className="w-3.5 h-3.5 text-ink-2" />
                        </div>
                        <span className="font-medium text-ink-2">{a.name}</span>
                      </div>
                      <span className="font-mono font-semibold text-ink tabular-nums">{fmt(a.count)}</span>
                    </div>
                    <div className="h-1.5 bg-surface-warm rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${a.pct}%`, backgroundColor: a.color }} />
                    </div>
                    <p className="text-[10px] text-ink-3">{a.sub} · {a.pct}%</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Protocol flow ─────────────────────────────────────────────── */}
        <div className="bg-surface border border-divider-light rounded-2xl shadow-elevation-sm p-6">
          <div className="mb-5">
            <h2 className="font-semibold text-ink flex items-center gap-2">
              <Globe className="w-4 h-4 text-ink-2" />
              The Alignment Protocol — 5 steps
            </h2>
            <p className="text-xs text-ink-3 mt-0.5">Open spec built on MCP · transparent · no hidden ranking</p>
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
                    <div className="px-1 flex-shrink-0">
                      <ArrowRight className="w-3.5 h-3.5 text-ink-3" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Failure breakdown ─────────────────────────────────────────── */}
        <div className="bg-surface border border-divider-light rounded-2xl shadow-elevation-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-ink flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-ink-2" />
                Why {fmt(MOCK.queries - MOCK.commits)} queries didn&apos;t convert
              </h2>
              <p className="text-xs text-ink-3 mt-0.5">Optimize these levers to lift GMV</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            {[
              { label: "Lost on price",    pct: 38, color: "#B5453A" },
              { label: "Out of stock",     pct: 24, color: "#d9a85c" },
              { label: "Schema mismatch",  pct: 18, color: V.accent  },
              { label: "BA timeout",       pct: 12, color: "#9E9484" },
              { label: "User abandoned",   pct:  8, color: "#C8BFB0" },
            ].map((f) => (
              <div key={f.label} className="space-y-2">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-ink-2 font-medium">{f.label}</span>
                  <span className="font-mono font-bold text-ink">{f.pct}%</span>
                </div>
                <div className="h-1.5 bg-surface-warm rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${f.pct * 2.5}%`, backgroundColor: f.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Role entry cards ──────────────────────────────────────────── */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-ink-3 uppercase tracking-wider">Get started</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Brand */}
            <div className="group bg-surface border border-divider-light rounded-2xl p-5 space-y-3 transition-all hover:shadow-elevation-md hover:border-divider cursor-pointer">
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
            </div>

            {/* Consumer Agent builder — highlighted */}
            <div className="group bg-surface rounded-2xl p-5 space-y-3 transition-all hover:shadow-elevation-md cursor-pointer border-2"
              style={{ borderColor: V.accentBorder, background: V.accentBg }}>
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: "#E0D5FF" }}>
                  <Cpu className="w-5 h-5" style={{ color: V.accent }} />
                </div>
                <ChevronRight className="w-4 h-4 text-ink-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <div>
                <div className="font-semibold text-ink text-sm">I build Consumer Agents</div>
                <div className="text-xs text-ink-3 mt-0.5">Connect to the brand catalog network</div>
              </div>
              <p className="text-xs text-ink-2 leading-relaxed">
                One API call → ranked quotes from 842 brand catalogs. Built on open MCP.
                Earn 1–3% referral fee on every cleared transaction you originate.
              </p>
              <div className="text-xs font-medium flex items-center gap-1" style={{ color: V.accent }}>
                Get API key <ArrowRight className="w-3 h-3" />
              </div>
            </div>

            {/* Protocol */}
            <div className="group bg-surface border border-divider-light rounded-2xl p-5 space-y-3 transition-all hover:shadow-elevation-md hover:border-divider cursor-pointer">
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
    </div>
  );
}
