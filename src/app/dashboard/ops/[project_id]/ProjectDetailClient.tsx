'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import {
  opsApi,
  ManagedProject, OpsPrompt, OpsContent, StageGate,
  OpsPromptCreate, OpsContentCreate,
  PromptTier, PromptIntentType, PromptAnswerability,
  ContentType, ContentChannel, ContentStatus, StageGateDecision,
  ScanRun, ScanRunProgress, ScanResult, ScanTrendPoint, PromptVisibilitySummary,
} from '@/lib/api'
import {
  ArrowLeft, MessageSquare, FileText, Flag, Plus, Trash2, Edit2,
  CheckCircle, XCircle, Clock, AlertCircle, Loader2, RefreshCw,
  TrendingUp, Target, ChevronDown, ChevronUp, ExternalLink,
  Save, X, Tag, Layers, Award, Activity, Play, Radio, Zap,
} from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────

const TIER_CFG: Record<PromptTier, { label: string; color: string; bg: string }> = {
  top20:    { label: 'Top 20',   color: 'text-orange-700', bg: 'bg-orange-100' },
  core60:   { label: 'Core 60',  color: 'text-blue-700',   bg: 'bg-blue-100' },
  longtail: { label: 'Long-tail', color: 'text-gray-600',  bg: 'bg-gray-100' },
}

const INTENT_CFG: Record<PromptIntentType, { label: string; short: string }> = {
  info_cognition:      { label: 'Info Cognition',      short: 'INFO' },
  solution_explore:    { label: 'Solution Explore',    short: 'SOL' },
  comparison_decision: { label: 'Comparison Decision', short: 'CMP' },
  action_choice:       { label: 'Action Choice',       short: 'ACT' },
}

const CONTENT_TYPE_CFG: Record<ContentType, { label: string; color: string }> = {
  CT1: { label: 'CT1 Definition', color: 'bg-violet-100 text-violet-700' },
  CT2: { label: 'CT2 Comparison', color: 'bg-blue-100 text-blue-700' },
  CT3: { label: 'CT3 Ranking',    color: 'bg-indigo-100 text-indigo-700' },
  CT4: { label: 'CT4 UseCase',    color: 'bg-teal-100 text-teal-700' },
  CT5: { label: 'CT5 How-to',     color: 'bg-green-100 text-green-700' },
  CT6: { label: 'CT6 FAQ',        color: 'bg-orange-100 text-orange-700' },
  CT7: { label: 'CT7 Citation',   color: 'bg-red-100 text-red-700' },
}

const CONTENT_STATUS_CFG: Record<ContentStatus, { label: string; icon: React.FC<{ className?: string }>; color: string }> = {
  draft:         { label: 'Draft',        icon: Clock,         color: 'bg-gray-100 text-gray-600' },
  qa_pending:    { label: 'QA Pending',   icon: AlertCircle,   color: 'bg-yellow-100 text-yellow-700' },
  qa_pass:       { label: 'QA Pass',      icon: CheckCircle,   color: 'bg-green-100 text-green-700' },
  qa_conditional:{ label: 'Conditional',  icon: AlertCircle,   color: 'bg-orange-100 text-orange-700' },
  qa_fail:       { label: 'QA Fail',      icon: XCircle,       color: 'bg-red-100 text-red-700' },
  published:     { label: 'Published',    icon: CheckCircle,   color: 'bg-emerald-100 text-emerald-700' },
  taken_down:    { label: 'Taken Down',   icon: XCircle,       color: 'bg-gray-100 text-gray-500' },
}

const CHANNEL_CFG: Record<ContentChannel, { label: string; emoji: string }> = {
  reddit:         { label: 'Reddit',          emoji: '🤖' },
  linkedin:       { label: 'LinkedIn',        emoji: '💼' },
  client_website: { label: 'Client Website',  emoji: '🌐' },
  self_built:     { label: 'Self-built Blog', emoji: '📝' },
  github:         { label: 'GitHub',          emoji: '🐙' },
}

const STAGE_LABELS: Record<number, { title: string; weeks: string; target: number }> = {
  1: { title: 'Diagnosis & Kickoff',   weeks: 'W1–4',  target: 10 },
  2: { title: 'Baseline & Content',    weeks: 'W5–8',  target: 20 },
  3: { title: 'Scale & Distribution',  weeks: 'W9–12', target: 30 },
  4: { title: 'Amplify & Iterate',     weeks: 'W13–16', target: 40 },
  5: { title: 'Optimize & Report',     weeks: 'W17–20', target: 50 },
  6: { title: 'Handoff & Next Phase',  weeks: 'W21–24', target: 60 },
}

// ─── Tab types ────────────────────────────────────────────────────────────────
type Tab = 'overview' | 'prompts' | 'content' | 'monitor'

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab({ project, stageGates, onAddGate }: {
  project: ManagedProject
  stageGates: StageGate[]
  onAddGate: () => void
}) {
  const visRate = project.visibility_rate ?? 0
  const visColor = visRate >= 30 ? 'text-green-600' : visRate >= 15 ? 'text-yellow-600' : 'text-red-500'

  const GATE_WEEKS = [4, 8, 12, 16, 24]
  const gateMap: Record<number, StageGate> = {}
  stageGates.forEach(g => { gateMap[g.week] = g })

  const decisionCfg: Record<StageGateDecision, { label: string; color: string }> = {
    continue:   { label: 'Continue',   color: 'bg-green-100 text-green-700' },
    correct:    { label: 'Correct',    color: 'bg-yellow-100 text-yellow-700' },
    stop_loss:  { label: 'Stop Loss',  color: 'bg-red-100 text-red-700' },
    upsell:     { label: 'Upsell →',   color: 'bg-purple-100 text-purple-700' },
  }

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'AI Visibility', value: `${visRate}%`, sub: 'Brand mentioned rate', color: visColor },
          { label: 'Prompts',       value: project.prompt_count ?? 0, sub: `${project.top20_count ?? 0} in Top 20`, color: 'text-blue-600' },
          { label: 'Content Pieces', value: project.content_count ?? 0, sub: 'Across all channels', color: 'text-purple-600' },
          { label: 'Stage',         value: `${project.stage}/6`, sub: STAGE_LABELS[project.stage]?.title, color: 'text-orange-500' },
        ].map(item => (
          <div key={item.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">{item.label}</p>
            <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{item.sub}</p>
          </div>
        ))}
      </div>

      {/* Project info */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">Project Info</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {[
            { label: 'Client', value: project.client_name },
            { label: 'Domain', value: project.client_domain || '—' },
            { label: 'Industry', value: project.industry || '—' },
            { label: 'Contact', value: project.contact_email || '—' },
            { label: 'Start Date', value: project.start_date || '—' },
            { label: 'End Date', value: project.end_date || '—' },
            { label: 'Status', value: project.status },
          ].map(row => (
            <div key={row.label}>
              <span className="text-xs text-gray-400 block">{row.label}</span>
              <span className="text-gray-800 font-medium capitalize">{row.value}</span>
            </div>
          ))}
          {project.notes && (
            <div className="col-span-2">
              <span className="text-xs text-gray-400 block">Notes</span>
              <span className="text-gray-700 text-sm">{project.notes}</span>
            </div>
          )}
        </div>
      </div>

      {/* Stage Gate Timeline */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-800">Stage Gate Timeline</h3>
          <button
            onClick={onAddGate}
            className="text-xs flex items-center gap-1 text-red-500 hover:text-red-600 font-medium"
          >
            <Plus className="w-3 h-3" /> Record Gate
          </button>
        </div>
        <div className="relative">
          {/* Line */}
          <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-100" />
          <div className="flex justify-between relative">
            {GATE_WEEKS.map(week => {
              const gate = gateMap[week]
              const isCurrent = project.stage * 4 >= week
              const dec = gate?.decision
              return (
                <div key={week} className="flex flex-col items-center gap-2 flex-1">
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold z-10 ${
                    gate
                      ? dec === 'stop_loss' ? 'border-red-400 bg-red-50 text-red-600'
                      : dec === 'upsell' ? 'border-purple-400 bg-purple-50 text-purple-600'
                      : dec === 'correct' ? 'border-yellow-400 bg-yellow-50 text-yellow-600'
                      : 'border-green-400 bg-green-50 text-green-600'
                      : isCurrent
                      ? 'border-orange-400 bg-orange-50 text-orange-600'
                      : 'border-gray-200 bg-white text-gray-400'
                  }`}>
                    W{week}
                  </div>
                  <div className="text-center">
                    {gate?.decision && (
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${decisionCfg[gate.decision].color}`}>
                        {decisionCfg[gate.decision].label}
                      </span>
                    )}
                    {gate?.visibility_rate != null && (
                      <p className="text-[10px] text-gray-500 mt-0.5">{gate.visibility_rate}% vis</p>
                    )}
                    {!gate && isCurrent && (
                      <span className="text-[10px] text-orange-500 font-medium">Pending</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Prompts Tab ──────────────────────────────────────────────────────────────
function PromptsTab({ projectId }: { projectId: string }) {
  const [prompts, setPrompts] = useState<OpsPrompt[]>([])
  const [loading, setLoading] = useState(true)
  const [tierFilter, setTierFilter] = useState<PromptTier | 'all'>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [batchText, setBatchText] = useState('')
  const [batchTier, setBatchTier] = useState<PromptTier>('core60')
  const [batchIntent, setBatchIntent] = useState<PromptIntentType>('info_cognition')
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editTier, setEditTier] = useState<PromptTier>('core60')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await opsApi.listPrompts(projectId)
      setPrompts(res)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { load() }, [load])

  const handleBatchAdd = async () => {
    const lines = batchText.split('\n').map(l => l.trim()).filter(Boolean)
    if (!lines.length) return
    setSaving(true)
    try {
      const items: OpsPromptCreate[] = lines.map(text => ({
        project_id: projectId,
        text,
        tier: batchTier,
        intent_type: batchIntent,
        answerability: 'A' as PromptAnswerability,
      }))
      const added = await opsApi.createPromptsBatch(projectId, items)
      setPrompts(prev => [...prev, ...added])
      setBatchText('')
      setShowAdd(false)
    } finally {
      setSaving(false)
    }
  }

  const handleChangeTier = async (p: OpsPrompt, tier: PromptTier) => {
    const updated = await opsApi.updatePrompt(projectId, p.id, { tier })
    setPrompts(prev => prev.map(x => x.id === p.id ? { ...x, ...updated } : x))
    setEditId(null)
  }

  const handleDelete = async (promptId: string) => {
    if (!confirm('Delete this prompt?')) return
    await opsApi.deletePrompt(projectId, promptId)
    setPrompts(prev => prev.filter(p => p.id !== promptId))
  }

  const filtered = tierFilter === 'all' ? prompts : prompts.filter(p => p.tier === tierFilter)

  const tierCount: Record<string, number> = { top20: 0, core60: 0, longtail: 0 }
  prompts.forEach(p => { tierCount[p.tier] = (tierCount[p.tier] || 0) + 1 })

  return (
    <div className="space-y-4">
      {/* Tier summary */}
      <div className="grid grid-cols-3 gap-3">
        {(Object.entries(TIER_CFG) as [PromptTier, typeof TIER_CFG[PromptTier]][]).map(([tier, cfg]) => (
          <div key={tier} className={`${cfg.bg} rounded-xl p-4 border border-transparent`}>
            <div className={`text-2xl font-bold ${cfg.color}`}>{tierCount[tier] || 0}</div>
            <div className={`text-xs font-medium ${cfg.color} mt-0.5`}>{cfg.label}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">
              {tier === 'top20' ? 'Weekly scan · A/B only' : tier === 'core60' ? 'Bi-weekly · All intents' : 'Monthly · Long tail'}
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {(['all', 'top20', 'core60', 'longtail'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTierFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                tierFilter === t ? 'bg-red-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {t === 'all' ? `All (${prompts.length})` : `${TIER_CFG[t as PromptTier].label} (${tierCount[t] || 0})`}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600"
        >
          <Plus className="w-3.5 h-3.5" /> Add Prompts
        </button>
      </div>

      {/* Batch add panel */}
      {showAdd && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h4 className="text-sm font-semibold text-gray-800 mb-3">Batch Add Prompts</h4>
          <p className="text-xs text-gray-500 mb-3">One prompt per line. All lines share the same tier + intent type.</p>
          <textarea
            value={batchText}
            onChange={e => setBatchText(e.target.value)}
            rows={6}
            placeholder="What is the best GEO tool for SaaS companies?&#10;How do AI platforms rank brands?&#10;..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-300 resize-none mb-3"
          />
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Tier</label>
              <select
                value={batchTier}
                onChange={e => setBatchTier(e.target.value as PromptTier)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
              >
                <option value="top20">Top 20 — Weekly</option>
                <option value="core60">Core 60 — Bi-weekly</option>
                <option value="longtail">Long-tail — Monthly</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Intent Type</label>
              <select
                value={batchIntent}
                onChange={e => setBatchIntent(e.target.value as PromptIntentType)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
              >
                <option value="info_cognition">Info Cognition</option>
                <option value="solution_explore">Solution Explore</option>
                <option value="comparison_decision">Comparison Decision</option>
                <option value="action_choice">Action Choice</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={handleBatchAdd}
              disabled={saving || !batchText.trim()}
              className="px-4 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 disabled:opacity-50 flex items-center gap-1"
            >
              {saving && <Loader2 className="w-3 h-3 animate-spin" />}
              Add {batchText.split('\n').filter(l => l.trim()).length} Prompts
            </button>
          </div>
        </div>
      )}

      {/* Prompt list */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-red-400 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <MessageSquare className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">No prompts yet. Add your first batch.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => {
            const tierCfg = TIER_CFG[p.tier]
            const visColor = p.brand_mentioned ? 'text-green-600' : 'text-gray-400'
            return (
              <div key={p.id} className="bg-white rounded-lg border border-gray-100 shadow-sm px-4 py-3 flex items-start gap-3 group hover:border-red-100 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 leading-relaxed">{p.text}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {editId === p.id ? (
                      <select
                        value={editTier}
                        onChange={e => setEditTier(e.target.value as PromptTier)}
                        className="text-xs border border-gray-200 rounded px-1.5 py-0.5 focus:outline-none"
                        autoFocus
                      >
                        <option value="top20">Top 20</option>
                        <option value="core60">Core 60</option>
                        <option value="longtail">Long-tail</option>
                      </select>
                    ) : (
                      <span
                        onClick={() => { setEditId(p.id); setEditTier(p.tier) }}
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full cursor-pointer hover:opacity-80 ${tierCfg.bg} ${tierCfg.color}`}
                      >
                        {tierCfg.label}
                      </span>
                    )}
                    {p.intent_type && (
                      <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {INTENT_CFG[p.intent_type]?.short}
                      </span>
                    )}
                    <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      Ans:{p.answerability}
                    </span>
                    <span className={`text-[10px] font-medium ${visColor}`}>
                      {p.brand_mentioned ? `✓ ${p.visibility_pct}% visible` : '✗ Not mentioned'}
                    </span>
                    {p.status === 'failed' && (
                      <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full">⚠ Failed</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  {editId === p.id ? (
                    <>
                      <button
                        onClick={() => handleChangeTier(p, editTier)}
                        className="p-1 rounded hover:bg-green-100 text-green-600"
                      >
                        <Save className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setEditId(null)} className="p-1 rounded hover:bg-gray-100 text-gray-400">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => { setEditId(p.id); setEditTier(p.tier) }}
                      className="p-1 rounded hover:bg-blue-100 text-blue-400"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="p-1 rounded hover:bg-red-100 text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Content + QA Tab ─────────────────────────────────────────────────────────
function ContentTab({ projectId, prompts }: { projectId: string; prompts: OpsPrompt[] }) {
  const [contents, setContents] = useState<OpsContent[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<ContentStatus | 'all'>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [newForm, setNewForm] = useState<Partial<OpsContentCreate>>({
    content_type: 'CT1', channel: 'reddit', ai_draft: true,
  })
  const [saving, setSaving] = useState(false)
  const [qaEditId, setQaEditId] = useState<string | null>(null)
  const [qaForm, setQaForm] = useState({ trust_score: '', cite_score: '', qa_notes: '', status: '' as ContentStatus | '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await opsApi.listContent(projectId)
      setContents(res)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { load() }, [load])

  const handleAdd = async () => {
    if (!newForm.title?.trim() || !newForm.content_type || !newForm.channel) return
    setSaving(true)
    try {
      const created = await opsApi.createContent(projectId, {
        project_id: projectId,
        title: newForm.title!,
        content_type: newForm.content_type as ContentType,
        channel: newForm.channel as ContentChannel,
        content: newForm.content,
        ai_draft: newForm.ai_draft ?? true,
        prompt_id: newForm.prompt_id,
      })
      setContents(prev => [created, ...prev])
      setNewForm({ content_type: 'CT1', channel: 'reddit', ai_draft: true })
      setShowAdd(false)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveQA = async (contentId: string) => {
    const payload: Record<string, unknown> = {}
    if (qaForm.trust_score !== '') payload.trust_score = Number(qaForm.trust_score)
    if (qaForm.cite_score !== '') payload.cite_score = Number(qaForm.cite_score)
    if (qaForm.qa_notes) payload.qa_notes = qaForm.qa_notes
    if (qaForm.status) payload.status = qaForm.status
    const updated = await opsApi.updateContent(projectId, contentId, payload as Partial<OpsContent>)
    setContents(prev => prev.map(c => c.id === contentId ? updated : c))
    setQaEditId(null)
  }

  const handleDelete = async (contentId: string) => {
    if (!confirm('Delete this content?')) return
    await opsApi.deleteContent(projectId, contentId)
    setContents(prev => prev.filter(c => c.id !== contentId))
  }

  const filtered = statusFilter === 'all' ? contents : contents.filter(c => c.status === statusFilter)

  const statusCounts: Record<string, number> = {}
  contents.forEach(c => { statusCounts[c.status] = (statusCounts[c.status] || 0) + 1 })

  return (
    <div className="space-y-4">
      {/* QA summary strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { status: 'qa_pending' as ContentStatus, label: 'QA Pending' },
          { status: 'qa_pass' as ContentStatus,    label: 'QA Pass' },
          { status: 'qa_fail' as ContentStatus,    label: 'QA Fail' },
          { status: 'published' as ContentStatus,  label: 'Published' },
        ].map(item => {
          const cfg = CONTENT_STATUS_CFG[item.status]
          const Icon = cfg.icon
          return (
            <div key={item.status} className={`${cfg.color} rounded-xl p-3 border border-transparent`}>
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">{item.label}</span>
              </div>
              <div className="text-xl font-bold">{statusCounts[item.status] || 0}</div>
            </div>
          )
        })}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 flex-wrap">
          {(['all', 'draft', 'qa_pending', 'qa_pass', 'qa_conditional', 'qa_fail', 'published'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === s ? 'bg-red-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s === 'all' ? `All (${contents.length})` : s.replace('_', ' ')}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600"
        >
          <Plus className="w-3.5 h-3.5" /> New Content
        </button>
      </div>

      {/* Add content panel */}
      {showAdd && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h4 className="text-sm font-semibold text-gray-800 mb-3">New Content Entry</h4>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Title *</label>
              <input
                value={newForm.title || ''}
                onChange={e => setNewForm(f => ({ ...f, title: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                placeholder="e.g. What is GEO? Complete Definition Guide"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Content Type</label>
                <select
                  value={newForm.content_type}
                  onChange={e => setNewForm(f => ({ ...f, content_type: e.target.value as ContentType }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                >
                  {(Object.entries(CONTENT_TYPE_CFG) as [ContentType, { label: string }][]).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Channel</label>
                <select
                  value={newForm.channel}
                  onChange={e => setNewForm(f => ({ ...f, channel: e.target.value as ContentChannel }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                >
                  {(Object.entries(CHANNEL_CFG) as [ContentChannel, { label: string; emoji: string }][]).map(([k, v]) => (
                    <option key={k} value={k}>{v.emoji} {v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Bound Prompt</label>
                <select
                  value={newForm.prompt_id || ''}
                  onChange={e => setNewForm(f => ({ ...f, prompt_id: e.target.value || undefined }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="">— None —</option>
                  {prompts.slice(0, 50).map(p => (
                    <option key={p.id} value={p.id}>{p.text.slice(0, 50)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Content (optional, paste AI draft)</label>
              <textarea
                value={newForm.content || ''}
                onChange={e => setNewForm(f => ({ ...f, content: e.target.value }))}
                rows={4}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
                placeholder="Paste AI-generated draft here..."
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={newForm.ai_draft ?? true}
                onChange={e => setNewForm(f => ({ ...f, ai_draft: e.target.checked }))}
                className="rounded"
              />
              AI Draft (requires human edit before publishing)
            </label>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600">
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={saving || !newForm.title?.trim()}
              className="px-4 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 disabled:opacity-50 flex items-center gap-1"
            >
              {saving && <Loader2 className="w-3 h-3 animate-spin" />}
              Create
            </button>
          </div>
        </div>
      )}

      {/* Content list */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-red-400 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <FileText className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">No content yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => {
            const stCfg = CONTENT_STATUS_CFG[c.status]
            const ctCfg = CONTENT_TYPE_CFG[c.content_type]
            const chCfg = CHANNEL_CFG[c.channel]
            const StatusIcon = stCfg.icon
            const qaScore = c.trust_score != null && c.cite_score != null
              ? `T:${c.trust_score}/10 · C:${c.cite_score}/10`
              : null

            return (
              <div key={c.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${ctCfg.color}`}>
                          {ctCfg.label}
                        </span>
                        <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {chCfg.emoji} {chCfg.label}
                        </span>
                        {c.ai_draft && (
                          <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">AI Draft</span>
                        )}
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${stCfg.color}`}>
                          <StatusIcon className="w-2.5 h-2.5" />
                          {stCfg.label}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900">{c.title}</p>
                      {qaScore && <p className="text-xs text-gray-500 mt-0.5">QA Score — {qaScore}</p>}
                      {c.qa_notes && <p className="text-xs text-gray-400 mt-0.5 italic">{c.qa_notes}</p>}
                      {c.published_url && (
                        <a
                          href={c.published_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-0.5"
                        >
                          <ExternalLink className="w-3 h-3" /> Published URL
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => {
                          setQaEditId(qaEditId === c.id ? null : c.id)
                          setQaForm({
                            trust_score: c.trust_score?.toString() || '',
                            cite_score: c.cite_score?.toString() || '',
                            qa_notes: c.qa_notes || '',
                            status: c.status,
                          })
                        }}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-400 text-xs font-medium border border-transparent hover:border-blue-200"
                        title="QA Review"
                      >
                        <Award className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* QA inline form */}
                {qaEditId === c.id && (
                  <div className="bg-gray-50 border-t border-gray-100 px-5 py-4">
                    <p className="text-xs font-semibold text-gray-700 mb-3">QA Review</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Trust Score (0–10)</label>
                        <input
                          type="number"
                          min={0} max={10} step={0.5}
                          value={qaForm.trust_score}
                          onChange={e => setQaForm(f => ({ ...f, trust_score: e.target.value }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                          placeholder="e.g. 7.5"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Cite Score (0–10)</label>
                        <input
                          type="number"
                          min={0} max={10} step={0.5}
                          value={qaForm.cite_score}
                          onChange={e => setQaForm(f => ({ ...f, cite_score: e.target.value }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                          placeholder="e.g. 8.0"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs text-gray-500 block mb-1">Status</label>
                        <select
                          value={qaForm.status}
                          onChange={e => setQaForm(f => ({ ...f, status: e.target.value as ContentStatus }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                        >
                          {(Object.keys(CONTENT_STATUS_CFG) as ContentStatus[]).map(s => (
                            <option key={s} value={s}>{CONTENT_STATUS_CFG[s].label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="text-xs text-gray-500 block mb-1">QA Notes / Feedback</label>
                      <textarea
                        value={qaForm.qa_notes}
                        onChange={e => setQaForm(f => ({ ...f, qa_notes: e.target.value }))}
                        rows={2}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none"
                        placeholder="e.g. Missing definition paragraph, needs human rewrite of opening 150 words..."
                      />
                    </div>
                    {qaForm.status === 'published' && (
                      <div className="mb-3">
                        <label className="text-xs text-gray-500 block mb-1">Published URL</label>
                        <input
                          defaultValue={c.published_url || ''}
                          onChange={e => setQaForm(f => ({ ...f, qa_notes: f.qa_notes }))}
                          id={`pub-url-${c.id}`}
                          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                          placeholder="https://..."
                        />
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => setQaEditId(null)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-white">
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveQA(c.id)}
                        className="px-4 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 flex items-center gap-1"
                      >
                        <Save className="w-3 h-3" /> Save QA
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Monitor Tab ──────────────────────────────────────────────────────────────
function MonitorTab({ project }: { project: ManagedProject }) {
  const projectId = project.id
  const [scanRuns, setScanRuns] = useState<ScanRun[]>([])
  const [trend, setTrend] = useState<ScanTrendPoint[]>([])
  const [promptVis, setPromptVis] = useState<PromptVisibilitySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [currentRun, setCurrentRun] = useState<ScanRunProgress | null>(null)
  const [selectedRun, setSelectedRun] = useState<string | null>(null)
  const [runResults, setRunResults] = useState<ScanResult[]>([])
  const [loadingResults, setLoadingResults] = useState(false)
  const [brandInput, setBrandInput] = useState(project.client_name || '')
  const [tierFilter, setTierFilter] = useState<'all' | 'top20' | 'core60' | 'longtail'>('all')
  const [pollTimer, setPollTimer] = useState<NodeJS.Timeout | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [runs, trendRes, visRes] = await Promise.all([
        opsApi.listScanRuns(projectId, 15),
        opsApi.getVisibilityTrend(projectId, 10),
        opsApi.getPromptVisibility(projectId),
      ])
      setScanRuns(runs)
      setTrend(trendRes.trend)
      setPromptVis(visRes.prompts)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { loadData() }, [loadData])

  // Poll progress while scan is running
  useEffect(() => {
    if (!scanning || !currentRun) return
    const timer = setInterval(async () => {
      try {
        const prog = await opsApi.getScanProgress(currentRun.run_id)
        setCurrentRun(prog)
        if (prog.status !== 'running') {
          setScanning(false)
          clearInterval(timer)
          loadData()
        }
      } catch { clearInterval(timer); setScanning(false) }
    }, 2500)
    setPollTimer(timer)
    return () => clearInterval(timer)
  }, [scanning, currentRun, loadData])

  useEffect(() => { return () => { if (pollTimer) clearInterval(pollTimer) } }, [pollTimer])

  const handleTriggerScan = async () => {
    if (!brandInput.trim()) return
    setScanning(true)
    try {
      await opsApi.triggerScan(projectId, {
        client_brand: brandInput,
        triggered_by: 'manual',
        tier_filter: tierFilter === 'all' ? null : tierFilter,
      })
      // Give backend 1s to create the run record, then start polling
      setTimeout(async () => {
        const runs = await opsApi.listScanRuns(projectId, 1)
        if (runs[0]) {
          const prog = await opsApi.getScanProgress(runs[0].id)
          setCurrentRun(prog)
        }
      }, 1200)
    } catch { setScanning(false) }
  }

  const handleViewResults = async (runId: string) => {
    if (selectedRun === runId) { setSelectedRun(null); return }
    setSelectedRun(runId)
    setLoadingResults(true)
    try {
      const results = await opsApi.getScanResults(runId)
      setRunResults(results)
    } finally { setLoadingResults(false) }
  }

  // Simple bar chart via CSS
  const maxVis = Math.max(...trend.map(t => t.visibility_rate), 1)

  const TIER_COLORS: Record<string, string> = {
    top20: 'text-orange-600', core60: 'text-blue-600', longtail: 'text-gray-500',
  }

  return (
    <div className="space-y-6">
      {/* Scan trigger panel */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Radio className="w-4 h-4 text-red-500" />
          <h3 className="text-sm font-semibold text-gray-800">Trigger AI Visibility Scan</h3>
          <span className="text-xs text-gray-400 ml-1">— OpenClaw also calls this automatically</span>
        </div>
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-gray-500 block mb-1">Client Brand Name</label>
            <input
              value={brandInput}
              onChange={e => setBrandInput(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
              placeholder="e.g. Acme Corp"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Tier Filter</label>
            <select
              value={tierFilter}
              onChange={e => setTierFilter(e.target.value as typeof tierFilter)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
            >
              <option value="all">All Prompts</option>
              <option value="top20">Top 20 only</option>
              <option value="core60">Core 60 only</option>
              <option value="longtail">Long-tail only</option>
            </select>
          </div>
          <button
            onClick={handleTriggerScan}
            disabled={scanning || !brandInput.trim()}
            className="flex items-center gap-2 px-5 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
          >
            {scanning
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Scanning...</>
              : <><Play className="w-4 h-4" /> Run Scan</>
            }
          </button>
        </div>

        {/* Live progress bar */}
        {scanning && currentRun && (
          <div className="mt-4 p-3 bg-red-50 rounded-xl border border-red-100">
            <div className="flex items-center justify-between text-xs text-red-700 mb-2">
              <span className="font-medium">Scanning prompts...</span>
              <span>{currentRun.prompts_done} / {currentRun.prompts_total}</span>
            </div>
            <div className="h-2 bg-red-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 rounded-full transition-all duration-500"
                style={{ width: `${currentRun.pct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-red-600 mt-1.5">
              <span>{currentRun.pct.toFixed(0)}% complete</span>
              <span>
                {currentRun.mentioned_count} mentioned so far
                ({currentRun.prompts_done > 0
                  ? Math.round(currentRun.mentioned_count / currentRun.prompts_done * 100)
                  : 0}% vis)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Visibility trend chart */}
      {trend.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-800">AI Visibility Trend</h3>
            <span className="text-xs text-gray-400">{trend.length} scans</span>
          </div>
          <div className="flex items-end gap-2 h-32">
            {trend.map((t, i) => {
              const pct = maxVis > 0 ? (t.visibility_rate / maxVis) * 100 : 0
              const isLast = i === trend.length - 1
              return (
                <div key={t.run_id} className="flex-1 flex flex-col items-center gap-1 group">
                  <span className={`text-[10px] font-bold ${isLast ? 'text-red-600' : 'text-gray-400'}`}>
                    {t.visibility_rate.toFixed(0)}%
                  </span>
                  <div className="w-full relative">
                    <div
                      className={`w-full rounded-t-sm transition-all ${isLast ? 'bg-red-500' : 'bg-red-200 group-hover:bg-red-300'}`}
                      style={{ height: `${Math.max(4, pct * 0.7)}px` }}
                    />
                  </div>
                  <span className="text-[9px] text-gray-400 rotate-[-45deg] origin-top-left translate-y-3 whitespace-nowrap">
                    {t.date.slice(5)}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="mt-5 flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" />
              Latest
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-200 inline-block" />
              Previous scans
            </span>
          </div>
        </div>
      )}

      {/* Per-prompt visibility table */}
      {promptVis.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">
            Prompt Visibility Breakdown
            <span className="ml-2 text-xs font-normal text-gray-400">sorted by visibility (low → high)</span>
          </h3>
          <div className="space-y-2">
            {promptVis.map(p => {
              const vis = p.visibility_rate
              const barColor = vis >= 30 ? 'bg-green-400' : vis >= 15 ? 'bg-yellow-400' : 'bg-red-400'
              const textColor = vis >= 30 ? 'text-green-600' : vis >= 15 ? 'text-yellow-600' : 'text-red-500'
              return (
                <div key={p.prompt_id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700 truncate">{p.prompt_text}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-medium ${TIER_COLORS[p.tier] || 'text-gray-500'}`}>
                        {p.tier}
                      </span>
                      {p.intent_type && (
                        <span className="text-[10px] text-gray-400">{p.intent_type.replace('_', ' ')}</span>
                      )}
                      <span className="text-[10px] text-gray-400">{p.runs_count} runs</span>
                    </div>
                  </div>
                  <div className="w-24 flex-shrink-0">
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-0.5">
                      <div className={`h-full rounded-full ${barColor}`} style={{ width: `${vis}%` }} />
                    </div>
                    <span className={`text-[10px] font-bold ${textColor}`}>{vis.toFixed(0)}%</span>
                  </div>
                </div>
              )
            })}
          </div>
          {promptVis.filter(p => p.visibility_rate === 0).length > 0 && (
            <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-100">
              <p className="text-xs text-red-700 font-medium">
                ⚠ {promptVis.filter(p => p.visibility_rate === 0).length} prompts with 0% visibility — consider replacing them
              </p>
            </div>
          )}
        </div>
      )}

      {/* Scan history */}
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-red-400 animate-spin" /></div>
      ) : scanRuns.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-xl border border-gray-100">
          <Zap className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">No scans yet. Run your first AI Visibility scan above.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">Scan History</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {scanRuns.map(run => {
              const isSelected = selectedRun === run.id
              const statusCfg = {
                completed: { color: 'text-green-600 bg-green-50', label: 'Done' },
                running:   { color: 'text-yellow-600 bg-yellow-50', label: 'Running' },
                failed:    { color: 'text-red-600 bg-red-50', label: 'Failed' },
              }[run.status] || { color: 'text-gray-500 bg-gray-100', label: run.status }

              return (
                <div key={run.id}>
                  <div
                    className="px-5 py-3 flex items-center gap-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleViewResults(run.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(run.started_at).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                          {run.triggered_by}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-600 flex-shrink-0">
                      <span className="font-bold text-red-600">{run.visibility_rate.toFixed(1)}%</span>
                      <span className="text-gray-400">{run.mentioned_count}/{run.prompts_total} prompts</span>
                      <span className="text-gray-400">{run.credits_cost}cr</span>
                      <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isSelected ? 'rotate-180' : ''}`} />
                    </div>
                  </div>

                  {/* Expanded results */}
                  {isSelected && (
                    <div className="bg-gray-50 border-t border-gray-100 px-5 py-3">
                      {loadingResults ? (
                        <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 text-red-400 animate-spin" /></div>
                      ) : runResults.length === 0 ? (
                        <p className="text-xs text-gray-400 py-2">No results found.</p>
                      ) : (
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                          {runResults.map(r => (
                            <div key={r.id} className={`flex items-start gap-3 p-2.5 rounded-lg ${r.brand_mentioned ? 'bg-green-50 border border-green-100' : 'bg-white border border-gray-100'}`}>
                              <div className="flex-shrink-0 mt-0.5">
                                {r.brand_mentioned
                                  ? <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                                  : <XCircle className="w-3.5 h-3.5 text-gray-300" />
                                }
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-700 font-medium truncate">{r.prompt_text}</p>
                                {r.brand_mentioned && r.response_excerpt && (
                                  <p className="text-[11px] text-gray-500 mt-1 italic line-clamp-2">
                                    &ldquo;{r.response_excerpt}&rdquo;
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-1">
                                  {r.mention_type && r.mention_type !== 'not_mentioned' && (
                                    <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                                      {r.mention_type.replace('_', ' ')}
                                    </span>
                                  )}
                                  {r.sentiment && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                      r.sentiment === 'positive' ? 'bg-green-100 text-green-700'
                                      : r.sentiment === 'negative' ? 'bg-red-100 text-red-700'
                                      : 'bg-gray-100 text-gray-600'
                                    }`}>
                                      {r.sentiment}
                                    </span>
                                  )}
                                  {r.cited_urls?.length > 0 && (
                                    <span className="text-[10px] text-blue-500">
                                      {r.cited_urls.length} URL cited
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Stage Gate Modal ─────────────────────────────────────────────────────────
function AddGateModal({ projectId, onClose, onAdded }: {
  projectId: string
  onClose: () => void
  onAdded: (g: StageGate) => void
}) {
  const [form, setForm] = useState({
    week: 4, visibility_rate: '', target_rate: '', decision: '' as StageGateDecision | '', notes: '',
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload: Partial<StageGate> = {
        project_id: projectId,
        week: form.week,
        visibility_rate: form.visibility_rate ? Number(form.visibility_rate) : undefined,
        target_rate: form.target_rate ? Number(form.target_rate) : undefined,
        decision: form.decision || undefined,
        notes: form.notes || undefined,
        completed_at: new Date().toISOString(),
      }
      const gate = await opsApi.createStageGate(projectId, payload)
      onAdded(gate)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Record Stage Gate</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Gate Week</label>
            <select
              value={form.week}
              onChange={e => setForm(f => ({ ...f, week: Number(e.target.value) }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
            >
              {[4, 8, 12, 16, 24].map(w => <option key={w} value={w}>Week {w}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Actual Visibility %</label>
              <input
                type="number" min={0} max={100}
                value={form.visibility_rate}
                onChange={e => setForm(f => ({ ...f, visibility_rate: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                placeholder="e.g. 25"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Target %</label>
              <input
                type="number" min={0} max={100}
                value={form.target_rate}
                onChange={e => setForm(f => ({ ...f, target_rate: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                placeholder="e.g. 30"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Decision</label>
            <select
              value={form.decision}
              onChange={e => setForm(f => ({ ...f, decision: e.target.value as StageGateDecision | '' }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
            >
              <option value="">— Select —</option>
              <option value="continue">✅ Continue</option>
              <option value="correct">⚠️ Correct</option>
              <option value="stop_loss">🛑 Stop Loss</option>
              <option value="upsell">🚀 Upsell</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none"
              placeholder="Key observations, root causes, action plan..."
            />
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Record Gate
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Project Detail Page ──────────────────────────────────────────────────
export default function ProjectDetailPage({ projectId: projectIdProp }: { projectId?: string } = {}) {
  const params = useParams<{ project_id: string }>()
  const router = useRouter()
  const { role } = useAuth()
  const projectId = projectIdProp || params?.project_id || ''

  const [project, setProject] = useState<ManagedProject | null>(null)
  const [stageGates, setStageGates] = useState<StageGate[]>([])
  const [prompts, setPrompts] = useState<OpsPrompt[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('overview')
  const [showGateModal, setShowGateModal] = useState(false)

  const load = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const [proj, prs, gates] = await Promise.all([
        opsApi.getProject(projectId),
        opsApi.listPrompts(projectId),
        opsApi.listStageGates(projectId),
      ])
      setProject(proj)
      setPrompts(prs)
      setStageGates(gates)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { load() }, [load])

  if (role && role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Admin access required</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-red-400 animate-spin" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500">Project not found</p>
          <button onClick={() => router.push('/dashboard/ops')} className="mt-3 text-red-500 text-sm hover:underline">
            ← Back to Managed Service
          </button>
          
        </div>
      </div>
    )
  }

  const tabs: { id: Tab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'overview', label: 'Overview',        icon: Activity },
    { id: 'prompts',  label: `Prompts (${prompts.length})`, icon: MessageSquare },
    { id: 'content',  label: 'Content & QA',    icon: FileText },
    { id: 'monitor',  label: 'AI Visibility',   icon: Radio },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center gap-3 py-4">
            <button
              onClick={() => router.push('/dashboard/ops')}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Back to Managed Service"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                <Briefcase className="w-4 h-4 text-red-500" />
              </div>
              <div className="min-w-0">
                <h1 className="text-[15px] font-bold text-gray-900 truncate">{project.client_name}</h1>
                {project.client_domain && (
                  <p className="text-xs text-gray-400">{project.client_domain}</p>
                )}
              </div>
            </div>
            <button
              onClick={load}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 -mb-px">
            {tabs.map(t => {
              const Icon = t.icon
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    tab === t.id
                      ? 'border-red-500 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        {tab === 'overview' && (
          <OverviewTab
            project={project}
            stageGates={stageGates}
            onAddGate={() => setShowGateModal(true)}
          />
        )}
        {tab === 'prompts' && <PromptsTab projectId={projectId} />}
        {tab === 'content' && <ContentTab projectId={projectId} prompts={prompts} />}
        {tab === 'monitor' && <MonitorTab project={project} />}
      </div>

      {showGateModal && (
        <AddGateModal
          projectId={projectId}
          onClose={() => setShowGateModal(false)}
          onAdded={gate => {
            setStageGates(prev => [...prev, gate])
            setShowGateModal(false)
          }}
        />
      )}
    </div>
  )
}

// Re-export for Next.js dynamic import
function Briefcase({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    </svg>
  )
}
