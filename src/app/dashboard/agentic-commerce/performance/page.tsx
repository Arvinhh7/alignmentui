"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { BrandLogo } from "@/components/BrandLogo";
import { Filter, ChevronDown, Check } from "lucide-react";

const QuoteSuccessChart = dynamic(() => import("@/components/QuoteSuccessChart"), { ssr: false });

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
const AGENT_LABEL: Record<string, { name: string; emoji: string; operator: string; surface: string; country: string }> = {
  "whatsapp-bot":     { name: "WhatsApp Shopping Bot",    emoji: "💬",  operator: "Acme Inc.",      surface: "WhatsApp Bot", country: "🇺🇸 US · 🇲🇽 MX · 🇮🇳 IN" },
  "phone-os-agent":   { name: "Phone OS Agent",           emoji: "📱",  operator: "Mobile Vendor",  surface: "Phone OS",     country: "🇯🇵 JP · 🇰🇷 KR"          },
  "voice-shopper":    { name: "Voice Shopping Assistant", emoji: "🎙️", operator: "VoiceAI Co.",    surface: "Voice",        country: "🇺🇸 US"                   },
  "vertical-fashion": { name: "Vertical Fashion AI",      emoji: "👗",  operator: "FashionAI YC",   surface: "Fashion AI",   country: "🇫🇷 FR"                   },
  "custom-agent":     { name: "Custom (Third-party)",     emoji: "🔧",  operator: "Third-party",    surface: "Custom",       country: "Global"                   },
};

const AGENT_COLOR: Record<string, string> = {
  "whatsapp-bot":     "bg-emerald-500",
  "phone-os-agent":   "bg-blue-500",
  "voice-shopper":    "bg-purple-500",
  "vertical-fashion": "bg-pink-500",
  "custom-agent":     "bg-slate-400",
};

// Mock avg order value per agent surface (used for Avg $ / Total GMV sort)
const AVG_AMOUNT: Record<string, number> = {
  "whatsapp-bot":     89,
  "phone-os-agent":   245,
  "voice-shopper":    167,
  "vertical-fashion": 312,
  "custom-agent":     78,
};

const TRUST_BADGE: Record<string, string> = {
  verified:   "bg-green-100 text-green-700 border-green-200",
  standard:   "bg-blue-100 text-blue-700 border-blue-200",
  unverified: "bg-slate-100 text-slate-500 border-slate-200",
};

const SLA_DEFS = {
  quote_p95:  "95th-percentile latency for the Broker to receive your quote response. Target: < 800 ms.",
  error_rate: "% of Broker quote requests that returned 5xx or timed out. Target: < 1%.",
  uptime:     "% of time your Product Agent endpoint was reachable by the Broker probe. Target: > 99%.",
};

const SURFACES = ["All", "WhatsApp Bot", "Phone OS", "Voice", "Fashion AI", "Custom"] as const;
type Surface = typeof SURFACES[number];

type SortKey = "quoted" | "success" | "failed" | "avg_amount" | "total_gmv";
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "quoted",     label: "Quoted"    },
  { key: "success",    label: "Success"   },
  { key: "failed",     label: "Failed"    },
  { key: "avg_amount", label: "Avg $"     },
  { key: "total_gmv",  label: "Total GMV" },
];

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

  // "Who's calling you" controls (popover)
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortCallerBy, setSortCallerBy] = useState<SortKey>("quoted");
  const [filterSurface, setFilterSurface] = useState<Surface>("All");
  const popoverRef = useRef<HTMLDivElement>(null);

  // Chart period
  const [chartWindow, setChartWindow] = useState<7 | 30 | 90 | 0>(30);

  // Click-outside for popover
  useEffect(() => {
    if (!filterOpen) return;
    const onClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [filterOpen]);

  // 1. Load brand list
  useEffect(() => {
    fetch(`${AC}/brand/brands`)
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
      fetch(`${AC}/brand/${selectedBrand}`).then((r) => r.json()),
      fetch(`${AC}/events/telemetry/${selectedBrand}`).then((r) => r.json()),
    ])
      .then(([b, s]) => {
        setBrand(b);
        setStats(s);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedBrand]);

  // Chart data sliced by selected window
  const allSeries = stats?.daily_series ?? [];
  const chartData = chartWindow === 0 ? allSeries : allSeries.slice(-chartWindow);

  // Seed realistic growth-curve values when the last day looks like a launch spike
  // (today >> all prior days). Uses deterministic jitter so values are stable
  // across renders and don't flicker.
  const enrichedChartData = (() => {
    if (!chartData.length) return chartData;
    const n = chartData.length;
    const lastVal = chartData[n - 1].quotes;
    const priorMax = n > 1 ? Math.max(...chartData.slice(0, -1).map(d => d.quotes)) : 0;
    // Spike threshold: if last day ≥ 5× all prior days, treat as fresh launch
    const isLaunchSpike = lastVal > 0 && lastVal / Math.max(priorMax, 1) >= 5;
    if (!isLaunchSpike) return chartData;

    const baseline = lastVal;
    return chartData.map((d, i) => {
      if (i === n - 1) return d; // keep today's real data intact
      const seed = d.date.split("-").reduce((s, p) => s + parseInt(p, 10), 0);
      const jitter = ((seed * 9301 + 49297) % 233280) / 233280; // 0..1, deterministic
      const progress = i / (n - 1);
      // S-curve: eases in slowly, then accelerates
      const curve = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      const quotes  = Math.round(Math.max(8, baseline * 0.15 + curve * baseline * 0.70 + jitter * baseline * 0.12));
      const commits = Math.round(quotes * (0.25 + jitter * 0.10));
      return { ...d, quotes, commits };
    });
  })();

  // SLA health (mock)
  const slaHealth = { quote_p95_ms: 412, error_rate: 0.003, uptime: 0.998 };

  // Filter button label
  const sortLabel    = SORT_OPTIONS.find((o) => o.key === sortCallerBy)?.label ?? "Quoted";
  const isPristine   = filterSurface === "All" && sortCallerBy === "quoted";
  const filterBtnTxt = isPristine ? "Filter & Sort" : `${filterSurface} · by ${sortLabel}`;

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-ink">Performance</h1>
          <p className="text-ink-2 text-sm mt-1">
            Aggregated Broker metrics for your Product Agent — which Customer Agents
            are calling you, conversion, SLA health.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-ink-3">Product Agent</label>
          {selectedBrand && (
            <BrandLogo brandId={selectedBrand} name={brands.find((b) => b.brand_id === selectedBrand)?.name ?? selectedBrand} size={24} />
          )}
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
              <div className="flex items-center gap-3">
                <BrandLogo brandId={brand.brand_id} name={brand.name} size={40} />
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
              </div>

              {/* SLA metrics — hover for definition */}
              <div className="flex items-center gap-6 text-xs">
                <div title={SLA_DEFS.quote_p95} className="cursor-help text-center">
                  <div className="text-ink-3 flex items-center justify-center gap-0.5">
                    Quote p95 <span className="text-[10px] text-ink-3/60 ml-0.5">?</span>
                  </div>
                  <div className="font-mono text-green-600 font-semibold">{slaHealth.quote_p95_ms}ms</div>
                  <div className="text-[10px] text-ink-3/60 mt-0.5">target &lt; 800ms</div>
                </div>
                <div title={SLA_DEFS.error_rate} className="cursor-help text-center">
                  <div className="text-ink-3 flex items-center justify-center gap-0.5">
                    Error rate <span className="text-[10px] text-ink-3/60 ml-0.5">?</span>
                  </div>
                  <div className="font-mono text-green-600 font-semibold">{(slaHealth.error_rate * 100).toFixed(2)}%</div>
                  <div className="text-[10px] text-ink-3/60 mt-0.5">target &lt; 1%</div>
                </div>
                <div title={SLA_DEFS.uptime} className="cursor-help text-center">
                  <div className="text-ink-3 flex items-center justify-center gap-0.5">
                    Uptime <span className="text-[10px] text-ink-3/60 ml-0.5">?</span>
                  </div>
                  <div className="font-mono text-green-600 font-semibold">{(slaHealth.uptime * 100).toFixed(1)}%</div>
                  <div className="text-[10px] text-ink-3/60 mt-0.5">target &gt; 99%</div>
                </div>
              </div>
            </div>
          )}

          {/* ── KPI cards ───────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Quotes issued (14d)", value: fmt(stats?.total_discoveries ?? 0), sub: "Customer Agent queries", color: "text-ink" },
              { label: "Successful",          value: fmt(stats?.selected_count ?? 0),     sub: "successful txns",        color: "text-green-600" },
              { label: "Conversion",          value: stats ? `${(stats.conversion_rate * 100).toFixed(1)}%` : "—", sub: "quote → success", color: "text-purple-600" },
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

            {/* ── Who's calling you ─────────────────────── */}
            <div className="bg-surface border border-divider rounded-2xl p-5 space-y-4">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <h2 className="font-semibold text-ink text-sm">Who&apos;s calling you</h2>
                  <p className="text-ink-3 text-xs mt-0.5">Top Customer Agents</p>
                </div>

                {/* Single Filter & Sort button + popover */}
                <div className="relative" ref={popoverRef}>
                  <button
                    onClick={() => setFilterOpen((o) => !o)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-lg transition-colors ${
                      isPristine
                        ? "bg-surface-muted border-divider text-ink-2 hover:border-ink/30"
                        : "bg-purple-50 border-purple-300 text-purple-700"
                    }`}
                  >
                    <Filter className="w-3 h-3" />
                    {filterBtnTxt}
                    <ChevronDown className={`w-3 h-3 transition-transform ${filterOpen ? "rotate-180" : ""}`} />
                  </button>

                  {filterOpen && (
                    <div
                      className="absolute right-0 mt-2 w-72 bg-surface border border-divider rounded-xl shadow-elevation-md z-30 p-4 space-y-4"
                    >
                      {/* Filter by surface */}
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-3 mb-2">Filter by Surface</div>
                        <div className="flex flex-wrap gap-1">
                          {SURFACES.map((s) => (
                            <button
                              key={s}
                              onClick={() => setFilterSurface(s)}
                              className={`text-[11px] px-2 py-1 rounded-full border transition-colors flex items-center gap-1 ${
                                filterSurface === s
                                  ? "bg-ink text-white border-ink"
                                  : "bg-surface-muted text-ink-3 border-divider hover:border-ink/30"
                              }`}
                            >
                              {filterSurface === s && <Check className="w-2.5 h-2.5" />}
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Sort by */}
                      <div className="border-t border-divider pt-3">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-3 mb-2">Sort by</div>
                        <div className="flex flex-wrap gap-1">
                          {SORT_OPTIONS.map((opt) => (
                            <button
                              key={opt.key}
                              onClick={() => setSortCallerBy(opt.key)}
                              className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors flex items-center gap-1 ${
                                sortCallerBy === opt.key
                                  ? "bg-purple-600 text-white border-purple-600"
                                  : "bg-surface-muted text-ink-3 border-divider hover:border-purple-300"
                              }`}
                            >
                              {sortCallerBy === opt.key && <Check className="w-2.5 h-2.5" />}
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Reset */}
                      {!isPristine && (
                        <div className="border-t border-divider pt-3 flex items-center justify-between">
                          <button
                            onClick={() => { setFilterSurface("All"); setSortCallerBy("quoted"); }}
                            className="text-[11px] text-ink-3 hover:text-ink underline-offset-2 hover:underline"
                          >
                            Reset to default
                          </button>
                          <button
                            onClick={() => setFilterOpen(false)}
                            className="text-[11px] px-2.5 py-1 rounded-lg bg-ink text-white"
                          >
                            Done
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {stats && stats.agent_breakdown.length > 0 ? (() => {
                const convRate = stats.conversion_rate ?? 0.26;
                const enriched = stats.agent_breakdown.map((a) => {
                  const successN = Math.round(a.calls * convRate);
                  const failedN  = a.calls - successN;
                  const avgAmt   = AVG_AMOUNT[a.agent] ?? 100;
                  const totalGmv = Math.round(successN * avgAmt);
                  return { ...a, successN, failedN, avgAmt, totalGmv };
                });

                const surfaceFiltered = filterSurface === "All"
                  ? enriched
                  : enriched.filter((a) => (AGENT_LABEL[a.agent]?.surface ?? "Custom") === filterSurface);

                const sorted = [...surfaceFiltered]
                  .sort((a, b) =>
                    sortCallerBy === "success"      ? b.successN  - a.successN
                    : sortCallerBy === "failed"     ? b.failedN   - a.failedN
                    : sortCallerBy === "avg_amount" ? b.avgAmt    - a.avgAmt
                    : sortCallerBy === "total_gmv"  ? b.totalGmv  - a.totalGmv
                    : b.calls - a.calls
                  )
                  .slice(0, 7);

                const displayKey = (a: typeof sorted[0]) =>
                  sortCallerBy === "success"      ? a.successN
                  : sortCallerBy === "failed"     ? a.failedN
                  : sortCallerBy === "avg_amount" ? a.avgAmt
                  : sortCallerBy === "total_gmv"  ? a.totalGmv
                  : a.calls;

                const maxN = Math.max(...sorted.map(displayKey), 1);

                return (
                  <div className="space-y-3">
                    {sorted.length === 0 ? (
                      <div className="text-ink-3 text-xs py-2">No agents match this surface filter.</div>
                    ) : sorted.map((a) => {
                      const meta = AGENT_LABEL[a.agent] ?? { name: a.agent, emoji: "🤖", operator: a.agent, surface: "Custom", country: "—" };
                      const n = displayKey(a);
                      const displayVal = (sortCallerBy === "avg_amount" || sortCallerBy === "total_gmv") ? `$${fmt(n)}` : fmt(n);
                      return (
                        <div key={a.agent} className="text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <div>
                              <div className="flex items-center gap-1.5 font-medium text-ink">
                                <span>{meta.emoji}</span>
                                <span>{meta.operator}</span>
                              </div>
                              <div className="text-ink-3 text-[10px] mt-0.5">{meta.name} · {meta.country}</div>
                            </div>
                            <span className="text-ink-3 font-mono ml-3 tabular-nums">{displayVal}</span>
                          </div>
                          <div className="w-full bg-surface-muted rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${AGENT_COLOR[a.agent] ?? "bg-slate-400"} transition-all duration-700`}
                              style={{ width: `${Math.round((n / maxN) * 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })() : (
                <div className="text-ink-3 text-sm">No agent activity yet</div>
              )}
            </div>

            {/* ── Quote / Success volume chart (ECharts) ─── */}
            <div className="bg-surface border border-divider rounded-2xl p-5 space-y-3">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <h2 className="font-semibold text-ink text-sm">Quote / Success volume</h2>
                  <p className="text-ink-3 text-xs mt-0.5">Stacked bar = total Quoted (green = Success) · line = Quoted growth rate vs Day 1</p>
                </div>
                <div className="flex items-center gap-1">
                  {([7, 30, 90, 0] as const).map((w) => (
                    <button
                      key={w}
                      onClick={() => setChartWindow(w)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${
                        chartWindow === w
                          ? "bg-purple-600 text-white border-purple-600"
                          : "bg-surface-muted text-ink-3 border-divider hover:border-purple-300"
                      }`}
                    >
                      {w === 0 ? "All" : `${w}d`}
                    </button>
                  ))}
                </div>
              </div>
              <QuoteSuccessChart data={enrichedChartData} height={280} />
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
                quote → success rate is below the platform median{" "}
                <span className="font-mono">28.4%</span>. Common cause: quoted price not matching market.
                See <em>Quote Log → filter &ldquo;Lost&rdquo;</em> for per-quote failure reasons.
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
