'use client'

import { useMemo } from 'react'
import { Shield, Target, AlertTriangle, BarChart2, Hash, Globe } from 'lucide-react'
import { useUnified } from '../UnifiedContext'
import { DonutChart, formatPct } from '../shared/ChartComponents'
import type { WeightedSOVData, PromptSOVEntry, DomainSOVEntry } from '@/lib/api'

// ─── Brand color palette ──────────────────────────────
const BRAND_COLORS = [
  '#000000', '#4A6FA5', '#4A7C59', '#B8860B', '#7B5E96',
  '#C0392B', '#2980B9', '#16A085', '#D35400', '#8E44AD',
]

function getBrandColor(brand: string, brandList: string[]): string {
  const idx = brandList.indexOf(brand)
  return BRAND_COLORS[idx % BRAND_COLORS.length] ?? '#888'
}

// ─── Sub-type label map ───────────────────────────────
const SUB_TYPE_LABELS: Record<string, string> = {
  primary_recommendation: 'Primary Rec',
  alternative_option: 'Alternative',
  feature_highlight: 'Feature',
  use_case: 'Use Case',
  industry_context: 'Industry',
  comparison: 'Comparison',
  passing_reference: 'Passing',
  warning_caution: 'Caution',
  historical: 'Historical',
  not_mentioned: '—',
}

// ─── Weight badge ─────────────────────────────────────
function WeightBadge({ weight }: { weight: number }) {
  const pct = Math.round(weight * 100)
  const color =
    pct >= 80 ? 'bg-sage-bg text-sage' :
    pct >= 50 ? 'bg-canvas text-ink-2' :
    pct >= 20 ? 'bg-surface-warm text-ink-3' :
    'bg-red-soft-bg text-red-soft'
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${color}`}>
      {pct}
    </span>
  )
}

// ─── SOV bar row ──────────────────────────────────────
function SOVBar({ brand, share, maxShare, color }: { brand: string; share: number; maxShare: number; color: string }) {
  const barPct = maxShare > 0 ? Math.min((share / maxShare) * 100, 100) : 0
  return (
    <div className="flex items-center gap-3">
      <div className="w-32 flex-shrink-0 text-sm font-medium text-ink truncate" title={brand}>{brand}</div>
      <div className="flex-1 h-2.5 bg-surface-warm rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${barPct}%`, backgroundColor: color }}
        />
      </div>
      <div className="w-16 text-right font-mono text-sm font-semibold text-ink">{formatPct(share)}</div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────
export function CompetitorsTab() {
  const ctx = useUnified()
  const { scanResult, brandConfig } = ctx

  // No data state
  if (!scanResult) {
    return (
      <div className="text-center py-16 text-ink-3">
        <Shield className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p className="text-sm font-medium">Run a scan first</p>
        <p className="text-xs mt-1">Competitor SOV analysis will appear here after your first scan.</p>
      </div>
    )
  }

  // Ordered brand list for consistent color assignment
  const orderedBrands = useMemo(() => {
    const wsov = scanResult.weighted_sov
    if (wsov?.overall_sov) {
      // Sort by descending share; own brand first if tied
      return Object.entries(wsov.overall_sov)
        .sort(([a, aShare], [b, bShare]) => {
          if (Math.abs(aShare - bShare) < 0.01) {
            if (a === brandConfig.brand_name) return -1
            if (b === brandConfig.brand_name) return 1
          }
          return bShare - aShare
        })
        .map(([brand]) => brand)
    }
    return [brandConfig.brand_name, ...brandConfig.competitors]
  }, [scanResult.weighted_sov, brandConfig])

  const wsov: WeightedSOVData | undefined = scanResult.weighted_sov

  // Fallback: if no weighted_sov (old scan), derive simple SOV from share_of_voice
  const overallSov: Record<string, number> = wsov?.overall_sov ?? scanResult.share_of_voice ?? {}
  const maxShare = Math.max(...Object.values(overallSov), 0.01)

  // Donut chart segments
  const sovSegments = useMemo(() =>
    orderedBrands
      .filter(b => (overallSov[b] ?? 0) > 0)
      .map((b, i) => ({
        label: b,
        value: overallSov[b] ?? 0,
        color: getBrandColor(b, orderedBrands),
      })),
    [orderedBrands, overallSov],
  )

  // Detect old scan without weighted_sov (pre-Sprint 5)
  const hasWeightedSov = !!wsov

  return (
    <div className="space-y-6">
      {/* ── Stale data warning ───────────────────────────── */}
      {scanResult.brand_name?.toLowerCase() !== brandConfig.brand_name.toLowerCase() && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-caution-bg border border-caution/30 text-caution text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>Showing cached data for <strong>{scanResult.brand_name}</strong> — click <strong>Scan</strong> to refresh.</span>
        </div>
      )}

      {/* ── Old scan banner (no weighted_sov) ──────────── */}
      {!hasWeightedSov && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface border border-divider text-ink-3 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-caution" />
          <span>
            <strong className="text-ink-2">Prompt SOV</strong> and <strong className="text-ink-2">Sourcing SOV</strong> require a new scan — this result predates weighted SOV.
            Overall SOV is showing a simple count-based fallback.
          </span>
        </div>
      )}

      {/* ── Sub-tab switcher ─────────────────────────────── */}
      <div className="flex gap-2 flex-wrap">
        {([
          { key: 'overall_sov' as const, label: 'Overall SOV', icon: Target },
          { key: 'prompt_sov' as const, label: 'Prompt SOV', icon: Hash },
          { key: 'sourcing_sov' as const, label: 'Sourcing SOV', icon: Globe },
        ]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => ctx.setCompetitorsSubTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              ctx.competitorsSubTab === key
                ? 'bg-ink text-ink-inv border border-ink'
                : 'bg-canvas text-ink-3 hover:bg-surface-muted border border-transparent'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ═══ Overall SOV ═══════════════════════════════════ */}
      {ctx.competitorsSubTab === 'overall_sov' && (
        <OverallSOVTab
          overallSov={overallSov}
          orderedBrands={orderedBrands}
          maxShare={maxShare}
          sovSegments={sovSegments}
          brandName={brandConfig.brand_name}
        />
      )}

      {/* ═══ Prompt SOV ════════════════════════════════════ */}
      {ctx.competitorsSubTab === 'prompt_sov' && (
        <PromptSOVTab
          perPrompt={wsov?.per_prompt ?? []}
          orderedBrands={orderedBrands}
          brandName={brandConfig.brand_name}
        />
      )}

      {/* ═══ Sourcing SOV ══════════════════════════════════ */}
      {ctx.competitorsSubTab === 'sourcing_sov' && (
        <SourcingSOVTab
          perDomain={wsov?.per_domain ?? []}
          orderedBrands={orderedBrands}
          brandName={brandConfig.brand_name}
        />
      )}
    </div>
  )
}

// ─── Overall SOV sub-tab ──────────────────────────────
function OverallSOVTab({
  overallSov, orderedBrands, maxShare, sovSegments, brandName,
}: {
  overallSov: Record<string, number>
  orderedBrands: string[]
  maxShare: number
  sovSegments: { label: string; value: number; color: string }[]
  brandName: string
}) {
  return (
    <div className="space-y-6">
      {/* ── KPI cards ──────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {orderedBrands.slice(0, 6).map(brand => {
          const share = overallSov[brand] ?? 0
          const isOwn = brand === brandName
          const color = getBrandColor(brand, orderedBrands)
          return (
            <div key={brand} className={`rounded-xl border p-4 ${isOwn ? 'bg-canvas border-ink/20' : 'bg-surface border-divider'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-ink-3 truncate max-w-[80%]" title={brand}>{brand}</span>
                {isOwn && <span className="text-[10px] px-1.5 py-0.5 bg-surface-warm text-ink-2 rounded-full font-semibold">You</span>}
              </div>
              <div className="flex items-end gap-1">
                <span className="text-2xl font-bold tabular-nums" style={{ color }}>{share.toFixed(1)}</span>
                <span className="text-sm text-ink-3 mb-0.5">%</span>
              </div>
              <div className="mt-2 h-1.5 bg-surface-warm rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(share / maxShare * 100, 100)}%`, backgroundColor: color }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Donut chart ────────────────────────────────── */}
      {sovSegments.length > 0 && (
        <div className="bg-surface rounded-xl border border-divider p-5">
          <h4 className="text-sm font-semibold text-ink-2 mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-ink-3" />
            Weighted Share of Voice
            <span className="text-xs text-ink-3 font-normal">(position × prominence)</span>
          </h4>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <DonutChart segments={sovSegments} centerLabel="SOV" size={180} />
            {/* Legend */}
            <div className="space-y-2 flex-1 min-w-0">
              {orderedBrands.filter(b => (overallSov[b] ?? 0) > 0).map(brand => (
                <div key={brand} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: getBrandColor(brand, orderedBrands) }} />
                  <span className="text-xs text-ink-2 truncate flex-1">{brand}</span>
                  <span className="text-xs font-mono font-semibold text-ink">{formatPct(overallSov[brand] ?? 0)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Ranked bar chart ────────────────────────────── */}
      <div className="bg-surface rounded-xl border border-divider p-5">
        <h4 className="text-sm font-semibold text-ink-2 mb-4 flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-ink-3" />
          Brand Ranking
        </h4>
        <div className="space-y-3">
          {orderedBrands
            .filter(b => (overallSov[b] ?? 0) > 0 || b === orderedBrands[0])
            .map(brand => (
              <SOVBar
                key={brand}
                brand={brand}
                share={overallSov[brand] ?? 0}
                maxShare={maxShare}
                color={getBrandColor(brand, orderedBrands)}
              />
            ))}
        </div>
      </div>

      {/* ── Weight legend ───────────────────────────────── */}
      <div className="bg-canvas rounded-xl border border-divider-light p-4">
        <p className="text-xs text-ink-3 font-medium mb-2">How weights are calculated</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-3">
          <span><strong className="text-ink-2">Position weight</strong> = 1 / log₂(rank+1) — DCG; unranked prose = 1.0</span>
          <span><strong className="text-ink-2">Prominence weight</strong>: primary rec 1.0 → passing ref 0.2</span>
          <span><strong className="text-ink-2">SOV</strong> = Σ brand_weight / Σ all_weights</span>
        </div>
      </div>
    </div>
  )
}

// ─── Prompt SOV sub-tab ───────────────────────────────
function PromptSOVTab({
  perPrompt, orderedBrands, brandName,
}: {
  perPrompt: PromptSOVEntry[]
  orderedBrands: string[]
  brandName: string
}) {
  if (!perPrompt.length) {
    return (
      <div className="bg-surface rounded-xl border border-divider p-8 text-center">
        <Hash className="w-10 h-10 text-ink-3 mx-auto mb-3 opacity-40" />
        <p className="text-sm font-medium text-ink-3 mb-1">No prompt-level data</p>
        <p className="text-xs text-ink-3">
          This scan predates weighted SOV. Click <strong>Scan</strong> to run a fresh scan and populate per-prompt data.
        </p>
      </div>
    )
  }

  // Deduplicate prompts (multiple engines → merge weights by averaging)
  const promptMap = useMemo(() => {
    const map = new Map<string, PromptSOVEntry>()
    for (const entry of perPrompt) {
      if (!map.has(entry.prompt_text)) {
        map.set(entry.prompt_text, entry)
      } else {
        // Merge brand_weights for same prompt (multiple engines)
        const existing = map.get(entry.prompt_text)!
        for (const bw of entry.brand_weights) {
          const found = existing.brand_weights.find(e => e.brand === bw.brand)
          if (found) {
            found.weight = Math.max(found.weight, bw.weight)  // take best engine result
          } else {
            existing.brand_weights.push({ ...bw })
          }
        }
        existing.total_weight = existing.brand_weights.reduce((s, b) => s + b.weight, 0)
      }
    }
    return map
  }, [perPrompt])

  const entries = Array.from(promptMap.values())

  return (
    <div className="space-y-4">
      <p className="text-xs text-ink-3">
        Each row is one prompt. Columns show each brand&apos;s weighted contribution to that prompt.
        Higher = mentioned earlier in the list <em>and</em> as a stronger recommendation.
      </p>

      <div className="bg-surface rounded-xl border border-divider overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-canvas border-b border-divider">
                <th className="px-4 py-3 text-xs font-medium text-ink-3 uppercase tracking-wider text-left min-w-[200px]">Prompt</th>
                {orderedBrands.map(b => (
                  <th key={b} className="px-3 py-3 text-xs font-medium text-ink-3 uppercase tracking-wider text-center min-w-[90px]">
                    <span className="flex items-center justify-center gap-1">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getBrandColor(b, orderedBrands) }} />
                      <span className="truncate max-w-[70px]" title={b}>{b}</span>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-divider-light">
              {entries.map((entry, i) => {
                const rowTotal = entry.total_weight
                return (
                  <tr key={i} className="hover:bg-surface-warm transition-colors">
                    <td className="px-4 py-3 text-xs text-ink-2 max-w-[220px]">
                      <p className="line-clamp-2" title={entry.prompt_text}>{entry.prompt_text}</p>
                    </td>
                    {orderedBrands.map(brand => {
                      const bw = entry.brand_weights.find(w => w.brand === brand)
                      const share = bw && rowTotal > 0 ? bw.weight / rowTotal * 100 : 0
                      const isOwn = brand === brandName
                      return (
                        <td key={brand} className={`px-3 py-3 text-center ${isOwn ? 'bg-canvas/60' : ''}`}>
                          {bw && bw.weight > 0 ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="font-mono font-semibold text-xs text-ink">{formatPct(share)}</span>
                              <WeightBadge weight={bw.weight} />
                              <span className="text-[10px] text-ink-3">{SUB_TYPE_LABELS[bw.sub_type] ?? bw.sub_type}</span>
                            </div>
                          ) : (
                            <span className="text-ink-3 text-xs">—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-ink-3">
        Weight badge = <span className="font-mono">pos_weight × prom_weight × 100</span>.
        Share % = brand weight / row total.
      </p>
    </div>
  )
}

// ─── Sourcing SOV sub-tab ─────────────────────────────
function SourcingSOVTab({
  perDomain, orderedBrands, brandName,
}: {
  perDomain: DomainSOVEntry[]
  orderedBrands: string[]
  brandName: string
}) {
  if (!perDomain.length) {
    return (
      <div className="bg-surface rounded-xl border border-divider p-8 text-center">
        <Globe className="w-10 h-10 text-ink-3 mx-auto mb-3 opacity-40" />
        <p className="text-sm font-medium text-ink-3 mb-1">No sourcing data</p>
        <p className="text-xs text-ink-3">
          This scan predates weighted SOV, or no citation URLs were returned. Click <strong>Scan</strong> to generate domain-level data.
        </p>
      </div>
    )
  }

  // Top 15 domains by total weight
  const topDomains = perDomain.slice(0, 15)

  return (
    <div className="space-y-4">
      <p className="text-xs text-ink-3">
        Which AI citation sources drive brand visibility — and for whom.
        Share = brand&apos;s weighted share of mentions from that domain.
      </p>

      <div className="bg-surface rounded-xl border border-divider overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-canvas border-b border-divider">
                <th className="px-4 py-3 text-xs font-medium text-ink-3 uppercase tracking-wider text-left min-w-[160px]">Source Domain</th>
                {orderedBrands.map(b => (
                  <th key={b} className="px-3 py-3 text-xs font-medium text-ink-3 uppercase tracking-wider text-center min-w-[90px]">
                    <span className="flex items-center justify-center gap-1">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getBrandColor(b, orderedBrands) }} />
                      <span className="truncate max-w-[70px]" title={b}>{b}</span>
                    </span>
                  </th>
                ))}
                <th className="px-3 py-3 text-xs font-medium text-ink-3 uppercase tracking-wider text-right">Signal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider-light">
              {topDomains.map((row, i) => {
                const ownShare = row.brand_sov[brandName] ?? 0
                const signal = ownShare >= 50
                  ? { label: 'Strong', cls: 'bg-sage-bg text-sage' }
                  : ownShare >= 20
                  ? { label: 'Moderate', cls: 'bg-caution-bg text-caution' }
                  : { label: 'Weak', cls: 'bg-red-soft-bg text-red-soft' }
                return (
                  <tr key={i} className="hover:bg-surface-warm transition-colors">
                    <td className="px-4 py-3 text-xs font-medium text-ink max-w-[180px]">
                      <span className="truncate block" title={row.domain}>{row.domain}</span>
                    </td>
                    {orderedBrands.map(brand => {
                      const share = row.brand_sov[brand] ?? 0
                      const isOwn = brand === brandName
                      return (
                        <td key={brand} className={`px-3 py-3 text-center ${isOwn ? 'bg-canvas/60' : ''}`}>
                          {share > 0 ? (
                            <div className="flex flex-col items-center">
                              <span className="font-mono font-semibold text-sm text-ink">{formatPct(share)}</span>
                              <div className="mt-1 w-12 h-1 bg-surface-warm rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{ width: `${Math.min(share, 100)}%`, backgroundColor: getBrandColor(brand, orderedBrands) }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-ink-3 text-xs">—</span>
                          )}
                        </td>
                      )
                    })}
                    <td className="px-3 py-3 text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${signal.cls}`}>
                        {signal.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-ink-3">
        Showing top {topDomains.length} citation sources by total weighted signal.
        Signal = own brand share from that source: ≥50% = Strong, ≥20% = Moderate.
      </p>
    </div>
  )
}
