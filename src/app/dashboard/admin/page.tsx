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
  const [tab, setTab] = useState<'users' | 'tokens'>('users')

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
        {(['users', 'tokens'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 text-sm font-medium rounded-lg transition-colors ${
              tab === t
                ? 'bg-ink text-ink-inv shadow-sm'
                : 'text-ink-3 hover:text-ink'
            }`}
          >
            {t === 'users' ? 'User Management' : 'Token Management'}
          </button>
        ))}
      </div>

      {tab === 'users' ? <UserManagement /> : <TokenManagement />}
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
                ['GEO Audit (1 URL)', 10], ['Monitor Scan (per prompt)', 1], ['Competitor Scan', 3],
                ['Gap Analysis', 15], ['Intel Report', 25], ['Advanced Analysis', 5],
                ['Optimization Plan', 15], ['Apply Optimization', 5], ['Content Generate', 3],
                ['Content Validate', 1], ['Distribution Strategy', 5], ['Reddit Strategy', 10],
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
          <p><span className="font-semibold">Trial:</span> 50 credits/month</p>
          <p><span className="font-semibold">Starter ($299/mo):</span> 300 credits/month</p>
          <p><span className="font-semibold">Growth ($599/mo):</span> 1,000 credits/month</p>
          <p><span className="font-semibold">Enterprise ($999/mo):</span> 5,000 credits/month</p>
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

function TokenManagement() {
  const [tokens, setTokens] = useState<ProxyToken[]>([])
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [newShop, setNewShop] = useState('')
  const [newTier, setNewTier] = useState('optimize')
  const [newLabel, setNewLabel] = useState('')
  const [creating, setCreating] = useState(false)
  const [newToken, setNewToken] = useState<string | null>(null)
  const [expandedToken, setExpandedToken] = useState<string | null>(null)

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
      showFeedback('success', `Token revoked.`)
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

  return (
    <div className="space-y-6">
      {feedback && (
        <div className={`p-3 rounded-xl text-sm font-medium ${
          feedback.type === 'success'
            ? 'bg-sage-bg text-sage border border-sage/30'
            : 'bg-red-soft-bg text-red-soft border border-red-soft/30'
        }`}>{feedback.text}</div>
      )}

      {/* New token revealed after creation */}
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
          <input
            placeholder="shop.myshopify.com"
            value={newShop} onChange={(e) => setNewShop(e.target.value)}
            className="px-4 py-2.5 border border-divider rounded-xl text-sm focus:ring-2 focus:ring-ink/10 focus:border-ink outline-none"
          />
          <select value={newTier} onChange={(e) => setNewTier(e.target.value)}
            className="px-4 py-2.5 border border-divider rounded-xl text-sm focus:ring-2 focus:ring-ink/10 focus:border-ink outline-none bg-white">
            <option value="build">Build — 60 req/min (testing)</option>
            <option value="optimize">Optimize — 600 req/min (standard client)</option>
            <option value="insight">Insight — 1200 req/min (enterprise)</option>
          </select>
          <input
            placeholder="Label (optional)"
            value={newLabel} onChange={(e) => setNewLabel(e.target.value)}
            className="px-4 py-2.5 border border-divider rounded-xl text-sm focus:ring-2 focus:ring-ink/10 focus:border-ink outline-none"
          />
        </div>
        <button onClick={handleCreate} disabled={creating || !newShop.trim()}
          className="px-5 py-2.5 bg-ink text-ink-inv text-sm font-medium rounded-xl hover:bg-[#2d2d2c] disabled:opacity-50 transition-colors">
          {creating ? 'Creating...' : 'Create Token'}
        </button>
      </section>

      {/* Token table */}
      <section className="bg-surface rounded-2xl border border-divider p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">All Tokens</h2>
          <button onClick={loadTokens} disabled={loading}
            className="text-xs text-ink-3 hover:text-ink transition-colors disabled:opacity-50">
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {tokens.length === 0 && !loading ? (
          <p className="text-sm text-ink-3">No tokens found.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-divider">
            <table className="w-full text-sm">
              <thead className="bg-canvas">
                <tr>
                  {['Token', 'Shop', 'Tier', 'Label', 'Created', 'Status', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-ink-3 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-divider-light">
                {tokens.map((t) => (
                  <>
                    <tr key={t.token} className={`hover:bg-surface-warm ${t.status === 'revoked' ? 'opacity-40' : ''}`}>
                      {/* Token — expandable */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-xs text-ink-3">
                            {expandedToken === t.token ? t.token : `${t.token.slice(0, 20)}…`}
                          </code>
                          <CopyButton value={t.token} size="xs" />
                          <button
                            onClick={() => setExpandedToken(expandedToken === t.token ? null : t.token)}
                            className="text-[10px] text-ink-3 hover:text-ink underline"
                          >
                            {expandedToken === t.token ? 'hide' : 'show'}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ink text-xs whitespace-nowrap">{t.shop}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${tierColors[t.tier] ?? 'bg-surface-warm text-ink-2'}`}>
                          {t.tier}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-ink-3 text-xs">{t.label || '—'}</td>
                      <td className="px-4 py-3 text-ink-3 text-xs whitespace-nowrap">
                        {new Date(t.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          t.status === 'active' ? 'bg-sage-bg text-sage' : 'bg-red-soft-bg text-red-soft'
                        }`}>{t.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        {t.status === 'active' && (
                          <button onClick={() => handleRevoke(t.token, t.shop)}
                            className="text-xs text-red-soft hover:underline">
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
