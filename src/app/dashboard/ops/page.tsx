'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import ProjectDetailPage from './[project_id]/ProjectDetailClient'
import {
  opsApi,
  ManagedProject,
  ManagedProjectCreate,
  OpsStats,
  ProjectStatus,
} from '@/lib/api'
import {
  Briefcase, Plus, Search, ChevronRight, TrendingUp,
  Users, MessageSquare, FileText, CheckCircle, AlertCircle,
  Clock, XCircle, Loader2, RefreshCw, Target, Activity,
} from 'lucide-react'

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CFG: Record<ProjectStatus, { label: string; color: string; dot: string }> = {
  active:    { label: 'Active',    color: 'bg-green-100 text-green-700',  dot: 'bg-green-500' },
  paused:    { label: 'Paused',    color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  completed: { label: 'Completed', color: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-500' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-500',    dot: 'bg-gray-400' },
}

const STAGE_LABELS: Record<number, string> = {
  1: 'W1–4 Diagnosis', 2: 'W5–8 Baseline', 3: 'W9–12 Scale',
  4: 'W13–16 Amplify', 5: 'W17–20 Optimize', 6: 'W21–24 Handoff',
}

// ─── Create Project Modal ──────────────────────────────────────────────────────
function CreateProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: (p: ManagedProject) => void }) {
  const [form, setForm] = useState<ManagedProjectCreate>({
    client_name: '',
    client_domain: '',
    industry: '',
    contact_email: '',
    start_date: new Date().toISOString().slice(0, 10),
    stage: 1,
    status: 'active',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!form.client_name.trim()) { setError('Client name is required'); return }
    setSaving(true)
    setError('')
    try {
      const proj = await opsApi.createProject(form)
      onCreated(proj)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create project')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">New Client Project</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-light">&times;</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Client Name *</label>
            <input
              value={form.client_name}
              onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              placeholder="e.g. Acme Corp"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Domain</label>
              <input
                value={form.client_domain || ''}
                onChange={e => setForm(f => ({ ...f, client_domain: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                placeholder="acme.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Industry</label>
              <input
                value={form.industry || ''}
                onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                placeholder="SaaS / E-commerce / ..."
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Contact Email</label>
            <input
              value={form.contact_email || ''}
              onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              placeholder="pm@client.com"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
              <input
                type="date"
                value={form.start_date || ''}
                onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Current Stage</label>
              <select
                value={form.stage}
                onChange={e => setForm(f => ({ ...f, stage: Number(e.target.value) }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              >
                {Object.entries(STAGE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>Stage {k} — {v}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea
              value={form.notes || ''}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
              placeholder="Internal notes..."
            />
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Create Project
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Stats Cards ──────────────────────────────────────────────────────────────
function StatsBar({ stats }: { stats: OpsStats }) {
  const items = [
    { label: 'Active Projects', value: stats.active_projects, icon: Briefcase, color: 'text-blue-500' },
    { label: 'Total Prompts',   value: stats.total_prompts,   icon: MessageSquare, color: 'text-purple-500' },
    { label: 'Top 20 Prompts',  value: stats.top20_prompts,   icon: Target,   color: 'text-orange-500' },
    { label: 'QA Pending',      value: stats.qa_pending_content, icon: Clock, color: 'text-yellow-500' },
    { label: 'Published',       value: stats.published_content, icon: CheckCircle, color: 'text-green-500' },
    { label: 'Avg Visibility',  value: `${stats.avg_visibility_rate}%`, icon: TrendingUp, color: 'text-red-500' },
  ]
  return (
    <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {items.map(item => (
        <div key={item.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <item.icon className={`w-5 h-5 ${item.color} mb-2`} strokeWidth={1.8} />
          <div className="text-xl font-bold text-gray-900">{item.value}</div>
          <div className="text-xs text-gray-500 mt-0.5">{item.label}</div>
        </div>
      ))}
    </div>
  )
}

// ─── Project Card ─────────────────────────────────────────────────────────────
function ProjectCard({ project, onClick }: { project: ManagedProject; onClick: () => void }) {
  const cfg = STATUS_CFG[project.status]
  const visRate = project.visibility_rate ?? 0
  const visColor = visRate >= 30 ? 'text-green-600' : visRate >= 15 ? 'text-yellow-600' : 'text-red-500'

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-red-200 transition-all cursor-pointer p-5 group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-semibold text-gray-900 truncate group-hover:text-red-600 transition-colors">
            {project.client_name}
          </h3>
          {project.client_domain && (
            <p className="text-xs text-gray-400 mt-0.5">{project.client_domain}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
          <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
        </div>
      </div>

      {/* Stage progress */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>Stage {project.stage} — {STAGE_LABELS[project.stage]}</span>
          <span>{project.stage}/6</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-red-400 to-orange-400 rounded-full transition-all"
            style={{ width: `${(project.stage / 6) * 100}%` }}
          />
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <div className="text-center">
          <div className="text-sm font-bold text-gray-800">{project.prompt_count ?? 0}</div>
          <div className="text-[10px] text-gray-400">Prompts</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-bold text-orange-500">{project.top20_count ?? 0}</div>
          <div className="text-[10px] text-gray-400">Top 20</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-bold text-gray-800">{project.content_count ?? 0}</div>
          <div className="text-[10px] text-gray-400">Content</div>
        </div>
        <div className="text-center">
          <div className={`text-sm font-bold ${visColor}`}>{visRate}%</div>
          <div className="text-[10px] text-gray-400">Visibility</div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        {project.industry && (
          <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{project.industry}</span>
        )}
        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-red-400 transition-colors ml-auto" />
      </div>
    </div>
  )
}

// ─── Main Page (with query-param routing for static export compatibility) ─────
function OpsConsoleInner() {
  const { role } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedId = searchParams.get('id')

  // If a project id is selected, render the detail view
  if (selectedId) {
    return <ProjectDetailPage projectId={selectedId} />
  }

  return <OpsListView role={role} router={router} />
}

export default function OpsConsolePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-red-400 border-t-transparent animate-spin" /></div>}>
      <OpsConsoleInner />
    </Suspense>
  )
}

function OpsListView({ role, router }: { role: string | null; router: ReturnType<typeof useRouter> }) {
  const [projects, setProjects] = useState<ManagedProject[]>([])
  const [stats, setStats] = useState<OpsStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [projs, st] = await Promise.all([
        opsApi.listProjects(),
        opsApi.getStats(),
      ])
      setProjects(projs)
      setStats(st)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Guard: admin only
  if (role && role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-gray-600">Admin access required</p>
        </div>
      </div>
    )
  }

  const filtered = projects.filter(p => {
    const matchSearch = !search || p.client_name.toLowerCase().includes(search.toLowerCase()) ||
      (p.client_domain || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.industry || '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || p.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
                <Activity className="w-5 h-5 text-red-500" strokeWidth={1.8} />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Managed Service</h1>
                <p className="text-xs text-gray-500">Internal ops — GEO delivery & client projects</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={load}
                disabled={loading}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                New Project
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Stats Bar */}
        {stats && <StatsBar stats={stats} />}

        {/* Filters */}
        <div className="flex items-center gap-3 mb-5">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search clients..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-300"
            />
          </div>
          <div className="flex gap-1">
            {(['all', 'active', 'paused', 'completed', 'cancelled'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                  statusFilter === s
                    ? 'bg-red-500 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 flex items-center gap-2 text-red-600 text-sm">
            <XCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-red-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Briefcase className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              {projects.length === 0 ? 'No projects yet. Create your first client project.' : 'No projects match your filters.'}
            </p>
            {projects.length === 0 && (
              <button
                onClick={() => setShowCreate(true)}
                className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600"
              >
                + New Project
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(p => (
              <ProjectCard
                key={p.id}
                project={p}
                onClick={() => router.push(`/dashboard/ops?id=${p.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreated={proj => {
            setProjects(prev => [proj, ...prev])
            setShowCreate(false)
            router.push(`/dashboard/ops?id=${proj.id}`)
          }}
        />
      )}
    </div>
  )
}
