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
  active:    { label: 'Active',    color: 'bg-sage-bg text-sage',         dot: 'bg-sage' },
  paused:    { label: 'Paused',    color: 'bg-caution-bg text-caution',   dot: 'bg-caution' },
  completed: { label: 'Completed', color: 'bg-surface-warm text-ink-2',   dot: 'bg-ink-2' },
  cancelled: { label: 'Cancelled', color: 'bg-surface-warm text-ink-3',   dot: 'bg-ink-3' },
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
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-divider-light">
          <h2 className="text-lg font-semibold text-ink">New Client Project</h2>
          <button onClick={onClose} className="text-ink-3 hover:text-ink-2 text-xl font-light">&times;</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-2 mb-1">Client Name *</label>
            <input
              value={form.client_name}
              onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))}
              className="w-full border border-divider rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink"
              placeholder="e.g. Acme Corp"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1">Domain</label>
              <input
                value={form.client_domain || ''}
                onChange={e => setForm(f => ({ ...f, client_domain: e.target.value }))}
                className="w-full border border-divider rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink"
                placeholder="acme.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1">Industry</label>
              <input
                value={form.industry || ''}
                onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
                className="w-full border border-divider rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink"
                placeholder="SaaS / E-commerce / ..."
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-2 mb-1">Contact Email</label>
            <input
              value={form.contact_email || ''}
              onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))}
              className="w-full border border-divider rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink"
              placeholder="pm@client.com"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1">Start Date</label>
              <input
                type="date"
                value={form.start_date || ''}
                onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                className="w-full border border-divider rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1">Current Stage</label>
              <select
                value={form.stage}
                onChange={e => setForm(f => ({ ...f, stage: Number(e.target.value) }))}
                className="w-full border border-divider rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink"
              >
                {Object.entries(STAGE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>Stage {k} — {v}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-2 mb-1">Notes</label>
            <textarea
              value={form.notes || ''}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full border border-divider rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink resize-none"
              placeholder="Internal notes..."
            />
          </div>
          {error && <p className="text-red-soft text-xs">{error}</p>}
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 py-2 border border-divider rounded-lg text-sm text-ink-2 hover:bg-surface-warm">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 py-2 bg-ink text-ink-inv rounded-lg text-sm font-medium hover:bg-[#2d2d2c] disabled:opacity-50 flex items-center justify-center gap-2"
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
    { label: 'Active Projects', value: stats.active_projects, icon: Briefcase, color: 'text-ink-2' },
    { label: 'Total Prompts',   value: stats.total_prompts,   icon: MessageSquare, color: 'text-ink-2' },
    { label: 'Top 20 Prompts',  value: stats.top20_prompts,   icon: Target,   color: 'text-caution' },
    { label: 'QA Pending',      value: stats.qa_pending_content, icon: Clock, color: 'text-caution' },
    { label: 'Published',       value: stats.published_content, icon: CheckCircle, color: 'text-sage' },
    { label: 'Avg Visibility',  value: `${stats.avg_visibility_rate}%`, icon: TrendingUp, color: 'text-red-soft' },
  ]
  return (
    <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {items.map(item => (
        <div key={item.label} className="bg-surface rounded-xl border border-divider-light p-4 shadow-sm">
          <item.icon className={`w-5 h-5 ${item.color} mb-2`} strokeWidth={1.8} />
          <div className="text-xl font-bold text-ink">{item.value}</div>
          <div className="text-xs text-ink-3 mt-0.5">{item.label}</div>
        </div>
      ))}
    </div>
  )
}

// ─── Project Card ─────────────────────────────────────────────────────────────
function ProjectCard({ project, onClick }: { project: ManagedProject; onClick: () => void }) {
  const cfg = STATUS_CFG[project.status]
  const visRate = project.visibility_rate ?? 0
  const visColor = visRate >= 30 ? 'text-sage' : visRate >= 15 ? 'text-caution' : 'text-red-soft'

  return (
    <div
      onClick={onClick}
      className="bg-surface rounded-xl border border-divider-light shadow-sm hover:shadow-md hover:border-divider transition-all cursor-pointer p-5 group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-semibold text-ink truncate group-hover:text-ink-2 transition-colors">
            {project.client_name}
          </h3>
          {project.client_domain && (
            <p className="text-xs text-ink-3 mt-0.5">{project.client_domain}</p>
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
        <div className="flex items-center justify-between text-xs text-ink-3 mb-1">
          <span>Stage {project.stage} — {STAGE_LABELS[project.stage]}</span>
          <span>{project.stage}/6</span>
        </div>
        <div className="h-1.5 bg-surface-warm rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-ink to-ink-2 rounded-full transition-all"
            style={{ width: `${(project.stage / 6) * 100}%` }}
          />
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <div className="text-center">
          <div className="text-sm font-bold text-ink">{project.prompt_count ?? 0}</div>
          <div className="text-[10px] text-ink-3">Prompts</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-bold text-caution">{project.top20_count ?? 0}</div>
          <div className="text-[10px] text-ink-3">Top 20</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-bold text-ink">{project.content_count ?? 0}</div>
          <div className="text-[10px] text-ink-3">Content</div>
        </div>
        <div className="text-center">
          <div className={`text-sm font-bold ${visColor}`}>{visRate}%</div>
          <div className="text-[10px] text-ink-3">Visibility</div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        {project.industry && (
          <span className="text-[10px] bg-surface-warm text-ink-3 px-2 py-0.5 rounded-full">{project.industry}</span>
        )}
        <ChevronRight className="w-4 h-4 text-ink-3 group-hover:text-ink-2 transition-colors ml-auto" />
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
    <Suspense fallback={<div className="min-h-screen bg-canvas flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-ink border-t-transparent animate-spin" /></div>}>
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

  // Guard: admin or staff (staff sidebar filtering already gates by permission)
  if (role && role !== 'admin' && role !== 'staff') {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-soft mx-auto mb-3" />
          <p className="text-ink-2">Internal access required</p>
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
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <div className="bg-surface border-b border-divider-light sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-surface-warm flex items-center justify-center">
                <Activity className="w-5 h-5 text-ink-2" strokeWidth={1.8} />
              </div>
              <div>
                <h1 className="text-lg font-bold text-ink">Managed Service</h1>
                <p className="text-xs text-ink-3">Internal ops — GEO delivery & client projects</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={load}
                disabled={loading}
                aria-label="Refresh projects"
                title="Refresh projects"
                className="p-2 text-ink-3 hover:text-ink-2 hover:bg-surface-muted rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-ink/10"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-4 py-2 bg-ink text-ink-inv rounded-lg text-sm font-medium hover:bg-[#2d2d2c] transition-colors shadow-sm"
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search clients..."
              className="w-full pl-9 pr-4 py-2 border border-divider rounded-lg text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink"
            />
          </div>
          <div className="flex gap-1">
            {(['all', 'active', 'paused', 'completed', 'cancelled'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                  statusFilter === s
                    ? 'bg-ink text-ink-inv'
                    : 'bg-surface border border-divider text-ink-2 hover:bg-surface-warm'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-soft-bg border border-red-soft/30 rounded-xl p-4 mb-5 flex items-center gap-2 text-red-soft text-sm">
            <XCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-ink-2 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Briefcase className="w-12 h-12 text-ink-3 mx-auto mb-3" />
            <p className="text-ink-3 text-sm">
              {projects.length === 0 ? 'No projects yet. Create your first client project.' : 'No projects match your filters.'}
            </p>
            {projects.length === 0 && (
              <button
                onClick={() => setShowCreate(true)}
                className="mt-4 px-4 py-2 bg-ink text-ink-inv rounded-lg text-sm font-medium hover:bg-[#2d2d2c]"
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
