'use client'

/**
 * SdkAdminTab — Admin-facing SDK Mode panel for the domain detail dashboard.
 *
 * Shows:
 *  1. Embed snippet (copy-ready)
 *  2. KPI cards (AI Referrals / Schemas Delivered / Page Views)
 *  3. Daily trend chart
 *  4. Top AI Referrers + SKU ranking
 *  5. Empty state guide when no telemetry data yet
 */

import { useState, useEffect } from 'react'
import { Copy, CheckCheck, Code2, Loader2, Bot, BarChart3, Zap } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { ProxyDomain } from '@/lib/api'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface SdkKpis {
  ai_referrals: number
  schemas_delivered: number
  page_views: number
}
interface DailyBucket {
  date: string
  ai_referrals: number
  schemas_delivered: number
  page_views: number
}
interface ReferrerStat { domain: string; count: number }
interface SkuStat { handle: string; referral_count: number }
interface SchemaTypeStat { schema_type: string; delivered: number }
interface SdkInsightsData {
  shop: string
  period: string
  kpis: SdkKpis
  trend: DailyBucket[]
  top_referrers: ReferrerStat[]
  sku_ranking: SkuStat[]
  schema_health: SchemaTypeStat[]
}

type Period = '24h' | '7d' | '30d' | 'all'

interface SdkAdminTabProps {
  domain: ProxyDomain
  userId: string
}

export default function SdkAdminTab({ domain, userId }: SdkAdminTabProps) {
  const [period, setPeriod] = useState<Period>('30d')
  const [data, setData] = useState<SdkInsightsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  const shopId = domain.domain

  // ── Fetch insights ──────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true)
    fetch(
      `${API_BASE}/v1/sdk/insights/admin?shop=${encodeURIComponent(shopId)}&user_id=${encodeURIComponent(userId)}&period=${period}`
    )
      .then(r => (r.ok ? r.json() : null))
      .then(d => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [shopId, userId, period])

  // ── Embed snippet ───────────────────────────────────────────────────────────
  const snippet = `<script
  src="https://alignmenttech.ai/sdk/v1/loader.js"
  data-shop-id="${shopId}"
  data-api-key="[API_TOKEN]"
  data-api-base="https://api.alignmenttech.ai"
  async
></script>`

  const copySnippet = () => {
    navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const hasData = data && (
    data.kpis.ai_referrals > 0 ||
    data.kpis.schemas_delivered > 0 ||
    data.kpis.page_views > 0
  )

  const periods: Period[] = ['24h', '7d', '30d', 'all']
  const periodLabel: Record<Period, string> = {
    '24h': 'Last 24h',
    '7d': 'Last 7 days',
    '30d': 'Last 30 days',
    'all': 'All time',
  }

  return (
    <div className="space-y-5">

      {/* ── Embed Snippet ─────────────────────────────────────────────────── */}
      <div className="bg-surface border border-divider-light rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-ink-3" />
            <h3 className="text-sm font-semibold text-ink-2">Embed Snippet</h3>
          </div>
          <button
            onClick={copySnippet}
            className="flex items-center gap-1.5 text-xs text-ink-3 hover:text-ink-2 transition-colors"
          >
            {copied
              ? <><CheckCheck className="w-3.5 h-3.5 text-green-500" /><span className="text-green-500">Copied</span></>
              : <><Copy className="w-3.5 h-3.5" />Copy</>
            }
          </button>
        </div>
        <pre className="text-xs font-mono bg-canvas rounded-xl p-4 overflow-x-auto text-ink-3 leading-relaxed border border-divider-light">
          {snippet}
        </pre>
        <p className="text-xs text-ink-3 mt-2.5">
          Add to <code className="text-ink-2 bg-canvas px-1 py-0.5 rounded">{'<head>'}</code> of client theme.
          Replace <code className="text-ink-2 bg-canvas px-1 py-0.5 rounded">[API_TOKEN]</code> with the generated token after contract signing.
        </p>
      </div>

      {/* ── Period Selector ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-ink-3" />
        <span className="text-sm font-semibold text-ink-2 mr-2">SDK Analytics</span>
        {periods.map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              period === p
                ? 'bg-ink text-ink-inv'
                : 'bg-surface border border-divider-light text-ink-3 hover:text-ink-2'
            }`}
          >
            {periodLabel[p]}
          </button>
        ))}
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-ink-3" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                label: 'AI REFERRALS',
                value: data?.kpis.ai_referrals ?? 0,
                desc: 'Clicks from AI platforms',
                icon: Bot,
              },
              {
                label: 'SCHEMAS DELIVERED',
                value: data?.kpis.schemas_delivered ?? 0,
                desc: 'SDK schema injections',
                icon: Zap,
              },
              {
                label: 'PAGE VIEWS',
                value: data?.kpis.page_views ?? 0,
                desc: 'Total SDK-tracked views',
                icon: BarChart3,
              },
            ].map(kpi => {
              const Icon = kpi.icon
              return (
                <div key={kpi.label} className="bg-surface border border-divider-light rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-3.5 h-3.5 text-ink-3" />
                    <p className="text-xs font-semibold text-ink-3 tracking-wide">{kpi.label}</p>
                  </div>
                  <p className="text-3xl font-bold text-ink">{kpi.value.toLocaleString()}</p>
                  <p className="text-xs text-ink-3 mt-1">{kpi.desc}</p>
                </div>
              )
            })}
          </div>

          {/* ── Empty State ─────────────────────────────────────────────────── */}
          {!hasData && (
            <div className="bg-surface border border-divider-light rounded-2xl p-6 text-center">
              <Bot className="w-8 h-8 text-ink-3 mx-auto mb-3" />
              <p className="text-sm font-semibold text-ink-2 mb-1">No SDK data yet</p>
              <p className="text-xs text-ink-3 max-w-sm mx-auto">
                Once the client installs the embed snippet and an API token is issued,
                AI referrals, schema deliveries, and page views will appear here.
              </p>
              <div className="mt-4 flex justify-center gap-2 text-xs text-ink-3">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />Awaiting token generation</span>
                <span>·</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />Awaiting first SDK event</span>
              </div>
            </div>
          )}

          {/* ── Trend Chart ─────────────────────────────────────────────────── */}
          {hasData && data!.trend.length > 0 && (
            <div className="bg-surface border border-divider-light rounded-2xl p-5">
              <p className="text-sm font-semibold text-ink-2 mb-4">Traffic Trend</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data!.trend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-divider-light, #f0f0f0)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="ai_referrals" stroke="#16a34a" strokeWidth={2} dot={false} name="AI Referrals" />
                  <Line type="monotone" dataKey="schemas_delivered" stroke="#2563eb" strokeWidth={2} dot={false} name="Schemas" />
                  <Line type="monotone" dataKey="page_views" stroke="#9ca3af" strokeWidth={1.5} dot={false} name="Page Views" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── Top Referrers + SKU Ranking ────────────────────────────────── */}
          {hasData && (
            <div className="grid grid-cols-2 gap-4">
              {/* Top AI Referrers */}
              <div className="bg-surface border border-divider-light rounded-2xl p-5">
                <p className="text-sm font-semibold text-ink-2 mb-3">Top AI Referrers</p>
                {data!.top_referrers.length === 0 ? (
                  <p className="text-xs text-ink-3">No referral data yet.</p>
                ) : (
                  <div className="space-y-2">
                    {data!.top_referrers.slice(0, 8).map(r => (
                      <div key={r.domain} className="flex justify-between items-center text-xs">
                        <span className="text-ink-2 font-medium truncate max-w-[140px]">{r.domain}</span>
                        <span className="text-ink-3 tabular-nums">{r.count.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SKU Ranking */}
              <div className="bg-surface border border-divider-light rounded-2xl p-5">
                <p className="text-sm font-semibold text-ink-2 mb-3">Top Products by AI Referral</p>
                {data!.sku_ranking.length === 0 ? (
                  <p className="text-xs text-ink-3">No product data yet.</p>
                ) : (
                  <div className="space-y-2">
                    {data!.sku_ranking.slice(0, 8).map(s => (
                      <div key={s.handle} className="flex justify-between items-center text-xs">
                        <span className="text-ink-2 font-medium truncate max-w-[140px]">{s.handle}</span>
                        <span className="text-ink-3 tabular-nums">{s.referral_count.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Schema Health ───────────────────────────────────────────────── */}
          {hasData && data!.schema_health.length > 0 && (
            <div className="bg-surface border border-divider-light rounded-2xl p-5">
              <p className="text-sm font-semibold text-ink-2 mb-3">Schema Health</p>
              <div className="grid grid-cols-3 gap-3">
                {data!.schema_health.map(s => (
                  <div key={s.schema_type} className="flex justify-between items-center text-xs bg-canvas rounded-xl px-3 py-2">
                    <span className="text-ink-2">{s.schema_type}</span>
                    <span className="text-ink-3 font-medium tabular-nums">{s.delivered.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
