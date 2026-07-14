'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import { useState, useEffect } from 'react'
import { ArrowRight, LogOut, Sparkles, CheckCircle2, MessageSquare, RefreshCw } from 'lucide-react'

const ACCESS_STATUSES = ['trialing', 'active', 'past_due']

const TRIAL_HIGHLIGHTS = [
  'GEO Audit — see exactly how AI platforms perceive you',
  'Brand monitoring across 20+ AI channels',
  'Content & Distribution optimization tools',
  '100M+ source proprietary index',
]

export default function UnauthorizedPage() {
  const { user, signOut } = useAuth()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [recovering, setRecovering] = useState(false)
  const [recoveryFailed, setRecoveryFailed] = useState(false)

  // Read session_id from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sid = params.get('session_id')
    setSessionId(sid)
    if (sid) setRecovering(true)
  }, [])

  // Auto-recover: when we have a session_id (user just came from Stripe checkout),
  // replay the sync and poll the subscription before giving up with the paywall.
  useEffect(() => {
    if (!sessionId || !user?.id) return
    let mounted = true

    const run = async () => {
      await new Promise(r => setTimeout(r, 500))
      if (!mounted) return

      // Replay checkout sync — same fallback the onboarding page runs
      try {
        await api.syncCheckoutSession({ user_id: user.id, session_id: sessionId })
      } catch {}

      // Poll for subscription (8 × 2s = 16s window for webhook to arrive)
      for (let i = 0; i < 8; i++) {
        if (!mounted) return
        try {
          const result = await api.getSubscription(user.id)
          const sub = result.data?.subscription
          if (sub && ACCESS_STATUSES.includes(sub.status)) {
            if (mounted) window.location.href = '/dashboard/analysis'
            return
          }
        } catch {}
        await new Promise(r => setTimeout(r, 2000))
      }

      if (mounted) {
        setRecovering(false)
        setRecoveryFailed(true)
      }
    }

    run()
    return () => { mounted = false }
  }, [sessionId, user?.id])

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/login'
  }

  // ── Recovery spinner ──────────────────────────────────────────────────────
  if (recovering) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col">
        <nav className="px-6 py-4 sm:px-10">
          <Link href="/" className="inline-block hover:opacity-80 transition-opacity">
            <Image src="/landing/alignment-logo-final.svg" alt="Alignment AI" width={140} height={46} className="object-contain" priority />
          </Link>
        </nav>
        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="max-w-lg w-full text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-ink rounded-2xl flex items-center justify-center shadow-lg">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-ink mb-3">Activating your subscription…</h1>
            <p className="text-ink-3 leading-relaxed mb-8">
              Your payment was received. We&apos;re syncing your account — this takes a few seconds.
            </p>
            <div className="flex items-center justify-center gap-2 text-ink-3">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-sm">Syncing subscription…</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Paywall (normal path or recovery failed) ──────────────────────────────
  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <nav className="px-6 py-4 sm:px-10">
        <Link href="/" className="inline-block hover:opacity-80 transition-opacity">
          <Image src="/landing/alignment-logo-final.svg" alt="Alignment AI" width={140} height={46} className="object-contain" priority />
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-lg w-full text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-ink rounded-2xl flex items-center justify-center shadow-lg">
            <Sparkles className="w-10 h-10 text-white" />
          </div>

          <h1 className="text-2xl font-bold text-ink mb-3">
            {recoveryFailed ? 'Payment Received — Action Required' : 'Start Your 7-Day Free Trial'}
          </h1>

          {user?.email && (
            <p className="text-ink-3 text-sm mb-2">
              Signed in as <span className="font-medium text-ink-2">{user.email}</span>
            </p>
          )}

          <p className="text-ink-3 leading-relaxed mb-6">
            {recoveryFailed
              ? 'Your payment was received but we couldn\'t activate your account automatically. Please contact support and we\'ll sort it out immediately.'
              : 'A subscription is required to access the dashboard. Start with a 7-day trial, then manage billing from Settings.'}
          </p>

          <div className="bg-surface border border-divider-light rounded-2xl p-5 mb-6 text-left shadow-sm">
            <p className="text-xs font-semibold text-ink-3 uppercase tracking-wider mb-3">What you get</p>
            <ul className="space-y-2.5">
              {TRIAL_HIGHLIGHTS.map((item, i) => (
                <li key={i} className="flex items-center gap-2.5 text-sm text-ink-2">
                  <CheckCircle2 className="w-4 h-4 text-sage flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            {recoveryFailed ? (
              <a
                href="mailto:support@alignmenttech.ai?subject=Subscription%20Activation%20Issue"
                className="w-full inline-flex items-center justify-center gap-2 bg-ink hover:bg-[#2d2d2c] text-ink-inv font-semibold py-3.5 px-6 rounded-xl transition-all shadow-sm hover:shadow-md"
              >
                Contact Support
                <ArrowRight className="w-4 h-4" />
              </a>
            ) : (
              <Link
                href="/pricing"
                className="w-full inline-flex items-center justify-center gap-2 bg-ink hover:bg-[#2d2d2c] text-ink-inv font-semibold py-3.5 px-6 rounded-xl transition-all shadow-sm hover:shadow-md"
              >
                Start Free Trial
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}

            <div className="flex gap-3">
              <Link
                href="/contact"
                className="flex-1 inline-flex items-center justify-center gap-2 bg-surface hover:bg-surface-warm border border-divider text-ink-2 font-medium py-3 px-4 rounded-xl transition-all text-sm"
              >
                <MessageSquare className="w-4 h-4" />
                Talk to Sales
              </Link>

              <button
                onClick={handleSignOut}
                className="inline-flex items-center justify-center gap-2 bg-surface hover:bg-surface-warm border border-divider text-ink-3 font-medium py-3 px-4 rounded-xl transition-all text-sm"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>

          <p className="text-xs text-ink-3 mt-5">
            Looking for Managed Service?{' '}
            <Link href="/contact" className="text-red-soft hover:text-red-soft underline">Contact our team</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
