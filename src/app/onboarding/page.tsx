'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api, customersApi } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { getSupabase } from '@/lib/supabase'
import {
  LEGACY_CUSTOMER_DATA_KEYS,
  activeCustomerStorageKey,
  customerCacheStorageKey,
} from '@/app/dashboard/geo-monitor/components/shared/constants'
import { ArrowRight, Globe, Home, Loader2, LogOut } from 'lucide-react'
import { gaEvent } from '@/lib/gtag'

const ONBOARDING_DONE_KEY = 'alignment_onboarding_done'
const ONBOARDING_SESSION_KEY = 'alignment_onboarding_session'
const ONBOARDING_VERSION = 5

function normalizeUrl(url: string) {
  if (!url.trim()) return ''
  const u = url.trim()
  return u.startsWith('http://') || u.startsWith('https://') ? u : `https://${u}`
}

function validateWebsiteUrl(url: string) {
  const normalized = normalizeUrl(url)
  if (!normalized) return 'Website URL is required.'
  try {
    const parsed = new URL(normalized)
    if (!parsed.hostname.includes('.')) return 'Please enter a valid URL (e.g. yourcompany.com)'
    return ''
  } catch {
    return 'Please enter a valid URL (e.g. yourcompany.com)'
  }
}

export default function OnboardingPage() {
  const router = useRouter()
  const { user, isLoading: authLoading, isAuthenticated, signOut } = useAuth()
  const [authChecked, setAuthChecked] = useState(false)
  const [brandName, setBrandName] = useState('')
  const [brandUrl, setBrandUrl] = useState('')
  const [brandNameError, setBrandNameError] = useState('')
  const [urlError, setUrlError] = useState('')
  const [isCompleting, setIsCompleting] = useState(false)
  const [completionError, setCompletionError] = useState('')
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleGoHome = useCallback(() => {
    window.location.href = '/'
  }, [])

  const handleLogout = useCallback(async () => {
    if (isSigningOut) return
    setIsSigningOut(true)
    try {
      localStorage.removeItem(ONBOARDING_SESSION_KEY)
      await signOut()
    } finally {
      window.location.replace('/login')
    }
  }, [isSigningOut, signOut])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('subscription') !== 'success') return
    try {
      const raw = localStorage.getItem('alignment_checkout_plan')
      if (raw) {
        const { plan, value, billing_interval } = JSON.parse(raw)
        gaEvent('purchase', {
          transaction_id: `stripe_${plan}_${Date.now()}`,
          value,
          currency: 'USD',
          items: [{ item_name: `Alignment ${plan}`, price: value }],
          billing_interval,
        })
        localStorage.removeItem('alignment_checkout_plan')
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated) {
      window.location.href = '/login'
      return
    }

    const check = async () => {
      const params = new URLSearchParams(window.location.search)
      const checkoutSessionId = params.get('session_id')
      if (user?.id && checkoutSessionId) {
        try {
          await api.syncCheckoutSession({ user_id: user.id, session_id: checkoutSessionId })
        } catch {
          // Stripe webhook remains the source of truth.
        }
      }

      const supabase = getSupabase()
      if (supabase && user) {
        const { data } = await supabase
          .from('profiles')
          .select('onboarding_completed, company, company_website')
          .eq('id', user.id)
          .single()
        if (data?.onboarding_completed) {
          const dest = checkoutSessionId
            ? `/dashboard/brand-hub?subscription=success&session_id=${encodeURIComponent(checkoutSessionId)}`
            : '/dashboard/brand-hub'
          window.location.href = dest
          return
        }
        if (data?.company) setBrandName(data.company)
        if (data?.company_website) setBrandUrl(data.company_website)
      }
      if (user?.user_metadata?.company_name) {
        setBrandName(prev => prev || user.user_metadata.company_name)
      }
      setAuthChecked(true)
    }

    check()
  }, [authLoading, isAuthenticated, user])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(ONBOARDING_SESSION_KEY)
      if (!saved) return
      const s = JSON.parse(saved)
      if (s._version !== ONBOARDING_VERSION) return
      if (s.brandName) setBrandName(s.brandName)
      if (s.brandUrl) setBrandUrl(s.brandUrl)
    } catch {}
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(ONBOARDING_SESSION_KEY, JSON.stringify({
        _version: ONBOARDING_VERSION,
        brandName,
        brandUrl,
      }))
    } catch {}
  }, [brandName, brandUrl])

  const handleComplete = useCallback(async () => {
    const bn = brandName.trim()
    const urlMessage = validateWebsiteUrl(brandUrl)
    setBrandNameError(bn ? '' : 'Brand Name is required.')
    setUrlError(urlMessage)
    setCompletionError('')
    if (!bn || urlMessage) return

    setIsCompleting(true)
    const du = normalizeUrl(brandUrl)

    try {
      for (const key of LEGACY_CUSTOMER_DATA_KEYS) localStorage.removeItem(key)
      localStorage.removeItem('geo_audit_session')
      localStorage.removeItem('geo_optimization_session')
      localStorage.removeItem('geo_content_session')
      localStorage.removeItem('geo_distribution_session')
    } catch {}

    let customerId: string | null = null
    try {
      if (user?.id) {
        const supabase = getSupabase()
        if (supabase) {
          await supabase.from('profiles').update({
            company: bn,
            company_website: du,
            updated_at: new Date().toISOString(),
          }).eq('id', user.id)
        }

        // One account == one brand: onboarding sets identity (name + domain) once.
        // Competitors are NOT seeded here — they are an OUTPUT of the scan
        // (auto-discovered from the brands the AI names), never a manual input.
        // Source seeds were removed from the model entirely.
        const customer = await customersApi.create(user.id, {
          brand_name: bn,
          domain: du,
          config_json: {
            keywords: [],
            industry: '',
            product_space: '',
            one_liner: '',
            target_audience: '',
            target_market: '',
            differentiation: '',
            onboarding: {
              version: ONBOARDING_VERSION,
              completed_from: 'brand_hub_profile',
            },
          },
        })
        customerId = customer.id
        localStorage.setItem(activeCustomerStorageKey(user.id), customer.id)
        const cache: Record<string, { brand_name: string; domain: string }> =
          JSON.parse(localStorage.getItem(customerCacheStorageKey(user.id)) || '{}')
        cache[customer.id] = { brand_name: bn, domain: du }
        localStorage.setItem(customerCacheStorageKey(user.id), JSON.stringify(cache))
      }
    } catch (err) {
      console.error('[Onboarding] customer creation failed:', err)
      setCompletionError('We could not create your customer workspace. Please try again.')
      setIsCompleting(false)
      return
    }

    try {
      if (user?.id) {
        const existingBrands = await api.getBrands()
        const alreadyExists = existingBrands.data?.find(
          (brand: { name: string; domain?: string }) =>
            brand.name.trim().toLowerCase() === bn.toLowerCase() || brand.domain === du,
        )
        if (!alreadyExists) await api.createBrand({ name: bn, domain: du, keywords: [] }, user.id)
      }
    } catch {}

    localStorage.setItem(ONBOARDING_DONE_KEY, 'true')
    try {
      const supabase = getSupabase()
      if (supabase && user) {
        await supabase.from('profiles').update({
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        }).eq('id', user.id)
      }
    } catch {}

    localStorage.removeItem(ONBOARDING_SESSION_KEY)
    const brandHubUrl = customerId
      ? `/dashboard/brand-hub?customer=${customerId}&url=${encodeURIComponent(du)}`
      : `/dashboard/brand-hub?url=${encodeURIComponent(du)}`
    router.push(brandHubUrl)
  }, [brandName, brandUrl, router, user])

  if (authLoading || !authChecked) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-ink border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-ink-3">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-canvas">
      <div className="w-full lg:w-[460px] xl:w-[500px] flex-shrink-0 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-divider-light">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-ink rounded-lg flex items-center justify-center">
              <span className="text-ink-inv text-xs font-bold">A</span>
            </div>
            <span className="font-semibold text-ink text-sm">Alignment Agent</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleGoHome}
              className="inline-flex items-center gap-1.5 rounded-lg border border-divider-light bg-surface px-3 py-2 text-xs font-semibold text-ink-2 transition-colors hover:bg-surface-warm hover:text-ink"
            >
              <Home className="h-3.5 w-3.5" />
              Homepage
            </button>
            <button
              onClick={handleLogout}
              disabled={isSigningOut}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-red-soft transition-colors hover:bg-red-soft-bg disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSigningOut ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
              {isSigningOut ? 'Logging out...' : 'Logout'}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-10">
          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">Brand Setup</p>
              <h1 className="mt-3 text-2xl font-bold text-ink">Set up your brand</h1>
              <p className="mt-2 text-sm leading-relaxed text-ink-3">
                Enter your brand and website. We will take you to Brand Hub to finish the Customer Intelligence Profile.
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-ink-2">
                  Brand Name <span className="text-red-soft">*</span>
                </label>
                <input
                  value={brandName}
                  onChange={event => {
                    setBrandName(event.target.value)
                    setBrandNameError('')
                  }}
                  placeholder="e.g., Alignment AI"
                  className={`w-full rounded-xl border bg-surface-warm px-4 py-3 text-base text-ink placeholder-ink-3 transition-all focus:outline-none focus:ring-2 focus:ring-ink/10 ${
                    brandNameError ? 'border-red-soft focus:border-red-soft' : 'border-divider-light focus:border-ink'
                  }`}
                />
                {brandNameError && <p className="mt-1.5 text-xs text-red-soft">{brandNameError}</p>}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-ink-2">
                  Website URL <span className="text-red-soft">*</span>
                </label>
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
                  <input
                    value={brandUrl}
                    onChange={event => {
                      setBrandUrl(event.target.value)
                      setUrlError('')
                    }}
                    onKeyDown={event => {
                      if (event.key === 'Enter' && !isCompleting) handleComplete()
                    }}
                    placeholder="e.g., alignmenttech.ai"
                    className={`w-full rounded-xl border bg-surface-warm py-3 pl-11 pr-4 text-base text-ink placeholder-ink-3 transition-all focus:outline-none focus:ring-2 focus:ring-ink/10 ${
                      urlError ? 'border-red-soft focus:border-red-soft' : 'border-divider-light focus:border-ink'
                    }`}
                  />
                </div>
                {urlError && <p className="mt-1.5 text-xs text-red-soft">{urlError}</p>}
              </div>
            </div>

            <button
              onClick={handleComplete}
              disabled={isCompleting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-4 text-base font-semibold text-ink-inv shadow-sm transition-all hover:bg-[#2d2d2c] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCompleting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Setting up your audit...
                </>
              ) : (
                <>
                  Start Audit
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>

            {completionError && <p className="text-center text-sm text-red-soft">{completionError}</p>}
          </div>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 bg-surface-warm relative overflow-hidden items-center justify-center">
        <div className="relative z-10 max-w-md mx-8">
          <div className="bg-surface rounded-2xl shadow-lg shadow-surface-muted/50 p-8 border border-divider-light">
            <p className="text-ink-2 text-sm leading-relaxed mb-6">
              &ldquo;Start with your brand and website. Alignment turns that into an audit, then a profile, then intelligence your team can use.&rdquo;
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-surface-muted flex items-center justify-center text-ink-2 font-bold text-sm">A</div>
              <div>
                <p className="text-sm font-semibold text-ink">Alignment AI</p>
                <p className="text-xs text-ink-3">Brand Intelligence Platform</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
