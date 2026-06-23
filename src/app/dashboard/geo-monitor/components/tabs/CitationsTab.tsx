'use client'

import { useMemo } from 'react'
import { Globe, Link2, Check, Zap, ArrowRight, Minus, AlertCircle, AlertTriangle } from 'lucide-react'
import { useUnified } from '../UnifiedContext'
import { DonutChart, DataTable, formatNum, formatPct } from '../shared/ChartComponents'
import { DOMAIN_TYPE_LABELS, SOURCE_TYPE_LABELS } from '../shared/constants'

// ── Action signal per domain type ─────────────────────
const ACTION_SIGNALS: Record<string, {
  icon: React.ElementType
  label: string
  className: string
}> = {
  you:           { icon: Check,        label: 'Your Source',      className: 'text-sage' },
  corporate:     { icon: Check,        label: 'Your Source',      className: 'text-sage' },
  competitor:    { icon: Zap,          label: 'Compete Here',     className: 'text-caution' },
  editorial:     { icon: ArrowRight,   label: 'Invest Here',      className: 'text-ink-2' },
  pr_wire:       { icon: ArrowRight,   label: 'Press Coverage',   className: 'text-purple-600' },
  reference:     { icon: ArrowRight,   label: 'Invest Here',      className: 'text-ink-2' },
  institutional: { icon: ArrowRight,   label: 'Invest Here',      className: 'text-ink-2' },
  ugc:           { icon: AlertCircle,  label: 'Community Signal', className: 'text-ink-3' },
  coupon:        { icon: Minus,        label: 'Discount Coverage',className: 'text-ink-3' },
  other:         { icon: Minus,        label: 'Monitor',          className: 'text-ink-3' },
}

// ── Favicon with Globe fallback ───────────────────────
function DomainFavicon({ domain }: { domain: string }) {
  return (
    <div className="relative w-4 h-4 flex-shrink-0">
      <img
        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
        className="w-4 h-4 rounded-sm object-contain"
        alt=""
      />
      <Globe className="absolute inset-0 w-4 h-4 text-ink-3 hidden peer-[.loaded]:hidden" />
    </div>
  )
}

export function CitationsTab() {
  const ctx = useUnified()
  // Engine-scoped view: when a model pill is selected the scan is re-sliced to
  // that engine (UnifiedContext.scopedScanResult). 'all' = aggregate passthrough.
  const scanResult = ctx.scopedScanResult

  const subTabs: { key: typeof ctx.citationsSubTab; label: string }[] = [
    { key: 'sources_overview', label: 'Sources Overview' },
    { key: 'url_detail', label: 'URL Detail' },
  ]

  const sourceTypeSegments = useMemo(() => {
    if (!scanResult?.source_domains) return []
    const counts: Record<string, number> = {}
    scanResult.source_domains.forEach(d => {
      counts[d.domain_type] = (counts[d.domain_type] || 0) + d.url_count
    })
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({
        label: DOMAIN_TYPE_LABELS[type]?.label || type,
        value: count,
        color: DOMAIN_TYPE_LABELS[type]?.chartColor || '#2D2B27',
      }))
  }, [scanResult])

  // Flattened to one row per actual cited URL (URL Detail tab)
  const urlDetailRows = useMemo(() => {
    if (!scanResult?.source_domains) return []
    return scanResult.source_domains
      .slice()
      .sort((a, b) => b.url_count - a.url_count)
      .flatMap(d => {
        const share = d.citation_share ?? d.frequency_pct
        if (d.urls && d.urls.length > 0) {
          return d.urls.map(url => ({
            domain: d.domain,
            domain_type: d.domain_type,
            url,
            citation_share: share,
          }))
        }
        return [{ domain: d.domain, domain_type: d.domain_type, url: `https://${d.domain}`, citation_share: share }]
      })
  }, [scanResult])

  return (
    <div className="space-y-6">
      {/* ── Level 3: Stale data warning ────────────────── */}
      {ctx.scanResult && ctx.scanResult.brand_name?.toLowerCase() !== ctx.brandConfig.brand_name.toLowerCase() && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-caution-bg border border-caution/30 text-caution text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>Showing cached data for <strong>{ctx.scanResult.brand_name}</strong> — click <strong>Scan</strong> to refresh for <strong>{ctx.brandConfig.brand_name}</strong>.</span>
        </div>
      )}
      {/* ── Sub-tab selector ───────────────────────── */}
      <div className="flex gap-1 p-1 bg-surface-warm rounded-lg w-fit">
        {subTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => ctx.setCitationsSubTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              ctx.citationsSubTab === tab.key
                ? 'bg-surface text-ink shadow-sm'
                : 'text-ink-3 hover:text-ink-2'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ Sources Overview ══════════════════════ */}
      {ctx.citationsSubTab === 'sources_overview' && (
        <>
          {!scanResult ? (
            <div className="flex flex-col items-center justify-center py-20 text-ink-3">
              <Globe className="w-10 h-10 mb-3 opacity-50" />
              <p className="text-sm font-medium">Run a scan to see citation data</p>
            </div>
          ) : (
            <>
              <div>
                <h4 className="text-sm font-semibold text-ink-2 mb-3">Source Domains</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {scanResult.source_domains
                    .slice()
                    .sort((a, b) => b.url_count - a.url_count)
                    .map((d, i) => {
                      const typeInfo = DOMAIN_TYPE_LABELS[d.domain_type]
                      const signal = ACTION_SIGNALS[d.domain_type] ?? ACTION_SIGNALS.other
                      const SignalIcon = signal.icon
                      const isYou = d.domain_type === 'you' || d.domain_type === 'corporate'

                      return (
                        <div
                          key={i}
                          className="relative bg-surface rounded-xl border border-divider p-5 hover:shadow-md transition-shadow overflow-hidden"
                        >
                          {/* Left accent bar for your domains only */}
                          {isYou && (
                            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#4A7C59] rounded-l-xl" />
                          )}

                          {/* Header: favicon + domain + type badge */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <img
                                src={`https://www.google.com/s2/favicons?domain=${d.domain}&sz=32`}
                                onError={e => {
                                  const img = e.target as HTMLImageElement
                                  img.style.display = 'none'
                                  img.nextElementSibling?.classList.remove('hidden')
                                }}
                                className="w-4 h-4 flex-shrink-0 rounded-sm object-contain"
                                alt=""
                              />
                              <Globe className="w-4 h-4 text-ink-3 flex-shrink-0 hidden" />
                              <a
                                href={`https://${d.domain}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sm font-medium text-ink truncate hover:text-sage hover:underline underline-offset-2 transition-colors"
                              >
                                {d.domain}
                              </a>
                            </div>
                            {typeInfo && (
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ml-2 ${typeInfo.color}`}>
                                {typeInfo.label}
                              </span>
                            )}
                          </div>

                          {/* Stats row */}
                          <div className="flex items-end justify-between">
                            <div>
                              <p className="text-2xl font-bold font-mono text-ink">{d.url_count}</p>
                              <p className="text-xs text-ink-3">AI-mentioned URLs</p>
                            </div>
                            <div className="text-right">
                              {d.citation_share != null ? (
                                <>
                                  <p className="text-lg font-bold font-mono text-ink-2">{d.citation_share.toFixed(1)}%</p>
                                  <p className="text-xs text-ink-3">Citation share</p>
                                </>
                              ) : (
                                <>
                                  <p className="text-lg font-bold font-mono text-ink-2">{formatPct(d.frequency_pct)}</p>
                                  <p className="text-xs text-ink-3">Frequency</p>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Action signal footer */}
                          <div className="mt-3 pt-3 border-t border-divider-light flex items-center gap-1.5">
                            <SignalIcon className={`w-3 h-3 flex-shrink-0 ${signal.className}`} />
                            <span className={`text-xs font-medium ${signal.className}`}>{signal.label}</span>
                          </div>

                          {/* Actual cited URLs */}
                          {d.urls && d.urls.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {d.urls.slice(0, 3).map((url, j) => (
                                <a
                                  key={j}
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-1 text-[11px] text-ink-3 hover:text-sage transition-colors group"
                                  title={url}
                                >
                                  <Link2 className="w-3 h-3 flex-shrink-0 opacity-50 group-hover:opacity-100" />
                                  <span className="truncate hover:underline underline-offset-2">
                                    {url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                                  </span>
                                </a>
                              ))}
                              {d.urls.length > 3 && (
                                <p className="text-[11px] text-ink-3 pl-4">+{d.urls.length - 3} more</p>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                </div>
              </div>

              {sourceTypeSegments.length > 0 && (
                <div className="bg-surface rounded-xl border border-divider p-5">
                  <h4 className="text-sm font-semibold text-ink-2 mb-4">Source Type Distribution</h4>
                  <div className="flex justify-center">
                    <DonutChart
                      segments={sourceTypeSegments}
                      centerLabel={formatNum(sourceTypeSegments.reduce((s, seg) => s + seg.value, 0), 0)}
                      size={180}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ═══ URL Detail ════════════════════════════ */}
      {ctx.citationsSubTab === 'url_detail' && (
        <>
          {!scanResult ? (
            <div className="flex flex-col items-center justify-center py-20 text-ink-3">
              <Link2 className="w-10 h-10 mb-3 opacity-50" />
              <p className="text-sm font-medium">Run a scan to see citation data</p>
            </div>
          ) : (
            <div className="bg-surface rounded-xl border border-divider p-5">
              <h4 className="text-sm font-semibold text-ink-2 mb-3">URL Citation Details</h4>
              <DataTable
                columns={[
                  {
                    key: 'domain',
                    label: 'Domain',
                    format: (_v, row) => (
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={`https://www.google.com/s2/favicons?domain=${row.domain}&sz=32`}
                          onError={e => {
                            const img = e.target as HTMLImageElement
                            img.style.display = 'none'
                            img.nextElementSibling?.classList.remove('hidden')
                          }}
                          className="w-4 h-4 flex-shrink-0 rounded-sm object-contain"
                          alt=""
                        />
                        <Globe className="w-4 h-4 text-ink-3 flex-shrink-0 hidden" />
                        <span className="text-ink font-medium text-sm">{String(row.domain)}</span>
                      </div>
                    ),
                  },
                  {
                    key: 'url',
                    label: 'Cited URL',
                    format: (v) => (
                      <a
                        href={String(v)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-sm text-sage hover:underline underline-offset-2 transition-colors max-w-[380px] group"
                        title={String(v)}
                      >
                        <Link2 className="w-3.5 h-3.5 flex-shrink-0 opacity-60 group-hover:opacity-100" />
                        <span className="truncate">
                          {String(v).replace(/^https?:\/\//, '')}
                        </span>
                      </a>
                    ),
                  },
                  {
                    key: 'domain_type',
                    label: 'Type',
                    format: (_v) => {
                      const typeInfo = DOMAIN_TYPE_LABELS[String(_v)]
                      if (!typeInfo) return <span className="text-ink-3 text-xs">{String(_v)}</span>
                      return (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${typeInfo.color}`}>
                          {typeInfo.label}
                        </span>
                      )
                    },
                  },
                  {
                    key: 'citation_share',
                    label: 'Citation Share',
                    align: 'right',
                    format: v => `${(v as number).toFixed(1)}%`,
                  },
                  {
                    key: 'domain_type',
                    label: 'Action',
                    format: (_v) => {
                      const signal = ACTION_SIGNALS[String(_v)] ?? ACTION_SIGNALS.other
                      const SignalIcon = signal.icon
                      return (
                        <div className={`flex items-center gap-1 ${signal.className}`}>
                          <SignalIcon className="w-3 h-3 flex-shrink-0" />
                          <span className="text-xs font-medium">{signal.label}</span>
                        </div>
                      )
                    },
                  },
                ]}
                rows={urlDetailRows}
                emptyText="No citation data available"
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
