"use client";

import { useEffect, useState } from "react";

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
const BRAND_COLOR: Record<string, string> = {
  "eco-home": "text-emerald-600", "tech-gear": "text-blue-600", "nutri-plus": "text-orange-600",
};

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

function GMVChart({ series }: { series: DailyPoint[] }) {
  const last14 = series.slice(-14);
  const maxGMV = Math.max(...last14.map((d) => d.gmv), 1);
  return (
    <div className="flex items-end gap-1 h-24">
      {last14.map((d) => (
        <div key={d.date} className="flex-1 relative group">
          <div
            className="absolute bottom-0 w-full bg-yellow-400/70 rounded-t"
            style={{ height: `${Math.round((d.commission / maxGMV) * 96)}px` }}
          />
          <div
            className="w-full bg-purple-500/30 rounded-t"
            style={{ height: `${Math.round((d.gmv / maxGMV) * 96)}px` }}
          />
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-ink text-ink-inv text-xs px-2 py-1 rounded whitespace-nowrap z-10">
            {d.date.slice(5)}: ${fmt(d.gmv, 0)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function RevenuePage() {
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [byBrand, setByBrand] = useState<BrandRow[]>([]);
  const [daily, setDaily] = useState<DailyPoint[]>([]);
  const [recent, setRecent] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(14);

  useEffect(() => {
    setLoading(true);
    fetch(`${AC}/attribution/dashboard?days=${days}`)
      .then((r) => r.json())
      .then((d) => {
        setPlatform(d.platform);
        setByBrand(d.by_brand);
        setDaily(d.daily_series);
        setRecent(d.recent_transactions);
      })
      .finally(() => setLoading(false));
  }, [days]);

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-ink">Revenue</h1>
          <p className="text-ink-2 text-sm mt-1">
            Cleared transactions from Consumer Agents · routed by the Alignment Broker ·
            settled T+7 via Stripe Connect · last {days} days
          </p>
        </div>
        <div className="flex items-center gap-2">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                days === d ? "bg-purple-600 text-white" : "bg-surface-muted text-ink-2 hover:bg-purple-50 border border-divider"
              }`}
            >
              {d}d
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
            {[
              { label: "Cleared GMV",      value: `$${fmt(platform?.total_gmv ?? 0)}`,        sub: "gross merchandise value", color: "text-ink" },
              { label: "Broker commission", value: `$${fmt(platform?.total_commission ?? 0)}`,sub: `avg ${platform?.avg_commission_rate}`, color: "text-yellow-600" },
              { label: "Net to brands",    value: `$${fmt((platform?.total_gmv ?? 0) - (platform?.total_commission ?? 0))}`, sub: "after commission", color: "text-green-600" },
              { label: "Transactions",     value: String(platform?.total_transactions ?? 0),  sub: "Broker-cleared",         color: "text-purple-600" },
            ].map((c) => (
              <div key={c.label} className="bg-surface border border-divider rounded-xl p-4 space-y-1">
                <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
                <div className="text-ink-2 text-xs">{c.label}</div>
                <div className="text-ink-3 text-[10px]">{c.sub}</div>
              </div>
            ))}
          </div>

          {/* ── Per-brand table + GMV chart ────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-2 bg-surface border border-divider rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-divider">
                <h2 className="font-semibold text-ink text-sm">Settlement by Brand Agent</h2>
                <p className="text-ink-3 text-xs mt-0.5">Per-brand revenue · commission · take rate</p>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-ink-3 border-b border-divider bg-surface-muted">
                    <th className="px-5 py-2 text-left font-medium">Brand Agent</th>
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
                    return (
                      <tr
                        key={b.brand_id}
                        className={`border-b border-divider hover:bg-surface-muted transition-colors ${i === 0 ? "bg-yellow-50/40" : ""}`}
                      >
                        <td className="px-5 py-2">
                          <span className={`font-medium ${BRAND_COLOR[b.brand_id] ?? "text-ink"}`}>
                            {b.brand_name}
                          </span>
                          <div className="text-ink-3 text-[10px] mt-0.5">avg ${fmt(b.avg_order_value)}/order</div>
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-ink-2">${fmt(b.total_gmv)}</td>
                        <td className="px-4 py-2 text-right font-mono text-yellow-600">${fmt(b.commission_earned)}</td>
                        <td className="px-4 py-2 text-right font-mono text-green-600 font-medium">${fmt(net)}</td>
                        <td className="px-4 py-2 text-right text-ink-3 font-mono">{b.commission_rate}</td>
                        <td className="px-4 py-2 text-right text-ink-3 font-mono">{b.transactions}</td>
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
            <div className="bg-surface border border-divider rounded-2xl p-5 space-y-4">
              <div>
                <h2 className="font-semibold text-ink text-sm">GMV trend</h2>
                <p className="text-ink-3 text-xs mt-0.5">Last 14 days · hover bars for detail</p>
              </div>
              <GMVChart series={daily} />
              <div className="flex gap-4 text-xs text-ink-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-purple-500/30" /> GMV
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-yellow-400/70" /> Commission
                </div>
              </div>
              <div className="border-t border-divider pt-3 space-y-1 text-xs">
                {daily.slice(-3).reverse().map((d) => (
                  <div key={d.date} className="flex justify-between text-ink-3">
                    <span className="font-mono">{d.date.slice(5)}</span>
                    <span className="font-mono">${fmt(d.gmv, 0)} <span className="text-yellow-600">/ ${fmt(d.commission, 0)}</span></span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Settlement schedule ───────────────────────── */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 text-blue-900 text-xs">
            <div className="flex items-start gap-3">
              <span className="text-lg">💰</span>
              <div className="space-y-1">
                <div className="font-semibold">Settlement schedule</div>
                <p>
                  Commission deducted at commit. Net amount transferred to your linked Stripe Connect
                  account on <strong>T+7 calendar days</strong>. Chargebacks reverse the commission.
                  Configure account in <a href="#" className="underline">Brand Settings → Settlement</a>.
                </p>
              </div>
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
                      <span className={`font-medium text-xs ${BRAND_COLOR[tx.brand_id] ?? "text-ink"}`}>{tx.brand_name}</span>
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
