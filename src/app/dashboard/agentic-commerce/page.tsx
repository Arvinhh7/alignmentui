'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Network, Search, ShieldCheck, BarChart3,
  Zap, CheckCircle2, XCircle, Clock, AlertTriangle,
  Copy, RefreshCw, Wifi, WifiOff, Globe,
  Package, TrendingUp, Activity, ChevronRight,
  ShoppingCart, Bot, Plus, X,
} from 'lucide-react'
import { getSupabase } from '@/lib/supabase'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const INFRA = `${API}/api/v1/infra`
const DEMO_BRAND_ID = 'shopify-client-02'

async function getSessionToken(): Promise<string | null> {
  try {
    const sb = getSupabase()
    if (!sb) return null
    const { data: { session } } = await sb.auth.getSession()
    return session?.access_token ?? null
  } catch {
    return null
  }
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface BrandRecord {
  brand_id:          string
  domain:            string
  name:              string
  agent_endpoints:   Record<string, string>
  capabilities:      string[]
  categories:        string[]
  trust_attestation: { verified: boolean; level: string; issued_by?: string }
  created_at:        string
}

interface DiscoveryEvent {
  id:              string
  brand_id:        string
  brand_name:      string
  caller_agent_id: string
  intent:          string
  product_hint:    string
  matched_rank:    number
  trust_score:     number
  outcome:         'discovered' | 'selected' | 'rejected' | 'abandoned'
  session_id:      string
  created_at:      string
  _type?:          'catchup' | 'live' | 'heartbeat'
}

interface VerifyResult {
  brand_id:     string
  jwt:          string
  expires_at:   string
  trust_level:  string
  capabilities: string[]
}

interface TelemetryData {
  brand_id:        string
  window_days:     number
  discovery_calls: number
  selected_count:  number
  conversion_rate: number
  verify_calls:    number
  avg_trust_score: number
  agent_breakdown: { agent: string; calls: number }[]
  daily_series:    { date: string; calls: number }[]
  recent_events:   DiscoveryEvent[]
}

// ── Constants ──────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'registry',  icon: Network,     label: 'Registry',   sublabel: 'Brand manifest & endpoints' },
  { id: 'discovery', icon: Search,      label: 'Discovery',  sublabel: 'Live agent discovery feed' },
  { id: 'verify',    icon: ShieldCheck, label: 'Verify',     sublabel: 'Trust attestation & JWT' },
  { id: 'telemetry', icon: BarChart3,   label: 'Telemetry',  sublabel: 'Agent call analytics' },
] as const
type TabId = (typeof TABS)[number]['id']

const AGENT_CHIP: Record<string, string> = {
  claude:         'bg-[rgba(199,125,255,0.12)] text-[#C77DFF] border-[rgba(199,125,255,0.25)]',
  chatgpt:        'bg-[rgba(16,163,127,0.12)] text-[#10a37f] border-[rgba(16,163,127,0.25)]',
  perplexity:     'bg-[rgba(32,190,248,0.12)] text-[#20bef8] border-[rgba(32,190,248,0.25)]',
  gemini:         'bg-[rgba(66,133,244,0.12)] text-[#4285f4] border-[rgba(66,133,244,0.25)]',
  'custom-agent': 'bg-[rgba(250,245,236,0.06)] text-[rgba(250,245,236,0.45)] border-[rgba(250,245,236,0.12)]',
}

const OUTCOME_STYLE: Record<string, string> = {
  selected:   'text-sage border-[rgba(135,185,110,0.3)] bg-[rgba(135,185,110,0.08)]',
  discovered: 'text-[#4285f4] border-[rgba(66,133,244,0.3)] bg-[rgba(66,133,244,0.08)]',
  rejected:   'text-red-soft border-[rgba(201,86,75,0.3)] bg-[rgba(201,86,75,0.08)]',
  abandoned:  'text-ink-3 border-divider bg-surface-warm',
}

const OUTCOME_ICON: Record<string, React.ReactNode> = {
  selected:   <CheckCircle2 className="w-3 h-3" />,
  discovered: <Search className="w-3 h-3" />,
  rejected:   <XCircle className="w-3 h-3" />,
  abandoned:  <Clock className="w-3 h-3" />,
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60)  return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function trustColor(score: number): string {
  if (score >= 0.9) return 'text-sage'
  if (score >= 0.75) return 'text-caution'
  return 'text-red-soft'
}

// ── Main Page ──────────────────────────────────────────────────────────────────

interface BrandOption { brand_id: string; name: string; domain: string }

const DEMO_BRAND: BrandOption = {
  brand_id: DEMO_BRAND_ID,
  name:     'Eco Essentials Store',
  domain:   'demo-shopify.myshopify.com',
}

export default function AgenticCommercePage() {
  const [activeTab, setActiveTab]         = useState<TabId>('registry')
  const [activeBrandId, setActiveBrandId] = useState(DEMO_BRAND_ID)
  const [myBrands, setMyBrands]           = useState<BrandOption[]>([])

  // Fetch brands registered by the current user
  useEffect(() => {
    ;(async () => {
      const token = await getSessionToken()
      if (!token) return
      try {
        const r = await fetch(`${INFRA}/my-brands`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!r.ok) return
        const { brands } = await r.json()
        if (Array.isArray(brands) && brands.length > 0) {
          setMyBrands(brands)
          // Auto-select the first non-demo brand
          const own = brands.find((b: BrandOption) => b.brand_id !== DEMO_BRAND_ID)
          if (own) setActiveBrandId(own.brand_id)
        }
      } catch { /* no-op */ }
    })()
  }, [])

  // Always show user brands first, then demo brand as fallback
  const allOptions: BrandOption[] = [
    ...myBrands.filter(b => b.brand_id !== DEMO_BRAND_ID),
    DEMO_BRAND,
  ]
  const activeBrand = allOptions.find(b => b.brand_id === activeBrandId) ?? DEMO_BRAND

  return (
    <div className="min-h-screen bg-canvas">
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* ── Header ────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-8 h-8 rounded-lg bg-[rgba(250,245,236,0.06)] border border-[rgba(250,245,236,0.10)] flex items-center justify-center">
                <Network className="w-4 h-4 text-[rgba(250,245,236,0.7)]" strokeWidth={1.8} />
              </div>
              <h1 className="text-2xl font-bold text-ink">Agentic Commerce</h1>
              <span className="text-[9px] font-bold px-2 py-0.5 bg-caution-bg text-caution border border-[rgba(184,134,11,0.2)] rounded-full tracking-wide">BETA</span>
            </div>
            <p className="text-sm text-ink-3">Agent Visibility Infrastructure — Make your brand discoverable, verifiable, and trackable across every AI agent</p>
          </div>

          {/* Brand selector ─ dropdown when user has own brands, badge otherwise */}
          {allOptions.length > 1 ? (
            <div className="flex items-center gap-2">
              <Zap className="w-3 h-3 text-caution flex-shrink-0" />
              <select
                value={activeBrandId}
                onChange={e => setActiveBrandId(e.target.value)}
                className="text-[11px] font-medium text-ink-2 bg-surface border border-divider-light px-3 py-1.5 rounded-xl focus:outline-none focus:border-[rgba(250,245,236,0.3)] cursor-pointer"
              >
                {allOptions.map(b => (
                  <option key={b.brand_id} value={b.brand_id}>{b.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[11px] text-ink-3 bg-surface border border-divider-light px-3 py-1.5 rounded-xl">
              <Zap className="w-3 h-3 text-caution" />
              <span className="font-medium">{activeBrand.name}</span>
            </div>
          )}
        </div>

        {/* ── Tab bar ───────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 mb-6 bg-surface border border-divider-light rounded-xl p-1 w-fit">
          {TABS.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all ${
                  isActive
                    ? 'bg-ink text-ink-inv shadow-sm'
                    : 'text-ink-3 hover:text-ink-2 hover:bg-surface-warm'
                }`}
              >
                <Icon className="w-3.5 h-3.5" strokeWidth={isActive ? 2.2 : 1.8} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* ── Tab Content ───────────────────────────────────────────── */}
        {activeTab === 'registry'  && <RegistryTab  brandId={activeBrandId} />}
        {activeTab === 'discovery' && <DiscoveryTab brandId={activeBrandId} />}
        {activeTab === 'verify'    && <VerifyTab    brandId={activeBrandId} />}
        {activeTab === 'telemetry' && <TelemetryTab brandId={activeBrandId} />}

      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 1 — Registry
// ══════════════════════════════════════════════════════════════════════════════

// ── Register-new-brand form state ─────────────────────────────────────────────
interface RegisterForm {
  domain: string
  name: string
  capabilities: string   // comma-separated
  categories: string     // comma-separated
}

function RegistryTab({ brandId }: { brandId: string }) {
  const [brand, setBrand]   = useState<BrandRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')
  const [reregistering, setReregistering] = useState(false)
  const [toast, setToast]   = useState('')

  // New-brand registration form
  const [showForm, setShowForm]     = useState(false)
  const [form, setForm]             = useState<RegisterForm>({ domain: '', name: '', capabilities: '', categories: '' })
  const [registering, setRegistering] = useState(false)
  const [formError, setFormError]   = useState('')
  const [registered, setRegistered] = useState<{ brand_id: string; persisted: boolean } | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const r = await fetch(`${INFRA}/resolve/${brandId}`)
      if (!r.ok) throw new Error(`${r.status}`)
      setBrand(await r.json())
    } catch {
      setError('Could not reach the registry. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }, [brandId])

  useEffect(() => { load() }, [load])

  const handleReregister = async () => {
    if (!brand) return
    setReregistering(true)
    try {
      const token = await getSessionToken()
      if (!token) { setToast('Not signed in — cannot re-register'); setTimeout(() => setToast(''), 3000); return }
      const r = await fetch(`${INFRA}/brand/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          brand_id:        brand.brand_id,
          domain:          brand.domain,
          name:            brand.name,
          agent_endpoints: brand.agent_endpoints,
          capabilities:    brand.capabilities,
          categories:      brand.categories,
        }),
      })
      if (!r.ok) throw new Error()
      setToast('Brand re-registered ✓')
      setTimeout(() => setToast(''), 3000)
      load()
    } catch {
      setToast('Re-registration failed')
      setTimeout(() => setToast(''), 3000)
    } finally {
      setReregistering(false)
    }
  }

  const handleRegisterNew = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.domain.trim() || !form.name.trim()) { setFormError('Domain and name are required'); return }
    setRegistering(true); setFormError(''); setRegistered(null)
    try {
      const token = await getSessionToken()
      if (!token) { setFormError('You must be signed in to register a brand'); return }
      const body = {
        domain:       form.domain.trim(),
        name:         form.name.trim(),
        capabilities: form.capabilities.split(',').map(s => s.trim()).filter(Boolean),
        categories:   form.categories.split(',').map(s => s.trim()).filter(Boolean),
      }
      const r = await fetch(`${INFRA}/brand/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        throw new Error((err as any).detail || `HTTP ${r.status}`)
      }
      const data = await r.json()
      setRegistered({ brand_id: data.brand_id, persisted: data.persisted })
      setForm({ domain: '', name: '', capabilities: '', categories: '' })
    } catch (err: any) {
      setFormError(err.message || 'Registration failed')
    } finally {
      setRegistering(false)
    }
  }

  if (loading) return <TabShell title="Registry" sublabel="Brand manifest & endpoints"><LoadingSpinner /></TabShell>
  if (error)   return <TabShell title="Registry" sublabel="Brand manifest & endpoints"><ErrorState message={error} onRetry={load} /></TabShell>
  if (!brand)  return null

  const att = brand.trust_attestation

  return (
    <TabShell title="Registry" sublabel="Brand manifest & endpoints" rightSlot={
      <button
        onClick={handleReregister}
        disabled={reregistering}
        className="flex items-center gap-1.5 text-[12px] font-semibold text-ink-2 hover:text-ink bg-surface-warm hover:bg-surface-muted border border-divider-light px-3 py-1.5 rounded-xl transition-all disabled:opacity-50"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${reregistering ? 'animate-spin' : ''}`} />
        Re-register
      </button>
    }>
      {toast && (
        <div className="mb-4 px-4 py-2.5 bg-sage-bg border border-[rgba(135,185,110,0.3)] rounded-xl text-[12px] font-medium text-sage">
          {toast}
        </div>
      )}

      {/* Brand identity */}
      <div className="flex items-start gap-4 mb-6 p-4 bg-surface-warm rounded-2xl border border-divider-light">
        <div className="w-12 h-12 rounded-xl bg-[rgba(250,245,236,0.06)] border border-[rgba(250,245,236,0.10)] flex items-center justify-center flex-shrink-0">
          <Globe className="w-6 h-6 text-[rgba(250,245,236,0.5)]" strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[15px] font-bold text-ink">{brand.name}</span>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
              att.verified
                ? 'bg-sage-bg text-sage border-[rgba(135,185,110,0.3)]'
                : 'bg-surface-warm text-ink-3 border-divider'
            }`}>
              {att.verified ? '✓ VERIFIED' : 'UNVERIFIED'}
            </span>
          </div>
          <p className="text-[12px] text-ink-3 mb-1">{brand.domain}</p>
          <p className="text-[11px] text-ink-3">
            Trust level: <span className="font-semibold text-ink-2">{att.level}</span>
            {att.issued_by && <> · Issued by <span className="font-semibold text-ink-2">{att.issued_by}</span></>}
          </p>
        </div>
        <div className="text-[10px] text-ink-3 text-right flex-shrink-0">
          <p className="font-mono">{brand.brand_id}</p>
          <p className="mt-0.5">{relativeTime(brand.created_at)}</p>
        </div>
      </div>

      {/* Agent Endpoints */}
      <Section title="Agent Endpoints" icon={<Network className="w-3.5 h-3.5" />}>
        <div className="space-y-2">
          {Object.entries(brand.agent_endpoints).map(([key, url]) => (
            <div key={key} className="flex items-center gap-3 px-3 py-2.5 bg-surface-warm rounded-xl border border-divider-light">
              <span className="text-[10px] font-bold text-caution uppercase tracking-wider w-24 flex-shrink-0">{key}</span>
              <span className="text-[11px] font-mono text-ink-2 truncate flex-1">{url}</span>
              <button
                onClick={() => navigator.clipboard.writeText(url)}
                className="p-1 rounded-md hover:bg-[rgba(250,245,236,0.06)] text-ink-3 hover:text-ink-2 transition-colors flex-shrink-0"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </Section>

      {/* Capabilities + Categories */}
      <div className="grid grid-cols-2 gap-4 mt-4">
        <Section title="Capabilities" icon={<Package className="w-3.5 h-3.5" />}>
          <div className="flex flex-wrap gap-1.5">
            {brand.capabilities.map(c => (
              <span key={c} className="text-[10px] font-semibold px-2.5 py-1 bg-[rgba(199,125,255,0.08)] text-[#C77DFF] border border-[rgba(199,125,255,0.2)] rounded-full">
                {c}
              </span>
            ))}
          </div>
        </Section>
        <Section title="Categories" icon={<ShoppingCart className="w-3.5 h-3.5" />}>
          <div className="flex flex-wrap gap-1.5">
            {brand.categories.map(c => (
              <span key={c} className="text-[10px] font-semibold px-2.5 py-1 bg-[rgba(32,190,248,0.08)] text-[#20bef8] border border-[rgba(32,190,248,0.2)] rounded-full">
                {c}
              </span>
            ))}
          </div>
        </Section>
      </div>

      {/* ── Register Your Brand ──────────────────────────────────── */}
      <div className="mt-6 pt-6 border-t border-divider-light">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[13px] font-bold text-ink">Register Your Brand</p>
            <p className="text-[11px] text-ink-3 mt-0.5">Make your brand discoverable by AI agents</p>
          </div>
          <button
            onClick={() => { setShowForm(f => !f); setFormError(''); setRegistered(null) }}
            className="flex items-center gap-1.5 text-[12px] font-semibold text-ink-2 hover:text-ink bg-surface-warm hover:bg-surface-muted border border-divider-light px-3 py-1.5 rounded-xl transition-all"
          >
            {showForm ? <><X className="w-3.5 h-3.5" />Cancel</> : <><Plus className="w-3.5 h-3.5" />Register New</>}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleRegisterNew} className="space-y-3 bg-surface-warm border border-divider-light rounded-2xl p-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-ink-3 uppercase tracking-wider mb-1.5">Domain *</label>
                <input
                  value={form.domain}
                  onChange={e => setForm(f => ({ ...f, domain: e.target.value }))}
                  placeholder="yourbrand.com"
                  className="w-full bg-surface border border-divider rounded-xl px-3 py-2 text-[12px] text-ink focus:outline-none focus:border-[rgba(250,245,236,0.3)] font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-ink-3 uppercase tracking-wider mb-1.5">Brand Name *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Your Brand Inc."
                  className="w-full bg-surface border border-divider rounded-xl px-3 py-2 text-[12px] text-ink focus:outline-none focus:border-[rgba(250,245,236,0.3)]"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-ink-3 uppercase tracking-wider mb-1.5">Capabilities <span className="text-ink-3 font-normal normal-case">(comma-separated)</span></label>
              <input
                value={form.capabilities}
                onChange={e => setForm(f => ({ ...f, capabilities: e.target.value }))}
                placeholder="product_search, checkout, order_status"
                className="w-full bg-surface border border-divider rounded-xl px-3 py-2 text-[12px] text-ink focus:outline-none focus:border-[rgba(250,245,236,0.3)]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-ink-3 uppercase tracking-wider mb-1.5">Categories <span className="text-ink-3 font-normal normal-case">(comma-separated)</span></label>
              <input
                value={form.categories}
                onChange={e => setForm(f => ({ ...f, categories: e.target.value }))}
                placeholder="eco-products, home-goods"
                className="w-full bg-surface border border-divider rounded-xl px-3 py-2 text-[12px] text-ink focus:outline-none focus:border-[rgba(250,245,236,0.3)]"
              />
            </div>

            {formError && (
              <div className="flex items-center gap-2 px-3 py-2 bg-[rgba(201,86,75,0.08)] border border-[rgba(201,86,75,0.2)] rounded-xl text-[11px] text-red-soft">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />{formError}
              </div>
            )}

            {registered && (
              <div className="flex items-start gap-2 px-3 py-2.5 bg-sage-bg border border-[rgba(135,185,110,0.3)] rounded-xl text-[11px] text-sage">
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Registered!</span> brand_id: <span className="font-mono">{registered.brand_id}</span>
                  {!registered.persisted && <span className="text-caution ml-2">(in-memory only — run Supabase migration to persist)</span>}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={registering}
                className="flex items-center gap-2 bg-ink hover:bg-[rgba(250,245,236,0.92)] text-canvas font-semibold text-[12px] px-5 py-2 rounded-xl transition-all disabled:opacity-50"
              >
                {registering
                  ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" />Registering…</>
                  : <><Network className="w-3.5 h-3.5" />Register Brand</>
                }
              </button>
            </div>
          </form>
        )}
      </div>
    </TabShell>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 2 — Discovery (SSE Live Feed)
// ══════════════════════════════════════════════════════════════════════════════

function DiscoveryTab({ brandId }: { brandId: string }) {
  const [events, setEvents]   = useState<DiscoveryEvent[]>([])
  const [live, setLive]       = useState(false)
  const [connected, setConnected] = useState(false)
  const [newCount, setNewCount]   = useState(0)
  const esRef = useRef<EventSource | null>(null)

  const connect = useCallback(() => {
    if (esRef.current) { esRef.current.close(); esRef.current = null }
    const url = `${INFRA}/stream/discovery/${brandId}`
    const es = new EventSource(url)
    esRef.current = es

    es.onopen = () => { setConnected(true); setLive(true) }
    es.onmessage = (e) => {
      try {
        const ev: DiscoveryEvent = JSON.parse(e.data)
        if (ev._type === 'heartbeat') return
        setEvents(prev => {
          const exists = prev.some(p => p.id === ev.id)
          if (exists) return prev
          const next = [ev, ...prev].slice(0, 100)
          if (ev._type === 'live') setNewCount(c => c + 1)
          return next
        })
      } catch {}
    }
    es.onerror = () => { setConnected(false) }
  }, [brandId])

  const disconnect = useCallback(() => {
    esRef.current?.close()
    esRef.current = null
    setConnected(false)
    setLive(false)
  }, [])

  // Auto-connect on mount
  useEffect(() => {
    connect()
    return () => { esRef.current?.close() }
  }, [connect])

  const toggleLive = () => { live ? disconnect() : connect() }

  return (
    <TabShell
      title="Discovery"
      sublabel={`Live agent discovery feed${events.length > 0 ? ` · ${events.length} events` : ''}`}
      rightSlot={
        <div className="flex items-center gap-2">
          {newCount > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 bg-sage-bg text-sage border border-[rgba(135,185,110,0.3)] rounded-full">
              +{newCount} live
            </span>
          )}
          <button
            onClick={toggleLive}
            className={`flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-xl border transition-all ${
              live && connected
                ? 'bg-sage-bg text-sage border-[rgba(135,185,110,0.3)] hover:bg-surface-warm'
                : 'bg-surface-warm text-ink-3 border-divider-light hover:text-ink-2'
            }`}
          >
            {live && connected
              ? <><span className="w-1.5 h-1.5 rounded-full bg-sage animate-pulse" />Live</>
              : <><WifiOff className="w-3 h-3" />Connect</>
            }
          </button>
        </div>
      }
    >
      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-2xl bg-surface-warm border border-divider-light flex items-center justify-center mb-4">
            <Wifi className="w-6 h-6 text-ink-3" strokeWidth={1.5} />
          </div>
          <p className="text-[13px] font-semibold text-ink-2 mb-1">Waiting for events…</p>
          <p className="text-[12px] text-ink-3">Connecting to the discovery stream</p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map(ev => <EventCard key={ev.id} ev={ev} />)}
        </div>
      )}
    </TabShell>
  )
}

function EventCard({ ev }: { ev: DiscoveryEvent }) {
  const agentStyle = AGENT_CHIP[ev.caller_agent_id] ?? AGENT_CHIP['custom-agent']
  const outcomeStyle = OUTCOME_STYLE[ev.outcome] ?? OUTCOME_STYLE.abandoned
  const outcomeIcon  = OUTCOME_ICON[ev.outcome]

  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border transition-all ${
      ev._type === 'live'
        ? 'bg-[rgba(135,185,110,0.04)] border-[rgba(135,185,110,0.15)] shadow-sm'
        : 'bg-surface-warm border-divider-light'
    }`}>
      {/* Agent chip */}
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 mt-0.5 ${agentStyle}`}>
        {ev.caller_agent_id}
      </span>

      {/* Intent + product */}
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium text-ink leading-snug truncate">{ev.intent}</p>
        <p className="text-[10px] text-ink-3 mt-0.5">
          <span className="font-medium text-caution">{ev.product_hint}</span>
          {' · '}rank #{ev.matched_rank}
          {' · '}trust <span className={`font-semibold ${trustColor(ev.trust_score)}`}>{(ev.trust_score * 100).toFixed(0)}%</span>
        </p>
      </div>

      {/* Outcome + time */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${outcomeStyle}`}>
          {outcomeIcon}{ev.outcome}
        </span>
        <span className="text-[9px] text-ink-3">{relativeTime(ev.created_at)}</span>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 3 — Verify
// ══════════════════════════════════════════════════════════════════════════════

function VerifyTab({ brandId }: { brandId: string }) {
  const [result, setResult]   = useState<VerifyResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [copied, setCopied]   = useState(false)
  const [agentId, setAgentId] = useState('claude-3-7-sonnet')

  const issue = async () => {
    setLoading(true); setError(''); setResult(null)
    try {
      const r = await fetch(`${INFRA}/verify`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ brand_id: brandId, caller_agent_id: agentId }),
      })
      if (!r.ok) throw new Error(`${r.status}`)
      setResult(await r.json())
    } catch {
      setError('Verification failed — is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  const copyJwt = () => {
    if (!result) return
    navigator.clipboard.writeText(result.jwt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Decode JWT payload for display (no verification here, just display)
  const jwtPayload = result ? (() => {
    try {
      const [, payload] = result.jwt.split('.')
      return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    } catch { return null }
  })() : null

  return (
    <TabShell title="Verify" sublabel="Issue signed JWT trust attestation">
      <div className="max-w-xl">
        {/* Issuer config */}
        <div className="mb-5">
          <label className="block text-[11px] font-semibold text-ink-3 uppercase tracking-wider mb-2">Caller Agent ID</label>
          <div className="flex gap-2">
            <input
              value={agentId}
              onChange={e => setAgentId(e.target.value)}
              className="flex-1 bg-surface border border-divider rounded-xl px-3 py-2 text-[13px] text-ink focus:outline-none focus:border-[rgba(250,245,236,0.3)] font-mono"
              placeholder="claude-3-7-sonnet"
            />
            <button
              onClick={issue}
              disabled={loading}
              className="flex items-center gap-2 bg-ink hover:bg-[rgba(250,245,236,0.92)] text-canvas font-semibold text-[13px] px-5 py-2 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" />Issuing…</>
                : <><ShieldCheck className="w-3.5 h-3.5" />Issue JWT</>
              }
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-[rgba(201,86,75,0.08)] border border-[rgba(201,86,75,0.2)] rounded-xl text-[12px] text-red-soft mb-4">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />{error}
          </div>
        )}

        {/* How it works (pre-issue) */}
        {!result && !error && (
          <div className="p-5 bg-surface-warm border border-divider-light rounded-2xl">
            <p className="text-[11px] font-bold text-ink-3 uppercase tracking-wider mb-3">How it works</p>
            <ol className="space-y-3">
              {[
                ['Consumer agent calls /verify', 'Passes brand_id + its own agent identifier'],
                ['Alignment signs an HS256 JWT', 'Claims: brand_id, iss, iat, exp (1h), scope'],
                ['Agent validates the JWT', 'Uses the public verification endpoint or shared secret'],
                ['Agent proceeds with recommendation', 'Trust level determines recommendation confidence'],
              ].map(([title, desc], i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-[rgba(250,245,236,0.08)] text-ink-3 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i+1}</span>
                  <div>
                    <p className="text-[12px] font-semibold text-ink">{title}</p>
                    <p className="text-[11px] text-ink-3">{desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {/* Trust badge */}
            <div className="flex items-center gap-3 p-4 bg-sage-bg border border-[rgba(135,185,110,0.25)] rounded-2xl">
              <CheckCircle2 className="w-5 h-5 text-sage flex-shrink-0" />
              <div>
                <p className="text-[13px] font-bold text-ink">Trust Certificate Issued</p>
                <p className="text-[11px] text-ink-3">
                  Level: <span className="font-semibold text-sage">{result.trust_level}</span>
                  {' · '}Expires: <span className="font-medium text-ink-2">{new Date(result.expires_at).toLocaleTimeString()}</span>
                </p>
              </div>
            </div>

            {/* JWT token */}
            <div className="bg-surface border border-divider-light rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-divider-light">
                <span className="text-[11px] font-bold text-ink-3 uppercase tracking-wider">JWT Token (HS256)</span>
                <button
                  onClick={copyJwt}
                  className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-2 hover:text-ink transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div className="px-4 py-3">
                <p className="text-[10px] font-mono text-ink-3 break-all leading-relaxed">{result.jwt}</p>
              </div>
            </div>

            {/* Decoded claims */}
            {jwtPayload && (
              <div className="bg-surface border border-divider-light rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-divider-light">
                  <span className="text-[11px] font-bold text-ink-3 uppercase tracking-wider">Decoded Claims</span>
                </div>
                <div className="px-4 py-3 space-y-1.5">
                  {Object.entries(jwtPayload).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-caution w-16 flex-shrink-0">{k}</span>
                      <span className="text-[11px] font-mono text-ink-2">
                        {k === 'exp' || k === 'iat'
                          ? `${v} · ${new Date(Number(v) * 1000).toISOString()}`
                          : String(v)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Capabilities scoped */}
            <div className="flex flex-wrap gap-1.5">
              {result.capabilities.map(c => (
                <span key={c} className="text-[10px] font-semibold px-2.5 py-1 bg-[rgba(199,125,255,0.08)] text-[#C77DFF] border border-[rgba(199,125,255,0.2)] rounded-full">
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </TabShell>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 4 — Telemetry
// ══════════════════════════════════════════════════════════════════════════════

function TelemetryTab({ brandId }: { brandId: string }) {
  const [data, setData]     = useState<TelemetryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')
  const [days, setDays]     = useState(14)

  const load = useCallback(async (d: number) => {
    setLoading(true); setError('')
    try {
      const r = await fetch(`${INFRA}/telemetry/${brandId}?days=${d}`)
      if (!r.ok) throw new Error(`${r.status}`)
      setData(await r.json())
    } catch {
      setError('Could not load telemetry data.')
    } finally {
      setLoading(false)
    }
  }, [brandId, days])

  useEffect(() => { load(days) }, [load, days])

  if (loading) return <TabShell title="Telemetry" sublabel="Agent call analytics"><LoadingSpinner /></TabShell>
  if (error)   return <TabShell title="Telemetry" sublabel="Agent call analytics"><ErrorState message={error} onRetry={() => load(days)} /></TabShell>
  if (!data)   return null

  const maxAgentCalls = Math.max(...data.agent_breakdown.map(a => a.calls), 1)
  const maxDailyCalls = Math.max(...data.daily_series.map(d => d.calls), 1)

  return (
    <TabShell
      title="Telemetry"
      sublabel={`Agent call analytics · last ${days} days`}
      rightSlot={
        <div className="flex items-center gap-1 bg-surface-warm border border-divider-light rounded-xl p-0.5">
          {[7, 14, 30].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                days === d ? 'bg-ink text-ink-inv shadow-sm' : 'text-ink-3 hover:text-ink-2'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      }
    >
      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard
          icon={<Activity className="w-4 h-4" />}
          label="Discovery Calls"
          value={data.discovery_calls.toLocaleString()}
          sub="total in window"
          accent="text-[#4285f4]"
          bg="bg-[rgba(66,133,244,0.08)]"
        />
        <KpiCard
          icon={<TrendingUp className="w-4 h-4" />}
          label="Conversion"
          value={`${(data.conversion_rate * 100).toFixed(1)}%`}
          sub={`${data.selected_count} selected`}
          accent="text-sage"
          bg="bg-sage-bg"
        />
        <KpiCard
          icon={<ShieldCheck className="w-4 h-4" />}
          label="Verify Calls"
          value={data.verify_calls.toLocaleString()}
          sub="JWT issued"
          accent="text-caution"
          bg="bg-caution-bg"
        />
        <KpiCard
          icon={<Bot className="w-4 h-4" />}
          label="Avg Trust Score"
          value={`${(data.avg_trust_score * 100).toFixed(1)}%`}
          sub="across all agents"
          accent={trustColor(data.avg_trust_score)}
          bg="bg-surface-warm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ── Agent Breakdown ── */}
        <div className="bg-surface border border-divider-light rounded-2xl p-5">
          <p className="text-[11px] font-bold text-ink-3 uppercase tracking-wider mb-4">Agent Breakdown</p>
          <div className="space-y-3">
            {data.agent_breakdown.map(({ agent, calls }) => (
              <div key={agent} className="flex items-center gap-3">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border w-24 text-center flex-shrink-0 ${
                  AGENT_CHIP[agent] ?? AGENT_CHIP['custom-agent']
                }`}>{agent}</span>
                <div className="flex-1 h-2 bg-[rgba(250,245,236,0.06)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width:      `${(calls / maxAgentCalls) * 100}%`,
                      background: agentBarColor(agent),
                    }}
                  />
                </div>
                <span className="text-[11px] font-semibold text-ink-2 w-8 text-right flex-shrink-0">{calls}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Daily Series ── */}
        <div className="bg-surface border border-divider-light rounded-2xl p-5">
          <p className="text-[11px] font-bold text-ink-3 uppercase tracking-wider mb-4">Daily Discovery Volume</p>
          <div className="flex items-end gap-1 h-24">
            {data.daily_series.map(({ date, calls }) => (
              <div key={date} className="flex-1 flex flex-col items-center gap-1 group relative">
                <div
                  className="w-full rounded-t-sm bg-[rgba(66,133,244,0.5)] hover:bg-[rgba(66,133,244,0.8)] transition-colors"
                  style={{ height: `${Math.max(4, (calls / maxDailyCalls) * 80)}px` }}
                />
                {/* Tooltip */}
                <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-ink text-ink-inv text-[9px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
                  {calls}
                </span>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[9px] text-ink-3">{data.daily_series[0]?.date?.slice(5)}</span>
            <span className="text-[9px] text-ink-3">{data.daily_series[data.daily_series.length - 1]?.date?.slice(5)}</span>
          </div>
        </div>
      </div>

      {/* ── Recent Events Table ── */}
      {data.recent_events.length > 0 && (
        <div className="mt-4 bg-surface border border-divider-light rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-divider-light">
            <p className="text-[11px] font-bold text-ink-3 uppercase tracking-wider">Recent Events</p>
          </div>
          <div className="divide-y divide-divider-light">
            {data.recent_events.map((ev, i) => (
              <div key={ev.id ?? i} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-warm transition-colors">
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border flex-shrink-0 ${
                  AGENT_CHIP[ev.caller_agent_id] ?? AGENT_CHIP['custom-agent']
                }`}>{ev.caller_agent_id}</span>
                <span className="text-[12px] text-ink-2 flex-1 truncate">{ev.intent}</span>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${
                  OUTCOME_STYLE[ev.outcome] ?? OUTCOME_STYLE.abandoned
                }`}>{ev.outcome}</span>
                <span className="text-[10px] text-ink-3 flex-shrink-0">{relativeTime(ev.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </TabShell>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Shared components
// ══════════════════════════════════════════════════════════════════════════════

function TabShell({
  title, sublabel, rightSlot, children
}: {
  title: string
  sublabel: string
  rightSlot?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="bg-surface rounded-2xl border border-divider-light shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-divider-light flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-bold text-ink">{title}</h2>
          <p className="text-[12px] text-ink-3 mt-0.5">{sublabel}</p>
        </div>
        {rightSlot}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  )
}

function Section({
  title, icon, children
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="mt-0">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-ink-3">{icon}</span>
        <span className="text-[10px] font-bold text-ink-3 uppercase tracking-wider">{title}</span>
      </div>
      {children}
    </div>
  )
}

function KpiCard({
  icon, label, value, sub, accent, bg
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  accent: string
  bg: string
}) {
  return (
    <div className="bg-surface border border-divider-light rounded-2xl p-4">
      <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center mb-3 ${accent}`}>
        {icon}
      </div>
      <p className={`text-[22px] font-bold ${accent} leading-none mb-1`}>{value}</p>
      <p className="text-[11px] font-semibold text-ink-2">{label}</p>
      <p className="text-[10px] text-ink-3 mt-0.5">{sub}</p>
    </div>
  )
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-6 h-6 border-2 border-[rgba(250,245,236,0.15)] border-t-[rgba(250,245,236,0.6)] rounded-full animate-spin" />
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <AlertTriangle className="w-8 h-8 text-caution mb-3" strokeWidth={1.5} />
      <p className="text-[13px] font-semibold text-ink-2 mb-1">Something went wrong</p>
      <p className="text-[12px] text-ink-3 mb-4 max-w-xs">{message}</p>
      <button
        onClick={onRetry}
        className="flex items-center gap-1.5 text-[12px] font-semibold text-ink-2 hover:text-ink bg-surface-warm border border-divider-light px-4 py-2 rounded-xl transition-all"
      >
        <RefreshCw className="w-3.5 h-3.5" />Retry
      </button>
    </div>
  )
}

function agentBarColor(agent: string): string {
  const map: Record<string, string> = {
    claude:         '#C77DFF',
    chatgpt:        '#10a37f',
    perplexity:     '#20bef8',
    gemini:         '#4285f4',
    'custom-agent': 'rgba(250,245,236,0.25)',
  }
  return map[agent] ?? 'rgba(250,245,236,0.25)'
}
