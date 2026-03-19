'use client'

import { useMemo } from 'react'
import { ThumbsUp, ThumbsDown, Minus, Tag } from 'lucide-react'
import { useUnified } from '../UnifiedContext'
import { DonutChart, formatPct } from '../shared/ChartComponents'

export function SentimentTab() {
  const ctx = useUnified()

  // ── Scan sentiment data ──────────────────────────
  const scanSentiment = ctx.scanResult?.sentiment_breakdown
  const totalScanSentiment = scanSentiment
    ? scanSentiment.positive + scanSentiment.neutral + scanSentiment.negative
    : 0

  // ── Sentiment Themes (aggregated from all mention results) ──
  const sentimentThemes = useMemo(() => {
    if (!ctx.scanResult?.mention_results) return []
    const themeMap: Record<string, { positive: number; negative: number; neutral: number; contexts: string[] }> = {}
    for (const m of ctx.scanResult.mention_results) {
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
  }, [ctx.scanResult])

  // ── Donut segments from scan data ──────────────
  const donutSegments = useMemo(() => {
    if (!scanSentiment || totalScanSentiment === 0) return []
    return [
      { label: 'Positive', value: scanSentiment.positive, color: '#22c55e' },
      { label: 'Neutral', value: scanSentiment.neutral, color: '#9ca3af' },
      { label: 'Negative', value: scanSentiment.negative, color: '#ef4444' },
    ]
  }, [scanSentiment, totalScanSentiment])

  return (
    <div className="space-y-8">
      {/* ── A) Scan Sentiment Bars ──────────────────── */}
      {scanSentiment && totalScanSentiment > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Scan Sentiment Breakdown</h3>
          <div className="space-y-4">
            {/* Positive */}
            <div className="flex items-center gap-3">
              <ThumbsUp className="w-4 h-4 text-green-600 flex-shrink-0" />
              <span className="text-xs text-gray-600 w-20">Positive</span>
              <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-green-500 transition-all duration-700"
                  style={{ width: `${scanSentiment.positive_pct}%` }}
                />
              </div>
              <span className="text-xs font-mono font-bold text-gray-800 w-20 text-right">
                {scanSentiment.positive} ({formatPct(scanSentiment.positive_pct)})
              </span>
            </div>
            {/* Neutral */}
            <div className="flex items-center gap-3">
              <Minus className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <span className="text-xs text-gray-600 w-20">Neutral</span>
              <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gray-400 transition-all duration-700"
                  style={{ width: `${scanSentiment.neutral_pct}%` }}
                />
              </div>
              <span className="text-xs font-mono font-bold text-gray-800 w-20 text-right">
                {scanSentiment.neutral} ({formatPct(scanSentiment.neutral_pct)})
              </span>
            </div>
            {/* Negative */}
            <div className="flex items-center gap-3">
              <ThumbsDown className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span className="text-xs text-gray-600 w-20">Negative</span>
              <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-red-500 transition-all duration-700"
                  style={{ width: `${scanSentiment.negative_pct}%` }}
                />
              </div>
              <span className="text-xs font-mono font-bold text-gray-800 w-20 text-right">
                {scanSentiment.negative} ({formatPct(scanSentiment.negative_pct)})
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── B) Sentiment Themes ────────────────────── */}
      {sentimentThemes.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
            <Tag className="w-4 h-4 text-purple-500" />
            Sentiment Themes
          </h3>
          <p className="text-xs text-gray-400 mb-4">Topic-level sentiment detected in AI responses mentioning your brand</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {sentimentThemes.map(t => {
              const dominantColor = t.dominant === 'positive' ? 'text-green-600 bg-green-50 border-green-200' : t.dominant === 'negative' ? 'text-red-600 bg-red-50 border-red-200' : 'text-gray-600 bg-gray-50 border-gray-200'
              const icon = t.dominant === 'positive' ? '😊' : t.dominant === 'negative' ? '😟' : '😐'
              return (
                <div key={t.theme} className={`rounded-xl border p-4 ${dominantColor}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold capitalize">{t.theme}</span>
                    <span className="text-base">{icon}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-mono">
                    <span className="text-green-700">+{t.positive}</span>
                    <span className="text-gray-400 mx-0.5">/</span>
                    <span className="text-gray-500">~{t.neutral}</span>
                    <span className="text-gray-400 mx-0.5">/</span>
                    <span className="text-red-600">-{t.negative}</span>
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
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Sentiment Distribution</h3>
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
