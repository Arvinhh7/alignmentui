'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { api, customersApi, type CustomerSummary } from '@/lib/api'
import {
  ACTIVE_CUSTOMER_EVENT,
  activeCustomerStorageKey,
  customerCacheStorageKey,
} from '@/app/dashboard/geo-monitor/components/shared/constants'

const DEFAULT_ENTRY = '/dashboard/brand-hub'
const ONBOARDING_ENTRY = '/onboarding'
const PROFILE_ENTRY = '/dashboard/brand-hub'
const PROMPTS_ENTRY = '/dashboard/prompts'
const MONITOR_ENTRY = '/dashboard/geo-monitor'

const STAFF_ENTRY_PRIORITY = [
  { key: 'geo-audit', href: DEFAULT_ENTRY },
  { key: 'prompts', href: PROMPTS_ENTRY },
  { key: 'geo-monitor', href: MONITOR_ENTRY },
  { key: 'explore', href: '/dashboard/explore' },
  { key: 'ai-search', href: '/dashboard/ai-search' },
  { key: 'shopping', href: '/dashboard/shopping' },
  { key: 'analysis', href: '/dashboard/analysis' },
  { key: 'brand-hub', href: '/dashboard/brand-hub' },
  { key: 'visibility-proxy', href: '/dashboard/visibility-proxy' },
  { key: 'ga4-attribution', href: '/dashboard/ga4-attribution' },
  { key: 'geo-optimization', href: '/dashboard/geo-optimization' },
  { key: 'ads', href: '/dashboard/ads' },
  { key: 'gci', href: '/dashboard/gci' },
  { key: 'geo-content', href: '/dashboard/geo-content' },
  { key: 'geo-distribution', href: '/dashboard/geo-distribution' },
  { key: 'agentic-commerce', href: '/dashboard/agentic-commerce' },
  { key: 'ops', href: '/dashboard/ops' },
  { key: 'customers', href: '/dashboard/admin/customers' },
]

function syncActiveCustomer(customer: CustomerSummary, userId: string) {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(activeCustomerStorageKey(userId), customer.id)
    const cache: Record<string, { brand_name: string; domain: string }> =
      JSON.parse(localStorage.getItem(customerCacheStorageKey(userId)) || '{}')
    cache[customer.id] = { brand_name: customer.brand_name, domain: customer.domain }
    localStorage.setItem(customerCacheStorageKey(userId), JSON.stringify(cache))
    window.dispatchEvent(new CustomEvent(ACTIVE_CUSTOMER_EVENT, { detail: customer.id }))
  } catch {
    // Storage is a speed optimization only; routing still works without it.
  }
}

function chooseCustomer(customers: CustomerSummary[], userId: string): CustomerSummary | null {
  if (customers.length === 0 || typeof window === 'undefined') return customers[0] ?? null

  try {
    const activeId = localStorage.getItem(activeCustomerStorageKey(userId))
    return customers.find(customer => customer.id === activeId) ?? customers[0] ?? null
  } catch {
    return customers[0] ?? null
  }
}

function isCustomerProfileComplete(config: Record<string, unknown> | null | undefined): boolean {
  return Boolean(
    String(config?.industry ?? '').trim() &&
    String(config?.product_space ?? '').trim() &&
    String(config?.target_market ?? '').trim()
  )
}

export default function DashboardRootPage() {
  const router = useRouter()
  const { user, role, permissions, isLoading, isAuthenticated } = useAuth()

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated || !user?.id || role === null) return

    let cancelled = false

    const route = async () => {
      if (role === 'staff') {
        const entry = STAFF_ENTRY_PRIORITY.find(item => permissions[item.key])
        router.replace(entry?.href ?? '/dashboard/settings')
        return
      }

      if (role === 'admin' || role === 'demo') {
        router.replace(DEFAULT_ENTRY)
        return
      }

      try {
        const customers = await customersApi.list(user.id, false)
        if (cancelled) return

        const activeCustomer = chooseCustomer(customers, user.id)
        if (!activeCustomer) {
          router.replace(ONBOARDING_ENTRY)
          return
        }

        syncActiveCustomer(activeCustomer, user.id)

        const detail = await customersApi.get(activeCustomer.id, user.id)
        if (cancelled) return

        if (!isCustomerProfileComplete(detail.config_json)) {
          router.replace(PROFILE_ENTRY)
          return
        }

        let promptCount: number | null = null
        try {
          const promptResponse = await api.getMonitorPrompts(false, activeCustomer.id)
          if (cancelled) return
          promptCount = promptResponse.data?.length ?? 0
        } catch {
          if (cancelled) return
          const hasScanHistory = Boolean(activeCustomer.last_scan_at) || (activeCustomer.total_scans ?? 0) > 0
          router.replace(hasScanHistory ? MONITOR_ENTRY : DEFAULT_ENTRY)
          return
        }

        if (promptCount === 0) {
          router.replace('/dashboard/ai-search')
          return
        }

        router.replace(MONITOR_ENTRY)
      } catch {
        if (!cancelled) router.replace(DEFAULT_ENTRY)
      }
    }

    route()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, isLoading, permissions, role, router, user?.id])

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center bg-canvas">
      <div className="flex flex-col items-center gap-3 text-ink-3">
        <Loader2 className="h-6 w-6 animate-spin text-ink" />
        <p className="text-sm font-medium">Opening your workspace...</p>
      </div>
    </div>
  )
}
