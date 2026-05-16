'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { X, Sparkles, Check, ArrowRight, Loader2, RefreshCw, Globe } from 'lucide-react'
import Link from 'next/link'
import { useLanguage } from '@/lib/LanguageContext'
import { useUnified } from '../UnifiedContext'
import { api } from '@/lib/api'
import type { SmartPrompt } from '@/lib/api'

// ── Re-export for backward compat (UnifiedContext imports this) ──────────
export type { SmartPrompt as GeneratedPrompt }

// ── Types ────────────────────────────────────────────────────────────────

type IntentKey = SmartPrompt['intent']
type LayerKey = SmartPrompt['layer']

const INTENT_ORDER: IntentKey[] = [
  'info_cognition', 'solution_explore', 'comparison_decision', 'action_choice',
]

const INTENT_COLORS: Record<IntentKey, string> = {
  info_cognition:      'bg-surface-warm text-ink-2',
  solution_explore:    'bg-sage-bg text-sage',
  comparison_decision: 'bg-caution-bg text-caution',
  action_choice:       'bg-red-soft-bg text-red-soft',
}

const ENGINE_COLORS: Record<string, string> = {
  chatgpt:    'bg-[#10a37f]/10 text-[#10a37f]',
  gemini:     'bg-blue-50 text-blue-600',
  claude:     'bg-amber-50 text-amber-700',
  perplexity: 'bg-purple-50 text-purple-600',
}

// ── Modal ─────────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void
}

export function GeneratePromptsModal({ onClose }: Props) {
  const { t } = useLanguage()
  const ctx = useUnified()
  const d = t.dashboard.discover.generatePrompts

  // ── Generation state ──────────────────────────────────────────────────
  const [prompts, setPrompts] = useState<SmartPrompt[]>([])
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState('')
  const [isFallback, setIsFallback] = useState(false)
  const [cacheHit, setCacheHit] = useState(false)
  const [enginesUsed, setEnginesUsed] = useState<string[]>([])

  // ── Save state ────────────────────────────────────────────────────────
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [saving, setSaving] = useState(false)
  const [savedCount, setSavedCount] = useState<number | null>(null)

  // ── Compute gap domains from current engine's discover vs scan ────────
  const gapDomains = useMemo(() => {
    const discover = ctx.discoverResult
    const scan = ctx.scanResult
    if (!discover) return []
    const scanDomainSet = new Set(
      (scan?.source_domains ?? []).map((s: { domain: string }) => s.domain)
    )
    return discover.source_domains
      .filter(s => {
        const isCore = s.intent_coverage >= 3 || s.prompt_count >= 8
        return isCore && !scanDomainSet.has(s.domain)
      })
      .map(s => s.domain)
      .slice(0, 10)
  }, [ctx.discoverResult, ctx.scanResult])

  // ── Build engine snapshots from all per-engine Discover results ───────
  const engineSnapshots = useMemo(() => {
    const result: Record<string, { domain: string; prompt_count: number; intent_coverage: number }[]> = {}
    for (const [engine, discoverResult] of Object.entries(ctx.discoverResults)) {
      result[engine] = discoverResult.source_domains.map(s => ({
        domain: s.domain,
        prompt_count: s.prompt_count,
        intent_coverage: s.intent_coverage,
      }))
    }
    return result
  }, [ctx.discoverResults])

  // ── Fetch on open ─────────────────────────────────────────────────────
  const fetchPrompts = useCallback(async (forceRegenerate = false) => {
    setGenerating(true)
    setGenError('')
    try {
      const res = await api.generateSmartPrompts({
        brand_name: ctx.brandConfig.brand_name,
        domain: ctx.brandConfig.domain,
        keywords: ctx.brandConfig.keywords,
        competitors: ctx.brandConfig.competitors,
        target_audience: ctx.brandConfig.target_audience,
        engine_snapshots: engineSnapshots,
        gap_domains: gapDomains,
        force_regenerate: forceRegenerate,
      })
      if (res.data) {
        setPrompts(res.data.prompts)
        setIsFallback(res.data.fallback)
        setCacheHit(res.data.cache_hit)
        setEnginesUsed(res.data.engines_used)
        setSelected(new Set(res.data.prompts.map((_, i) => i)))
      } else {
        setGenError(res.error ?? 'Failed to generate prompts')
      }
    } catch (e) {
      setGenError('Failed to generate prompts. Please try again.')
    } finally {
      setGenerating(false)
    }
  }, [ctx.brandConfig, engineSnapshots, gapDomains])

  useEffect(() => { fetchPrompts() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Selection helpers ─────────────────────────────────────────────────
  const toggleOne = (i: number) =>
    setSelected(prev => { const s = new Set(prev); s.has(i) ? s.delete(i) : s.add(i); return s })

  const toggleGroup = useCallback((key: IntentKey) => {
    const idxs = prompts.map((p, i) => p.intent === key ? i : -1).filter(i => i >= 0)
    const allSel = idxs.every(i => selected.has(i))
    setSelected(prev => {
      const s = new Set(prev)
      idxs.forEach(i => allSel ? s.delete(i) : s.add(i))
      return s
    })
  }, [prompts, selected])

  const selectAll = () => setSelected(new Set(prompts.map((_, i) => i)))
  const deselectAll = () => setSelected(new Set())

  // ── Save ──────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (selected.size === 0) return
    setSaving(true)
    const toSave = prompts.filter((_, i) => selected.has(i))
    await ctx.handleBatchSavePrompts(toSave)
    setSavedCount(toSave.length)
    setSaving(false)
  }

  // ── Intent label ──────────────────────────────────────────────────────
  const intentLabel = (key: IntentKey) => ({
    info_cognition: d.intentInfo,
    solution_explore: d.intentExplore,
    comparison_decision: d.intentCompare,
    action_choice: d.intentAction,
  }[key])

  // ── Layer label ───────────────────────────────────────────────────────
  const layerLabel = (layer: LayerKey) => ({
    foundation: d.layerFoundation,
    universal: d.layerUniversal,
    chatgpt_dominant: d.layerChatgpt,
    cross_diverse: d.layerDiverse,
    gap: d.layerGap,
  }[layer] ?? layer)

  const layerColor = (layer: LayerKey) => ({
    foundation: 'bg-surface-muted text-ink-3',
    universal: 'bg-ink/8 text-ink-2',
    chatgpt_dominant: 'bg-[#10a37f]/10 text-[#10a37f]',
    cross_diverse: 'bg-blue-50 text-blue-600',
    gap: 'bg-red-soft-bg text-red-soft',
  }[layer] ?? 'bg-surface-muted text-ink-3')

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-surface rounded-2xl border border-divider shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-6 py-4 border-b border-divider-light flex items-start justify-between">
          <div className="min-w-0 flex-1 pr-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-ink">{d.modalTitle}</h3>
              {cacheHit && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-warm text-ink-3 font-mono">cached</span>
              )}
            </div>
            <p className="text-xs text-ink-3 mt-0.5">
              {isFallback ? d.modalSubtitleFallback : d.modalSubtitle}
            </p>
            {enginesUsed.length > 0 && !isFallback && (
              <div className="flex items-center gap-1 mt-1.5">
                {enginesUsed.map(eng => (
                  <span key={eng} className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${ENGINE_COLORS[eng] ?? 'bg-surface-muted text-ink-3'}`}>
                    {eng}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {!generating && savedCount === null && (
              <button
                onClick={() => fetchPrompts(true)}
                title={d.regenerate}
                className="p-1.5 hover:bg-surface-muted rounded-lg transition-colors text-ink-3 hover:text-ink"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
            <button onClick={onClose} className="p-1 hover:bg-surface-muted rounded-lg transition-colors">
              <X className="w-4 h-4 text-ink-3" />
            </button>
          </div>
        </div>

        {/* Select all toolbar */}
        {!generating && savedCount === null && prompts.length > 0 && (
          <div className="px-6 py-2 border-b border-divider-light flex items-center gap-3">
            <button onClick={selectAll} className="text-xs text-ink-3 hover:text-ink transition-colors">{d.selectAll}</button>
            <span className="text-ink-3/40">·</span>
            <button onClick={deselectAll} className="text-xs text-ink-3 hover:text-ink transition-colors">{d.deselectAll}</button>
            <span className="ml-auto text-xs text-ink-3">{selected.size}/{prompts.length}</span>
          </div>
        )}

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6">

          {/* Loading */}
          {generating && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-ink-3" />
              <p className="text-sm text-ink-3">{d.generating}</p>
            </div>
          )}

          {/* Error */}
          {!generating && genError && (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
              <p className="text-sm text-caution">{genError}</p>
              <button
                onClick={() => fetchPrompts()}
                className="text-xs text-ink-2 hover:text-ink underline"
              >
                Try again
              </button>
            </div>
          )}

          {/* Saved success */}
          {savedCount !== null && (
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
          )}

          {/* Prompts grouped by intent */}
          {!generating && !genError && savedCount === null && prompts.length > 0 && (
            <div className="space-y-5">
              {INTENT_ORDER.map(intentKey => {
                const group = prompts
                  .map((p, i) => ({ ...p, idx: i }))
                  .filter(p => p.intent === intentKey)
                if (group.length === 0) return null
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
                      {group.map(({ template, layer, provenance, idx }) => (
                        <button
                          key={idx}
                          onClick={() => toggleOne(idx)}
                          className={`w-full text-left flex flex-col gap-1.5 px-3 py-2.5 rounded-lg border transition-all ${
                            selected.has(idx)
                              ? 'border-ink/20 bg-canvas'
                              : 'border-divider-light bg-surface-warm opacity-50'
                          }`}
                        >
                          {/* Top row: checkbox + template */}
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border transition-colors ${
                              selected.has(idx) ? 'bg-ink border-ink' : 'border-divider bg-surface'
                            }`}>
                              {selected.has(idx) && <Check className="w-2.5 h-2.5 text-ink-inv" />}
                            </div>
                            <span className="text-sm text-ink leading-snug">{template}</span>
                          </div>

                          {/* Provenance row */}
                          {provenance.target_domain && (
                            <div className="flex items-center gap-1.5 pl-7">
                              {/* Layer badge */}
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${layerColor(layer)}`}>
                                {layerLabel(layer)}
                              </span>
                              {/* Domain */}
                              <span className="text-[10px] text-ink-3 flex items-center gap-0.5">
                                <Globe className="w-2.5 h-2.5" />
                                {provenance.target_domain}
                              </span>
                              {/* Engine dots */}
                              <span className="text-[10px] text-ink-3 ml-auto">
                                {d.enginesCount(provenance.engines.length)}
                              </span>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {!generating && savedCount === null && prompts.length > 0 && (
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
