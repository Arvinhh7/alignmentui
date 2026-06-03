'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, RefreshCw, Archive, Search, Loader2, Briefcase } from 'lucide-react'
import { customersApi, CustomerSummary } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { hasFeatureAccess } from '@/lib/featurePermissions'
import CustomerCard from './CustomerCard'
import NewCustomerModal from './NewCustomerModal'

export default function CustomersPage() {
  const { user, role, permissions } = useAuth()
  const [customers, setCustomers] = useState<CustomerSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [includeArchived, setIncludeArchived] = useState(false)
  const [search, setSearch] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  // ── Data loading ──────────────────────────────────────────────────────────
  // NOTE: all hooks must be called before any conditional return (Rules of Hooks)
  const loadCustomers = useCallback(async (showSpinner = false) => {
    if (!user?.id) return
    if (showSpinner) setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      const data = await customersApi.list(user.id, includeArchived)
      setCustomers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user?.id, includeArchived])

  useEffect(() => {
    loadCustomers()
  }, [loadCustomers])

  // ── Access guard (AFTER all hooks) ────────────────────────────────────────
  // Admin always; staff only if granted the 'customers' permission in Team Management.
  // (FeatureGate also enforces this upstream — kept here as defence-in-depth.)
  if (!hasFeatureAccess(role, permissions, 'customers')) {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px]">
        <p className="text-ink-3 text-sm">You don&apos;t have access to Customers. Contact your administrator.</p>
      </div>
    )
  }

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = customers.filter(c => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      c.brand_name.toLowerCase().includes(q) ||
      c.domain.toLowerCase().includes(q) ||
      c.notes.toLowerCase().includes(q)
    )
  })

  // ── Counts ────────────────────────────────────────────────────────────────
  const activeCount   = customers.filter(c => !c.is_archived).length
  const archivedCount = customers.filter(c => c.is_archived).length

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-canvas p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <Briefcase className="w-5 h-5 text-caution" />
              <h1 className="text-xl font-bold text-ink">Customers</h1>
            </div>
            <p className="text-sm text-ink-3">
              Manage brand monitoring for each of your customers.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Archived toggle */}
            <button
              onClick={() => setIncludeArchived(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                includeArchived
                  ? 'bg-caution-bg text-caution border-caution/25'
                  : 'text-ink-3 border-divider-light hover:border-divider hover:text-ink'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              {includeArchived ? 'Hide Archived' : 'Show Archived'}
              {archivedCount > 0 && (
                <span className="ml-0.5 text-[9px] font-bold px-1 py-0.5 bg-surface-warm rounded-full">
                  {archivedCount}
                </span>
              )}
            </button>

            {/* Refresh */}
            <button
              onClick={() => loadCustomers(true)}
              disabled={refreshing}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-ink-3 border border-divider-light hover:text-ink hover:border-divider disabled:opacity-40 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            {/* New Customer */}
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-ink text-ink-inv hover:bg-ink-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Customer
            </button>
          </div>
        </div>

        {/* ── Stats bar ────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-2xl font-bold text-ink">{activeCount}</span>
            <span className="text-sm text-ink-3">active</span>
          </div>
          {archivedCount > 0 && (
            <>
              <div className="w-px h-4 bg-divider-light" />
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-bold text-ink-3">{archivedCount}</span>
                <span className="text-sm text-ink-3">archived</span>
              </div>
            </>
          )}
        </div>

        {/* ── Search ───────────────────────────────────────────────────────── */}
        {customers.length > 4 && (
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by brand, domain, or notes…"
              className="w-full max-w-sm bg-surface border border-divider-light rounded-xl pl-10 pr-4 py-2.5 text-sm text-ink placeholder-ink-3 focus:outline-none focus:border-divider transition-colors"
            />
          </div>
        )}

        {/* ── Error ────────────────────────────────────────────────────────── */}
        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-soft-bg border border-red-soft/30 text-red-soft text-sm">
            {error}
          </div>
        )}

        {/* ── Loading skeleton ─────────────────────────────────────────────── */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-52 bg-surface-warm border border-divider-light rounded-2xl animate-pulse"
              />
            ))}
          </div>
        )}

        {/* ── Empty state ──────────────────────────────────────────────────── */}
        {!loading && filtered.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-surface border border-divider-light flex items-center justify-center mb-4">
              <Briefcase className="w-6 h-6 text-ink-3" />
            </div>
            {search ? (
              <>
                <p className="text-sm font-medium text-ink-3">No customers match &ldquo;{search}&rdquo;</p>
                <button
                  onClick={() => setSearch('')}
                  className="mt-2 text-xs text-ink-3 hover:text-ink underline underline-offset-2 transition-colors"
                >
                  Clear search
                </button>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-ink-2">No customers yet</p>
                <p className="text-xs text-ink-3 mt-1 mb-4">
                  Add your first customer to start monitoring their brand visibility.
                </p>
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-ink text-ink-inv hover:bg-ink-2 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  New Customer
                </button>
              </>
            )}
          </div>
        )}

        {/* ── Customer grid ─────────────────────────────────────────────────── */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(customer => (
              <CustomerCard
                key={customer.id}
                customer={customer}
                userId={user!.id}
                onArchived={() => loadCustomers(true)}
              />
            ))}
          </div>
        )}

        {/* ── Refreshing overlay ───────────────────────────────────────────── */}
        {refreshing && !loading && (
          <div className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-2.5 bg-ink text-ink-inv border border-ink-2 rounded-xl shadow-lg text-xs">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Refreshing…
          </div>
        )}
      </div>

      {/* ── Modal ────────────────────────────────────────────────────────────── */}
      {showModal && user && (
        <NewCustomerModal
          userId={user.id}
          onClose={() => setShowModal(false)}
          onCreated={() => loadCustomers(true)}
        />
      )}
    </div>
  )
}
