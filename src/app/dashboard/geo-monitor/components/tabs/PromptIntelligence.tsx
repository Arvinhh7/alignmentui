'use client'

import { useMemo } from 'react'
import { Sparkles, CheckCircle2, XCircle } from 'lucide-react'
import { useLanguage } from '@/lib/LanguageContext'
import type { MonitorScanResult, MonitorPrompt, PromptMetrics } from '@/lib/api'

// ── Types ─────────────────────────────────────────────

interface PromptRow {
  template: string
  working: boolean
  mentionCount: number
}

// ── Compute ───────────────────────────────────────────

function computePromptRows(
  scanResult: MonitorScanResult,
  prompts: MonitorPrompt[],
): PromptRow[] {
  // Primary: use per_prompt_metrics (already aggregated)
  if (scanResult.per_prompt_metrics && Object.keys(scanResult.per_prompt_metrics).length > 0) {
    return Object.values(scanResult.per_prompt_metrics as Record<string, PromptMetrics>).map(m => ({
      template: m.prompt_template,
      working: m.visibility,
      mentionCount: m.mention_count,
    }))
  }

  // Fallback: aggregate from mention_results by prompt_text
  const promptMap = new Map<string, { mentioned: boolean; count: number }>()
  const mentionResults = Array.isArray(scanResult.mention_results) ? scanResult.mention_results : []
  for (const m of mentionResults) {
    const key = m.prompt_text
    const prev = promptMap.get(key) ?? { mentioned: false, count: 0 }
    promptMap.set(key, {
      mentioned: prev.mentioned || m.mentioned,
      count: prev.count + (m.mentioned ? 1 : 0),
    })
  }
  return Array.from(promptMap.entries()).map(([template, { mentioned, count }]) => ({
    template,
    working: mentioned,
    mentionCount: count,
  }))
}

// ── Component ─────────────────────────────────────────

interface Props {
  scanResult: MonitorScanResult
  prompts: MonitorPrompt[]
  onOpenGenerateModal: () => void
}

export function PromptIntelligence({ scanResult, prompts, onOpenGenerateModal }: Props) {
  const { t } = useLanguage()
  const d = t.dashboard.discover.promptIntel

  const rows = useMemo(
    () => computePromptRows(scanResult, prompts),
    [scanResult, prompts],
  )

  const working = useMemo(() => rows.filter(r => r.working), [rows])
  const silent  = useMemo(() => rows.filter(r => !r.working), [rows])
  const total   = rows.length
  const pct     = total > 0 ? Math.round((working.length / total) * 100) : 0

  if (total === 0) return null

  return (
    <div className="bg-surface rounded-xl border border-divider p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div>
          <h4 className="text-sm font-semibold text-ink">{d.title}</h4>
          <p className="text-xs text-ink-3 mt-0.5">{d.subtitle}</p>
        </div>
        <button
          onClick={onOpenGenerateModal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-ink hover:bg-[#2d2d2c] text-ink-inv rounded-lg text-xs font-medium transition-colors flex-shrink-0"
        >
          <Sparkles className="w-3 h-3" />
          {d.boostBtn}
        </button>
      </div>

      {/* Summary bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-ink-3">{d.summaryOf(working.length, total)}</span>
          <span className="font-mono font-bold text-ink">{pct}%</span>
        </div>
        <div className="w-full h-2 bg-surface-warm rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              pct >= 60 ? 'bg-sage' : pct >= 30 ? 'bg-caution' : 'bg-red-soft'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-2 gap-3">

        {/* Working */}
        <div className="rounded-xl bg-sage-bg border border-sage/20 p-3">
          <div className="flex items-center gap-1.5 mb-2.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-sage flex-shrink-0" />
            <span className="text-xs font-semibold text-sage">
              {d.productive} · {working.length}
            </span>
          </div>
          <div className="space-y-1.5">
            {working.slice(0, 5).map((r, i) => (
              <p key={i} className="text-[11px] text-ink-2 truncate leading-tight" title={r.template}>
                {r.template}
              </p>
            ))}
            {working.length > 5 && (
              <p className="text-[10px] text-ink-3">+{working.length - 5} more</p>
            )}
            {working.length === 0 && (
              <p className="text-[11px] text-ink-3 italic">{d.noneYet}</p>
            )}
          </div>
        </div>

        {/* Silent */}
        <div className="rounded-xl bg-red-soft-bg border border-red-soft/20 p-3">
          <div className="flex items-center gap-1.5 mb-2.5">
            <XCircle className="w-3.5 h-3.5 text-red-soft flex-shrink-0" />
            <span className="text-xs font-semibold text-red-soft">
              {d.silent} · {silent.length}
            </span>
          </div>
          <div className="space-y-1.5">
            {silent.slice(0, 5).map((r, i) => (
              <p key={i} className="text-[11px] text-ink-2 truncate leading-tight" title={r.template}>
                {r.template}
              </p>
            ))}
            {silent.length > 5 && (
              <p className="text-[10px] text-ink-3">+{silent.length - 5} more</p>
            )}
            {silent.length === 0 && (
              <p className="text-[11px] text-ink-3 italic">{d.allWorking}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
