'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { ChevronsUpDown, Check, Plus, Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { customersApi, CustomerSummary } from '@/lib/api'
import { BrandLogo } from '@/components/BrandLogo'
import {
  ACTIVE_CUSTOMER_EVENT,
  activeCustomerStorageKey,
  customerCacheStorageKey,
} from '@/app/dashboard/geo-monitor/components/shared/constants'

interface Props {
  expanded: boolean
  mobileOpen: boolean
  /** Called when the collapsed avatar is clicked — ask the sidebar to expand */
  onRequestExpand: () => void
}

/**
 * Global workspace/customer switcher pinned at the top of the sidebar (GEOly
 * style). Lives OUTSIDE UnifiedProvider, so it owns its own customer list +
 * active-id state and syncs with the engine-page context via localStorage +
 * the ACTIVE_CUSTOMER_EVENT window event.
 *
 * Only internal roles (admin/staff) have customers, so this renders nothing
 * when the list is empty — regular users never see it.
 */
export function SidebarCustomerSwitcher({ expanded, mobileOpen, onRequestExpand }: Props) {
  const { user } = useAuth()
  const [customers, setCustomers] = useState<CustomerSummary[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const ref = useRef<HTMLDivElement>(null)

  // ── Load the customer list ────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    setLoading(true)
    customersApi.list(user.id, false)
      .then(list => {
        if (cancelled) return
        setCustomers(list)
        try {
          const saved = localStorage.getItem(activeCustomerStorageKey(user.id))
          const selected = (saved ? list.find(c => c.id === saved) : null) ?? list[0] ?? null
          setActiveId(selected?.id ?? null)
          if (selected) localStorage.setItem(activeCustomerStorageKey(user.id), selected.id)
        } catch {
          setActiveId(list[0]?.id ?? null)
        }
      })
      .catch(() => { if (!cancelled) setCustomers([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [user?.id])

  // ── Read the active id from localStorage + stay in sync via the event ──
  useEffect(() => {
    if (!user?.id) return
    try {
      const saved = localStorage.getItem(activeCustomerStorageKey(user.id))
      if (saved) setActiveId(saved)
    } catch { /* ignore */ }

    const onChange = (e: Event) => {
      const id = (e as CustomEvent<string>).detail
      if (id) setActiveId(prev => (prev === id ? prev : id))
    }
    window.addEventListener(ACTIVE_CUSTOMER_EVENT, onChange as EventListener)
    return () => window.removeEventListener(ACTIVE_CUSTOMER_EVENT, onChange as EventListener)
  }, [user?.id])

  // ── Close dropdown on outside click ───────────────────────────────────
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const selectCustomer = useCallback((id: string) => {
    setOpen(false)
    if (id === activeId) return
    setActiveId(id)
    try {
      if (user?.id) localStorage.setItem(activeCustomerStorageKey(user.id), id)
      // Pre-cache brand name/domain so engine pages render instantly
      const found = customers.find(c => c.id === id)
      if (found) {
        const cache: Record<string, { brand_name: string; domain: string }> =
          JSON.parse(localStorage.getItem(customerCacheStorageKey(user?.id)) || '{}')
        cache[id] = { brand_name: found.brand_name, domain: found.domain }
        localStorage.setItem(customerCacheStorageKey(user?.id), JSON.stringify(cache))
      }
    } catch { /* storage unavailable */ }
    // Notify the engine-page context (UnifiedContext) to re-hydrate
    window.dispatchEvent(new CustomEvent(ACTIVE_CUSTOMER_EVENT, { detail: id }))
  }, [activeId, customers, user?.id])

  // Nothing to switch between → render nothing (regular users, or no customers)
  if (!loading && customers.length === 0) return null

  const active = customers.find(c => c.id === activeId) ?? customers[0] ?? null
  const showFull = expanded || mobileOpen

  // ── Collapsed: just the active brand avatar; click expands the sidebar ──
  if (!showFull) {
    return (
      <div className="px-2 flex justify-center">
        <button
          onClick={onRequestExpand}
          className="w-11 h-10 flex items-center justify-center rounded-lg hover:bg-[rgba(250,245,236,0.06)] transition-all group relative"
          aria-label="Switch customer"
        >
          {active
            ? <BrandLogo domain={active.domain} name={active.brand_name} size={22} />
            : <Loader2 className="w-4 h-4 text-[rgba(250,245,236,0.4)] animate-spin" />}
          <span className="absolute left-full ml-3 px-3 py-1.5 bg-ink text-ink-inv text-xs font-medium rounded-lg shadow-elevation-lg border border-[rgba(250,245,236,0.08)] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[60]">
            {active?.brand_name ?? 'Switch customer'}
          </span>
        </button>
      </div>
    )
  }

  // ── Expanded: full GEOly-style switcher box ───────────────────────────
  return (
    <div ref={ref} className="relative px-3">
      <button
        onClick={() => setOpen(v => !v)}
        data-dropdown-trigger="true"
        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-[rgba(250,245,236,0.04)] border border-[rgba(250,245,236,0.08)] hover:bg-[rgba(250,245,236,0.07)] transition-all"
      >
        {active
          ? <BrandLogo domain={active.domain} name={active.brand_name} size={26} />
          : <div className="w-[26px] h-[26px] rounded-full bg-[rgba(250,245,236,0.08)] flex items-center justify-center"><Loader2 className="w-3.5 h-3.5 text-[rgba(250,245,236,0.4)] animate-spin" /></div>}
        <div className="flex flex-col items-start min-w-0 flex-1">
          <span className="text-[13px] font-semibold text-ink-inv truncate w-full text-left">
            {active?.brand_name ?? (loading ? 'Loading…' : 'Select customer')}
          </span>
          {active?.domain && (
            <span className="text-[10px] text-[rgba(250,245,236,0.4)] truncate w-full text-left">
              {active.domain.replace(/^https?:\/\//, '').replace(/\/$/, '')}
            </span>
          )}
        </div>
        <ChevronsUpDown className="w-3.5 h-3.5 text-[rgba(250,245,236,0.35)] flex-shrink-0" strokeWidth={2} />
      </button>

      {open && (
        <div className="absolute left-3 right-3 top-full mt-1.5 bg-ink border border-[rgba(250,245,236,0.1)] rounded-xl shadow-elevation-lg z-[80] overflow-hidden">
          <div className="px-3 py-2 text-[9px] font-bold text-[rgba(250,245,236,0.3)] uppercase tracking-widest border-b border-[rgba(250,245,236,0.06)]">
            Switch customer
          </div>
          <div className="max-h-72 overflow-y-auto py-1 scrollbar-none">
            {customers.length === 0 ? (
              <div className="px-3 py-3 text-[11px] text-[rgba(250,245,236,0.35)]">No customers yet.</div>
            ) : (
              customers.map(c => {
                const isActive = c.id === (active?.id ?? activeId)
                return (
                  <button
                    key={c.id}
                    onClick={() => selectCustomer(c.id)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-[rgba(250,245,236,0.06)] transition-colors ${isActive ? 'bg-[rgba(250,245,236,0.05)]' : ''}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <BrandLogo domain={c.domain} name={c.brand_name} size={22} />
                      <div className="min-w-0">
                        <div className="text-[12px] font-semibold text-ink-inv truncate">{c.brand_name}</div>
                        {c.domain && <div className="text-[10px] text-[rgba(250,245,236,0.35)] truncate">{c.domain.replace(/^https?:\/\//, '').replace(/\/$/, '')}</div>}
                      </div>
                    </div>
                    {isActive && <Check className="w-3.5 h-3.5 text-sage flex-shrink-0" strokeWidth={2.4} />}
                  </button>
                )
              })
            )}
          </div>
          <Link
            href="/dashboard/admin/customers"
            onClick={() => setOpen(false)}
            className="flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-semibold text-[rgba(250,245,236,0.55)] hover:bg-[rgba(250,245,236,0.06)] hover:text-ink-inv border-t border-[rgba(250,245,236,0.06)] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Manage customers
          </Link>
        </div>
      )}
    </div>
  )
}
