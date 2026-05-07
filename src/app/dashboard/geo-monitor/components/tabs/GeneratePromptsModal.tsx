'use client'

import { useState, useMemo, useCallback } from 'react'
import { X, Sparkles, Check, ArrowRight, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useLanguage } from '@/lib/LanguageContext'
import { useUnified } from '../UnifiedContext'
import type { BrandConfig } from '../shared/constants'

// ── Types ────────────────────────────────────────────

export interface GeneratedPrompt {
  template: string
  intentKey: 'info_cognition' | 'solution_explore' | 'comparison_decision' | 'action_choice'
}

// ── Algorithm: generate 12 prompts from brand config ──

export function buildGeneratedPrompts(config: BrandConfig): GeneratedPrompt[] {
  const { brand_name, keywords, competitors, target_audience } = config
  const kw = keywords[0] || brand_name
  const comp1 = competitors[0] || ''
  const comp2 = competitors[1] && competitors[1] !== comp1 ? competitors[1] : ''
  const audience = target_audience?.trim() || 'consumers'

  return [
    // Info Cognition × 3
    { template: `What is ${kw}?`, intentKey: 'info_cognition' },
    { template: `How does ${kw} work?`, intentKey: 'info_cognition' },
    { template: `What are the benefits of ${kw}?`, intentKey: 'info_cognition' },
    // Solution Explore × 3
    { template: `Best ${kw} brands`, intentKey: 'solution_explore' },
    { template: `Top ${kw} for ${audience}`, intentKey: 'solution_explore' },
    comp1
      ? { template: `${kw} alternatives to ${comp1}`, intentKey: 'solution_explore' }
      : { template: `Recommended ${kw} options`, intentKey: 'solution_explore' },
    // Comparison Decision × 3
    comp1
      ? { template: `${brand_name} vs ${comp1}`, intentKey: 'comparison_decision' }
      : { template: `Is ${brand_name} worth it?`, intentKey: 'comparison_decision' },
    comp2
      ? { template: `${brand_name} vs ${comp2}`, intentKey: 'comparison_decision' }
      : { template: `${brand_name} honest review`, intentKey: 'comparison_decision' },
    { template: `Best ${kw}: is ${brand_name} a good choice?`, intentKey: 'comparison_decision' },
    // Action Choice × 3
    { template: `Should I try ${brand_name}?`, intentKey: 'action_choice' },
    { template: `Is ${brand_name} good for ${audience}?`, intentKey: 'action_choice' },
    { template: `Where to buy ${kw}`, intentKey: 'action_choice' },
  ] as GeneratedPrompt[]
}

// ── Intent group ──────────────────────────────────────

const INTENT_ORDER: GeneratedPrompt['intentKey'][] = [
  'info_cognition', 'solution_explore', 'comparison_decision', 'action_choice',
]

const INTENT_COLORS: Record<GeneratedPrompt['intentKey'], string> = {
  info_cognition:    'bg-surface-warm text-ink-2',
  solution_explore:  'bg-sage-bg text-sage',
  comparison_decision: 'bg-caution-bg text-caution',
  action_choice:     'bg-red-soft-bg text-red-soft',
}

// ── Modal ─────────────────────────────────────────────

interface Props {
  onClose: () => void
}

export function GeneratePromptsModal({ onClose }: Props) {
  const { t } = useLanguage()
  const ctx = useUnified()
  const d = t.dashboard.discover.generatePrompts

  const prompts = useMemo(() => buildGeneratedPrompts(ctx.brandConfig), [ctx.brandConfig])

  const [selected, setSelected] = useState<Set<number>>(() => new Set(prompts.map((_, i) => i)))
  const [saving, setSaving] = useState(false)
  const [savedCount, setSavedCount] = useState<number | null>(null)

  const toggleOne = (i: number) =>
    setSelected(prev => { const s = new Set(prev); s.has(i) ? s.delete(i) : s.add(i); return s })

  const toggleGroup = useCallback((key: GeneratedPrompt['intentKey']) => {
    const idxs = prompts.map((p, i) => p.intentKey === key ? i : -1).filter(i => i >= 0)
    const allSelected = idxs.every(i => selected.has(i))
    setSelected(prev => {
      const s = new Set(prev)
      idxs.forEach(i => allSelected ? s.delete(i) : s.add(i))
      return s
    })
  }, [prompts, selected])

  const selectAll = () => setSelected(new Set(prompts.map((_, i) => i)))
  const deselectAll = () => setSelected(new Set())

  const handleSave = async () => {
    if (selected.size === 0) return
    setSaving(true)
    const toSave = prompts.filter((_, i) => selected.has(i))
    await ctx.handleBatchSavePrompts(toSave)
    setSavedCount(toSave.length)
    setSaving(false)
  }

  const intentLabel = (key: GeneratedPrompt['intentKey']) => ({
    info_cognition: d.intentInfo,
    solution_explore: d.intentExplore,
    comparison_decision: d.intentCompare,
    action_choice: d.intentAction,
  }[key])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-surface rounded-2xl border border-divider shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-6 py-4 border-b border-divider-light flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold text-ink">{d.modalTitle}</h3>
            <p className="text-xs text-ink-3 mt-0.5">{d.modalSubtitle}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-surface-muted rounded-lg transition-colors ml-4 flex-shrink-0">
            <X className="w-4 h-4 text-ink-3" />
          </button>
        </div>

        {/* Select all / none toolbar */}
        {savedCount === null && (
          <div className="px-6 py-2 border-b border-divider-light flex items-center gap-3">
            <button onClick={selectAll} className="text-xs text-ink-3 hover:text-ink transition-colors">{d.selectAll}</button>
            <span className="text-ink-3/40">·</span>
            <button onClick={deselectAll} className="text-xs text-ink-3 hover:text-ink transition-colors">{d.deselectAll}</button>
            <span className="ml-auto text-xs text-ink-3">{selected.size}/{prompts.length}</span>
          </div>
        )}

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {savedCount !== null ? (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
              <div className="w-10 h-10 rounded-full bg-sage-bg flex items-center justify-center">
                <Check className="w-5 h-5 text-sage" />
              </div>
              <p className="text-sm font-semibold text-ink">{d.savedToast(savedCount)}</p>
              <p className="text-xs text-ink-3">{d.skipNote}</p>
              <Link
                href="/dashboard/geo-monitor?tab=prompts"
                onClick={onClose}
                className="mt-2 flex items-center gap-1 text-xs font-medium text-ink-2 hover:text-ink transition-colors"
              >
                {d.goToPrompts} <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          ) : (
            INTENT_ORDER.map(intentKey => {
              const group = prompts.map((p, i) => ({ ...p, idx: i })).filter(p => p.intentKey === intentKey)
              const allGroupSelected = group.every(p => selected.has(p.idx))
              return (
                <div key={intentKey}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${INTENT_COLORS[intentKey]}`}>
                      {intentLabel(intentKey)}
                    </span>
                    <button
                      onClick={() => toggleGroup(intentKey)}
                      className="text-[10px] text-ink-3 hover:text-ink transition-colors"
                    >
                      {allGroupSelected ? d.deselectAll : d.selectAll}
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {group.map(({ template, idx }) => (
                      <button
                        key={idx}
                        onClick={() => toggleOne(idx)}
                        className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all ${
                          selected.has(idx)
                            ? 'border-ink/20 bg-canvas'
                            : 'border-divider-light bg-surface-warm opacity-50'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border transition-colors ${
                          selected.has(idx) ? 'bg-ink border-ink' : 'border-divider bg-surface'
                        }`}>
                          {selected.has(idx) && <Check className="w-2.5 h-2.5 text-ink-inv" />}
                        </div>
                        <span className="text-sm text-ink">{template}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        {savedCount === null && (
          <div className="px-6 py-4 border-t border-divider-light flex items-center justify-between">
            <p className="text-xs text-ink-3">{d.skipNote}</p>
            <button
              onClick={handleSave}
              disabled={selected.size === 0 || saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-ink hover:bg-[#2d2d2c] text-ink-inv rounded-xl text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {saving ? d.saving : `${d.saveBtn} (${selected.size})`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
