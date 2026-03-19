'use client'

import { useState, useMemo } from 'react'
import { Tag, Plus, Edit2, Trash2, Save, X, ToggleLeft, ToggleRight, Download, Loader2, Square, CheckCircle, AlertCircle, Filter } from 'lucide-react'
import { useUnified } from '../UnifiedContext'
import { formatPct } from '../shared/ChartComponents'
import { CATEGORY_LABEL_MAP, CATEGORY_COLORS, INTENT_COLORS, autoClassify } from '../shared/constants'

export function PromptsTab() {
  const ctx = useUnified()

  // ── Local state for intent filter ──────────────────────
  const [intentFilter, setIntentFilter] = useState<'all' | 'info_cognition' | 'solution_explore' | 'comparison_decision' | 'action_choice'>('all')

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
    if (intentFilter === 'all') return ctx.filteredPrompts
    const OLD_TO_NEW: Record<string, string> = {
      recommendation: 'action_choice',
      comparison: 'comparison_decision',
      information: 'info_cognition',
      review: 'comparison_decision',
      howto: 'action_choice',
    }
    return ctx.filteredPrompts.filter(p => {
      const resolved = OLD_TO_NEW[p.category] || p.category
      return resolved === intentFilter
    })
  }, [ctx.filteredPrompts, intentFilter])

  // ── CSV export ─────────────────────────────────────────
  const exportCSV = () => {
    const headers = ['Template', 'Category', 'Intent', 'Visibility Rate', 'Avg Position', 'Sentiment', 'Status']
    const rows = ctx.filteredPrompts.map(p => [
      p.template,
      p.category,
      p.intent || '',
      String(p.mention_rate ?? ''),
      String(p.last_position_score ?? ''),
      p.last_sentiment || '',
      p.is_active ? 'Active' : 'Inactive',
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
  const sentimentBadge = (sentiment: string | null | undefined) => {
    if (!sentiment) return <span className="text-xs text-gray-400">--</span>
    const colors: Record<string, string> = {
      positive: 'bg-green-100 text-green-700',
      neutral: 'bg-gray-100 text-gray-600',
      negative: 'bg-red-100 text-red-700',
    }
    return (
      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${colors[sentiment] || 'bg-gray-100 text-gray-600'}`}>
        {sentiment}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* ═══ A) Header bar ═══════════════════════════════ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Tag className="w-5 h-5 text-red-500" />
          <h3 className="text-lg font-semibold text-gray-900">Prompts</h3>
          {ctx.brandConfig.brand_name && (
            <span className="px-2.5 py-0.5 bg-red-50 text-red-700 text-xs font-medium rounded-full">
              {ctx.brandConfig.brand_name}
            </span>
          )}
          <span className="text-sm text-gray-400">{ctx.prompts.length} prompts</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-600 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={() => { ctx.setShowAddPrompt(true); ctx.setPromptError('') }}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Prompt
          </button>
        </div>
      </div>

      {/* ═══ B) Filter tabs ═════════════════════════════ */}
      <div className="flex flex-wrap items-center gap-3">
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
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border border-transparent'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-gray-400" />
          <select
            value={intentFilter}
            onChange={e => setIntentFilter(e.target.value as typeof intentFilter)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
          >
            <option value="all">All Intents</option>
            <option value="info_cognition">Info Cognition</option>
            <option value="solution_explore">Solution Explore</option>
            <option value="comparison_decision">Comparison Decision</option>
            <option value="action_choice">Action Choice</option>
          </select>
        </div>
      </div>

      {/* ═══ C) Batch action bar ════════════════════════ */}
      {ctx.selectedPromptIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <span className="text-sm font-medium text-red-700">
            {ctx.selectedPromptIds.size} selected
          </span>
          <button
            onClick={ctx.toggleSelectAllPrompts}
            className="text-xs text-red-600 hover:text-red-800 font-medium transition-colors"
          >
            {ctx.selectedPromptIds.size === ctx.filteredPrompts.length ? 'Deselect All' : 'Select All'}
          </button>
          <button
            onClick={() => { ctx.toggleSelectAllPrompts() }}
            className="text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors"
          >
            Deselect All
          </button>
          <div className="flex-1" />
          {ctx.batchConfirmStep ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-600 font-medium">
                <AlertCircle className="w-3.5 h-3.5 inline mr-1" />
                Confirm delete {ctx.selectedPromptIds.size} prompts?
              </span>
              <button
                onClick={ctx.handleBatchDelete}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-colors"
              >
                Confirm
              </button>
              <button
                onClick={ctx.cancelBatchDelete}
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={ctx.handleBatchDelete}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-medium rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Selected
            </button>
          )}
        </div>
      )}

      {/* ═══ D) Add / Edit Prompt Form ══════════════════ */}
      {(ctx.showAddPrompt || ctx.editingPrompt) && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h4 className="text-sm font-semibold text-gray-700">
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
            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 resize-none"
          />

          {/* Auto-classify preview */}
          {(ctx.editingPrompt ? editPreview : addPreview) && (
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>Auto-classified:</span>
              {(() => {
                const preview = ctx.editingPrompt ? editPreview : addPreview
                if (!preview) return null
                const catColor = CATEGORY_COLORS[preview.category] || 'bg-gray-100 text-gray-600'
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

          {ctx.promptError && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {ctx.promptError}
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={ctx.editingPrompt ? ctx.handleUpdatePrompt : ctx.handleAddPrompt}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
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
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-sm font-medium transition-colors"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ═══ E) Prompt Data Table ═══════════════════════ */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {displayPrompts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-3 text-left">
                    <button
                      onClick={ctx.toggleSelectAllPrompts}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      {ctx.selectedPromptIds.size === ctx.filteredPrompts.length && ctx.filteredPrompts.length > 0
                        ? <CheckCircle className="w-4 h-4 text-red-500" />
                        : <Square className="w-4 h-4" />
                      }
                    </button>
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Template</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Category</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Intent</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Visibility Rate</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Avg Position</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Sentiment</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">Status</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayPrompts.map(prompt => {
                  const isSelected = ctx.selectedPromptIds.has(prompt.id)
                  const catColor = CATEGORY_COLORS[prompt.category] || 'bg-gray-100 text-gray-600'
                  const catLabel = CATEGORY_LABEL_MAP[prompt.category] || prompt.category
                  const intentConfig = INTENT_COLORS[prompt.intent] || INTENT_COLORS[prompt.category]
                  const mentionRate = prompt.mention_rate ?? 0
                  const avgPos = prompt.last_position_score
                  const isToggling = ctx.togglingPromptId === prompt.id

                  return (
                    <tr key={prompt.id} className={`transition-colors ${isSelected ? 'bg-red-50/30' : 'hover:bg-gray-50/50'}`}>
                      {/* Checkbox */}
                      <td className="px-3 py-3">
                        <button
                          onClick={() => ctx.togglePromptSelect(prompt.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {isSelected
                            ? <CheckCircle className="w-4 h-4 text-red-500" />
                            : <Square className="w-4 h-4" />
                          }
                        </button>
                      </td>

                      {/* Template */}
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-[300px]">
                        <span title={prompt.template}>
                          {prompt.template.length > 60 ? prompt.template.slice(0, 60) + '...' : prompt.template}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${catColor}`}>
                          {catLabel}
                        </span>
                      </td>

                      {/* Intent */}
                      <td className="px-4 py-3">
                        {intentConfig ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${intentConfig.color}`}>
                            {intentConfig.icon} {intentConfig.label}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">{prompt.intent || '—'}</span>
                        )}
                      </td>

                      {/* Visibility Rate */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${
                                mentionRate >= 60 ? 'bg-green-500' : mentionRate >= 30 ? 'bg-yellow-500' : 'bg-red-400'
                              }`}
                              style={{ width: `${Math.min(mentionRate, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono font-medium text-gray-800">
                            {formatPct(mentionRate)}
                          </span>
                        </div>
                      </td>

                      {/* Avg Position */}
                      <td className="px-4 py-3 text-right text-sm font-mono text-gray-700">
                        {avgPos != null ? avgPos.toFixed(1) : '—'}
                      </td>

                      {/* Sentiment */}
                      <td className="px-4 py-3">
                        {sentimentBadge(prompt.last_sentiment)}
                      </td>

                      {/* Status toggle */}
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => ctx.handleTogglePrompt(prompt.id, prompt.is_active)}
                          disabled={isToggling}
                          className="text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
                          title={prompt.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {isToggling ? (
                            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                          ) : prompt.is_active ? (
                            <ToggleRight className="w-5 h-5 text-green-500" />
                          ) : (
                            <ToggleLeft className="w-5 h-5 text-gray-300" />
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => { ctx.setEditingPrompt(prompt); ctx.setPromptError('') }}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => ctx.handleDeletePrompt(prompt.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
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
          <div className="text-center py-12 text-gray-400">
            <Tag className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium">No prompts match your filters</p>
            <p className="text-xs mt-1">Try adjusting your filter or add a new prompt.</p>
          </div>
        )}
      </div>
    </div>
  )
}
