"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
const AC = `${API_BASE}/api/agentic-commerce`;

// ── Types ──────────────────────────────────────────────────────────────────────
type LiveEvent = {
  event_id: string; brand_id: string; caller_agent_id: string; intent: string;
  matched_rank: number; trust_score: number;
  outcome: "discovered" | "selected" | "rejected" | "abandoned";
  created_at: string; _type?: "live" | "catchup" | "heartbeat";
};
type AgentBreakdown = { agent: string; calls: number; pct: number };
type DailyPoint = { date: string; discoveries: number; selected: number };
type Stats = {
  total_discoveries: number; selected_count: number; conversion_rate: number;
  avg_trust_score: number; agent_breakdown: AgentBreakdown[]; daily_series: DailyPoint[];
};
type Brand = {
  brand_id: string; name: string; tagline: string; trust_level: string;
  products: { id: string; name: string; price: number; inventory: number; description: string; categories: string[] }[];
};

// ── Config ─────────────────────────────────────────────────────────────────────
const AGENT_EMOJI: Record<string, string> = {
  claude: "🤖", chatgpt: "💬", perplexity: "🔍", gemini: "✨", "custom-agent": "🔧",
};
const OUTCOME_STYLE: Record<string, string> = {
  selected:   "bg-green-100 text-green-700 border-green-200",
  discovered: "bg-blue-100 text-blue-700 border-blue-200",
  rejected:   "bg-red-100 text-red-600 border-red-200",
  abandoned:  "bg-slate-100 text-slate-500 border-slate-200",
};
const BRAND_GRAD: Record<string, string> = {
  "eco-home": "from-emerald-500 to-teal-600",
  "tech-gear": "from-blue-500 to-indigo-600",
  "nutri-plus": "from-orange-500 to-amber-600",
};
const AGENT_COLOR: Record<string, string> = {
  claude: "bg-purple-500", chatgpt: "bg-green-500", perplexity: "bg-blue-500",
  gemini: "bg-orange-500", "custom-agent": "bg-slate-400",
};

function relativeTime(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (d < 5) return "just now";
  if (d < 60) return `${d}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  return `${Math.floor(d / 3600)}h ago`;
}

export default function BrandConsolePage({ params }: { params: { brand_id: string } }) {
  const { brand_id } = params;
  const [brand, setBrand] = useState<Brand | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [liveStatus, setLiveStatus] = useState<"connecting" | "live" | "error">("connecting");
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    fetch(`${AC}/enterprise/${brand_id}`)
      .then((r) => r.json()).then(setBrand).catch(console.error);
  }, [brand_id]);

  useEffect(() => {
    const load = () =>
      fetch(`${AC}/events/telemetry/${brand_id}`)
        .then((r) => r.json()).then(setStats).catch(console.error);
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [brand_id]);

  useEffect(() => {
    const es = new EventSource(`${AC}/events/stream/${brand_id}`);
    esRef.current = es;
    setLiveStatus("connecting");
    es.onopen = () => setLiveStatus("live");
    es.onerror = () => setLiveStatus("error");
    es.onmessage = (e) => {
      const data: LiveEvent & { _type: string } = JSON.parse(e.data);
      if (data._type === "heartbeat") return;
      setEvents((prev) => [data, ...prev].slice(0, 60));
      if (data._type === "live") {
        setNewIds((prev) => {
          const s = new Set(prev); s.add(data.event_id);
          setTimeout(() => setNewIds((cur) => { const n = new Set(cur); n.delete(data.event_id); return n; }), 2000);
          return s;
        });
      }
    };
    return () => { es.close(); esRef.current = null; };
  }, [brand_id]);

  const grad = BRAND_GRAD[brand_id] ?? "from-purple-500 to-purple-700";
  const maxCalls = stats ? Math.max(...stats.agent_breakdown.map((a) => a.calls), 1) : 1;
  const maxDisc = stats ? Math.max(...(stats.daily_series.slice(-7).map((d) => d.discoveries)), 1) : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-ink-3 mb-1">
            <Link href="/dashboard/agentic-commerce/console" className="hover:text-ink">← Brands</Link>
            <span>/</span>
            <span>{brand?.name ?? brand_id}</span>
          </div>
          <h1 className="text-2xl font-bold text-ink">{brand?.name ?? brand_id}</h1>
          {brand?.tagline && <p className="text-ink-2 text-sm mt-0.5">{brand.tagline}</p>}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className={`w-2 h-2 rounded-full ${
            liveStatus === "live" ? "bg-green-400 animate-pulse" :
            liveStatus === "error" ? "bg-red-400" : "bg-yellow-400 animate-pulse"
          }`} />
          <span className="text-ink-3 text-xs">
            {liveStatus === "live" ? "Live" : liveStatus === "error" ? "Disconnected" : "Connecting…"}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Calls (14d)", value: stats?.total_discoveries.toLocaleString() ?? "—", color: "text-ink" },
          { label: "Selected", value: stats?.selected_count.toLocaleString() ?? "—", color: "text-green-600" },
          { label: "Conversion", value: stats ? `${(stats.conversion_rate * 100).toFixed(1)}%` : "—", color: "text-purple-600" },
          { label: "Avg Trust", value: stats?.avg_trust_score.toFixed(3) ?? "—", color: "text-blue-600" },
        ].map((c) => (
          <div key={c.label} className="bg-surface border border-divider rounded-xl p-4">
            <div className={`text-xl font-bold ${c.color}`}>{c.value}</div>
            <div className="text-ink-3 text-xs mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Middle: agent breakdown + live feed */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Agent Breakdown */}
        <div className="bg-surface border border-divider rounded-2xl p-5 space-y-4">
          <div>
            <h2 className="font-semibold text-ink text-sm">Agent Breakdown</h2>
            <p className="text-ink-3 text-xs mt-0.5">Which AI agents are discovering this brand</p>
          </div>
          {stats ? (
            <div className="space-y-3">
              {stats.agent_breakdown.map((a) => (
                <div key={a.agent} className="flex items-center gap-3 text-xs">
                  <span className="w-28 text-right text-ink-2 shrink-0">{AGENT_EMOJI[a.agent] ?? "🤖"} {a.agent}</span>
                  <div className="flex-1 bg-surface-muted rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${AGENT_COLOR[a.agent] ?? "bg-purple-500"} transition-all duration-700`}
                      style={{ width: `${maxCalls > 0 ? Math.round((a.calls / maxCalls) * 100) : 0}%` }}
                    />
                  </div>
                  <span className="w-20 text-ink-3 shrink-0">{a.pct}% ({a.calls})</span>
                </div>
              ))}
            </div>
          ) : <div className="text-ink-3 text-sm animate-pulse">Loading…</div>}

          {stats?.daily_series && (
            <div className="space-y-2 pt-2 border-t border-divider">
              <div className="text-xs text-ink-3">Daily calls — last 7 days</div>
              <div className="flex items-end gap-1 h-10">
                {stats.daily_series.slice(-7).map((d) => (
                  <div key={d.date} className="flex-1 flex flex-col items-center" title={`${d.date}: ${d.discoveries}`}>
                    <div className="w-full bg-purple-500/60 rounded-sm"
                      style={{ height: `${Math.round((d.discoveries / maxDisc) * 40)}px` }} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Live Feed */}
        <div className="bg-surface border border-divider rounded-2xl p-5 space-y-3 flex flex-col">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-ink text-sm">Live Agent Feed</h2>
              <p className="text-ink-3 text-xs mt-0.5">Real-time discovery events</p>
            </div>
            <span className="text-xs text-ink-3">{events.length} events</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 max-h-64">
            {events.length === 0 ? (
              <div className="text-ink-3 text-sm text-center py-8 animate-pulse">Waiting for agent activity…</div>
            ) : events.map((ev) => (
              <div key={ev.event_id}
                className={`flex items-start gap-2 p-2.5 rounded-xl border transition-all duration-500 ${
                  newIds.has(ev.event_id) ? "bg-purple-50 border-purple-200" : "bg-surface-muted border-divider"
                }`}>
                <span className="text-base shrink-0 mt-0.5">{AGENT_EMOJI[ev.caller_agent_id] ?? "🤖"}</span>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-xs text-ink">{ev.caller_agent_id}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full border ${OUTCOME_STYLE[ev.outcome]}`}>
                      {ev.outcome}
                    </span>
                    <span className="text-ink-3 text-xs ml-auto shrink-0">{relativeTime(ev.created_at)}</span>
                  </div>
                  <p className="text-ink-3 text-xs truncate">"{ev.intent}"</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Product Catalog */}
      {brand && (
        <div className="bg-surface border border-divider rounded-2xl p-5 space-y-4">
          <div>
            <h2 className="font-semibold text-ink text-sm">Product Catalog</h2>
            <p className="text-ink-3 text-xs mt-0.5">{brand.products.length} products · agents query these directly</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {brand.products.map((p) => (
              <div key={p.id} className="bg-surface-muted rounded-xl p-3 space-y-2 border border-divider">
                <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${grad} flex items-center justify-center text-xs font-bold text-white`}>
                  {p.id.slice(-3).toUpperCase()}
                </div>
                <div className="font-medium text-xs text-ink leading-snug">{p.name}</div>
                <div className="flex items-center justify-between">
                  <span className="text-green-600 font-semibold text-xs">${p.price}</span>
                  <span className={`text-xs ${p.inventory > 50 ? "text-ink-3" : "text-orange-500"}`}>
                    {p.inventory} left
                  </span>
                </div>
                <p className="text-ink-3 text-xs leading-tight line-clamp-2">{p.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
