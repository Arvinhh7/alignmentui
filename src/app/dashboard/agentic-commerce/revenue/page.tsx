"use client";

import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import GMVTrendChart from "@/components/GMVTrendChart";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
const AC = `${API_BASE}/api/agentic-commerce`;

// ── Types ─────────────────────────────────────────────────────────────────────
type Platform = {
  total_gmv: number;
  total_commission: number;
  total_transactions: number;
  period_days: number;
  avg_commission_rate: string;
};

type BrandRow = {
  brand_id: string;
  brand_name: string;
  transactions: number;
  total_gmv: number;
  commission_earned: number;
  commission_rate: string;
  avg_order_value: number;
};

type DailyPoint = { date: string; gmv: number; commission: number; transactions: number };

type Tx = {
  tx_id: string;
  brand_id: string;
  brand_name: string;
  product_name: string;
  consumer_agent_id: string;
  transaction_amount: number;
  commission_amount: number;
  commission_rate: number;
  created_at: string;
};

// ── Constants ─────────────────────────────────────────────────────────────────
// Consumer Agent label / emoji map — Outer Ring per concept doc v1.
// Backend emits these keys directly (services/attribution._AGENT_DIST).
const AGENT_EMOJI: Record<string, string> = {
  "whatsapp-bot": "💬", "phone-os-agent": "📱", "voice-shopper": "🎙️",
  "vertical-fashion": "👗", "custom-agent": "🔧",
};
const AGENT_LABEL: Record<string, string> = {
  "whatsapp-bot":     "WhatsApp Shopper",
  "phone-os-agent":   "Phone OS Agent",
  "voice-shopper":    "Voice Assistant",
  "vertical-fashion": "Vertical AI",
  "custom-agent":     "Custom Agent",
};

// ── Inline UI helpers ─────────────────────────────────────────────────────────

/** ⓘ icon with hover popover — used in KPI cards */
function InfoTooltip({ text }: { text: string }) {
  return (
    <div className="group relative inline-flex">
      <span className="text-ink-3 hover:text-ink-2 cursor-help text-[10px] ml-1 select-none">ⓘ</span>
      <div className="hidden group-hover:block absolute bottom-full left-0 mb-2 z-30 w-56
                      bg-ink text-ink-inv text-[10px] rounded-xl p-2.5 shadow-2xl
                      pointer-events-none leading-relaxed">
        {text}
      </div>
    </div>
  )
}

/** Calendar-style GMV heatmap: 7-col grid (Mon–Sun), date numbers, orange-red scale */
function GMVHeatmap({ data }: { data: DailyPoint[] }) {
  const firstIdx = data.findIndex(d => d.gmv > 0)
  const active   = firstIdx >= 0 ? data.slice(firstIdx) : []
  const display  = active.slice(-42)                    // max 6 weeks

  if (display.length === 0) return null

  const maxGMV = Math.max(...display.map(d => d.gmv), 1)

  // Orange → red color scale based on GMV intensity
  function cellStyle(gmv: number): { bg: string; fg: string } {
    if (gmv === 0) return { bg: '#f0ede8', fg: '#c9c3b9' }
    const r = gmv / maxGMV
    if (r < 0.25) return { bg: '#FEE2CC', fg: '#C2410C' }   // light peach
    if (r < 0.5)  return { bg: '#FB923C', fg: '#fff' }       // orange
    if (r < 0.75) return { bg: '#EA4E1B', fg: '#fff' }       // orange-red
    return           { bg: '#B91C1C', fg: '#fff' }            // deep red
  }

  // Align first day to its Monday-first weekday column (0=Mon … 6=Sun)
  const [yr, mo, dy] = display[0].date.split('-').map(Number)
  const startDow = (new Date(yr, mo - 1, dy).getDay() + 6) % 7

  // Build flat cell array; nulls = empty leading / trailing slots
  const leading:  (DailyPoint | null)[] = Array(startDow).fill(null)
  const cells:    (DailyPoint | null)[] = [...leading, ...display]
  const tail = cells.length % 7
  if (tail > 0) cells.push(...(Array(7 - tail).fill(null) as null[]))

  // Chunk into week rows
  const weeks: (DailyPoint | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const LEGEND_COLORS = ['#f0ede8', '#FEE2CC', '#FB923C', '#EA4E1B', '#B91C1C']

  return (
    <div className="border-t border-divider pt-3">
      <div className="text-[10px] text-ink-3 mb-2">Daily GMV · hover for detail</div>

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DOW.map(l => (
          <div key={l} className="text-center text-[9px] text-ink-3 font-medium">{l}</div>
        ))}
      </div>

      {/* Calendar rows */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 gap-1 mb-1">
          {week.map((day, di) =>
            !day ? (
              <div key={`empty-${wi}-${di}`} className="h-9 rounded" style={{ backgroundColor: '#f0ede8' }} />
            ) : (
              <div
                key={day.date}
                className="group relative h-9 rounded flex items-center justify-center cursor-default select-none"
                style={{ backgroundColor: cellStyle(day.gmv).bg }}
              >
                <span className="text-[11px] font-bold leading-none" style={{ color: cellStyle(day.gmv).fg }}>
                  {day.date.slice(8)}{/* DD */}
                </span>
                {/* Hover tooltip */}
                <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1
                                z-50 bg-ink text-ink-inv text-[10px] rounded-lg px-2.5 py-1.5
                                whitespace-nowrap shadow-xl pointer-events-none">
                  <div className="font-mono font-semibold">{day.date.slice(5)}</div>
                  <div>
                    <span className="opacity-70">GMV</span>{' '}
                    <span className="font-semibold">${Math.round(day.gmv).toLocaleString()}</span>
                    {' · '}
                    <span className="text-yellow-400">${Math.round(day.commission).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      ))}

      {/* Legend */}
      <div className="flex items-center gap-1 mt-1.5">
        <span className="text-[9px] text-ink-3">Less</span>
        {LEGEND_COLORS.map(c => (
          <div key={c} className="w-3 h-3 rounded" style={{ backgroundColor: c }} />
        ))}
        <span className="text-[9px] text-ink-3">More</span>
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number, d = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}
function relTime(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function RevenuePage() {
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [byBrand, setByBrand] = useState<BrandRow[]>([]);
  const [daily, setDaily] = useState<DailyPoint[]>([]);
  const [recent, setRecent] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<7 | 30 | 90 | "all">(7);
  const apiDays = period === "all" ? 90 : period;   // backend caps at 90

  useEffect(() => {
    setLoading(true);
    fetch(`${AC}/attribution/dashboard?days=${apiDays}`)
      .then((r) => r.json())
      .then((d) => {
        setPlatform(d.platform);
        setByBrand(d.by_brand);
        setDaily(d.daily_series);
        setRecent(d.recent_transactions);
      })
      .finally(() => setLoading(false));
  }, [apiDays]);

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-ink">Revenue</h1>
          <p className="text-ink-2 text-sm mt-1">
            Cleared transactions from Customer Agents · routed by the Alignment Broker ·
            settled T+7 via Stripe Connect · {period === "all" ? "all available data" : `last ${period} days`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {([7, 30, 90, "all"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                period === p ? "bg-purple-600 text-white" : "bg-surface-muted text-ink-2 hover:bg-purple-50 border border-divider"
              }`}
            >
              {p === "all" ? "All" : `${p}d`}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-ink-3 text-sm animate-pulse py-10 text-center">Loading revenue data…</div>
      ) : (
        <>
          {/* ── KPI strip ─────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(
              [
                { label: "Cleared GMV",      value: `$${fmt(platform?.total_gmv ?? 0)}`,        sub: "gross merchandise value", color: "text-ink" },
                { label: "Broker commission", value: `$${fmt(platform?.total_commission ?? 0)}`, sub: `avg ${platform?.avg_commission_rate}`, color: "text-yellow-600" },
                { label: "Net to brands",    value: `$${fmt((platform?.total_gmv ?? 0) - (platform?.total_commission ?? 0))}`,
                  sub: "after commission", color: "text-green-600",
                  info: "Commission deducted at commit. Net amount transferred to your Stripe Connect account on T+7 calendar days. Chargebacks reverse the commission." },
                { label: "Transactions",     value: String(platform?.total_transactions ?? 0), sub: "Broker-cleared", color: "text-purple-600" },
              ] as { label: string; value: string; sub: string; color: string; info?: string }[]
            ).map((c) => (
              <div key={c.label} className="bg-surface border border-divider rounded-xl p-4 space-y-1">
                <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
                <div className="text-ink-2 text-xs flex items-center">
                  {c.label}
                  {c.info && <InfoTooltip text={c.info} />}
                </div>
                <div className="text-ink-3 text-[10px]">{c.sub}</div>
              </div>
            ))}
          </div>

          {/* ── Per-brand table + GMV chart ────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
            <div className="md:col-span-3 bg-surface border border-divider rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-divider">
                <h2 className="font-semibold text-ink text-sm">Settlement by Product Agent</h2>
                <p className="text-ink-3 text-xs mt-0.5">Per-brand revenue · commission · take rate</p>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-ink-3 border-b border-divider bg-surface-muted">
                    <th className="px-5 py-2 text-left font-medium">Product Agent</th>
                    <th className="px-4 py-2 text-right font-medium">Gross</th>
                    <th className="px-4 py-2 text-right font-medium">Commission</th>
                    <th className="px-4 py-2 text-right font-medium">Net</th>
                    <th className="px-4 py-2 text-right font-medium">Rate</th>
                    <th className="px-4 py-2 text-right font-medium">Txns</th>
                  </tr>
                </thead>
                <tbody>
                  {byBrand.map((b, i) => {
                    const net = b.total_gmv - b.commission_earned;
                    const sharePercent = platform?.total_gmv
                      ? Math.round((b.total_gmv / platform.total_gmv) * 100)
                      : 0;
                    return (
                      <tr
                        key={b.brand_id}
                        className={`border-b border-divider hover:bg-surface-muted transition-colors ${i === 0 ? "bg-yellow-50/40" : ""}`}
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <BrandLogo brandId={b.brand_id} name={b.brand_name} />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-ink">{b.brand_name}</div>
                              <div className="text-ink-3 text-[10px] mt-0.5">avg ${fmt(b.avg_order_value)}/order</div>
                              <div className="mt-1.5 flex items-center gap-2">
                                <div className="h-1 w-20 bg-stone-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-purple-400/60 rounded-full" style={{ width: `${sharePercent}%` }} />
                                </div>
                                <span className="text-[9px] text-ink-3">{sharePercent}% of total</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-ink-2">${fmt(b.total_gmv)}</td>
                        <td className="px-4 py-3 text-right font-mono text-yellow-600">${fmt(b.commission_earned)}</td>
                        <td className="px-4 py-3 text-right font-mono text-green-600 font-medium">${fmt(net)}</td>
                        <td className="px-4 py-3 text-right text-ink-3 font-mono">{b.commission_rate}</td>
                        <td className="px-4 py-3 text-right text-ink-3 font-mono">{b.transactions}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-surface-muted font-semibold">
                    <td className="px-5 py-2 text-ink-3 text-[10px] uppercase tracking-wider">Total</td>
                    <td className="px-4 py-2 text-right text-ink font-mono">${fmt(platform?.total_gmv ?? 0)}</td>
                    <td className="px-4 py-2 text-right text-yellow-600 font-mono">${fmt(platform?.total_commission ?? 0)}</td>
                    <td className="px-4 py-2 text-right text-green-600 font-mono">${fmt((platform?.total_gmv ?? 0) - (platform?.total_commission ?? 0))}</td>
                    <td className="px-4 py-2 text-right text-ink-3 font-mono">{platform?.avg_commission_rate}</td>
                    <td className="px-4 py-2 text-right text-ink font-mono">{platform?.total_transactions}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* GMV chart */}
            <div className="md:col-span-2 bg-surface border border-divider rounded-2xl p-5 space-y-3">
              <div>
                <h2 className="font-semibold text-ink text-sm">GMV trend</h2>
                <p className="text-ink-3 text-xs mt-0.5">
                  {period === "all" ? "All available data" : `Last ${period} days`} · GMV cumulative growth vs Day 1
                </p>
              </div>
              <GMVTrendChart data={daily} height={240} />
              <GMVHeatmap data={daily} />
            </div>
          </div>

          {/* ── Recent transactions ──────────────────────── */}
          <div className="bg-surface border border-divider rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-divider flex items-center justify-between">
              <h2 className="font-semibold text-ink text-sm">Recent commits</h2>
              <span className="text-ink-3 text-xs font-mono">latest first</span>
            </div>
            <div className="divide-y divide-divider">
              {recent.slice(0, 15).map((tx) => (
                <div key={tx.tx_id} className="px-5 py-3 flex items-center gap-4 hover:bg-surface-muted transition-colors">
                  <span className="text-lg shrink-0">{AGENT_EMOJI[tx.consumer_agent_id] ?? "🤖"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <BrandLogo brandId={tx.brand_id} name={tx.brand_name} />
                      <span className="font-medium text-xs text-ink">{tx.brand_name}</span>
                      <span className="text-ink-2 text-xs truncate">{tx.product_name}</span>
                    </div>
                    <div className="text-ink-3 text-[10px] mt-0.5 font-mono">
                      from {AGENT_LABEL[tx.consumer_agent_id] ?? tx.consumer_agent_id} · {relTime(tx.created_at)} · tx_{tx.tx_id.slice(-8)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-ink-2 text-xs">${fmt(tx.transaction_amount)}</div>
                    <div className="font-mono text-yellow-600 text-[10px]">−${fmt(tx.commission_amount)} comm.</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
