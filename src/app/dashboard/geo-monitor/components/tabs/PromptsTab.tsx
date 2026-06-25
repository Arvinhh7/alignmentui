'use client'

import { useState, useMemo } from 'react'
import { Tag, Plus, Edit2, Trash2, Save, X, Download, Loader2, Square, CheckCircle, AlertCircle, Filter, Search, StopCircle, PauseCircle, PlayCircle } from 'lucide-react'
import { useUnified } from '../UnifiedContext'
import { CATEGORY_LABEL_MAP, CATEGORY_COLORS, INTENT_COLORS, autoClassify } from '../shared/constants'
import PromptDetailDrawer from '../PromptDetailDrawer'

const COUNTRY_LABELS: Record<string, string> = {
  'united states': 'US',
  usa: 'US',
  us: 'US',
  'united kingdom': 'GB',
  uk: 'GB',
  gb: 'GB',
  canada: 'CA',
  ca: 'CA',
  australia: 'AU',
  au: 'AU',
  germany: 'DE',
  de: 'DE',
  france: 'FR',
  fr: 'FR',
  japan: 'JP',
  jp: 'JP',
  china: 'CN',
  cn: 'CN',
}

function normalizeCountry(value: string | null | undefined) {
  const raw = (value || 'US').trim()
  if (!raw) return 'US'
  return COUNTRY_LABELS[raw.toLowerCase()] || raw.slice(0, 2).toUpperCase()
}

function flagForCountry(code: string) {
  if (!/^[A-Z]{2}$/.test(code)) return '🌐'
  return String.fromCodePoint(...code.split('').map(char => 127397 + char.charCodeAt(0)))
}

function hasPromptScan(prompt: { scan_count?: number | null; last_scanned_at?: string | null }) {
  return Boolean(prompt.last_scanned_at) || (prompt.scan_count ?? 0) > 0
}

function hasPromptMention(prompt: { last_mentioned?: boolean | null; mention_rate?: number | null }) {
  return prompt.last_mentioned === true || (prompt.mention_rate ?? 0) > 0
}

function clampPct(value: number | null | undefined) {
  if (value == null || Number.isNaN(Number(value))) return 0
  return Math.max(0, Math.min(100, Number(value)))
}

function promptAiVolume(prompt: {
  scan_count?: number | null
  last_scanned_at?: string | null
  last_mentioned?: boolean | null
  mention_rate?: number | null
  last_quality_score?: number | null
  last_mention_count?: number | null
}) {
  if (!hasPromptScan(prompt)) return null
  const visibilityLevel = prompt.last_mentioned === true ? 100 : 0
  const mentionFrequency = clampPct(prompt.mention_rate)
  const citationPresence =
    (prompt.last_quality_score ?? 0) > 0 || (prompt.last_mention_count ?? 0) > 0 ? 100 : 0

  // Weights total 90%, so normalize to a whole-number 0-100 product score.
  return Math.round(clampPct(
    ((visibilityLevel * 0.4) + (mentionFrequency * 0.25) + (citationPresence * 0.25)) / 0.9,
  ))
}

function promptStatus(prompt: { is_active: boolean; scan_count?: number | null; last_scanned_at?: string | null }) {
  if (prompt.is_active) {
    return {
      label: 'Active',
      title: prompt.last_scanned_at
        ? `Enabled for scheduled runs. Last run: ${new Date(prompt.last_scanned_at).toLocaleString()}`
        : 'Enabled for scheduled runs. Waiting for the first completed run.',
      className: 'border border-sage/30 bg-sage-bg text-sage shadow-[0_0_0_1px_rgba(77,127,91,0.08)]',
      dotClassName: 'bg-sage shadow-[0_0_0_4px_rgba(77,127,91,0.14)]',
    }
  }
  return {
    label: 'Inactive',
    title: 'This prompt is inactive and is not included in manual or scheduled runs.',
    className: 'border border-divider-light bg-surface-muted text-ink-3',
    dotClassName: 'bg-ink-3/50',
  }
}

export function PromptsTab() {
  const ctx = useUnified()
  // Step 1: which prompt's drill-down dashboard is open (null = closed).
  const [detailPromptId, setDetailPromptId] = useState<string | null>(null)
  const quotaReached = !ctx.promptQuota.isUnlimited && ctx.promptQuota.activeCount >= ctx.promptQuota.limit
  const totalPromptCount = ctx.prompts.length
  const quotaLabel = ctx.promptQuota.isUnlimited
    ? 'Unlimited slots'
    : `${Math.max(0, ctx.promptQuota.limit - ctx.promptQuota.activeCount)} slots left`

  // ── Local state for intent filter ──────────────────────
  const [intentFilter, setIntentFilter] = useState<'all' | 'info_cognition' | 'solution_explore' | 'comparison_decision' | 'action_choice'>('all')
  const [promptSearch, setPromptSearch] = useState('')

  // ── Auto-classify preview for add/edit forms ───────────
  const addPreview = useMemo(
    () => ctx.newPromptForm.template.trim() ? autoClassify(ctx.newPromptForm.template) : null,
    [ctx.newPromptForm.template],
  )
  const editPreview = useMemo(
    () => ctx.editingPrompt?.template.trim() ? autoClassify(ctx.editingPrompt.template) : null,
    [ctx.editingPrompt?.template],
  )

  // ── Filtered prompts with intent filter applied ────────
  const displayPrompts = useMemo(() => {
    const search = promptSearch.trim().toLowerCase()
    const OLD_TO_NEW: Record<string, string> = {
      recommendation: 'action_choice',
      comparison: 'comparison_decision',
      information: 'info_cognition',
      review: 'comparison_decision',
      howto: 'action_choice',
    }
    return ctx.filteredPrompts.filter(p => {
      const resolved = OLD_TO_NEW[p.category] || p.category
      const matchesIntent = intentFilter === 'all' || resolved === intentFilter
      const matchesSearch = !search
        || p.template.toLowerCase().includes(search)
        || (p.intent || '').toLowerCase().includes(search)
        || (p.category || '').toLowerCase().includes(search)
      return matchesIntent && matchesSearch
    })
  }, [ctx.filteredPrompts, intentFilter, promptSearch])
  const visiblePromptCount = displayPrompts.length

  const brandPromptDiagnostic = useMemo(() => {
    const scan = ctx.scanResult
    if (!scan || scan.visibility_score > 0 || scan.mentions_found > 0) return null
    const activePrompts = ctx.prompts.filter(p => p.is_active)
    if (activePrompts.length === 0) return null
    const hasBrandPrompts = activePrompts.some(p => p.template?.includes('{brand}'))
    if (hasBrandPrompts) return null
    return {
      count: scan.total_prompts || activePrompts.length,
      brand: ctx.brandConfig.brand_name || 'your brand',
    }
  }, [ctx.scanResult, ctx.prompts, ctx.brandConfig.brand_name])

  // ── CSV export ─────────────────────────────────────────
  const exportCSV = () => {
    const headers = ['Prompt', 'Intent', 'AI Volume', 'Avg Position', 'Sentiment', 'Status', 'Enabled', 'Country']
    const rows = displayPrompts.map(p => [
      p.template,
      p.intent || '',
      (() => {
        const score = promptAiVolume(p)
        return score == null ? '' : String(score)
      })(),
      hasPromptMention(p) ? String(p.last_position_score ?? '') : '',
      hasPromptMention(p) ? (p.last_sentiment || '') : 'not_mentioned',
      promptStatus(p).label,
      p.is_active ? 'Active' : 'Inactive',
      normalizeCountry(p.location),
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `prompts_${Date.now()}.csv`
    a.click()
  }

  // ── Sentiment badge helper ─────────────────────────────
  const sentimentBadge = (sentiment: string | null | undefined, state: 'pending' | 'not_mentioned' | 'mentioned') => {
    if (state === 'pending') return <span className="text-xs text-ink-3">—</span>
    if (state === 'not_mentioned') {
      return (
        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-caution-bg text-caution">
          Not mentioned
        </span>
      )
    }
    if (!sentiment) return <span className="text-xs text-ink-3">—</span>
    const colors: Record<string, string> = {
      positive: 'bg-sage-bg text-sage',
      neutral: 'bg-surface-muted text-ink-3',
      negative: 'bg-red-soft-bg text-red-soft',
    }
    return (
      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${colors[sentiment] || 'bg-surface-muted text-ink-3'}`}>
        {sentiment}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* ═══ A) Header bar ═══════════════════════════════ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Tag className="w-5 h-5 text-ink-3" />
          <h3 className="text-lg font-semibold text-ink">Prompts</h3>
          {ctx.brandConfig.brand_name && (
            <span className="px-2.5 py-0.5 bg-surface-warm text-ink text-xs font-medium rounded-full">
              {ctx.brandConfig.brand_name}
            </span>
          )}
          <span className="text-sm text-ink-3">
            <span className="font-semibold text-ink-2">{ctx.promptQuota.activeCount}</span> active
            <span className="text-ink-3/60"> / {totalPromptCount} total prompts</span>
          </span>
          <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
            quotaReached ? 'bg-caution-bg text-caution' : 'bg-sage-bg text-sage'
          }`}>
            {quotaLabel}
          </span>
          {(ctx.promptFilter !== 'all' || intentFilter !== 'all' || promptSearch.trim()) && (
            <span className="text-xs text-ink-3">
              Showing {visiblePromptCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {ctx.isConfigured && (
            ctx.isScanning ? (
              <button
                onClick={ctx.handleStopScan}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-caution-bg text-caution rounded-lg text-sm font-medium hover:bg-caution/20 transition-colors"
              >
                <StopCircle className="w-4 h-4" />
                Stop Run
              </button>
            ) : (
              <button
                onClick={() => ctx.handleRunScan()}
                disabled={ctx.isScanning}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-ink hover:bg-[#2d2d2c] text-ink-inv rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                title="Pull fresh results for new or stale prompts now. Your tracking also refreshes automatically every day in the background."
              >
                <Search className="w-4 h-4" />
                Refresh
              </button>
            )
          )}
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-canvas hover:bg-surface-muted border border-divider rounded-lg text-sm text-ink-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={() => {
              if (quotaReached) {
                ctx.setPromptError(`Your ${ctx.promptQuota.plan} plan includes ${ctx.promptQuota.limit} active monitored prompts. Upgrade to add more prompts.`)
                ctx.setShowAddPrompt(false)
                return
              }
              ctx.setShowAddPrompt(true)
              ctx.setPromptError('')
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              quotaReached
                ? 'bg-[#F9D66B] hover:bg-[#FFE38A] text-ink'
                : 'bg-ink hover:bg-[#2d2d2c] text-ink-inv'
            }`}
          >
            <Plus className="w-4 h-4" />
            {quotaReached ? 'Upgrade Plan' : 'Add Prompt'}
          </button>
        </div>
      </div>

      {/* ═══ B) Filter tabs ═════════════════════════════ */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-3" />
          <input
            value={promptSearch}
            onChange={e => setPromptSearch(e.target.value)}
            placeholder="Search prompts..."
            className="w-full pl-9 pr-3 py-2 border border-divider rounded-lg text-xs text-ink-2 bg-surface focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink"
          />
        </div>

        <div className="flex gap-1">
          {([
            { key: 'active' as const, label: 'Active' },
            { key: 'inactive' as const, label: 'Inactive' },
            { key: 'all' as const, label: 'All' },
          ]).map(f => (
            <button
              key={f.key}
              onClick={() => ctx.setPromptFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                ctx.promptFilter === f.key
                  ? 'bg-ink text-ink-inv border border-ink'
                  : 'bg-canvas text-ink-3 hover:bg-surface-muted border border-transparent'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-ink-3" />
          <select
            value={intentFilter}
            onChange={e => setIntentFilter(e.target.value as typeof intentFilter)}
            className="px-3 py-1.5 border border-divider rounded-lg text-xs text-ink-2 focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink"
          >
            <option value="all">All Intents</option>
            <option value="info_cognition">Info Cognition</option>
            <option value="solution_explore">Solution Explore</option>
            <option value="comparison_decision">Comparison Decision</option>
            <option value="action_choice">Action Choice</option>
          </select>
        </div>
      </div>

      {brandPromptDiagnostic && (
        <div className="rounded-xl border border-caution/30 bg-caution-bg px-4 py-3 text-caution">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">
                0 of {brandPromptDiagnostic.count} prompts mentioned "{brandPromptDiagnostic.brand}"
              </p>
              <p className="mt-1 text-xs leading-relaxed">
                Your active prompts are generic discovery queries. Add at least one prompt that directly references the brand to match the Analysis recommendation.
              </p>
              <div className="mt-2 rounded-lg bg-caution-bg px-3 py-2 text-xs font-mono">
                Try: <strong>&ldquo;What is {brandPromptDiagnostic.brand}?&rdquo;</strong> or <strong>&ldquo;Tell me about {brandPromptDiagnostic.brand}&apos;s features&rdquo;</strong>
              </div>
            </div>
            <button
              onClick={() => {
                ctx.setNewPromptForm({ template: `What is ${brandPromptDiagnostic.brand}?` })
                ctx.setShowAddPrompt(true)
                ctx.setPromptError('')
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-ink-inv hover:bg-[#2d2d2c] transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add brand prompt
            </button>
          </div>
        </div>
      )}

      {ctx.promptError && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-red-soft/25 bg-red-soft-bg px-4 py-3 text-sm text-red-soft">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{ctx.promptError}</span>
          </div>
          {ctx.promptError.toLowerCase().includes('upgrade') && (
            <button
              onClick={ctx.handleUpgradePromptPlan}
              className="rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-ink-inv hover:bg-[#2d2d2c] transition-colors"
            >
              Upgrade plan
            </button>
          )}
        </div>
      )}

      {/* ═══ C) Batch action bar ════════════════════════ */}
      {ctx.selectedPromptIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 bg-surface-warm border border-divider rounded-lg px-4 py-3">
          <span className="text-sm font-medium text-ink">
            {ctx.selectedPromptIds.size} selected
          </span>
          <button
            onClick={ctx.toggleSelectAllPrompts}
            className="text-xs text-ink-2 hover:text-ink font-medium transition-colors"
          >
            {ctx.selectedPromptIds.size === ctx.filteredPrompts.length ? 'Deselect All' : 'Select All'}
          </button>
          <button
            onClick={() => { ctx.toggleSelectAllPrompts() }}
            className="text-xs text-ink-3 hover:text-ink-2 font-medium transition-colors"
          >
            Deselect All
          </button>
          <div className="flex-1" />
          {ctx.batchConfirmStep ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-soft font-medium">
                <AlertCircle className="w-3.5 h-3.5 inline mr-1" />
                Confirm delete {ctx.selectedPromptIds.size} prompts?
              </span>
              <button
                onClick={ctx.handleBatchDelete}
                className="px-3 py-1 bg-ink hover:bg-[#2d2d2c] text-ink-inv text-xs font-medium rounded-lg transition-colors"
              >
                Confirm
              </button>
              <button
                onClick={ctx.cancelBatchDelete}
                className="px-3 py-1 bg-surface-warm hover:bg-surface-muted text-ink-2 text-xs font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={ctx.handleBatchDelete}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-soft-bg hover:bg-red-soft/20 text-red-soft text-xs font-medium rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Selected
            </button>
          )}
        </div>
      )}

      {/* ═══ D) Add / Edit Prompt Form ══════════════════ */}
      {(ctx.showAddPrompt || ctx.editingPrompt) && (
        <div className="bg-surface rounded-xl border border-divider p-5 space-y-4">
          <h4 className="text-sm font-semibold text-ink-2">
            {ctx.editingPrompt ? 'Edit Prompt' : 'Add New Prompt'}
          </h4>

          <textarea
            value={ctx.editingPrompt ? ctx.editingPrompt.template : ctx.newPromptForm.template}
            onChange={e => {
              if (ctx.editingPrompt) {
                ctx.setEditingPrompt({ ...ctx.editingPrompt, template: e.target.value })
              } else {
                ctx.setNewPromptForm({ template: e.target.value })
              }
            }}
            placeholder="Enter prompt template... Use {brand} as a placeholder for the brand name."
            rows={3}
            className="w-full px-4 py-3 border border-divider rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink resize-none"
          />

          {/* Auto-classify preview */}
          {(ctx.editingPrompt ? editPreview : addPreview) && (
            <div className="flex items-center gap-3 text-xs text-ink-3">
              <span>Auto-classified:</span>
              {(() => {
                const preview = ctx.editingPrompt ? editPreview : addPreview
                if (!preview) return null
                const catColor = CATEGORY_COLORS[preview.category] || 'bg-surface-muted text-ink-3'
                const intentConfig = INTENT_COLORS[preview.intent]
                return (
                  <>
                    <span className={`px-2 py-0.5 rounded-full font-medium ${catColor}`}>
                      {CATEGORY_LABEL_MAP[preview.category] || preview.category}
                    </span>
                    {intentConfig && (
                      <span className={`px-2 py-0.5 rounded-full font-medium ${intentConfig.color}`}>
                        {intentConfig.icon} {intentConfig.label}
                      </span>
                    )}
                  </>
                )
              })()}
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={ctx.editingPrompt ? ctx.handleUpdatePrompt : ctx.handleAddPrompt}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-ink hover:bg-[#2d2d2c] text-ink-inv rounded-lg text-sm font-medium transition-colors"
            >
              <Save className="w-4 h-4" />
              {ctx.editingPrompt ? 'Update' : 'Save'}
            </button>
            <button
              onClick={() => {
                if (ctx.editingPrompt) {
                  ctx.setEditingPrompt(null)
                } else {
                  ctx.setShowAddPrompt(false)
                }
                ctx.setPromptError('')
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-surface-warm hover:bg-surface-muted text-ink-2 rounded-lg text-sm font-medium transition-colors"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ═══ E) Prompt Data Table ═══════════════════════ */}
      <div className="bg-surface rounded-xl border border-divider overflow-hidden">
        {displayPrompts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-canvas">
                  <th className="px-3 py-3 text-left">
                    <button
                      onClick={ctx.toggleSelectAllPrompts}
                      className="text-ink-3 hover:text-ink-2"
                    >
                      {ctx.selectedPromptIds.size === ctx.filteredPrompts.length && ctx.filteredPrompts.length > 0
                        ? <CheckCircle className="w-4 h-4 text-ink" />
                        : <Square className="w-4 h-4" />
                      }
                    </button>
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-ink-3 uppercase tracking-wider text-left">Prompt</th>
                  <th className="px-4 py-3 text-xs font-medium text-ink-3 uppercase tracking-wider text-left">Intent</th>
                  <th
                    className="px-4 py-3 text-xs font-medium text-ink-3 uppercase tracking-wider text-right"
                    title="AI Volume, 0-100. Weighted from visibility level (40%), mention frequency (25%), and citation presence (25%)."
                  >
                    AI Volume
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-ink-3 uppercase tracking-wider text-right">Avg Position</th>
                  <th className="px-4 py-3 text-xs font-medium text-ink-3 uppercase tracking-wider text-left">Sentiment</th>
                  <th className="px-4 py-3 text-xs font-medium text-ink-3 uppercase tracking-wider text-center">Status</th>
                  <th className="px-4 py-3 text-xs font-medium text-ink-3 uppercase tracking-wider text-left">Country</th>
                  <th className="px-4 py-3 text-xs font-medium text-ink-3 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider-light">
                {displayPrompts.map(prompt => {
                  const isSelected = ctx.selectedPromptIds.has(prompt.id)
                  const intentConfig = INTENT_COLORS[prompt.intent] || INTENT_COLORS[prompt.category]
                  const hasScan = hasPromptScan(prompt)
                  const hasMention = hasPromptMention(prompt)
                  const aiVolume = hasScan ? promptAiVolume(prompt) : null
                  const avgPos = hasMention ? prompt.last_position_score : null
                  const sentimentState = !hasScan ? 'pending' : hasMention ? 'mentioned' : 'not_mentioned'
                  const isToggling = ctx.togglingPromptId === prompt.id
                  const country = normalizeCountry(prompt.location)
                  const status = promptStatus(prompt)

                  return (
                    <tr key={prompt.id} className={`transition-colors ${isSelected ? 'bg-canvas' : 'hover:bg-surface-warm'}`}>
                      {/* Checkbox */}
                      <td className="px-3 py-3">
                        <button
                          onClick={() => ctx.togglePromptSelect(prompt.id)}
                          className="text-ink-3 hover:text-ink-2"
                        >
                          {isSelected
                            ? <CheckCircle className="w-4 h-4 text-ink" />
                            : <Square className="w-4 h-4" />
                          }
                        </button>
                      </td>

                      {/* Prompt — click to open the per-prompt dashboard */}
                      <td className="px-4 py-3 text-sm text-ink min-w-[320px] max-w-[520px]">
                        <button
                          type="button"
                          onClick={() => ctx.activeCustomerId && setDetailPromptId(prompt.id)}
                          disabled={!ctx.activeCustomerId}
                          title={ctx.activeCustomerId ? prompt.template : 'Select a customer to view prompt detail'}
                          className="text-left hover:text-sage hover:underline underline-offset-2 transition-colors disabled:hover:text-ink disabled:hover:no-underline disabled:cursor-default"
                        >
                          {prompt.template.length > 96 ? prompt.template.slice(0, 96) + '...' : prompt.template}
                        </button>
                      </td>

                      {/* Intent */}
                      <td className="px-4 py-3">
                        {intentConfig ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${intentConfig.color}`}>
                            {intentConfig.icon} {intentConfig.label}
                          </span>
                        ) : (
                          <span className="text-xs text-ink-3">{prompt.intent || '—'}</span>
                        )}
                      </td>

                      {/* AI Volume */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-surface-warm rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${
                                (aiVolume ?? 0) >= 60 ? 'bg-sage' : (aiVolume ?? 0) >= 30 ? 'bg-caution' : 'bg-red-soft'
                              }`}
                              style={{ width: `${Math.min(aiVolume ?? 0, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono font-medium text-ink">
                            {aiVolume == null ? '—' : aiVolume}
                          </span>
                        </div>
                      </td>

                      {/* Avg Position */}
                      <td className="px-4 py-3 text-right text-sm font-mono text-ink-2">
                        {avgPos != null ? avgPos.toFixed(1) : '—'}
                      </td>

                      {/* Sentiment */}
                      <td className="px-4 py-3">
                        {sentimentBadge(prompt.last_sentiment, sentimentState)}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex min-w-[88px] justify-center items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${status.className}`}
                          title={status.title}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${status.dotClassName}`} />
                          {status.label}
                        </span>
                      </td>

                      {/* Country */}
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-2">
                          <span aria-hidden="true">{flagForCountry(country)}</span>
                          {country}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => ctx.handleTogglePrompt(prompt.id, prompt.is_active)}
                            disabled={isToggling || ctx.isScanning}
                            className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                              prompt.is_active
                                ? 'hover:bg-caution-bg text-ink-3 hover:text-caution'
                                : 'hover:bg-sage-bg text-ink-3 hover:text-sage'
                            }`}
                            title={prompt.is_active ? 'Set inactive' : 'Set active'}
                          >
                            {isToggling
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : prompt.is_active
                                ? <PauseCircle className="w-3.5 h-3.5" />
                                : <PlayCircle className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => { ctx.setEditingPrompt(prompt); ctx.setPromptError('') }}
                            className="p-1.5 rounded-lg hover:bg-surface-warm text-ink-3 hover:text-ink-2 transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => ctx.handleDeletePrompt(prompt.id)}
                            className="p-1.5 rounded-lg hover:bg-red-soft-bg text-ink-3 hover:text-red-soft transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-ink-3">
            <Tag className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium">No prompts match your filters</p>
            <p className="text-xs mt-1">Try adjusting your filter or add a new prompt.</p>
          </div>
        )}
      </div>

      {/* Step 1: per-prompt drill-down dashboard */}
      {detailPromptId && ctx.activeCustomerId && (
        <PromptDetailDrawer
          promptId={detailPromptId}
          customerId={ctx.activeCustomerId}
          onClose={() => setDetailPromptId(null)}
        />
      )}
    </div>
  )
}
