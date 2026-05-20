'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { proxyApi, ProxyDomain, ProxyDomainStatus, ProxyAnalytics, ProxyVerifyResult } from '@/lib/api'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import {
  Globe, ArrowLeft, CheckCircle, Clock, RefreshCw, XCircle,
  Pause, AlertCircle, Loader2, ExternalLink, Copy, CheckCheck,
  BarChart3, Layers, Settings, Zap, Bot,
  TrendingUp, Activity, Download, FileText, Save, Wrench, ChevronRight,
  ShieldCheck,
} from 'lucide-react'

import BrandDataTab from './BrandDataTab'
import SdkAdminTab from './SdkAdminTab'
import dynamic from 'next/dynamic'

const EChartsWorldMap = dynamic(() => import('@/components/EChartsWorldMap'), { ssr: false })

type Tab = 'overview' | 'assets' | 'analytics' | 'sdk'

function formatRelativeTime(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType; bg: string }> = {
  active:           { label: 'Active',          color: 'text-sage',  bg: 'bg-sage-bg border-sage/20',   icon: CheckCircle },
  pending:          { label: 'Pending DNS',      color: 'text-caution',  bg: 'bg-caution-bg border-caution/20',   icon: Clock },
  dns_verifying:    { label: 'Verifying DNS',    color: 'text-ink-2',   bg: 'bg-surface-warm border-divider',     icon: RefreshCw },
  ssl_provisioning: { label: 'Provisioning SSL', color: 'text-ink-2', bg: 'bg-surface-warm border-divider',     icon: RefreshCw },
  paused:           { label: 'Paused',           color: 'text-ink-2',   bg: 'bg-surface-warm border-divider-light',     icon: Pause },
  error:            { label: 'Error',            color: 'text-red-soft',    bg: 'bg-red-soft-bg border-red-soft/20',       icon: XCircle },
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button onClick={copy} className="text-ink-3 hover:text-ink-2 transition-colors">
      {copied ? <CheckCheck className="w-3.5 h-3.5 text-sage" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

// ── Technical Config (used inside Overview Tab) ───────────────────────────────

function ToggleRow({
  label,
  desc,
  value,
  onChange,
  warning,
  disabled,
}: {
  label: string
  desc: string
  value: boolean
  onChange: (v: boolean) => void
  warning?: string
  disabled?: boolean
}) {
  return (
    <div className="py-3">
      <div className="flex items-center justify-between">
        <div className="pr-4">
          <div className={`text-sm ${disabled ? 'text-ink-3' : 'text-ink'}`}>{label}</div>
          <div className="text-xs text-ink-3 mt-0.5">{desc}</div>
        </div>
        <button
          type="button"
          onClick={() => !disabled && onChange(!value)}
          disabled={disabled}
          className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
            disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
          } ${value ? 'bg-ink' : 'bg-surface-muted'}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-surface rounded-full shadow-sm transition-transform duration-200 ${
              value ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
      {warning && (
        <div className="mt-2 text-xs text-caution bg-caution-bg border border-caution/20 rounded-lg px-3 py-2">
          {warning}
        </div>
      )}
    </div>
  )
}

function TechnicalConfigSection({
  domain,
  userId,
  onDomainUpdate,
}: {
  domain: ProxyDomain
  userId: string
  onDomainUpdate: (d: ProxyDomain) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [cfg, setCfg] = useState({
    strip_noindex: domain.strip_noindex,
    inject_canonical: domain.inject_canonical,
    robots_allow_all_ai: domain.robots_allow_all_ai,
    date_modified_auto: domain.date_modified_auto,
    bypass_paywall: domain.bypass_paywall,
    prerender_csr: domain.prerender_csr,
    custom_robots_rules: domain.custom_robots_rules,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const toggle = (key: keyof typeof cfg, value: boolean) =>
    setCfg(prev => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const updated = await proxyApi.updateDomain(domain.id, userId, cfg)
      onDomainUpdate(updated)
      setSaved(true)
      setIsOpen(false)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-surface border border-divider-light rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-warm transition-colors"
      >
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-ink-3" />
          <span className="text-sm font-semibold text-ink-2">Technical Config</span>
          <span className="text-xs text-ink-3 ml-1">Proxy behavior flags</span>
        </div>
        <ChevronRight className={`w-4 h-4 text-ink-3 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
      </button>
      {isOpen && (
        <div className="px-5 pb-5 border-t border-divider-light">
          <div className="divide-y divide-divider-light mt-3">
            <ToggleRow
              label="Strip noindex for AI"
              desc="Remove noindex meta tags when AI bots visit"
              value={cfg.strip_noindex}
              onChange={v => toggle('strip_noindex', v)}
            />
            <ToggleRow
              label="Inject Canonical Tag"
              desc='Add <link rel="canonical"> pointing to your domain'
              value={cfg.inject_canonical}
              onChange={v => toggle('inject_canonical', v)}
            />
            <ToggleRow
              label="Allow All AI Bots in robots.txt"
              desc="Generate AI-friendly robots.txt allowing 34+ known bots"
              value={cfg.robots_allow_all_ai}
              onChange={v => toggle('robots_allow_all_ai', v)}
            />
            <ToggleRow
              label="Auto-inject dateModified"
              desc="Inject current timestamp as JSON-LD dateModified"
              value={cfg.date_modified_auto}
              onChange={v => toggle('date_modified_auto', v)}
            />
            <ToggleRow
              label="Bypass Paywall for AI"
              desc="Serve full content to AI bots (requires written authorization)"
              value={cfg.bypass_paywall}
              onChange={v => toggle('bypass_paywall', v)}
              warning={cfg.bypass_paywall ? 'This may conflict with your content distribution agreements. Ensure you have written authorization before enabling.' : undefined}
            />
            <ToggleRow
              label="Pre-render CSR Pages"
              desc="Serve server-side rendered HTML to AI crawlers — coming soon"
              value={cfg.prerender_csr}
              onChange={v => toggle('prerender_csr', v)}
              disabled
              warning={cfg.prerender_csr ? 'Adds latency to every AI bot request. Test on staging first.' : undefined}
            />
          </div>

          <div className="mt-4">
            <label className="text-xs font-semibold text-ink-2">Custom robots.txt Rules</label>
            <p className="text-xs text-ink-3 mt-0.5 mb-1.5">
              Appended to the generated robots.txt. Overrides &quot;Allow All AI Bots&quot; for matching User-agents.
            </p>
            <textarea
              value={cfg.custom_robots_rules}
              onChange={e => setCfg(prev => ({ ...prev, custom_robots_rules: e.target.value }))}
              rows={3}
              placeholder={'# Additional rules\nUser-agent: *\nDisallow: /private/'}
              className="w-full px-3 py-2 text-xs font-mono bg-surface-warm border border-divider-light rounded-xl focus:outline-none focus:border-ink resize-y"
            />
          </div>

          {/* D1-10: Content-Signal — read-only preview */}
          <div className="mt-4 p-3 bg-surface-warm border border-divider-light rounded-xl">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-ink-2">Content-Signal (D1-10)</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-sage-bg text-sage rounded-full font-medium">Auto-injected</span>
            </div>
            <p className="text-[11px] text-ink-3 mb-1.5">
              Cloudflare Agent Readiness standard (April 2026). Appended to robots.txt to declare AI data usage policy.
            </p>
            <code className="text-[11px] font-mono text-ink bg-surface px-2 py-1 rounded-lg block">
              # Content-Signal: {domain.content_signal ?? 'train-genai=n, search=y, ai-input=y'}
            </code>
          </div>

          {saveError && (
            <div className="mt-3 text-xs text-red-soft bg-red-soft-bg border border-red-soft/20 rounded-lg px-3 py-2">
              {saveError}
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-ink hover:bg-[#2d2d2c] disabled:opacity-50 text-ink-inv text-xs font-semibold rounded-xl transition-colors"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : saved ? (
                <CheckCircle className="w-3.5 h-3.5" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Config'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Shared verify UI (used by both infra and full verify sections) ────────────
function VerifyCard({
  title,
  subtitle,
  quick,
  domainId,
  userId,
}: {
  title: string
  subtitle: string
  quick: boolean
  domainId: string
  userId: string
}) {
  const [result,  setResult]  = useState<ProxyVerifyResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const run = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const r = await proxyApi.verifyDomain(domainId, userId, quick)
      setResult(r)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-surface border border-divider-light rounded-2xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-ink-2 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            {title}
          </h3>
          <p className="text-xs text-ink-3 mt-0.5">{subtitle}</p>
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-ink hover:bg-[#2d2d2c] disabled:opacity-50 text-ink-inv text-xs font-semibold rounded-xl transition-colors flex-shrink-0"
        >
          {loading
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <ShieldCheck className="w-3.5 h-3.5" />}
          {loading ? 'Checking…' : result ? 'Re-verify' : 'Run Check'}
        </button>
      </div>

      {error && (
        <div className="mt-3 text-xs text-red-soft bg-red-soft-bg border border-red-soft/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4 space-y-2">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold ${
            result.all_passed
              ? 'bg-sage-bg border border-sage/20 text-sage'
              : 'bg-caution-bg border border-caution/20 text-caution'
          }`}>
            {result.all_passed
              ? <CheckCircle className="w-3.5 h-3.5" />
              : <AlertCircle className="w-3.5 h-3.5" />}
            {result.passed}/{result.total} passed
            {result.all_passed ? ' — All checks OK ✓' : ' — Some checks failed'}
          </div>

          {result.checks.map((c, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${
                c.passed ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
              }`}>
                {c.passed ? '✓' : '!'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold text-ink">{c.name}</div>
                <p className="text-[11px] text-ink-3 mt-0.5">{c.detail}</p>
              </div>
              <a href={c.url} target="_blank" rel="noopener noreferrer"
                className="text-ink-3 hover:text-ink-2 flex-shrink-0 mt-0.5" title="Open URL">
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Proxy routing debug check — 5 infra items, no brand data required
function InfraCheckSection({ domainId, userId }: { domainId: string; userId: string }) {
  return (
    <VerifyCard
      title="Proxy Routing Check"
      subtitle="5 protocol checks: HTTPS routing, robots.txt, agent.json, api-catalog, mcp-server (no brand data required)"
      quick={true}
      domainId={domainId}
      userId={userId}
    />
  )
}

// Full delivery verification — 10 items, run once DNS is active and brand data is synced
function FullVerifySection({ domainId, userId }: { domainId: string; userId: string }) {
  return (
    <VerifyCard
      title="End-to-End Verification"
      subtitle="All 10 V2 protocol checks must pass — includes Link Headers, Content-Signal, agent skills (D1-06 to D1-10)"
      quick={false}
      domainId={domainId}
      userId={userId}
    />
  )
}

// ── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab({
  domain,
  status,
  onRefreshStatus,
  refreshingStatus,
  onSync,
  syncing,
  syncResult,
  lastSynced,
  userId,
  onDomainUpdate,
}: {
  domain: ProxyDomain
  status: ProxyDomainStatus | null
  onRefreshStatus: () => void
  refreshingStatus: boolean
  onSync: () => void
  syncing: boolean
  syncResult: string | null
  lastSynced: string | null
  userId: string
  onDomainUpdate: (d: ProxyDomain) => void
}) {
  const cfg = STATUS_CONFIG[domain.status] ?? STATUS_CONFIG.pending
  const Icon = cfg.icon
  const isActive = domain.status === 'active'

  // Auto-poll every 30s while waiting for DNS to propagate
  useEffect(() => {
    if (isActive) return
    const id = setInterval(() => { onRefreshStatus() }, 30_000)
    return () => clearInterval(id)
  }, [isActive, onRefreshStatus])

  return (
    <div className="space-y-4">
      {/* ── Status card ─────────────────────────────────────── */}
      <div className={`border rounded-2xl p-5 ${cfg.bg}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Icon className={`w-5 h-5 ${cfg.color}`} />
            <div>
              <div className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</div>
              {!isActive && (
                <div className="text-xs text-ink-3 mt-0.5">
                  Add the CNAME record below — auto-checking every 30s
                </div>
              )}
              {isActive && (
                <div className="text-xs text-sage mt-0.5">
                  Proxy is live — AI bots are being served enhanced content
                </div>
              )}
            </div>
          </div>

          {/* Pending: prominent "Check DNS Status" button; Active: subtle re-check link */}
          {!isActive ? (
            <button
              onClick={onRefreshStatus}
              disabled={refreshingStatus}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-ink-2
                bg-surface border border-divider hover:bg-surface-warm disabled:opacity-50
                rounded-xl transition-colors flex-shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshingStatus ? 'animate-spin' : ''}`} />
              {refreshingStatus ? 'Checking…' : 'Check DNS Status'}
            </button>
          ) : (
            <button
              onClick={onRefreshStatus}
              disabled={refreshingStatus}
              className="flex items-center gap-1 text-[11px] text-ink-3 hover:text-ink-2 transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${refreshingStatus ? 'animate-spin' : ''}`} />
              Re-check
            </button>
          )}
        </div>
      </div>

      {/* ── DNS Setup (pending only) ─────────────────────────── */}
      {!isActive && status && (
        <div className="bg-surface border border-divider-light rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-ink-2 mb-3">DNS Configuration Required</h3>
          <div className="bg-ink rounded-xl overflow-hidden">
            <div className="px-4 py-2 border-b border-white/10 text-xs font-mono text-white/40">CNAME Record</div>
            <div className="p-4 space-y-2 font-mono text-sm">
              <div className="flex items-center gap-3">
                <span className="text-white/40 w-14 flex-shrink-0">Type</span>
                <span className="text-green-400">CNAME</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-white/40 w-14 flex-shrink-0">Name</span>
                <span className="text-blue-300">{domain.domain}</span>
                <CopyButton text={domain.domain} />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-white/40 w-14 flex-shrink-0">Target</span>
                <span className="text-yellow-300 text-xs break-all">{status.dns_cname_target}</span>
                <CopyButton text={status.dns_cname_target} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Domain info grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface border border-divider-light rounded-2xl p-4">
          <div className="text-xs text-ink-3 mb-1">Domain</div>
          <div className="text-sm font-semibold text-ink flex items-center gap-2">
            {domain.domain}
            {domain.status === 'active' && (
              <a href={`https://${domain.domain}/llms.txt`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3.5 h-3.5 text-ink-3 hover:text-red-soft transition-colors" />
              </a>
            )}
          </div>
        </div>
        <div className="bg-surface border border-divider-light rounded-2xl p-4">
          <div className="text-xs text-ink-3 mb-1">Origin</div>
          <div className="text-sm font-semibold text-ink truncate">{domain.origin_url}</div>
        </div>
        <div className="bg-surface border border-divider-light rounded-2xl p-4">
          <div className="text-xs text-ink-3 mb-1">AI Bots</div>
          <div className={`text-sm font-semibold ${domain.robots_allow_all_ai ? 'text-sage' : 'text-caution'}`}>
            {domain.robots_allow_all_ai ? 'All Allowed' : 'Restricted'}
          </div>
        </div>
        <div className="bg-surface border border-divider-light rounded-2xl p-4">
          <div className="text-xs text-ink-3 mb-1">noindex Strip</div>
          <div className={`text-sm font-semibold ${domain.strip_noindex ? 'text-sage' : 'text-ink-3'}`}>
            {domain.strip_noindex ? 'Enabled' : 'Disabled'}
          </div>
        </div>
      </div>

      {/* Quick links */}
      {domain.status === 'active' && (
        <div className="bg-surface border border-divider-light rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-ink-2 mb-3">AI Discovery Files</h3>
          <div className="space-y-2">
            {[
              { path: '/llms.txt',                  label: 'llms.txt',      desc: 'AI language model discovery file' },
              { path: '/.well-known/agent.json',    label: 'agent.json',    desc: 'AI Agent Discovery Protocol (V2 skills)' },
              { path: '/robots.txt',                label: 'robots.txt',    desc: 'AI-friendly bot access rules + Content-Signal' },
              { path: '/.well-known/api-catalog',   label: 'api-catalog',   desc: 'RFC 9727 — Machine-readable API index (D1-07)' },
              { path: '/.well-known/mcp-server',    label: 'mcp-server',    desc: 'MCP Server Card — agent tool & resource access (D1-08)' },
            ].map(f => (
              <a
                key={f.path}
                href={`https://${domain.domain}${f.path}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 bg-surface-warm hover:bg-surface-muted rounded-xl transition-colors group"
              >
                <div>
                  <div className="text-sm font-mono font-medium text-ink">{f.label}</div>
                  <div className="text-xs text-ink-3">{f.desc}</div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-ink-3 group-hover:text-red-soft transition-colors" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Proxy routing debug check — only shown when active, useful for troubleshooting */}
      {isActive && (
        <InfraCheckSection domainId={domain.id} userId={userId} />
      )}

      {/* End-to-End Verification — brand data auto-filled at domain creation; run once DNS is active */}
      {isActive && (
        <FullVerifySection domainId={domain.id} userId={userId} />
      )}

      {/* Technical Config */}
      <TechnicalConfigSection
        domain={domain}
        userId={userId}
        onDomainUpdate={onDomainUpdate}
      />

      {/* ── Sync to KV (active only) ─────────────────────────── */}
      {isActive && (
        <div className="bg-surface border border-divider-light rounded-2xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-semibold text-ink-2">Sync to Edge Network</h3>
              <p className="text-xs text-ink-3 mt-0.5">
                Push updated brand data to Cloudflare KV — changes go live within ~60 seconds.
              </p>
              {lastSynced && (
                <p className="text-xs text-ink-3 mt-1 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-sage" />
                  Last synced: {formatRelativeTime(lastSynced)}
                </p>
              )}
            </div>
            <button
              onClick={onSync}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 bg-ink hover:bg-[#2d2d2c] disabled:opacity-50 text-ink-inv text-xs font-semibold rounded-xl transition-colors flex-shrink-0"
            >
              {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              {syncing ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>
          {syncResult && (
            <div className="mt-3 p-3 bg-sage-bg border border-sage/20 rounded-xl text-xs text-sage">
              {syncResult}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Analytics Tab ─────────────────────────────────────────────────────────────

// Official platform metadata — maps bot_name / referral source → canonical display name + favicon domain
// Covers all 58 global AI platforms (USA·China·France·Germany·Korea·Russia·Browser)
const PLATFORM_META: Record<string, { name: string; domain: string }> = {
  // ── OpenAI / ChatGPT (all OpenAI bots merge under "ChatGPT") ────────────
  'GPTBot':              { name: 'ChatGPT',     domain: 'chatgpt.com' },
  'ChatGPT-User':        { name: 'ChatGPT',     domain: 'chatgpt.com' },
  'ChatGPT':             { name: 'ChatGPT',     domain: 'chatgpt.com' },
  'OAI-Search':          { name: 'ChatGPT',     domain: 'chatgpt.com' },
  'OAI-SearchBot':       { name: 'ChatGPT',     domain: 'chatgpt.com' },
  // ── Anthropic / Claude ────────────────────────────────────────────────────
  'ClaudeBot':           { name: 'Claude',      domain: 'claude.ai' },
  'Claude-Web':          { name: 'Claude',      domain: 'claude.ai' },
  'Anthropic':           { name: 'Claude',      domain: 'claude.ai' },
  'anthropic-ai':        { name: 'Claude',      domain: 'claude.ai' },
  'Claude':              { name: 'Claude',      domain: 'claude.ai' },
  // ── Google / Gemini (all Google AI bots → "Gemini") ──────────────────────
  // Consistent with Shopify App: GoogleOther, Google-Extended, Gemini all
  // belong to "Google Gemini" AI platform.
  'Google-Extended':     { name: 'Gemini',      domain: 'gemini.google.com' },
  'GeminiBot':           { name: 'Gemini',      domain: 'gemini.google.com' },
  'Gemini':              { name: 'Gemini',      domain: 'gemini.google.com' },
  'Googlebot':           { name: 'Gemini',      domain: 'gemini.google.com' },
  'GoogleOther':         { name: 'Gemini',      domain: 'gemini.google.com' },
  // ── Perplexity ────────────────────────────────────────────────────────────
  'PerplexityBot':       { name: 'Perplexity',  domain: 'perplexity.ai' },
  'Perplexity':          { name: 'Perplexity',  domain: 'perplexity.ai' },
  // ── Microsoft / Copilot ───────────────────────────────────────────────────
  'Bingbot':             { name: 'Copilot',     domain: 'copilot.microsoft.com' },
  'bingbot':             { name: 'Copilot',     domain: 'copilot.microsoft.com' },
  'BingPreview':         { name: 'Copilot',     domain: 'copilot.microsoft.com' },
  'Copilot':             { name: 'Copilot',     domain: 'copilot.microsoft.com' },
  'Bing AI':             { name: 'Copilot',     domain: 'copilot.microsoft.com' },
  // ── Meta AI ───────────────────────────────────────────────────────────────
  'Meta-Agent':          { name: 'Meta AI',     domain: 'meta.ai' },
  'FacebookBot':         { name: 'Meta AI',     domain: 'meta.ai' },
  'meta-externalagent':  { name: 'Meta AI',     domain: 'meta.ai' },
  'Meta AI':             { name: 'Meta AI',     domain: 'meta.ai' },
  // ── Apple ─────────────────────────────────────────────────────────────────
  'Applebot-Ext':        { name: 'Apple',       domain: 'apple.com' },
  'Applebot':            { name: 'Apple',       domain: 'apple.com' },
  // ── xAI / Grok ────────────────────────────────────────────────────────────
  'Grok':                { name: 'Grok',        domain: 'x.ai' },
  'xAI':                 { name: 'Grok',        domain: 'x.ai' },
  // ── Cohere ────────────────────────────────────────────────────────────────
  'Cohere':              { name: 'Cohere',      domain: 'cohere.com' },
  'cohere-ai':           { name: 'Cohere',      domain: 'cohere.com' },
  // ── You.com ───────────────────────────────────────────────────────────────
  'YouBot':              { name: 'You.com',     domain: 'you.com' },
  'You.com':             { name: 'You.com',     domain: 'you.com' },
  // ── Brave ─────────────────────────────────────────────────────────────────
  'Brave-Search':        { name: 'Brave',       domain: 'search.brave.com' },
  'Brave':               { name: 'Brave',       domain: 'search.brave.com' },
  // ── Amazon ────────────────────────────────────────────────────────────────
  'Amazonbot':           { name: 'Amazon',      domain: 'amazon.com' },
  // ── DuckDuckGo ────────────────────────────────────────────────────────────
  'DuckDuckBot':         { name: 'DuckDuckGo',  domain: 'duckduckgo.com' },
  'DuckDuckGo':          { name: 'DuckDuckGo',  domain: 'duckduckgo.com' },
  // ── Mistral AI ────────────────────────────────────────────────────────────
  'MistralBot':          { name: 'Mistral AI',  domain: 'mistral.ai' },
  'Mistral AI':          { name: 'Mistral AI',  domain: 'mistral.ai' },
  'Le Chat':             { name: 'Mistral AI',  domain: 'mistral.ai' },
  // ── Common Crawl ──────────────────────────────────────────────────────────
  'CCBot':               { name: 'CommonCrawl', domain: 'commoncrawl.org' },
  // ── Kagi ──────────────────────────────────────────────────────────────────
  'KagiBot':             { name: 'Kagi',        domain: 'kagi.com' },
  'Kagi':                { name: 'Kagi',        domain: 'kagi.com' },
  // ── Phind ─────────────────────────────────────────────────────────────────
  'Phind':               { name: 'Phind',       domain: 'phind.com' },
  // ── Inflection AI (Pi) ────────────────────────────────────────────────────
  'Pi':                  { name: 'Pi',          domain: 'pi.ai' },
  'Inflection-AI':       { name: 'Pi',          domain: 'pi.ai' },
  // ── Writer.ai ─────────────────────────────────────────────────────────────
  'Writer':              { name: 'Writer',      domain: 'writer.com' },
  'WriterBot':           { name: 'Writer',      domain: 'writer.com' },
  // ── Arc Browser ───────────────────────────────────────────────────────────
  'Arc Browser':         { name: 'Arc Browser', domain: 'arc.net' },

  // ── Canonical-name shortcuts (for merged display lookup) ──────────────────
  // These allow getPlatformMeta(canonicalName) to resolve logo domains
  // when "AI Platforms Reading Your Store" groups by canonical name.
  'Apple':               { name: 'Apple',        domain: 'apple.com' },
  'Amazon':              { name: 'Amazon',       domain: 'amazon.com' },
  'CommonCrawl':         { name: 'CommonCrawl',  domain: 'commoncrawl.org' },
  'SearchGPT':           { name: 'ChatGPT',      domain: 'chatgpt.com' },

  // ── ByteDance / Doubao ────────────────────────────────────────────────────
  'Bytespider':          { name: 'Doubao',      domain: 'doubao.com' },
  'Doubao':              { name: 'Doubao',      domain: 'doubao.com' },
  // ── DeepSeek ──────────────────────────────────────────────────────────────
  'DeepSeekBot':         { name: 'DeepSeek',    domain: 'deepseek.com' },
  'DeepSeek':            { name: 'DeepSeek',    domain: 'deepseek.com' },
  // ── Moonshot AI / Kimi ────────────────────────────────────────────────────
  'MoonshotBot':         { name: 'Kimi',        domain: 'kimi.moonshot.cn' },
  'Kimi':                { name: 'Kimi',        domain: 'kimi.moonshot.cn' },
  // ── Alibaba / Tongyi (Qwen) ───────────────────────────────────────────────
  'Qwen':                { name: 'Tongyi',      domain: 'tongyi.aliyun.com' },
  'Tongyi':              { name: 'Tongyi',      domain: 'tongyi.aliyun.com' },
  // ── Baidu AI ──────────────────────────────────────────────────────────────
  'BaiduBot':            { name: 'Baidu AI',    domain: 'baidu.com' },
  'Baiduspider':         { name: 'Baidu AI',    domain: 'baidu.com' },
  'Baidu AI':            { name: 'Baidu AI',    domain: 'baidu.com' },
  // ── Tencent / Hunyuan ─────────────────────────────────────────────────────
  'Hunyuan':             { name: 'Hunyuan',     domain: 'hunyuan.tencent.com' },
  // ── iFlytek / Xinghuo ─────────────────────────────────────────────────────
  'SparkBot':            { name: 'Xinghuo',     domain: 'xinghuo.xfyun.cn' },
  'Xinghuo':             { name: 'Xinghuo',     domain: 'xinghuo.xfyun.cn' },
  // ── Zhipu AI (ChatGLM) ────────────────────────────────────────────────────
  'ZhipuAI':             { name: 'Zhipu AI',    domain: 'zhipuai.cn' },
  'Zhipu AI':            { name: 'Zhipu AI',    domain: 'zhipuai.cn' },
  // ── 360 AI ────────────────────────────────────────────────────────────────
  '360 AI':              { name: '360 AI',      domain: 'so.com' },
  // ── Baichuan AI ───────────────────────────────────────────────────────────
  'Baichuan':            { name: 'Baichuan',    domain: 'baichuan-ai.com' },
  // ── MiniMax ───────────────────────────────────────────────────────────────
  'MiniMax':             { name: 'MiniMax',     domain: 'minimax.chat' },

  // ── Naver / Clova X (Korea) ───────────────────────────────────────────────
  'Yeti':                { name: 'Clova X',     domain: 'clova.ai' },
  'Clova X':             { name: 'Clova X',     domain: 'clova.ai' },
  // ── Kakao i (Korea) ───────────────────────────────────────────────────────
  'DaumBot':             { name: 'Kakao i',     domain: 'kakao.com' },
  'Kakao i':             { name: 'Kakao i',     domain: 'kakao.com' },

  // ── Yandex AI (Russia) ────────────────────────────────────────────────────
  'YandexBot':           { name: 'Yandex AI',   domain: 'yandex.ru' },
  'Yandex AI':           { name: 'Yandex AI',   domain: 'yandex.ru' },
  // ── Sber / GigaChat (Russia) ──────────────────────────────────────────────
  'SberBot':             { name: 'GigaChat',    domain: 'sber.ru' },
  'GigaChat':            { name: 'GigaChat',    domain: 'sber.ru' },

  // ── DeepL (Germany) ───────────────────────────────────────────────────────
  'DeepLBot':            { name: 'DeepL',       domain: 'deepl.com' },
  'DeepL':               { name: 'DeepL',       domain: 'deepl.com' },
}

function getPlatformMeta(key: string): { name: string; domain: string } {
  return PLATFORM_META[key] ?? { name: key, domain: '' }
}

function PlatformLogo({ id, size = 16 }: { id: string; size?: number }) {
  const meta = getPlatformMeta(id)
  if (!meta.domain) return null
  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${meta.domain}&sz=32`}
      alt={meta.name}
      width={size}
      height={size}
      className="rounded-sm shrink-0"
      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
    />
  )
}

type TimeRange = { label: string; days: number }
const TIME_RANGES: TimeRange[] = [
  { label: 'Last 24h',    days: 1  },
  { label: 'Last 7 days', days: 7  },
  { label: 'Last 30 days',days: 30 },
  { label: 'All time',    days: 0  },
]

function buildPlatformIntel(analytics: ProxyAnalytics) {
  const map: Record<string, { crawls: number; referrals: number }> = {}
  const namedBots = analytics.by_bot.filter(b => b.bot_name !== 'UnknownBot')
  namedBots.forEach(b => {
    const key = getPlatformMeta(b.bot_name).name
    if (!map[key]) map[key] = { crawls: 0, referrals: 0 }
    map[key].crawls += b.visit_count
  })
  ;(analytics.ai_referral_sources ?? []).forEach(s => {
    const key = getPlatformMeta(s.source).name
    if (!map[key]) map[key] = { crawls: 0, referrals: 0 }
    map[key].referrals += s.visit_count
  })
  return Object.entries(map)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => (b.crawls + b.referrals) - (a.crawls + a.referrals))
}

// ── Page path helpers ─────────────────────────────────────────────────────────

// Technical / internal paths that should never appear in "pages AI read"
const TECHNICAL_PATH_RE = [
  /^\/sitemap/i,          // sitemap.xml, sitemap_*.xml, etc.
  /^\/robots\.txt$/i,
  /^\/llms/i,             // llms.txt, llms-full.txt
  /^\/meta\.json$/i,
  /^\/api\//i,            // /api/jsonld and any other API routes
  /^\/.well-known\//i,
  /^\/cdn-cgi\//i,
]

function isHumanPagePath(path: string): boolean {
  return !TECHNICAL_PATH_RE.some(re => re.test(path))
}

function slugToTitle(slug: string): string {
  return slug.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

interface PageInfo {
  name: string
  type: 'home' | 'product' | 'collection' | 'page' | 'blog' | 'other'
  badge: string
}

function pathToPageInfo(path: string): PageInfo {
  const clean = (path ?? '/').replace(/\?.*$/, '').replace(/\/$/, '') || '/'
  if (clean === '/') return { name: 'Homepage', type: 'home', badge: 'Home' }
  const parts  = clean.split('/').filter(Boolean)
  const first  = parts[0]?.toLowerCase()
  if (first === 'products' && parts.length >= 2)
    return { name: slugToTitle(parts[1]), type: 'product',    badge: 'Product'    }
  if (first === 'collections' && parts.length >= 2)
    return { name: slugToTitle(parts[1]), type: 'collection', badge: 'Collection' }
  if (first === 'pages' && parts.length >= 2)
    return { name: slugToTitle(parts[1]), type: 'page',       badge: 'Page'       }
  if ((first === 'blogs' || first === 'blog') && parts.length >= 2) {
    const title = parts.length >= 3 ? parts[2] : parts[1]
    return { name: slugToTitle(title),   type: 'blog',        badge: 'Blog'       }
  }
  return { name: parts.map(slugToTitle).join(' › '), type: 'other', badge: 'Page' }
}

const PAGE_BADGE_STYLE: Record<string, string> = {
  home:       'bg-surface-muted text-ink-3',
  product:    'bg-surface-warm text-ink-2',
  collection: 'bg-surface-warm text-ink-2',
  page:       'bg-surface-warm text-ink-2',
  blog:       'bg-caution-bg text-caution',
  other:      'bg-surface-warm text-ink-3',
}

function exportCSV(analytics: ProxyAnalytics, rangeLabel: string) {
  const totalAiTraffic = (analytics.total_ai_visits ?? 0) + (analytics.ai_referral_visits ?? 0)
  const intel = buildPlatformIntel(analytics)
  const lines: string[] = []
  lines.push(`Alignment Visibility Analytics — ${analytics.domain}`)
  lines.push(`Period: ${rangeLabel}`)
  lines.push(`Generated: ${new Date().toISOString().slice(0, 10)}`)
  lines.push('')
  lines.push('## Summary')
  lines.push('Metric,Value')
  lines.push(`Total AI Traffic,${totalAiTraffic}`)
  lines.push(`AI Visits,${analytics.total_ai_visits ?? 0}`)
  lines.push(`AI Referral,${analytics.ai_referral_visits ?? 0}`)
  lines.push('')
  lines.push('## AI Platform Breakdown')
  lines.push('Platform,Crawls,Referrals,Total')
  for (const p of intel) {
    lines.push(`${p.name},${p.crawls},${p.referrals},${p.crawls + p.referrals}`)
  }
  lines.push('')
  lines.push('## Top Referral Landing Pages')
  lines.push('Page,Visits')
  for (const p of analytics.top_referral_landing_pages ?? []) {
    lines.push(`${p.path === '/' ? '/ (Homepage)' : p.path},${p.visit_count}`)
  }
  lines.push('')
  lines.push('## Daily Trend')
  lines.push('Date,AI Visits,AI Referrals,Total AI Traffic')
  for (const d of analytics.daily_trend ?? []) {
    lines.push(`${d.date},${d.ai_visits},${d.ai_referrals},${d.ai_visits + d.ai_referrals}`)
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `alignment-${analytics.domain}-${rangeLabel.replace(/[\s/]+/g, '-')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function buildSummaryText(analytics: ProxyAnalytics, rangeLabel: string): string {
  const totalAiTraffic = (analytics.total_ai_visits ?? 0) + (analytics.ai_referral_visits ?? 0)
  const intel = buildPlatformIntel(analytics)
  const platformLines = intel.slice(0, 5).map(p => {
    const parts: string[] = []
    if (p.crawls > 0) parts.push(`${p.crawls} crawls`)
    if (p.referrals > 0) parts.push(`${p.referrals} referrals`)
    return `  ${p.name}: ${parts.join(', ')}`
  })
  return [
    `Alignment Visibility Report — ${analytics.domain}`,
    `Period: ${rangeLabel}`,
    ``,
    `Total AI Traffic: ${totalAiTraffic.toLocaleString()}`,
    `AI Visits: ${(analytics.total_ai_visits ?? 0).toLocaleString()}`,
    `AI Referral: ${(analytics.ai_referral_visits ?? 0).toLocaleString()}`,
    ``,
    `Top Platforms:`,
    ...platformLines,
  ].join('\n')
}

// ── Analytics Tab ──────────────────────────────────────────────────────────


function AnalyticsTab({
  analytics, loading, days, onDaysChange, domain, domainId, userId,
}: {
  analytics: ProxyAnalytics | null
  loading: boolean
  days: number
  onDaysChange: (d: number) => void
  domain: ProxyDomain | null
  domainId: string
  userId: string
}) {
  const [copied, setCopied] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showExportMenu) return
    const handler = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) setShowExportMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showExportMenu])

  const rangeLabel = (() => {
    if (days === 1) return 'Last 24h'
    if (days === 0 && analytics?.date_range_days) {
      const since = new Date(Date.now() - analytics.date_range_days * 86400000)
      return `Since ${since.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    }
    return `Last ${days} days`
  })()

  const handleCopySummary = () => {
    if (!analytics) return
    navigator.clipboard.writeText(buildSummaryText(analytics, rangeLabel)).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-5 h-5 animate-spin text-ink-3" />
    </div>
  )

  // ── Sidebar (always visible) ───────────────────────────────
  const Sidebar = (
    <div className="space-y-4 w-full">
      <div className="bg-surface border border-divider-light rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-ink-2 mb-3">What These Numbers Mean</h3>
        <ul className="space-y-2.5 text-xs text-ink-3">
          <li><span className="font-medium text-ink-2">AI Visits</span> — AI platforms like ChatGPT, Claude, and Perplexity regularly scan your site&apos;s AI profile to learn your brand, products, and FAQ.</li>
          <li><span className="font-medium text-ink-2">AI Referral</span> — When an AI platform recommends your site and a real visitor clicks through, that counts as an AI referral.</li>
          <li>Numbers update in real time — more visits = more AI awareness of your brand.</li>
        </ul>
      </div>
      <div className="bg-surface border border-divider-light rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-ink-2 mb-3">Improve Your AI Discoverability</h3>
        <ul className="space-y-2 text-xs text-ink-3">
          <li className="flex gap-2"><span className="text-sage shrink-0">•</span>Add more FAQ pairs — direct answers increase AI citation frequency</li>
          <li className="flex gap-2"><span className="text-sage shrink-0">•</span>Keep Brand Story and Products up to date — AI platforms re-crawl regularly</li>
          <li className="flex gap-2"><span className="text-sage shrink-0">•</span>Add key metrics and awards — AI uses authoritative signals to recommend brands</li>
        </ul>
      </div>
    </div>
  )

  if (!analytics) return (
    <div className="flex gap-6">
      <div className="flex-1">
        <div className="bg-surface border border-dashed border-divider-light rounded-2xl p-12 text-center">
          <BarChart3 className="w-8 h-8 text-ink-3 mx-auto mb-3" />
          <p className="text-sm text-ink-3 font-medium">No analytics data yet</p>
          <p className="text-xs text-ink-3 mt-1">Most sites see their first AI crawl within 24–72 hours of completing setup.</p>
        </div>
      </div>
      <div className="w-64 shrink-0 hidden lg:block">{Sidebar}</div>
    </div>
  )

  // Merge Worker referrals (HTTP Referer) + SDK referrals (document.referrer)
  const workerReferrals = analytics.ai_referral_visits ?? 0
  const sdkReferrals = analytics.sdk_ai_referrals ?? 0
  const totalAiReferrals = workerReferrals + sdkReferrals
  const totalAiTraffic = (analytics.total_ai_visits ?? 0) + totalAiReferrals

  // Merge bots by canonical platform name to avoid duplicate bars
  // (e.g. GPTBot + OAI-Search both → "ChatGPT")
  const botCanonicalMap: Record<string, number> = {}
  analytics.by_bot
    .filter(b => b.bot_name !== 'UnknownBot')
    .forEach(b => {
      const canonical = getPlatformMeta(b.bot_name).name
      botCanonicalMap[canonical] = (botCanonicalMap[canonical] ?? 0) + b.visit_count
    })
  const mergedBotList = Object.entries(botCanonicalMap)
    .map(([name, visit_count]) => ({ name, visit_count }))
    .sort((a, b) => b.visit_count - a.visit_count)

  // Merge Worker + SDK referral sources by name, deduplicate
  const referralSourceMap: Record<string, number> = {}
  for (const s of (analytics.ai_referral_sources ?? [])) {
    referralSourceMap[s.source] = (referralSourceMap[s.source] ?? 0) + s.visit_count
  }
  for (const s of (analytics.sdk_referral_sources ?? [])) {
    referralSourceMap[s.source] = (referralSourceMap[s.source] ?? 0) + s.visit_count
  }
  const referralSources = Object.entries(referralSourceMap)
    .map(([source, visit_count]) => ({ source, visit_count }))
    .sort((a, b) => b.visit_count - a.visit_count)
  // Merge Worker landing pages (HTTP Referer) + SDK landing pages (document.referrer) by path
  const landingPageMap: Record<string, number> = {}
  for (const p of (analytics.top_referral_landing_pages ?? [])) {
    landingPageMap[p.path] = (landingPageMap[p.path] ?? 0) + p.visit_count
  }
  for (const p of (analytics.sdk_referral_landing_pages ?? [])) {
    landingPageMap[p.path] = (landingPageMap[p.path] ?? 0) + p.visit_count
  }
  const referralLandingPages = Object.entries(landingPageMap)
    .map(([path, visit_count]) => ({ path, visit_count }))
    .sort((a, b) => b.visit_count - a.visit_count)

  // AI Platform Intelligence: merge bots + referrals by canonical platform name
  const platformIntel = buildPlatformIntel(analytics)
  // "Other" row to reconcile with KPI totals
  const identifiedCrawls = platformIntel.reduce((s, p) => s + p.crawls, 0)
  const identifiedReferrals = platformIntel.reduce((s, p) => s + p.referrals, 0)
  const otherCrawls = (analytics.total_ai_visits ?? 0) - identifiedCrawls
  const otherReferrals = totalAiReferrals - identifiedReferrals

  return (
    <div className="flex gap-6 items-start">
      {/* ── Main content ── */}
      <div className="flex-1 min-w-0 space-y-4">

        {/* Time range selector + Export toolbar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1 bg-surface border border-divider-light rounded-xl p-1">
            {TIME_RANGES.map(r => (
              <button
                key={r.days}
                onClick={() => onDaysChange(r.days)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  days === r.days
                    ? 'bg-ink text-ink-inv shadow-sm'
                    : 'text-ink-3 hover:text-ink-2 hover:bg-surface-warm'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {days === 0 && analytics.date_range_days && (
              <span className="text-xs text-ink-3">{rangeLabel}</span>
            )}
            <button
              onClick={handleCopySummary}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-divider-light rounded-lg text-xs font-medium text-ink-2 hover:bg-surface-warm transition-all"
            >
              {copied ? <CheckCheck className="w-3.5 h-3.5 text-sage" /> : <FileText className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy Summary'}
            </button>
            <div className="relative" ref={exportMenuRef}>
              <button
                onClick={() => setShowExportMenu(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-divider-light rounded-lg text-xs font-medium text-ink-2 hover:bg-surface-warm transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                Export
                <ChevronRight className={`w-3 h-3 transition-transform ${showExportMenu ? 'rotate-90' : ''}`} />
              </button>
              {showExportMenu && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-surface border border-divider-light rounded-xl shadow-lg z-50 py-1">
                  <button
                    onClick={() => { exportCSV(analytics, rangeLabel); setShowExportMenu(false) }}
                    className="w-full text-left px-3 py-2 text-xs text-ink-2 hover:bg-surface-warm flex items-center gap-2"
                  >
                    <FileText className="w-3.5 h-3.5 text-ink-3" />
                    Summary Report (.csv)
                  </button>
                  <div className="border-t border-divider-light my-1" />
                  <div className="px-3 py-1 text-[10px] text-ink-3 font-semibold uppercase tracking-wider">Raw Data Export</div>
                  {[
                    { label: 'All AI Traffic', filter: 'all' },
                    { label: 'AI Visits Only', filter: 'ai_visit' },
                    { label: 'AI Referrals Only', filter: 'ai_referral' },
                  ].map(opt => (
                    <a
                      key={opt.filter}
                      href={proxyApi.exportAnalyticsCSV(domainId, userId, days, opt.filter)}
                      download
                      onClick={() => setShowExportMenu(false)}
                      className="w-full text-left px-3 py-2 text-xs text-ink-2 hover:bg-surface-warm flex items-center gap-2"
                    >
                      <Download className="w-3.5 h-3.5 text-ink-3" />
                      {opt.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row 1 — 3 KPI Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-surface border border-divider-light rounded-2xl p-4">
            <div className="text-xs text-ink-3 mb-1">TOTAL AI TRAFFIC</div>
            <div className="text-2xl font-bold text-ink">{totalAiTraffic.toLocaleString()}</div>
            <div className="text-xs text-ink-3 mt-0.5">bot visits + referrals</div>
          </div>
          <div className="bg-surface border border-divider-light rounded-2xl p-4">
            <div className="text-xs text-ink-3 mb-1">AI VISITS</div>
            <div className="text-2xl font-bold text-ink-2">
              {(analytics.total_ai_visits ?? 0).toLocaleString()}
            </div>
            <div className="text-xs text-ink-3 mt-0.5">AI crawlers read your profile</div>
          </div>
          <div className="bg-surface border border-divider-light rounded-2xl p-4">
            <div className="text-xs text-ink-3 mb-1">AI REFERRAL</div>
            <div className="text-2xl font-bold text-sage">
              {totalAiReferrals.toLocaleString()}
            </div>
            <div className="text-xs text-ink-3 mt-0.5">
              {referralSources.length > 0
                ? `from ${referralSources.slice(0, 2).map(s => `${s.source} (${s.visit_count})`).join(', ')}`
                : 'clicks from AI platforms'
              }
            </div>
          </div>
        </div>

        {/* Traffic Trend */}
        {(analytics.daily_trend ?? []).length > 1 && (() => {
          // Build CUMULATIVE chart data so the last point = KPI total
          // This eliminates confusion: "daily peak 123 ≠ KPI 330"
          // Cumulative: last point AI Bots = 310, Referrals = 20, Total = 330 ← matches KPI exactly
          let cumAiVisits = 0, cumReferrals = 0
          const chartData = (analytics.daily_trend ?? []).map(d => {
            cumAiVisits   += d.ai_visits
            cumReferrals  += d.ai_referrals
            return {
              date:         d.date,
              total:        cumAiVisits + cumReferrals,
              ai_visits:    cumAiVisits,
              ai_referrals: cumReferrals,
              // keep daily values for tooltip
              day_visits:   d.ai_visits,
              day_referrals: d.ai_referrals,
            }
          })
          const fmtD = (iso: string) =>
            new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          const firstDay = chartData[0]?.date
          const lastDay  = chartData[chartData.length - 1]?.date
          const chartSubtitle = firstDay && lastDay
            ? `${fmtD(firstDay)} – ${fmtD(lastDay)} · cumulative AI traffic`
            : rangeLabel.toLowerCase()
          return (
          <div className="bg-surface border border-divider-light rounded-2xl p-5">
            <div className="flex items-start justify-between mb-1">
              <h3 className="text-sm font-semibold text-ink-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-ink-3" />
                Traffic Trend
              </h3>
              <div className="text-right shrink-0">
                <div className="text-xs text-ink-3">Period total</div>
                <div className="text-sm font-bold text-ink">{totalAiTraffic.toLocaleString()}</div>
              </div>
            </div>
            <p className="text-xs text-ink-3 mb-3">{chartSubtitle}</p>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData} margin={{ top: 4, right: 32, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#2D2B27' }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#2D2B27' }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#4A7B5C' }} width={28} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  labelFormatter={(l: string) => `Date: ${l}`}
                  formatter={(value: number, name: string, props: { payload?: { day_visits?: number; day_referrals?: number } }) => {
                    const daily = name === 'AI Bots'
                      ? props.payload?.day_visits
                      : name === 'AI Referrals'
                        ? props.payload?.day_referrals
                        : undefined
                    const dailyStr = daily !== undefined ? ` (+${daily} today)` : ''
                    return [`${value.toLocaleString()}${dailyStr}`, name]
                  }}
                />
                <Line yAxisId="left" type="monotone" dataKey="total" stroke="#9E9484" strokeWidth={1.5} dot={false} name="Total" />
                <Line yAxisId="left" type="monotone" dataKey="ai_visits" stroke="#000000" strokeWidth={2} dot={false} name="AI Bots" />
                <Line yAxisId="right" type="monotone" dataKey="ai_referrals" stroke="#4A7B5C" strokeWidth={2} dot={false} name="AI Referrals" />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-2 justify-end">
              <span className="flex items-center gap-1 text-xs text-ink-3"><span className="w-3 h-0.5 bg-surface-muted inline-block" />Total</span>
              <span className="flex items-center gap-1 text-xs text-ink-2"><span className="w-3 h-0.5 bg-ink inline-block" />AI Bots</span>
              <span className="flex items-center gap-1 text-xs text-sage"><span className="w-3 h-0.5 bg-sage inline-block" />AI Referrals (right axis)</span>
            </div>
          </div>
          )
        })()}

        {/* AI Platforms Reading Your Store */}
        <div className="bg-surface border border-divider-light rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-ink-2 mb-1 flex items-center gap-2">
            <Bot className="w-4 h-4 text-ink-3" />
            AI Platforms Reading Your Store
          </h3>
          <p className="text-xs text-ink-3 mb-3">AI platforms that scanned your site&apos;s AI profile — {rangeLabel.toLowerCase()}.</p>
          {mergedBotList.length === 0 ? (
            <p className="text-xs text-ink-3">Data appears once AI bots start visiting your site. Most sites see their first crawl within 24–72 hours of completing setup.</p>
          ) : (
            <div className="space-y-2.5">
              {mergedBotList.map(bot => {
                // canonical name IS the display name; look it up for the favicon domain
                const meta = getPlatformMeta(bot.name)
                const total = analytics.total_ai_visits > 0 ? analytics.total_ai_visits : 1
                const pct = Math.round((bot.visit_count / total) * 100)
                return (
                  <div key={bot.name} className="flex items-center gap-3">
                    <div className="flex items-center gap-2 w-32 shrink-0">
                      <PlatformLogo id={bot.name} size={16} />
                      <span className="text-xs font-medium text-ink-2 truncate">{bot.name}</span>
                    </div>
                    <div className="flex-1 h-2 bg-surface-muted rounded-full overflow-hidden">
                      <div className="h-full bg-ink/70 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="text-xs text-ink-3 w-8 text-right">{bot.visit_count}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* AI Platforms Sending You Traffic */}
        <div className="bg-surface border border-divider-light rounded-2xl p-5">
          <div className="flex items-start justify-between mb-1">
            <h3 className="text-sm font-semibold text-ink-2 flex items-center gap-2">
              <Activity className="w-4 h-4 text-ink-3" />
              AI Platforms Sending You Traffic
            </h3>
            <span className="text-xs bg-surface-muted text-ink-2 px-2 py-0.5 rounded-full font-medium">
              Total AI referrals — {rangeLabel.toLowerCase()}: {totalAiReferrals.toLocaleString()}
            </span>
          </div>
          <p className="text-xs text-ink-3 mb-3">Visitors who arrived at your site after an AI platform recommended you.</p>
          {referralSources.length === 0 ? (
            <p className="text-xs text-ink-3">Referral data appears once AI platforms start sending visitors to your site. This typically follows after bots have indexed your brand profile.</p>
          ) : (
            <div className="space-y-2.5">
              {referralSources.map(src => {
                const meta = getPlatformMeta(src.source)
                const total = totalAiReferrals || 1
                const pct = Math.round((src.visit_count / total) * 100)
                return (
                  <div key={src.source} className="flex items-center gap-3">
                    <div className="flex items-center gap-2 w-32 shrink-0">
                      <PlatformLogo id={src.source} size={16} />
                      <span className="text-xs font-medium text-ink-2 truncate">{meta.name}</span>
                    </div>
                    <div className="flex-1 h-2 bg-surface-muted rounded-full overflow-hidden">
                      <div className="h-full bg-sage rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="text-xs text-ink-3 w-8 text-right">{src.visit_count}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Global AI Traffic Distribution — ECharts World Map */}
        <EChartsWorldMap geoData={analytics.geo_distribution ?? []} />

        {/* Top Landing Pages from AI Traffic */}
        <div className="bg-surface border border-divider-light rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-ink-2 mb-1">Top Landing Pages from AI Traffic</h3>
          <p className="text-xs text-ink-3 mb-4">Which pages AI bots read and where human visitors land after clicking AI recommendations — {rangeLabel.toLowerCase()}.</p>
          <div className="grid grid-cols-2 gap-5">

            {/* Left: AI VISITS — actual pages bots crawled */}
            <div>
              <div className="flex items-center gap-1.5 mb-3">
                <span className="w-2 h-2 rounded-full bg-ink/70 shrink-0" />
                <span className="text-xs font-bold text-ink-2 uppercase tracking-wide">AI Visits</span>
                <span className="text-xs text-ink-3">— AI bots read</span>
              </div>
              {(() => {
                const pages = (analytics.by_path ?? [])
                  .filter(p => isHumanPagePath(p.path))
                  .slice(0, 8)
                const displayedSum = pages.reduce((s, p) => s + p.visit_count, 0)
                const totalAiVisits = analytics.total_ai_visits ?? 0
                const otherCount = totalAiVisits - displayedSum
                if (pages.length === 0 && otherCount <= 0) return (
                  <p className="text-xs text-ink-3 italic">No page crawl data yet.</p>
                )
                return (
                  <div className="space-y-2">
                    {pages.map(p => {
                      const info = pathToPageInfo(p.path)
                      return (
                        <div key={p.path} className="flex items-center gap-2">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${PAGE_BADGE_STYLE[info.type]}`}>
                            {info.badge}
                          </span>
                          <span className="text-xs text-ink-2 truncate flex-1" title={info.name}>{info.name}</span>
                          <span className="text-xs font-bold text-ink-2 shrink-0 tabular-nums">{p.visit_count.toLocaleString()}</span>
                        </div>
                      )
                    })}
                    {otherCount > 0 && (
                      <div className="flex items-center gap-2 pt-1 border-t border-divider-light">
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 bg-surface-warm text-ink-3">Discovery</span>
                        <span
                          className="text-xs text-ink-3 truncate flex-1 cursor-help underline decoration-dotted decoration-ink-3/50"
                          title="AI bots read your discovery files. This is your Alignment GEO optimization working — AI platforms have found your optimization artifacts."
                        >
                          AI Discovery Files
                        </span>
                        <span className="text-xs font-bold text-ink-3 shrink-0 tabular-nums">{otherCount.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>

            {/* Right: AI REFERRALS — pages where humans from AI platforms landed */}
            <div>
              <div className="flex items-center gap-1.5 mb-3">
                <span className="w-2 h-2 rounded-full bg-sage shrink-0" />
                <span className="text-xs font-bold text-sage uppercase tracking-wide">AI Referrals</span>
                <span className="text-xs text-ink-3">— humans landed</span>
              </div>
              {(() => {
                const pages = referralLandingPages.slice(0, 8)
                const displayedSum = pages.reduce((s, p) => s + p.visit_count, 0)
                const totalReferrals = totalAiReferrals
                const otherCount = totalReferrals - displayedSum
                if (pages.length === 0 && otherCount <= 0) return (
                  <p className="text-xs text-ink-3 italic">Appears once AI platforms send visitors.</p>
                )
                return (
                  <div className="space-y-2">
                    {pages.map(p => {
                      const info = pathToPageInfo(p.path)
                      return (
                        <div key={p.path} className="flex items-center gap-2">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${PAGE_BADGE_STYLE[info.type]}`}>
                            {info.badge}
                          </span>
                          <span className="text-xs text-ink-2 truncate flex-1" title={info.name}>{info.name}</span>
                          <span className="text-xs font-bold text-sage shrink-0 tabular-nums">{p.visit_count.toLocaleString()}</span>
                        </div>
                      )
                    })}
                    {otherCount > 0 && (
                      <div className="flex items-center gap-2 pt-1 border-t border-divider-light">
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 bg-surface-warm text-ink-3">Other</span>
                        <span className="text-xs text-ink-3 truncate flex-1">Other pages</span>
                        <span className="text-xs font-bold text-ink-3 shrink-0 tabular-nums">{otherCount.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          </div>
        </div>

        {/* AI Platform Intelligence */}
        <div className="bg-surface border border-divider-light rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-ink-2 mb-1 flex items-center gap-2">
            <Zap className="w-4 h-4 text-ink-3" />
            AI Platform Intelligence
          </h3>
          <p className="text-xs text-ink-3 mb-3">How each AI platform interacts with your site — {rangeLabel.toLowerCase()}.</p>
          {platformIntel.length === 0 ? (
            <p className="text-xs text-ink-3">Platform intelligence appears once AI bots start visiting your site.</p>
          ) : (
            <div className="space-y-1">
              <div className="grid grid-cols-3 text-xs text-ink-3 font-medium pb-2 border-b border-divider-light">
                <span>Platform</span>
                <span className="text-center">Crawls</span>
                <span className="text-center">Referrals</span>
              </div>
              {platformIntel.map(p => {
                const meta = getPlatformMeta(p.name)
                return (
                  <div key={p.name} className="grid grid-cols-3 text-xs py-2 border-b border-divider-light items-center">
                    <div className="flex items-center gap-2">
                      <PlatformLogo id={p.name} size={14} />
                      <span className="font-medium text-ink-2 truncate">{meta.name}</span>
                    </div>
                    <span className="text-center text-ink-2 font-medium">{p.crawls > 0 ? p.crawls.toLocaleString() : '—'}</span>
                    <span className="text-center text-sage font-medium">{p.referrals > 0 ? p.referrals.toLocaleString() : '—'}</span>
                  </div>
                )
              })}
              {(otherCrawls > 0 || otherReferrals > 0) && (
                <div className="grid grid-cols-3 text-xs py-2 items-center">
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full bg-surface-warm border border-divider-light flex items-center justify-center text-[8px] text-ink-3 shrink-0">?</span>
                    <span className="font-medium text-ink-3 truncate">Other</span>
                  </div>
                  <span className="text-center text-ink-3 font-medium">{otherCrawls > 0 ? otherCrawls.toLocaleString() : '—'}</span>
                  <span className="text-center text-ink-3 font-medium">{otherReferrals > 0 ? otherReferrals.toLocaleString() : '—'}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Data source badge */}
        <div className="text-right">
          <span className="text-xs text-ink-3">
            Source: {analytics.data_source === 'analytics_engine' ? 'Cloudflare Analytics Engine' : 'Supabase (fallback)'}
          </span>
        </div>
      </div>

      {/* ── Right sidebar ── */}
      <div className="w-64 shrink-0 hidden lg:block">{Sidebar}</div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DomainDetailClient() {
  const params = useParams()
  const { user } = useAuth()

  // In static export mode the Cloudflare Worker serves placeholder/index.html
  // for ALL UUID paths (pathname = …/placeholder). Resolve the real domain ID
  // with three fallbacks in priority order:
  //   1. ?id= query param  — set by navigation Links from the domain list
  //   2. UUID from pathname — works when user loads the canonical UUID URL directly
  //   3. params.id         — fallback (may be 'placeholder' in static export)
  const rawId = params.id as string
  const domainId = (() => {
    if (typeof window === 'undefined') return rawId
    const qp = new URLSearchParams(window.location.search).get('id')
    if (qp) return qp
    const match = window.location.pathname.match(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
    )
    return match ? match[0] : rawId
  })()

  // Read prefill params injected by add/page.tsx "View Domain" link (?domain=&origin=&status=&fresh=1).
  // When present, render the page immediately without a spinner and fetch real data silently in background.
  const prefillDomain = (() => {
    if (typeof window === 'undefined') return null
    const sp = new URLSearchParams(window.location.search)
    const d = sp.get('domain')
    if (!d || !sp.get('fresh')) return null
    return {
      id: domainId,
      user_id: '',
      domain: d,
      origin_url: sp.get('origin') ?? `https://${d}`,
      status: (sp.get('status') ?? 'pending') as ProxyDomainStatus['status'],
      strip_noindex: true,
      bypass_paywall: false,
      inject_canonical: true,
      prerender_csr: false,
      robots_allow_all_ai: true,
      custom_robots_rules: '',
      date_modified_auto: true,
      created_at: new Date().toISOString(),
    } as ProxyDomain
  })()

  const [domain, setDomain] = useState<ProxyDomain | null>(prefillDomain)
  const [status, setStatus] = useState<ProxyDomainStatus | null>(null)
  const [analytics, setAnalytics] = useState<ProxyAnalytics | null>(null)
  // Skip the full-page spinner when prefill is available — real data loads silently in background
  const [loading, setLoading] = useState(prefillDomain === null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [refreshingStatus, setRefreshingStatus] = useState(false)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [analyticsDays, setAnalyticsDays] = useState(30)  // 0=all time, 1=today, 7, 30
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [lastSynced, setLastSynced] = useState<string | null>(null)

  // Load last synced timestamp from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem(`proxy_last_synced_${domainId}`)
    if (stored) setLastSynced(stored)
  }, [domainId])

  const loadDomain = useCallback(async (silent = false) => {
    if (!user?.id) return
    if (!silent) setLoading(true)
    setError(null)
    try {
      const [d, s] = await Promise.all([
        proxyApi.getDomain(domainId, user.id),
        proxyApi.getDomainStatus(domainId, user.id),
      ])
      setDomain(d)
      setStatus(s)
    } catch (e) {
      // Surface errors only on hard loads; ignore transient failures during silent refresh
      if (!silent) setError(e instanceof Error ? e.message : 'Failed to load domain')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [domainId, user?.id])

  const loadAnalytics = useCallback(async (days: number = analyticsDays) => {
    if (!user?.id) return
    setAnalyticsLoading(true)
    try {
      const a = await proxyApi.getAnalytics(domainId, user.id, days)
      setAnalytics(a)
    } catch { /* ignore */ }
    finally { setAnalyticsLoading(false) }
  }, [domainId, user?.id, analyticsDays])

  // If prefill is present, load real data silently in background (no spinner).
  // Otherwise do a normal load with spinner.
  useEffect(() => { loadDomain(prefillDomain !== null) }, [loadDomain])

  useEffect(() => {
    if (activeTab === 'analytics') loadAnalytics()
  }, [activeTab, loadAnalytics])

  // Re-fetch when time range changes (only if tab is already active)
  useEffect(() => {
    if (activeTab === 'analytics') loadAnalytics(analyticsDays)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analyticsDays])

  const refreshStatus = async () => {
    if (!user?.id) return
    setRefreshingStatus(true)
    try {
      const s = await proxyApi.getDomainStatus(domainId, user.id)
      setStatus(s)
      const d = await proxyApi.getDomain(domainId, user.id)
      setDomain(d)
    } catch { /* ignore */ }
    finally { setRefreshingStatus(false) }
  }

  const handleSync = async () => {
    if (!user?.id) return
    setSyncing(true)
    setSyncResult(null)
    try {
      const result = await proxyApi.sync(domainId, user.id)
      setSyncResult(result.message)
      const now = new Date().toISOString()
      setLastSynced(now)
      if (typeof window !== 'undefined') {
        localStorage.setItem(`proxy_last_synced_${domainId}`, now)
      }
    } catch (e) {
      setSyncResult(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  // Auth must be ready before rendering (user!.id is used in child components).
  // This guard is very brief (~100ms from localStorage) even on the prefill fast-path.
  if (loading || !user) return (
    <div className="min-h-screen bg-canvas flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-ink-3" />
    </div>
  )

  if (error || !domain) return (
    <div className="min-h-screen bg-canvas p-8">
      <div className="max-w-xl mx-auto bg-red-soft-bg border border-red-soft/20 rounded-2xl p-6 flex gap-3">
        <AlertCircle className="w-5 h-5 text-red-soft flex-shrink-0 mt-0.5" />
        <div>
          <div className="text-sm font-semibold text-red-soft">Failed to load domain</div>
          <div className="text-sm text-red-soft mt-1">{error}</div>
          <Link href="/dashboard/visibility-proxy" className="text-xs text-red-soft hover:underline mt-2 inline-block">← Back to domains</Link>
        </div>
      </div>
    </div>
  )

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'overview',  label: 'Overview',  icon: Settings },
    { key: 'assets',    label: 'Brand Data', icon: Layers },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
    { key: 'sdk',       label: 'SDK Mode',   icon: Zap },
  ]

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <div className="bg-surface border-b border-divider-light px-8 py-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/visibility-proxy" className="text-ink-3 hover:text-ink-2 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-red-soft-bg flex items-center justify-center">
            <Globe className="w-5 h-5 text-red-soft" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-ink">{domain.domain}</h1>
            <p className="text-sm text-ink-3">{domain.origin_url}</p>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-4xl mx-auto">
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-surface border border-divider-light rounded-xl p-1 mb-6">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 flex-1 justify-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-ink text-ink-inv shadow-sm'
                    : 'text-ink-3 hover:text-ink-2 hover:bg-surface-warm'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        {activeTab === 'overview' && (
          <OverviewTab
            domain={domain}
            status={status}
            onRefreshStatus={refreshStatus}
            refreshingStatus={refreshingStatus}
            onSync={handleSync}
            syncing={syncing}
            syncResult={syncResult}
            lastSynced={lastSynced}
            userId={user!.id}
            onDomainUpdate={setDomain}
          />
        )}
        {activeTab === 'assets' && (
          <BrandDataTab domainId={domainId} />
        )}
        {activeTab === 'analytics' && (
          <AnalyticsTab
            analytics={analytics}
            loading={analyticsLoading}
            days={analyticsDays}
            onDaysChange={setAnalyticsDays}
            domain={domain}
            domainId={domainId}
            userId={user?.id ?? ''}
          />
        )}
        {activeTab === 'sdk' && (
          <SdkAdminTab
            domain={domain}
            userId={user?.id ?? ''}
          />
        )}
      </div>
    </div>
  )
}
