/**
 * useSubscription
 *
 * Fetches the current user's subscription status from the backend API
 * (which uses the service_role key to bypass RLS).
 *
 * Returns:
 *   hasAccess  — true if user has admin/demo role OR active/trialing subscription
 *   isLoading  — true while fetching
 *   plan       — 'starter' | 'standard' | 'pro' | 'enterprise' | legacy 'growth' | null
 *   status     — Stripe subscription status or null
 */
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'

export type SubscriptionPlan = 'starter' | 'standard' | 'pro' | 'enterprise' | 'growth' | 'trial' | 'admin' | null
export type SubscriptionStatusValue =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'paused'
  | 'incomplete'
  | null

interface SubscriptionState {
  hasAccess: boolean
  isLoading: boolean
  plan: SubscriptionPlan
  status: SubscriptionStatusValue
}

const ACCESS_STATUSES = ['trialing', 'active', 'past_due']

function getCheckoutSessionId(): string | null {
  if (typeof window === 'undefined') return null

  const rawSearch = window.location.search || ''
  const params = new URLSearchParams(rawSearch)
  const sessionId = params.get('session_id')
  if (sessionId) return sessionId

  // Backward-compatible parser for older malformed redirects like
  // ?subscription=success?session_id=cs_...
  const legacyMatch = rawSearch.match(/[?&]subscription=success\?session_id=([^&]+)/)
  return legacyMatch ? decodeURIComponent(legacyMatch[1]) : null
}

export function useSubscription(
  userId: string | undefined,
  role: string | null,
): SubscriptionState {
  const [state, setState] = useState<SubscriptionState>({
    hasAccess: false,
    isLoading: true,
    plan: null,
    status: null,
  })

  useEffect(() => {
    if (!userId) {
      // Keep isLoading=true when userId is not yet known (role still resolving)
      // Only set isLoading=false when we're sure there's no userId coming
      return
    }

    // admin/demo/staff always have access — no need to check subscription
    if (role === 'admin' || role === 'demo' || role === 'staff') {
      setState({ hasAccess: true, isLoading: false, plan: null, status: null })
      return
    }

    // Skip subscription re-check when role is null (role is mid-refresh).
    // The dependency on role is needed so we re-run when role first arrives,
    // but subsequent null→value cycles (TOKEN_REFRESHED) should not re-trigger.
    if (role === null) return

    // Reset to loading immediately when userId becomes available
    setState(prev =>
      prev.isLoading ? prev : { hasAccess: false, isLoading: true, plan: null, status: null }
    )

    let mounted = true
    const MAX_RETRIES = 8
    const RETRY_DELAY_MS = 2000

    const checkSubscription = async (attempt = 0): Promise<void> => {
      try {
        const result = await api.getSubscription(userId)

        if (!mounted) return

        const sub = result.data?.subscription
        if (sub && ACCESS_STATUSES.includes(sub.status)) {
          setState({
            hasAccess: true,
            isLoading: false,
            plan: sub.plan as SubscriptionPlan,
            status: sub.status as SubscriptionStatusValue,
          })
          return
        }

        // No active subscription found yet — retry if we have attempts left
        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS))
          if (mounted) await checkSubscription(attempt + 1)
        } else {
          if (mounted) setState({ hasAccess: false, isLoading: false, plan: null, status: null })
        }
      } catch {
        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS))
          if (mounted) await checkSubscription(attempt + 1)
        } else {
          if (mounted) setState({ hasAccess: false, isLoading: false, plan: null, status: null })
        }
      }
    }

    const syncCheckoutAndCheck = async (): Promise<void> => {
      const sessionId = getCheckoutSessionId()
      if (sessionId) {
        try {
          await api.syncCheckoutSession({ user_id: userId, session_id: sessionId })
        } catch {
          // The Stripe webhook is still the source of truth; polling below is
          // the fallback when the browser replay cannot complete.
        }
      }
      if (mounted) await checkSubscription()
    }

    // If arriving from Stripe checkout success, start with a short delay
    // then replay the session as a webhook fallback before polling.
    const isFromCheckout =
      typeof window !== 'undefined' &&
      (window.location.search.includes('subscription=success') || Boolean(getCheckoutSessionId()))

    if (isFromCheckout) {
      setTimeout(() => { if (mounted) void syncCheckoutAndCheck() }, 500)
    } else {
      void checkSubscription()
    }

    return () => { mounted = false }
  }, [userId, role])

  return state
}
