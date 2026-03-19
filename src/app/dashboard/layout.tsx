'use client'

import { useState, useEffect } from 'react'
import Sidebar, { SIDEBAR_COLLAPSED_WIDTH, SIDEBAR_EXPANDED_WIDTH } from '@/components/Sidebar'
import { useAuth } from '@/hooks/useAuth'
import { useSubscription } from '@/hooks/useSubscription'
import SubscriptionBanner from '@/components/SubscriptionBanner'
import { ToastProvider } from '@/components/Toast'
import { useLanguage } from '@/lib/LanguageContext'
import { getSupabase } from '@/lib/supabase'
import { useScrollRestoration } from '@/hooks/useScrollRestoration'

const SIDEBAR_KEY = 'sidebar_expanded'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated, role, user } = useAuth()
  const { lang } = useLanguage()
  const [expanded, setExpanded] = useState(false)

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
      if (saved === 'true') setExpanded(true)
    } catch {}

    const handler = () => {
      try { setExpanded(localStorage.getItem(SIDEBAR_KEY) === 'true') } catch {}
    }
    const interval = setInterval(handler, 200)
    window.addEventListener('storage', handler)
    return () => { clearInterval(interval); window.removeEventListener('storage', handler) }
  }, [])

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = '/login'
    }
  }, [isLoading, isAuthenticated])

  // Redirect users with no role AND no active subscription
  useEffect(() => {
    if (
      !isLoading &&
      isAuthenticated &&
      role !== null &&
      !subCheck.isLoading &&
      !subCheck.hasAccess
    ) {
      window.location.href = '/unauthorized'
    }
  }, [isLoading, isAuthenticated, role, subCheck.isLoading, subCheck.hasAccess])

  // Redirect regular users who haven't completed onboarding back to /onboarding
  // Admin/demo users skip onboarding check entirely
  useEffect(() => {
    if (isLoading || !isAuthenticated || role === null) return
    if (role === 'admin' || role === 'demo') { setOnboardingChecked(true); return }
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  // Not allowed → redirect effect above handles navigation, return null to avoid flicker
  if (!subCheck.hasAccess) {
    return null
  }

  const marginLeft = expanded ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_COLLAPSED_WIDTH

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <main className="transition-all duration-300 ease-in-out" style={{ marginLeft }}>
          <SubscriptionBanner lang={lang} />
          {children}
        </main>
      </div>
    </ToastProvider>
  )
}
