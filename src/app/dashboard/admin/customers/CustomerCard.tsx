'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Globe, Clock, BarChart3, MessageSquare, ExternalLink,
  Archive, MoreVertical, TrendingUp,
} from 'lucide-react'
import { CustomerSummary, customersApi } from '@/lib/api'
import { BrandLogo } from '@/components/BrandLogo'

interface CustomerCardProps {
  customer: CustomerSummary
  userId: string
  onArchived: () => void
}

function relativeTime(iso: string | null): string {
  if (!iso) return 'Never'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return mins <= 1 ? 'Just now' : `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function scoreColor(score: number | null) {
  if (score === null) return 'text-ink-3'
  if (score >= 70) return 'text-sage'
  if (score >= 40) return 'text-caution'
  return 'text-red-soft'
}

export default function CustomerCard({ customer, userId, onArchived }: CustomerCardProps) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [archiving, setArchiving] = useState(false)

  const openMonitor = () => {
    router.push(`/dashboard/geo-monitor?customer=${customer.id}`)
  }

  const handleArchive = async () => {
    if (!confirm(`Archive "${customer.brand_name}"? This hides it from the list but keeps all scan data.`)) return
    setArchiving(true)
    setMenuOpen(false)
    try {
      await customersApi.archive(customer.id, userId)
      onArchived()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Archive failed.')
      setArchiving(false)
    }
  }

  const score = customer.latest_visibility_score
  const scoreDisplay = score !== null ? `${Math.round(score)}` : '—'

  return (
    <div
      className={`relative flex flex-col bg-surface border border-divider-light rounded-2xl p-5 hover:border-divider hover:shadow-sm transition-all duration-200 group ${
        archiving ? 'opacity-50 pointer-events-none' : ''
      }`}
    >
      {/* Top row: logo + brand name + menu */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {/* Official brand logo (Clearbit → favicon → initials) */}
          <BrandLogo domain={customer.domain} name={customer.brand_name} size={40} />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-ink truncate leading-tight">
              {customer.brand_name}
            </h3>
            {customer.domain && (
              <div className="flex items-center gap-1 mt-0.5">
                <Globe className="w-3 h-3 text-ink-3 flex-shrink-0" />
                <span className="text-[11px] text-ink-3 truncate">{customer.domain}</span>
              </div>
            )}
          </div>
        </div>

        {/* Kebab menu */}
        <div className="relative flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v) }}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-3 hover:text-ink hover:bg-surface-warm transition-colors opacity-0 group-hover:opacity-100"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-44 bg-ink border border-divider rounded-xl shadow-lg z-20 overflow-hidden">
                <button
                  onClick={(e) => { e.stopPropagation(); openMonitor() }}
                  className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs text-ink-inv hover:bg-white/10 transition-colors text-left"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open in Monitor
                </button>
                <div className="h-px bg-white/10 mx-2" />
                <button
                  onClick={(e) => { e.stopPropagation(); handleArchive() }}
                  className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs text-ink-inv/60 hover:bg-white/10 hover:text-red-soft transition-colors text-left"
                >
                  <Archive className="w-3.5 h-3.5" />
                  Archive
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {/* Visibility score */}
        <div className="flex flex-col items-center justify-center bg-surface-warm rounded-xl py-2.5 px-2">
          <TrendingUp className="w-3 h-3 text-ink-3 mb-1" />
          <span className={`text-lg font-bold leading-none ${scoreColor(score)}`}>{scoreDisplay}</span>
          <span className="text-[9px] text-ink-3 mt-0.5 uppercase tracking-wider">Score</span>
        </div>

        {/* Mentions */}
        <div className="flex flex-col items-center justify-center bg-surface-warm rounded-xl py-2.5 px-2">
          <MessageSquare className="w-3 h-3 text-ink-3 mb-1" />
          <span className="text-lg font-bold leading-none text-ink-2">
            {customer.latest_mentions_found ?? '—'}
          </span>
          <span className="text-[9px] text-ink-3 mt-0.5 uppercase tracking-wider">Mentions</span>
        </div>

        {/* Total scans */}
        <div className="flex flex-col items-center justify-center bg-surface-warm rounded-xl py-2.5 px-2">
          <BarChart3 className="w-3 h-3 text-ink-3 mb-1" />
          <span className="text-lg font-bold leading-none text-ink-2">
            {customer.total_scans}
          </span>
          <span className="text-[9px] text-ink-3 mt-0.5 uppercase tracking-wider">Scans</span>
        </div>
      </div>

      {/* Last scan */}
      <div className="flex items-center gap-1.5 mb-4">
        <Clock className="w-3 h-3 text-ink-3 flex-shrink-0" />
        <span className="text-[11px] text-ink-3">
          Last scan: {relativeTime(customer.latest_scanned_at ?? customer.last_scan_at)}
        </span>
      </div>

      {/* Notes snippet */}
      {customer.notes && (
        <p className="text-[11px] text-ink-3 italic truncate mb-4 -mt-1">
          {customer.notes}
        </p>
      )}

      {/* CTA */}
      <button
        onClick={openMonitor}
        className="mt-auto w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-surface-warm text-ink-3 hover:bg-surface-muted hover:text-ink transition-colors"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        Open in Monitor
      </button>
    </div>
  )
}
