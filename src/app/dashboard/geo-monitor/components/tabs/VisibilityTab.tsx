'use client'

import { useMemo } from 'react'
import {
  Eye, BarChart3, MessageSquare, TrendingUp,
  Award, Link2, Loader2, AlertTriangle, Lightbulb, XCircle,
  ShieldAlert, Layers, Gift, ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import { useUnified } from '../UnifiedContext'
import { computeCTM } from './CitationTruthMap'
import { computeIntentFunnel, IntentFunnel } from './IntentFunnel'
import { computeGEOScore, GEOHealthScore } from './GEOHealthScore'
import {
  MetricCard,
  DonutChart,
  UnifiedTrendChart,
  ScanHistoryTrendChart,
  formatPct,
  formatNum,
} from '../shared/ChartComponents'
import { METRIC_COLORS, POSITIONING_LABELS, DASHBOARD_ROUTES } from '../shared/constants'

export function VisibilityTab() {
  const ctx = useUnified()

  // ── Scan-derived KPIs ──────────────────────────────
  const { scanVisibility, scanSov, scanMentions, scanProminence, scanCitations, topEngineLabel } = useMemo(() => {
    const scan = ctx.scanResult
    if (!scan) return { scanVisibility: 0, scanSov: 0, scanMentions: 0, scanTotalPrompts: 0, scanProminence: 0, scanCitations: 0, topEngineLabel: '' }
    const mentioned = scan.mention_results.filter(m => m.mentioned)
    const prom = mentioned.length > 0
      ? (mentioned.reduce((sum, m) => sum + m.position_score, 0) / mentioned.length) * 100
      : 0
    // visibility_score = max(per_engine_visibility) — identify the strongest engine
    const ENGINE_LABELS: Record<string, string> = { chatgpt: 'ChatGPT', gemini: 'Gemini', claude: 'Claude', perplexity: 'Perplexity' }
    let topLabel = ''
    if (scan.per_engine_metrics && scan.per_engine_metrics.length > 0) {
      const top = [...scan.per_engine_metrics].sort((a, b) => b.visibility_score - a.visibility_score)[0]
      if (top && top.visibility_score > 0) topLabel = `in ${ENGINE_LABELS[top.platform] ?? top.platform}`
    }
    return {
      scanVisibility: scan.visibility_score,
      scanSov: scan.share_of_voice?.[scan.brand_name] ?? 0,
      // mentions_found = prompts where brand was actually mentioned (NOT total queries run)
      scanMentions: scan.mentions_found,
      scanTotalPrompts: scan.total_prompts,
      scanProminence: prom,
      scanCitations: scan.source_domains?.reduce((s, d) => s + d.url_count, 0) ?? 0,
      topEngineLabel: topLabel,
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
    const colors = ['#000000', '#4A6FA5', '#4A7C59', '#B8860B', '#7B5E96', '#0A0A0A']
    return Object.entries(ctx.scanResult.share_of_voice).map(([name, pct], i) => ({
      label: name,
      value: Math.round(pct * 10) / 10,
      color: name === ctx.brandConfig.brand_name ? '#000000' : colors[(i + 1) % colors.length],
    }))
  }, [ctx.scanResult, ctx.brandConfig.brand_name])

  const hasScanData = !!ctx.scanResult

  // ── P5: Citation Health — CTM summary for Visibility tab ──
  const ctmRows = useMemo(() => {
    if (!ctx.discoverResult) return null
    return computeCTM(ctx.discoverResult, ctx.scanResult)
  }, [ctx.discoverResult, ctx.scanResult])

  const citationHealth = useMemo(() => {
    if (!ctmRows) return null
    return {
      gap:     ctmRows.filter(r => r.status === 'gap').length,
      defend:  ctmRows.filter(r => r.status === 'defend').length,
      amplify: ctmRows.filter(r => r.status === 'amplify').length,
      bonus:   ctmRows.filter(r => r.status === 'bonus').length,
      topGaps: ctmRows.filter(r => r.status === 'gap').slice(0, 3),
    }
  }, [ctmRows])

  // ── P6: Intent Funnel stages ───────────────────────
  const intentStages = useMemo(() => {
    if (!ctx.scanResult) return []
    return computeIntentFunnel(ctx.prompts, ctx.scanResult)
  }, [ctx.prompts, ctx.scanResult])

  // ── P7: GEO Health Score ───────────────────────────
  const geoScoreBreakdown = useMemo(() => {
    if (!ctx.scanResult) return null
    const prevVisibility = ctx.scanHistory.length >= 2
      ? ctx.scanHistory[ctx.scanHistory.length - 2]?.visibility_score ?? null
      : null
    return computeGEOScore(ctx.scanResult, ctx.prompts, ctmRows, intentStages, prevVisibility)
  }, [ctx.scanResult, ctx.prompts, ctmRows, intentStages, ctx.scanHistory])

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
          <div className="w-16 h-16 bg-surface-warm rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Eye className="w-8 h-8 text-ink-3" />
          </div>
          <h3 className="text-lg font-semibold text-ink mb-2">Configure your brand</h3>
          <p className="text-sm text-ink-3 mb-6">Set up your brand to start monitoring AI visibility across platforms.</p>
          <button onClick={() => ctx.setShowConfig(true)} className="px-5 py-2.5 bg-ink hover:bg-[#2d2d2c] text-ink-inv rounded-xl text-sm font-medium transition-colors">
            Get Started
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Level 3: Stale data warning ────────────────── */}
      {ctx.scanResult && ctx.scanResult.brand_name?.toLowerCase() !== ctx.brandConfig.brand_name.toLowerCase() && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-caution-bg border border-caution/30 text-caution text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>Showing cached data for <strong>{ctx.scanResult.brand_name}</strong> — click <strong>Scan</strong> to refresh for <strong>{ctx.brandConfig.brand_name}</strong>.</span>
        </div>
      )}
      {/* ═══ Scan Progress ════════════════════════════ */}
      {ctx.isScanning && !hasScanData && (
        <div className="bg-surface rounded-xl border border-divider p-5">
          <div className="flex items-center gap-3 mb-3">
            <Loader2 className="w-5 h-5 text-ink animate-spin" />
            <span className="text-sm font-medium text-ink-2">Scanning AI platforms...</span>
            <span className="text-xs text-ink-3 ml-auto">Running across 4 engines</span>
          </div>
          <div className="w-full h-2 bg-surface-warm rounded-full overflow-hidden">
            <div className="h-full bg-ink rounded-full transition-all duration-700 animate-pulse" style={{ width: '60%' }} />
          </div>
        </div>
      )}
      {/* Compact re-scan banner when old data is visible */}
      {ctx.isScanning && hasScanData && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface border border-divider text-sm text-ink-2">
          <Loader2 className="w-3.5 h-3.5 text-ink animate-spin flex-shrink-0" />
          <span>Re-scanning across 4 AI engines — results below are from the previous run</span>
        </div>
      )}

      {/* ═══ KPI Cards ════════════════════════════════ */}
      {hasScanData && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <MetricCard
            icon={<Eye className="w-5 h-5 text-ink-2" />}
            label="Visibility Score"
            value={formatPct(scanVisibility)}
            subtitle={topEngineLabel || undefined}
            color={METRIC_COLORS.visibility.color}
            bgColor={METRIC_COLORS.visibility.bgColor}
            trend={ctx.metricTrends ? { delta: ctx.metricTrends.visibilityDelta, label: '%' } : undefined}
          />
          <MetricCard
            icon={<BarChart3 className="w-5 h-5 text-caution" />}
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
            icon={<MessageSquare className="w-5 h-5 text-sage" />}
            label="Brand Mentions"
            value={formatNum(scanMentions, 0)}
            subtitle={ctx.scanResult ? `out of ${ctx.scanResult.total_prompts} prompts` : undefined}
            color={METRIC_COLORS.mentions.color}
            bgColor={METRIC_COLORS.mentions.bgColor}
          />
          <MetricCard
            icon={<Link2 className="w-5 h-5 text-ink-2" />}
            label="AI-Mentioned URLs"
            subtitle="URLs cited in AI responses"
            value={formatNum(scanCitations, 0)}
            color={METRIC_COLORS.citations.color}
            bgColor={METRIC_COLORS.citations.bgColor}
          />
          <MetricCard
            icon={<TrendingUp className="w-5 h-5 text-red-soft" />}
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

      {/* ═══ Per-Engine Visibility Breakdown ═══════════ */}
      {hasScanData && ctx.scanResult!.per_engine_metrics && ctx.scanResult!.per_engine_metrics.length > 0 && (
        <EngineBreakdown
          engines={ctx.scanResult!.per_engine_metrics}
          isScanning={ctx.isScanning}
        />
      )}

      {/* ═══ P7: GEO Health Score ═══════════════════════ */}
      {geoScoreBreakdown && !ctx.isScanning && (
        <GEOHealthScore breakdown={geoScoreBreakdown} />
      )}

      {/* ═══ P5: Citation Health Summary ════════════════ */}
      {ctx.discoverResult && !ctx.isScanning && (
        <div className="bg-surface rounded-xl border border-divider p-5">
          <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
            <div>
              <h4 className="text-sm font-semibold text-ink">Citation Health</h4>
              <p className="text-xs text-ink-3 mt-0.5">
                {hasScanData
                  ? 'Core source coverage: how many Discover sources appear in your brand scans.'
                  : 'Run a scan to compare against Discover sources.'}
              </p>
            </div>
            <Link
              href="/dashboard/geo-monitor?tab=discover"
              className="flex items-center gap-1 text-xs font-medium text-ink-2 hover:text-ink transition-colors flex-shrink-0"
            >
              View Citation Truth Map
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Stat chips */}
          {citationHealth ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {[
                { icon: <XCircle className="w-4 h-4 text-red-soft" />,     label: 'Gaps',       value: citationHealth.gap,     bg: 'bg-red-soft-bg',    text: 'text-red-soft'  },
                { icon: <ShieldAlert className="w-4 h-4 text-caution" />,  label: 'Threats',    value: citationHealth.defend,  bg: 'bg-caution-bg',     text: 'text-caution'   },
                { icon: <Layers className="w-4 h-4 text-sage" />,          label: 'Amplifying', value: citationHealth.amplify, bg: 'bg-sage-bg',        text: 'text-sage'      },
                { icon: <Gift className="w-4 h-4 text-ink-2" />,           label: 'Bonus',      value: citationHealth.bonus,   bg: 'bg-surface-warm',   text: 'text-ink-2'    },
              ].map(({ icon, label, value, bg, text }) => (
                <div key={label} className={`${bg} rounded-xl p-3 flex items-center gap-2.5`}>
                  {icon}
                  <div>
                    <p className={`text-xl font-bold font-mono leading-none ${text}`}>{value}</p>
                    <p className="text-[10px] text-ink-3 mt-0.5">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {['Gaps', 'Threats', 'Amplifying', 'Bonus'].map(label => (
                <div key={label} className="bg-surface-warm rounded-xl p-3 flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-divider" />
                  <div>
                    <p className="text-xl font-bold font-mono leading-none text-ink-3">—</p>
                    <p className="text-[10px] text-ink-3 mt-0.5">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Top 3 Gap domains */}
          {citationHealth && citationHealth.topGaps.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-ink-3 uppercase tracking-wide mb-2">Top Priority Gaps</p>
              <div className="space-y-1.5">
                {citationHealth.topGaps.map(row => (
                  <div key={row.domain} className="flex items-center justify-between gap-2 px-3 py-2 bg-red-soft-bg rounded-lg">
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={`https://www.google.com/s2/favicons?domain=${row.domain}&sz=32`}
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                        className="w-3.5 h-3.5 flex-shrink-0 rounded-sm"
                        alt=""
                      />
                      <span className="text-xs font-medium text-ink truncate">{row.domain}</span>
                      <span className="text-[10px] text-ink-3 flex-shrink-0">
                        {row.discover_weight} prompts
                      </span>
                    </div>
                    <Link
                      href={DASHBOARD_ROUTES.distribute}
                      className="flex items-center gap-0.5 text-[11px] font-semibold text-red-soft hover:text-red-soft/80 transition-colors flex-shrink-0"
                    >
                      Pitch <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ Zero-Visibility Diagnostic Banner ═════════ */}
      {zeroDiagnostic && !ctx.isScanning && (
        <div className={`rounded-xl border p-4 flex items-start gap-3 ${
          zeroDiagnostic.type === 'api_error'
            ? 'bg-red-soft-bg border-red-soft/30'
            : zeroDiagnostic.type === 'no_brand_prompts'
              ? 'bg-caution-bg border-caution/30'
              : 'bg-surface-warm border-divider'
        }`}>
          {zeroDiagnostic.type === 'api_error' ? (
            <XCircle className="w-5 h-5 text-red-soft flex-shrink-0 mt-0.5" />
          ) : zeroDiagnostic.type === 'no_brand_prompts' ? (
            <Lightbulb className="w-5 h-5 text-caution flex-shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-ink-2 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold mb-1 ${
              zeroDiagnostic.type === 'api_error' ? 'text-red-soft'
                : zeroDiagnostic.type === 'no_brand_prompts' ? 'text-caution'
                : 'text-ink-2'
            }`}>
              {zeroDiagnostic.message}
            </p>
            <p className={`text-xs leading-relaxed ${
              zeroDiagnostic.type === 'api_error' ? 'text-red-soft'
                : zeroDiagnostic.type === 'no_brand_prompts' ? 'text-caution'
                : 'text-ink-2'
            }`}>
              {zeroDiagnostic.detail}
            </p>
            {zeroDiagnostic.type === 'no_brand_prompts' && (
              <div className="mt-2 text-xs text-caution bg-caution-bg rounded-lg px-3 py-2 font-mono">
                Add prompts like: <strong>&ldquo;What is {'{brand}'}?&rdquo;</strong> or <strong>&ldquo;Tell me about {'{brand}'}&apos;s features&rdquo;</strong>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ Visibility Trend Chart (full width) ═══════ */}
      <div className="bg-surface rounded-xl border border-divider p-5">
        <h4 className="text-sm font-semibold text-ink-2 mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-ink-3" />
          Visibility Score Trend
        </h4>
        {ctx.multiBrandTrends && ctx.scanHistory.length > 0 ? (
          <UnifiedTrendChart data={ctx.multiBrandTrends} brandName={ctx.brandConfig.brand_name} scanHistory={ctx.scanHistory} />
        ) : ctx.scanHistory.length > 0 ? (
          <ScanHistoryTrendChart data={ctx.scanHistory} />
        ) : (
          <div className="flex items-center justify-center py-10 text-ink-3 text-sm">
            Run your first scan to see visibility trends
          </div>
        )}
      </div>

      {/* ═══ Brand Ranking Table ═══════════════════════ */}
      {competitorRanking.length > 0 && (
        <div className="bg-surface rounded-xl border border-divider p-5">
          <h4 className="text-sm font-semibold text-ink-2 mb-4 flex items-center gap-2">
            <Award className="w-4 h-4 text-caution" />
            Brand Ranking
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-canvas">
                  <th className="px-4 py-3 text-xs font-medium text-ink-3 uppercase tracking-wider text-left">Rank</th>
                  <th className="px-4 py-3 text-xs font-medium text-ink-3 uppercase tracking-wider text-left">Brand</th>
                  <th className="px-4 py-3 text-xs font-medium text-ink-3 uppercase tracking-wider text-right">Visibility</th>
                  <th className="px-4 py-3 text-xs font-medium text-ink-3 uppercase tracking-wider text-right">Mention Quality</th>
                  <th className="px-4 py-3 text-xs font-medium text-ink-3 uppercase tracking-wider text-right">Positioning</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider-light">
                {competitorRanking.map((comp, idx) => {
                  const posInfo = POSITIONING_LABELS[comp.positioning] ?? POSITIONING_LABELS.unknown
                  const isOwnBrand = comp.name.toLowerCase() === ctx.brandConfig.brand_name.toLowerCase()
                  return (
                    <tr key={idx} className={`hover:bg-surface-warm transition-colors ${isOwnBrand ? 'bg-canvas' : ''}`}>
                      <td className="px-4 py-3 text-sm font-mono font-bold text-ink-2">#{idx + 1}</td>
                      <td className="px-4 py-3 text-sm font-medium text-ink">
                        {comp.name}
                        {isOwnBrand && <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-surface-warm text-ink-2 rounded-full font-semibold">You</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono font-medium text-ink">{formatPct(comp.visibility_pct)}</td>
                      <td className="px-4 py-3 text-sm text-right font-mono text-ink-2">{formatNum(comp.avg_position_score)}</td>
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

      {/* ═══ SoV + Intent Funnel ═══════════════════════ */}
      {hasScanData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Mention Share Donut */}
          <div className="bg-surface rounded-xl border border-divider p-5">
            <h4 className="text-sm font-semibold text-ink-2 mb-1 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-caution" />
              Mention Share
            </h4>
            <p className="text-xs text-ink-3 mb-4">Brand mentions vs listed competitors across all AI responses</p>
            {sovSegments.length > 0 ? (
              <DonutChart segments={sovSegments} centerLabel={`${sovSegments.reduce((s, seg) => s + seg.value, 0).toFixed(0)}%`} />
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <BarChart3 className="w-8 h-8 text-ink-3 mb-3 opacity-40" />
                <p className="text-sm font-medium text-ink-3 mb-1">No competitors configured</p>
                <p className="text-xs text-ink-3">Add competitors in brand settings to see Mention Share vs. competitors</p>
              </div>
            )}
          </div>

          {/* P6: Intent Funnel */}
          <IntentFunnel prompts={ctx.prompts} scanResult={ctx.scanResult!} />
        </div>
      )}

      {/* Empty state */}
      {!hasScanData && !ctx.isScanning && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-surface-warm rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Eye className="w-8 h-8 text-ink-3" />
          </div>
          <h3 className="text-base font-semibold text-ink-2 mb-2">No visibility data yet</h3>
          <p className="text-sm text-ink-3">Run a scan to see how AI platforms mention your brand.</p>
        </div>
      )}
    </div>
  )
}

// ─── Per-Engine Visibility Breakdown ─────────────────────────────────────────

const ENGINE_META: Record<string, { label: string; color: string; bar: string; logo: string }> = {
  chatgpt:    { label: 'ChatGPT',    color: 'text-[#10a37f]', bar: 'bg-[#10a37f]', logo: 'https://www.google.com/s2/favicons?domain=chatgpt.com&sz=32' },
  gemini:     { label: 'Gemini',     color: 'text-blue-600',  bar: 'bg-blue-500',  logo: 'https://www.google.com/s2/favicons?domain=gemini.google.com&sz=32' },
  claude:     { label: 'Claude',     color: 'text-amber-700', bar: 'bg-amber-500', logo: 'https://www.google.com/s2/favicons?domain=claude.ai&sz=32' },
  perplexity: { label: 'Perplexity', color: 'text-purple-600',bar: 'bg-purple-500',logo: 'https://www.google.com/s2/favicons?domain=perplexity.ai&sz=32' },
}

interface EngineBreakdownProps {
  engines: { platform: string; visibility_score: number; mentions_found: number; total_prompts: number }[]
  isScanning: boolean
}

function EngineBreakdown({ engines, isScanning }: EngineBreakdownProps) {
  // Sort: chatgpt → gemini → claude → perplexity
  const order = ['chatgpt', 'gemini', 'claude', 'perplexity']
  const sorted = [...engines].sort((a, b) => order.indexOf(a.platform) - order.indexOf(b.platform))

  // Engine Coverage: how many engines have at least one brand mention
  const totalEngines = sorted.length
  const coveredEngines = sorted.filter(em => em.mentions_found > 0).length
  const coveragePct = totalEngines > 0 ? Math.round((coveredEngines / totalEngines) * 100) : 0

  return (
    <div className="bg-surface rounded-xl border border-divider p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-semibold text-ink">Per-Engine Visibility</h4>
          <p className="text-xs text-ink-3 mt-0.5">Brand visibility per AI engine</p>
        </div>
        {isScanning && <span className="text-[10px] px-2 py-0.5 rounded bg-surface-warm text-ink-3 font-mono">cached</span>}
      </div>

      {/* Engine Coverage stat */}
      <div className="flex items-center justify-between px-3 py-2.5 mb-4 bg-canvas rounded-lg border border-divider-light">
        <div>
          <p className="text-xs font-semibold text-ink">Engine Coverage</p>
          <p className="text-[10px] text-ink-3 mt-0.5">Engines that mention your brand at least once</p>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-base font-bold font-mono text-ink">{coveredEngines}</span>
          <span className="text-xs text-ink-3 font-mono">of {totalEngines}</span>
          <span className="text-xs text-ink-3 font-mono ml-1">({coveragePct}%)</span>
        </div>
      </div>

      <div className="space-y-3.5">
        {sorted.map(em => {
          const meta = ENGINE_META[em.platform] ?? { label: em.platform, color: 'text-ink-2', bar: 'bg-ink-2' }
          const pct = Math.min(em.visibility_score, 100)

          return (
            <div key={em.platform}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <img
                    src={meta.logo}
                    alt={meta.label}
                    className="w-4 h-4 rounded-sm flex-shrink-0"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                  <span className={`text-xs font-semibold ${meta.color}`}>{meta.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-ink-3 font-mono">
                    {em.mentions_found}/{em.total_prompts} prompts
                  </span>
                  <span className="text-xs font-semibold font-mono text-ink w-10 text-right">
                    {pct.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="w-full h-1.5 bg-surface-warm rounded-full overflow-hidden">
                <div
                  className={`h-full ${meta.bar} rounded-full transition-all duration-700`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
