'use client'

import { useMemo } from 'react'
import {
  Eye, BarChart3, MessageSquare, TrendingUp,
  Award, Link2, Loader2, AlertTriangle,
} from 'lucide-react'
import { useUnified } from '../UnifiedContext'
import { IntentFunnel } from './IntentFunnel'
import {
  MetricCard,
  DonutChart,
  EmptyVisibilityTrendChart,
  UnifiedTrendChart,
  ScanHistoryTrendChart,
  formatPct,
  formatNum,
} from '../shared/ChartComponents'
import { METRIC_COLORS } from '../shared/constants'
import { BrandLogo } from '@/components/BrandLogo'
import { guessBrandDomain } from '../shared/brandDomain'

// Sentiment as a 5-bar signal-strength indicator (green positive / red negative /
// grey neutral), driven by avg_sentiment_score in [-1, 1].
function SentimentBars({ score }: { score: number }) {
  const filled = Math.max(1, Math.min(5, Math.round(((score + 1) / 2) * 5)))
  const color = score > 0.05 ? 'var(--sage, #4A7C59)' : score < -0.05 ? 'var(--red-soft, #C0392B)' : 'var(--ink-3, #9b9b97)'
  const label = score > 0.05 ? 'Positive' : score < -0.05 ? 'Negative' : 'Neutral'
  return (
    <span className="inline-flex items-end gap-[2px] h-4 align-middle" title={`${label} (${score.toFixed(2)})`}>
      {[0, 1, 2, 3, 4].map(i => (
        <span
          key={i}
          className="w-[3px] rounded-sm"
          style={{
            height: `${6 + i * 2.5}px`,
            backgroundColor: i < filled ? color : 'var(--surface-warm, #ece8e1)',
          }}
        />
      ))}
    </span>
  )
}

export function VisibilityTab() {
  const ctx = useUnified()

  // ── Scan-derived KPIs ──────────────────────────────
  const { scanVisibility, scanSov, scanMentions, scanProminence, scanCitations } = useMemo(() => {
    const scan = ctx.scanResult
    // Guard: scan may be {} (R2 placeholder row) before the full result is loaded
    if (!scan || !scan.mention_results) return { scanVisibility: 0, scanSov: 0, scanMentions: 0, scanTotalPrompts: 0, scanProminence: 0, scanCitations: 0 }
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
    const colors = ['#000000', '#4A6FA5', '#4A7C59', '#B8860B', '#7B5E96', '#0A0A0A']
    return Object.entries(ctx.scanResult.share_of_voice).map(([name, pct], i) => ({
      label: name,
      value: Math.round(pct * 10) / 10,
      color: name === ctx.brandConfig.brand_name ? '#000000' : colors[(i + 1) % colors.length],
    }))
  }, [ctx.scanResult, ctx.brandConfig.brand_name])

  const hasScanData = !!ctx.scanResult
  const activePromptCount = useMemo(
    () => ctx.prompts.filter(p => p.is_active).length,
    [ctx.prompts],
  )

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
            <span className="text-xs text-ink-3 ml-auto">
              Running {activePromptCount || 'active'} prompt{activePromptCount === 1 ? '' : 's'}
            </span>
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
          <span>Re-running active prompts — results below are from the previous run</span>
        </div>
      )}

      {/* ═══ KPI Cards ════════════════════════════════ */}
      {hasScanData && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <MetricCard
            icon={<Eye className="w-5 h-5 text-ink-2" />}
            label="Visibility Score"
            value={formatPct(scanVisibility)}
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
                ? 'Scan to detect rivals'
                : 'vs auto-discovered brands'
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

      {/* ═══ Visibility Trend Chart (full width) ═══════ */}
      <div className="bg-surface rounded-xl border border-divider p-5">
        <h4 className="text-sm font-semibold text-ink-2 mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-ink-3" />
          Visibility Score Trend
        </h4>
        {ctx.multiBrandTrends && ctx.scanHistory.length > 1 ? (
          <UnifiedTrendChart data={ctx.multiBrandTrends} brandName={ctx.brandConfig.brand_name} scanHistory={ctx.scanHistory} />
        ) : ctx.scanHistory.length > 0 ? (
          <ScanHistoryTrendChart data={ctx.scanHistory} />
        ) : (
          <div>
            <EmptyVisibilityTrendChart label={ctx.isScanning ? 'First scan running' : '0% baseline'} />
            <div className="mt-3 rounded-xl border border-divider-light bg-canvas px-4 py-3">
              <p className="text-[12px] font-semibold text-ink">
                {ctx.isScanning ? 'Building your first Analysis view' : 'No prompt scan has completed yet'}
              </p>
              <p className="mt-1 text-[11px] text-ink-3">
                {ctx.isScanning
                  ? 'The first run usually takes 1-3 minutes. Results will replace this baseline automatically.'
                  : 'Run Prompt once to turn this baseline into real visibility, mention, citation, and competitor data.'}
              </p>
            </div>
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
                  <th className="px-4 py-3 text-xs font-medium text-ink-3 uppercase tracking-wider text-center">Sentiment</th>
                  <th className="px-4 py-3 text-xs font-medium text-ink-3 uppercase tracking-wider text-right">Position</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider-light">
                {competitorRanking.map((comp, idx) => {
                  const isOwnBrand = comp.name.toLowerCase() === ctx.brandConfig.brand_name.toLowerCase()
                  return (
                    <tr key={idx} className={`hover:bg-surface-warm transition-colors ${isOwnBrand ? 'bg-canvas' : ''}`}>
                      <td className="px-4 py-3 text-sm font-mono font-bold text-ink-2">#{idx + 1}</td>
                      <td className="px-4 py-3 text-sm font-medium text-ink">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <BrandLogo domain={comp.domain || guessBrandDomain(comp.name)} name={comp.name} size={22} />
                          <span className="truncate" title={comp.name}>{comp.name}</span>
                          {isOwnBrand && <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 bg-surface-warm text-ink-2 rounded-full font-semibold">You</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono font-medium text-ink">{formatPct(comp.visibility_pct)}</td>
                      <td className="px-4 py-3 text-center"><SentimentBars score={comp.avg_sentiment_score ?? 0} /></td>
                      <td className="px-4 py-3 text-sm text-right font-mono text-ink-2">
                        {comp.avg_ordinal_position != null ? comp.avg_ordinal_position.toFixed(1) : '—'}
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
            <p className="text-xs text-ink-3 mb-4">
              Brand mentions vs the rivals auto-detected in your AI responses
            </p>
            {sovSegments.length > 0 ? (
              <DonutChart segments={sovSegments} centerLabel={`${sovSegments.reduce((s, seg) => s + seg.value, 0).toFixed(0)}%`} />
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <BarChart3 className="w-8 h-8 text-ink-3 mb-3 opacity-40" />
                <p className="text-sm font-medium text-ink-3 mb-1">No rivals detected yet</p>
                <p className="text-xs text-ink-3">Run a scan — competitors are auto-detected from the brands the AI names alongside you</p>
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
