'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { Search, StopCircle, Pencil, Loader2, ChevronDown, Plus, Check, RefreshCw } from 'lucide-react'
import { useUnified } from './UnifiedContext'
import { BrandLogo } from '@/components/BrandLogo'
import Link from 'next/link'

/**
 * Customer switcher dropdown — the primary way to move between customers'
 * Engine Insights. Selecting a customer instantly re-hydrates all data
 * (visibility, prompts, discover, …) without navigating away.
 */
function CustomerSwitcher() {
  const ctx = useUnified()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const activeName = ctx.brandConfig.brand_name || 'Select customer'

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-red-soft-bg rounded-xl border border-red-soft/30">
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-2 text-sm font-semibold text-ink hover:text-ink/80 transition-colors"
        >
          {ctx.customerHydrating
            ? <Loader2 className="w-4 h-4 text-caution animate-spin" />
            : <BrandLogo domain={ctx.brandConfig.domain} name={activeName} size={20} />}
          {activeName}
          <ChevronDown className={`w-3.5 h-3.5 text-ink-3 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        <button
          onClick={() => ctx.setShowConfig(!ctx.showConfig)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-700 text-white hover:bg-red-800 active:bg-red-900 transition-colors shadow-sm"
        >
          <Pencil className="w-3 h-3" />
          Edit
        </button>
      </div>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 w-64 bg-surface border border-divider rounded-xl shadow-lg z-30 overflow-hidden">
          <div className="px-3 py-2 text-[10px] font-bold text-ink-3 uppercase tracking-wider border-b border-divider-light">
            Switch customer
          </div>
          <div className="max-h-72 overflow-y-auto py-1">
            {ctx.customers.length === 0 ? (
              <div className="px-3 py-3 text-xs text-ink-3">No customers yet.</div>
            ) : (
              ctx.customers.map(c => {
                const isActive = c.id === ctx.activeCustomerId
                return (
                  <button
                    key={c.id}
                    onClick={() => { ctx.switchCustomer(c.id); setOpen(false) }}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-surface-warm transition-colors ${isActive ? 'bg-surface-warm' : ''}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <BrandLogo domain={c.domain} name={c.brand_name} size={24} />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-ink truncate">{c.brand_name}</div>
                        {c.domain && <div className="text-[10px] text-ink-3 truncate">{c.domain}</div>}
                      </div>
                    </div>
                    {isActive && <Check className="w-3.5 h-3.5 text-sage flex-shrink-0" />}
                  </button>
                )
              })
            )}
          </div>
          <Link
            href="/dashboard/admin/customers"
            className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-ink-2 hover:bg-surface-warm border-t border-divider-light transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Manage customers
          </Link>
        </div>
      )}
    </div>
  )
}

export function ControlBar() {
  const ctx = useUnified()

  // "Last refreshed X ago" badge from warehouse data
  const refreshLabel = useMemo(() => {
    if (!ctx.lastRefreshed) return null
    try {
      const diff = Date.now() - new Date(ctx.lastRefreshed).getTime()
      const mins = Math.floor(diff / 60_000)
      if (mins < 2)   return 'Just now'
      if (mins < 60)  return `${mins}m ago`
      const hrs = Math.floor(mins / 60)
      if (hrs < 24)   return `${hrs}h ago`
      return `${Math.floor(hrs / 24)}d ago`
    } catch { return null }
  }, [ctx.lastRefreshed])

  return (
    <div className="bg-surface rounded-xl border border-divider p-4 flex flex-wrap items-center gap-4">
      {/* Customer switcher (dropdown) — shown in customer mode */}
      {ctx.activeCustomerId ? (
        <CustomerSwitcher />
      ) : (
        /* Standalone brand badge — when not in customer mode */
        ctx.isConfigured && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-soft-bg rounded-xl border border-red-soft/30">
            <span className="text-sm font-semibold text-ink">{ctx.brandConfig.brand_name}</span>
            <button
              onClick={() => ctx.setShowConfig(!ctx.showConfig)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-700 text-white hover:bg-red-800 active:bg-red-900 transition-colors shadow-sm"
            >
              <Pencil className="w-3 h-3" />
              Edit
            </button>
          </div>
        )
      )}

      {/* Date presets */}
      <div className="flex items-center gap-1 bg-canvas rounded-xl p-1">
        {(['7d', '30d', '90d', 'custom'] as const).map(preset => (
          <button key={preset} onClick={() => ctx.handleDatePreset(preset)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${ctx.datePreset === preset ? 'bg-ink text-ink-inv shadow-sm' : 'text-ink-2 hover:bg-surface-muted'}`}>
            {preset === 'custom' ? 'Custom' : preset.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Custom dates */}
      {ctx.datePreset === 'custom' && (
        <div className="flex items-center gap-2">
          <input type="date" value={ctx.startDate} onChange={e => ctx.setStartDate(e.target.value)}
            className="px-3 py-1.5 text-xs border border-divider rounded-lg bg-surface" />
          <span className="text-xs text-ink-3">to</span>
          <input type="date" value={ctx.endDate} onChange={e => ctx.setEndDate(e.target.value)}
            className="px-3 py-1.5 text-xs border border-divider rounded-lg bg-surface" />
        </div>
      )}

      {/* Last refreshed badge — shows when warehouse data is pre-loaded */}
      {refreshLabel && !ctx.isScanning && (
        <div className="flex items-center gap-1.5 text-[11px] text-ink-3">
          <RefreshCw className="w-3 h-3" />
          <span>Updated {refreshLabel}</span>
        </div>
      )}

      {/* Scan button — "force fresh" when warehouse already has data */}
      {ctx.isConfigured && (
        ctx.isScanning ? (
          <button onClick={ctx.handleStopScan}
            className="flex items-center gap-2 px-4 py-2 bg-caution-bg text-caution rounded-xl text-sm font-medium hover:bg-caution/20 transition-colors">
            <StopCircle className="w-4 h-4" />
            Stop
          </button>
        ) : (
          <button onClick={() => ctx.handleRunScan()} disabled={ctx.isScanning}
            className="flex items-center gap-2 px-4 py-2 bg-ink hover:bg-[#2d2d2c] text-ink-inv rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            title={ctx.warehouseLoaded ? 'Data is pre-loaded. Click to force a fresh scan.' : 'Scan to fetch latest AI visibility data.'}>
            <Search className="w-4 h-4" />
            {ctx.warehouseLoaded ? 'Refresh' : 'Scan'}
          </button>
        )
      )}
    </div>
  )
}
