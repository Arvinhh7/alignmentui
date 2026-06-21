'use client'

import { useState, useEffect, useCallback } from 'react'
import { Copy, CheckCheck } from 'lucide-react'
import { api, CreditBalance } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''

// ── Types ─────────────────────────────────────────────────────────────────────

interface UserSearchResult {
  id: string
  email: string
  created_at: string
  user_metadata?: { full_name?: string; company_name?: string }
}

interface ProxyToken {
  token: string
  shop: string
  tier: string
  status: string
  label: string | null
  created_at: string
  revoked_at: string | null
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function AdminPanel() {
  const { role } = useAuth()
  const [tab, setTab] = useState<'users' | 'tokens' | 'cogs'>('users')

  if (role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-ink-3 text-lg">Admin access required.</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Admin Panel</h1>
        <p className="text-sm text-ink-3 mt-1">Manage users, credits, subscriptions, and API tokens.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-canvas rounded-xl p-1 border border-divider w-fit">
        {(['users', 'tokens', 'cogs'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 text-sm font-medium rounded-lg transition-colors ${
              tab === t
                ? 'bg-ink text-ink-inv shadow-sm'
                : 'text-ink-3 hover:text-ink'
            }`}
          >
            {t === 'users' ? 'User Management' : t === 'tokens' ? 'Token Management' : 'COGS Report'}
          </button>
        ))}
      </div>

      {tab === 'users' && <UserManagement />}
      {tab === 'tokens' && <TokenManagement />}
      {tab === 'cogs' && <COGSReport />}
    </div>
  )
}

// ── User Management tab ───────────────────────────────────────────────────────

function UserManagement() {
  const [email, setEmail] = useState('')
  const [userId, setUserId] = useState('')
  const [userInfo, setUserInfo] = useState<UserSearchResult | null>(null)
  const [credits, setCredits] = useState<CreditBalance | null>(null)
  const [subInfo, setSubInfo] = useState<import('@/lib/api').SubscriptionStatus | null>(null)
  const [grantAmount, setGrantAmount] = useState(500)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [loading, setLoading] = useState(false)

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text })
    setTimeout(() => setFeedback(null), 5000)
  }

  const lookupUser = async () => {
    if (!email.trim()) return
    setLoading(true)
    setUserInfo(null); setCredits(null); setSubInfo(null)
    try {
      const res = await fetch(`${API_BASE}/api/admin/lookup-user?email=${encodeURIComponent(email.trim())}`)
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setUserInfo(data.user)
      setUserId(data.user.id)
      const [creditRes, subRes] = await Promise.all([
        api.getCredits(data.user.id),
        api.getSubscription(data.user.id),
      ])
      setCredits(creditRes.data ?? null)
      setSubInfo(subRes.data?.subscription ?? null)
    } catch (e: unknown) {
      showFeedback('error', `User not found: ${(e as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleResetCredits = async () => {
    if (!userId) return
    setLoading(true)
    try {
      const res = await api.adminResetCredits(userId)
      setCredits(res.data ?? null)
      showFeedback('success', 'Credits reset to 0.')
    } catch (e: unknown) {
      showFeedback('error', (e as Error).message)
    } finally { setLoading(false) }
  }

  const handleGrantCredits = async () => {
    if (!userId || grantAmount <= 0) return
    setLoading(true)
    try {
      const res = await api.adminGrantCredits(userId, grantAmount)
      setCredits(res.data ?? null)
      showFeedback('success', `Granted ${grantAmount} bonus credits.`)
    } catch (e: unknown) {
      showFeedback('error', (e as Error).message)
    } finally { setLoading(false) }
  }

  const handleResetUser = async () => {
    if (!userId) return
    if (!confirm('This will DELETE all subscription, usage, and onboarding data. Continue?')) return
    setLoading(true)
    try {
      const res = await api.adminResetUser(userId)
      if (res.data?.success) {
        setSubInfo(null); setCredits(null)
        showFeedback('success', 'User reset to new-user state.')
      }
    } catch (e: unknown) {
      showFeedback('error', (e as Error).message)
    } finally { setLoading(false) }
  }

  const planColors: Record<string, string> = {
    starter: 'bg-surface-warm text-ink-2',
    standard: 'bg-surface-warm text-ink-2',
    pro: 'bg-surface-warm text-ink-2',
    growth: 'bg-surface-warm text-ink-2',
    enterprise: 'bg-surface-warm text-ink-2',
    trial: 'bg-sage-bg text-sage',
  }

  return (
    <div className="space-y-8">
      {feedback && (
        <div className={`p-3 rounded-xl text-sm font-medium ${
          feedback.type === 'success'
            ? 'bg-sage-bg text-sage border border-sage/30'
            : 'bg-red-soft-bg text-red-soft border border-red-soft/30'
        }`}>{feedback.text}</div>
      )}

      <section className="bg-surface rounded-2xl border border-divider p-6 space-y-4">
        <h2 className="text-lg font-semibold text-ink">User Lookup</h2>
        <div className="flex gap-2">
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            className="flex-1 px-4 py-2.5 border border-divider rounded-xl text-sm focus:ring-2 focus:ring-ink/10 focus:border-ink outline-none"
            onKeyDown={(e) => e.key === 'Enter' && lookupUser()}
          />
          <button onClick={lookupUser} disabled={loading || !email.trim()}
            className="px-5 py-2.5 bg-ink text-ink-inv text-sm font-medium rounded-xl hover:bg-[#2d2d2c] disabled:opacity-50 transition-colors">
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
        {userInfo && (
          <div className="bg-canvas rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-ink">{userInfo.user_metadata?.full_name || userInfo.email}</p>
                <p className="text-xs text-ink-3">{userInfo.email}</p>
              </div>
              <span className="text-xs text-ink-3 font-mono">{userInfo.id.slice(0, 8)}...</span>
            </div>
            <p className="text-xs text-ink-3">Registered: {new Date(userInfo.created_at).toLocaleDateString()}</p>
          </div>
        )}
      </section>

      {userInfo && (
        <section className="bg-surface rounded-2xl border border-divider p-6 space-y-4">
          <h2 className="text-lg font-semibold text-ink">Subscription Status</h2>
          {subInfo ? (
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-ink-3">Plan</p>
                <span className={`inline-block mt-1 px-3 py-1 text-xs font-semibold rounded-full ${planColors[subInfo.plan] ?? 'bg-surface-warm text-ink-2'}`}>{subInfo.plan.toUpperCase()}</span>
              </div>
              <div><p className="text-xs text-ink-3">Status</p><p className="font-medium text-ink mt-1 capitalize">{subInfo.status}</p></div>
              <div><p className="text-xs text-ink-3">Billing</p><p className="font-medium text-ink mt-1">{subInfo.billing_interval}</p></div>
              <div><p className="text-xs text-ink-3">Stripe Customer ID</p><p className="font-medium text-ink mt-1 font-mono text-xs">N/A</p></div>
            </div>
          ) : (
            <p className="text-sm text-ink-3">No active subscription.</p>
          )}
        </section>
      )}

      {userInfo && (
        <section className="bg-surface rounded-2xl border border-divider p-6 space-y-4">
          <h2 className="text-lg font-semibold text-ink">Credit Management</h2>
          {credits ? (
            <div className="grid grid-cols-2 gap-4">
              {[
                ['Plan Limit', credits.credits_limit === -1 ? 'Unlimited' : credits.credits_limit.toLocaleString(), ''],
                ['Used', credits.credits_used.toLocaleString(), 'text-red-soft'],
                ['Bonus Credits', credits.credits_bonus.toLocaleString(), ''],
                ['Remaining', credits.credits_remaining === -1 ? 'Unlimited' : credits.credits_remaining.toLocaleString(),
                  credits.credits_remaining <= 0 ? 'text-red-soft' : 'text-sage'],
              ].map(([label, val, cls]) => (
                <div key={label as string} className="bg-canvas rounded-xl p-4">
                  <p className="text-xs text-ink-3">{label}</p>
                  <p className={`text-2xl font-bold text-ink ${cls}`}>{val}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-3">No usage data this period.</p>
          )}
          <div className="flex flex-wrap gap-3 pt-2">
            <button onClick={handleResetCredits} disabled={loading}
              className="px-4 py-2 bg-caution text-ink-inv text-sm font-medium rounded-xl hover:opacity-80 disabled:opacity-50 transition-colors">
              Reset Credits to 0
            </button>
            <div className="flex items-center gap-2">
              <input type="number" value={grantAmount} onChange={(e) => setGrantAmount(Number(e.target.value))}
                className="w-24 px-3 py-2 border border-divider rounded-xl text-sm focus:ring-2 focus:ring-ink/10 focus:border-ink outline-none" min={1} />
              <button onClick={handleGrantCredits} disabled={loading || grantAmount <= 0}
                className="px-4 py-2 bg-ink text-ink-inv text-sm font-medium rounded-xl hover:bg-[#2d2d2c] disabled:opacity-50 transition-colors">
                Grant Credits
              </button>
            </div>
          </div>
        </section>
      )}

      {userInfo && (
        <section className="bg-red-soft-bg rounded-2xl border border-red-soft/30 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-ink">Danger Zone</h2>
          <p className="text-sm text-red-soft">Reset this user to a completely new state. This deletes all subscription, usage tracking, and onboarding email records.</p>
          <button onClick={handleResetUser} disabled={loading}
            className="px-5 py-2.5 bg-ink text-ink-inv text-sm font-semibold rounded-xl hover:bg-[#2d2d2c] disabled:opacity-50 transition-colors">
            Reset User (Delete All Data)
          </button>
        </section>
      )}

      <section className="bg-surface rounded-2xl border border-divider p-6">
        <h2 className="text-lg font-semibold text-ink mb-4">Credit Cost Reference</h2>
        <div className="overflow-hidden rounded-xl border border-divider">
          <table className="w-full text-sm">
            <thead className="bg-canvas">
              <tr>
                <th className="text-left px-4 py-3 text-ink-3 font-medium">Operation</th>
                <th className="text-right px-4 py-3 text-ink-3 font-medium">Credits</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider-light">
              {[
                // ── Subscription-included (0 credits) ──────────────────────
                ['Explore / Sources / Shopping reads', 0],
                ['AI Research run (0 LLM, reuses Explore)', 0],
                ['Monitoring scan — auto + manual (subscription quota)', 0],
                ['GA4 Attribution sync (0 LLM)', 0],
                ['Visibility Proxy (Worker layer)', 0],
                // ── On-demand actions (credit-metered) ─────────────────────
                ['Agent Audit (web infrastructure)', 10],
                ['Analysis Intel report', 25],
                ['Analysis Gap analysis', 15],
                ['Advanced tab — mentions / topics / sources / grouping / citations', 5],
                ['GEO Optimization — code fix (Haiku)', 3],
                ['GEO Optimization — content fix (Sonnet)', 8],
                ['AEO URL score', 1],
                ['Competitor scan (per engine)', 3],
              ].map(([op, cost]) => (
                <tr key={op as string} className="hover:bg-surface-warm">
                  <td className="px-4 py-2.5 text-ink-2">{op}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-ink">{cost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 text-xs text-ink-3 space-y-1">
          <p className="font-semibold text-ink-2">Action credits by plan (resets monthly):</p>
          <p><span className="font-semibold">Starter ($99/mo):</span> 5,000 credits/month</p>
          <p><span className="font-semibold">Standard ($199/mo):</span> 12,000 credits/month</p>
          <p><span className="font-semibold">Pro ($399/mo):</span> 30,000 credits/month</p>
          <p><span className="font-semibold">Enterprise:</span> Custom credits</p>
          <p className="pt-1 text-[11px] text-ink-4">Monitoring scans are governed by the subscription engine-check quota, not credits. See two-layer billing model.</p>
        </div>
      </section>
    </div>
  )
}

// ── Token Management tab ──────────────────────────────────────────────────────

function CopyButton({ value, size = 'sm' }: { value: string; size?: 'xs' | 'sm' }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  const cls = size === 'xs' ? 'w-3 h-3' : 'w-3.5 h-3.5'
  return (
    <button onClick={copy} title="Copy" className="inline-flex items-center gap-1 text-ink-3 hover:text-ink transition-colors">
      {copied ? <CheckCheck className={`${cls} text-sage`} /> : <Copy className={cls} />}
    </button>
  )
}

/** Canonical shop = lowercase plain hostname (no scheme, no trailing slash) */
function normalizeShop(input: string): string {
  let s = input.trim().replace(/\/$/, '')
  if (s.startsWith('http://') || s.startsWith('https://')) {
    try { s = new URL(s).hostname } catch { /* keep as-is */ }
  }
  return s.toLowerCase()
}

function TokenManagement() {
  const [tokens, setTokens] = useState<ProxyToken[]>([])
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [newShop, setNewShop] = useState('')
  const [newTier, setNewTier] = useState('optimize')
  const [newLabel, setNewLabel] = useState('')
  const [creating, setCreating] = useState(false)
  const [newToken, setNewToken] = useState<string | null>(null)

  // Live-normalized preview (shown when input diverges from canonical form)
  const shopPreview = newShop.trim() ? normalizeShop(newShop) : ''
  const shopNeedsNormalization = !!newShop.trim() && shopPreview !== newShop.trim()
  // Search & filter
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'revoked'>('all')
  // Row detail panel
  const [selectedToken, setSelectedToken] = useState<string | null>(null)

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text })
    setTimeout(() => setFeedback(null), 6000)
  }

  const loadTokens = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/admin/proxy-tokens`)
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setTokens(data.tokens)
    } catch (e: unknown) {
      showFeedback('error', `Failed to load tokens: ${(e as Error).message}`)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadTokens() }, [loadTokens])

  const handleCreate = async () => {
    if (!newShop.trim()) return
    setCreating(true)
    setNewToken(null)
    try {
      const res = await fetch(`${API_BASE}/api/admin/proxy-tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop: newShop.trim(), tier: newTier, label: newLabel.trim() }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setNewToken(data.token)
      setNewShop(''); setNewLabel('')
      showFeedback('success', `Token created for ${data.shop}`)
      await loadTokens()
    } catch (e: unknown) {
      showFeedback('error', `Create failed: ${(e as Error).message}`)
    } finally {
      setCreating(false)
    }
  }

  const handleRevoke = async (token: string, shop: string) => {
    if (!confirm(`Revoke token for ${shop}? This takes effect immediately.`)) return
    try {
      const res = await fetch(`${API_BASE}/api/admin/proxy-tokens/${token}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await res.text())
      showFeedback('success', 'Token revoked.')
      setSelectedToken(null)
      await loadTokens()
    } catch (e: unknown) {
      showFeedback('error', `Revoke failed: ${(e as Error).message}`)
    }
  }

  const tierColors: Record<string, string> = {
    build: 'bg-surface-warm text-ink-2',
    optimize: 'bg-sage-bg text-sage',
    insight: 'bg-ink text-ink-inv',
  }

  // Filtered token list
  const filteredTokens = tokens.filter(t => {
    const q = searchQuery.toLowerCase()
    const matchesSearch = !q ||
      t.shop.toLowerCase().includes(q) ||
      (t.label ?? '').toLowerCase().includes(q) ||
      t.token.toLowerCase().includes(q)
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const selectedDetails = tokens.find(t => t.token === selectedToken) ?? null

  return (
    <div className="space-y-6">
      {feedback && (
        <div className={`p-3 rounded-xl text-sm font-medium ${
          feedback.type === 'success'
            ? 'bg-sage-bg text-sage border border-sage/30'
            : 'bg-red-soft-bg text-red-soft border border-red-soft/30'
        }`}>{feedback.text}</div>
      )}

      {/* New token banner */}
      {newToken && (
        <div className="bg-sage-bg border border-sage/30 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-sage">Token created — copy and send to client</p>
            <span className="text-xs text-sage/70">Always retrievable from the table below</span>
          </div>
          <div className="flex items-center gap-3 bg-white/60 rounded-lg px-3 py-2">
            <code className="flex-1 text-sm font-mono text-ink break-all select-all">{newToken}</code>
            <CopyButton value={newToken} size="sm" />
          </div>
        </div>
      )}

      {/* Create form */}
      <section className="bg-surface rounded-2xl border border-divider p-6 space-y-4">
        <h2 className="text-lg font-semibold text-ink">New Client Token</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1">
            <input
              placeholder="redmagic.gg"
              value={newShop} onChange={(e) => setNewShop(e.target.value)}
              onBlur={() => { if (newShop.trim()) setNewShop(normalizeShop(newShop)) }}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              className={`px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-ink/10 focus:border-ink outline-none ${
                shopNeedsNormalization ? 'border-amber-400' : 'border-divider'
              }`}
            />
            {shopNeedsNormalization && (
              <p className="text-[11px] text-amber-700 px-1">
                → will be stored as <code className="font-mono">{shopPreview}</code>
              </p>
            )}
          </div>
          <select value={newTier} onChange={(e) => setNewTier(e.target.value)}
            className="px-4 py-2.5 border border-divider rounded-xl text-sm focus:ring-2 focus:ring-ink/10 focus:border-ink outline-none bg-white">
            <option value="build">Build — 60 req/min (testing)</option>
            <option value="optimize">Optimize — 600 req/min (standard)</option>
            <option value="insight">Insight — 1200 req/min (enterprise)</option>
          </select>
          <input
            placeholder="Label, e.g. RedMagic Phase 1"
            value={newLabel} onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            className="px-4 py-2.5 border border-divider rounded-xl text-sm focus:ring-2 focus:ring-ink/10 focus:border-ink outline-none"
          />
        </div>
        <button onClick={handleCreate} disabled={creating || !newShop.trim()}
          className="px-5 py-2.5 bg-ink text-ink-inv text-sm font-medium rounded-xl hover:bg-[#2d2d2c] disabled:opacity-50 transition-colors">
          {creating ? 'Creating...' : '⚡ Create Token'}
        </button>
      </section>

      {/* Token table */}
      <section className="bg-surface rounded-2xl border border-divider p-6 space-y-4">
        {/* Header + search + filter */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-ink">
            All Tokens
            {filteredTokens.length !== tokens.length && (
              <span className="ml-2 text-sm font-normal text-ink-3">
                ({filteredTokens.length} / {tokens.length})
              </span>
            )}
          </h2>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search shop, label, token…"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSelectedToken(null) }}
              className="px-3 py-1.5 border border-divider rounded-lg text-xs focus:ring-2 focus:ring-ink/10 focus:border-ink outline-none w-48"
            />
            <div className="flex rounded-lg border border-divider overflow-hidden text-xs font-medium">
              {(['all', 'active', 'revoked'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setSelectedToken(null) }}
                  className={`px-3 py-1.5 capitalize transition-colors ${
                    statusFilter === s ? 'bg-ink text-ink-inv' : 'text-ink-3 hover:bg-surface-warm'
                  }`}
                >{s}</button>
              ))}
            </div>
            <button onClick={loadTokens} disabled={loading}
              className="text-xs text-ink-3 hover:text-ink transition-colors disabled:opacity-50 px-2">
              {loading ? '…' : '↻'}
            </button>
          </div>
        </div>

        {filteredTokens.length === 0 && !loading ? (
          <p className="text-sm text-ink-3">
            {searchQuery || statusFilter !== 'all' ? 'No tokens match your search.' : 'No tokens found.'}
          </p>
        ) : (
          <div className="rounded-xl border border-divider overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-canvas">
                <tr>
                  {['Shop / Label', 'Tier', 'Status', 'Created', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-ink-3 font-medium whitespace-nowrap text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-divider-light">
                {filteredTokens.map((t) => {
                  const isSelected = selectedToken === t.token
                  return (
                    <>
                      {/* ── Main row — click to expand ── */}
                      <tr
                        key={t.token}
                        onClick={() => setSelectedToken(isSelected ? null : t.token)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-canvas border-l-2 border-l-ink'
                            : t.status === 'revoked'
                              ? 'opacity-40 hover:bg-surface-warm'
                              : 'hover:bg-surface-warm'
                        }`}
                      >
                        <td className="px-4 py-3">
                          <p className="text-xs font-semibold text-ink">{t.shop}</p>
                          {t.label && <p className="text-[11px] text-ink-3 mt-0.5">{t.label}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${tierColors[t.tier] ?? 'bg-surface-warm text-ink-2'}`}>
                            {t.tier}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            t.status === 'active' ? 'bg-sage-bg text-sage' : 'bg-red-soft-bg text-red-soft'
                          }`}>{t.status}</span>
                        </td>
                        <td className="px-4 py-3 text-ink-3 text-xs whitespace-nowrap">
                          {new Date(t.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-ink-3 text-xs text-right pr-4">
                          {isSelected ? '▲' : '▼'}
                        </td>
                      </tr>

                      {/* ── Detail panel — shown when row is selected ── */}
                      {isSelected && (
                        <tr key={`${t.token}-detail`}>
                          <td colSpan={5} className="px-4 py-4 bg-canvas border-l-2 border-l-ink">
                            <div className="space-y-3">
                              {/* Token row */}
                              <div className="flex items-center gap-3 bg-surface rounded-xl px-4 py-3 border border-divider-light">
                                <div className="flex-1 min-w-0">
                                  <p className="text-[10px] text-ink-3 font-semibold tracking-wide mb-1">API TOKEN</p>
                                  <code className="text-xs font-mono text-ink break-all select-all">{t.token}</code>
                                </div>
                                <CopyButton value={t.token} size="sm" />
                              </div>

                              {/* Info grid */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[
                                  { label: 'SHOP', value: t.shop },
                                  { label: 'TIER', value: t.tier },
                                  { label: 'LABEL', value: t.label || '—' },
                                  { label: 'CREATED', value: new Date(t.created_at).toLocaleString() },
                                ].map(({ label, value }) => (
                                  <div key={label} className="bg-surface rounded-xl px-3 py-2.5 border border-divider-light">
                                    <p className="text-[10px] text-ink-3 font-semibold tracking-wide">{label}</p>
                                    <p className="text-xs text-ink mt-0.5 font-medium">{value}</p>
                                  </div>
                                ))}
                              </div>

                              {/* Revoked info */}
                              {t.revoked_at && (
                                <p className="text-xs text-red-soft">
                                  Revoked at: {new Date(t.revoked_at).toLocaleString()}
                                </p>
                              )}

                              {/* Actions */}
                              <div className="flex gap-2 pt-1">
                                {t.status === 'active' && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleRevoke(t.token, t.shop) }}
                                    className="px-4 py-2 text-xs font-medium text-red-soft border border-red-soft/30 rounded-xl hover:bg-red-soft-bg transition-colors"
                                  >
                                    Revoke Token
                                  </button>
                                )}
                                <button
                                  onClick={(e) => { e.stopPropagation(); setSelectedToken(null) }}
                                  className="px-4 py-2 text-xs font-medium text-ink-3 border border-divider-light rounded-xl hover:bg-surface-warm transition-colors"
                                >
                                  Close
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Detail panel (floating, shown when nothing is in table view) */}
      {selectedDetails && filteredTokens.length === 0 && (
        <section className="bg-surface rounded-2xl border border-divider p-6 space-y-3">
          <p className="text-sm font-semibold text-ink">{selectedDetails.shop}</p>
          <div className="flex items-center gap-3 bg-canvas rounded-xl px-4 py-3 border border-divider-light">
            <code className="flex-1 text-xs font-mono text-ink break-all select-all">{selectedDetails.token}</code>
            <CopyButton value={selectedDetails.token} size="sm" />
          </div>
        </section>
      )}
    </div>
  )
}

// ── COGS Report tab ───────────────────────────────────────────────────────────

interface COGSCustomer {
  customer_id: string
  brand_name: string
  plan: string
  scan_count: number
  total_executions: number
  cogs_usd: number
  plan_revenue_usd: number
  margin_pct: number
  at_risk: boolean
}

interface COGSReport {
  month: string
  summary: {
    total_cogs_usd: number
    total_revenue_usd: number
    total_customers: number
    at_risk_count: number
    avg_margin_pct: number
  }
  customers: COGSCustomer[]
}

function COGSReport() {
  const today = new Date()
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const [month, setMonth] = useState(defaultMonth)
  const [report, setReport] = useState<COGSReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchReport = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/ops/cogs?month=${month}`)
      if (!res.ok) throw new Error(await res.text())
      setReport(await res.json())
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [month])

  useEffect(() => { fetchReport() }, [fetchReport])

  const planColor = (plan: string) =>
    plan === 'pro' ? 'text-accent' : plan === 'standard' ? 'text-ink' : 'text-ink-3'

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center gap-3">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="px-3 py-2 text-sm bg-canvas border border-divider rounded-xl text-ink focus:outline-none focus:ring-2 focus:ring-ink/20"
        />
        <button
          onClick={fetchReport}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium bg-ink text-ink-inv rounded-xl disabled:opacity-50 hover:opacity-90 transition-opacity"
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-soft bg-red-soft/10 border border-red-soft/20 rounded-xl px-4 py-3">{error}</p>
      )}

      {report && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Total COGS', value: `$${report.summary.total_cogs_usd.toFixed(2)}` },
              { label: 'MRR (active)', value: `$${report.summary.total_revenue_usd.toFixed(2)}` },
              { label: 'Avg Margin', value: `${report.summary.avg_margin_pct}%` },
              { label: 'Customers', value: String(report.summary.total_customers) },
              {
                label: 'At-Risk',
                value: String(report.summary.at_risk_count),
                highlight: report.summary.at_risk_count > 0,
              },
            ].map(({ label, value, highlight }) => (
              <div key={label} className="bg-surface border border-divider rounded-2xl px-4 py-3">
                <p className="text-[10px] text-ink-3 font-semibold tracking-wide mb-1">{label}</p>
                <p className={`text-lg font-bold ${highlight ? 'text-red-soft' : 'text-ink'}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Per-customer table */}
          {report.customers.length === 0 ? (
            <p className="text-sm text-ink-3 py-6 text-center">No scan activity in {report.month}.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-divider">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-canvas border-b border-divider">
                    {['Brand', 'Plan', 'Scans', 'Executions', 'COGS', 'MRR', 'Margin', 'Risk'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] text-ink-3 font-semibold tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider-light">
                  {report.customers.map((c) => (
                    <tr key={c.customer_id} className={`hover:bg-canvas transition-colors ${c.at_risk ? 'bg-red-soft/5' : ''}`}>
                      <td className="px-4 py-3 font-medium text-ink max-w-[160px] truncate" title={c.brand_name}>
                        {c.brand_name}
                      </td>
                      <td className={`px-4 py-3 font-medium capitalize ${planColor(c.plan)}`}>{c.plan}</td>
                      <td className="px-4 py-3 text-ink-3">{c.scan_count}</td>
                      <td className="px-4 py-3 text-ink-3">{c.total_executions.toLocaleString()}</td>
                      <td className="px-4 py-3 font-medium text-ink">${c.cogs_usd.toFixed(2)}</td>
                      <td className="px-4 py-3 text-ink-3">${c.plan_revenue_usd.toFixed(0)}</td>
                      <td className={`px-4 py-3 font-medium ${c.margin_pct < 50 ? 'text-red-soft' : c.margin_pct < 70 ? 'text-caution' : 'text-green-600'}`}>
                        {c.margin_pct}%
                      </td>
                      <td className="px-4 py-3">
                        {c.at_risk && (
                          <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full bg-red-soft/15 text-red-soft">
                            AT RISK
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
