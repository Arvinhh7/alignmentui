'use client'

import { Search, StopCircle } from 'lucide-react'
import { useUnified } from './UnifiedContext'

export function ControlBar() {
  const ctx = useUnified()

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center gap-4">
      {/* Brand badge */}
      {ctx.isConfigured && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-xl border border-red-100">
          <span className="text-sm font-semibold text-red-700">{ctx.brandConfig.brand_name}</span>
          <button onClick={() => ctx.setShowConfig(!ctx.showConfig)} className="text-xs text-red-400 hover:text-red-600">Edit</button>
        </div>
      )}

      {/* Date presets */}
      <div className="flex items-center gap-1 bg-gray-50 rounded-xl p-1">
        {(['7d', '30d', '90d', 'custom'] as const).map(preset => (
          <button key={preset} onClick={() => ctx.handleDatePreset(preset)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${ctx.datePreset === preset ? 'bg-red-500 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>
            {preset === 'custom' ? 'Custom' : preset.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Custom dates */}
      {ctx.datePreset === 'custom' && (
        <div className="flex items-center gap-2">
          <input type="date" value={ctx.startDate} onChange={e => ctx.setStartDate(e.target.value)}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white" />
          <span className="text-xs text-gray-400">to</span>
          <input type="date" value={ctx.endDate} onChange={e => ctx.setEndDate(e.target.value)}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white" />
        </div>
      )}

      {/* Scan button */}
      {ctx.isConfigured && (
        ctx.isScanning ? (
          <button onClick={ctx.handleStopScan}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors">
            <StopCircle className="w-4 h-4" />
            Stop
          </button>
        ) : (
          <button onClick={() => ctx.handleRunScan()} disabled={ctx.isScanning}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50">
            <Search className="w-4 h-4" />
            Scan
          </button>
        )
      )}
    </div>
  )
}
