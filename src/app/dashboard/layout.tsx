'use client'

import { useState, useEffect } from 'react'
import { Menu } from 'lucide-react'
import Sidebar, { SIDEBAR_COLLAPSED_WIDTH, SIDEBAR_EXPANDED_WIDTH } from '@/components/Sidebar'
import { useAuth } from '@/hooks/useAuth'
import { useSubscription } from '@/hooks/useSubscription'
import SubscriptionBanner from '@/components/SubscriptionBanner'
import { ToastProvider } from '@/components/Toast'
import FeatureGate from '@/components/FeatureGate'
import { useLanguage } from '@/lib/LanguageContext'
import { getSupabase } from '@/lib/supabase'
import { useScrollRestoration } from '@/hooks/useScrollRestoration'
import DashboardGlobalSearch from '@/components/DashboardGlobalSearch'
import { ProductTour } from '@/components/tour/ProductTour'

const SIDEBAR_KEY = 'sidebar_expanded'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated, role, user } = useAuth()
  const { lang } = useLanguage()
  const [expandedPref, setExpandedPref] = useState(true)
  const [viewportCollapsed, setViewportCollapsed] = useState(false)
  const [hoverExpanded, setHoverExpanded] = useState(false)
  const expanded = expandedPref && !viewportCollapsed
  const displayExpanded = expanded || hoverExpanded
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Preserve scroll position across module navigation
  useScrollRestoration()
  const [onboardingChecked, setOnboardingChecked] = useState(false)

  // Check subscription access for non-admin/demo users.
  // Only runs after auth is resolved and role is known.
  const subCheck = useSubscription(
    isAuthenticated && role !== null ? user?.id : undefined,
    role,
  )

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_KEY)
      if (saved !== null) setExpandedPref(saved === 'true')
    } catch {}

    const handler = () => {
      try { setExpandedPref(localStorage.getItem(SIDEBAR_KEY) === 'true') } catch {}
    }
    const interval = setInterval(handler, 200)
    window.addEventListener('storage', handler)
    return () => { clearInterval(interval); window.removeEventListener('storage', handler) }
  }, [])

  useEffect(() => {
    const handler = (event: Event) => {
      const next = event instanceof CustomEvent ? Boolean(event.detail) : false
      setHoverExpanded(next)
    }
    window.addEventListener('sidebarHoverExpanded', handler)
    return () => window.removeEventListener('sidebarHoverExpanded', handler)
  }, [])

  // Close mobile menu and sync viewport-collapsed state on resize
  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth
      if (w >= 768) setMobileMenuOpen(false)
      setViewportCollapsed(w >= 768 && w < 1024)
      if (w < 768) setHoverExpanded(false)
    }
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = '/login'
    }
  }, [isLoading, isAuthenticated])

  // Redirect users with no role AND no active subscription.
  // Carry the Stripe session_id so /unauthorized can auto-recover
  // for users who just completed checkout but whose sync is still pending.
  useEffect(() => {
    if (
      !isLoading &&
      isAuthenticated &&
      role !== null &&
      !subCheck.isLoading &&
      !subCheck.hasAccess
    ) {
      const sessionId =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('session_id')
          : null
      window.location.href = sessionId
        ? `/unauthorized?session_id=${encodeURIComponent(sessionId)}`
        : '/unauthorized'
    }
  }, [isLoading, isAuthenticated, role, subCheck.isLoading, subCheck.hasAccess])

  // Redirect regular users who haven't completed onboarding back to /onboarding
  // Admin/demo users skip onboarding check entirely
  useEffect(() => {
    if (isLoading || !isAuthenticated || role === null) return
    if (role === 'admin' || role === 'demo' || role === 'staff') { setOnboardingChecked(true); return }
    if (!user?.id) return

    const checkOnboarding = async () => {
      try {
        const supabase = getSupabase()
        if (!supabase) { setOnboardingChecked(true); return }
        const { data } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .single()
        if (data && data.onboarding_completed === false) {
          window.location.href = '/onboarding'
          return
        }
      } catch { /* if profile check fails, allow access */ }
      setOnboardingChecked(true)
    }
    checkOnboarding()
  }, [isLoading, isAuthenticated, role, user?.id])

  // Show spinner while resolving auth, subscription, or onboarding status
  const stillResolving =
    isLoading ||
    !isAuthenticated ||
    role === null ||
    subCheck.isLoading ||
    (role === 'user' && !onboardingChecked)

  if (stillResolving) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-ink border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-ink-3">Loading...</p>
        </div>
      </div>
    )
  }

  // Not allowed → redirect effect above handles navigation, return null to avoid flicker
  if (!subCheck.hasAccess) {
    return null
  }

  const sidebarW = displayExpanded ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_COLLAPSED_WIDTH

  return (
    <ToastProvider>
      <div className="min-h-screen bg-canvas">
        {/* Mobile top bar — hidden on md+ (sidebar is always visible there) */}
        <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-canvas border-b border-divider flex items-center px-4 z-30">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-ink-2 hover:bg-surface-muted transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="ml-3 flex-1">
            <DashboardGlobalSearch mobile />
          </div>
        </div>

        <Sidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />

        {/* pt-14 on mobile to clear the fixed top bar; md+ uses sidebar margin */}
        <main
          className="transition-all duration-300 ease-in-out pt-14 md:pt-0 md:[margin-left:var(--sidebar-w)]"
          style={{ '--sidebar-w': `${sidebarW}px` } as React.CSSProperties}
        >
          <div className="sticky top-0 z-30 hidden h-14 items-center border-b border-divider-light bg-surface/95 px-6 backdrop-blur md:flex">
            <div className="flex flex-1 items-center justify-center">
              <DashboardGlobalSearch />
            </div>
          </div>
          <SubscriptionBanner lang={lang} />
          <FeatureGate>{children}</FeatureGate>
        </main>
        {/* Product Tour — auto-starts once for new customers landing on Analysis */}
        <ProductTour />
      </div>
    </ToastProvider>
  )
}
