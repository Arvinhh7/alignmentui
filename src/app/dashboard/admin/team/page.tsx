'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Users, RefreshCw, UserPlus } from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''

// ── Permission definitions ─────────────────────────────────────────────────────

const PERMISSION_KEYS: { key: string; label: string; group: string }[] = [
  { key: 'overview',          label: 'Overview',          group: 'Analytics' },
  { key: 'explore',           label: 'Explore',           group: 'Insights' },
  { key: 'ai-search',         label: 'AI Research',       group: 'Insights' },
  { key: 'shopping',          label: 'Shopping',          group: 'Insights' },
  { key: 'geo-monitor',       label: 'Monitoring',        group: 'Actions' },
  { key: 'analysis',          label: 'Analysis',          group: 'Actions' },
  { key: 'geo-audit',         label: 'Web Infrastructure', group: 'Assistant' },
  { key: 'prompts',           label: 'Prompt Library',    group: 'Context' },
  { key: 'brand-hub',         label: 'Brand Hub',         group: 'Context' },
  { key: 'visibility-proxy',  label: 'Visibility Proxy',  group: 'Integrations' },
  { key: 'ga4-attribution',   label: 'GA4 Attribution',   group: 'Integrations' },
  { key: 'geo-optimization',  label: 'GEO Optimization',  group: 'Hidden' },
  { key: 'ads',               label: 'AI Ads',            group: 'Hidden' },
  { key: 'gci',               label: 'GCI',               group: 'Hidden' },
  { key: 'geo-content',       label: 'Agent',             group: 'Hidden' },
  { key: 'geo-distribution',  label: 'GEO Distribute',    group: 'Hidden' },
  { key: 'agentic-commerce',  label: 'Agentic Commerce',  group: 'Hidden' },
  { key: 'ops',               label: 'Managed Service',   group: 'Operations' },
  { key: 'customers',         label: 'Customers',         group: 'Admin' },
]

// ── Types ──────────────────────────────────────────────────────────────────────

interface StaffMember {
  id: string
  email: string
  full_name: string
  permissions: Record<string, boolean>
  created_at: string
}

interface ProvisionResult {
  email: string
  status: 'created' | 'exists' | 'error'
  error?: string
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function TeamManagement() {
  const { role } = useAuth()
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [provisioning, setProvisioning] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  /** Local edit state: { [userId]: { permKey: boolean } } */
  const [localPerms, setLocalPerms] = useState<Record<string, Record<string, boolean>>>({})
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text })
    setTimeout(() => setFeedback(null), 5000)
  }

  // ── Load staff list ────────────────────────────────────────────────────
  const loadStaff = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/admin/team`)
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      const members: StaffMember[] = data.staff ?? []
      setStaff(members)
      // Mirror server state into local edit state
      const perms: Record<string, Record<string, boolean>> = {}
      for (const m of members) {
        perms[m.id] = { ...(m.permissions ?? {}) }
      }
      setLocalPerms(perms)
    } catch (e: unknown) {
      showFeedback('error', `Failed to load team: ${(e as Error).message}`)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadStaff() }, [loadStaff])

  // ── Provision ──────────────────────────────────────────────────────────
  const handleProvision = async () => {
    setProvisioning(true)
    try {
      const res = await fetch(`${API_BASE}/api/admin/team/provision-staff`, { method: 'POST' })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      const results: ProvisionResult[] = data.results ?? []
      const created  = results.filter(r => r.status === 'created').length
      const existing = results.filter(r => r.status === 'exists').length
      const errors   = results.filter(r => r.status === 'error')
      if (errors.length > 0) {
        showFeedback('error', `Errors: ${errors.map(e => `${e.email}: ${e.error}`).join('; ')}`)
      } else {
        showFeedback('success', `Done — ${created} created, ${existing} already existed.`)
      }
      await loadStaff()
    } catch (e: unknown) {
      showFeedback('error', `Provision failed: ${(e as Error).message}`)
    } finally {
      setProvisioning(false)
    }
  }

  // ── Toggle single permission ───────────────────────────────────────────
  const togglePermission = (userId: string, key: string) => {
    setLocalPerms(prev => ({
      ...prev,
      [userId]: { ...(prev[userId] ?? {}), [key]: !prev[userId]?.[key] },
    }))
  }

  // ── Select / Clear All ─────────────────────────────────────────────────
  const selectAll = (userId: string) => {
    const all: Record<string, boolean> = {}
    PERMISSION_KEYS.forEach(({ key }) => { all[key] = true })
    setLocalPerms(prev => ({ ...prev, [userId]: all }))
  }

  const clearAll = (userId: string) => {
    setLocalPerms(prev => ({ ...prev, [userId]: {} }))
  }

  // ── Save permissions ───────────────────────────────────────────────────
  const handleSave = async (userId: string) => {
    setSavingId(userId)
    try {
      const res = await fetch(`${API_BASE}/api/admin/team/${userId}/permissions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: localPerms[userId] ?? {} }),
      })
      if (!res.ok) throw new Error(await res.text())
      showFeedback('success', 'Permissions saved.')
      await loadStaff()
    } catch (e: unknown) {
      showFeedback('error', `Save failed: ${(e as Error).message}`)
    } finally {
      setSavingId(null)
    }
  }

  // ── Guard ──────────────────────────────────────────────────────────────
  if (role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-full py-24">
        <p className="text-ink-3 text-lg">Admin access required.</p>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto p-8 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <Users className="w-6 h-6" />
            Team Management
          </h1>
          <p className="text-sm text-ink-3 mt-1">
            Assign feature access to staff accounts. Staff can only access features you enable.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadStaff}
            disabled={loading}
            aria-label="Refresh"
            className="w-9 h-9 flex items-center justify-center text-ink-3 hover:text-ink hover:bg-surface-muted rounded-lg transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleProvision}
            disabled={provisioning}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-ink text-ink-inv text-sm font-medium rounded-xl hover:bg-[#2d2d2c] disabled:opacity-50 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            {provisioning ? 'Provisioning…' : 'Provision Staff Accounts'}
          </button>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`p-3 rounded-xl text-sm font-medium ${
          feedback.type === 'success'
            ? 'bg-sage-bg text-sage border border-sage/30'
            : 'bg-red-soft-bg text-red-soft border border-red-soft/30'
        }`}>
          {feedback.text}
        </div>
      )}

      {/* Info box */}
      <div className="bg-surface-warm border border-divider-light rounded-xl px-4 py-3 text-sm text-ink-2">
        <strong className="font-semibold text-ink">How it works:</strong>
        {' '}Staff accounts log in with their email and password <code className="font-mono bg-canvas px-1 py-0.5 rounded text-xs">test2026</code>.
        They only see the features you check below. Settings is always visible.
        Changes take effect on the staff member's next page load.
      </div>

      {/* Staff cards */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-ink border-t-transparent rounded-full animate-spin" />
        </div>
      ) : staff.length === 0 ? (
        <div className="bg-surface border border-divider rounded-2xl p-10 text-center">
          <Users className="w-10 h-10 text-ink-3 mx-auto mb-3" />
          <p className="font-semibold text-ink-2">No staff accounts yet</p>
          <p className="text-sm text-ink-3 mt-1">
            Click <strong>Provision Staff Accounts</strong> to create staff001, staff002, and staff003.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {staff.map((member) => {
            const perms = localPerms[member.id] ?? {}
            const checkedCount = PERMISSION_KEYS.filter(({ key }) => !!perms[key]).length

            return (
              <div key={member.id} className="bg-surface border border-divider rounded-2xl p-6 space-y-5">

                {/* Staff header row */}
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[rgba(100,180,255,0.10)] border border-[rgba(100,180,255,0.2)] flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-[rgba(100,180,255,0.85)]">
                        {member.email.split('@')[0].replace(/[^0-9]/g, '').padStart(2, '0')}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-ink text-sm">{member.email}</p>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-[rgba(100,180,255,0.12)] text-[rgba(100,180,255,0.85)] border-[rgba(100,180,255,0.25)]">
                          STAFF
                        </span>
                      </div>
                      <p className="text-xs text-ink-3 mt-0.5">
                        {checkedCount}/{PERMISSION_KEYS.length} features enabled
                        {' · '}password: <code className="font-mono">test2026</code>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSave(member.id)}
                    disabled={savingId === member.id}
                    className="px-4 py-2 bg-ink text-ink-inv text-sm font-medium rounded-xl hover:bg-[#2d2d2c] disabled:opacity-50 transition-colors"
                  >
                    {savingId === member.id ? 'Saving…' : 'Save Permissions'}
                  </button>
                </div>

                {/* Permission checkboxes */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {PERMISSION_KEYS.map(({ key, label, group }) => {
                    const checked = !!perms[key]
                    return (
                      <label
                        key={key}
                        className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer select-none transition-all ${
                          checked
                            ? 'bg-sage-bg border-sage/25 text-sage'
                            : 'bg-canvas border-divider-light text-ink-3 hover:border-divider hover:text-ink-2'
                        }`}
                      >
                        {/* Custom checkbox visual */}
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-colors ${
                            checked ? 'bg-sage border-sage' : 'border-divider bg-transparent'
                          }`}
                        >
                          {checked && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 10">
                              <path stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" d="M1 5l3.5 3.5L11 1" />
                            </svg>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium leading-tight truncate">{label}</p>
                          <p className={`text-[10px] leading-tight mt-0.5 truncate ${checked ? 'opacity-60' : 'opacity-50'}`}>{group}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePermission(member.id, key)}
                          className="sr-only"
                        />
                      </label>
                    )
                  })}
                </div>

                {/* Quick actions */}
                <div className="flex items-center gap-3 pt-1 border-t border-divider-light">
                  <button
                    onClick={() => selectAll(member.id)}
                    className="text-xs text-ink-3 hover:text-ink transition-colors"
                  >
                    Select All
                  </button>
                  <span className="text-ink-3 text-xs">·</span>
                  <button
                    onClick={() => clearAll(member.id)}
                    className="text-xs text-ink-3 hover:text-ink transition-colors"
                  >
                    Clear All
                  </button>
                  <span className="ml-auto text-[10px] text-ink-3">
                    {checkedCount} of {PERMISSION_KEYS.length} selected
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
