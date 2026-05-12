"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
const AC = `${API_BASE}/api/agentic-commerce`;

type Platform = {
  total_gmv: number; total_commission: number;
  total_transactions: number; period_days: number; avg_commission_rate: string;
};
type BrandRow = {
  brand_id: string; brand_name: string; transactions: number;
  total_gmv: number; commission_earned: number; commission_rate: string; avg_order_value: number;
};
type DailyPoint = { date: string; gmv: number; commission: number; transactions: number };
type Tx = {
  tx_id: string; brand_id: string; brand_name: string; product_name: string;
  consumer_agent_id: string; transaction_amount: number;
  commission_amount: number; commission_rate: number; created_at: string;
};

const BRAND_COLOR: Record<string, string> = {
  "eco-home": "text-emerald-600", "tech-gear": "text-blue-600", "nutri-plus": "text-orange-600",
};
const AGENT_EMOJI: Record<string, string> = {
  claude: "🤖", chatgpt: "💬", perplexity: "🔍", gemini: "✨", "custom-agent": "🔧",
};

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

function MiniGMVChart({ series }: { series: DailyPoint[] }) {
  const last7 = series.slice(-7);
  const maxGMV = Math.max(...last7.map((d) => d.gmv), 1);
  return (
    <div className="flex items-end gap-1 h-12">
      {last7.map((d) => (
        <div key={d.date} className="flex-1 relative group">
          <div className="absolute bottom-0 w-full bg-yellow-400/60 rounded-sm"
            style={{ height: `${Math.round((d.commission / maxGMV) * 48)}px` }} />
          <div className="w-full bg-purple-500/30 rounded-sm"
            style={{ height: `${Math.round((d.gmv / maxGMV) * 48)}px` }} />
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-ink text-ink-inv text-xs px-2 py-1 rounded whitespace-nowrap z-10">
            {d.date.slice(5)}: ${fmt(d.gmv, 0)}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function BillingPage() {
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
        setPlatform(d.platform); setByBrand(d.by_brand);
        setDaily(d.daily_series); setRecent(d.recent_transactions);
      })
      .finally(() => setLoading(false));
  }, [days]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Billing Dashboard</h1>
          <p className="text-ink-2 mt-1">Commission earned from attributed transactions · Last {days} days</p>
        </div>
        <div className="flex items-center gap-2">
          {[7, 14, 30].map((d) => (
            <button key={d} onClick={() => setDays(d)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${days === d ? "bg-purple-600 text-white" : "bg-surface-muted text-ink-2 hover:bg-purple-50 border border-divider"}`}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-ink-3 text-sm animate-pulse">Loading dashboard…</div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total GMV",         value: `$${fmt(platform?.total_gmv ?? 0)}`,         sub: "gross merchandise value",        color: "text-ink" },
              { label: "Commission Earned",  value: `$${fmt(platform?.total_commission ?? 0)}`,  sub: `avg ${platform?.avg_commission_rate}`, color: "text-yellow-600" },
              { label: "Transactions",       value: String(platform?.total_transactions ?? 0),   sub: "attributed via Broker",          color: "text-purple-600" },
              { label: "Brands Active",      value: String(byBrand.length),                      sub: "earning commission",             color: "text-green-600" },
            ].map((c) => (
              <div key={c.label} className="bg-surface border border-divider rounded-xl p-4 space-y-1">
                <div className={`text-xl font-bold ${c.color}`}>{c.value}</div>
                <div className="text-ink-2 text-xs">{c.label}</div>
                <div className="text-ink-3 text-xs">{c.sub}</div>
              </div>
            ))}
          </div>

          {/* Table + chart */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-2 bg-surface border border-divider rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-divider">
                <h2 className="font-semibold text-ink text-sm">Commission by Brand</h2>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-ink-3 border-b border-divider">
                    <th className="px-5 py-3 text-left">Brand</th>
                    <th className="px-4 py-3 text-right">GMV</th>
                    <th className="px-4 py-3 text-right">Commission</th>
                    <th className="px-4 py-3 text-right">Rate</th>
                    <th className="px-4 py-3 text-right">Txns</th>
                  </tr>
                </thead>
                <tbody>
                  {byBrand.map((b, i) => (
                    <tr key={b.brand_id} className={`border-b border-divider hover:bg-surface-muted transition-colors ${i === 0 ? "bg-yellow-50/50" : ""}`}>
                      <td className="px-5 py-3">
                        <Link href={`/dashboard/agentic-commerce/console/${b.brand_id}`}
                          className={`font-medium hover:underline ${BRAND_COLOR[b.brand_id] ?? "text-ink"}`}>
                          {b.brand_name}
                        </Link>
                        <div className="text-ink-3 text-xs mt-0.5">avg ${fmt(b.avg_order_value)}/order</div>
                      </td>
                      <td className="px-4 py-3 text-right text-ink-2">${fmt(b.total_gmv)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-yellow-600">${fmt(b.commission_earned)}</td>
                      <td className="px-4 py-3 text-right text-ink-3">{b.commission_rate}</td>
                      <td className="px-4 py-3 text-right text-ink-3">{b.transactions}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-surface-muted">
                    <td className="px-5 py-3 text-ink-3 font-medium text-xs">TOTAL</td>
                    <td className="px-4 py-3 text-right font-semibold text-ink text-sm">${fmt(platform?.total_gmv ?? 0)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-yellow-600 text-sm">${fmt(platform?.total_commission ?? 0)}</td>
                    <td className="px-4 py-3 text-right text-ink-3">{platform?.avg_commission_rate}</td>
                    <td className="px-4 py-3 text-right font-semibold text-ink text-sm">{platform?.total_transactions}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* GMV chart */}
            <div className="bg-surface border border-divider rounded-2xl p-5 space-y-4">
              <div>
                <h2 className="font-semibold text-ink text-sm">Daily GMV</h2>
                <p className="text-ink-3 text-xs mt-0.5">Last 7 days</p>
              </div>
              <MiniGMVChart series={daily} />
              <div className="flex gap-4 text-xs text-ink-3">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-purple-500/30" /> GMV</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-yellow-400/60" /> Commission</div>
              </div>
              <div className="border-t border-divider pt-3 space-y-1 text-xs text-ink-3">
                {daily.slice(-3).reverse().map((d) => (
                  <div key={d.date} className="flex justify-between">
                    <span>{d.date.slice(5)}</span>
                    <span>${fmt(d.gmv, 0)} / ${fmt(d.commission)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent transactions */}
          <div className="bg-surface border border-divider rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-divider flex items-center justify-between">
              <h2 className="font-semibold text-ink text-sm">Recent Transactions</h2>
              <span className="text-ink-3 text-xs">attributed via Alignment Broker</span>
            </div>
            <div className="divide-y divide-divider">
              {recent.slice(0, 12).map((tx) => (
                <div key={tx.tx_id} className="px-5 py-3 flex items-center gap-4 hover:bg-surface-muted transition-colors">
                  <span className="text-lg shrink-0">{AGENT_EMOJI[tx.consumer_agent_id] ?? "🤖"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-medium text-xs ${BRAND_COLOR[tx.brand_id] ?? "text-ink"}`}>{tx.brand_name}</span>
                      <span className="text-ink-2 text-xs truncate">{tx.product_name}</span>
                    </div>
                    <div className="text-ink-3 text-xs">{tx.consumer_agent_id} · {relTime(tx.created_at)}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-ink-2 text-xs">${fmt(tx.transaction_amount)}</div>
                    <div className="text-yellow-600 text-xs">+${fmt(tx.commission_amount)}</div>
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
