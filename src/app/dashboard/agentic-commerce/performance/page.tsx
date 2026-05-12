"use client";

import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
const AC = `${API_BASE}/api/agentic-commerce`;

// ── Types ─────────────────────────────────────────────────────────────────────
type Brand = {
  brand_id: string;
  name: string;
  tagline: string;
  trust_level: string;
  product_count?: number;
};

type AgentBreakdown = { agent: string; calls: number; pct: number };
type DailyPoint = { date: string; quotes: number; commits: number; gmv: number };

type Stats = {
  total_discoveries: number;
  selected_count: number;
  conversion_rate: number;
  avg_trust_score: number;
  agent_breakdown: AgentBreakdown[];
  daily_series: DailyPoint[];
};

// ── Constants ─────────────────────────────────────────────────────────────────
// Consumer Agent labels — Outer Ring per concept doc v1.
// Backend (event_engine._AGENT_DIST) now emits these keys directly.
const AGENT_LABEL: Record<string, { name: string; emoji: string }> = {
  "whatsapp-bot":     { name: "WhatsApp Shopping Bot",    emoji: "💬"  },
  "phone-os-agent":   { name: "Phone OS Agent",           emoji: "📱"  },
  "voice-shopper":    { name: "Voice Shopping Assistant", emoji: "🎙️" },
  "vertical-fashion": { name: "Vertical Fashion AI",      emoji: "👗"  },
  "custom-agent":     { name: "Custom (Third-party)",     emoji: "🔧"  },
};

const AGENT_COLOR: Record<string, string> = {
  "whatsapp-bot":     "bg-emerald-500",
  "phone-os-agent":   "bg-blue-500",
  "voice-shopper":    "bg-purple-500",
  "vertical-fashion": "bg-pink-500",
  "custom-agent":     "bg-slate-400",
};

const TRUST_BADGE: Record<string, string> = {
  verified:   "bg-green-100 text-green-700 border-green-200",
  standard:   "bg-blue-100 text-blue-700 border-blue-200",
  unverified: "bg-slate-100 text-slate-500 border-slate-200",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number, d = 0) {
  return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function PerformancePage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [brand, setBrand] = useState<Brand | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. Load brand list
  useEffect(() => {
    fetch(`${AC}/enterprise/brands`)
      .then((r) => r.json())
      .then((d) => {
        setBrands(d.brands ?? []);
        if (d.brands?.length && !selectedBrand) setSelectedBrand(d.brands[0].brand_id);
      })
      .catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Load brand detail + telemetry on selection change
  useEffect(() => {
    if (!selectedBrand) return;
    setLoading(true);
    Promise.all([
      fetch(`${AC}/enterprise/${selectedBrand}`).then((r) => r.json()),
      fetch(`${AC}/events/telemetry/${selectedBrand}`).then((r) => r.json()),
    ])
      .then(([b, s]) => {
        setBrand(b);
        setStats(s);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedBrand]);

  const maxCalls = stats ? Math.max(...stats.agent_breakdown.map((a) => a.calls), 1) : 1;
  const last7 = stats ? stats.daily_series.slice(-7) : [];
  const maxQuotes  = last7.length ? Math.max(...last7.map((d) => d.quotes),  1) : 1;
  const maxCommits = last7.length ? Math.max(...last7.map((d) => d.commits), 1) : 1;

  // SLA health (mock — would come from broker probe in production)
  const slaHealth = {
    quote_p95_ms: 412,
    error_rate: 0.003,
    uptime: 0.998,
  };

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-ink">Performance</h1>
          <p className="text-ink-2 text-sm mt-1">
            Aggregated Broker metrics for your Brand Agent — which Consumer Agents
            are calling you, conversion, SLA health.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-ink-3">Brand Agent</label>
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="text-sm border border-divider rounded-lg px-3 py-1.5 bg-surface-muted focus:outline-none"
          >
            {brands.map((b) => (
              <option key={b.brand_id} value={b.brand_id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-ink-3 text-sm animate-pulse py-10 text-center">Loading performance data…</div>
      ) : (
        <>
          {/* ── Brand identity card ─────────────────────────── */}
          {brand && (
            <div className="bg-surface border border-divider rounded-2xl p-5 flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-ink">{brand.name}</h2>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${TRUST_BADGE[brand.trust_level] ?? TRUST_BADGE.standard}`}>
                    {brand.trust_level}
                  </span>
                </div>
                <p className="text-ink-2 text-xs mt-0.5">{brand.tagline}</p>
                <p className="text-ink-3 text-xs mt-1 font-mono">did:alignment:{brand.brand_id}:prod-1</p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div>
                  <div className="text-ink-3">Quote p95</div>
                  <div className="font-mono text-green-600 font-semibold">{slaHealth.quote_p95_ms}ms</div>
                </div>
                <div>
                  <div className="text-ink-3">Error rate</div>
                  <div className="font-mono text-green-600 font-semibold">{(slaHealth.error_rate * 100).toFixed(2)}%</div>
                </div>
                <div>
                  <div className="text-ink-3">Uptime</div>
                  <div className="font-mono text-green-600 font-semibold">{(slaHealth.uptime * 100).toFixed(1)}%</div>
                </div>
              </div>
            </div>
          )}

          {/* ── KPI cards ───────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Quotes issued (14d)", value: fmt(stats?.total_discoveries ?? 0), sub: "Consumer Agent queries", color: "text-ink" },
              { label: "Committed",           value: fmt(stats?.selected_count ?? 0),     sub: "successful txns",       color: "text-green-600" },
              { label: "Conversion",          value: stats ? `${(stats.conversion_rate * 100).toFixed(1)}%` : "—", sub: "quote → commit", color: "text-purple-600" },
              { label: "Avg trust score",     value: stats?.avg_trust_score.toFixed(3) ?? "—", sub: "broker reputation", color: "text-blue-600" },
            ].map((c) => (
              <div key={c.label} className="bg-surface border border-divider rounded-xl p-4 space-y-1">
                <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
                <div className="text-ink-2 text-xs">{c.label}</div>
                <div className="text-ink-3 text-[10px]">{c.sub}</div>
              </div>
            ))}
          </div>

          {/* ── Charts row ─────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Agent breakdown */}
            <div className="bg-surface border border-divider rounded-2xl p-5 space-y-4">
              <div>
                <h2 className="font-semibold text-ink text-sm">Who's calling you</h2>
                <p className="text-ink-3 text-xs mt-0.5">Consumer Agent distribution — by surface (WhatsApp / phone OS / voice / vertical / custom)</p>
              </div>
              {stats && stats.agent_breakdown.length > 0 ? (
                <div className="space-y-3">
                  {stats.agent_breakdown.map((a) => {
                    const meta = AGENT_LABEL[a.agent] ?? { name: a.agent, emoji: "🤖" };
                    return (
                      <div key={a.agent} className="text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="flex items-center gap-1.5 text-ink-2">
                            <span>{meta.emoji}</span>
                            <span>{meta.name}</span>
                          </span>
                          <span className="text-ink-3 font-mono">{a.pct}% · {fmt(a.calls)} calls</span>
                        </div>
                        <div className="w-full bg-surface-muted rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${AGENT_COLOR[a.agent] ?? "bg-slate-400"} transition-all duration-700`}
                            style={{ width: `${Math.round((a.calls / maxCalls) * 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-ink-3 text-sm">No agent activity yet</div>
              )}
            </div>

            {/* Daily series */}
            <div className="bg-surface border border-divider rounded-2xl p-5 space-y-4">
              <div>
                <h2 className="font-semibold text-ink text-sm">Quote / commit volume — last 7 days</h2>
                <p className="text-ink-3 text-xs mt-0.5">Bar height = quotes issued · green = committed</p>
              </div>
              {last7.length > 0 ? (
                <>
                  <div className="flex items-end gap-2 h-32">
                    {last7.map((d) => {
                      const qH = Math.round((d.quotes  / maxQuotes)  * 100);
                      const sH = Math.round((d.commits / maxCommits) * 100);
                      return (
                        <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group">
                          <div className="w-full h-full flex flex-col justify-end gap-px">
                            <div
                              className="w-full bg-purple-500/40 rounded-t"
                              style={{ height: `${qH}%` }}
                              title={`${d.quotes} quotes`}
                            />
                            <div
                              className="w-full bg-green-500/70"
                              style={{ height: `${(sH / 100) * 32}px` }}
                              title={`${d.commits} commits`}
                            />
                          </div>
                          <div className="text-[10px] text-ink-3 font-mono">{d.date.slice(5)}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-4 text-[10px] text-ink-3">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-500/40" />Quotes</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500/70" />Commits</span>
                  </div>
                </>
              ) : (
                <div className="text-ink-3 text-sm">No daily data yet</div>
              )}
            </div>
          </div>

          {/* ── Optimization recommendations ─────────────────── */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <span>💡</span>
              <h2 className="font-semibold text-amber-900 text-sm">Optimization opportunities</h2>
            </div>
            <ul className="text-amber-900 text-xs space-y-2">
              <li>
                <strong>Conversion gap:</strong> Your{" "}
                <span className="font-mono">{stats ? (stats.conversion_rate * 100).toFixed(1) : "—"}%</span>{" "}
                quote → commit rate is below the platform median{" "}
                <span className="font-mono">28.4%</span>. Common cause: quoted price not matching market.
                See <em>Quote Log → filter "Lost"</em> for per-quote failure reasons.
              </li>
              <li>
                <strong>SLA headroom:</strong> Your p95 quote latency{" "}
                <span className="font-mono">{slaHealth.quote_p95_ms}ms</span> is well within the 800ms target.
                Consider expanding to additional ship-to regions in your{" "}
                <code className="font-mono bg-amber-100 px-1 rounded">.well-known/agent.json</code>.
              </li>
              <li>
                <strong>Trust score:</strong>{" "}
                <span className="font-mono">{stats?.avg_trust_score.toFixed(3) ?? "—"}</span> · upgrade
                to <em>verified</em> trust level (review policies, KYC docs) to boost broker_score by ~0.05.
              </li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
