"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
const AC = `${API_BASE}/api/agentic-commerce`;

// ── Types ──────────────────────────────────────────────────────────────────────
type PlatformOverview = {
  summary: {
    total_brands: number;
    total_gmv: number;
    total_commission: number;
    total_transactions: number;
    total_discoveries: number;
    period_days: number;
  };
};

type FailureBreakdown = {
  label: string;
  pct: number;
  count: number;
  color: string;
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmt(n: number, d = 0) {
  return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}

function pulseDot(color: string) {
  return (
    <span className="relative inline-flex w-2 h-2">
      <span className={`absolute inline-flex h-full w-full rounded-full ${color} opacity-75 animate-ping`} />
      <span className={`relative inline-flex rounded-full h-2 w-2 ${color}`} />
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AgenticCommerceOverview() {
  const [data, setData] = useState<PlatformOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${AC}/platform/overview?days=1`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Derived display values (graceful fallbacks if API is empty)
  const queries = data?.summary.total_discoveries ?? 0;
  const commits = data?.summary.total_transactions ?? 0;
  const gmv = data?.summary.total_gmv ?? 0;
  const activeBrands = data?.summary.total_brands ?? 0;
  const successRate = queries > 0 ? (commits / queries) * 100 : 0;

  // Mock failure breakdown (would be a real endpoint in production)
  const failureBreakdown: FailureBreakdown[] = [
    { label: "Lost on price",      pct: 38, count: Math.round((queries - commits) * 0.38), color: "bg-rose-500" },
    { label: "Out of stock",       pct: 24, count: Math.round((queries - commits) * 0.24), color: "bg-amber-500" },
    { label: "Schema mismatch",    pct: 18, count: Math.round((queries - commits) * 0.18), color: "bg-orange-500" },
    { label: "BA timeout / 5xx",   pct: 12, count: Math.round((queries - commits) * 0.12), color: "bg-slate-500" },
    { label: "User abandoned",     pct: 8,  count: Math.round((queries - commits) * 0.08), color: "bg-zinc-400"  },
  ];

  return (
    <div className="space-y-8">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <h1 className="text-3xl md:text-4xl font-bold text-ink leading-tight">
          The infrastructure for{" "}
          <span className="text-purple-600">AI commerce.</span>
        </h1>
        <p className="text-ink-2 text-base max-w-3xl leading-relaxed">
          <strong>Consumer Agents</strong> — the new generation of autonomous shopping assistants
          built into WhatsApp, phone operating systems, voice apps, and vertical shopping startups —
          need a way to reach every brand on Earth. <strong>Brands</strong> need a way to be reachable
          by every Consumer Agent. <strong>Alignment</strong> is the open routing and clearing layer
          between them, built on the MCP protocol.
        </p>
      </div>

      {/* ── Live Counter ────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-ink to-[#1a1a1a] rounded-2xl p-6 md:p-8 text-white relative overflow-hidden">
        <div className="absolute top-4 right-4 flex items-center gap-2 text-xs">
          {pulseDot("bg-green-400")}
          <span className="text-white/70 font-mono">LIVE · last 24h</span>
        </div>

        <h2 className="text-sm font-mono uppercase tracking-wider text-white/50 mb-4">
          Today on Alignment
        </h2>

        {loading ? (
          <div className="text-white/40 animate-pulse text-sm">Connecting…</div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              <div>
                <div className="text-3xl md:text-4xl font-bold tabular-nums">{fmt(queries)}</div>
                <div className="text-white/50 text-xs mt-1">Consumer Agent queries</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold tabular-nums text-purple-300">{fmt(activeBrands)}</div>
                <div className="text-white/50 text-xs mt-1">Brand Agents reachable</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold tabular-nums text-green-300">{fmt(commits)}</div>
                <div className="text-white/50 text-xs mt-1">successful commits</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold tabular-nums text-yellow-300">${fmt(gmv, 0)}</div>
                <div className="text-white/50 text-xs mt-1">cleared GMV</div>
              </div>
            </div>

            <div className="border-t border-white/10 pt-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/60">Quote → Commit success rate</span>
                <span className="font-mono text-green-300">{successRate.toFixed(2)}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-green-400 to-emerald-400 rounded-full transition-all"
                  style={{ width: `${Math.min(successRate, 100)}%` }} />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── Failure Breakdown ────────────────────────────────────────── */}
      <section className="bg-surface border border-divider rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-ink">Why the other {fmt(queries - commits)} queries didn't commit</h2>
            <p className="text-ink-3 text-xs mt-0.5">Failure breakdown — the actionable surface for brands</p>
          </div>
          <Link href="/dashboard/agentic-commerce/quotes" className="text-xs text-purple-600 hover:underline">
            Drill into Quote Log →
          </Link>
        </div>
        <div className="space-y-3">
          {failureBreakdown.map((f) => (
            <div key={f.label} className="flex items-center gap-3 text-xs">
              <span className="w-36 text-ink-2 shrink-0">{f.label}</span>
              <div className="flex-1 bg-surface-muted rounded-full h-2 overflow-hidden">
                <div className={`h-full rounded-full ${f.color} transition-all duration-700`}
                  style={{ width: `${f.pct}%` }} />
              </div>
              <span className="w-24 text-right text-ink-3 tabular-nums shrink-0">
                {f.pct}% · {fmt(f.count)}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Role Entry Points ───────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-mono uppercase tracking-wider text-ink-3">
          Pick your role
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Brand */}
          <Link href="/dashboard/agentic-commerce/integration?role=brand"
            className="group bg-surface border border-divider hover:border-purple-300 rounded-2xl p-5 space-y-3 transition-all">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-lg">
              🏪
            </div>
            <div>
              <div className="font-semibold text-ink text-sm group-hover:text-purple-700 transition-colors">
                I'm a brand
              </div>
              <div className="text-ink-3 text-xs mt-0.5">Open my catalog to Consumer Agents</div>
            </div>
            <p className="text-ink-2 text-xs leading-relaxed">
              Expose your catalog as a Brand Agent. Consumer Agents in WhatsApp, phone OS,
              voice apps, and vertical shopping startups discover, quote, and commit
              through Alignment. You pay only on cleared transactions (~8%).
            </p>
            <div className="text-purple-600 text-xs font-medium pt-1">Get started →</div>
          </Link>

          {/* Consumer Agent builder */}
          <Link href="/dashboard/agentic-commerce/integration?role=consumer"
            className="group bg-surface border border-divider hover:border-purple-300 rounded-2xl p-5 space-y-3 transition-all">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-lg">
              📱
            </div>
            <div>
              <div className="font-semibold text-ink text-sm group-hover:text-purple-700 transition-colors">
                I build Consumer Agents
              </div>
              <div className="text-ink-3 text-xs mt-0.5">Connect to brands</div>
            </div>
            <p className="text-ink-2 text-xs leading-relaxed">
              One API call, ranked quotes from thousands of brand catalogs. Built on the
              open MCP protocol. Optional referral fee (1–3%) on every cleared transaction
              you originate.
            </p>
            <div className="text-purple-600 text-xs font-medium pt-1">Get an API key →</div>
          </Link>

          {/* Protocol */}
          <Link href="/dashboard/agentic-commerce/integration?role=protocol"
            className="group bg-surface border border-divider hover:border-purple-300 rounded-2xl p-5 space-y-3 transition-all">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white text-lg">
              📖
            </div>
            <div>
              <div className="font-semibold text-ink text-sm group-hover:text-purple-700 transition-colors">
                How it works
              </div>
              <div className="text-ink-3 text-xs mt-0.5">Open protocol, built on MCP</div>
            </div>
            <p className="text-ink-2 text-xs leading-relaxed">
              MCP-based Commerce extension. Identity, query, quote, commit, settlement —
              all transparent. Open spec, fork it, implement it. No paid placement, no
              hidden ranking.
            </p>
            <div className="text-purple-600 text-xs font-medium pt-1">Read the protocol →</div>
          </Link>
        </div>
      </section>

      {/* ── Inner Ring vs Outer Ring ───────────────────────────────── */}
      <section className="bg-surface border border-divider rounded-2xl p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-ink">Where Alignment plays</h2>
          <p className="text-ink-3 text-xs mt-0.5">
            AI shopping is splitting into two rings. We serve one of them.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Inner Ring */}
          <div className="bg-surface-muted rounded-xl p-5 space-y-2 opacity-75 border border-divider">
            <div className="flex items-center gap-2">
              <span className="font-mono text-ink-3 uppercase tracking-wider text-[10px]">Inner Ring</span>
              <span className="text-[10px] text-ink-3">·  NOT our market</span>
            </div>
            <div className="font-semibold text-ink text-sm">Shopping inside AI chat platforms</div>
            <p className="text-ink-2 text-xs leading-relaxed">
              User logs into <em>Claude / ChatGPT / Perplexity</em> → asks for products → AI
              completes order inside the same walled garden. These platforms will integrate
              with brands directly. They don't need an open Broker.
            </p>
          </div>
          {/* Outer Ring */}
          <div className="bg-purple-50 border-2 border-purple-300 rounded-xl p-5 space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-purple-700 uppercase tracking-wider text-[10px]">Outer Ring</span>
              <span className="text-[10px] text-purple-700 font-semibold">·  Alignment lives here</span>
            </div>
            <div className="font-semibold text-ink text-sm">Consumer Agents outside any AI platform</div>
            <p className="text-ink-2 text-xs leading-relaxed">
              Autonomous shopping agents embedded in <em>WhatsApp, phone operating systems,
              voice assistants, vertical shopping startups</em>. They don't own the brand
              network — they call ours.
            </p>
          </div>
        </div>
      </section>

      {/* ── Layer 2 vs Layer 3 (product-family navigation) ────────── */}
      <section className="bg-surface-muted border border-divider rounded-2xl p-6">
        <h2 className="font-semibold text-ink text-sm mb-1">Layer 2 vs. Layer 3 — don't confuse them</h2>
        <p className="text-ink-3 text-xs mb-3">Where this product sits in the Alignment stack.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-surface rounded-xl p-4 space-y-2 border border-divider">
            <div className="font-mono text-ink-3 uppercase tracking-wider text-[10px]">Layer 2 — GEO</div>
            <div className="font-semibold text-ink">"Be mentioned by AI"</div>
            <p className="text-ink-2 leading-relaxed">
              Optimize how language models <em>describe</em> your brand in chat. Measured in
              mentions, citations, sentiment. The customer reads a human-language answer.
            </p>
            <Link href="/dashboard/geo-monitor" className="text-purple-600 hover:underline text-xs">Go to GEO module →</Link>
          </div>
          <div className="bg-surface rounded-xl p-4 space-y-2 border-2 border-purple-300">
            <div className="font-mono text-purple-700 uppercase tracking-wider text-[10px]">Layer 3 — Agentic Commerce</div>
            <div className="font-semibold text-ink">"Be transacted with by Consumer Agents"</div>
            <p className="text-ink-2 leading-relaxed">
              Expose a machine-callable Brand Agent. Consumer Agents call you, get a quote,
              commit a purchase. Measured in queries, quotes, commits, GMV.
            </p>
            <span className="text-purple-600 text-xs">You're here →</span>
          </div>
        </div>
      </section>

      {/* ── Walk-away sentence ─────────────────────────────────────── */}
      <section className="text-center py-10 md:py-14 border-t border-divider">
        <p className="text-xl md:text-3xl font-bold text-ink leading-snug max-w-3xl mx-auto">
          Every brand is reachable by Consumer Agents.<br />
          Every Consumer Agent finds the right brand.
        </p>
        <p className="text-ink-3 text-xs mt-4 font-mono">— the open infrastructure for AI commerce</p>
      </section>

      {/* ── Footer / Quick Links ────────────────────────────────────── */}
      <section className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-ink-3 pt-2 border-t border-divider">
        <span>Backend:</span>
        <a href={`${API_BASE}/api/agentic-commerce/enterprise/brands`} target="_blank" rel="noreferrer"
          className="text-purple-600 hover:underline font-mono">/enterprise/brands</a>
        <a href={`${API_BASE}/api/agentic-commerce/platform/overview`} target="_blank" rel="noreferrer"
          className="text-purple-600 hover:underline font-mono">/platform/overview</a>
        <span className="ml-auto">Concept v1 · MCP-based · 2026-05-12</span>
      </section>
    </div>
  );
}
