'use client'

import { useMemo } from 'react'
import { AlertTriangle } from 'lucide-react'
import { INTENT_FUNNEL, INTENT_CONTENT_MAP } from '../shared/constants'
import type { MonitorScanResult, MonitorPrompt, PromptMetrics } from '@/lib/api'

// ── Intent order ──────────────────────────────────────

const INTENT_ORDER = [
  'info_cognition',
  'solution_explore',
  'comparison_decision',
  'action_choice',
] as const

const INTENT_LABELS: Record<string, string> = {
  info_cognition:      'Info Cognition',
  solution_explore:    'Solution Explore',
  comparison_decision: 'Comparison Decision',
  action_choice:       'Action Choice',
}

// ── Computation ───────────────────────────────────────

export interface IntentStage {
  intentKey: string
  stage: number
  label: string
  icon: string
  color: string
  bgColor: string
  total: number       // prompts at this stage
  working: number     // prompts with brand mention
  pct: number         // 0-100 visibility %
  contentLink: string | null
}

export function computeIntentFunnel(
  prompts: MonitorPrompt[],
  scanResult: MonitorScanResult,
): IntentStage[] {
  // Build template → visibility map from per_prompt_metrics
  const metricMap = new Map<string, boolean>()
  if (scanResult.per_prompt_metrics && Object.keys(scanResult.per_prompt_metrics).length > 0) {
    for (const m of Object.values(scanResult.per_prompt_metrics as Record<string, PromptMetrics>)) {
      metricMap.set(m.prompt_template, m.visibility)
    }
  }

  // Fallback: aggregate from mention_results by prompt_text
  if (metricMap.size === 0) {
    const mentionResults = Array.isArray(scanResult.mention_results) ? scanResult.mention_results : []
    for (const m of mentionResults) {
      const prev = metricMap.get(m.prompt_text)
      metricMap.set(m.prompt_text, prev || m.mentioned)
    }
  }

  return INTENT_ORDER.map(intentKey => {
    const funnel = INTENT_FUNNEL[intentKey]
    const group = prompts.filter(p => p.category === intentKey || p.category === intentKey.replace('_', ' '))
    const working = group.filter(p => {
      if (metricMap.has(p.template)) return metricMap.get(p.template)
      return p.last_mentioned ?? false
    })
    const pct = group.length > 0 ? Math.round((working.length / group.length) * 100) : 0
    const contentMap = INTENT_CONTENT_MAP[intentKey]
    return {
      intentKey,
      stage: funnel.stage,
      label: INTENT_LABELS[intentKey],
      icon: funnel.icon,
      color: funnel.color,
      bgColor: funnel.bgColor,
      total: group.length,
      working: working.length,
      pct,
      contentLink: pct === 0 && group.length > 0 && contentMap?.[0]?.url ? contentMap[0].url : null,
    }
  })
}

// ── Component ─────────────────────────────────────────

interface Props {
  prompts: MonitorPrompt[]
  scanResult: MonitorScanResult
}

export function IntentFunnel({ prompts, scanResult }: Props) {
  const stages = useMemo(() => computeIntentFunnel(prompts, scanResult), [prompts, scanResult])

  const maxPct = Math.max(...stages.map(s => s.pct), 1)

  return (
    <div className="bg-surface rounded-xl border border-divider p-5">
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-ink-2">Intent Funnel</h4>
        <p className="text-xs text-ink-3 mt-0.5">Brand visibility across the 4 GEO intent stages — where do you lose mentions?</p>
      </div>

      <div className="space-y-3">
        {stages.map((stage, idx) => {
          const prevPct = idx > 0 ? stages[idx - 1].pct : null
          const drop = prevPct !== null && prevPct > 0 ? prevPct - stage.pct : 0
          const showDrop = drop >= 20

          return (
            <div key={stage.intentKey}>
              {/* Stage row */}
              <div className="flex items-center gap-3">
                {/* Stage number */}
                <div className="flex-shrink-0 w-5 text-center">
                  <span className="text-[10px] font-bold text-ink-3">{stage.stage}</span>
                </div>

                {/* Label + icon */}
                <div className="flex-shrink-0 w-36 flex items-center gap-1.5">
                  <span className="text-base leading-none">{stage.icon}</span>
                  <span className="text-xs font-medium text-ink-2">{stage.label}</span>
                </div>

                {/* Funnel bar */}
                <div className="flex-1 relative h-7 bg-surface-warm rounded-lg overflow-hidden">
                  <div
                    className={`absolute inset-y-0 left-0 rounded-lg transition-all duration-500 ${
                      stage.pct === 0
                        ? 'bg-divider'
                        : stage.pct >= 60
                          ? 'bg-sage/70'
                          : stage.pct >= 30
                            ? 'bg-caution/70'
                            : 'bg-red-soft/60'
                    }`}
                    style={{ width: `${maxPct > 0 ? (stage.pct / maxPct) * 100 : 0}%` }}
                  />
                  <div className="absolute inset-0 flex items-center px-2.5 gap-2">
                    <span className={`text-xs font-bold font-mono z-10 ${
                      stage.pct === 0 ? 'text-ink-3' : 'text-ink'
                    }`}>
                      {stage.pct}%
                    </span>
                    {stage.total > 0 && (
                      <span className="text-[10px] text-ink-3 z-10">
                        {stage.working}/{stage.total} prompts
                      </span>
                    )}
                    {stage.total === 0 && (
                      <span className="text-[10px] text-ink-3 z-10 italic">no prompts at this stage</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Drop indicator */}
              {showDrop && (
                <div className="flex items-center gap-1.5 ml-8 mt-1 mb-1">
                  <AlertTriangle className="w-3 h-3 text-caution flex-shrink-0" />
                  <span className="text-[10px] text-caution font-medium">
                    −{drop}% drop from Stage {idx} → {stage.stage}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
