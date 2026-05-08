'use client'

import { useMemo, useState } from 'react'
import { Globe, ExternalLink, ArrowRight, MapIcon } from 'lucide-react'
import Link from 'next/link'
import { useLanguage } from '@/lib/LanguageContext'
import type { DiscoverResult, MonitorScanResult, SourceDomainInfo } from '@/lib/api'
import { DASHBOARD_ROUTES } from '../shared/constants'

// ── Types ─────────────────────────────────────────────

export type CTMStatus = 'gap' | 'defend' | 'amplify' | 'bonus' | 'monitor'

export interface CTMRow {
  domain: string
  domain_type: string
  discover_weight: number   // prompt_count from discover
  intent_coverage: number   // 0-4
  in_scan: boolean
  scan_url_count: number
  status: CTMStatus
}

// ── Computation (pure, no hooks) ──────────────────────

export function computeCTM(
  discover: DiscoverResult,
  scan: MonitorScanResult | null,
): CTMRow[] {
  const scanMap = new Map<string, SourceDomainInfo>(
    (scan?.source_domains ?? []).map(s => [s.domain, s] as [string, SourceDomainInfo])
  )

  return discover.source_domains.map(src => {
    const scanSrc = scanMap.get(src.domain)
    const inScan = !!scanSrc
    const isCore = src.intent_coverage >= 3 || src.prompt_count >= 8
    const isCompetitor = src.domain_type === 'competitor'
    const isOwned = src.domain_type === 'you' || src.domain_type === 'corporate'

    let status: CTMStatus
    if (inScan && isCompetitor) status = 'defend'
    else if (inScan && (isOwned || isCore)) status = 'amplify'
    else if (inScan && !isCore) status = 'bonus'
    else if (isCore && !inScan) status = 'gap'
    else status = 'monitor'

    return {
      domain: src.domain,
      domain_type: src.domain_type,
      discover_weight: src.prompt_count,
      intent_coverage: src.intent_coverage,
      in_scan: inScan,
      scan_url_count: scanSrc?.url_count ?? 0,
      status,
    }
  })
}

// ── Config per status ──────────────────────────────────

const STATUS_CONFIG: Record<CTMStatus, {
  labelKey: 'statusGap' | 'statusDefend' | 'statusAmplify' | 'statusBonus' | 'statusMonitor'
  actionKey: 'actionPitch' | 'actionCounter' | 'actionAmplify' | 'actionMonitor'
  color: string
  dot: string
  href: (domain: string) => string
  external: boolean
}> = {
  gap:     { labelKey: 'statusGap',     actionKey: 'actionPitch',   color: 'bg-red-soft-bg text-red-soft',   dot: 'bg-red-soft',   href: () => DASHBOARD_ROUTES.distribute, external: false },
  defend:  { labelKey: 'statusDefend',  actionKey: 'actionCounter', color: 'bg-caution-bg text-caution',     dot: 'bg-caution',    href: () => DASHBOARD_ROUTES.content,    external: false },
  amplify: { labelKey: 'statusAmplify', actionKey: 'actionAmplify', color: 'bg-sage-bg text-sage',           dot: 'bg-sage',       href: () => DASHBOARD_ROUTES.monitor,    external: false },
  bonus:   { labelKey: 'statusBonus',   actionKey: 'actionAmplify', color: 'bg-surface-warm text-ink-2',     dot: 'bg-ink-3',      href: () => DASHBOARD_ROUTES.monitor,    external: false },
  monitor: { labelKey: 'statusMonitor', actionKey: 'actionMonitor', color: 'bg-surface-muted text-ink-3',    dot: 'bg-divider',    href: d  => `https://${d}`,              external: true  },
}

type FilterKey = 'all' | CTMStatus

// ── Main component ─────────────────────────────────────

interface Props {
  discoverResult: DiscoverResult
  scanResult: MonitorScanResult | null
}

export function CitationTruthMap({ discoverResult, scanResult }: Props) {
  const { t } = useLanguage()
  const d = t.dashboard.discover.truthMap
  const [filter, setFilter] = useState<FilterKey>('all')

  const rows = useMemo(() => computeCTM(discoverResult, scanResult), [discoverResult, scanResult])

  const gapCount = useMemo(() => rows.filter(r => r.status === 'gap').length, [rows])

  const visible = useMemo(() =>
    filter === 'all' ? rows : rows.filter(r => r.status === filter),
    [rows, filter]
  )

  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: 'all',     label: d.filterAll },
    { key: 'gap',     label: d.filterGap },
    { key: 'defend',  label: d.filterDefend },
    { key: 'amplify', label: d.filterAmplify },
    { key: 'bonus',   label: d.filterBonus },
  ]

  if (!scanResult) {
    return (
      <div className="bg-surface rounded-xl border border-divider p-8 text-center">
        <MapIcon className="w-8 h-8 mx-auto mb-3 text-ink-3 opacity-40" />
        <p className="text-sm font-medium text-ink-2">{d.noScanTitle}</p>
        <p className="text-xs text-ink-3 mt-1.5 max-w-xs mx-auto leading-relaxed">{d.noScanDesc}</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div>
          <h4 className="text-sm font-semibold text-ink">{d.title}</h4>
          <p className="text-xs text-ink-3 mt-0.5">{d.subtitle}</p>
        </div>
        {gapCount > 0 && (
          <span className="text-xs px-2.5 py-1 rounded-full bg-red-soft-bg text-red-soft font-medium flex-shrink-0">
            {d.gapSummary(gapCount)}
          </span>
        )}
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-1.5 mb-4 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === f.key
                ? 'bg-ink text-ink-inv'
                : 'bg-surface-warm text-ink-2 hover:bg-surface-muted'
            }`}
          >
            {f.label}
            {f.key !== 'all' && (
              <span className="ml-1 opacity-60">
                {rows.filter(r => r.status === f.key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-divider overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_80px_64px_120px_80px] bg-canvas px-4 py-2.5 border-b border-divider-light text-[10px] font-semibold text-ink-3 uppercase tracking-wide">
          <span>{d.colSource}</span>
          <span className="text-right">{d.colDiscover}</span>
          <span className="text-center">{d.colScan}</span>
          <span className="text-center">{d.colStatus}</span>
          <span className="text-right">{d.colAction}</span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-divider-light">
          {visible.slice(0, 50).map(row => {
            const cfg = STATUS_CONFIG[row.status]
            const href = cfg.href(row.domain)

            return (
              <div key={row.domain}
                className="grid grid-cols-[1fr_80px_64px_120px_80px] px-4 py-3 items-center hover:bg-surface-warm/50 transition-colors">

                {/* Source */}
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${row.domain}&sz=32`}
                    onError={e => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                    className="w-4 h-4 flex-shrink-0 rounded-sm object-contain"
                    alt=""
                  />
                  <Globe className="w-4 h-4 text-ink-3 flex-shrink-0 hidden" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-ink truncate">{row.domain}</p>
                    {/* Intent coverage bar */}
                    <div className="flex gap-0.5 mt-1" title={`${row.intent_coverage}/4 intents`}>
                      {[0,1,2,3].map(i => (
                        <div key={i} className={`h-0.5 w-3 rounded-full ${i < row.intent_coverage ? 'bg-ink-2' : 'bg-divider'}`} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Discover weight */}
                <div className="text-right">
                  <span className="text-sm font-mono font-bold text-ink">{row.discover_weight}</span>
                </div>

                {/* In scan */}
                <div className="flex justify-center">
                  {row.in_scan ? (
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-sage" />
                      <span className="text-[10px] text-sage font-medium">{row.scan_url_count}</span>
                    </div>
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-divider" />
                  )}
                </div>

                {/* Status badge */}
                <div className="flex justify-center">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${cfg.color}`}>
                    {d[cfg.labelKey]}
                  </span>
                </div>

                {/* Action */}
                <div className="flex justify-end">
                  {cfg.external ? (
                    <a href={href} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[11px] font-medium text-ink-2 hover:text-ink transition-colors">
                      {d[cfg.actionKey]}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <Link href={href}
                      className="flex items-center gap-1 text-[11px] font-medium text-ink-2 hover:text-ink transition-colors">
                      {d[cfg.actionKey]}
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>
            )
          })}

          {visible.length === 0 && (
            <div className="px-4 py-8 text-center text-xs text-ink-3">
              No sources match this filter.
            </div>
          )}
        </div>
      </div>

      {visible.length > 50 && (
        <p className="text-xs text-ink-3 mt-2 text-center">
          Showing top 50 of {visible.length} sources
        </p>
      )}
    </div>
  )
}
