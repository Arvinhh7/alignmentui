'use client'

import { useMemo } from 'react'
import { MessageSquare, Eye, ThumbsUp, Link2 } from 'lucide-react'
import { useUnified } from '../UnifiedContext'
import { MentionCard } from '../shared/MentionCard'
import { HorizontalBar, MetricCard, DonutChart, formatNum, formatPct } from '../shared/ChartComponents'
import {
  INTENT_FUNNEL,
  CATEGORY_LABEL_MAP,
  CATEGORY_COLORS,
  SUB_TYPE_LABELS,
  autoClassify,
} from '../shared/constants'

export function MentionsTab() {
  const ctx = useUnified()
  const scanResult = ctx.scanResult

  // ── Group mention_results by intent ──────────────────
  const intentStats = useMemo(() => {
    if (!scanResult) return []
    const groups: Record<string, { total: number; mentioned: number }> = {}
    for (const key of Object.keys(INTENT_FUNNEL)) {
      groups[key] = { total: 0, mentioned: 0 }
    }
    for (const m of scanResult.mention_results) {
      const { category } = autoClassify(m.prompt_text)
      // Normalize old categories to new intent keys
      const intentKey = Object.keys(INTENT_FUNNEL).includes(category) ? category : 'info_cognition'
      if (!groups[intentKey]) groups[intentKey] = { total: 0, mentioned: 0 }
      groups[intentKey].total += 1
      if (m.mentioned) groups[intentKey].mentioned += 1
    }
    return Object.entries(INTENT_FUNNEL).map(([key, funnel]) => ({
      key,
      ...funnel,
      label: CATEGORY_LABEL_MAP[key] || key,
      total: groups[key]?.total ?? 0,
      mentioned: groups[key]?.mentioned ?? 0,
      visibilityPct: groups[key]?.total > 0
        ? (groups[key].mentioned / groups[key].total) * 100
        : 0,
    }))
  }, [scanResult])

  // ── Quick stats ──────────────────────────────────────
  const { totalPrompts, mentionedCount, notMentionedCount, avgCitations } = useMemo(() => {
    if (!scanResult) return { totalPrompts: 0, mentionedCount: 0, notMentionedCount: 0, avgCitations: 0 }
    const mentioned = scanResult.mention_results.filter(m => m.mentioned)
    const notMentioned = scanResult.mention_results.filter(m => !m.mentioned)
    const citationSum = mentioned.reduce((sum, m) => sum + (m.cited_urls?.length ?? 0), 0)
    return {
      totalPrompts: scanResult.total_prompts,
      mentionedCount: mentioned.length,
      notMentionedCount: notMentioned.length,
      avgCitations: mentioned.length > 0 ? citationSum / mentioned.length : 0,
    }
  }, [scanResult])

  // ── Sub-type distribution donut segments ─────────────
  const subTypeSegments = useMemo(() => {
    if (!scanResult?.sub_type_distribution) return []
    return Object.entries(scanResult.sub_type_distribution)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({
        label: SUB_TYPE_LABELS[type]?.label || type,
        value: count,
        color: SUB_TYPE_LABELS[type]?.chartColor || '#9ca3af',
      }))
  }, [scanResult])

  // ── Split mention results ────────────────────────────
  const notMentionedResults = useMemo(
    () => scanResult?.mention_results.filter(m => !m.mentioned) ?? [],
    [scanResult],
  )
  const mentionedResults = useMemo(
    () => scanResult?.mention_results.filter(m => m.mentioned) ?? [],
    [scanResult],
  )

  // ── No data notice ───────────────────────────────────
  if (!scanResult) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <MessageSquare className="w-10 h-10 mb-3 text-gray-300" />
        <p className="text-sm font-medium">Run a scan to see mention analysis</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Prompt Effectiveness by Intent ──────────────── */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Prompt Effectiveness by Intent</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {intentStats.map(intent => (
            <div key={intent.key} className={`rounded-xl border border-gray-200 p-5 ${intent.bgColor}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{intent.icon}</span>
                <span className={`text-sm font-semibold ${intent.color}`}>{intent.label}</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-white/60 rounded-full text-gray-500 font-medium">Stage {intent.stage}</span>
              </div>
              <div className="space-y-1 mt-3">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Prompts</span>
                  <span className="font-mono font-bold">{intent.total}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Mentioned</span>
                  <span className="font-mono font-bold">{intent.mentioned}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Visibility</span>
                  <span className="font-mono font-bold">{formatPct(intent.visibilityPct)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Quick Stats ────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <MetricCard
          icon={<Eye className="w-5 h-5 text-blue-600" />}
          label="Prompts Used"
          value={formatNum(totalPrompts, 0)}
          subtitle={`${mentionedCount} mentioned / ${notMentionedCount} not mentioned`}
          color="text-blue-600"
          bgColor="bg-blue-50"
        />
        <MetricCard
          icon={<Link2 className="w-5 h-5 text-purple-600" />}
          label="Avg Citations"
          value={formatNum(avgCitations)}
          subtitle="Average cited URLs per mentioned result"
          color="text-purple-600"
          bgColor="bg-purple-50"
        />
      </div>

      {/* ── Sub-Type Distribution Donut ─────────────────── */}
      {subTypeSegments.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">Sub-Type Distribution</h4>
          <div className="flex justify-center">
            <DonutChart
              segments={subTypeSegments}
              centerLabel={formatNum(subTypeSegments.reduce((s, seg) => s + seg.value, 0), 0)}
              size={180}
            />
          </div>
        </div>
      )}

      {/* ── Detailed Mentions: Not Mentioned ───────────── */}
      {notMentionedResults.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h4 className="text-sm font-semibold text-gray-700">Not Mentioned</h4>
            <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">{notMentionedResults.length}</span>
          </div>
          <div className="space-y-3">
            {notMentionedResults.map((m, i) => (
              <MentionCard key={i} mention={m} brandName={scanResult.brand_name} index={i + 1} />
            ))}
          </div>
        </div>
      )}

      {/* ── Detailed Mentions: Mentioned ───────────────── */}
      {mentionedResults.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h4 className="text-sm font-semibold text-gray-700">Mentioned</h4>
            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">{mentionedResults.length}</span>
          </div>
          <div className="space-y-3">
            {mentionedResults.map((m, i) => (
              <MentionCard key={i} mention={m} brandName={scanResult.brand_name} index={i + 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
