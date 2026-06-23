'use client'

import { useMemo } from 'react'
import { ThumbsUp, ThumbsDown, Minus, Tag, AlertTriangle } from 'lucide-react'
import { useUnified } from '../UnifiedContext'
import { DonutChart, formatPct } from '../shared/ChartComponents'

export function SentimentTab() {
  const ctx = useUnified()
  // Engine-scoped view: when a model pill is selected the scan is re-sliced to
  // that engine (UnifiedContext.scopedScanResult). 'all' = aggregate passthrough.
  const scan = ctx.scopedScanResult

  // ── Scan sentiment data ──────────────────────────
  const scanSentiment = scan?.sentiment_breakdown
  const totalScanSentiment = scanSentiment
    ? scanSentiment.positive + scanSentiment.neutral + scanSentiment.negative
    : 0

  // ── Sentiment Themes (aggregated from all mention results) ──
  const sentimentThemes = useMemo(() => {
    if (!scan?.mention_results) return []
    const themeMap: Record<string, { positive: number; negative: number; neutral: number; contexts: string[] }> = {}
    for (const m of scan.mention_results) {
      if (!m.mentioned || !m.sentiment_themes) continue
      for (const t of m.sentiment_themes) {
        if (!themeMap[t.theme]) themeMap[t.theme] = { positive: 0, negative: 0, neutral: 0, contexts: [] }
        themeMap[t.theme][t.sentiment as 'positive' | 'negative' | 'neutral']++
        if (t.context && themeMap[t.theme].contexts.length < 2) themeMap[t.theme].contexts.push(t.context)
      }
    }
    return Object.entries(themeMap)
      .map(([theme, counts]) => {
        const total = counts.positive + counts.negative + counts.neutral
        const dominant = counts.positive >= counts.negative ? (counts.positive >= counts.neutral ? 'positive' : 'neutral') : (counts.negative >= counts.neutral ? 'negative' : 'neutral')
        return { theme, dominant, positive: counts.positive, negative: counts.negative, neutral: counts.neutral, total, contexts: counts.contexts }
      })
      .sort((a, b) => b.total - a.total)
  }, [scan])

  // ── Donut segments from scan data ──────────────
  const donutSegments = useMemo(() => {
    if (!scanSentiment || totalScanSentiment === 0) return []
    return [
      { label: 'Positive', value: scanSentiment.positive, color: '#4A7C59' },
      { label: 'Neutral', value: scanSentiment.neutral, color: '#2D2B27' },
      { label: 'Negative', value: scanSentiment.negative, color: '#B5453A' },
    ]
  }, [scanSentiment, totalScanSentiment])

  return (
    <div className="space-y-8">
      {/* ── Level 3: Stale data warning ────────────────── */}
      {ctx.scanResult && ctx.scanResult.brand_name?.toLowerCase() !== ctx.brandConfig.brand_name.toLowerCase() && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-caution-bg border border-caution/30 text-caution text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>Showing cached data for <strong>{ctx.scanResult.brand_name}</strong> — click <strong>Scan</strong> to refresh for <strong>{ctx.brandConfig.brand_name}</strong>.</span>
        </div>
      )}
      {/* ── A) Scan Sentiment Bars ──────────────────── */}
      {scanSentiment && totalScanSentiment > 0 && (
        <div className="bg-surface rounded-xl border border-divider p-6">
          <h3 className="text-sm font-semibold text-ink-2 mb-4">Scan Sentiment Breakdown</h3>
          <div className="space-y-4">
            {/* Positive */}
            <div className="flex items-center gap-3">
              <ThumbsUp className="w-4 h-4 text-sage flex-shrink-0" />
              <span className="text-xs text-ink-2 w-20">Positive</span>
              <div className="flex-1 h-4 bg-surface-warm rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-sage transition-all duration-700"
                  style={{ width: `${scanSentiment.positive_pct}%` }}
                />
              </div>
              <span className="text-xs font-mono font-bold text-ink w-20 text-right">
                {scanSentiment.positive} ({formatPct(scanSentiment.positive_pct)})
              </span>
            </div>
            {/* Neutral */}
            <div className="flex items-center gap-3">
              <Minus className="w-4 h-4 text-ink-3 flex-shrink-0" />
              <span className="text-xs text-ink-2 w-20">Neutral</span>
              <div className="flex-1 h-4 bg-surface-warm rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-ink-3 transition-all duration-700"
                  style={{ width: `${scanSentiment.neutral_pct}%` }}
                />
              </div>
              <span className="text-xs font-mono font-bold text-ink w-20 text-right">
                {scanSentiment.neutral} ({formatPct(scanSentiment.neutral_pct)})
              </span>
            </div>
            {/* Negative */}
            <div className="flex items-center gap-3">
              <ThumbsDown className="w-4 h-4 text-red-soft flex-shrink-0" />
              <span className="text-xs text-ink-2 w-20">Negative</span>
              <div className="flex-1 h-4 bg-surface-warm rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-red-soft transition-all duration-700"
                  style={{ width: `${scanSentiment.negative_pct}%` }}
                />
              </div>
              <span className="text-xs font-mono font-bold text-ink w-20 text-right">
                {scanSentiment.negative} ({formatPct(scanSentiment.negative_pct)})
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── B) Sentiment Themes ────────────────────── */}
      {sentimentThemes.length > 0 && (
        <div className="bg-surface rounded-xl border border-divider p-6">
          <h3 className="text-sm font-semibold text-ink-2 mb-1 flex items-center gap-2">
            <Tag className="w-4 h-4 text-ink-2" />
            Sentiment Themes
          </h3>
          <p className="text-xs text-ink-3 mb-4">Topic-level sentiment detected in AI responses mentioning your brand</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {sentimentThemes.map(t => {
              const dominantColor = t.dominant === 'positive' ? 'text-sage bg-sage-bg border-sage/30' : t.dominant === 'negative' ? 'text-red-soft bg-red-soft-bg border-red-soft/30' : 'text-ink-2 bg-surface-warm border-divider'
              return (
                <div key={t.theme} className={`rounded-xl border p-4 ${dominantColor}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold capitalize">{t.theme}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-mono">
                    <span className="text-sage">+{t.positive}</span>
                    <span className="text-ink-3 mx-0.5">/</span>
                    <span className="text-ink-3">~{t.neutral}</span>
                    <span className="text-ink-3 mx-0.5">/</span>
                    <span className="text-red-soft">-{t.negative}</span>
                  </div>
                  {t.contexts[0] && (
                    <p className="text-[10px] text-current opacity-60 mt-2 leading-relaxed line-clamp-2">{t.contexts[0]}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── C) Sentiment Donut ─────────────────────── */}
      {donutSegments.length > 0 && (
        <div className="bg-surface rounded-xl border border-divider p-6">
          <h3 className="text-sm font-semibold text-ink-2 mb-4">Sentiment Distribution</h3>
          <div className="flex justify-center">
            <DonutChart
              segments={donutSegments}
              centerLabel={`${donutSegments.reduce((s, d) => s + d.value, 0)}`}
            />
          </div>
        </div>
      )}

    </div>
  )
}
