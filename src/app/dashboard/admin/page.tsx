'use client'

import { useState, useCallback } from 'react'
import { api, CreditBalance } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'

interface UserSearchResult {
  id: string
  email: string
  created_at: string
  user_metadata?: { full_name?: string; company_name?: string }
}

export default function AdminPanel() {
  const { role } = useAuth()
  const [email, setEmail] = useState('')
  const [userId, setUserId] = useState('')
  const [userInfo, setUserInfo] = useState<UserSearchResult | null>(null)
  const [credits, setCredits] = useState<CreditBalance | null>(null)
  const [subInfo, setSubInfo] = useState<import('@/lib/api').SubscriptionStatus | null>(null)
  const [grantAmount, setGrantAmount] = useState(500)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [loading, setLoading] = useState(false)

  if (role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500 text-lg">Admin access required.</p>
      </div>
    )
  }

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text })
    setTimeout(() => setFeedback(null), 5000)
  }

  const lookupUser = async () => {
    if (!email.trim()) return
    setLoading(true)
    setUserInfo(null)
    setCredits(null)
    setSubInfo(null)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/admin/lookup-user?email=${encodeURIComponent(email.trim())}`)
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
    } finally {
      setLoading(false)
    }
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
    } finally {
      setLoading(false)
    }
  }

  const handleResetUser = async () => {
    if (!userId) return
    if (!confirm('This will DELETE all subscription, usage, and onboarding data. Continue?')) return
    setLoading(true)
    try {
      const res = await api.adminResetUser(userId)
      if (res.data?.success) {
        setSubInfo(null)
        setCredits(null)
        showFeedback('success', 'User reset to new-user state.')
      }
    } catch (e: unknown) {
      showFeedback('error', (e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const planColors: Record<string, string> = {
    starter: 'bg-gray-100 text-gray-700',
    growth: 'bg-blue-100 text-blue-700',
    enterprise: 'bg-purple-100 text-purple-700',
    trial: 'bg-emerald-100 text-emerald-700',
  }

  return (
    <div className="max-w-3xl mx-auto p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-sm text-gray-500 mt-1">Manage users, credits, and subscriptions for testing.</p>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`p-3 rounded-xl text-sm font-medium ${
          feedback.type === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {feedback.text}
        </div>
      )}

      {/* User Lookup */}
      <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">User Lookup</h2>
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
            onKeyDown={(e) => e.key === 'Enter' && lookupUser()}
          />
          <button
            onClick={lookupUser}
            disabled={loading || !email.trim()}
            className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {userInfo && (
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{userInfo.user_metadata?.full_name || userInfo.email}</p>
                <p className="text-xs text-gray-500">{userInfo.email}</p>
              </div>
              <span className="text-xs text-gray-400 font-mono">{userInfo.id.slice(0, 8)}...</span>
            </div>
            <p className="text-xs text-gray-400">
              Registered: {new Date(userInfo.created_at).toLocaleDateString()}
            </p>
          </div>
        )}
      </section>

      {/* Subscription Info */}
      {userInfo && (
        <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Subscription Status</h2>
          {subInfo ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Plan</p>
                <span className={`inline-block mt-1 px-3 py-1 text-xs font-semibold rounded-full ${planColors[subInfo.plan] ?? 'bg-gray-100 text-gray-700'}`}>
                  {subInfo.plan.toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <p className="font-medium text-gray-900 mt-1 capitalize">{subInfo.status}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Billing</p>
                <p className="font-medium text-gray-900 mt-1">{subInfo.billing_interval}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Stripe Customer ID</p>
                <p className="font-medium text-gray-900 mt-1 font-mono text-xs">N/A</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No active subscription.</p>
          )}
        </section>
      )}

      {/* Credit Management */}
      {userInfo && (
        <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Credit Management</h2>

          {credits ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500">Plan Limit</p>
                <p className="text-2xl font-bold text-gray-900">{credits.credits_limit === -1 ? 'Unlimited' : credits.credits_limit.toLocaleString()}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500">Used</p>
                <p className="text-2xl font-bold text-red-600">{credits.credits_used.toLocaleString()}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500">Bonus Credits</p>
                <p className="text-2xl font-bold text-blue-600">{credits.credits_bonus.toLocaleString()}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500">Remaining</p>
                <p className={`text-2xl font-bold ${credits.credits_remaining <= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {credits.credits_remaining === -1 ? 'Unlimited' : credits.credits_remaining.toLocaleString()}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No usage data this period.</p>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={handleResetCredits}
              disabled={loading}
              className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-xl hover:bg-amber-700 disabled:opacity-50 transition-colors"
            >
              Reset Credits to 0
            </button>

            <div className="flex items-center gap-2">
              <input
                type="number"
                value={grantAmount}
                onChange={(e) => setGrantAmount(Number(e.target.value))}
                className="w-24 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-gray-900 outline-none"
                min={1}
              />
              <button
                onClick={handleGrantCredits}
                disabled={loading || grantAmount <= 0}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                Grant Credits
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Danger Zone */}
      {userInfo && (
        <section className="bg-red-50 rounded-2xl border border-red-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-red-900">Danger Zone</h2>
          <p className="text-sm text-red-700">
            Reset this user to a completely new state. This deletes all subscription, usage tracking,
            and onboarding email records. The user will need to re-subscribe and re-onboard.
          </p>
          <button
            onClick={handleResetUser}
            disabled={loading}
            className="px-5 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            Reset User (Delete All Data)
          </button>
        </section>
      )}

      {/* Credit Cost Reference */}
      <section className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Credit Cost Reference</h2>
        <div className="overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Operation</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Credits</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                ['GEO Audit (1 URL)', 10],
                ['Monitor Scan (per prompt)', 1],
                ['Competitor Scan', 3],
                ['Gap Analysis', 15],
                ['Intel Report', 25],
                ['Advanced Analysis', 5],
                ['Optimization Plan', 15],
                ['Apply Optimization', 5],
                ['Content Generate', 3],
                ['Content Validate', 1],
                ['Distribution Strategy', 5],
                ['Reddit Strategy', 10],
              ].map(([op, cost]) => (
                <tr key={op as string} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-gray-700">{op}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{cost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-xs text-gray-500 space-y-1">
          <p><span className="font-semibold">Trial:</span> 50 credits/month</p>
          <p><span className="font-semibold">Starter ($299/mo):</span> 300 credits/month</p>
          <p><span className="font-semibold">Growth ($599/mo):</span> 1,000 credits/month</p>
          <p><span className="font-semibold">Enterprise ($999/mo):</span> 5,000 credits/month</p>
        </div>
      </section>
    </div>
  )
}
