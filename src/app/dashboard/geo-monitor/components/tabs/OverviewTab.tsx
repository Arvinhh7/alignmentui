'use client'

import { useMemo } from 'react'
import { useUnified } from '../UnifiedContext'
import {
  MetricCard,
  DonutChart,
  UnifiedTrendChart,
  ScanHistoryTrendChart,
  formatPct,
  formatNum,
} from '../shared/ChartComponents'
import { METRIC_COLORS, SUB_TYPE_LABELS, INTENT_FUNNEL, POSITIONING_LABELS } from '../shared/constants'
import {
  Eye,
  BarChart3,
  MessageSquare,
  Link2,
  ThumbsUp,
  Target,
  Loader2,
  Shield,
  Award,
  Activity,
  TrendingUp,
} from 'lucide-react'
import { useLanguage } from '@/lib/LanguageContext'

export function OverviewTab() {
  const ctx = useUnified()
  const { t } = useLanguage()

  // ── Scan-derived KPIs ──────────────────────────────
  const { prominence, sovPct } = useMemo(() => {
    const mentionedResults = ctx.scanResult?.mention_results.filter(m => m.mentioned) ?? []
    const prom = mentionedResults.length > 0
      ? (mentionedResults.reduce((sum, m) => sum + m.position_score, 0) / mentionedResults.length) * 100
      : 0
    return { prominence: prom, sovPct: ctx.scanResult?.share_of_voice?.[ctx.brandConfig.brand_name] ?? 0 }
  }, [ctx.scanResult, ctx.brandConfig.brand_name])

  const competitorRanking = useMemo(() =>
    ctx.scanResult?.competitor_comparison
      ? [...ctx.scanResult.competitor_comparison].sort((a, b) => b.visibility_pct - a.visibility_pct)
      : [],
    [ctx.scanResult]
  )

  // ── Share of Voice donut segments ──────────────────
  const sovSegments = useMemo(() =>
    ctx.scanResult?.share_of_voice
      ? Object.entries(ctx.scanResult.share_of_voice).map(([name, value], i) => ({
          label: name,
          value: Math.round(value * 10) / 10,
          color: name === ctx.brandConfig.brand_name
            ? '#ef4444'
            : ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#14b8a6', '#6366f1', '#ec4899'][i % 7],
        }))
      : [],
    [ctx.scanResult, ctx.brandConfig.brand_name]
  )

  // ── Intent distribution counts ─────────────────────
  const intentCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    if (ctx.scanResult?.mention_results) {
      for (const m of ctx.scanResult.mention_results) {
        const intent = (m as any).intent || 'info_cognition'
        counts[intent] = (counts[intent] || 0) + 1
      }
    }
    if (ctx.scanResult?.intent_distribution) {
      for (const [intent, count] of Object.entries(ctx.scanResult.intent_distribution)) {
        counts[intent] = count
      }
    }
    return counts
  }, [ctx.scanResult])

  // ─── Not configured ────────────────────────────────
  if (!ctx.isConfigured) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Configure your brand</h3>
          <p className="text-sm text-gray-500 mb-6">
            Set up your brand name, domain, and competitors to start monitoring your AI visibility across platforms.
          </p>
          <button
            onClick={() => ctx.setShowConfig(true)}
            className="px-5 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors"
          >
            Get Started
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ═══ A) Scan Progress ═══════════════════════════ */}
      {ctx.isScanning && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <Loader2 className="w-5 h-5 text-red-500 animate-spin" />
            <span className="text-sm font-medium text-gray-700">
              Scanning AI platforms...
            </span>
            <span className="text-xs text-gray-400 ml-auto">
              Step {ctx.scanStep} of {ctx.prompts.filter(p => p.is_active).length || 8}
            </span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-400 to-red-500 rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(
                  (ctx.scanStep / (ctx.prompts.filter(p => p.is_active).length || 8)) * 100,
                  100
                )}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* ═══ B) KPI Cards ═════════════════════════════ */}
      {ctx.scanResult && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-red-500" />
            <h3 className="text-sm font-semibold text-gray-700">Key Metrics</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <MetricCard
              icon={<Eye className="w-5 h-5 text-blue-600" />}
              label="Visibility Score"
              value={formatPct(ctx.scanResult?.visibility_score ?? 0)}
              color={METRIC_COLORS.visibility.color}
              bgColor={METRIC_COLORS.visibility.bgColor}
              trend={ctx.metricTrends ? { delta: ctx.metricTrends.visibilityDelta, label: '%' } : undefined}
            />
            <MetricCard
              icon={<BarChart3 className="w-5 h-5 text-orange-600" />}
              label="Mention Share"
              value={formatPct(sovPct)}
              color={METRIC_COLORS.sov.color}
              bgColor={METRIC_COLORS.sov.bgColor}
              trend={ctx.metricTrends ? { delta: ctx.metricTrends.sovDelta, label: '%' } : undefined}
            />
            <MetricCard
              icon={<MessageSquare className="w-5 h-5 text-green-600" />}
              label="Mentions"
              value={formatNum(ctx.scanResult?.mentions_found ?? 0, 0)}
              subtitle={`out of ${ctx.scanResult?.total_prompts ?? 0} prompts`}
              color={METRIC_COLORS.mentions.color}
              bgColor={METRIC_COLORS.mentions.bgColor}
            />
            <MetricCard
              icon={<Link2 className="w-5 h-5 text-purple-600" />}
              label="Citations"
              value={formatNum(ctx.scanResult?.source_domains?.reduce((s, d) => s + d.url_count, 0) ?? 0, 0)}
              color={METRIC_COLORS.citations.color}
              bgColor={METRIC_COLORS.citations.bgColor}
            />
            <MetricCard
              icon={<ThumbsUp className="w-5 h-5 text-teal-600" />}
              label="Sentiment"
              value={formatPct(ctx.scanResult?.sentiment_breakdown?.positive_pct ?? 0)}
              color={METRIC_COLORS.sentiment.color}
              bgColor={METRIC_COLORS.sentiment.bgColor}
              trend={ctx.metricTrends ? { delta: ctx.metricTrends.positivePctDelta, label: '%' } : undefined}
            />
            <MetricCard
              icon={<TrendingUp className="w-5 h-5 text-red-600" />}
              label="Avg Position"
              value={formatPct(prominence)}
              subtitle="Prominence"
              color={METRIC_COLORS.position.color}
              bgColor={METRIC_COLORS.position.bgColor}
            />
          </div>
        </div>
      )}

      {/* ═══ D) Visibility Trend ════════════════════════ */}
      {(ctx.multiBrandTrends || ctx.scanHistory.length > 0) && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-red-500" />
            Visibility Trend
          </h4>
          {ctx.multiBrandTrends && ctx.scanHistory.length > 0 ? (
            <UnifiedTrendChart
              data={ctx.multiBrandTrends}
              brandName={ctx.brandConfig.brand_name}
              scanHistory={ctx.scanHistory}
            />
          ) : ctx.scanHistory.length > 0 ? (
            <ScanHistoryTrendChart data={ctx.scanHistory} />
          ) : null}
        </div>
      )}

      {/* ═══ E) Brand Ranking Table ════════════════════ */}
      {competitorRanking.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            Brand Ranking
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Rank</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Brand</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Visibility</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Mention Quality</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Positioning</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {competitorRanking.map((comp, idx) => {
                  const posInfo = POSITIONING_LABELS[comp.positioning] ?? POSITIONING_LABELS.unknown
                  const isOwnBrand = comp.name.toLowerCase() === ctx.brandConfig.brand_name.toLowerCase()
                  return (
                    <tr key={idx} className={`hover:bg-gray-50/50 transition-colors ${isOwnBrand ? 'bg-red-50/30' : ''}`}>
                      <td className="px-4 py-3 text-sm font-mono font-bold text-gray-600">#{idx + 1}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">
                        {comp.name}
                        {isOwnBrand && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full font-semibold">You</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono font-medium text-gray-800">{formatPct(comp.visibility_pct)}</td>
                      <td className="px-4 py-3 text-sm text-right font-mono text-gray-600">{formatNum(comp.avg_position_score)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${posInfo.color}`}>
                          {posInfo.icon} {posInfo.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ F) Share of Voice Donut + G) Intent Grid ═ */}
      {ctx.scanResult && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* F) Share of Voice Donut */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-orange-500" />
              Share of Voice
            </h4>
            <DonutChart
              segments={sovSegments}
              centerLabel={`${sovSegments.reduce((s, seg) => s + seg.value, 0).toFixed(0)}%`}
            />
          </div>

          {/* G) Intent Distribution Grid */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-500" />
              Intent Distribution
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(INTENT_FUNNEL).map(([key, funnel]) => {
                const count = intentCounts[key] ?? 0
                return (
                  <div
                    key={key}
                    className={`rounded-xl p-4 ${funnel.bgColor} transition-shadow hover:shadow-sm`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{funnel.icon}</span>
                      <span className={`text-xs font-semibold ${funnel.color}`}>
                        Stage {funnel.stage}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 font-medium capitalize">
                      {key.replace(/_/g, ' ')}
                    </p>
                    <p className={`text-2xl font-bold font-mono mt-1 ${funnel.color}`}>{count}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">mentions</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
