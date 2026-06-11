'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getSupabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import {
  User, Mail, Lock, CreditCard, AlertTriangle,
  CheckCircle2, AlertCircle, Loader2, ExternalLink,
  Save, Send, RefreshCw, Key, Copy, Trash2, Plus,
  Globe, ShieldCheck, ShieldAlert, Link2, Unlink,
  ChevronDown, ChevronUp, Eye, EyeOff,
} from 'lucide-react'
import { mcpApi, type MCPToken, type MCPTokenCreated } from '@/lib/api'
import {
  connectionsApi,
  type WebsiteConnection,
  type ConnectionPlatform,
  type CreateConnectionRequest,
  type TestConnectionRequest,
  type ConnectionTestResult,
} from '@/lib/api'

// ─── Platform meta ────────────────────────────────────────────────────────────
const PLATFORM_META: Record<ConnectionPlatform, {
  label: string; color: string; docsUrl: string; tokenLabel: string; tokenDesc: string; placeholder: string
}> = {
  shopify: {
    label: 'Shopify', color: 'text-sage bg-sage-bg border-sage/30',
    docsUrl: 'https://help.shopify.com/en/manual/apps/app-types/custom-apps',
    tokenLabel: 'Admin API Access Token',
    tokenDesc: 'Go to Shopify Admin → Settings → Apps → Develop apps → Create app → API credentials',
    placeholder: 'shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  },
  wordpress: {
    label: 'WordPress', color: 'text-ink-2 bg-surface-warm border-divider',
    docsUrl: 'https://make.wordpress.org/core/2020/11/05/application-passwords-integration-guide/',
    tokenLabel: 'Application Password',
    tokenDesc: 'Go to WordPress Admin → Users → Your Profile → Application Passwords',
    placeholder: 'xxxx xxxx xxxx xxxx xxxx xxxx',
  },
  github: {
    label: 'GitHub', color: 'text-ink-2 bg-surface-warm border-divider',
    docsUrl: 'https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens',
    tokenLabel: 'Personal Access Token',
    tokenDesc: 'Go to GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens (repo scope)',
    placeholder: 'github_pat_xxxx...',
  },
  custom: {
    label: 'Custom', color: 'text-ink-2 bg-surface-warm border-divider',
    docsUrl: '',
    tokenLabel: 'API Key (optional)',
    tokenDesc: 'Optional. Sent as X-Api-Key and Authorization: Bearer headers.',
    placeholder: 'your-api-key',
  },
}

// ─── Website Connections Section ───────────────────────────────────────────────
function WebsiteConnectionsSection({ userId }: { userId: string }) {
  const [connections, setConnections] = useState<WebsiteConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [platform, setPlatform] = useState<ConnectionPlatform>('shopify')
  const [siteUrl, setSiteUrl] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [scope, setScope] = useState<'read_only' | 'read_write'>('read_only')
  // Credentials
  const [shopifyToken, setShopifyToken] = useState('')
  const [wpUser, setWpUser] = useState('')
  const [wpPass, setWpPass] = useState('')
  const [ghToken, setGhToken] = useState('')
  const [ghRepo, setGhRepo] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [apiEndpoint, setApiEndpoint] = useState('')
  // State
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showToken, setShowToken] = useState(false)
  const [reVerifying, setReVerifying] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)

  const meta = PLATFORM_META[platform]

  useEffect(() => {
    connectionsApi.list(userId)
      .then(setConnections)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userId])

  const buildRequest = (): CreateConnectionRequest => ({
    platform,
    site_url: siteUrl,
    display_name: displayName || undefined,
    scope,
    shopify_access_token: platform === 'shopify' ? shopifyToken : undefined,
    wp_username: platform === 'wordpress' ? wpUser : undefined,
    wp_app_password: platform === 'wordpress' ? wpPass : undefined,
    github_token: platform === 'github' ? ghToken : undefined,
    github_repo: platform === 'github' ? ghRepo : undefined,
    api_key: platform === 'custom' ? apiKey : undefined,
    api_endpoint: platform === 'custom' ? apiEndpoint : undefined,
  })

  const handleTest = async () => {
    setTesting(true); setTestResult(null); setError(null)
    try {
      const req = buildRequest() as TestConnectionRequest
      const result = await connectionsApi.test(req)
      setTestResult(result)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Test failed')
    } finally { setTesting(false) }
  }

  const handleSave = async () => {
    setSaving(true); setError(null)
    try {
      const conn = await connectionsApi.create(buildRequest(), userId)
      setConnections(prev => [conn, ...prev])
      setShowForm(false)
      resetForm()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally { setSaving(false) }
  }

  const handleReverify = async (id: string) => {
    setReVerifying(id)
    try {
      const updated = await connectionsApi.reverify(id, userId)
      setConnections(prev => prev.map(c => c.id === id ? updated : c))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Re-verify failed')
    } finally { setReVerifying(null) }
  }

  const handleRemove = async (id: string) => {
    if (!confirm('Remove this website connection?')) return
    setRemoving(id)
    try {
      await connectionsApi.remove(id, userId)
      setConnections(prev => prev.filter(c => c.id !== id))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Remove failed')
    } finally { setRemoving(null) }
  }

  const resetForm = () => {
    setSiteUrl(''); setDisplayName(''); setShopifyToken(''); setWpUser('')
    setWpPass(''); setGhToken(''); setGhRepo(''); setApiKey(''); setApiEndpoint('')
    setTestResult(null); setError(null); setScope('read_only')
  }

  const statusDot = (status: WebsiteConnection['status']) =>
    status === 'connected' ? '🟢' : status === 'error' ? '🔴' : '⏳'

  return (
    <div className="space-y-4">
      {/* Existing connections */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-ink-3">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading connections...
        </div>
      ) : connections.length > 0 ? (
        <div className="space-y-2">
          {connections.map(conn => {
            const m = PLATFORM_META[conn.platform]
            return (
              <div key={conn.id} className={`border rounded-xl px-4 py-3.5 ${m.color}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Globe className="w-4 h-4 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {statusDot(conn.status)} {conn.display_name || conn.site_url}
                      </p>
                      <p className="text-[10px] opacity-70 truncate">
                        {m.label} · {conn.scope === 'read_write' ? 'Read + Write' : 'Read Only'} · {conn.site_url}
                      </p>
                      {conn.status_message && (
                        <p className="text-[10px] opacity-60 mt-0.5">{conn.status_message}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {conn.token_preview && (
                      <span className="text-[10px] font-mono opacity-50 hidden sm:block">{conn.token_preview}</span>
                    )}
                    <button
                      onClick={() => handleReverify(conn.id)}
                      disabled={reVerifying === conn.id}
                      className="p-1.5 rounded-lg hover:bg-white/50 transition-colors"
                      title="Re-verify connection"
                    >
                      {reVerifying === conn.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <RefreshCw className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleRemove(conn.id)}
                      disabled={removing === conn.id}
                      className="p-1.5 rounded-lg hover:bg-red-soft-bg text-red-soft transition-colors"
                      title="Remove connection"
                    >
                      {removing === conn.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Unlink className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-sm text-ink-3">No website connections yet. Add one below.</p>
      )}

      {/* Add connection button / form */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-surface-warm hover:bg-surface-muted border border-dashed border-divider text-ink-2 text-sm font-medium rounded-xl transition-colors w-full justify-center"
        >
          <Plus className="w-4 h-4" /> Connect a Website
        </button>
      ) : (
        <div className="border border-divider-light rounded-2xl p-5 space-y-4 bg-surface-warm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-ink">New Website Connection</p>
            <button onClick={() => { setShowForm(false); resetForm() }} className="text-ink-3 hover:text-ink-2">✕</button>
          </div>

          {/* Platform selector */}
          <div>
            <label className="block text-xs font-medium text-ink-2 mb-1.5">Platform</label>
            <div className="grid grid-cols-4 gap-2">
              {(['shopify', 'wordpress', 'github', 'custom'] as ConnectionPlatform[]).map(p => (
                <button
                  key={p}
                  onClick={() => { setPlatform(p); setTestResult(null) }}
                  className={`py-2 rounded-xl border text-xs font-semibold transition-all ${
                    platform === p
                      ? PLATFORM_META[p].color + ' border-current'
                      : 'bg-surface border-divider-light text-ink-3 hover:border-divider'
                  }`}
                >
                  {PLATFORM_META[p].label}
                </button>
              ))}
            </div>
          </div>

          {/* Site URL */}
          <div>
            <label className="block text-xs font-medium text-ink-2 mb-1.5">
              {platform === 'github' ? 'GitHub Repository' : 'Site URL'}
            </label>
            <input
              value={platform === 'github' ? ghRepo : siteUrl}
              onChange={e => platform === 'github' ? setGhRepo(e.target.value) : setSiteUrl(e.target.value)}
              placeholder={platform === 'github' ? 'owner/repo or https://github.com/owner/repo' : 'https://yourstore.myshopify.com'}
              className="w-full px-3.5 py-2.5 bg-surface border border-divider rounded-xl text-sm focus:ring-2 focus:ring-ink/10 focus:border-ink outline-none"
            />
          </div>

          {/* WordPress: username field */}
          {platform === 'wordpress' && (
            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1.5">WordPress Username</label>
              <input
                value={wpUser}
                onChange={e => setWpUser(e.target.value)}
                placeholder="admin"
                className="w-full px-3.5 py-2.5 bg-surface border border-divider rounded-xl text-sm outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"
              />
            </div>
          )}

          {/* Token / credential field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-ink-2">{meta.tokenLabel}</label>
              <a href={meta.docsUrl} target="_blank" rel="noopener noreferrer"
                className="text-[10px] text-ink-2 hover:underline flex items-center gap-0.5">
                <ExternalLink className="w-3 h-3" /> How to get it
              </a>
            </div>
            <p className="text-[10px] text-ink-3 mb-1.5">{meta.tokenDesc}</p>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={
                  platform === 'shopify' ? shopifyToken :
                  platform === 'wordpress' ? wpPass :
                  platform === 'github' ? ghToken :
                  apiKey
                }
                onChange={e => {
                  const v = e.target.value
                  if (platform === 'shopify') setShopifyToken(v)
                  else if (platform === 'wordpress') setWpPass(v)
                  else if (platform === 'github') setGhToken(v)
                  else setApiKey(v)
                }}
                placeholder={meta.placeholder}
                className="w-full px-3.5 py-2.5 pr-10 bg-surface border border-divider rounded-xl text-sm outline-none focus:border-ink focus:ring-2 focus:ring-ink/10 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink-2"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Custom: API endpoint */}
          {platform === 'custom' && (
            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1.5">Verification Endpoint (optional)</label>
              <input
                value={apiEndpoint}
                onChange={e => setApiEndpoint(e.target.value)}
                placeholder="https://api.yoursite.com/status"
                className="w-full px-3.5 py-2.5 bg-surface border border-divider rounded-xl text-sm outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"
              />
            </div>
          )}

          {/* Display name + scope */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1.5">Display Name (optional)</label>
              <input
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="My Shopify Store"
                className="w-full px-3.5 py-2.5 bg-surface border border-divider rounded-xl text-sm outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1.5">Permission Scope</label>
              <select
                value={scope}
                onChange={e => setScope(e.target.value as 'read_only' | 'read_write')}
                className="w-full px-3.5 py-2.5 bg-surface border border-divider rounded-xl text-sm outline-none focus:border-ink"
              >
                <option value="read_only">Read Only (safe)</option>
                <option value="read_write">Read + Write (fixes)</option>
              </select>
            </div>
          </div>

          {/* Test result */}
          {testResult && (
            <div className={`p-3 rounded-xl border text-xs ${
              testResult.success
                ? 'bg-sage-bg border-sage/30 text-sage'
                : 'bg-red-soft-bg border-red-soft/30 text-red-soft'
            }`}>
              <p className="font-semibold mb-1">{testResult.success ? '✅ Connection verified' : '❌ Verification failed'}</p>
              <p>{testResult.status_message}</p>
              {testResult.detected_info?.shop_name && <p className="mt-1 opacity-70">Shop: {testResult.detected_info.shop_name}</p>}
              {testResult.detected_info?.platform_version && <p className="mt-0.5 opacity-70">{testResult.detected_info.platform_version}</p>}
              {testResult.scope_warnings.length > 0 && (
                <div className="mt-2 pt-2 border-t border-current/20 space-y-1">
                  {testResult.scope_warnings.map((w, i) => <p key={i} className="opacity-80">⚠️ {w}</p>)}
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-red-soft-bg border border-red-soft/30 text-red-soft text-xs">{error}</div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleTest}
              disabled={testing}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-surface border border-divider text-ink-2 text-sm font-medium rounded-xl hover:bg-surface-warm disabled:opacity-50 transition-colors"
            >
              {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              Test Connection
            </button>
            <button
              onClick={handleSave}
              disabled={saving || (!testResult?.success && !confirm)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-ink hover:bg-[#2d2d2c] text-ink-inv text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
              Save Connection
            </button>
          </div>
          <p className="text-[10px] text-ink-3">
            Credentials are stored encrypted server-side. Token previews (first 8 + last 4 chars) are shown for identification only.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Section Card ──────────────────────────────────────────────────────────────
function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-surface rounded-2xl border border-divider-light overflow-hidden">
      <div className="px-6 py-5 border-b border-divider-light">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-surface-warm border border-divider-light flex items-center justify-center">
            <Icon className="w-4 h-4 text-ink-2" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-ink">{title}</h2>
            <p className="text-xs text-ink-3 mt-0.5">{description}</p>
          </div>
        </div>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  )
}

// ─── Feedback Banner ───────────────────────────────────────────────────────────
function Feedback({ type, message }: { type: 'success' | 'error'; message: string }) {
  return (
    <div className={`flex items-start gap-2.5 p-3 rounded-xl text-sm mt-3 ${
      type === 'success'
        ? 'bg-sage-bg border border-sage/20 text-sage'
        : 'bg-red-soft-bg border border-red-soft/20 text-red-soft'
    }`}>
      {type === 'success'
        ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
        : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
      <p>{message}</p>
    </div>
  )
}

// ─── Plan display helper ───────────────────────────────────────────────────────
const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter',
  standard: 'Standard',
  pro: 'Pro',
  growth: 'Standard',
  enterprise: 'Enterprise',
}
const STATUS_STYLES: Record<string, string> = {
  active: 'bg-sage-bg text-sage border-sage/30',
  trialing: 'bg-surface-muted text-ink-2 border-divider',
  past_due: 'bg-red-soft-bg text-red-soft border-red-soft/30',
  canceled: 'bg-surface-muted text-ink-3 border-divider-light',
  paused: 'bg-caution-bg text-caution border-caution/30',
  incomplete: 'bg-caution-bg text-caution border-caution/30',
}
const MODULE_LABELS: Record<string, string> = {
  explore: 'Explore',
  ai_research: 'AI Research',
  shopping: 'Shopping',
  monitoring: 'Monitoring',
  analysis: 'Analysis',
  web_infrastructure: 'Web Infrastructure',
  brand_hub: 'Brand Hub',
  visibility_proxy: 'Visibility Proxy',
  ga4_attribution: 'GA4 Attribution',
  mcp_integration: 'MCP Integration',
}
const PLATFORM_LABELS: Record<string, string> = {
  chatgpt: 'ChatGPT',
  perplexity: 'Perplexity',
  ai_overviews: 'AI Overviews',
  gemini: 'Gemini',
  claude: 'Claude',
  grok: 'Grok',
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function formatLimit(value: number | undefined | null, fallback = '—') {
  if (value === -1) return 'Unlimited'
  if (typeof value !== 'number') return fallback
  return value.toLocaleString()
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user, session, resetPassword, role } = useAuth()

  // Profile
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileFeedback, setProfileFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  // Email
  const [newEmail, setNewEmail] = useState('')
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailFeedback, setEmailFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  // Password
  const [passwordSending, setPasswordSending] = useState(false)
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  // MCP Tokens (all paid users)
  const [mcpTokens, setMcpTokens] = useState<MCPToken[]>([])
  const [mcpLoading, setMcpLoading] = useState(false)
  const [mcpCreating, setMcpCreating] = useState(false)
  const [mcpNewLabel, setMcpNewLabel] = useState('')
  const [mcpFeedback, setMcpFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [mcpCreatedToken, setMcpCreatedToken] = useState<MCPTokenCreated | null>(null)

  // Subscription
  const [subLoading, setSubLoading] = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)
  const [subscription, setSubscription] = useState<{
    plan: string; status: string; billing_interval: string;
    trial_ends_at: string | null; current_period_end: string | null;
    cancel_at_period_end: boolean;
    limits?: {
      credits_per_month: number;
      team_seats: number;
      brands_allowed: number;
      prompts_tracked_daily: number;
      platforms_allowed: string[];
      modules_allowed: string[];
      api_access: boolean;
      mcp_integration: boolean;
      custom_reports: boolean;
    };
  } | null>(null)
  const [credits, setCredits] = useState<{
    credits_used: number;
    credits_limit: number;
    credits_bonus: number;
    credits_total: number;
    credits_remaining: number;
  } | null>(null)

  // Populate profile fields from user metadata
  useEffect(() => {
    if (user) {
      setFullName(user.user_metadata?.full_name || '')
      setCompanyName(user.user_metadata?.company_name || '')
    }
  }, [user])

  // Fetch subscription (skip for admin/demo)
  useEffect(() => {
    if (!user?.id || role === 'admin' || role === 'demo') {
      setSubLoading(false)
      return
    }
    Promise.all([api.getSubscription(user.id), api.getCredits(user.id)]).then(([subRes, creditRes]) => {
      if (subRes.data?.subscription) setSubscription(subRes.data.subscription as typeof subscription)
      setCredits(creditRes.data ?? null)
      setSubLoading(false)
    }).catch(() => setSubLoading(false))
  }, [user?.id, role])

  const mcpAllowed =
    role === 'admin' ||
    role === 'staff' ||
    role === 'demo' ||
    subscription?.limits?.mcp_integration === true ||
    subscription?.plan === 'pro' ||
    subscription?.plan === 'enterprise'

  // Fetch MCP tokens — all authenticated users can manage their own tokens
  useEffect(() => {
    if (!session?.access_token || role === 'demo') return
    setMcpLoading(true)
    mcpApi.listTokens(session.access_token)
      .then(setMcpTokens)
      .catch(() => setMcpTokens([]))
      .finally(() => setMcpLoading(false))
  }, [session?.access_token, role])

  const handleCreateMcpToken = async () => {
    if (!mcpNewLabel.trim() || !session?.access_token) return
    setMcpCreating(true)
    setMcpFeedback(null)
    setMcpCreatedToken(null)
    try {
      const created = await mcpApi.createToken(mcpNewLabel.trim(), session.access_token)
      setMcpCreatedToken(created)
      setMcpNewLabel('')
      setMcpTokens(prev => [...prev, { id: created.id, label: created.label, token_prefix: created.token_prefix, is_active: true, created_at: created.created_at, last_used_at: null }])
      setMcpFeedback({ type: 'success', msg: 'Token created. Copy it now — it won\'t be shown again.' })
    } catch (e) {
      setMcpFeedback({ type: 'error', msg: (e as Error).message })
    } finally {
      setMcpCreating(false)
    }
  }

  const handleRevokeMcpToken = async (tokenId: string) => {
    if (!confirm('Revoke this token? It will stop working immediately.') || !session?.access_token) return
    try {
      await mcpApi.revokeToken(tokenId, session.access_token)
      setMcpTokens(prev => prev.map(t => t.id === tokenId ? { ...t, is_active: false } : t))
      setMcpFeedback({ type: 'success', msg: 'Token revoked.' })
    } catch (e) {
      setMcpFeedback({ type: 'error', msg: (e as Error).message })
    }
  }

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleProfileSave = async () => {
    const supabase = getSupabase()
    if (!supabase) return
    setProfileSaving(true)
    setProfileFeedback(null)
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName.trim(), company_name: companyName.trim() },
      })
      setProfileFeedback(error
        ? { type: 'error', msg: error.message }
        : { type: 'success', msg: 'Profile updated successfully.' })
    } catch {
      setProfileFeedback({ type: 'error', msg: 'Failed to update profile.' })
    } finally {
      setProfileSaving(false)
    }
  }

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = getSupabase()
    if (!supabase || !newEmail.trim()) return
    setEmailSaving(true)
    setEmailFeedback(null)
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() })
      if (error) {
        setEmailFeedback({ type: 'error', msg: error.message })
      } else {
        setEmailFeedback({
          type: 'success',
          msg: `Confirmation email sent to ${newEmail.trim()}. Check your inbox and click the link to complete the change.`,
        })
        setNewEmail('')
      }
    } catch {
      setEmailFeedback({ type: 'error', msg: 'Failed to send confirmation email.' })
    } finally {
      setEmailSaving(false)
    }
  }

  const handlePasswordReset = async () => {
    if (!user?.email) return
    setPasswordSending(true)
    setPasswordFeedback(null)
    try {
      const ok = await resetPassword(user.email)
      setPasswordFeedback(ok
        ? { type: 'success', msg: `Password reset email sent to ${user.email}. Check your inbox.` }
        : { type: 'error', msg: 'Failed to send reset email. Please try again.' })
    } catch {
      setPasswordFeedback({ type: 'error', msg: 'Failed to send reset email.' })
    } finally {
      setPasswordSending(false)
    }
  }

  const handleManageSubscription = async () => {
    if (!user?.id) return
    setPortalLoading(true)
    try {
      const res = await api.createPortalSession(user.id, user.email)
      if (res.data?.portal_url) {
        window.location.href = res.data.portal_url
      } else {
        alert('Unable to open billing portal. Please try again or contact support@alignmenttech.ai.')
        setPortalLoading(false)
      }
    } catch (err) {
      console.error('Portal session error:', err)
      alert('Unable to open billing portal. Please try again or contact support@alignmenttech.ai.')
      setPortalLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <div className="bg-surface border-b border-divider-light px-8 py-6">
        <h1 className="heading-dash">Account Settings</h1>
        <p className="text-sm text-ink-3 mt-1">Manage your profile, security, and subscription</p>
      </div>

      <div className="max-w-2xl mx-auto px-8 py-8 space-y-5">

        {/* ── Profile ── */}
        <Section icon={User} title="Profile" description="Update your name and company">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1.5">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Your full name"
                className="w-full px-3.5 py-2.5 bg-surface-warm border border-divider rounded-xl text-sm focus:ring-2 focus:ring-ink/10 focus:border-ink focus:bg-surface transition-all outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1.5">Company Name</label>
              <input
                type="text"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="Your company"
                className="w-full px-3.5 py-2.5 bg-surface-warm border border-divider rounded-xl text-sm focus:ring-2 focus:ring-ink/10 focus:border-ink focus:bg-surface transition-all outline-none"
              />
            </div>
            <button
              onClick={handleProfileSave}
              disabled={profileSaving}
              className="flex items-center gap-2 px-4 py-2.5 bg-ink hover:bg-[#2d2d2c] text-ink-inv text-sm font-medium rounded-xl transition-all disabled:opacity-50">
              {profileSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
            {profileFeedback && <Feedback type={profileFeedback.type} message={profileFeedback.msg} />}
          </div>
        </Section>

        {/* ── Email ── */}
        <Section icon={Mail} title="Email Address" description="Change the email linked to your account">
          <div className="mb-4 p-3 bg-surface-warm rounded-xl border border-divider-light">
            <p className="text-xs text-ink-3">Current email</p>
            <p className="text-sm font-medium text-ink mt-0.5">{user?.email || '—'}</p>
          </div>
          <form onSubmit={handleEmailChange} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1.5">New Email Address</label>
              <input
                type="email"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                placeholder="new@company.com"
                required
                className="w-full px-3.5 py-2.5 bg-surface-warm border border-divider rounded-xl text-sm focus:ring-2 focus:ring-ink/10 focus:border-ink focus:bg-surface transition-all outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={emailSaving || !newEmail.trim()}
              className="flex items-center gap-2 px-4 py-2.5 bg-ink hover:bg-[#2d2d2c] text-ink-inv text-sm font-medium rounded-xl transition-all disabled:opacity-50">
              {emailSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send Confirmation Email
            </button>
          </form>
          {emailFeedback && <Feedback type={emailFeedback.type} message={emailFeedback.msg} />}
        </Section>

        {/* ── Password ── */}
        <Section icon={Lock} title="Password" description="Send a password reset link to your email">
          <p className="text-sm text-ink-3 mb-4 leading-relaxed">
            We&apos;ll send a reset link to <span className="font-medium text-ink-2">{user?.email}</span>. Click the link to set a new password.
          </p>
          <button
            onClick={handlePasswordReset}
            disabled={passwordSending}
            className="flex items-center gap-2 px-4 py-2.5 bg-ink hover:bg-[#2d2d2c] text-ink-inv text-sm font-medium rounded-xl transition-all disabled:opacity-50">
            {passwordSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Send Reset Email
          </button>
          {passwordFeedback && <Feedback type={passwordFeedback.type} message={passwordFeedback.msg} />}
        </Section>

        {/* ── Subscription ── */}
        {role === 'user' && (
          <Section icon={CreditCard} title="Subscription" description="Manage your plan and billing">
            {subLoading ? (
              <div className="flex items-center gap-2 text-ink-3 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading subscription…
              </div>
            ) : subscription ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-surface-warm rounded-xl border border-divider-light">
                    <p className="text-xs text-ink-3">Plan</p>
                    <p className="text-sm font-semibold text-ink mt-0.5 capitalize">
                      {PLAN_LABELS[subscription.plan] ?? subscription.plan}
                    </p>
                  </div>
                  <div className="p-3 bg-surface-warm rounded-xl border border-divider-light">
                    <p className="text-xs text-ink-3">Status</p>
                    <span className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${STATUS_STYLES[subscription.status] ?? 'bg-surface-muted text-ink-3 border-divider-light'}`}>
                      {subscription.status}
                    </span>
                  </div>
                  <div className="p-3 bg-surface-warm rounded-xl border border-divider-light">
                    <p className="text-xs text-ink-3">Billing</p>
                    <p className="text-sm font-medium text-ink mt-0.5 capitalize">{subscription.billing_interval}ly</p>
                  </div>
                  <div className="p-3 bg-surface-warm rounded-xl border border-divider-light">
                    <p className="text-xs text-ink-3">
                      {subscription.status === 'trialing' ? 'Trial ends' : subscription.cancel_at_period_end ? 'Cancels on' : 'Next billing'}
                    </p>
                    <p className="text-sm font-medium text-ink mt-0.5">
                      {formatDate(subscription.status === 'trialing' ? subscription.trial_ends_at : subscription.current_period_end)}
                    </p>
                  </div>
                </div>

                {credits && (
                  <div className="rounded-2xl border border-divider-light bg-surface-warm p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-3">Monthly credits</p>
                        <p className="mt-1 text-2xl font-black text-ink">
                          {credits.credits_remaining === -1 ? 'Unlimited' : credits.credits_remaining.toLocaleString()}
                        </p>
                        <p className="mt-1 text-xs text-ink-3">
                          {formatLimit(credits.credits_used)} used · {formatLimit(credits.credits_total)} total
                        </p>
                      </div>
                      <div className="rounded-xl border border-divider bg-surface px-3 py-2 text-right">
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-3">Bonus</p>
                        <p className="text-sm font-semibold text-ink">{formatLimit(credits.credits_bonus)}</p>
                      </div>
                    </div>
                    {credits.credits_total !== -1 && (
                      <div className="mt-4 h-2 rounded-full bg-surface overflow-hidden">
                        <div
                          className="h-full rounded-full bg-ink"
                          style={{ width: `${Math.min(100, Math.max(0, (credits.credits_used / Math.max(1, credits.credits_total)) * 100))}%` }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {subscription.limits && (
                  <div className="rounded-2xl border border-divider-light bg-surface p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-3">Plan entitlements</p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl bg-surface-warm px-3 py-2">
                        <span className="text-ink-3">Daily prompts</span>
                        <p className="mt-0.5 font-semibold text-ink">{formatLimit(subscription.limits.prompts_tracked_daily)}</p>
                      </div>
                      <div className="rounded-xl bg-surface-warm px-3 py-2">
                        <span className="text-ink-3">Brands</span>
                        <p className="mt-0.5 font-semibold text-ink">{formatLimit(subscription.limits.brands_allowed)}</p>
                      </div>
                      <div className="rounded-xl bg-surface-warm px-3 py-2">
                        <span className="text-ink-3">Team seats</span>
                        <p className="mt-0.5 font-semibold text-ink">{formatLimit(subscription.limits.team_seats)}</p>
                      </div>
                      <div className="rounded-xl bg-surface-warm px-3 py-2">
                        <span className="text-ink-3">API access</span>
                        <p className="mt-0.5 font-semibold text-ink">{subscription.limits.api_access ? 'Included' : 'Not included'}</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="text-[11px] font-semibold text-ink-3">Platforms</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {subscription.limits.platforms_allowed.map(platform => (
                          <span key={platform} className="rounded-full border border-divider-light bg-surface-warm px-2.5 py-1 text-[11px] font-semibold text-ink-2">
                            {PLATFORM_LABELS[platform] ?? platform}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="text-[11px] font-semibold text-ink-3">Modules</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {subscription.limits.modules_allowed.map(module => (
                          <span key={module} className="rounded-full border border-divider-light bg-surface-warm px-2.5 py-1 text-[11px] font-semibold text-ink-2">
                            {MODULE_LABELS[module] ?? module}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {subscription.cancel_at_period_end && (
                  <div className="flex items-start gap-2 p-3 bg-caution-bg border border-caution/20 rounded-xl text-sm text-caution">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p>Your subscription will cancel at the end of the current period. Reactivate anytime in the portal.</p>
                  </div>
                )}

                <button
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                  className="flex items-center gap-2 px-4 py-2.5 bg-ink hover:bg-[#2d2d2c] text-ink-inv text-sm font-medium rounded-xl transition-all disabled:opacity-50">
                  {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                  {portalLoading ? 'Redirecting…' : 'Update Billing & Payment'}
                </button>
                <p className="text-xs text-ink-3 mt-1">
                  Update payment method, view invoices, or change plan interval.
                </p>

                {/* Cancel — buried deep below billing to maximise retention */}
                {(subscription.status === 'trialing' || subscription.status === 'active') && !subscription.cancel_at_period_end && (
                  <div className="pt-4 border-t border-divider-light mt-3">
                    <p className="text-xs text-ink-3 mb-1.5">
                      Thinking about leaving? We may have a better option for you first.
                    </p>
                    <button
                      onClick={() => window.dispatchEvent(new CustomEvent('openCancelModal'))}
                      className="text-xs text-ink-3 hover:text-red-soft underline underline-offset-2 transition-colors"
                    >
                      Cancel subscription →
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-ink-3">No active subscription found.</p>
                <a
                  href="/pricing"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-ink hover:bg-[#2d2d2c] text-ink-inv text-sm font-medium rounded-xl transition-all">
                  <ExternalLink className="w-4 h-4" />
                  View Plans
                </a>
              </div>
            )}
          </Section>
        )}

        {/* ── MCP (Model Context Protocol) ── */}
        {role !== 'demo' && (
          <Section icon={Key} title="MCP — AI Tools Integration" description="Connect Claude Desktop, Cursor, or Windsurf to query your brand data with natural language">
            {!mcpAllowed ? (
              <div className="rounded-2xl border border-divider-light bg-surface-warm p-4">
                <p className="text-sm font-semibold text-ink">MCP Integration is available on Pro and Enterprise.</p>
                <p className="mt-1 text-sm text-ink-3">Upgrade when you are ready to connect external AI tools to your Alignment workspace.</p>
                <a href="/pricing" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-ink-inv hover:bg-[#2d2d2c]">
                  <ExternalLink className="h-4 w-4" /> View Plans
                </a>
              </div>
            ) : (
            <div className="space-y-4">
              <p className="text-sm text-ink-2 leading-relaxed">
                Create an API token for each AI tool you want to connect. Each token is linked to your account and shown only once — copy it immediately after creation.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={mcpNewLabel}
                  onChange={e => setMcpNewLabel(e.target.value)}
                  placeholder="e.g. Claude-Desktop-MacBook"
                  onKeyDown={e => e.key === 'Enter' && handleCreateMcpToken()}
                  className="flex-1 px-3.5 py-2.5 bg-surface-warm border border-divider rounded-xl text-sm focus:ring-2 focus:ring-ink/10 focus:border-ink outline-none"
                />
                <button
                  onClick={handleCreateMcpToken}
                  disabled={mcpCreating || !mcpNewLabel.trim()}
                  className="flex items-center gap-2 px-4 py-2.5 bg-ink hover:bg-[#2d2d2c] text-ink-inv text-sm font-medium rounded-xl disabled:opacity-50"
                >
                  {mcpCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {mcpCreating ? 'Creating…' : 'Create Token'}
                </button>
              </div>

              {mcpCreatedToken && (
                <div className="p-4 bg-caution-bg border border-caution/30 rounded-xl space-y-2">
                  <p className="text-sm font-medium text-caution">Copy this token now — it won&apos;t be shown again:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-surface border border-caution/20 rounded-lg text-sm font-mono break-all">{mcpCreatedToken.token}</code>
                    <button
                      onClick={() => { navigator.clipboard.writeText(mcpCreatedToken.token); setMcpFeedback({ type: 'success', msg: 'Copied to clipboard.' }) }}
                      aria-label="Copy token"
                      title="Copy token"
                      className="p-2 border border-caution/30 rounded-lg hover:bg-caution-bg transition-colors focus:outline-none focus:ring-2 focus:ring-caution/20"
                    >
                      <Copy className="w-4 h-4 text-caution" />
                    </button>
                  </div>
                  <p className="text-xs text-caution mt-1">Paste into Claude Desktop config as <code className="font-mono">ALIGNMENT_API_TOKEN</code></p>
                </div>
              )}

              {mcpFeedback && <Feedback type={mcpFeedback.type} message={mcpFeedback.msg} />}

              {mcpLoading ? (
                <div className="flex items-center gap-2 text-ink-3 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading tokens…</div>
              ) : mcpTokens.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-divider-light">
                  <table className="w-full text-sm">
                    <thead className="bg-surface-warm">
                      <tr>
                        <th className="text-left px-4 py-2.5 text-ink-2 font-medium">Label</th>
                        <th className="text-left px-4 py-2.5 text-ink-2 font-medium">Prefix</th>
                        <th className="text-left px-4 py-2.5 text-ink-2 font-medium">Last Used</th>
                        <th className="text-right px-4 py-2.5 text-ink-2 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-divider-light">
                      {mcpTokens.map(t => (
                        <tr key={t.id} className={!t.is_active ? 'opacity-50' : ''}>
                          <td className="px-4 py-2.5 text-ink">{t.label}</td>
                          <td className="px-4 py-2.5 font-mono text-ink-2">{t.token_prefix}…</td>
                          <td className="px-4 py-2.5 text-ink-3">{t.last_used_at ? new Date(t.last_used_at).toLocaleString() : '—'}</td>
                          <td className="px-4 py-2.5 text-right">
                            {t.is_active ? (
                              <button onClick={() => handleRevokeMcpToken(t.id)} className="text-red-soft hover:text-red-soft/70 text-xs font-medium inline-flex items-center gap-1">
                                <Trash2 className="w-3 h-3" /> Revoke
                              </button>
                            ) : (
                              <span className="text-ink-3 text-xs">Revoked</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-ink-3">No tokens yet. Create one above to get started.</p>
              )}

              <div className="pt-1 border-t border-divider-light flex items-center justify-between">
                <a href="/docs/mcp-setup" target="_blank" rel="noopener noreferrer" className="text-xs text-ink-2 hover:underline">
                  MCP setup guide →
                </a>
                <span className="text-xs text-ink-3">Name tokens by device: e.g. <code className="font-mono">Claude-Desktop-MacBook</code></span>
              </div>
            </div>
            )}
          </Section>
        )}

        {/* ── Website Connections ── */}
        <Section
          icon={Globe}
          title="Website Connections"
          description="Connect your Shopify, WordPress, GitHub, or custom site so Alignment can read and fix AI visibility issues"
        >
          {user?.id ? (
            <WebsiteConnectionsSection userId={user.id} />
          ) : (
            <p className="text-sm text-ink-3">Sign in to manage website connections.</p>
          )}
        </Section>

        {/* ── Danger Zone ── */}
        <Section icon={AlertTriangle} title="Danger Zone" description="Irreversible account actions">
          <p className="text-sm text-ink-3 mb-4 leading-relaxed">
            To delete your account or request a data export, please contact our support team directly.
          </p>
          <a
            href="mailto:contact@alignmenttech.ai?subject=Account%20Deletion%20Request"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-surface hover:bg-red-soft-bg border border-red-soft/30 text-red-soft hover:text-red-soft text-sm font-medium rounded-xl transition-all">
            <Mail className="w-4 h-4" />
            Contact Support to Delete Account
          </a>
        </Section>

      </div>
    </div>
  )
}
