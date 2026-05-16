'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Globe, Clock, BarChart3, MessageSquare, ExternalLink,
  Archive, MoreVertical, TrendingUp,
} from 'lucide-react'
import { CustomerSummary, customersApi } from '@/lib/api'

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
  if (score === null) return 'text-[rgba(250,245,236,0.3)]'
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
      className={`relative flex flex-col bg-[rgba(250,245,236,0.03)] border border-[rgba(250,245,236,0.07)] rounded-2xl p-5 hover:border-[rgba(250,245,236,0.14)] hover:bg-[rgba(250,245,236,0.045)] transition-all duration-200 group ${
        archiving ? 'opacity-50 pointer-events-none' : ''
      }`}
    >
      {/* Top row: brand name + menu */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-ink-inv truncate leading-tight">
            {customer.brand_name}
          </h3>
          {customer.domain && (
            <div className="flex items-center gap-1 mt-0.5">
              <Globe className="w-3 h-3 text-[rgba(250,245,236,0.3)] flex-shrink-0" />
              <span className="text-[11px] text-[rgba(250,245,236,0.35)] truncate">{customer.domain}</span>
            </div>
          )}
        </div>

        {/* Menu */}
        <div className="relative flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v) }}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-[rgba(250,245,236,0.25)] hover:text-[rgba(250,245,236,0.6)] hover:bg-[rgba(250,245,236,0.06)] transition-colors opacity-0 group-hover:opacity-100"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-40 bg-ink border border-[rgba(250,245,236,0.1)] rounded-xl shadow-elevation-lg z-20 overflow-hidden">
                <button
                  onClick={(e) => { e.stopPropagation(); openMonitor() }}
                  className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs text-[rgba(250,245,236,0.6)] hover:bg-[rgba(250,245,236,0.06)] hover:text-ink-inv transition-colors text-left"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open in Monitor
                </button>
                <div className="h-px bg-[rgba(250,245,236,0.06)] mx-2" />
                <button
                  onClick={(e) => { e.stopPropagation(); handleArchive() }}
                  className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs text-[rgba(250,245,236,0.4)] hover:bg-[rgba(250,245,236,0.06)] hover:text-red-soft transition-colors text-left"
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
        <div className="flex flex-col items-center justify-center bg-[rgba(250,245,236,0.03)] rounded-xl py-2.5 px-2">
          <TrendingUp className="w-3 h-3 text-[rgba(250,245,236,0.25)] mb-1" />
          <span className={`text-lg font-bold leading-none ${scoreColor(score)}`}>{scoreDisplay}</span>
          <span className="text-[9px] text-[rgba(250,245,236,0.25)] mt-0.5 uppercase tracking-wider">Score</span>
        </div>

        {/* Mentions */}
        <div className="flex flex-col items-center justify-center bg-[rgba(250,245,236,0.03)] rounded-xl py-2.5 px-2">
          <MessageSquare className="w-3 h-3 text-[rgba(250,245,236,0.25)] mb-1" />
          <span className="text-lg font-bold leading-none text-[rgba(250,245,236,0.7)]">
            {customer.latest_mentions_found ?? '—'}
          </span>
          <span className="text-[9px] text-[rgba(250,245,236,0.25)] mt-0.5 uppercase tracking-wider">Mentions</span>
        </div>

        {/* Total scans */}
        <div className="flex flex-col items-center justify-center bg-[rgba(250,245,236,0.03)] rounded-xl py-2.5 px-2">
          <BarChart3 className="w-3 h-3 text-[rgba(250,245,236,0.25)] mb-1" />
          <span className="text-lg font-bold leading-none text-[rgba(250,245,236,0.7)]">
            {customer.total_scans}
          </span>
          <span className="text-[9px] text-[rgba(250,245,236,0.25)] mt-0.5 uppercase tracking-wider">Scans</span>
        </div>
      </div>

      {/* Last scan */}
      <div className="flex items-center gap-1.5 mb-4">
        <Clock className="w-3 h-3 text-[rgba(250,245,236,0.2)] flex-shrink-0" />
        <span className="text-[11px] text-[rgba(250,245,236,0.3)]">
          Last scan: {relativeTime(customer.latest_scanned_at ?? customer.last_scan_at)}
        </span>
      </div>

      {/* Notes snippet */}
      {customer.notes && (
        <p className="text-[11px] text-[rgba(250,245,236,0.3)] italic truncate mb-4 -mt-1">
          {customer.notes}
        </p>
      )}

      {/* CTA */}
      <button
        onClick={openMonitor}
        className="mt-auto w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-[rgba(250,245,236,0.06)] text-[rgba(250,245,236,0.6)] hover:bg-[rgba(250,245,236,0.1)] hover:text-ink-inv transition-colors"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        Open in Monitor
      </button>
    </div>
  )
}
