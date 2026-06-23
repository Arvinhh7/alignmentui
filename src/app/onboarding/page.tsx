'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api, customersApi } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { getSupabase } from '@/lib/supabase'
import {
  LEGACY_CUSTOMER_DATA_KEYS,
  WORLD_COUNTRIES,
  activeCustomerStorageKey,
  customerCacheStorageKey,
} from '@/app/dashboard/geo-monitor/components/shared/constants'
import { ArrowRight, ChevronDown, Globe, Home, Loader2, LogOut, Search, Sparkles } from 'lucide-react'
import { gaEvent } from '@/lib/gtag'

const ONBOARDING_DONE_KEY = 'alignment_onboarding_done'
const ONBOARDING_SESSION_KEY = 'alignment_onboarding_session'
const ONBOARDING_VERSION = 6

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
  const [country, setCountry] = useState('')
  const [brandNameError, setBrandNameError] = useState('')
  const [urlError, setUrlError] = useState('')
  const [countryError, setCountryError] = useState('')
  const [isCompleting, setIsCompleting] = useState(false)
  const [setupMsg, setSetupMsg] = useState('')
  const [scanPct, setScanPct] = useState(0)
  const [completionError, setCompletionError] = useState('')
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [countrySearch, setCountrySearch] = useState('')
  const [countryOpen, setCountryOpen] = useState(false)
  const [elapsedSecs, setElapsedSecs] = useState(0)
  const countryRef = useRef<HTMLDivElement>(null)
  const countrySearchRef = useRef<HTMLInputElement>(null)

  const selectedCountry = WORLD_COUNTRIES.find(c => c.name === country)
  const filteredCountries = WORLD_COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase())
  )

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
            ? `/dashboard/analysis?subscription=success&session_id=${encodeURIComponent(checkoutSessionId)}`
            : '/dashboard/analysis'
          window.location.href = dest
          return
        }
        // Only resume from a prior onboarding (profiles.company is written by
        // onboarding completion, never by signup). The signup "company name"
        // must NOT seed brand identity — onboarding is the single source of truth.
        if (data?.company) setBrandName(data.company)
        if (data?.company_website) setBrandUrl(data.company_website)
      }
      setAuthChecked(true)
    }

    check()
  }, [authLoading, isAuthenticated, user])

  // Referral attribution: if this user arrived via a ?refer=CODE link, record it
  // now that they're authenticated. Fire-and-forget — the backend is idempotent
  // per referee, and a failure must never block onboarding.
  useEffect(() => {
    if (!user?.id) return
    let pending = ''
    try { pending = localStorage.getItem('pending_refer') || '' } catch {}
    if (!pending) return
    api.recordReferralSignup(pending, user.id, user.email ?? undefined)
      .catch(() => {})
      .finally(() => { try { localStorage.removeItem('pending_refer') } catch {} })
  }, [user?.id, user?.email])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(ONBOARDING_SESSION_KEY)
      if (!saved) return
      const s = JSON.parse(saved)
      if (s._version !== ONBOARDING_VERSION) return
      if (s.brandName) setBrandName(s.brandName)
      if (s.brandUrl) setBrandUrl(s.brandUrl)
      if (s.country) setCountry(s.country)
    } catch {}
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(ONBOARDING_SESSION_KEY, JSON.stringify({
        _version: ONBOARDING_VERSION,
        brandName,
        brandUrl,
        country,
      }))
    } catch {}
  }, [brandName, brandUrl, country])

  // Close country dropdown on outside click
  useEffect(() => {
    if (!countryOpen) return
    const handler = (e: MouseEvent) => {
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) {
        setCountryOpen(false)
        setCountrySearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [countryOpen])

  // Auto-focus search input when dropdown opens
  useEffect(() => {
    if (countryOpen) setTimeout(() => countrySearchRef.current?.focus(), 30)
  }, [countryOpen])

  // Elapsed-seconds ticker while setup is running (for time-remaining display)
  useEffect(() => {
    if (!isCompleting) { setElapsedSecs(0); return }
    const t = setInterval(() => setElapsedSecs(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [isCompleting])

  // Poll a scan job for up to ~2 minutes, surfacing progress. Resolves on
  // done/failed/timeout — never throws — so onboarding always proceeds.
  const pollScan = useCallback(async (jobId: string) => {
    const maxPolls = 60 // 60 × 2s ≈ 120s
    for (let i = 0; i < maxPolls; i++) {
      await new Promise(r => setTimeout(r, 2000))
      try {
        const s = (await api.getScanJob(jobId)).data
        if (!s) continue
        if (typeof s.progress === 'number') {
          setScanPct(Math.max(8, Math.min(99, Math.round(s.progress))))
        }
        if (s.status === 'done') { setScanPct(100); return }
        if (s.status === 'failed' || s.status === 'cancelled') return
      } catch {
        // transient — keep polling
      }
    }
  }, [])

  const handleComplete = useCallback(async () => {
    const bn = brandName.trim()
    const urlMessage = validateWebsiteUrl(brandUrl)
    const ct = country.trim()
    setBrandNameError(bn ? '' : 'Brand Name is required.')
    setUrlError(urlMessage)
    setCountryError(ct ? '' : 'Please select your target country or region.')
    setCompletionError('')
    if (!bn || urlMessage || !ct) return

    setIsCompleting(true)
    setScanPct(0)
    setSetupMsg('Creating your workspace…')
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

        // One account == one brand: onboarding sets identity (name + domain) and
        // target country once. Competitors are NOT seeded — they are an OUTPUT of
        // the scan (auto-discovered), never a manual input. Industry / product
        // space are optional refinements the customer can add later.
        const customer = await customersApi.create(user.id, {
          brand_name: bn,
          domain: du,
          config_json: {
            keywords: [],
            industry: '',
            product_space: '',
            one_liner: '',
            target_audience: '',
            target_market: ct,
            differentiation: '',
            onboarding: {
              version: ONBOARDING_VERSION,
              completed_from: 'onboarding_quickstart',
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
      setSetupMsg('')
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

    // ── Seed 4 default prompts (2 branded + 2 non-branded) and run ONE
    //    ChatGPT-only scan so the customer lands on a populated Analysis view.
    //    All best-effort: any failure still completes onboarding gracefully. ──
    try {
      if (user?.id && customerId) {
        setSetupMsg('Designing your first 4 monitoring prompts…')
        const res = await api.onboardingStarterPrompts({ brand_name: bn, domain: du, country: ct })
        const prompts = (res.data?.prompts ?? []).filter(p => p.prompt_text?.trim())
        for (const p of prompts) {
          try {
            await api.createMonitorPrompt({
              template: p.prompt_text.trim(),
              category: p.intent,
              customer_id: customerId,
            })
          } catch { /* dedup / limit — skip */ }
        }

        if (prompts.length > 0) {
          setSetupMsg('Analyzing how AI engines talk about your brand…')
          setScanPct(8)
          try {
            // Request all 4 engines; the backend clamps to the plan entitlement
            // (Starter → ChatGPT only, Standard/Pro/Growth → all 4) via
            // _resolve_scan_entitlement, so paid users get a full multi-engine
            // first scan for free instead of a ChatGPT-only snapshot.
            const job = await api.runMonitorScan(
              { brand_name: bn, domain: du, customer_id: customerId, engines: ['chatgpt', 'perplexity', 'gemini', 'claude'] },
              undefined,
              user.id,
              true, // is_onboarding → free
            )
            const jobId = job.data?.job_id
            if (jobId) await pollScan(jobId)
          } catch { /* scan unavailable — land on empty Analysis, user can rescan */ }
        }
      }
    } catch { /* non-fatal */ }

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
    // Carry subscription params so useSubscription triggers syncCheckoutAndCheck
    // at the dashboard (handles the case where initial sync in check() failed).
    const _exitParams = new URLSearchParams(window.location.search)
    const _exitSessionId = _exitParams.get('session_id')
    const _exitDest = _exitSessionId
      ? `/dashboard/analysis?subscription=success&session_id=${encodeURIComponent(_exitSessionId)}`
      : '/dashboard/analysis'
    router.push(_exitDest)
  }, [brandName, brandUrl, country, pollScan, router, user])

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
            {isCompleting ? (
              <>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">Building your workspace</p>
                  <h1 className="mt-3 text-2xl font-bold text-ink">Setting up {brandName.trim() || 'your brand'}</h1>
                  <p className="mt-2 text-sm leading-relaxed text-ink-3">
                    We&apos;re generating your first monitoring prompts and running an instant ChatGPT analysis. This usually takes under a minute.
                  </p>
                </div>

                {(() => {
                  // Time-based simulated progress: ease-out curve 5%→92% over 75s.
                  // Real backend progress overrides when it arrives higher than the sim.
                  const simPct = Math.min(92, Math.round(Math.sqrt(elapsedSecs / 75) * 92))
                  const displayPct = scanPct >= 100 ? 100 : Math.max(scanPct, simPct, 5)
                  // Estimated time remaining
                  const secsLeft = Math.max(0, 75 - elapsedSecs)
                  const etaLabel = scanPct >= 100
                    ? 'Done!'
                    : elapsedSecs < 6
                      ? '~1 min'
                      : secsLeft >= 60
                        ? `~1 min`
                        : secsLeft > 10
                          ? `~${secsLeft}s`
                          : 'Almost done…'
                  return (
                    <div className="rounded-2xl border border-divider-light bg-surface-warm p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {scanPct >= 100
                            ? <Sparkles className="h-5 w-5 flex-shrink-0 text-sage" />
                            : <Loader2 className="h-5 w-5 flex-shrink-0 animate-spin text-ink" />}
                          <span className="text-sm font-medium text-ink-2 truncate">{setupMsg || 'Working…'}</span>
                        </div>
                        <span className="flex-shrink-0 text-xs tabular-nums text-ink-3 min-w-[60px] text-right">
                          {etaLabel}
                        </span>
                      </div>
                      {/* Progress bar: real width driven by displayPct, shimmer overlay when in-flight */}
                      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-surface-muted relative">
                        <div
                          className="h-full rounded-full bg-ink transition-all duration-1000 ease-out"
                          style={{ width: `${displayPct}%` }}
                        />
                        {scanPct < 100 && (
                          <div
                            className="absolute inset-y-0 rounded-full animate-pulse opacity-30 bg-ink"
                            style={{ left: `${Math.max(0, displayPct - 20)}%`, width: '20%' }}
                          />
                        )}
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-xs text-ink-3">Hang tight — you&apos;ll land straight in your Analysis dashboard.</p>
                        <span className="text-xs tabular-nums text-ink-3">{Math.round(displayPct)}%</span>
                      </div>
                    </div>
                  )
                })()}

                {completionError && <p className="text-sm text-red-soft">{completionError}</p>}
              </>
            ) : (
              <>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">Brand Setup</p>
                  <h1 className="mt-3 text-2xl font-bold text-ink">Set up your brand</h1>
                  <p className="mt-2 text-sm leading-relaxed text-ink-3">
                    Three quick details. We&apos;ll generate your first prompts and run an instant ChatGPT analysis — fine-tune everything later.
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
                        placeholder="e.g., alignmenttech.ai"
                        className={`w-full rounded-xl border bg-surface-warm py-3 pl-11 pr-4 text-base text-ink placeholder-ink-3 transition-all focus:outline-none focus:ring-2 focus:ring-ink/10 ${
                          urlError ? 'border-red-soft focus:border-red-soft' : 'border-divider-light focus:border-ink'
                        }`}
                      />
                    </div>
                    {urlError && <p className="mt-1.5 text-xs text-red-soft">{urlError}</p>}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-ink-2">
                      Target Country / Region <span className="text-red-soft">*</span>
                    </label>
                    <div className="relative" ref={countryRef}>
                      {/* Trigger button */}
                      <button
                        type="button"
                        onClick={() => { setCountryOpen(o => !o); setCountrySearch('') }}
                        className={`w-full flex items-center gap-2 rounded-xl border bg-surface-warm px-4 py-3 text-left text-base transition-all focus:outline-none focus:ring-2 focus:ring-ink/10 ${
                          countryError ? 'border-red-soft focus:border-red-soft' : 'border-divider-light focus:border-ink'
                        }`}
                      >
                        {selectedCountry ? (
                          <>
                            <span className="text-lg leading-none">{selectedCountry.flag}</span>
                            <span className="flex-1 text-ink">{selectedCountry.name}</span>
                          </>
                        ) : (
                          <span className="flex-1 text-ink-3">Select country or region…</span>
                        )}
                        <ChevronDown className={`h-4 w-4 flex-shrink-0 text-ink-3 transition-transform ${countryOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {/* Dropdown popover */}
                      {countryOpen && (
                        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-divider-light bg-surface shadow-lg shadow-surface-muted/40">
                          {/* Search input */}
                          <div className="flex items-center gap-2 border-b border-divider-light px-3 py-2.5">
                            <Search className="h-3.5 w-3.5 flex-shrink-0 text-ink-3" />
                            <input
                              ref={countrySearchRef}
                              value={countrySearch}
                              onChange={e => setCountrySearch(e.target.value)}
                              placeholder="Search countries…"
                              className="flex-1 bg-transparent text-sm text-ink placeholder-ink-3 focus:outline-none"
                              onKeyDown={e => {
                                if (e.key === 'Escape') { setCountryOpen(false); setCountrySearch('') }
                                if (e.key === 'Enter' && filteredCountries.length > 0) {
                                  setCountry(filteredCountries[0].name)
                                  setCountryError('')
                                  setCountryOpen(false)
                                  setCountrySearch('')
                                }
                              }}
                            />
                          </div>
                          {/* Country list */}
                          <div className="max-h-52 overflow-y-auto py-1">
                            {filteredCountries.length === 0 ? (
                              <p className="px-4 py-3 text-sm text-ink-3">No results</p>
                            ) : filteredCountries.map(c => (
                              <button
                                key={c.code}
                                type="button"
                                onClick={() => {
                                  setCountry(c.name)
                                  setCountryError('')
                                  setCountryOpen(false)
                                  setCountrySearch('')
                                }}
                                className={`flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm transition-colors hover:bg-surface-warm ${
                                  country === c.name ? 'bg-surface-warm font-medium text-ink' : 'text-ink-2'
                                }`}
                              >
                                <span className="text-base leading-none">{c.flag}</span>
                                <span>{c.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {countryError && <p className="mt-1.5 text-xs text-red-soft">{countryError}</p>}
                  </div>
                </div>

                <button
                  onClick={handleComplete}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-4 text-base font-semibold text-ink-inv shadow-sm transition-all hover:bg-[#2d2d2c] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Generate my Analysis
                  <ArrowRight className="h-5 w-5" />
                </button>

                {completionError && <p className="text-center text-sm text-red-soft">{completionError}</p>}
              </>
            )}
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
