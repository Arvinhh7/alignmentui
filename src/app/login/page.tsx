'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useLanguage } from '@/lib/LanguageContext'
import { useAuth } from '@/hooks/useAuth'
import { getSupabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import LanguageSwitch from '@/components/LanguageSwitch'
import {
  Loader2, AlertCircle, CheckCircle2, Mail, Lock,
  Eye, EyeOff, ChevronDown, ShieldCheck, ArrowRight, User,
  MailCheck, RefreshCw,
} from 'lucide-react'
import { gaEvent } from '@/lib/gtag'

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  )
}

const REMEMBER_KEY = 'alignment_remember_session'

// ─── Social proof data ────────────────────────────────────────────────────────
const TESTIMONIALS = [
  {
    quote: 'Alignment AI helped us surface in ChatGPT and Perplexity recommendations within 3 weeks.',
    author: 'Sarah L.',
    role: 'Head of Marketing, SaaS Scale-up',
  },
  {
    quote: 'The GEO Audit revealed blind spots we never knew existed. Worth every dollar.',
    author: 'James T.',
    role: 'CMO, B2B Tech Company',
  },
]

// ─── Main Component ───────────────────────────────────────────────────────────
function LoginPageInner() {
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const {
    user, signIn, signUp, resetPassword,
    isAuthenticated, isLoading: authLoading, error: authError,
  } = useAuth()

  const fromROI    = searchParams.get('from') === 'roi'
  const fromAudit  = searchParams.get('from') === 'audit'
  const planParam  = searchParams.get('plan')
  const intervalParam  = searchParams.get('interval')
  const verifiedParam  = searchParams.get('verified') === 'true'
  const emailParam     = searchParams.get('email') || ''
  const domainParam    = searchParams.get('domain') || ''
  const signupParam    = searchParams.get('signup') === 'true'
  const forgotParam    = searchParams.get('forgot') === 'true'
  const referParam     = searchParams.get('refer') || ''

  const [isSignUp, setIsSignUp] = useState(false)
  const [isForgotPassword, setIsForgotPassword] = useState(forgotParam)
  const [checkInboxMode, setCheckInboxMode] = useState(false)
  const [checkInboxEmail, setCheckInboxEmail] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [alreadyRegisteredMsg, setAlreadyRegisteredMsg] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resetCooldown, setResetCooldown] = useState(0)
  const [resetResendLoading, setResetResendLoading] = useState(false)

  // Auto-fill email + switch to sign-in mode after email verification
  useEffect(() => {
    if (verifiedParam && emailParam) {
      setEmail(decodeURIComponent(emailParam))
      setIsSignUp(false)
      setShowEmailForm(true)
      setSuccessMessage('Email verified! Please sign in to continue.')
    }
  }, [verifiedParam, emailParam])

  useEffect(() => { if (fromROI) setIsSignUp(true) }, [fromROI])

  // Auto-fill email + switch to signup when arriving from the audit tool or any signup link
  useEffect(() => {
    if ((fromAudit || signupParam) && !verifiedParam) {
      setIsSignUp(true)
      if (emailParam) {
        setEmail(decodeURIComponent(emailParam))
        setShowEmailForm(true)
      }
    }
  }, [fromAudit, signupParam, verifiedParam, emailParam])

  useEffect(() => {
    if (authError) { setError(authError); setIsSubmitting(false) }
  }, [authError])

  // Referral link (?refer=CODE): persist the code through the email-verification
  // round trip and default to signup mode. Attribution is recorded post-auth in
  // onboarding once the new user has an id.
  useEffect(() => {
    if (referParam) {
      try { localStorage.setItem('pending_refer', referParam) } catch {}
      setIsSignUp(true)
    }
  }, [referParam])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const qp = new URLSearchParams(window.location.search)
    const qErr = qp.get('error_description') || qp.get('error')
    if (qErr) {
      setError(`Login failed: ${decodeURIComponent(qErr)}`)
      window.history.replaceState({}, '', window.location.pathname)
      return
    }
    const hashParams = new URLSearchParams(window.location.hash.replace('#', ''))
    const hErr = hashParams.get('error_description') || hashParams.get('error')
    if (hErr) {
      setError(`Login failed: ${decodeURIComponent(hErr)}`)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  // Already authenticated → redirect
  useEffect(() => {
    if (authLoading || !isAuthenticated || !user) return

    if (planParam && planParam !== 'enterprise') {
      api.createCheckoutSession({
        user_id: user.id,
        user_email: user.email ?? '',
        plan: planParam,
        billing_interval: (intervalParam === 'year' ? 'year' : 'month') as 'month' | 'year',
      }).then(result => {
        if (result.data?.checkout_url) {
          window.location.href = result.data.checkout_url
        } else {
          window.location.href = '/pricing?checkout_error=1'
        }
      }).catch(() => {
        window.location.href = '/pricing?checkout_error=1'
      })
      return
    }

    // After email verification:
    // — product users enter the Brand Hub-led setup flow
    // — everyone else goes to pricing to choose a plan
    if (verifiedParam) {
      window.location.href = fromAudit ? '/dashboard' : '/pricing'
      return
    }

    window.location.href = '/dashboard'
  }, [authLoading, isAuthenticated, user, planParam, intervalParam, verifiedParam, fromAudit])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null); setSuccessMessage(null); setAlreadyRegisteredMsg(false); setIsSubmitting(true)
    try {
      if (isSignUp) {
        // Build the verification-email callback URL, preserving any flow context
        let redirectTo: string | undefined
        if (typeof window !== 'undefined') {
          const cbParams = new URLSearchParams({ verified: 'true', email })
          if (fromAudit) cbParams.set('from', 'audit')
          else if (fromROI) cbParams.set('from', 'roi')
          if (planParam) {
            cbParams.set('plan', planParam)
            if (intervalParam) cbParams.set('interval', intervalParam)
          }
          redirectTo = `${window.location.origin}/login?${cbParams.toString()}`
        }
        const result = await signUp(email, password, { full_name: fullName }, redirectTo)

        if (result === 'already_registered') {
          // Switch to Sign In mode and show an amber notice with the email pre-filled
          setIsSignUp(false)
          setShowEmailForm(true)
          setAlreadyRegisteredMsg(true)
          setIsSubmitting(false)
          return
        }
        if (result === 'verify') {
          // Email verification required → show "Check Your Inbox" view
          setCheckInboxEmail(email)
          setCheckInboxMode(true)
          setIsSubmitting(false)
          return
        }
        if (result === true) {
          if (rememberMe) localStorage.setItem(REMEMBER_KEY, 'true')
          else sessionStorage.setItem(REMEMBER_KEY, 'true')
          gaEvent('sign_up', { method: 'email' })
          if (fromAudit) {
            window.location.href = '/dashboard'
          } else if (fromROI) {
            window.location.href = '/roi-simulator?unlock=true'
          } else if (planParam && planParam !== 'enterprise') {
            setIsSubmitting(false)
            setSuccessMessage('Account created! Starting your free trial now…')
          } else {
            window.location.href = '/onboarding'
          }
        } else {
          setIsSubmitting(false)
        }
      } else {
        const ok = await signIn(email, password)
        if (ok) {
          if (rememberMe) localStorage.setItem(REMEMBER_KEY, 'true')
          else sessionStorage.setItem(REMEMBER_KEY, 'true')
          if (!fromROI && !planParam) {
            window.location.href = verifiedParam ? '/pricing' : '/dashboard'
          } else if (fromROI) {
            window.location.href = '/roi-simulator?unlock=true'
          }
        } else {
          setIsSubmitting(false)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setIsSubmitting(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) { setError('Please enter your email address'); return }
    setError(null); setSuccessMessage(null); setIsSubmitting(true)
    try {
      const ok = await resetPassword(email)
      setIsSubmitting(false)
      if (ok) {
        setSuccessMessage('Password reset link sent! Check your email inbox.')
        // Start 90s resend cooldown
        setResetCooldown(90)
        const interval = setInterval(() => {
          setResetCooldown(prev => {
            if (prev <= 1) { clearInterval(interval); return 0 }
            return prev - 1
          })
        }, 1000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email')
      setIsSubmitting(false)
    }
  }

  const handleResendReset = async () => {
    if (resetResendLoading || resetCooldown > 0 || !email.trim()) return
    setResetResendLoading(true)
    setError(null)
    try {
      const ok = await resetPassword(email)
      if (ok) {
        setSuccessMessage('Reset link resent! Check your email inbox.')
        setResetCooldown(90)
        const interval = setInterval(() => {
          setResetCooldown(prev => {
            if (prev <= 1) { clearInterval(interval); return 0 }
            return prev - 1
          })
        }, 1000)
      }
    } catch { /* ignore */ }
    setResetResendLoading(false)
  }

  const handleOAuth = async (provider: 'google' | 'azure') => {
    const supabase = getSupabase()
    if (!supabase) { setError('Supabase is not configured.'); return }
    setError(null); setOauthLoading(provider)
    try {
      let redirectTo: string
      if (fromAudit) {
        redirectTo = `${window.location.origin}/dashboard`
      } else if (fromROI) {
        redirectTo = `${window.location.origin}/roi-simulator?unlock=true`
      } else if (planParam) {
        const params = new URLSearchParams({ plan: planParam })
        if (intervalParam) params.set('interval', intervalParam)
        redirectTo = `${window.location.origin}/login?${params.toString()}`
      } else {
        redirectTo = `${window.location.origin}/login`
      }
      const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } })
      if (error) { setError(error.message); setOauthLoading(null) }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OAuth sign-in failed')
      setOauthLoading(null)
    }
  }

  const handleResendVerification = useCallback(async () => {
    const supabase = getSupabase()
    if (!supabase || resendLoading || resendCooldown > 0 || !checkInboxEmail) return
    setResendLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: checkInboxEmail })
      if (error) { setError(error.message) }
      else {
        setSuccessMessage('Verification email resent!')
        setResendCooldown(60)
        const interval = setInterval(() => {
          setResendCooldown(prev => {
            if (prev <= 1) { clearInterval(interval); return 0 }
            return prev - 1
          })
        }, 1000)
      }
    } catch {
      setError('Failed to resend. Please try again.')
    } finally {
      setResendLoading(false)
    }
  }, [resendLoading, resendCooldown, checkInboxEmail])

  const anyLoading = isSubmitting || !!oauthLoading
  // ─── Check Inbox View ──────────────────────────────────────────────────────
  if (checkInboxMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas px-6">
        <div className="w-full max-w-[400px] text-center">
          <Link href="/" className="inline-block mb-8 hover:opacity-80 transition-opacity">
            <Image src="/landing/alignment-logo-final.svg" alt="Alignment AI" width={140} height={47} className="object-contain mx-auto" priority />
          </Link>

          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-ink flex items-center justify-center shadow-lg">
            <MailCheck className="w-8 h-8 text-ink-inv" />
          </div>

          <h1 className="text-2xl font-bold text-ink mb-2">Check your inbox</h1>
          <p className="text-ink-3 text-sm leading-relaxed mb-1">
            We sent a confirmation link to:
          </p>
          <p className="text-ink font-semibold text-sm mb-6 break-all">{checkInboxEmail}</p>

          <div className="bg-caution-bg border border-caution-bg rounded-xl p-4 mb-6 text-left">
            <p className="text-caution text-xs leading-relaxed">
              <strong>Next step:</strong> Click the link in your email to verify your account. After verification, you&apos;ll be redirected to sign in and{' '}
              {fromAudit ? 'access your full audit report in the dashboard.' : 'choose your plan.'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-soft-bg border border-red-soft-bg rounded-xl flex items-start gap-2 text-red-soft">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}
          {successMessage && (
            <div className="mb-4 p-3 bg-sage-bg border border-sage-bg rounded-xl flex items-start gap-2 text-sage">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{successMessage}</p>
            </div>
          )}

          <button
            onClick={handleResendVerification}
            disabled={resendLoading || resendCooldown > 0}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-divider rounded-xl text-sm text-ink-2 hover:bg-surface-warm hover:border-divider transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-3">
            {resendLoading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <RefreshCw className="w-4 h-4" />}
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend verification email'}
          </button>

          <button
            onClick={() => { setCheckInboxMode(false); setEmail(checkInboxEmail); setIsSignUp(false); setShowEmailForm(true); setError(null); setSuccessMessage(null) }}
            className="text-xs text-ink-3 hover:text-ink-2 transition-colors">
            Wrong email? Go back
          </button>
        </div>
      </div>
    )
  }

  // ─── Main Login / Sign Up View ─────────────────────────────────────────────
  return (
    <div className="min-h-screen flex bg-canvas">

      {/* ════ Left Branding ════ */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] relative flex-col justify-between p-10 overflow-hidden bg-ink text-ink-inv">

        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center hover:opacity-80 transition-opacity">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/landing/alignment-logo-final.svg" alt="Alignment AI" width={160} height={53} className="object-contain" />
          </Link>
        </div>

        <div className="relative z-10 -mt-10">
          <h2 className="text-3xl font-bold text-ink-inv leading-tight mb-4">
            Build your brand&apos;s<br />
            AI visibility moat.
          </h2>
          <p className="text-ink-inv/70 leading-relaxed mb-6">
            The complete GEO platform — from diagnosis to monitoring.
            Optimize how AI platforms see, cite, and recommend your brand.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { value: '5', label: 'GEO Modules' },
              { value: '20+', label: 'AI Channels' },
              { value: '100M+', label: 'Source Index' },
            ].map((stat, i) => (
              <div key={i} className="bg-surface-muted/10 border border-divider-light/20 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold font-mono text-ink-inv">{stat.value}</div>
                <div className="text-[11px] text-ink-inv/60 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Testimonials */}
          <div className="space-y-3">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="bg-surface-muted/10 border border-divider-light/20 rounded-xl p-4">
                <p className="text-sm text-ink-inv/80 leading-relaxed mb-2">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-surface-muted flex items-center justify-center text-ink text-[10px] font-bold">
                    {t.author[0]}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-ink-inv">{t.author}</p>
                    <p className="text-[10px] text-ink-inv/50">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-3 text-ink-inv/50 text-xs">
          <ShieldCheck className="w-4 h-4 text-ink-inv/50" />
          <span>SOC 2 Compliant · 256-bit Encryption · GDPR Ready</span>
        </div>
      </div>

      {/* ════ Right Form ════ */}
      <div className="flex-1 flex flex-col bg-canvas min-h-screen">
        <div className="flex items-center justify-between px-6 py-4 sm:px-10">
          <Link href="/" className="lg:hidden hover:opacity-80 transition-opacity">
            <Image src="/landing/alignment-logo-final.svg" alt="Alignment AI" width={120} height={40} className="object-contain" priority />
          </Link>
          <div className="hidden lg:block" />
          <LanguageSwitch />
        </div>

        <div className="flex-1 flex items-center justify-center px-6 sm:px-10">
          <div className="w-full max-w-[400px]">

            {/* Title */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-ink mb-1.5">
                {isForgotPassword ? 'Reset your password'
                  : isSignUp ? 'Create your account'
                  : t.login.welcome}
              </h1>
              <p className="text-ink-3 text-sm">
                {isForgotPassword ? "Enter your email and we'll send you a reset link"
                  : fromAudit ? 'Create a free account to unlock your full audit report'
                  : fromROI ? 'Sign up for free to unlock your ROI results'
                  : isSignUp ? 'Start your 7-day free trial'
                  : t.login.signInTo}
              </p>
            </div>

            {/* Email verified success banner */}
            {verifiedParam && !error && (
              <div className="mb-5 p-3 bg-sage-bg border border-sage-bg rounded-xl flex items-start gap-2.5 text-sage">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Email verified!</p>
                  <p className="text-xs text-sage mt-0.5">
                    {fromAudit
                      ? 'Sign in below to access your full audit report in the dashboard.'
                      : 'Sign in below to choose your plan and get started.'}
                  </p>
                </div>
              </div>
            )}

            {fromAudit && !isForgotPassword && (
              <div className="mb-6 flex items-center gap-3 px-4 py-3 bg-surface-warm border border-divider-light rounded-xl">
                <div className="flex-shrink-0 w-8 h-8 bg-ink rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-ink-inv" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-sm text-ink-2">
                  Your AI Visibility audit is ready!
                  {domainParam && <span className="font-medium"> ({domainParam})</span>}
                  {' '}Create a free account to unlock the full report in your dashboard.
                </p>
              </div>
            )}

            {fromROI && !isForgotPassword && (
              <div className="mb-6 flex items-center gap-3 px-4 py-3 bg-surface-warm border border-divider-light rounded-xl">
                <div className="flex-shrink-0 w-8 h-8 bg-ink rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-ink-inv" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-sm text-ink-2">Your ROI calculation is ready! Create a free account to see your results.</p>
              </div>
            )}

            {error && (
              <div className="mb-5 p-3 bg-red-soft-bg border border-red-soft-bg rounded-xl flex items-start gap-2.5 text-red-soft">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p className="text-sm leading-snug">{error}</p>
              </div>
            )}
            {successMessage && !verifiedParam && (
              <div className="mb-5 p-3 bg-sage-bg border border-sage-bg rounded-xl flex items-start gap-2.5 text-sage">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p className="text-sm leading-snug">{successMessage}</p>
              </div>
            )}
            {alreadyRegisteredMsg && (
              <div className="mb-5 p-3 bg-caution-bg border border-caution-bg rounded-xl flex items-start gap-2.5 text-caution">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-caution" />
                <div className="text-sm leading-snug">
                  <p className="font-medium mb-0.5">This email is already registered.</p>
                  <p>
                    Sign in below, or{' '}
                    <button
                      type="button"
                      className="underline font-medium hover:text-ink transition-colors"
                      onClick={() => { setIsForgotPassword(true); setAlreadyRegisteredMsg(false); setError(null) }}
                    >
                      reset your password
                    </button>
                    {' '}if you&apos;ve forgotten it.
                  </p>
                </div>
              </div>
            )}

            {/* ── Forgot password ── */}
            {isForgotPassword ? (
              <div className="space-y-4">
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label htmlFor="resetEmail" className="block text-xs font-medium text-ink-2 mb-1.5">{t.login.email}</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3" />
                      <input id="resetEmail" type="email" value={email} required
                        onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com"
                        className="w-full pl-10 pr-4 border border-divider rounded-xl bg-surface px-4 py-3 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink transition-colors" />
                    </div>
                  </div>
                  <button type="submit" disabled={isSubmitting}
                    className="w-full bg-ink hover:bg-[#2d2d2c] text-ink-inv font-medium py-2.5 px-4 rounded-xl transition-all text-sm flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md">
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Reset Link'}
                  </button>
                </form>
                {/* Resend button — visible after first send */}
                {resetCooldown > 0 || (successMessage && successMessage.includes('reset')) ? (
                  <button
                    type="button"
                    onClick={handleResendReset}
                    disabled={resetResendLoading || resetCooldown > 0}
                    className="w-full py-2 text-xs text-ink-3 hover:text-ink-2 disabled:text-ink-3 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5"
                  >
                    {resetResendLoading ? (
                      <><Loader2 className="w-3 h-3 animate-spin" /> Resending…</>
                    ) : resetCooldown > 0 ? (
                      `Resend in ${resetCooldown}s`
                    ) : (
                      'Resend reset link'
                    )}
                  </button>
                ) : null}
                <button type="button"
                  onClick={() => { setIsForgotPassword(false); setError(null); setSuccessMessage(null); setResetCooldown(0) }}
                  className="w-full text-center text-xs text-ink-3 hover:text-ink-2 transition-colors">
                  ← Back to Sign In
                </button>
              </div>
            ) : (
              <>
                {/* ── OAuth ── */}
                <div className="space-y-3 mb-6">
                  <button type="button" onClick={() => handleOAuth('google')} disabled={anyLoading}
                    className="w-full flex items-center justify-center gap-3 bg-surface hover:bg-surface-warm border border-divider hover:border-ink text-ink font-medium py-3 px-4 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-[0.99] group disabled:opacity-50">
                    {oauthLoading === 'google'
                      ? <Loader2 className="w-5 h-5 animate-spin text-ink-3" />
                      : <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>}
                    <span className="text-sm">Continue with Google</span>
                    <ArrowRight className="w-4 h-4 text-ink-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all ml-auto" />
                  </button>

                  <button type="button" onClick={() => handleOAuth('azure')} disabled={anyLoading}
                    className="w-full flex items-center justify-center gap-3 bg-surface hover:bg-surface-warm border border-divider hover:border-ink text-ink font-medium py-3 px-4 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-[0.99] group disabled:opacity-50">
                    {oauthLoading === 'azure'
                      ? <Loader2 className="w-5 h-5 animate-spin text-ink-3" />
                      : <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                          <rect x="1" y="1" width="10" height="10" fill="#F25022" />
                          <rect x="13" y="1" width="10" height="10" fill="#7FBA00" />
                          <rect x="1" y="13" width="10" height="10" fill="#00A4EF" />
                          <rect x="13" y="13" width="10" height="10" fill="#FFB900" />
                        </svg>}
                    <span className="text-sm">Continue with Microsoft</span>
                    <ArrowRight className="w-4 h-4 text-ink-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all ml-auto" />
                  </button>
                </div>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-divider-light" /></div>
                  <div className="relative flex justify-center">
                    <button type="button" onClick={() => setShowEmailForm(!showEmailForm)}
                      className="px-4 py-1 bg-canvas text-ink-3 text-xs font-medium hover:text-ink-2 transition-colors flex items-center gap-1.5">
                      {t.login.orContinue} email
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showEmailForm ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Email form */}
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showEmailForm ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {isSignUp && (
                      <>
                        <div>
                          <label htmlFor="fullName" className="block text-xs font-medium text-ink-2 mb-1.5">Full Name</label>
                          <div className="relative">
                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3" />
                            <input id="fullName" type="text" value={fullName} required
                              onChange={(e) => setFullName(e.target.value)} placeholder="Your full name"
                              className="w-full pl-10 pr-4 border border-divider rounded-xl bg-surface py-3 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink transition-colors" />
                          </div>
                        </div>
                      </>
                    )}

                    <div>
                      <label htmlFor="email" className="block text-xs font-medium text-ink-2 mb-1.5">{t.login.email}</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3" />
                        <input id="email" type="email" value={email} required
                          onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com"
                          className="w-full pl-10 pr-4 border border-divider rounded-xl bg-surface py-3 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink transition-colors" />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="password" className="block text-xs font-medium text-ink-2 mb-1.5">{t.login.password}</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3" />
                        <input id="password" type={showPassword ? 'text' : 'password'}
                          value={password} required minLength={6}
                          onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                          className="w-full pl-10 pr-11 border border-divider rounded-xl bg-surface py-3 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink transition-colors" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink-2 transition-colors">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                    </div>

                    {!isSignUp && (
                      <div className="flex items-center justify-between">
                        <label className="flex items-center cursor-pointer">
                          <input type="checkbox" checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="w-3.5 h-3.5 rounded border-divider text-ink focus:ring-ink/10" />
                          <span className="ml-2 text-xs text-ink-3">{t.login.remember}</span>
                        </label>
                        <button type="button"
                          onClick={() => { setIsForgotPassword(true); setError(null); setSuccessMessage(null) }}
                          className="text-xs text-ink-2 hover:text-ink font-medium transition-colors">
                          {t.login.forgot}
                        </button>
                      </div>
                    )}

                    {/* Terms of Service checkbox — sign-up only */}
                    {isSignUp && (
                      <label className="flex items-start gap-2.5 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={agreedToTerms}
                          onChange={(e) => setAgreedToTerms(e.target.checked)}
                          className="mt-0.5 w-3.5 h-3.5 rounded border-divider text-ink focus:ring-ink/10 flex-shrink-0"
                        />
                        <span className="text-xs text-ink-3 leading-relaxed">
                          I agree to the{' '}
                          <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-ink-2 hover:text-ink underline">Terms of Service</a>
                          {' '}and{' '}
                          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-ink-2 hover:text-ink underline">Privacy Policy</a>.
                          7-day free trial, cancel anytime.
                        </span>
                      </label>
                    )}

                    <button type="submit" disabled={anyLoading || (isSignUp && !agreedToTerms)}
                      className="w-full bg-ink hover:bg-[#2d2d2c] text-ink-inv font-medium py-2.5 px-4 rounded-xl transition-all text-sm flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md active:scale-[0.99]">
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : isSignUp ? 'Create Account — Free Trial' : t.login.signIn}
                    </button>
                  </form>
                </div>

                <p className="text-center text-xs text-ink-3 mt-6">
                  {isSignUp ? 'Already have an account?' : t.login.noAccount}{' '}
                  <button type="button"
                    onClick={() => { setIsSignUp(!isSignUp); setShowEmailForm(true); setError(null); setSuccessMessage(null); setAlreadyRegisteredMsg(false); setAgreedToTerms(false) }}
                    className="text-ink hover:text-ink font-semibold transition-colors underline">
                    {isSignUp ? 'Sign In' : t.login.signUpFree}
                  </button>
                </p>
              </>
            )}
          </div>
        </div>

        <div className="px-6 py-4 sm:px-10 text-center">
          <p className="text-[11px] text-ink-3 leading-relaxed">
            By continuing, you agree to our{' '}
            <a href="/terms" className="underline hover:text-ink-2 transition-colors">Terms of Service</a>
            {' '}and{' '}
            <a href="/privacy" className="underline hover:text-ink-2 transition-colors">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  )
}
