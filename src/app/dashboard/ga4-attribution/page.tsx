'use client'

import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/Header'
import { useLanguage } from '@/lib/LanguageContext'
import { useAuth } from '@/hooks/useAuth'
import { api, ROIEstimate } from '@/lib/api'
import {
  BarChart3, TrendingUp, DollarSign, Users, MousePointerClick,
  RefreshCw, Link2, AlertCircle, CheckCircle2, ChevronRight,
  ArrowUpRight, ArrowDownRight, Target, ExternalLink, Loader2, Upload,
  Sparkles, Clock, Plus, Calendar,
} from 'lucide-react'
import { getSupabase } from '@/lib/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────

interface AIPlatformSummary {
  ai_platform: string
  sessions: number
  users: number
  conversions: number
  revenue: number
  conversion_rate_pct: number
  avg_order_value: number
}

interface DailyTrend {
  date: string
  sessions: number
  conversions: number
  revenue: number
}

interface GA4Connection {
  id: string
  brand_id: string
  ga4_property_id: string
  status: string
  last_synced_at: string | null
  error_message: string | null
}

interface RealROI {
  ai_revenue: number
  geo_cost: number
  roi_pct: number
  roi_label: string
  total_sessions: number
  total_conversions: number
  days: number
}

interface PromptROIRow {
  id: string
  brand_id: string
  prompt_id: string
  ai_platform: string
  date_range_start: string
  date_range_end: string
  visibility_score: number | null
  attributed_sessions: number
  attributed_conversions: number
  attributed_revenue: number
  roi_value: number | null
}

interface OptEvent {
  id: string
  brand_id: string
  event_type: string
  event_date: string
  description: string | null
  created_at: string
}

const EVENT_TYPE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  'GEO Audit':        { bg: 'bg-surface-warm', text: 'text-ink-2',       dot: 'bg-surface-muted' },
  'GEO Content':      { bg: 'bg-sage-bg', text: 'text-sage', dot: 'bg-sage' },
  'GEO Optimization': { bg: 'bg-caution-bg', text: 'text-caution',     dot: 'bg-caution'   },
  'GEO Distribution': { bg: 'bg-red-soft-bg', text: 'text-red-soft',    dot: 'bg-red-soft'  },
}

// ── Platform Color Map ────────────────────────────────────────────────────────

const PLATFORM_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  ChatGPT:    { bg: 'bg-sage-bg',      text: 'text-sage',        dot: 'bg-sage' },
  Perplexity: { bg: 'bg-violet-50',   text: 'text-violet-700',  dot: 'bg-violet-500' },
  Gemini:     { bg: 'bg-surface-warm', text: 'text-ink-2',       dot: 'bg-surface-muted' },
  Copilot:    { bg: 'bg-sky-50',      text: 'text-sky-700',     dot: 'bg-sky-500' },
  Grok:       { bg: 'bg-caution-bg',  text: 'text-caution',     dot: 'bg-caution'   },
  Claude:     { bg: 'bg-surface-warm', text: 'text-ink-2',      dot: 'bg-ink-2'     },
}
const platformColor = (p: string) =>
  PLATFORM_COLORS[p] ?? { bg: 'bg-canvas', text: 'text-ink-2', dot: 'bg-ink-3' }

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, iconBg, iconColor }: {
  label: string; value: string; sub?: string
  icon: React.ElementType; iconBg: string; iconColor: string
}) {
  return (
    <div className="bg-surface rounded-2xl border border-divider-light shadow-sm p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-ink-3 font-medium uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-ink mt-1.5">{value}</p>
          {sub && <p className="text-xs text-ink-3 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>
    </div>
  )
}

// ── Connect Modal ─────────────────────────────────────────────────────────────

const PROPERTY_ID_DRAFT_KEY = 'ga4_property_id_draft'

function ConnectModal({
  brands,
  initialBrandId,
  existingPropertyId,
  userId,
  onClose,
  onConnected,
}: {
  brands: Array<{ id: string; name: string; domain?: string }>
  initialBrandId: string
  existingPropertyId?: string
  userId: string
  onClose: () => void
  onConnected: (newBrand?: { id: string; name: string; domain?: string }) => void
}) {
  const [selectedBrandId, setSelectedBrandId] = useState(initialBrandId || (brands[0]?.id ?? ''))
  const [propertyId, setPropertyId] = useState(() => {
    if (existingPropertyId) return existingPropertyId
    if (typeof window !== 'undefined') return localStorage.getItem(PROPERTY_ID_DRAFT_KEY) ?? ''
    return ''
  })
  const [jsonContent, setJsonContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Inline brand creation (shown when no brands exist)
  const [newBrandName, setNewBrandName] = useState('')
  const [newBrandDomain, setNewBrandDomain] = useState('')

  const isEditing = !!existingPropertyId

  // Persist Property ID draft to localStorage as user types
  useEffect(() => {
    if (propertyId && typeof window !== 'undefined') {
      localStorage.setItem(PROPERTY_ID_DRAFT_KEY, propertyId)
    }
  }, [propertyId])

  // Handle JSON file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      try {
        JSON.parse(text) // validate JSON
        setJsonContent(text)
        setError(null)
      } catch {
        setError('Invalid JSON file. Please upload the Service Account key file from Google Cloud.')
      }
    }
    reader.readAsText(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!propertyId.trim()) { setError('GA4 Property ID is required'); return }
    if (!isEditing && !jsonContent.trim()) { setError('Service Account JSON is required'); return }
    setLoading(true); setError(null)
    try {
      let brandId = selectedBrandId
      let createdBrand: { id: string; name: string; domain?: string } | undefined

      // If no brand exists, create one on-the-fly from the inline form
      if (brands.length === 0) {
        if (!newBrandName.trim()) { setError('Please enter your brand / company name'); setLoading(false); return }
        const createRes = await api.createBrand(
          { name: newBrandName.trim(), domain: newBrandDomain.trim() || undefined },
          userId,
        )
        if (createRes.error === 'Failed to fetch') {
          setError('Network error: Cannot reach the server. Please check your connection and try again.')
          setLoading(false); return
        }
        if (createRes.error || !createRes.data) {
          setError(`Brand creation failed: ${createRes.error ?? 'unknown error'}`)
          setLoading(false); return
        }
        brandId = createRes.data.id
        createdBrand = { id: createRes.data.id, name: createRes.data.name, domain: createRes.data.domain }
      }

      if (!brandId) { setError('Please select a brand'); setLoading(false); return }

      // Validate JSON before sending
      try { JSON.parse(jsonContent.trim() || '{}') } catch {
        setError('Configuration error: Service Account JSON is not valid JSON. Please re-upload the file from Google Cloud.')
        setLoading(false); return
      }

      const res = await api.ga4Connect({
        brand_id: brandId,
        ga4_property_id: propertyId.trim(),
        service_account_json: jsonContent.trim() || '{}',
      })

      if (res.error === 'Failed to fetch') {
        setError('Network error: Cannot reach the server. Please check your connection and try again.')
        setLoading(false); return
      }
      if (res.error?.includes('403') || res.error?.includes('permission') || res.error?.includes('access')) {
        setError('Configuration error: The Service Account does not have Viewer access to this GA4 property. Please re-check your GA4 property access settings.')
        setLoading(false); return
      }
      if (res.error?.includes('property') || res.error?.includes('not found')) {
        setError(`Configuration error: GA4 Property ID "${propertyId.trim()}" not found. Please verify the ID in GA4 Admin → Property Settings.`)
        setLoading(false); return
      }
      if (res.error) {
        setError(`Connection failed: ${res.error}`)
        setLoading(false); return
      }

      if (typeof window !== 'undefined') localStorage.removeItem(PROPERTY_ID_DRAFT_KEY)
      onConnected(createdBrand); onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      if (msg === 'Failed to fetch') {
        setError('Network error: Cannot reach the server. Please check your connection and try again.')
      } else {
        setError(`Connection failed: ${msg}`)
      }
    } finally { setLoading(false) }
  }

  const selectedBrand = brands.find(b => b.id === selectedBrandId)

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-surface border border-divider-light rounded-2xl w-full max-w-lg shadow-xl">
        <div className="p-6 border-b border-divider-light">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-surface-warm rounded-xl flex items-center justify-center">
              <Link2 className="w-5 h-5 text-ink-2" />
            </div>
            <div>
              <h3 className="text-ink font-semibold text-lg">
                {isEditing ? 'Update GA4 Connection' : 'Connect GA4 Property'}
              </h3>
              <p className="text-ink-3 text-sm">Link your website's GA4 to see AI traffic attribution</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Brand / Website selector */}
          <div>
            <label className="text-xs text-ink-3 font-medium uppercase tracking-wider block mb-1.5">
              Website / Brand
            </label>
            {brands.length === 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-ink-3 mb-2">Enter your brand details to get started:</p>
                <input
                  type="text"
                  placeholder="Company / Brand name (e.g. Alignment AI)"
                  value={newBrandName}
                  onChange={e => setNewBrandName(e.target.value)}
                  className="w-full bg-canvas border border-divider rounded-xl px-3 py-2.5 text-ink text-sm focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink"
                />
                <input
                  type="text"
                  placeholder="Website domain (e.g. alignmenttech.ai)"
                  value={newBrandDomain}
                  onChange={e => setNewBrandDomain(e.target.value)}
                  className="w-full bg-canvas border border-divider rounded-xl px-3 py-2.5 text-ink text-sm focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink"
                />
              </div>
            ) : brands.length === 1 ? (
              <div className="bg-canvas border border-divider rounded-xl px-4 py-2.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-ink">{brands[0].name}</p>
                  {brands[0].domain && <p className="text-xs text-ink-3">{brands[0].domain}</p>}
                </div>
                <CheckCircle2 className="w-4 h-4 text-sage flex-shrink-0" />
              </div>
            ) : (
              <select
                value={selectedBrandId}
                onChange={e => setSelectedBrandId(e.target.value)}
                className="w-full bg-canvas border border-divider rounded-xl px-3 py-2.5 text-ink text-sm focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink"
              >
                {brands.map(b => (
                  <option key={b.id} value={b.id}>{b.name}{b.domain ? ` (${b.domain})` : ''}</option>
                ))}
              </select>
            )}
            {selectedBrand?.domain && brands.length > 1 && (
              <p className="text-xs text-ink-3 mt-1">GA4 data will be attributed to: {selectedBrand.domain}</p>
            )}
          </div>

          {/* GA4 Property ID */}
          <div>
            <label className="text-xs text-ink-3 font-medium uppercase tracking-wider block mb-1.5">GA4 Property ID</label>
            <input
              type="text" placeholder="e.g. 123456789"
              value={propertyId} onChange={e => setPropertyId(e.target.value)}
              className="w-full bg-canvas border border-divider rounded-xl px-3 py-2.5 text-ink text-sm focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink"
            />
            <p className="text-xs text-ink-3 mt-1">GA4 Admin → Property Settings → Property ID</p>
          </div>

          {/* Service Account JSON */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-ink-3 font-medium uppercase tracking-wider">
                Service Account JSON {isEditing && <span className="text-ink-3 normal-case font-normal">(leave blank to keep existing)</span>}
              </label>
              <label
                htmlFor="ga4-json-upload"
                className="cursor-pointer flex items-center gap-1.5 px-2.5 py-1 bg-canvas border border-divider rounded-lg text-xs text-ink-2 hover:bg-surface-muted transition-colors"
              >
                <Upload className="w-3 h-3" /> Upload .json
              </label>
              <input
                id="ga4-json-upload"
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
            <textarea
              placeholder='{"type": "service_account", "project_id": "...", ...}'
              value={jsonContent} onChange={e => setJsonContent(e.target.value)}
              rows={5}
              className="w-full bg-canvas border border-divider rounded-xl px-3 py-2.5 text-ink text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink resize-none"
            />
            <p className="text-xs text-ink-3 mt-1">
              Google Cloud Console → Service Accounts → Keys → Add Key (JSON). GA4 role: <strong>Viewer</strong>.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-red-soft text-sm bg-red-soft-bg border border-red-soft/30 rounded-xl px-3 py-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-divider text-ink-2 text-sm hover:bg-surface-warm transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !propertyId.trim()}
              className="flex-1 py-2.5 rounded-xl bg-ink hover:bg-[#2d2d2c] text-ink-inv text-sm font-medium transition-colors disabled:opacity-50"
            >
              {loading ? 'Connecting…' : isEditing ? 'Update Connection' : 'Connect GA4'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function GA4AttributionPage() {
  const { t } = useLanguage()
  const { user } = useAuth()

  const [brands, setBrands] = useState<Array<{ id: string; name: string; domain?: string }>>([])
  const [selectedBrandId, setSelectedBrandId] = useState('')
  const [editingConnection, setEditingConnection] = useState(false)
  const [connections, setConnections] = useState<GA4Connection[]>([])
  const [summary, setSummary] = useState<AIPlatformSummary[]>([])
  const [trend, setTrend] = useState<DailyTrend[]>([])
  const [days, setDays] = useState(30)
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [realROI, setRealROI] = useState<RealROI | null>(null)
  const [roiVsEstimate, setRoiVsEstimate] = useState<{
    estimate: ROIEstimate | null
    real_revenue: number
    real_roi_pct: number | null
    realization_pct: number | null
    has_ga4_data: boolean
    days: number
  } | null>(null)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Prompt ROI state
  const [promptROI, setPromptROI] = useState<PromptROIRow[]>([])
  const [promptPlatform, setPromptPlatform] = useState('ChatGPT')
  const [computingAttribution, setComputingAttribution] = useState(false)

  // Optimization Timeline state
  const [optimizationEvents, setOptimizationEvents] = useState<OptEvent[]>([])
  const [showAddEventForm, setShowAddEventForm] = useState(false)
  const [newEventType, setNewEventType] = useState('GEO Audit')
  const [newEventDate, setNewEventDate] = useState(() => new Date().toISOString().split('T')[0])
  const [newEventDescription, setNewEventDescription] = useState('')
  const [savingEvent, setSavingEvent] = useState(false)

  // Load brands — filter by current user, auto-create from profile if missing
  useEffect(() => {
    if (!user?.id) return
    const userId = user.id
    api.getBrands(userId).then(async res => {
      const list = (res.data ?? []).map((b: { id: string; name: string; domain?: string }) => ({
        id: b.id, name: b.name, domain: b.domain,
      }))
      if (list.length > 0) {
        setBrands(list)
        setSelectedBrandId(list[0].id)
        return
      }
      // No brand found → try to auto-create from the user's onboarding profile
      try {
        const supabase = getSupabase()
        if (!supabase) return
        const { data: profile } = await supabase
          .from('profiles')
          .select('company, company_website')
          .eq('id', userId)
          .single()
        if (profile?.company) {
          const createRes = await api.createBrand(
            { name: profile.company, domain: profile.company_website ?? undefined },
            userId,
          )
          if (createRes.data) {
            const nb = { id: createRes.data.id, name: createRes.data.name, domain: createRes.data.domain }
            setBrands([nb])
            setSelectedBrandId(nb.id)
          }
        }
      } catch { /* stay empty — user sees "No brand" in modal */ }
    })
  }, [user?.id])

  const loadData = useCallback(async () => {
    if (!selectedBrandId) return
    setLoading(true); setError(null)
    try {
      const [connRes, summaryRes, trendRes, roiRes, vsRes, promptRes, eventsRes] = await Promise.all([
        api.ga4ListConnections(selectedBrandId),
        api.ga4GetSummary(selectedBrandId, days),
        api.ga4GetTrend(selectedBrandId, undefined, days),
        api.ga4GetRealROI(selectedBrandId, 3999, days),
        api.ga4GetROIVsEstimate(selectedBrandId, 90),
        api.ga4GetPromptROI(selectedBrandId, promptPlatform, days),
        api.ga4GetOptimizationEvents(selectedBrandId),
      ])
      if (connRes.data)    setConnections(connRes.data.connections)
      if (summaryRes.data) setSummary(summaryRes.data.summary)
      if (trendRes.data)   setTrend(trendRes.data.trend)
      if (roiRes.data?.has_data) setRealROI(roiRes.data.real_roi)
      if (vsRes.data)      setRoiVsEstimate(vsRes.data)
      if (promptRes.data)  setPromptROI(promptRes.data.prompt_roi as PromptROIRow[])
      if (eventsRes.data)  setOptimizationEvents(eventsRes.data.events)
    } catch {
      setError('Failed to load GA4 data')
    } finally { setLoading(false) }
  }, [selectedBrandId, days, promptPlatform])

  useEffect(() => { loadData() }, [loadData])

  const handleSync = async (connectionId: string) => {
    setSyncing(connectionId)
    const res = await api.ga4Sync(connectionId)
    if (res.error) setError(res.error)
    else { await loadData() }
    setSyncing(null)
  }

  const handleComputeAttribution = async () => {
    if (!selectedBrandId) return
    setComputingAttribution(true)
    await api.ga4ComputeAttribution(selectedBrandId, promptPlatform, days)
    const res = await api.ga4GetPromptROI(selectedBrandId, promptPlatform, days)
    if (res.data) setPromptROI(res.data.prompt_roi as PromptROIRow[])
    setComputingAttribution(false)
  }

  const handleSaveEvent = async () => {
    if (!selectedBrandId || !newEventDate) return
    setSavingEvent(true)
    const res = await api.ga4LogOptimizationEvent({
      brand_id: selectedBrandId,
      event_type: newEventType,
      event_date: newEventDate,
      description: newEventDescription || undefined,
    })
    if (!res.error) {
      setShowAddEventForm(false)
      setNewEventDescription('')
      const evRes = await api.ga4GetOptimizationEvents(selectedBrandId)
      if (evRes.data) setOptimizationEvents(evRes.data.events)
    }
    setSavingEvent(false)
  }

  const totalSessions    = summary.reduce((s, p) => s + p.sessions, 0)
  const totalConversions = summary.reduce((s, p) => s + p.conversions, 0)
  const totalRevenue     = summary.reduce((s, p) => s + p.revenue, 0)
  const avgConvRate      = totalSessions > 0 ? ((totalConversions / totalSessions) * 100).toFixed(2) : '0.00'
  const activeConnection = connections.find(c => c.status === 'active')

  return (
    <div className="min-h-screen bg-canvas">
      <Header title="GA4 Attribution" subtitle="AI platform traffic · conversions · revenue" />

      <div className="p-6 space-y-6">

        {/* ── Controls Row ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            {/* Brand selector */}
            {brands.length > 1 && (
              <select
                value={selectedBrandId}
                onChange={e => setSelectedBrandId(e.target.value)}
                className="bg-surface border border-divider-light rounded-xl px-3 py-2 text-sm text-ink-2 focus:outline-none focus:ring-2 focus:ring-ink/10"
              >
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            )}
            {/* Days selector */}
            {(['7', '30', '90'] as const).map(d => (
              <button
                key={d}
                onClick={() => setDays(Number(d))}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${days === Number(d) ? 'bg-ink text-ink-inv shadow-sm' : 'bg-surface border border-divider-light text-ink-2 hover:bg-surface-warm'}`}
              >
                {d}d
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowConnectModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-ink hover:bg-[#2d2d2c] text-ink-inv rounded-xl text-sm font-medium transition-colors shadow-sm"
          >
            <Link2 className="w-4 h-4" />
            Connect GA4
          </button>
        </div>

        {/* ── Error ────────────────────────────────────────────────────── */}
        {error && (
          <div className="flex items-center gap-2 text-red-soft text-sm bg-red-soft-bg border border-red-soft/30 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        {/* ── Connection Status ─────────────────────────────────────────── */}
        {connections.length > 0 ? (
          <section className="bg-surface rounded-2xl border border-divider-light shadow-sm px-5 py-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              {activeConnection
                ? <CheckCircle2 className="w-5 h-5 text-sage flex-shrink-0" />
                : <AlertCircle className="w-5 h-5 text-caution flex-shrink-0" />}
              <div>
                <p className="text-sm font-medium text-ink">
                  GA4 Property: <span className="font-mono text-ink-2">{connections[0].ga4_property_id}</span>
                  {brands.find(b => b.id === connections[0].brand_id) && (
                    <span className="ml-2 text-xs text-ink-3 font-sans font-normal">
                      → {brands.find(b => b.id === connections[0].brand_id)?.name}
                    </span>
                  )}
                </p>
                <p className="text-xs text-ink-3 mt-0.5">
                  {activeConnection
                    ? `Last synced: ${activeConnection.last_synced_at ? new Date(activeConnection.last_synced_at).toLocaleString() : 'Never'}`
                    : `Error: ${connections[0].error_message}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setEditingConnection(true); setShowConnectModal(true) }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-canvas hover:bg-surface-muted border border-divider rounded-lg text-xs text-ink-2 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => handleSync(connections[0].id)}
                disabled={syncing === connections[0].id}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-canvas hover:bg-surface-muted border border-divider rounded-lg text-xs text-ink-2 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing === connections[0].id ? 'animate-spin' : ''}`} />
                {syncing === connections[0].id ? 'Syncing…' : 'Sync Now'}
              </button>
            </div>
          </section>
        ) : (
          <section className="bg-surface rounded-2xl border border-dashed border-divider px-8 py-10 text-center shadow-sm">
            <div className="w-14 h-14 bg-surface-warm rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Link2 className="w-7 h-7 text-ink-3" />
            </div>
            <p className="text-ink font-semibold">Connect your GA4 property</p>
            <p className="text-ink-3 text-sm mt-1.5 max-w-sm mx-auto">
              Link GA4 to track which AI platforms — ChatGPT, Perplexity, Gemini — drive real traffic and revenue to your site.
            </p>
            <button
              onClick={() => setShowConnectModal(true)}
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-ink hover:bg-[#2d2d2c] text-ink-inv rounded-xl text-sm font-medium transition-colors shadow-sm"
            >
              <Link2 className="w-4 h-4" />
              Connect GA4
            </button>
          </section>
        )}

        {/* ── Stat Cards ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="AI Sessions"     value={loading ? '—' : totalSessions.toLocaleString()}    icon={Users}             iconBg="bg-surface-warm" iconColor="text-ink-2" />
          <StatCard label="Conversions"     value={loading ? '—' : totalConversions.toLocaleString()} icon={MousePointerClick} iconBg="bg-sage-bg"     iconColor="text-sage" />
          <StatCard label="AI Revenue"      value={loading ? '—' : `$${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} icon={DollarSign} iconBg="bg-caution-bg" iconColor="text-caution" />
          <StatCard label="Conversion Rate" value={loading ? '—' : `${avgConvRate}%`}                 icon={TrendingUp}        iconBg="bg-red-soft-bg" iconColor="text-red-soft" />
        </div>

        {/* ── Real ROI Card ─────────────────────────────────────────────── */}
        {realROI && (
          <section className={`rounded-2xl border shadow-sm px-6 py-5 ${realROI.roi_pct >= 0 ? 'bg-sage-bg border-sage/30' : 'bg-red-soft-bg border-red-soft/30'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-ink-3 font-medium uppercase tracking-wider">Real ROI (GA4 Data)</p>
                <p className={`text-4xl font-bold mt-1.5 ${realROI.roi_pct >= 0 ? 'text-sage' : 'text-red-soft'}`}>{realROI.roi_label}</p>
                <p className="text-xs text-ink-3 mt-1.5">
                  AI Revenue <span className="font-semibold text-ink-2">${realROI.ai_revenue.toLocaleString()}</span>
                  &nbsp;·&nbsp;
                  GEO Cost <span className="font-semibold text-ink-2">${realROI.geo_cost.toLocaleString()}</span>
                  &nbsp;·&nbsp; Last {realROI.days} days
                </p>
              </div>
              {realROI.roi_pct >= 0
                ? <ArrowUpRight className="w-10 h-10 text-sage" />
                : <ArrowDownRight className="w-10 h-10 text-red-soft" />}
            </div>
          </section>
        )}

        {/* ── ROI Realization ───────────────────────────────────────────── */}
        {roiVsEstimate?.estimate ? (
          <section className="bg-surface rounded-2xl border border-divider-light shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-divider-light flex items-center gap-2">
              <div className="w-8 h-8 bg-surface-warm rounded-lg flex items-center justify-center">
                <Target className="w-4 h-4 text-ink-2" />
              </div>
              <div>
                <h2 className="font-semibold text-ink">ROI Realization</h2>
                <p className="text-xs text-ink-3">Expected vs. Actual — last 90 days</p>
              </div>
            </div>
            <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Expected */}
              <div className="space-y-1.5">
                <p className="text-xs text-ink-3 font-medium uppercase tracking-wider">Expected Revenue</p>
                <p className="text-2xl font-bold text-ink">
                  ${roiVsEstimate.estimate.revenue_low.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  <span className="text-ink-3 text-lg"> – ${roiVsEstimate.estimate.revenue_high.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                </p>
                <p className="text-xs text-ink-3">
                  {roiVsEstimate.estimate.roi_low}x – {roiVsEstimate.estimate.roi_high}x ROI &nbsp;·&nbsp; {roiVsEstimate.estimate.industry_name}
                </p>
                <p className="text-xs text-ink-3">Estimated on {new Date(roiVsEstimate.estimate.saved_at).toLocaleDateString()}</p>
              </div>

              {/* Actual */}
              <div className="space-y-1.5">
                <p className="text-xs text-ink-3 font-medium uppercase tracking-wider">Actual AI Revenue</p>
                {roiVsEstimate.has_ga4_data ? (
                  <>
                    <p className="text-2xl font-bold text-sage">
                      ${roiVsEstimate.real_revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-ink-3">
                      {roiVsEstimate.real_roi_pct !== null
                        ? `${roiVsEstimate.real_roi_pct >= 0 ? '+' : ''}${roiVsEstimate.real_roi_pct}% ROI`
                        : 'Calculating…'}
                    </p>
                  </>
                ) : (
                  <div className="pt-2">
                    <p className="text-sm text-ink-3">No GA4 data yet.</p>
                    <p className="text-xs text-ink-3 mt-0.5">Click <strong>Sync Now</strong> to pull data.</p>
                  </div>
                )}
              </div>

              {/* Progress */}
              <div className="space-y-2">
                <p className="text-xs text-ink-3 font-medium uppercase tracking-wider">Realization Progress</p>
                {roiVsEstimate.has_ga4_data && roiVsEstimate.realization_pct !== null ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-ink">{Math.min(roiVsEstimate.realization_pct, 999)}%</span>
                      {roiVsEstimate.realization_pct >= 100
                        ? <ArrowUpRight className="w-5 h-5 text-sage" />
                        : <ArrowDownRight className="w-5 h-5 text-ink-3" />}
                    </div>
                    <div className="w-full bg-surface-warm rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${roiVsEstimate.realization_pct >= 100 ? 'bg-sage' : 'bg-ink'}`}
                        style={{ width: `${Math.min(roiVsEstimate.realization_pct, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-ink-3">of expected low-end revenue achieved</p>
                  </>
                ) : (
                  <div className="pt-2">
                    <div className="w-full bg-surface-warm rounded-full h-2 mb-1">
                      <div className="h-2 w-0 rounded-full" />
                    </div>
                    <p className="text-xs text-ink-3">Connect GA4 to start measuring</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        ) : (
          /* No estimate yet → prompt to set ROI target */
          <section className="bg-surface-warm border border-divider-light rounded-2xl shadow-sm px-6 py-8 text-center">
            <div className="w-12 h-12 bg-surface border border-divider-light shadow-sm rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Target className="w-6 h-6 text-ink-2" />
            </div>
            <h3 className="font-semibold text-ink">Set your ROI target</h3>
            <p className="text-sm text-ink-3 mt-1.5 max-w-sm mx-auto">
              Run the ROI Simulator to estimate your 6-month revenue potential, then track actual vs. expected performance here.
            </p>
            <a
              href="/roi-simulator"
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-ink hover:bg-[#2d2d2c] text-ink-inv rounded-xl text-sm font-medium transition-colors shadow-sm"
            >
              Calculate ROI Estimate <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </section>
        )}

        {/* ── Platform Breakdown ────────────────────────────────────────── */}
        {loading && summary.length === 0 ? (
          <section className="bg-surface rounded-2xl border border-divider-light shadow-sm px-6 py-12 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-ink-3 animate-spin" />
          </section>
        ) : summary.length > 0 ? (
          <section className="bg-surface rounded-2xl border border-divider-light shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-divider-light flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-ink-3" />
                <h2 className="font-semibold text-ink">AI Platform Breakdown</h2>
              </div>
              <span className="text-xs text-ink-3">Last {days} days</span>
            </div>
            {/* Table header */}
            <div className="px-6 py-2.5 bg-canvas border-b border-divider-light grid grid-cols-6 gap-4 text-xs text-ink-3 font-medium uppercase tracking-wider">
              <div>Platform</div>
              <div className="text-right">Sessions</div>
              <div className="text-right">Users</div>
              <div className="text-right">Conversions</div>
              <div className="text-right">Revenue</div>
              <div className="text-right">Conv. Rate</div>
            </div>
            <div className="divide-y divide-divider-light">
              {summary.map(p => {
                const pc = platformColor(p.ai_platform)
                return (
                  <div key={p.ai_platform} className="px-6 py-3.5 grid grid-cols-6 gap-4 items-center hover:bg-surface-warm transition-colors">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${pc.dot}`} />
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${pc.bg} ${pc.text}`}>
                        {p.ai_platform}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-ink">{p.sessions.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-ink-2">{p.users.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-ink-2">{p.conversions.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-sage">${p.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div className="text-right flex items-center justify-end gap-1">
                      <p className="text-sm text-ink-2">{p.conversion_rate_pct}%</p>
                      <ChevronRight className="w-3.5 h-3.5 text-ink-3" />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ) : null}

        {/* ── Daily Trend ───────────────────────────────────────────────── */}
        {trend.length > 0 && (
          <section className="bg-surface rounded-2xl border border-divider-light shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-divider-light flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-ink-3" />
              <h2 className="font-semibold text-ink">Daily AI Traffic Trend</h2>
              <span className="ml-auto text-xs text-ink-3">Last {days} days</span>
            </div>
            <div className="px-6 py-5">
              <div className="flex items-end gap-1 h-24">
                {trend.map(d => {
                  const maxSessions = Math.max(...trend.map(t => t.sessions), 1)
                  const pct = Math.max(4, (d.sessions / maxSessions) * 100)
                  return (
                    <div key={d.date} className="flex-1 group relative">
                      <div
                        className="bg-ink/20 hover:bg-ink/40 rounded-t transition-colors cursor-pointer"
                        style={{ height: `${pct}%` }}
                        title={`${d.date}: ${d.sessions} sessions · ${d.conversions} conversions · $${d.revenue.toFixed(2)}`}
                      />
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-between text-xs text-ink-3 mt-2">
                <span>{trend[0]?.date}</span>
                <span>{trend[trend.length - 1]?.date}</span>
              </div>
            </div>
          </section>
        )}

        {/* ── Prompt ROI Analysis ───────────────────────────────────────── */}
        {selectedBrandId && (
          <section className="bg-surface rounded-2xl border border-divider-light shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-divider-light flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-ink-3" />
                <h2 className="font-semibold text-ink">Prompt ROI Analysis</h2>
                <span className="text-xs text-ink-3">Which AI prompts drive the most revenue</span>
              </div>
              <div className="flex items-center gap-2">
                {(['ChatGPT', 'Perplexity', 'Gemini'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setPromptPlatform(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${promptPlatform === p ? 'bg-ink text-ink-inv shadow-sm' : 'bg-canvas border border-divider text-ink-2 hover:bg-surface-muted'}`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={handleComputeAttribution}
                  disabled={computingAttribution || !selectedBrandId}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-ink hover:bg-[#2d2d2c] text-ink-inv rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ml-1"
                >
                  {computingAttribution
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <RefreshCw className="w-3.5 h-3.5" />}
                  Compute Attribution
                </button>
              </div>
            </div>
            {promptROI.length > 0 ? (
              <>
                <div className="px-6 py-2.5 bg-canvas border-b border-divider-light grid grid-cols-6 gap-4 text-xs text-ink-3 font-medium uppercase tracking-wider">
                  <div className="col-span-2">Prompt / Query ID</div>
                  <div className="text-right">Sessions</div>
                  <div className="text-right">Conversions</div>
                  <div className="text-right">Revenue</div>
                  <div className="text-right">ROI Value</div>
                </div>
                <div className="divide-y divide-divider-light">
                  {promptROI.map(row => (
                    <div key={row.id} className="px-6 py-3.5 grid grid-cols-6 gap-4 items-center hover:bg-surface-warm transition-colors">
                      <div className="col-span-2 min-w-0">
                        <p className="text-sm font-mono text-ink-2 truncate">{row.prompt_id}</p>
                        <p className="text-xs text-ink-3 mt-0.5">{row.date_range_start} – {row.date_range_end}</p>
                      </div>
                      <div className="text-right text-sm text-ink-2">{row.attributed_sessions.toLocaleString()}</div>
                      <div className="text-right text-sm text-ink-2">{row.attributed_conversions.toLocaleString()}</div>
                      <div className="text-right text-sm font-semibold text-sage">
                        ${row.attributed_revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-right text-sm text-ink-2">
                        {row.roi_value !== null ? `${row.roi_value.toFixed(1)}x` : '—'}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="px-8 py-10 text-center">
                <Sparkles className="w-8 h-8 text-ink-3 mx-auto mb-3" />
                <p className="text-ink-2 font-medium">No prompt attribution data yet</p>
                <p className="text-ink-3 text-sm mt-1.5">
                  Click <strong>Compute Attribution</strong> to calculate which {promptPlatform} prompts drive the most revenue.
                </p>
              </div>
            )}
          </section>
        )}

        {/* ── GEO Optimization Timeline ─────────────────────────────────── */}
        {selectedBrandId && (
          <section className="bg-surface rounded-2xl border border-divider-light shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-divider-light flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-ink-3" />
                <h2 className="font-semibold text-ink">GEO Optimization Timeline</h2>
                <span className="text-xs text-ink-3">Log actions and track impact</span>
              </div>
              <button
                onClick={() => setShowAddEventForm(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-ink hover:bg-[#2d2d2c] text-ink-inv rounded-lg text-xs font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Log Event
              </button>
            </div>

            {/* Inline add-event form */}
            {showAddEventForm && (
              <div className="px-6 py-4 border-b border-divider-light bg-canvas">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                  <div>
                    <label className="text-xs text-ink-3 font-medium block mb-1">Event Type</label>
                    <select
                      value={newEventType}
                      onChange={e => setNewEventType(e.target.value)}
                      className="w-full bg-surface border border-divider-light rounded-xl px-3 py-2 text-sm text-ink-2 focus:outline-none focus:ring-2 focus:ring-ink/10"
                    >
                      {['GEO Audit', 'GEO Content', 'GEO Optimization', 'GEO Distribution'].map(t => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-ink-3 font-medium block mb-1">Date</label>
                    <input
                      type="date"
                      value={newEventDate}
                      onChange={e => setNewEventDate(e.target.value)}
                      className="w-full bg-surface border border-divider-light rounded-xl px-3 py-2 text-sm text-ink-2 focus:outline-none focus:ring-2 focus:ring-ink/10"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-ink-3 font-medium block mb-1">Description (optional)</label>
                    <input
                      type="text"
                      value={newEventDescription}
                      onChange={e => setNewEventDescription(e.target.value)}
                      placeholder="What did you do?"
                      className="w-full bg-surface border border-divider-light rounded-xl px-3 py-2 text-sm text-ink-2 focus:outline-none focus:ring-2 focus:ring-ink/10"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowAddEventForm(false)}
                      className="flex-1 py-2 rounded-xl border border-divider text-ink-2 text-sm hover:bg-surface-muted transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEvent}
                      disabled={savingEvent}
                      className="flex-1 py-2 rounded-xl bg-ink hover:bg-[#2d2d2c] text-ink-inv text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {savingEvent ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Event list */}
            {optimizationEvents.length > 0 ? (
              <div className="divide-y divide-divider-light">
                {optimizationEvents.map((ev, idx) => {
                  const colors = EVENT_TYPE_COLORS[ev.event_type] ?? { bg: 'bg-canvas', text: 'text-ink-2', dot: 'bg-ink/20' }
                  return (
                    <div key={ev.id} className="px-6 py-4 flex items-start gap-4 hover:bg-surface-warm transition-colors">
                      <div className="flex flex-col items-center gap-1 pt-1 flex-shrink-0">
                        <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                        {idx < optimizationEvents.length - 1 && (
                          <div className="w-px flex-1 bg-divider-light min-h-[24px]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold ${colors.bg} ${colors.text}`}>
                            {ev.event_type}
                          </span>
                          <span className="text-xs text-ink-3 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(ev.event_date + 'T00:00:00').toLocaleDateString()}
                          </span>
                        </div>
                        {ev.description && (
                          <p className="text-sm text-ink-2 mt-1.5">{ev.description}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="px-8 py-10 text-center">
                <Clock className="w-8 h-8 text-ink-3 mx-auto mb-3" />
                <p className="text-ink-2 font-medium">No optimization events logged yet</p>
                <p className="text-ink-3 text-sm mt-1.5">
                  Track your GEO actions over time — audits, content updates, and optimizations — to correlate with traffic changes.
                </p>
              </div>
            )}
          </section>
        )}

        {/* ── Empty state when connected but no data ────────────────────── */}
        {activeConnection && summary.length === 0 && !loading && (
          <section className="bg-surface rounded-2xl border border-divider-light shadow-sm px-8 py-10 text-center">
            <RefreshCw className="w-8 h-8 text-ink-3 mx-auto mb-3" />
            <p className="text-ink font-medium">No AI traffic data yet</p>
            <p className="text-ink-3 text-sm mt-1.5">
              Click <strong>Sync Now</strong> to pull the latest data. AI platform traffic will appear once users visit from ChatGPT, Perplexity, or other AI tools.
            </p>
          </section>
        )}

        {/* ── Setup Guide ───────────────────────────────────────────────── */}
        <section className="bg-surface-warm border border-divider rounded-2xl shadow-sm px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-ink">Need help setting up?</p>
            <p className="text-xs text-ink-3 mt-0.5">Configure Service Account and custom dimensions to enable full attribution.</p>
          </div>
          <a
            href="/ga4-setup-guide.md"
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-ink-2 hover:text-ink text-sm font-medium transition-colors whitespace-nowrap"
          >
            View Guide <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </section>
      </div>

      {showConnectModal && (
        <ConnectModal
          brands={brands}
          initialBrandId={selectedBrandId}
          existingPropertyId={editingConnection && connections.length > 0 ? connections[0].ga4_property_id : undefined}
          userId={user?.id ?? ''}
          onClose={() => { setShowConnectModal(false); setEditingConnection(false) }}
          onConnected={(newBrand) => {
            setEditingConnection(false)
            if (newBrand) {
              setBrands(prev => [...prev, newBrand])
              setSelectedBrandId(newBrand.id)
            }
            loadData()
          }}
        />
      )}
    </div>
  )
}
