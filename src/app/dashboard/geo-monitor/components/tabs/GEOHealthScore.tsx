'use client'

import { useMemo } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { MonitorScanResult, MonitorPrompt, PromptMetrics } from '@/lib/api'
import type { CTMRow } from './CitationTruthMap'
import type { IntentStage } from './IntentFunnel'

// ── Score computation ──────────────────────────────────

export interface GEOScoreBreakdown {
  score: number        // 0-100 composite
  visibility: number   // 0-100 from scan.visibility_score
  promptYield: number  // 0-100 working prompts %
  citationCoverage: number  // 0-100 (inverted gap ratio)
  intentBreadth: number     // 0-100 (stages with >0% / 4)
  delta: number | null      // vs previous scan (null if no history)
}

export function computeGEOScore(
  scanResult: MonitorScanResult,
  prompts: MonitorPrompt[],
  ctmRows: CTMRow[] | null,
  intentStages: IntentStage[],
  prevVisibility: number | null,
): GEOScoreBreakdown {
  // Component 1: Visibility (0-100)
  const visibility = Math.min(100, Math.max(0, scanResult.visibility_score))

  // Component 2: Prompt Yield (0-100)
  let promptYield = 0
  const metricMap = new Map<string, boolean>()
  if (scanResult.per_prompt_metrics && Object.keys(scanResult.per_prompt_metrics).length > 0) {
    for (const m of Object.values(scanResult.per_prompt_metrics as Record<string, PromptMetrics>)) {
      metricMap.set(m.prompt_template, m.visibility)
    }
  } else {
    const mentionResults = Array.isArray(scanResult.mention_results) ? scanResult.mention_results : []
    for (const m of mentionResults) {
      metricMap.set(m.prompt_text, (metricMap.get(m.prompt_text) ?? false) || m.mentioned)
    }
  }
  if (metricMap.size > 0) {
    const workingCount = Array.from(metricMap.values()).filter(Boolean).length
    promptYield = Math.round((workingCount / metricMap.size) * 100)
  }

  // Component 3: Citation Coverage (0-100)
  let citationCoverage = 50 // neutral default when no discover data
  if (ctmRows && ctmRows.length > 0) {
    const gapCount = ctmRows.filter(r => r.status === 'gap').length
    citationCoverage = Math.round(Math.max(0, (1 - gapCount / ctmRows.length) * 100))
  }

  // Component 4: Intent Breadth (0-100)
  const activeStages = intentStages.filter(s => s.pct > 0).length
  const totalStages = intentStages.filter(s => s.total > 0).length
  const intentBreadth = totalStages > 0 ? Math.round((activeStages / totalStages) * 100) : 50

  // Weighted composite score
  const score = Math.round(
    visibility * 0.40 +
    promptYield * 0.30 +
    citationCoverage * 0.20 +
    intentBreadth * 0.10,
  )

  // Delta vs previous
  const delta = prevVisibility !== null ? Math.round(score - (
    prevVisibility * 0.40 + promptYield * 0.30 + citationCoverage * 0.20 + intentBreadth * 0.10
  )) : null

  return { score, visibility, promptYield, citationCoverage, intentBreadth, delta }
}

// ── Score ring (SVG arc) ───────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - score / 100)

  const color = score >= 70 ? '#4A7C59' : score >= 40 ? '#B8860B' : '#C0392B'
  const trackColor = score >= 70 ? '#E8F5EA' : score >= 40 ? '#FFF8E6' : '#FDECEA'

  return (
    <svg width="100" height="100" viewBox="0 0 100 100" className="rotate-[-90deg]">
      {/* Track */}
      <circle cx="50" cy="50" r={radius} fill="none" stroke={trackColor} strokeWidth="8" />
      {/* Arc */}
      <circle
        cx="50" cy="50" r={radius}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
    </svg>
  )
}

// ── Mini component bar ─────────────────────────────────

function ComponentBar({
  label, value, color,
}: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] mb-1">
        <span className="text-ink-3">{label}</span>
        <span className="font-mono font-bold text-ink-2">{value}%</span>
      </div>
      <div className="w-full h-1.5 bg-surface-warm rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────

interface Props {
  breakdown: GEOScoreBreakdown
}

export function GEOHealthScore({ breakdown }: Props) {
  const { score, visibility, promptYield, citationCoverage, intentBreadth, delta } = breakdown

  const scoreColor = score >= 70 ? 'text-sage' : score >= 40 ? 'text-caution' : 'text-red-soft'
  const label = score >= 70 ? 'Healthy' : score >= 40 ? 'Needs Work' : 'Critical'
  const labelBg = score >= 70 ? 'bg-sage-bg text-sage' : score >= 40 ? 'bg-caution-bg text-caution' : 'bg-red-soft-bg text-red-soft'

  return (
    <div className="bg-surface rounded-xl border border-divider p-5">
      <div className="flex items-start gap-6 flex-wrap">

        {/* Left: score ring */}
        <div className="flex flex-col items-center justify-center flex-shrink-0">
          <div className="relative w-[100px] h-[100px]">
            <ScoreRing score={score} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-black font-mono leading-none ${scoreColor}`}>{score}</span>
              <span className="text-[9px] text-ink-3 mt-0.5">/ 100</span>
            </div>
          </div>
          <span className={`mt-2 text-[10px] px-2 py-0.5 rounded-full font-semibold ${labelBg}`}>
            {label}
          </span>
          {delta !== null && (
            <div className={`flex items-center gap-0.5 mt-1.5 text-[10px] font-medium ${
              delta > 0 ? 'text-sage' : delta < 0 ? 'text-red-soft' : 'text-ink-3'
            }`}>
              {delta > 0 ? <TrendingUp className="w-3 h-3" /> : delta < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
              {delta > 0 ? '+' : ''}{delta} vs last
            </div>
          )}
        </div>

        {/* Right: header + component bars */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-ink mb-0.5">GEO Health Score</h4>
          <p className="text-xs text-ink-3 mb-4">Composite AI visibility score across 4 dimensions.</p>

          <div className="space-y-2.5">
            <ComponentBar
              label="Visibility Score (40%)"
              value={visibility}
              color={visibility >= 60 ? 'bg-sage' : visibility >= 30 ? 'bg-caution' : 'bg-red-soft'}
            />
            <ComponentBar
              label="Prompt Yield (30%)"
              value={promptYield}
              color={promptYield >= 60 ? 'bg-sage' : promptYield >= 30 ? 'bg-caution' : 'bg-red-soft'}
            />
            <ComponentBar
              label="Citation Coverage (20%)"
              value={citationCoverage}
              color={citationCoverage >= 60 ? 'bg-sage' : citationCoverage >= 30 ? 'bg-caution' : 'bg-red-soft'}
            />
            <ComponentBar
              label="Intent Breadth (10%)"
              value={intentBreadth}
              color={intentBreadth >= 60 ? 'bg-sage' : intentBreadth >= 30 ? 'bg-caution' : 'bg-red-soft'}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
