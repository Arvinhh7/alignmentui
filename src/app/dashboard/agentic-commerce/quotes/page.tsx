"use client";

import { Fragment, useEffect, useRef, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
const AC = `${API_BASE}/api/agentic-commerce`;

// ── Types ──────────────────────────────────────────────────────────────────────
type BrokerEvent = {
  event_id: string;
  brand_id: string;
  caller_agent_id: string;
  intent: string;
  matched_rank: number;
  trust_score: number;
  outcome: "discovered" | "selected" | "rejected" | "abandoned";
  created_at: string;
  _type?: "live" | "catchup" | "heartbeat";
  // PROTOCOL_v0.1 §4.3 — provided by backend; absent in older events
  quote_id?: string;
  quoted_price?: number;
  product_name?: string;
  product_id?: string;
  failure_reason?: string | null;
};

type Brand = { brand_id: string; name: string };

type Quote = BrokerEvent & {
  quote_id: string;
  quoted_price: number;
  product_name: string;
  failure_reason?: string;
};

// ── Constants ──────────────────────────────────────────────────────────────────
// Consumer Agent labels — Outer Ring per concept doc v1.
// Backend now emits these Outer Ring keys directly (event_engine._AGENT_DIST).
const AGENT_LABEL: Record<string, { name: string; emoji: string; operator: string }> = {
  "whatsapp-bot":     { name: "WhatsApp Shopping Bot",    emoji: "💬",  operator: "Acme Inc. (demo)"     },
  "phone-os-agent":   { name: "Phone OS Agent",           emoji: "📱",  operator: "Mobile Vendor (demo)" },
  "voice-shopper":    { name: "Voice Shopping Assistant", emoji: "🎙️", operator: "VoiceAI Co. (demo)"   },
  "vertical-fashion": { name: "Vertical Fashion AI",      emoji: "👗",  operator: "FashionAI YC (demo)"  },
  "custom-agent":     { name: "Custom Consumer Agent",    emoji: "🔧",  operator: "Third-party"          },
};

const OUTCOME_MAP: Record<string, { label: string; color: string; icon: string }> = {
  selected:   { label: "Committed",  color: "bg-green-100 text-green-700 border-green-200",  icon: "✓" },
  discovered: { label: "Quoted",     color: "bg-blue-100 text-blue-700 border-blue-200",     icon: "○" },
  rejected:   { label: "Lost",       color: "bg-rose-100 text-rose-600 border-rose-200",     icon: "✗" },
  abandoned:  { label: "Abandoned",  color: "bg-slate-100 text-slate-500 border-slate-200",  icon: "—" },
};

const SAMPLE_PRODUCTS: Record<string, { name: string; price: number }[]> = {
  "allbirds":  [{ name: "Tree Runner Go",            price: 110.00 }, { name: "Wool Runner Mizzles",   price: 145.00 }],
  "razer":     [{ name: "BlackShark V2 Pro Headset", price: 179.99 }, { name: "DeathAdder V3 Pro",     price: 159.99 }],
  "patagonia": [{ name: "Better Sweater Fleece",     price: 139.00 }, { name: "Nano Puff Jacket",      price: 229.00 }],
};

// Brand logo metadata — Clearbit + fallback color
const BRAND_META: Record<string, { domain: string; color: string; initial: string }> = {
  allbirds:  { domain: "allbirds.com",  color: "#2D6A4F", initial: "A" },
  razer:     { domain: "razer.com",     color: "#00D384", initial: "R" },
  patagonia: { domain: "patagonia.com", color: "#C1440E", initial: "P" },
};

function BrandLogo({ brandId, name }: { brandId: string; name: string }) {
  const meta = BRAND_META[brandId];
  const initial = meta?.initial ?? name.charAt(0).toUpperCase();
  const bg = meta?.color ?? "#6D4AE8";
  return (
    <span className="relative inline-flex items-center justify-center w-6 h-6 rounded-full text-white font-bold text-[10px] shrink-0 overflow-hidden" style={{ background: bg }}>
      {initial}
      {meta && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://logo.clearbit.com/${meta.domain}`}
          alt=""
          className="absolute inset-0 w-full h-full object-cover rounded-full"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
      )}
    </span>
  );
}

const FAILURE_REASONS = [
  "competitor quoted lower",
  "out of stock at quote time",
  "user picked different brand",
  "schema mismatch — missing field",
  "quote expired before commit",
  "user abandoned session",
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmt(n: number, d = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}
function relTime(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
function fullTime(iso: string) {
  return new Date(iso).toISOString().replace("T", " ").slice(0, 19);
}

// Hydrate a raw BrokerEvent into a Quote.
// Prefers backend-provided PROTOCOL_v0.1 fields; falls back to deterministic
// client-side derivation for events that predate the schema upgrade.
function deriveQuote(ev: BrokerEvent): Quote {
  if (ev.quote_id && ev.quoted_price != null && ev.product_name) {
    // Backend supplied all Protocol fields — use them directly
    return {
      ...ev,
      quote_id:      ev.quote_id,
      quoted_price:  ev.quoted_price,
      product_name:  ev.product_name,
      failure_reason: ev.failure_reason ?? undefined,
    };
  }
  // Fallback: derive deterministically so re-renders don't flicker
  const products = SAMPLE_PRODUCTS[ev.brand_id] ?? [{ name: "Product", price: 50 }];
  const seed = ev.event_id.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  const p = products[seed % products.length];
  const failure = ev.outcome === "rejected" || ev.outcome === "abandoned"
    ? FAILURE_REASONS[seed % FAILURE_REASONS.length]
    : undefined;
  return {
    ...ev,
    quote_id:      `q_${ev.event_id.slice(-8)}`,
    quoted_price:  p.price,
    product_name:  p.name,
    failure_reason: failure,
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function QuoteLogPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [filterOutcome, setFilterOutcome] = useState<string>("all");
  const [filterAgent, setFilterAgent] = useState<string>("all");
  const [liveStatus, setLiveStatus] = useState<"connecting" | "live" | "error">("connecting");
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

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

  // 2. Subscribe to SSE for selected brand
  useEffect(() => {
    if (!selectedBrand) return;

    // Close prior connection
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setQuotes([]);
    setLiveStatus("connecting");

    const es = new EventSource(`${AC}/events/stream/${selectedBrand}`);
    esRef.current = es;
    es.onopen = () => setLiveStatus("live");
    es.onerror = () => setLiveStatus("error");
    es.onmessage = (e) => {
      try {
        const data: BrokerEvent = JSON.parse(e.data);
        if (data._type === "heartbeat") return;
        const quote = deriveQuote(data);
        setQuotes((prev) => [quote, ...prev].slice(0, 200));
        if (data._type === "live") {
          setNewIds((prev) => {
            const s = new Set(prev);
            s.add(data.event_id);
            setTimeout(() => {
              setNewIds((cur) => {
                const n = new Set(cur);
                n.delete(data.event_id);
                return n;
              });
            }, 2500);
            return s;
          });
        }
      } catch {
        /* swallow */
      }
    };
    return () => {
      es.close();
      esRef.current = null;
    };
  }, [selectedBrand]);

  // Filtered view
  const filtered = quotes.filter((q) => {
    if (filterOutcome !== "all" && q.outcome !== filterOutcome) return false;
    if (filterAgent !== "all" && q.caller_agent_id !== filterAgent) return false;
    return true;
  });

  // Aggregate counts
  const counts = quotes.reduce(
    (acc, q) => {
      acc[q.outcome] = (acc[q.outcome] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-ink">Quote Log</h1>
          <p className="text-ink-2 text-sm mt-1">
            Every quote your Brand Agent issued via the Alignment Broker — which Consumer
            Agent called, what they asked, what you quoted, who won. Fully traceable, drillable.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              liveStatus === "live"  ? "bg-green-400 animate-pulse"
              : liveStatus === "error" ? "bg-red-400"
              : "bg-yellow-400 animate-pulse"
            }`}
          />
          <span className="text-ink-3 font-mono">
            {liveStatus === "live" ? "LIVE · SSE connected" : liveStatus === "error" ? "DISCONNECTED" : "CONNECTING…"}
          </span>
        </div>
      </div>

      {/* ── Brand selector + Filters ──────────────────────────── */}
      <div className="bg-surface border border-divider rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-ink-3">Brand Agent</label>
            {selectedBrand && (
              <BrandLogo brandId={selectedBrand} name={brands.find((b) => b.brand_id === selectedBrand)?.name ?? selectedBrand} />
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

          <div className="flex items-center gap-2">
            <label className="text-xs text-ink-3">Outcome</label>
            <select
              value={filterOutcome}
              onChange={(e) => setFilterOutcome(e.target.value)}
              className="text-sm border border-divider rounded-lg px-3 py-1.5 bg-surface-muted focus:outline-none"
            >
              <option value="all">All</option>
              <option value="selected">✓ Committed</option>
              <option value="discovered">○ Quoted (no commit)</option>
              <option value="rejected">✗ Lost</option>
              <option value="abandoned">— Abandoned</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-ink-3">Consumer Agent</label>
            <select
              value={filterAgent}
              onChange={(e) => setFilterAgent(e.target.value)}
              className="text-sm border border-divider rounded-lg px-3 py-1.5 bg-surface-muted focus:outline-none"
            >
              <option value="all">All</option>
              {Object.entries(AGENT_LABEL).map(([id, info]) => (
                <option key={id} value={id}>{info.emoji} {info.name}</option>
              ))}
            </select>
          </div>

          <div className="ml-auto text-xs text-ink-3 font-mono">
            {filtered.length} / {quotes.length} quotes
          </div>
        </div>

        {/* Outcome breakdown bar */}
        {quotes.length > 0 && (
          <div className="flex items-center gap-2 text-xs">
            {(["selected", "discovered", "rejected", "abandoned"] as const).map((k) => {
              const n = counts[k] ?? 0;
              const pct = quotes.length > 0 ? (n / quotes.length) * 100 : 0;
              const conf = OUTCOME_MAP[k];
              return (
                <div key={k} className={`flex-1 ${pct > 0 ? "" : "opacity-50"}`}>
                  <div className={`px-2 py-1 rounded ${conf.color} flex items-center justify-between`}>
                    <span>{conf.label}</span>
                    <span className="font-mono">{n} · {pct.toFixed(0)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Quote Table ───────────────────────────────────────── */}
      <div className="bg-surface border border-divider rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-divider flex items-center justify-between">
          <h2 className="font-semibold text-ink text-sm">Live Quote Stream</h2>
          <span className="text-ink-3 text-xs">most recent first · 200 max</span>
        </div>

        {filtered.length === 0 ? (
          <div className="p-10 text-center text-ink-3 text-sm">
            {quotes.length === 0
              ? "Waiting for the first quote event…"
              : "No quotes match the active filters."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-ink-3 border-b border-divider bg-surface-muted">
                  <th className="px-4 py-2 text-left font-medium">Quote ID</th>
                  <th className="px-4 py-2 text-left font-medium">Time</th>
                  <th className="px-4 py-2 text-left font-medium">Consumer Agent</th>
                  <th className="px-4 py-2 text-left font-medium">Intent</th>
                  <th className="px-4 py-2 text-right font-medium">Quoted Price</th>
                  <th className="px-4 py-2 text-center font-medium">Rank</th>
                  <th className="px-4 py-2 text-center font-medium">Trust</th>
                  <th className="px-4 py-2 text-left font-medium">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((q) => {
                  const agent = AGENT_LABEL[q.caller_agent_id] ?? AGENT_LABEL["custom-agent"];
                  const out = OUTCOME_MAP[q.outcome];
                  const isNew = newIds.has(q.event_id);
                  const isExpanded = expandedId === q.event_id;
                  return (
                    <Fragment key={q.event_id}>
                      <tr
                        onClick={() => setExpandedId(isExpanded ? null : q.event_id)}
                        className={`border-b border-divider cursor-pointer transition-all ${
                          isNew ? "bg-purple-50" : "hover:bg-surface-muted"
                        }`}
                      >
                        <td className="px-4 py-2 font-mono text-ink-3">{q.quote_id}</td>
                        <td className="px-4 py-2 text-ink-3" title={fullTime(q.created_at)}>{relTime(q.created_at)}</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-1.5">
                            <span>{agent.emoji}</span>
                            <span className="text-ink-2">{q.caller_agent_id}</span>
                          </div>
                          <div className="text-ink-3 text-[10px]">{agent.operator}</div>
                        </td>
                        <td className="px-4 py-2 text-ink-2 max-w-xs truncate">"{q.intent}"</td>
                        <td className="px-4 py-2 text-right font-mono text-ink">${fmt(q.quoted_price)}</td>
                        <td className="px-4 py-2 text-center text-ink-2">#{q.matched_rank}</td>
                        <td className="px-4 py-2 text-center font-mono text-ink-2">{q.trust_score.toFixed(2)}</td>
                        <td className="px-4 py-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${out.color} font-medium`}>
                            {out.icon} {out.label}
                          </span>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${q.event_id}-expand`} className="bg-surface-muted border-b border-divider">
                          <td colSpan={8} className="px-6 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                              <div className="space-y-1">
                                <div className="font-mono text-ink-3 uppercase tracking-wider text-[10px]">Quote</div>
                                <div className="flex items-center gap-1.5">Product: <BrandLogo brandId={q.brand_id} name={q.brand_id} /><span className="text-ink font-medium">{q.product_name}</span></div>
                                <div>Price quoted: <span className="font-mono">${fmt(q.quoted_price)}</span></div>
                                <div>Issued at: <span className="font-mono">{fullTime(q.created_at)}</span></div>
                                <div>Valid for: <span className="font-mono">10 min</span></div>
                              </div>
                              <div className="space-y-1">
                                <div className="font-mono text-ink-3 uppercase tracking-wider text-[10px]">Outcome</div>
                                <div>Status: <span className={`px-1.5 py-0.5 rounded ${out.color}`}>{out.label}</span></div>
                                <div>Broker rank: <span className="font-mono">#{q.matched_rank} of N</span></div>
                                <div>Trust score: <span className="font-mono">{q.trust_score.toFixed(3)}</span></div>
                                {q.failure_reason && (
                                  <div className="text-rose-600">Reason: <span className="font-medium">{q.failure_reason}</span></div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Footnote ──────────────────────────────────────────── */}
      <div className="text-xs text-ink-3 space-y-1">
        <p>
          <strong>Reading the table:</strong> every row is one Broker round-trip — a Consumer
          Agent (a shopping bot in WhatsApp / phone OS / voice / vertical app) queried the
          Broker, the Broker fanned out to all eligible Brand Agents, your agent returned a
          quote, and either the Consumer Agent committed (✓) or someone else won the rank-1 slot (✗).
        </p>
        <p>
          For the wire format of each event, see <code className="font-mono bg-surface-muted px-1 rounded">PROTOCOL_v0.1.md §4</code>.
        </p>
      </div>
    </div>
  );
}
