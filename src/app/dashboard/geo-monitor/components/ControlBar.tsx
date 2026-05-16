'use client'

import { Search, StopCircle, Pencil, Briefcase, Loader2 } from 'lucide-react'
import { useUnified } from './UnifiedContext'
import Link from 'next/link'

export function ControlBar() {
  const ctx = useUnified()

  return (
    <div className="bg-surface rounded-xl border border-divider p-4 flex flex-wrap items-center gap-4">
      {/* Customer-mode badge — shown when viewing a customer's data */}
      {ctx.activeCustomerId && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-caution-bg rounded-xl border border-[rgba(184,134,11,0.25)]">
          {ctx.customerHydrating
            ? <Loader2 className="w-3.5 h-3.5 text-caution animate-spin" />
            : <Briefcase className="w-3.5 h-3.5 text-caution" />
          }
          <span className="text-xs font-semibold text-caution">
            {ctx.customerHydrating ? 'Loading customer…' : 'Customer View'}
          </span>
          <Link
            href="/dashboard/admin/customers"
            className="text-[10px] font-bold text-caution/70 hover:text-caution underline underline-offset-2 transition-colors"
          >
            ← Customers
          </Link>
        </div>
      )}

      {/* Brand badge */}
      {ctx.isConfigured && (
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

      {/* Scan button */}
      {ctx.isConfigured && (
        ctx.isScanning ? (
          <button onClick={ctx.handleStopScan}
            className="flex items-center gap-2 px-4 py-2 bg-caution-bg text-caution rounded-xl text-sm font-medium hover:bg-caution/20 transition-colors">
            <StopCircle className="w-4 h-4" />
            Stop
          </button>
        ) : (
          <button onClick={() => ctx.handleRunScan()} disabled={ctx.isScanning}
            className="flex items-center gap-2 px-4 py-2 bg-ink hover:bg-[#2d2d2c] text-ink-inv rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
            <Search className="w-4 h-4" />
            Scan
          </button>
        )
      )}
    </div>
  )
}
