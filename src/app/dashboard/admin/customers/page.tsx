'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, RefreshCw, Archive, Search, Loader2, Briefcase } from 'lucide-react'
import { customersApi, CustomerSummary } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import CustomerCard from './CustomerCard'
import NewCustomerModal from './NewCustomerModal'

export default function CustomersPage() {
  const { user, role } = useAuth()
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
  if (role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px]">
        <p className="text-[rgba(250,245,236,0.4)] text-sm">Admin access required.</p>
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
    <div className="min-h-screen bg-surface p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <Briefcase className="w-5 h-5 text-caution" />
              <h1 className="text-xl font-bold text-ink-inv">Customers</h1>
            </div>
            <p className="text-sm text-[rgba(250,245,236,0.4)]">
              Manage brand monitoring for each of your customers.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Archived toggle */}
            <button
              onClick={() => setIncludeArchived(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                includeArchived
                  ? 'bg-caution-bg text-caution border-[rgba(184,134,11,0.25)]'
                  : 'text-[rgba(250,245,236,0.4)] border-[rgba(250,245,236,0.1)] hover:border-[rgba(250,245,236,0.2)] hover:text-ink-inv'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              {includeArchived ? 'Hide Archived' : 'Show Archived'}
              {archivedCount > 0 && (
                <span className="ml-0.5 text-[9px] font-bold px-1 py-0.5 bg-[rgba(250,245,236,0.08)] rounded-full">
                  {archivedCount}
                </span>
              )}
            </button>

            {/* Refresh */}
            <button
              onClick={() => loadCustomers(true)}
              disabled={refreshing}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-[rgba(250,245,236,0.4)] border border-[rgba(250,245,236,0.1)] hover:text-ink-inv hover:border-[rgba(250,245,236,0.2)] disabled:opacity-40 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            {/* New Customer */}
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-ink-inv text-ink hover:bg-surface-muted transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Customer
            </button>
          </div>
        </div>

        {/* ── Stats bar ────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-2xl font-bold text-ink-inv">{activeCount}</span>
            <span className="text-sm text-[rgba(250,245,236,0.4)]">active</span>
          </div>
          {archivedCount > 0 && (
            <>
              <div className="w-px h-4 bg-[rgba(250,245,236,0.1)]" />
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-bold text-[rgba(250,245,236,0.3)]">{archivedCount}</span>
                <span className="text-sm text-[rgba(250,245,236,0.25)]">archived</span>
              </div>
            </>
          )}
        </div>

        {/* ── Search ───────────────────────────────────────────────────────── */}
        {customers.length > 4 && (
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgba(250,245,236,0.3)]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by brand, domain, or notes…"
              className="w-full max-w-sm bg-[rgba(250,245,236,0.04)] border border-[rgba(250,245,236,0.08)] rounded-xl pl-10 pr-4 py-2.5 text-sm text-ink-inv placeholder-[rgba(250,245,236,0.25)] focus:outline-none focus:border-[rgba(250,245,236,0.2)] transition-colors"
            />
          </div>
        )}

        {/* ── Error ────────────────────────────────────────────────────────── */}
        {error && (
          <div className="px-4 py-3 rounded-xl bg-[rgba(201,86,75,0.08)] border border-[rgba(201,86,75,0.2)] text-red-soft text-sm">
            {error}
          </div>
        )}

        {/* ── Loading skeleton ─────────────────────────────────────────────── */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-52 bg-[rgba(250,245,236,0.03)] border border-[rgba(250,245,236,0.06)] rounded-2xl animate-pulse"
              />
            ))}
          </div>
        )}

        {/* ── Empty state ──────────────────────────────────────────────────── */}
        {!loading && filtered.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[rgba(250,245,236,0.04)] border border-[rgba(250,245,236,0.08)] flex items-center justify-center mb-4">
              <Briefcase className="w-6 h-6 text-[rgba(250,245,236,0.2)]" />
            </div>
            {search ? (
              <>
                <p className="text-sm font-medium text-[rgba(250,245,236,0.5)]">No customers match &ldquo;{search}&rdquo;</p>
                <button
                  onClick={() => setSearch('')}
                  className="mt-2 text-xs text-[rgba(250,245,236,0.3)] hover:text-ink-inv underline underline-offset-2 transition-colors"
                >
                  Clear search
                </button>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-[rgba(250,245,236,0.5)]">No customers yet</p>
                <p className="text-xs text-[rgba(250,245,236,0.3)] mt-1 mb-4">
                  Add your first customer to start monitoring their brand visibility.
                </p>
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-ink-inv text-ink hover:bg-surface-muted transition-colors"
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
          <div className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-2.5 bg-ink border border-[rgba(250,245,236,0.1)] rounded-xl shadow-elevation-lg text-xs text-[rgba(250,245,236,0.5)]">
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
