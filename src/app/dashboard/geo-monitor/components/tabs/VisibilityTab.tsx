'use client'

import { useMemo } from 'react'
import {
  Eye, BarChart3, MessageSquare, Target, TrendingUp,
  Award, Link2, Loader2, AlertTriangle, Lightbulb, XCircle,
} from 'lucide-react'
import { useUnified } from '../UnifiedContext'
import {
  MetricCard,
  DonutChart,
  UnifiedTrendChart,
  ScanHistoryTrendChart,
  formatPct,
  formatNum,
} from '../shared/ChartComponents'
import { METRIC_COLORS, INTENT_FUNNEL, POSITIONING_LABELS } from '../shared/constants'

export function VisibilityTab() {
  const ctx = useUnified()

  // ── Scan-derived KPIs ──────────────────────────────
  const { scanVisibility, scanSov, scanMentions, scanProminence, scanCitations } = useMemo(() => {
    const scan = ctx.scanResult
    if (!scan) return { scanVisibility: 0, scanSov: 0, scanMentions: 0, scanTotalPrompts: 0, scanProminence: 0, scanCitations: 0 }
    const mentioned = scan.mention_results.filter(m => m.mentioned)
    const prom = mentioned.length > 0
      ? (mentioned.reduce((sum, m) => sum + m.position_score, 0) / mentioned.length) * 100
      : 0
    return {
      scanVisibility: scan.visibility_score,
      scanSov: scan.share_of_voice?.[scan.brand_name] ?? 0,
      // mentions_found = prompts where brand was actually mentioned (NOT total queries run)
      scanMentions: scan.mentions_found,
      scanTotalPrompts: scan.total_prompts,
      scanProminence: prom,
      scanCitations: scan.source_domains?.reduce((s, d) => s + d.url_count, 0) ?? 0,
    }
  }, [ctx.scanResult])

  // ── Competitor ranking from scan ────────────────────
  const competitorRanking = useMemo(() =>
    ctx.scanResult?.competitor_comparison
      ? [...ctx.scanResult.competitor_comparison].sort((a, b) => b.visibility_pct - a.visibility_pct)
      : [],
    [ctx.scanResult]
  )

  // ── SoV donut segments ─────────────────────────────
  const sovSegments = useMemo(() => {
    if (!ctx.scanResult?.share_of_voice) return []
    const colors = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#6366f1']
    return Object.entries(ctx.scanResult.share_of_voice).map(([name, pct], i) => ({
      label: name,
      value: Math.round(pct * 10) / 10,
      color: name === ctx.brandConfig.brand_name ? '#ef4444' : colors[(i + 1) % colors.length],
    }))
  }, [ctx.scanResult, ctx.brandConfig.brand_name])

  // ── Intent distribution ────────────────────────────
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

  const hasScanData = !!ctx.scanResult

  // ── Diagnostic: detect zero visibility causes ─────────
  const zeroDiagnostic = useMemo(() => {
    const scan = ctx.scanResult
    if (!scan || scan.visibility_score > 0) return null

    // Check if any prompts errored — catches both [Error:platform] and legacy [Error] formats
    const isErrorResponse = (text?: string | null) =>
      text?.startsWith('[Error') === true
    const errorResults = scan.mention_results.filter(m => isErrorResponse(m.response_text))
    if (errorResults.length > 0) {
      const firstErr = errorResults[0]?.response_text ?? ''
      const isQuota = firstErr.includes('insufficient_quota') || firstErr.includes('exceeded your current quota')
      return {
        type: 'api_error' as const,
        message: isQuota
          ? `OpenAI API quota exceeded — all ${errorResults.length} scans failed. Please top up your OpenAI account credits.`
          : `${errorResults.length} of ${scan.total_prompts} scans returned API errors. Check your API key configuration.`,
        detail: isQuota
          ? 'Go to platform.openai.com → Billing → Add credits, then re-run the scan.'
          : firstErr.slice(0, 120),
      }
    }

    // Check if no prompts have {brand} placeholder
    const hasBrandPrompts = ctx.prompts.some(p => p.template?.includes('{brand}'))
    if (!hasBrandPrompts && scan.mentions_found === 0) {
      return {
        type: 'no_brand_prompts' as const,
        message: `0 of ${scan.total_prompts} prompts mentioned "${ctx.brandConfig.brand_name}"`,
        detail: 'All your prompts are generic discovery queries. AI models won\'t mention your brand unless it\'s widely known. Add at least one prompt that directly references your brand.',
      }
    }

    return {
      type: 'brand_not_mentioned' as const,
      message: `0 of ${scan.total_prompts} prompts resulted in a brand mention`,
      detail: `"${ctx.brandConfig.brand_name}" was not found in any AI responses. Your brand may not yet be indexed by AI models for these query types.`,
    }
  }, [ctx.scanResult, ctx.prompts, ctx.brandConfig.brand_name])

  // ── Not configured ─────────────────────────────────
  if (!ctx.isConfigured) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Eye className="w-8 h-8 text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Configure your brand</h3>
          <p className="text-sm text-gray-500 mb-6">Set up your brand to start monitoring AI visibility across platforms.</p>
          <button onClick={() => ctx.setShowConfig(true)} className="px-5 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors">
            Get Started
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ═══ Scan Progress ════════════════════════════ */}
      {ctx.isScanning && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <Loader2 className="w-5 h-5 text-red-500 animate-spin" />
            <span className="text-sm font-medium text-gray-700">Scanning AI platforms...</span>
            <span className="text-xs text-gray-400 ml-auto">Step {ctx.scanStep} of {ctx.prompts.filter(p => p.is_active).length || 8}</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-red-400 to-red-500 rounded-full transition-all duration-700"
              style={{ width: `${Math.min((ctx.scanStep / (ctx.prompts.filter(p => p.is_active).length || 8)) * 100, 100)}%` }} />
          </div>
        </div>
      )}

      {/* ═══ KPI Cards ════════════════════════════════ */}
      {hasScanData && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <MetricCard
            icon={<Eye className="w-5 h-5 text-blue-600" />}
            label="Visibility Score"
            value={formatPct(scanVisibility)}
            color={METRIC_COLORS.visibility.color}
            bgColor={METRIC_COLORS.visibility.bgColor}
            trend={ctx.metricTrends ? { delta: ctx.metricTrends.visibilityDelta, label: '%' } : undefined}
          />
          <MetricCard
            icon={<BarChart3 className="w-5 h-5 text-orange-600" />}
            label="Mention Share"
            value={
              (ctx.scanResult?.share_of_voice && Object.keys(ctx.scanResult.share_of_voice).length > 0)
                ? formatPct(scanSov)
                : '—'
            }
            subtitle={
              (!ctx.scanResult?.share_of_voice || Object.keys(ctx.scanResult.share_of_voice ?? {}).length === 0)
                ? 'Add competitors to enable'
                : 'vs listed competitors'
            }
            color={METRIC_COLORS.sov.color}
            bgColor={METRIC_COLORS.sov.bgColor}
            trend={ctx.metricTrends ? { delta: ctx.metricTrends.sovDelta, label: '%' } : undefined}
          />
          <MetricCard
            icon={<MessageSquare className="w-5 h-5 text-green-600" />}
            label="Brand Mentions"
            value={formatNum(scanMentions, 0)}
            subtitle={ctx.scanResult ? `out of ${ctx.scanResult.total_prompts} prompts` : undefined}
            color={METRIC_COLORS.mentions.color}
            bgColor={METRIC_COLORS.mentions.bgColor}
          />
          <MetricCard
            icon={<Link2 className="w-5 h-5 text-purple-600" />}
            label="AI-Mentioned URLs"
            subtitle="URLs cited in AI responses"
            value={formatNum(scanCitations, 0)}
            color={METRIC_COLORS.citations.color}
            bgColor={METRIC_COLORS.citations.bgColor}
          />
          <MetricCard
            icon={<TrendingUp className="w-5 h-5 text-red-600" />}
            label={ctx.scanResult?.avg_ordinal_rank != null ? 'Avg List Rank' : 'Avg Position'}
            value={
              ctx.scanResult?.avg_ordinal_rank != null
                ? `#${ctx.scanResult.avg_ordinal_rank}`
                : formatPct(scanProminence)
            }
            subtitle={ctx.scanResult?.avg_ordinal_rank != null ? 'Ordinal rank in AI lists' : 'Prominence'}
            color={METRIC_COLORS.position.color}
            bgColor={METRIC_COLORS.position.bgColor}
          />
        </div>
      )}

      {/* ═══ Zero-Visibility Diagnostic Banner ═════════ */}
      {zeroDiagnostic && !ctx.isScanning && (
        <div className={`rounded-xl border p-4 flex items-start gap-3 ${
          zeroDiagnostic.type === 'api_error'
            ? 'bg-red-50 border-red-200'
            : zeroDiagnostic.type === 'no_brand_prompts'
              ? 'bg-amber-50 border-amber-200'
              : 'bg-blue-50 border-blue-200'
        }`}>
          {zeroDiagnostic.type === 'api_error' ? (
            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          ) : zeroDiagnostic.type === 'no_brand_prompts' ? (
            <Lightbulb className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold mb-1 ${
              zeroDiagnostic.type === 'api_error' ? 'text-red-700'
                : zeroDiagnostic.type === 'no_brand_prompts' ? 'text-amber-700'
                : 'text-blue-700'
            }`}>
              {zeroDiagnostic.message}
            </p>
            <p className={`text-xs leading-relaxed ${
              zeroDiagnostic.type === 'api_error' ? 'text-red-600'
                : zeroDiagnostic.type === 'no_brand_prompts' ? 'text-amber-600'
                : 'text-blue-600'
            }`}>
              {zeroDiagnostic.detail}
            </p>
            {zeroDiagnostic.type === 'no_brand_prompts' && (
              <div className="mt-2 text-xs text-amber-700 bg-amber-100 rounded-lg px-3 py-2 font-mono">
                Add prompts like: <strong>&ldquo;What is {'{brand}'}?&rdquo;</strong> or <strong>&ldquo;Tell me about {'{brand}'}&apos;s features&rdquo;</strong>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ Visibility Trend Chart (full width) ═══════ */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-500" />
          Visibility Score Trend
        </h4>
        {ctx.multiBrandTrends && ctx.scanHistory.length > 0 ? (
          <UnifiedTrendChart data={ctx.multiBrandTrends} brandName={ctx.brandConfig.brand_name} scanHistory={ctx.scanHistory} />
        ) : ctx.scanHistory.length > 0 ? (
          <ScanHistoryTrendChart data={ctx.scanHistory} />
        ) : (
          <div className="flex items-center justify-center py-10 text-gray-400 text-sm">
            Run your first scan to see visibility trends
          </div>
        )}
      </div>

      {/* ═══ Brand Ranking Table ═══════════════════════ */}
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
                    <tr key={idx} className={`hover:bg-gray-50/50 transition-colors ${isOwnBrand ? 'bg-blue-50/30' : ''}`}>
                      <td className="px-4 py-3 text-sm font-mono font-bold text-gray-600">#{idx + 1}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">
                        {comp.name}
                        {isOwnBrand && <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded-full font-semibold">You</span>}
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

      {/* ═══ SoV + Intent Grid ════════════════════════ */}
      {hasScanData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Mention Share Donut (only when competitors are configured) */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h4 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-orange-500" />
              Mention Share
            </h4>
            <p className="text-xs text-gray-400 mb-4">Brand mentions vs listed competitors across all AI responses</p>
            {sovSegments.length > 0 ? (
              <DonutChart segments={sovSegments} centerLabel={`${sovSegments.reduce((s, seg) => s + seg.value, 0).toFixed(0)}%`} />
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <BarChart3 className="w-8 h-8 text-gray-200 mb-3" />
                <p className="text-sm font-medium text-gray-500 mb-1">No competitors configured</p>
                <p className="text-xs text-gray-400">Add competitors in brand settings to see Mention Share vs. competitors</p>
              </div>
            )}
          </div>

          {/* Intent Distribution */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-500" />
              Intent Distribution
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(INTENT_FUNNEL).map(([key, funnel]) => {
                const count = intentCounts[key] ?? 0
                return (
                  <div key={key} className={`rounded-xl p-4 ${funnel.bgColor} transition-shadow hover:shadow-sm`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{funnel.icon}</span>
                      <span className={`text-xs font-semibold ${funnel.color}`}>Stage {funnel.stage}</span>
                    </div>
                    <p className="text-xs text-gray-600 font-medium capitalize">{key.replace(/_/g, ' ')}</p>
                    <p className={`text-2xl font-bold font-mono mt-1 ${funnel.color}`}>{count}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">mentions</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!hasScanData && !ctx.isScanning && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Eye className="w-8 h-8 text-blue-300" />
          </div>
          <h3 className="text-base font-semibold text-gray-700 mb-2">No visibility data yet</h3>
          <p className="text-sm text-gray-400">Run a scan to see how AI platforms mention your brand.</p>
        </div>
      )}
    </div>
  )
}
