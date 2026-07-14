'use client'

import { useState, useEffect, Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import { Loader2, CheckCircle2, AlertCircle, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react'

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-ink border-t-transparent rounded-full" /></div>}>
      <ResetPasswordInner />
    </Suspense>
  )
}

function ResetPasswordInner() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [countdown, setCountdown] = useState(3)
  const [sessionReady, setSessionReady] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const supabase = getSupabase()
    if (!supabase) {
      setError('Supabase is not configured')
      setChecking(false)
      return
    }

    let resolved = false

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        resolved = true
        setSessionReady(true)
        setChecking(false)
      }
    })

    // With PKCE + detectSessionInUrl, Supabase auto-exchanges ?code= on init.
    // We wait up to 4s for the PASSWORD_RECOVERY event before falling back to
    // getSession() — this prevents the flash of "Invalid or Expired Link".
    const fallbackTimer = setTimeout(async () => {
      if (!resolved) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          resolved = true
          setSessionReady(true)
        }
        setChecking(false)
      }
    }, 4000)

    return () => {
      clearTimeout(fallbackTimer)
      subscription.unsubscribe()
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)
    const supabase = getSupabase()
    if (!supabase) {
      setError('Supabase is not configured')
      setIsLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        setError(error.message)
        setIsLoading(false)
        return
      }
      setSuccess(true)
      setIsLoading(false)
      // Countdown 3 → 2 → 1 then redirect
      let t = 3
      setCountdown(t)
      const cd = setInterval(() => {
        t -= 1
        setCountdown(t)
        if (t <= 0) { clearInterval(cd); router.push('/login') }
      }, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Branding Panel */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] relative flex-col justify-between p-10 overflow-hidden">
        <div className="absolute inset-0 bg-stripe-gradient" />
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="absolute top-0 left-0 w-[500px] h-[400px] bg-[#C84B31]/[0.08] rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[300px] bg-[#C84B31]/[0.06] rounded-full blur-[80px] pointer-events-none" />

        <div className="relative z-10">
          <Link href="/" className="inline-block hover:opacity-80 transition-opacity">
            <Image src="/landing/alignment-logo-final.svg" alt="Alignment AI" width={160} height={53} className="object-contain" priority />
          </Link>
        </div>

        <div className="relative z-10 -mt-10">
          <h2 className="text-3xl font-bold text-ink leading-tight mb-4">
            Secure your<br />
            <em className="not-italic text-ink underline underline-offset-4 decoration-2">account access.</em>
          </h2>
          <p className="text-ink-3 leading-relaxed">
            Choose a strong password to keep your Alignment AI account safe.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3 text-ink-3 text-xs">
          <ShieldCheck className="w-4 h-4 text-sage/70" />
          <span>SOC 2 Compliant · 256-bit Encryption · GDPR Ready</span>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 flex flex-col bg-canvas min-h-screen">
        <div className="flex items-center justify-between px-6 py-4 sm:px-10">
          <Link href="/" className="lg:hidden hover:opacity-80 transition-opacity">
            <Image src="/landing/alignment-logo-final.svg" alt="Alignment AI" width={120} height={40} className="object-contain" priority />
          </Link>
          <div />
        </div>

        <div className="flex-1 flex items-center justify-center px-6 sm:px-10">
          <div className="w-full max-w-[400px]">

            {checking ? (
              <div className="flex flex-col items-center gap-4 py-12">
                <Loader2 className="w-8 h-8 animate-spin text-ink" />
                <p className="text-ink-3 text-sm">Verifying reset link...</p>
              </div>
            ) : success ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-6 bg-sage-bg rounded-2xl flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-sage" />
                </div>
                <h1 className="text-2xl font-bold text-ink mb-2">Password Updated!</h1>
                <p className="text-ink-3 text-sm mb-4">
                  Your password has been reset successfully.
                </p>
                <p className="text-sm text-ink-3 mb-6">
                  Redirecting to sign in in <span className="font-semibold text-ink-2">{countdown}</span>s…
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm text-red-soft hover:text-red-soft font-medium transition-colors"
                >
                  Go to Sign In →
                </Link>
              </div>
            ) : !sessionReady ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-6 bg-red-soft-bg rounded-2xl flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-soft" />
                </div>
                <h1 className="text-2xl font-bold text-ink mb-2">Invalid or Expired Link</h1>
                <p className="text-ink-3 text-sm mb-6">
                  This password reset link is invalid or has expired. Please request a new one.
                </p>
                <div className="flex flex-col items-center gap-3">
                  <Link
                    href="/login?forgot=true"
                    className="w-full max-w-[220px] bg-ink hover:bg-[#2d2d2c] text-ink-inv font-medium py-2.5 px-4 rounded-xl transition-all text-sm text-center shadow-sm hover:shadow-md"
                  >
                    Request a new link
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 text-sm text-ink-3 hover:text-ink-2 transition-colors"
                  >
                    ← Back to Sign In
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <h1 className="text-2xl font-bold text-ink mb-1.5">Set new password</h1>
                  <p className="text-ink-3 text-sm">Enter your new password below</p>
                </div>

                {error && (
                  <div className="mb-5 p-3 bg-red-soft-bg border border-divider-light rounded-xl flex items-start gap-2.5 text-red-soft">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p className="text-sm leading-snug">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="newPassword" className="block text-xs font-medium text-ink-2 mb-1.5">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3" />
                      <input
                        id="newPassword"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-11 py-2.5 bg-surface-warm border border-divider-light rounded-xl text-sm focus:ring-2 focus:ring-ink/10 focus:border-ink focus:bg-surface transition-all outline-none"
                        required
                        minLength={6}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink-2 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-xs font-medium text-ink-2 mb-1.5">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3" />
                      <input
                        id="confirmPassword"
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-4 py-2.5 bg-surface-warm border border-divider-light rounded-xl text-sm focus:ring-2 focus:ring-ink/10 focus:border-ink focus:bg-surface transition-all outline-none"
                        required
                        minLength={6}
                      />
                    </div>
                    {confirmPassword && password !== confirmPassword && (
                      <p className="text-xs text-red-soft mt-1.5">Passwords do not match</p>
                    )}
                  </div>

                  <div className="text-xs text-ink-3 space-y-1">
                    <p className={password.length >= 6 ? 'text-sage' : ''}>
                      {password.length >= 6 ? '✓' : '○'} At least 6 characters
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || password.length < 6 || password !== confirmPassword}
                    className="w-full bg-ink hover:bg-[#2d2d2c] text-ink-inv font-medium py-2.5 px-4 rounded-xl transition-all text-sm flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md active:scale-[0.99]"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reset Password'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>

        <div className="px-6 py-4 sm:px-10 text-center">
          <p className="text-[11px] text-ink-3 leading-relaxed">
            By continuing, you agree to our{' '}
            <a href="#" className="underline hover:text-ink-2 transition-colors">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="underline hover:text-ink-2 transition-colors">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  )
}
