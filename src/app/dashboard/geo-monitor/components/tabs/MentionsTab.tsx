'use client'

import { useMemo } from 'react'
import { MessageSquare, Eye, Link2, AlertTriangle } from 'lucide-react'
import { useUnified } from '../UnifiedContext'
import { isUnavailableMention, MentionCard } from '../shared/MentionCard'
import { MetricCard, DonutChart, formatNum, formatPct } from '../shared/ChartComponents'
import {
  INTENT_FUNNEL,
  CATEGORY_LABEL_MAP,
  CATEGORY_COLORS,
  SUB_TYPE_LABELS,
  autoClassify,
  resolveIntent,
} from '../shared/constants'

export function MentionsTab() {
  const ctx = useUnified()
  const scanResult = ctx.scanResult

  const availableMentionResults = useMemo(
    () => scanResult?.mention_results.filter(m => !isUnavailableMention(m)) ?? [],
    [scanResult],
  )

  const unavailableMentionResults = useMemo(
    () => scanResult?.mention_results.filter(isUnavailableMention) ?? [],
    [scanResult],
  )

  // ── Group mention_results by intent ──────────────────
  const intentStats = useMemo(() => {
    if (!scanResult) return []

    // ── C: Hybrid intent resolution ───────────────────────
    // Build a lookup from prompt template → stored category/intent from the
    // prompts DB (ctx.filteredPrompts). Stored value is authoritative; if a
    // prompt isn't in the list (e.g. stale scan with deleted prompt) we fall
    // back to autoClassify so the row still counts rather than getting dropped.
    const storedCategoryMap: Record<string, string> = {}
    for (const p of ctx.filteredPrompts) {
      if (p.template) {
        storedCategoryMap[p.template] = p.category || p.intent || ''
      }
    }

    const groups: Record<string, { total: number; mentioned: number }> = {}
    for (const key of Object.keys(INTENT_FUNNEL)) {
      groups[key] = { total: 0, mentioned: 0 }
    }
    for (const m of availableMentionResults) {
      // Prefer stored category → resolveIntent handles old enum values → autoClassify fallback
      const rawCategory =
        storedCategoryMap[m.prompt_text] || autoClassify(m.prompt_text).category
      const resolved = resolveIntent(rawCategory) || rawCategory
      const intentKey = Object.keys(INTENT_FUNNEL).includes(resolved) ? resolved : 'info_cognition'
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
  }, [scanResult, ctx.filteredPrompts, availableMentionResults])

  // ── Quick stats ──────────────────────────────────────
  const { totalPrompts, mentionedCount, notMentionedCount, avgCitations } = useMemo(() => {
    if (!scanResult) return { totalPrompts: 0, mentionedCount: 0, notMentionedCount: 0, avgCitations: 0 }
    const mentioned = availableMentionResults.filter(m => m.mentioned)
    const notMentioned = availableMentionResults.filter(m => !m.mentioned)
    const citationSum = mentioned.reduce((sum, m) => sum + (m.cited_urls?.length ?? 0), 0)
    return {
      totalPrompts: availableMentionResults.length,
      mentionedCount: mentioned.length,
      notMentionedCount: notMentioned.length,
      avgCitations: mentioned.length > 0 ? citationSum / mentioned.length : 0,
    }
  }, [scanResult, availableMentionResults])

  // ── Sub-type distribution donut segments ─────────────
  const subTypeSegments = useMemo(() => {
    if (!scanResult?.sub_type_distribution) return []
    return Object.entries(scanResult.sub_type_distribution)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({
        label: SUB_TYPE_LABELS[type]?.label || type,
        value: count,
        color: SUB_TYPE_LABELS[type]?.chartColor || '#2D2B27',
      }))
  }, [scanResult])

  // ── Split mention results ────────────────────────────
  const notMentionedResults = useMemo(
    () => availableMentionResults.filter(m => !m.mentioned),
    [availableMentionResults],
  )
  const mentionedResults = useMemo(
    () => availableMentionResults.filter(m => m.mentioned),
    [availableMentionResults],
  )

  // ── No data notice ───────────────────────────────────
  if (!scanResult) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-ink-3">
        <MessageSquare className="w-10 h-10 mb-3 text-ink-3 opacity-50" />
        <p className="text-sm font-medium">Run a scan to see mention analysis</p>
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
      {/* ── Prompt Effectiveness by Intent ──────────────── */}
      <div>
        <h4 className="text-sm font-semibold text-ink-2 mb-3">Prompt Effectiveness by Intent</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {intentStats.map(intent => (
            <div key={intent.key} className={`rounded-xl border border-divider p-5 ${intent.bgColor}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{intent.icon}</span>
                <span className={`text-sm font-semibold ${intent.color}`}>{intent.label}</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-surface/60 rounded-full text-ink-3 font-medium">Stage {intent.stage}</span>
              </div>
              <div className="space-y-1 mt-3">
                <div className="flex justify-between text-xs text-ink-2">
                  <span>Prompts</span>
                  <span className="font-mono font-bold">{intent.total}</span>
                </div>
                <div className="flex justify-between text-xs text-ink-2">
                  <span>Mentioned</span>
                  <span className="font-mono font-bold">{intent.mentioned}</span>
                </div>
                <div className="flex justify-between text-xs text-ink-2">
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
          icon={<Eye className="w-5 h-5 text-ink-2" />}
          label="Prompts Used"
          value={formatNum(totalPrompts, 0)}
          subtitle={`${mentionedCount} mentioned / ${notMentionedCount} not mentioned${unavailableMentionResults.length ? ` · ${unavailableMentionResults.length} unavailable` : ''}`}
          color="text-ink-2"
          bgColor="bg-surface-warm"
        />
        <MetricCard
          icon={<Link2 className="w-5 h-5 text-ink-2" />}
          label="Avg Citations"
          value={formatNum(avgCitations)}
          subtitle="Average cited URLs per mentioned result"
          color="text-ink-2"
          bgColor="bg-surface-warm"
        />
      </div>

      {/* ── Sub-Type Distribution Donut ─────────────────── */}
      {subTypeSegments.length > 0 && (
        <div className="bg-surface rounded-xl border border-divider p-5">
          <h4 className="text-sm font-semibold text-ink-2 mb-4">Sub-Type Distribution</h4>
          <div className="flex justify-center">
            <DonutChart
              segments={subTypeSegments}
              centerLabel={formatNum(subTypeSegments.reduce((s, seg) => s + seg.value, 0), 0)}
              size={180}
            />
          </div>
        </div>
      )}

      {unavailableMentionResults.length > 0 && (
        <div className="rounded-xl border border-caution/30 bg-caution-bg px-4 py-3 text-sm text-ink-2">
          <div className="flex items-center gap-2 font-semibold text-caution">
            <AlertTriangle className="h-4 w-4" />
            {unavailableMentionResults.length} AI answer{unavailableMentionResults.length > 1 ? 's were' : ' was'} unavailable
          </div>
          <p className="mt-1 text-xs leading-5 text-ink-2">
            Engine quota or cache placeholders are excluded from Mentioned / Not Mentioned scoring. Retry the scan after the engine is available.
          </p>
        </div>
      )}

      {/* ── Detailed Mentions: Not Mentioned ───────────── */}
      {notMentionedResults.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h4 className="text-sm font-semibold text-ink-2">Not Mentioned</h4>
            <span className="text-xs px-2 py-0.5 bg-red-soft-bg text-red-soft rounded-full font-medium">{notMentionedResults.length}</span>
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
            <h4 className="text-sm font-semibold text-ink-2">Mentioned</h4>
            <span className="text-xs px-2 py-0.5 bg-sage-bg text-sage rounded-full font-medium">{mentionedResults.length}</span>
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
