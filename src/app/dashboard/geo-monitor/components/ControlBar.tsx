'use client'

import { useState, useMemo } from 'react'
import { Search, StopCircle, RefreshCw, Bookmark } from 'lucide-react'
import { useUnified } from './UnifiedContext'

/**
 * Scan controls shared by Monitoring and Analysis.
 * Customer profile editing lives in AI Research; this bar only consumes profile
 * readiness from UnifiedContext to run scans and save report snapshots.
 */
export function ControlBar() {
  const ctx = useUnified()
  const [savedFeedback, setSavedFeedback] = useState(false)

  const handleSaveReport = () => {
    ctx.saveSnapshot()
    setSavedFeedback(true)
    setTimeout(() => setSavedFeedback(false), 2500)
  }

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

      {/* Save Report — freeze current metrics as a named snapshot for client delivery */}
      {ctx.isConfigured && !ctx.isScanning && (ctx.warehouseLoaded || ctx.scanResult) && (
        <button
          onClick={handleSaveReport}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            savedFeedback
              ? 'bg-sage-bg text-sage border border-sage/30'
              : 'bg-surface border border-divider text-ink-2 hover:bg-surface-warm hover:border-divider'
          }`}
          title="Freeze current metrics as a report snapshot — won't change on future scans"
        >
          <Bookmark className={`w-4 h-4 ${savedFeedback ? 'fill-sage text-sage' : ''}`} />
          {savedFeedback ? 'Saved!' : 'Save Report'}
        </button>
      )}
    </div>
  )
}
