'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { api, MonitorPrompt, CreditBalance } from '@/lib/api'
import { useToast } from '@/components/Toast'
import { PromptsTableSkeleton } from '@/components/Skeleton'
import {
  MessageSquare, Plus, Trash2, Edit2, Save, X, Filter,
  ToggleLeft, ToggleRight, AlertCircle, Download, Info,
  Sparkles, Eye, ThumbsUp, TrendingUp, Target, BarChart3,
  Loader2, ArrowRight, Zap,
} from 'lucide-react'

// ─── Shared constants (mirrored from geo-monitor) ─────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  info_cognition:      'bg-blue-100 text-blue-700',
  solution_explore:    'bg-teal-100 text-teal-700',
  comparison_decision: 'bg-orange-100 text-orange-700',
  action_choice:       'bg-red-100 text-red-700',
  recommendation:      'bg-red-100 text-red-700',
  comparison:          'bg-orange-100 text-orange-700',
  information:         'bg-blue-100 text-blue-700',
  review:              'bg-orange-100 text-orange-700',
  howto:               'bg-red-100 text-red-700',
}

const CATEGORY_LABEL_MAP: Record<string, string> = {
  info_cognition:      '🧠 Info Cognition',
  solution_explore:    '🔍 Solution Explore',
  comparison_decision: '⚖️ Compare & Decide',
  action_choice:       '🚀 Action Choice',
  recommendation:      '🚀 Action Choice',
  comparison:          '⚖️ Compare & Decide',
  information:         '🧠 Info Cognition',
  review:              '⚖️ Compare & Decide',
  howto:               '🚀 Action Choice',
}

const OLD_CAT_TO_INTENT: Record<string, string> = {
  recommendation: 'action_choice',
  comparison:     'comparison_decision',
  information:    'info_cognition',
  review:         'comparison_decision',
  howto:          'action_choice',
}

function resolveIntent(category: string): string {
  return OLD_CAT_TO_INTENT[category] || category
}

const CATEGORY_RULES: Record<string, string[]> = {
  info_cognition:      ['what is', 'tell me about', 'explain', 'features', 'overview', 'describe', 'who is', 'define', 'history of'],
  solution_explore:    ['what are the', 'which', 'options', 'solutions', 'tools', 'alternatives', 'suggest', 'list', 'explore', 'find', 'looking for'],
  comparison_decision: ['compare', 'vs', 'versus', 'difference', 'better than', 'pros and cons', 'review', 'evaluation'],
  action_choice:       ['recommend', 'best', 'top', 'should i use', 'worth', 'how to', 'how do', 'tutorial', 'guide', 'step by step'],
}

function autoClassify(template: string): string {
  const lower = template.toLowerCase()
  const scores: Record<string, number> = {}
  for (const [cat, keywords] of Object.entries(CATEGORY_RULES)) {
    scores[cat] = keywords.filter(kw => lower.includes(kw)).length
  }
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]
  return best && best[1] > 0 ? best[0] : 'info_cognition'
}

const SUB_TYPE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  primary_recommendation: { label: 'Primary Recommendation', icon: '🏆', color: 'bg-green-100 text-green-800' },
  alternative_option:     { label: 'Alternative Option',     icon: '🔄', color: 'bg-blue-100 text-blue-800' },
  feature_highlight:      { label: 'Feature Highlight',      icon: '⭐', color: 'bg-amber-100 text-amber-800' },
  use_case:               { label: 'Use Case',               icon: '🎯', color: 'bg-purple-100 text-purple-800' },
  industry_context:       { label: 'Industry Context',       icon: '🏢', color: 'bg-indigo-100 text-indigo-800' },
  warning_caution:        { label: 'Warning / Caution',      icon: '⚠️', color: 'bg-red-100 text-red-800' },
  passing_reference:      { label: 'Passing Reference',      icon: '💬', color: 'bg-yellow-100 text-yellow-800' },
  not_mentioned:          { label: 'Not Mentioned',          icon: '❌', color: 'bg-red-50 text-red-700' },
}

const BRAND_CONFIG_KEY = 'alignment_monitor_brand_config'

function getBrandName(): string {
  if (typeof window === 'undefined') return ''
  try {
    const raw = localStorage.getItem(BRAND_CONFIG_KEY)
    return raw ? JSON.parse(raw).brand_name || '' : ''
  } catch { return '' }
}

// ─── Stats Banner ─────────────────────────────────────────────────────────────
function StatBanner({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-gray-500 mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── Intent Badge ─────────────────────────────────────────────────────────────
function IntentBadge({ category }: { category: string }) {
  const resolved = resolveIntent(category)
  const color = CATEGORY_COLORS[resolved] || 'bg-gray-100 text-gray-600'
  const label = CATEGORY_LABEL_MAP[resolved] || resolved
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${color}`}>{label}</span>
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PromptsPage() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [prompts, setPrompts] = useState<MonitorPrompt[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [credits, setCredits] = useState<CreditBalance | null>(null)
  const [brandName, setBrandName] = useState('')

  // Form state
  const [showAdd, setShowAdd] = useState(false)
  const [newTemplate, setNewTemplate] = useState('')
  const [editingPrompt, setEditingPrompt] = useState<MonitorPrompt | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Filter state
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active')
  const [intentFilter, setIntentFilter] = useState<string>('all')

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBatchDeleting, setIsBatchDeleting] = useState(false)
  const [batchConfirmStep, setBatchConfirmStep] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // ── Load data ────────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setIsLoading(true)
    setBrandName(getBrandName())
    try {
      const [promptsRes, creditsRes] = await Promise.allSettled([
        api.getMonitorPrompts(false),
        user?.id ? api.getCredits(user.id) : Promise.resolve({ data: null }),
      ])
      if (promptsRes.status === 'fulfilled' && promptsRes.value.data) {
        setPrompts(promptsRes.value.data)
        // Persist count so Sidebar can show badge without extra API call
        try { localStorage.setItem('alignment_prompts_count', String(promptsRes.value.data.length)) } catch {}
      }
      if (creditsRes.status === 'fulfilled' && creditsRes.value.data) {
        setCredits(creditsRes.value.data)
      }
    } catch { /* non-critical */ } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    const handler = () => { if (user?.id) api.getCredits(user.id).then(r => { if (r.data) setCredits(r.data) }) }
    window.addEventListener('creditsUsed', handler)
    return () => window.removeEventListener('creditsUsed', handler)
  }, [user?.id])

  // ── Filtered prompts ──────────────────────────────────────────────────────────
  const filteredPrompts = useMemo(() => {
    let list = prompts
    if (statusFilter === 'active') list = list.filter(p => p.is_active)
    else if (statusFilter === 'inactive') list = list.filter(p => !p.is_active)
    if (intentFilter !== 'all') {
      list = list.filter(p => {
        const resolved = resolveIntent(p.category)
        return resolved === intentFilter
      })
    }
    return list
  }, [prompts, statusFilter, intentFilter])

  const activeCount   = prompts.filter(p => p.is_active).length
  const inactiveCount = prompts.filter(p => !p.is_active).length
  const withScanData  = prompts.filter(p => p.last_scanned_at).length
  const visibleCount  = prompts.filter(p => p.last_mentioned === true).length

  // ── CRUD handlers ─────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!newTemplate.trim()) return
    setIsSaving(true)
    try {
      const category = autoClassify(newTemplate)
      const res = await api.createMonitorPrompt({ template: newTemplate.trim(), category })
      if (res.error) { toast.error('Failed to add', res.error); return }
      if (res.data) {
        setPrompts(prev => {
          const next = [res.data!, ...prev]
          try { localStorage.setItem('alignment_prompts_count', String(next.length)) } catch {}
          return next
        })
      }
      setNewTemplate('')
      setShowAdd(false)
      toast.success('Prompt added', 'Your new prompt is now active.')
    } catch { toast.error('Failed to add prompt') } finally { setIsSaving(false) }
  }

  const handleUpdate = async () => {
    if (!editingPrompt || !editingPrompt.template.trim()) return
    setIsSaving(true)
    try {
      const res = await api.updateMonitorPrompt(editingPrompt.id, { template: editingPrompt.template })
      if (res.error) { toast.error('Update failed', res.error); return }
      if (res.data) setPrompts(prev => prev.map(p => p.id === res.data!.id ? res.data! : p))
      setEditingPrompt(null)
      toast.success('Prompt updated')
    } catch { toast.error('Failed to update prompt') } finally { setIsSaving(false) }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await api.deleteMonitorPrompt(id)
      setPrompts(prev => {
        const next = prev.filter(p => p.id !== id)
        try { localStorage.setItem('alignment_prompts_count', String(next.length)) } catch {}
        return next
      })
      setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n })
      toast.success('Prompt deleted')
    } catch { toast.error('Delete failed') } finally { setDeletingId(null) }
  }

  const handleToggle = async (id: string, isActive: boolean) => {
    setTogglingId(id)
    try {
      const res = await api.toggleMonitorPrompt(id)
      if (res.data) setPrompts(prev => prev.map(p => p.id === res.data!.id ? res.data! : p))
    } catch { /* ignore */ } finally { setTogglingId(null) }
  }

  const handleBatchDelete = async () => {
    if (!batchConfirmStep) { setBatchConfirmStep(true); return }
    setIsBatchDeleting(true)
    try {
      const count = selectedIds.size
      await api.batchDeleteMonitorPrompts(Array.from(selectedIds))
      setPrompts(prev => {
        const next = prev.filter(p => !selectedIds.has(p.id))
        try { localStorage.setItem('alignment_prompts_count', String(next.length)) } catch {}
        return next
      })
      setSelectedIds(new Set())
      setBatchConfirmStep(false)
      toast.success(`${count} prompt${count > 1 ? 's' : ''} deleted`)
    } catch { toast.error('Batch delete failed') } finally { setIsBatchDeleting(false) }
  }

  const toggleSelect = (id: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredPrompts.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(filteredPrompts.map(p => p.id)))
  }

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* ── Header ──────────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Prompts</h1>
            <p className="text-gray-500 text-sm mt-1">
              Discovery-oriented queries that drive your AI visibility scans
              {brandName && <> · <span className="font-semibold text-gray-700">{brandName}</span></>}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {credits && (
              <div className="flex items-center gap-1.5 text-[12px] text-gray-500 bg-white border border-gray-200 px-3 py-1.5 rounded-xl">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span className="font-semibold text-gray-700">{activeCount}</span>
                <span>/ 50 active</span>
              </div>
            )}
            <a
              href={api.getExportCSVUrl('prompts', brandName)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-[13px] font-semibold px-3.5 py-2 rounded-xl transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </a>
            <button
              onClick={() => { setShowAdd(true); setEditingPrompt(null) }}
              className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-[13px] font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Prompt
            </button>
          </div>
        </div>

        {/* ── Stats Row ────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatBanner label="Total Prompts"   value={prompts.length}  sub="across all intents"        color="text-gray-900" />
          <StatBanner label="Active"          value={activeCount}     sub="used in next scan"         color="text-emerald-600" />
          <StatBanner label="Scanned"         value={withScanData}    sub="have visibility data"      color="text-blue-600" />
          <StatBanner label="Visible Prompts" value={visibleCount}    sub={`${withScanData ? Math.round((visibleCount / withScanData) * 100) : 0}% mention rate`} color="text-purple-600" />
        </div>

        {/* ── Add / Edit Form ───────────────────────────────────────────────────── */}
        {(showAdd || editingPrompt) && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[15px] font-bold text-gray-900">{editingPrompt ? 'Edit Prompt' : 'New Prompt'}</h3>
                <p className="text-[12px] text-gray-500 mt-0.5">Write discovery-oriented queries — no brand name needed. AI checks if your brand appears in the response.</p>
              </div>
              <button onClick={() => { setShowAdd(false); setEditingPrompt(null) }} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <textarea
              value={editingPrompt ? editingPrompt.template : newTemplate}
              onChange={e => editingPrompt
                ? setEditingPrompt({ ...editingPrompt, template: e.target.value })
                : setNewTemplate(e.target.value)
              }
              placeholder="e.g., What are the best GEO tools for tracking AI visibility in 2026?"
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 resize-none"
            />

            {/* Auto-detected intent preview */}
            {(() => {
              const tmpl = editingPrompt ? editingPrompt.template : newTemplate
              if (!tmpl.trim()) return null
              const cat = autoClassify(tmpl)
              const color = CATEGORY_COLORS[cat] || 'bg-gray-100 text-gray-600'
              const label = CATEGORY_LABEL_MAP[cat] || cat
              return (
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2.5 mt-3">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span className="text-[11px] text-gray-500">Auto-detected intent:</span>
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold ${color}`}>{label}</span>
                </div>
              )
            })()}

            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={editingPrompt ? handleUpdate : handleAdd}
                disabled={isSaving || !(editingPrompt ? editingPrompt.template.trim() : newTemplate.trim())}
                className="flex items-center gap-2 bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editingPrompt ? 'Update' : 'Add Prompt'}
              </button>
              <button
                onClick={() => { setShowAdd(false); setEditingPrompt(null) }}
                className="px-4 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── Filters + Batch Actions ─────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 flex-wrap gap-3">
            {/* Status tabs */}
            <div className="flex items-center gap-1">
              {([ ['active', activeCount], ['inactive', inactiveCount], ['all', prompts.length] ] as [typeof statusFilter, number][]).map(([val, count]) => (
                <button
                  key={val}
                  onClick={() => setStatusFilter(val)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                    statusFilter === val
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {val.charAt(0).toUpperCase() + val.slice(1)}
                  <span className="ml-1.5 text-[10px] font-bold text-gray-400">{count}</span>
                </button>
              ))}
            </div>

            {/* Intent filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <select
                value={intentFilter}
                onChange={e => setIntentFilter(e.target.value)}
                className="text-[12px] font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
              >
                <option value="all">All Intents ({prompts.length})</option>
                <option value="info_cognition">🧠 Info Cognition</option>
                <option value="solution_explore">🔍 Solution Explore</option>
                <option value="comparison_decision">⚖️ Compare &amp; Decide</option>
                <option value="action_choice">🚀 Action Choice</option>
              </select>
            </div>
          </div>

          {/* Batch action bar */}
          {selectedIds.size > 0 && (
            <div className={`flex items-center justify-between px-6 py-3 ${batchConfirmStep ? 'bg-red-50 border-b border-red-200' : 'bg-amber-50 border-b border-amber-200'}`}>
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={selectedIds.size === filteredPrompts.length} onChange={toggleSelectAll} className="w-4 h-4 rounded text-red-500" />
                <span className="text-[13px] font-semibold text-gray-700">
                  {batchConfirmStep
                    ? `Confirm delete ${selectedIds.size} prompt${selectedIds.size > 1 ? 's' : ''}?`
                    : `${selectedIds.size} selected`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {batchConfirmStep ? (
                  <>
                    <button onClick={() => { setBatchConfirmStep(false) }} className="px-3 py-1.5 text-[12px] text-gray-600 border border-gray-200 rounded-lg hover:bg-white transition-colors">Cancel</button>
                    <button onClick={handleBatchDelete} disabled={isBatchDeleting} className="flex items-center gap-1.5 px-4 py-1.5 bg-red-600 text-white text-[12px] font-bold rounded-lg transition-colors disabled:opacity-50">
                      {isBatchDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      Yes, Delete
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setSelectedIds(new Set()); setBatchConfirmStep(false) }} className="px-3 py-1.5 text-[12px] text-gray-600 border border-gray-200 rounded-lg hover:bg-white transition-colors">Deselect</button>
                    <button onClick={handleBatchDelete} className="flex items-center gap-1.5 px-4 py-1.5 bg-red-500 text-white text-[12px] font-semibold rounded-lg transition-colors">
                      <Trash2 className="w-3.5 h-3.5" /> Delete Selected
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Table */}
          {isLoading ? (
            <PromptsTableSkeleton />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="bg-gray-50/60">
                    <th className="px-4 py-3 w-10">
                      <input type="checkbox" checked={filteredPrompts.length > 0 && selectedIds.size === filteredPrompts.length} onChange={toggleSelectAll} className="w-4 h-4 rounded text-red-500 border-gray-300" />
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Prompt</th>
                    <th className="px-3 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider w-24">
                      <div className="flex items-center justify-center gap-1"><Eye className="w-3 h-3" /> Visible</div>
                    </th>
                    <th className="px-3 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider w-24">
                      <div className="flex items-center justify-center gap-1"><ThumbsUp className="w-3 h-3" /> Sentiment</div>
                    </th>
                    <th className="px-3 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider w-28">Intent</th>
                    <th className="px-3 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider w-28">Competitors</th>
                    <th className="px-3 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider w-24">Added</th>
                    <th className="px-3 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredPrompts.map(prompt => {
                    const hasScan = !!prompt.last_scanned_at
                    const visibilityPct = hasScan ? prompt.mention_rate : null
                    const sentiment = hasScan && prompt.last_sentiment_score != null
                      ? Math.round((prompt.last_sentiment_score + 1) * 50)
                      : null
                    const isToggling = togglingId === prompt.id
                    const isDeleting = deletingId === prompt.id
                    const addedLabel = (() => {
                      if (!prompt.created_at) return '—'
                      const diff = Date.now() - new Date(prompt.created_at).getTime()
                      const days = Math.floor(diff / 86400000)
                      if (days < 1) return 'Today'
                      if (days < 30) return `${days}d ago`
                      return `${Math.floor(days / 30)} mo. ago`
                    })()
                    const AVATAR_COLORS = ['#3b82f6','#22c55e','#f59e0b','#a855f7','#6366f1','#14b8a6']

                    return (
                      <tr
                        key={prompt.id}
                        className={`group transition-colors ${
                          selectedIds.has(prompt.id) ? 'bg-red-50/30' :
                          !prompt.is_active ? 'opacity-50 bg-gray-50/40' :
                          'hover:bg-gray-50/60'
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="px-4 py-3.5 w-10">
                          <input type="checkbox" checked={selectedIds.has(prompt.id)} onChange={() => toggleSelect(prompt.id)} className="w-4 h-4 rounded text-red-500 border-gray-300" />
                        </td>

                        {/* Prompt text */}
                        <td className="px-4 py-3.5 max-w-xs">
                          <p className={`text-[13px] leading-snug ${prompt.is_active ? 'text-gray-900' : 'text-gray-500 line-through'}`}>
                            {prompt.template}
                          </p>
                          {prompt.last_sub_type && prompt.last_sub_type !== 'not_mentioned' && (
                            <span className={`inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded-full ${SUB_TYPE_LABELS[prompt.last_sub_type]?.color || 'bg-gray-100 text-gray-600'}`}>
                              {SUB_TYPE_LABELS[prompt.last_sub_type]?.icon} {SUB_TYPE_LABELS[prompt.last_sub_type]?.label || prompt.last_sub_type}
                            </span>
                          )}
                        </td>

                        {/* Visibility */}
                        <td className="px-3 py-3.5 text-center">
                          {visibilityPct !== null ? (
                            <span className={`text-[13px] font-bold ${visibilityPct >= 80 ? 'text-emerald-600' : visibilityPct >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                              {visibilityPct}%
                            </span>
                          ) : (
                            <span className="text-[11px] text-gray-300">—</span>
                          )}
                        </td>

                        {/* Sentiment */}
                        <td className="px-3 py-3.5 text-center">
                          {sentiment !== null ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <div className={`w-2 h-2 rounded-full ${sentiment >= 60 ? 'bg-emerald-500' : sentiment >= 40 ? 'bg-amber-500' : 'bg-red-500'}`} />
                              <span className="text-[12px] font-bold text-gray-800">{sentiment}</span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-gray-300">—</span>
                          )}
                        </td>

                        {/* Intent */}
                        <td className="px-3 py-3.5 text-center">
                          <IntentBadge category={prompt.category} />
                        </td>

                        {/* Competitors */}
                        <td className="px-3 py-3.5 text-center">
                          {hasScan && (prompt.last_competitors_mentioned || []).length > 0 ? (
                            <div className="flex items-center justify-center -space-x-1.5">
                              {(prompt.last_competitors_mentioned || []).slice(0, 3).map((c, i) => (
                                <span
                                  key={i}
                                  title={c}
                                  className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white ring-2 ring-white"
                                  style={{ backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                                >
                                  {c.charAt(0).toUpperCase()}
                                </span>
                              ))}
                              {(prompt.last_competitors_mentioned || []).length > 3 && (
                                <span className="text-[9px] font-bold text-gray-500 ml-1">+{(prompt.last_competitors_mentioned || []).length - 3}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-gray-300">—</span>
                          )}
                        </td>

                        {/* Added */}
                        <td className="px-3 py-3.5 text-center">
                          <span className="text-[11px] text-gray-500">{addedLabel}</span>
                        </td>

                        {/* Actions */}
                        <td className="px-3 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleToggle(prompt.id, prompt.is_active)}
                              disabled={!!isToggling}
                              className={`p-1.5 rounded-lg transition-colors ${isToggling ? 'opacity-50' : 'hover:bg-gray-100'}`}
                              title={prompt.is_active ? 'Deactivate' : 'Activate'}
                            >
                              {prompt.is_active
                                ? <ToggleRight className="w-4 h-4 text-emerald-500" />
                                : <ToggleLeft className="w-4 h-4 text-gray-400" />
                              }
                            </button>
                            <button
                              onClick={() => { setEditingPrompt(prompt); setShowAdd(false) }}
                              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                            </button>
                            <button
                              onClick={() => handleDelete(prompt.id)}
                              disabled={isDeleting}
                              className="p-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                              title="Delete"
                            >
                              {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" /> : <Trash2 className="w-3.5 h-3.5 text-red-400" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {filteredPrompts.length === 0 && !isLoading && (
                <div className="text-center py-16">
                  <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-[13px] text-gray-500 mb-4">
                    {prompts.length === 0
                      ? 'No prompts yet. Add your first discovery prompt to start tracking AI visibility.'
                      : 'No prompts match the current filter.'
                    }
                  </p>
                  {prompts.length === 0 && (
                    <button
                      onClick={() => setShowAdd(true)}
                      className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors mx-auto"
                    >
                      <Plus className="w-4 h-4" />
                      Add First Prompt
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer Info ──────────────────────────────────────────────────────── */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] font-semibold text-blue-900 mb-1">How Prompts Work</p>
              <p className="text-[12px] text-blue-700 leading-relaxed">
                Write discovery-oriented prompts without your brand name — the way real users ask AI.
                Each active prompt is sent to AI engines during a scan, and the system checks whether AI mentions your brand.
                <strong> Intent is auto-detected</strong> from your prompt text.
              </p>
            </div>
          </div>
          <div className="bg-gray-900 rounded-2xl p-5 text-white">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="text-[13px] font-semibold">Ready to Scan?</span>
            </div>
            <p className="text-[12px] text-gray-400 mb-4 leading-relaxed">
              {activeCount} active prompt{activeCount !== 1 ? 's' : ''} are ready. Run a scan to populate visibility, sentiment, and competitor data.
            </p>
            <Link
              href="/dashboard/geo-monitor"
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold text-[13px] px-4 py-2 rounded-xl transition-colors w-fit"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              Go to Monitor →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
