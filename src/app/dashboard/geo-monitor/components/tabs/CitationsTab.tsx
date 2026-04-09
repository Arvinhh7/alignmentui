'use client'

import { useMemo } from 'react'
import { Globe, Link2 } from 'lucide-react'
import { useUnified } from '../UnifiedContext'
import { DonutChart, DataTable, formatNum, formatPct } from '../shared/ChartComponents'
import { DOMAIN_TYPE_LABELS, SOURCE_TYPE_LABELS } from '../shared/constants'

export function CitationsTab() {
  const ctx = useUnified()
  const scanResult = ctx.scanResult

  // ── Sub-tab buttons ──────────────────────────────────
  const subTabs: { key: typeof ctx.citationsSubTab; label: string }[] = [
    { key: 'sources_overview', label: 'Sources Overview' },
    { key: 'url_detail', label: 'URL Detail' },
  ]

  // ── Source Type Distribution (donut) ─────────────────
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
        color: DOMAIN_TYPE_LABELS[type]?.chartColor || '#9C978E',
      }))
  }, [scanResult])

  // ── URL Detail table rows ───────────────────────────
  const domainDetailRows = useMemo(() => {
    if (!scanResult?.source_domains) return []
    return scanResult.source_domains
      .slice()
      .sort((a, b) => b.url_count - a.url_count)
      .map(d => ({
        domain: d.domain,
        type: DOMAIN_TYPE_LABELS[d.domain_type]?.label || d.domain_type,
        urls: d.url_count,
        citation_share: d.citation_share ?? d.frequency_pct,
        frequency_pct: d.frequency_pct,
      }))
  }, [scanResult])

  return (
    <div className="space-y-6">
      {/* ── Sub-tab selector ─────────────────────────────── */}
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

      {/* ═══ Sources Overview sub-tab ═════════════════════ */}
      {ctx.citationsSubTab === 'sources_overview' && (
        <>
          {!scanResult ? (
            <div className="flex flex-col items-center justify-center py-20 text-ink-3">
              <Globe className="w-10 h-10 mb-3 text-ink-3 opacity-50" />
              <p className="text-sm font-medium">Run a scan to see citation data</p>
            </div>
          ) : (
            <>
              {/* Source Domain Cards */}
              <div>
                <h4 className="text-sm font-semibold text-ink-2 mb-3">Source Domains</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {scanResult.source_domains
                    .slice()
                    .sort((a, b) => b.url_count - a.url_count)
                    .map((d, i) => {
                      const typeInfo = DOMAIN_TYPE_LABELS[d.domain_type]
                      return (
                        <div key={i} className="bg-surface rounded-xl border border-divider p-5 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <Globe className="w-4 h-4 text-ink-3 flex-shrink-0" />
                              <span className="text-sm font-medium text-ink truncate">{d.domain}</span>
                            </div>
                            {typeInfo && (
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${typeInfo.color}`}>
                                {typeInfo.label}
                              </span>
                            )}
                          </div>
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
                        </div>
                      )
                    })}
                </div>
              </div>

              {/* Source Type Distribution Donut */}
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

      {/* ═══ URL Detail sub-tab ══════════════════════════ */}
      {ctx.citationsSubTab === 'url_detail' && (
        <>
          {!scanResult ? (
            <div className="flex flex-col items-center justify-center py-20 text-ink-3">
              <Link2 className="w-10 h-10 mb-3 text-ink-3 opacity-50" />
              <p className="text-sm font-medium">Run a scan to see citation data</p>
            </div>
          ) : (
            <div className="bg-surface rounded-xl border border-divider p-5">
              <h4 className="text-sm font-semibold text-ink-2 mb-3">URL Citation Details</h4>
              <DataTable
                columns={[
                  { key: 'domain', label: 'Domain' },
                  { key: 'type', label: 'Type' },
                  { key: 'urls', label: 'AI-Mentioned URLs', align: 'right', format: v => formatNum(v as number, 0) },
                  { key: 'citation_share', label: 'Citation Share', align: 'right', format: v => `${(v as number).toFixed(1)}%` },
                ]}
                rows={domainDetailRows}
                emptyText="No citation data available"
              />
            </div>
          )}
        </>
      )}

    </div>
  )
}
