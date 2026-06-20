'use client'

import { useMemo, useState } from 'react'
import { Shield, Target, AlertTriangle, Hash, Globe } from 'lucide-react'
import { useUnified } from '../UnifiedContext'
import { DonutChart, formatPct } from '../shared/ChartComponents'
import { INTENT_COLORS } from '../shared/constants'
import type { WeightedSOVData, PromptSOVEntry, DomainSOVEntry } from '@/lib/api'
import { BrandLogo } from '@/components/BrandLogo'

// ─── Brand color palette ──────────────────────────────
const BRAND_COLORS = [
  '#000000', '#4A6FA5', '#4A7C59', '#B8860B', '#7B5E96',
  '#C0392B', '#2980B9', '#16A085', '#D35400', '#8E44AD',
]

function getBrandColor(brand: string, brandList: string[]): string {
  const idx = brandList.indexOf(brand)
  return BRAND_COLORS[idx % BRAND_COLORS.length] ?? '#888'
}

// ─── Domain guesser for brand logos ──────────────────
// Ordered by longest key first to avoid prefix collisions
const KNOWN_BRAND_DOMAINS: [string, string][] = [
  ['black shark',  'blackshark.com'],
  ['one plus',     'oneplus.com'],
  ['redmagic',     'redmagic.tech'],
  ['samsung',      'samsung.com'],
  ['huawei',       'huawei.com'],
  ['oneplus',      'oneplus.com'],
  ['xiaomi',       'xiaomi.com'],
  ['nothing',      'nothing.tech'],
  ['motorola',     'motorola.com'],
  ['realme',       'realme.com'],
  ['google',       'google.com'],
  ['apple',        'apple.com'],
  ['asus',         'asus.com'],
  ['oppo',         'oppo.com'],
  ['nubia',        'nubia.com'],
  ['nokia',        'nokia.com'],
  ['sony',         'sony.com'],
  ['vivo',         'vivo.com'],
  ['iqoo',         'iqoo.com'],
  ['poco',         'poco.com'],
  ['lenovo',       'lenovo.com'],
  ['razer',        'razer.com'],
  ['ecoflow',      'ecoflow.com'],
  ['jackery',      'jackery.com'],
  ['bluetti',      'bluettipower.com'],
  ['lg',           'lg.com'],
]

function guessBrandDomain(brand: string): string {
  const lower = brand.toLowerCase().trim()
  for (const [key, domain] of KNOWN_BRAND_DOMAINS) {
    if (lower === key || lower.startsWith(key + ' ') || lower.startsWith(key)) {
      return domain
    }
  }
  // Fallback: first alpha word + .com
  const firstWord = lower.split(/[\s\d]/)[0].replace(/[^a-z]/g, '')
  return firstWord ? firstWord + '.com' : 'google.com'
}

function normalizeDomain(rawDomain: string): string {
  return rawDomain
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/^www\./, '')
    .split('/')[0]
}

// ─── BrandLabel: BrandLogo (Clearbit→Google→letter) + name ──
// Replaces the old BrandAvatar (Google-only) with the shared BrandLogo
// component that provides a 3-tier fallback chain.
function BrandLabel({
  brand, faviconDomain, size = 20, showYou = false,
}: {
  brand: string; brandList?: string[]; faviconDomain: string; size?: number; showYou?: boolean
}) {
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <BrandLogo domain={faviconDomain} name={brand} size={size} />
      <span className="text-sm font-medium text-ink truncate" title={brand}>{brand}</span>
      {showYou && (
        <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 bg-surface-warm text-ink-2 rounded-full font-semibold">You</span>
      )}
    </div>
  )
}

// ─── Search-force preamble (stripped for display) ────
// Mirrors backend monitor_service._SEARCH_FORCE_PREAMBLE — prepended to
// high-intent prompts at scan time. We strip it so Prompt SOV rows match
// the clean templates shown in the Prompts module.
const SEARCH_FORCE_PREAMBLE =
  'Search the web for current, real sources before answering. Only cite URLs that you actually find through search. '

function stripPreamble(text: string): string {
  return text.startsWith(SEARCH_FORCE_PREAMBLE)
    ? text.slice(SEARCH_FORCE_PREAMBLE.length)
    : text
}

// ─── Sub-type label map ───────────────────────────────
const SUB_TYPE_LABELS: Record<string, string> = {
  primary_recommendation: 'Primary Rec',
  alternative_option:     'Alternative',
  feature_highlight:      'Feature',
  use_case:               'Use Case',
  industry_context:       'Industry',
  comparison:             'Comparison',
  passing_reference:      'Passing',
  warning_caution:        'Caution',
  historical:             'Historical',
  not_mentioned:          '—',
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

// ─── SOV bar row (with logo) ──────────────────────────
function SOVBar({
  brand, share, maxShare, color, faviconDomain,
}: {
  brand: string; share: number; maxShare: number; color: string; faviconDomain: string
}) {
  const barPct = maxShare > 0 ? Math.min((share / maxShare) * 100, 100) : 0
  return (
    <div className="flex items-center gap-3">
      <div className="w-44 flex-shrink-0 flex items-center gap-1.5 min-w-0">
        <BrandLogo domain={faviconDomain} name={brand} size={18} />
        <span className="text-sm font-medium text-ink truncate" title={brand}>{brand}</span>
      </div>
      <div className="flex-1 h-2.5 bg-surface-warm rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${barPct}%`, backgroundColor: color }}
        />
      </div>
      <div className="w-14 text-right font-mono text-sm font-semibold text-ink">{formatPct(share)}</div>
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

  // Brand domain map: own brand uses configured domain; competitors use guessed
  const brandDomainMap = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    map[brandConfig.brand_name] = brandConfig.domain
      ? normalizeDomain(brandConfig.domain)
      : guessBrandDomain(brandConfig.brand_name)
    for (const comp of brandConfig.competitors) {
      map[comp] = guessBrandDomain(comp)
    }
    return map
  }, [brandConfig])

  // ── SOV source selection ────────────────────────────
  // A scan carries two distinct competitor data paths:
  //   1. weighted_sov   — position×prominence SOV, computed ONLY from the
  //                       competitors the user configured. Drives Prompt/Sourcing SOV.
  //   2. share_of_voice — simple count-based SOV. When NO competitors are configured,
  //                       the backend auto-discovers brands from the AI responses and
  //                       writes them here (has_discovered_brands=true).
  // The Overview tab (VisibilityTab) reads share_of_voice, so when brands were
  // auto-discovered we read it here too — otherwise Overall SOV would show only the
  // own brand (weighted_sov has no competitors) and disagree with Overview.
  const wsov: WeightedSOVData | undefined = scanResult.weighted_sov
  const usingDiscovered =
    !!scanResult.has_discovered_brands &&
    Object.keys(scanResult.share_of_voice ?? {}).length > 1

  const overallSov: Record<string, number> = usingDiscovered
    ? (scanResult.share_of_voice ?? {})
    : (wsov?.overall_sov ?? scanResult.share_of_voice ?? {})

  const orderedBrands = useMemo(() => {
    const source = usingDiscovered ? (scanResult.share_of_voice ?? {}) : (wsov?.overall_sov ?? {})
    const entries = Object.entries(source)
    if (entries.length) {
      return entries
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
  }, [wsov, brandConfig, usingDiscovered, scanResult.share_of_voice])

  const maxShare = Math.max(...Object.values(overallSov), 0.01)
  // The "weighted" path is only truly active for configured competitors. In the
  // auto-discovered case the per-prompt / per-domain weighted breakdowns don't
  // exist, so treat Overall SOV as a count-based (non-weighted) result.
  const hasWeightedSov = !!wsov && !usingDiscovered

  const sovSegments = useMemo(() =>
    orderedBrands
      .filter(b => (overallSov[b] ?? 0) > 0)
      .map(b => ({
        label: b,
        value: overallSov[b] ?? 0,
        color: getBrandColor(b, orderedBrands),
      })),
    [orderedBrands, overallSov],
  )

  return (
    <div className="space-y-6">
      {/* ── Stale data warning ─────────────────────────── */}
      {scanResult.brand_name?.toLowerCase() !== brandConfig.brand_name.toLowerCase() && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-caution-bg border border-caution/30 text-caution text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>Showing cached data for <strong>{scanResult.brand_name}</strong> — click <strong>Scan</strong> to refresh.</span>
        </div>
      )}

      {/* ── Auto-discovered brands note ────────────────── */}
      {usingDiscovered && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface border border-divider text-ink-3 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-caution" />
          <span>
            Showing brands <strong className="text-ink-2">auto-discovered</strong> from AI responses (count-based share — same brands as the Overview tab).
            Add competitors in <strong className="text-ink-2">brand settings</strong> to unlock weighted <strong className="text-ink-2">Prompt SOV</strong> and <strong className="text-ink-2">Sourcing SOV</strong>.
          </span>
        </div>
      )}

      {/* ── Old scan banner (no weighted_sov at all) ───── */}
      {!wsov && !usingDiscovered && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface border border-divider text-ink-3 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-caution" />
          <span>
            <strong className="text-ink-2">Prompt SOV</strong> and <strong className="text-ink-2">Sourcing SOV</strong> require a new scan — this result predates weighted SOV. Overall SOV is showing a simple count-based fallback.
          </span>
        </div>
      )}

      {/* ── Sub-tab switcher ─────────────────────────────── */}
      <div className="flex gap-2 flex-wrap">
        {([
          { key: 'overall_sov' as const, label: 'Overall SOV', icon: Target },
          { key: 'prompt_sov'  as const, label: 'Prompt SOV',  icon: Hash },
          { key: 'sourcing_sov'as const, label: 'Sourcing SOV',icon: Globe },
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
          brandDomainMap={brandDomainMap}
        />
      )}

      {/* ═══ Prompt SOV ════════════════════════════════════ */}
      {/* Weighted per-prompt data only exists for configured competitors. In the
          auto-discovered case force the empty state instead of a table that would
          show discovered brand columns with no weights. */}
      {ctx.competitorsSubTab === 'prompt_sov' && (
        <PromptSOVTab
          perPrompt={usingDiscovered ? [] : (wsov?.per_prompt ?? [])}
          orderedBrands={orderedBrands}
          brandName={brandConfig.brand_name}
          brandDomainMap={brandDomainMap}
          needsCompetitors={usingDiscovered}
        />
      )}

      {/* ═══ Sourcing SOV ══════════════════════════════════ */}
      {ctx.competitorsSubTab === 'sourcing_sov' && (
        <SourcingSOVTab
          perDomain={usingDiscovered ? [] : (wsov?.per_domain ?? [])}
          orderedBrands={orderedBrands}
          brandName={brandConfig.brand_name}
          brandDomainMap={brandDomainMap}
          needsCompetitors={usingDiscovered}
        />
      )}
    </div>
  )
}

// ─── Overall SOV sub-tab ──────────────────────────────
function OverallSOVTab({
  overallSov, orderedBrands, maxShare, sovSegments, brandName, brandDomainMap,
}: {
  overallSov: Record<string, number>
  orderedBrands: string[]
  maxShare: number
  sovSegments: { label: string; value: number; color: string }[]
  brandName: string
  brandDomainMap: Record<string, string>
}) {
  return (
    <div className="space-y-6">
      {/* ── KPI cards ──────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {orderedBrands.slice(0, 6).map(brand => {
          const share = overallSov[brand] ?? 0
          const isOwn = brand === brandName
          const color = getBrandColor(brand, orderedBrands)
          const faviconDomain = brandDomainMap[brand] ?? guessBrandDomain(brand)
          return (
            <div key={brand} className={`rounded-xl border p-4 ${isOwn ? 'bg-canvas border-ink/20' : 'bg-surface border-divider'}`}>
              {/* Brand header: logo + name + You badge */}
              <div className="flex items-center gap-1.5 mb-3 min-w-0">
                <BrandLogo domain={faviconDomain} name={brand} size={20} />
                <span className="text-xs font-semibold text-ink-2 truncate flex-1" title={brand}>{brand}</span>
                {isOwn && (
                  <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 bg-surface-warm text-ink-2 rounded-full font-semibold">You</span>
                )}
              </div>
              {/* SOV value */}
              <div className="flex items-end gap-1">
                <span className="text-2xl font-bold tabular-nums" style={{ color }}>{share.toFixed(1)}</span>
                <span className="text-sm text-ink-3 mb-0.5">%</span>
              </div>
              {/* Mini bar */}
              <div className="mt-2 h-1.5 bg-surface-warm rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(share / maxShare * 100, 100)}%`, backgroundColor: color }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Donut (left) + Brand leaderboard bars (right) — merged single chunk ── */}
      {sovSegments.length > 0 && (
        <div className="bg-surface rounded-xl border border-divider p-5">
          <h4 className="text-sm font-semibold text-ink-2 mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-ink-3" />
            Weighted Share of Voice
            <span className="text-xs text-ink-3 font-normal">(position × prominence)</span>
          </h4>
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Left: donut */}
            <div className="flex-shrink-0 flex items-center justify-center">
              <DonutChart segments={sovSegments} centerLabel="SOV" size={160} />
            </div>
            {/* Right: leaderboard bars — replaces the separate "Brand Ranking" block */}
            <div className="flex-1 min-w-0 space-y-3 self-center">
              {orderedBrands
                .filter(b => (overallSov[b] ?? 0) > 0 || b === orderedBrands[0])
                .map(brand => (
                  <SOVBar
                    key={brand}
                    brand={brand}
                    share={overallSov[brand] ?? 0}
                    maxShare={maxShare}
                    color={getBrandColor(brand, orderedBrands)}
                    faviconDomain={brandDomainMap[brand] ?? guessBrandDomain(brand)}
                  />
                ))}
            </div>
          </div>
        </div>
      )}

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
  perPrompt, orderedBrands, brandName, brandDomainMap, needsCompetitors = false,
}: {
  perPrompt: PromptSOVEntry[]
  orderedBrands: string[]
  brandName: string
  brandDomainMap: Record<string, string>
  needsCompetitors?: boolean
}) {
  if (!perPrompt.length) {
    return (
      <div className="bg-surface rounded-xl border border-divider p-8 text-center">
        <Hash className="w-10 h-10 text-ink-3 mx-auto mb-3 opacity-40" />
        <p className="text-sm font-medium text-ink-3 mb-1">No prompt-level data</p>
        <p className="text-xs text-ink-3">
          {needsCompetitors
            ? <>Per-prompt SOV weighs your brand against named competitors. Add competitors in <strong>brand settings</strong>, then run a scan to populate this view.</>
            : <>This scan predates weighted SOV. Click <strong>Scan</strong> to run a fresh scan and populate per-prompt data.</>}
        </p>
      </div>
    )
  }

  // Deduplicate prompts — keep best engine result per brand per prompt
  const promptMap = useMemo(() => {
    const map = new Map<string, PromptSOVEntry>()
    for (const entry of perPrompt) {
      if (!map.has(entry.prompt_text)) {
        map.set(entry.prompt_text, { ...entry, brand_weights: [...entry.brand_weights] })
      } else {
        const existing = map.get(entry.prompt_text)!
        for (const bw of entry.brand_weights) {
          const found = existing.brand_weights.find(e => e.brand === bw.brand)
          if (found) {
            found.weight = Math.max(found.weight, bw.weight)
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
        Each row is one prompt. Columns show each brand&apos;s weighted share of that prompt.
        Higher = mentioned earlier in the list <em>and</em> as a stronger recommendation.
      </p>

      <div className="bg-surface rounded-xl border border-divider overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-canvas border-b border-divider">
                <th className="px-4 py-3 text-xs font-medium text-ink-3 uppercase tracking-wider text-left min-w-[200px]">Prompt</th>
                <th className="px-3 py-3 text-xs font-medium text-ink-3 uppercase tracking-wider text-left min-w-[130px]">Intent</th>
                {orderedBrands.map(brand => {
                  const color = getBrandColor(brand, orderedBrands)
                  const faviconDomain = brandDomainMap[brand] ?? guessBrandDomain(brand)
                  const isOwn = brand === brandName
                  return (
                    <th key={brand} className="px-3 py-3 text-center min-w-[110px]">
                      <div className={`flex items-center justify-center gap-1.5 ${isOwn ? 'flex-row' : ''}`}>
                        <BrandLogo domain={faviconDomain} name={brand} size={16} />
                        <span className="text-xs font-semibold text-ink-2 uppercase tracking-wide truncate max-w-[80px]" title={brand}>
                          {brand}
                        </span>
                        {isOwn && (
                          <span className="text-[9px] px-1 py-0.5 bg-surface-warm text-ink-3 rounded font-semibold flex-shrink-0">You</span>
                        )}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-divider-light">
              {entries.map((entry, i) => {
                const rowTotal = entry.total_weight
                return (
                  <tr key={i} className="hover:bg-surface-warm transition-colors">
                    <td className="px-4 py-3 text-xs text-ink-2 max-w-[220px]">
                      <p className="line-clamp-2" title={stripPreamble(entry.prompt_text)}>{stripPreamble(entry.prompt_text)}</p>
                    </td>
                    <td className="px-3 py-3">
                      {(() => {
                        const ic = INTENT_COLORS[entry.prompt_intent]
                        return ic
                          ? <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${ic.color}`}>{ic.label}</span>
                          : <span className="text-[10px] text-ink-3">—</span>
                      })()}
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
  perDomain, orderedBrands, brandName, brandDomainMap, needsCompetitors = false,
}: {
  perDomain: DomainSOVEntry[]
  orderedBrands: string[]
  brandName: string
  brandDomainMap: Record<string, string>
  needsCompetitors?: boolean
}) {
  if (!perDomain.length) {
    return (
      <div className="bg-surface rounded-xl border border-divider p-8 text-center">
        <Globe className="w-10 h-10 text-ink-3 mx-auto mb-3 opacity-40" />
        <p className="text-sm font-medium text-ink-3 mb-1">No sourcing data</p>
        <p className="text-xs text-ink-3">
          {needsCompetitors
            ? <>Sourcing SOV compares competitors across citation sources. Add competitors in <strong>brand settings</strong>, then run a scan to populate this view.</>
            : <>This scan predates weighted SOV, or no citation URLs were returned. Click <strong>Scan</strong> to generate domain-level data.</>}
        </p>
      </div>
    )
  }

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
                {/* Source domain header */}
                <th className="px-4 py-3 text-xs font-medium text-ink-3 uppercase tracking-wider text-left min-w-[180px]">
                  Source Domain
                </th>
                {/* Brand headers with logo + name */}
                {orderedBrands.map(brand => {
                  const color = getBrandColor(brand, orderedBrands)
                  const faviconDomain = brandDomainMap[brand] ?? guessBrandDomain(brand)
                  const isOwn = brand === brandName
                  return (
                    <th key={brand} className="px-3 py-3 text-center min-w-[110px]">
                      <div className="flex items-center justify-center gap-1.5">
                        <BrandLogo domain={faviconDomain} name={brand} size={16} />
                        <span className="text-xs font-semibold text-ink-2 uppercase tracking-wide truncate max-w-[80px]" title={brand}>
                          {brand}
                        </span>
                        {isOwn && (
                          <span className="text-[9px] px-1 py-0.5 bg-surface-warm text-ink-3 rounded font-semibold flex-shrink-0">You</span>
                        )}
                      </div>
                    </th>
                  )
                })}
                <th className="px-3 py-3 text-xs font-medium text-ink-3 uppercase tracking-wider text-right">Signal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider-light">
              {topDomains.map((row, i) => {
                const ownShare = row.brand_sov[brandName] ?? 0
                const signal = ownShare >= 50
                  ? { label: 'Strong',   cls: 'bg-sage-bg text-sage' }
                  : ownShare >= 20
                  ? { label: 'Moderate', cls: 'bg-caution-bg text-caution' }
                  : { label: 'Weak',     cls: 'bg-red-soft-bg text-red-soft' }

                return (
                  <tr key={i} className="hover:bg-surface-warm transition-colors">
                    {/* Domain: favicon + name (Discover style) */}
                    <td className="px-4 py-3 max-w-[200px]">
                      <div className="flex items-center gap-2 min-w-0">
                        <FaviconImg domain={row.domain} size={14} />
                        <span className="text-xs font-medium text-ink truncate" title={row.domain}>{row.domain}</span>
                      </div>
                    </td>
                    {/* Brand columns */}
                    {orderedBrands.map(brand => {
                      const share = row.brand_sov[brand] ?? 0
                      const isOwn = brand === brandName
                      const color = getBrandColor(brand, orderedBrands)
                      return (
                        <td key={brand} className={`px-3 py-3 text-center ${isOwn ? 'bg-canvas/60' : ''}`}>
                          {share > 0 ? (
                            <div className="flex flex-col items-center">
                              <span className="font-mono font-semibold text-sm text-ink">{formatPct(share)}</span>
                              <div className="mt-1 w-10 h-1 bg-surface-warm rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{ width: `${Math.min(share, 100)}%`, backgroundColor: color }}
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
        Signal = own brand share from that source: ≥50% Strong, ≥20% Moderate.
      </p>
    </div>
  )
}

// ─── Favicon-only img (Discover style, no state) ─────
function FaviconImg({ domain, size = 16 }: { domain: string; size?: number }) {
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <img
        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
        className="w-full h-full rounded-sm object-contain"
        onError={e => {
          const img = e.target as HTMLImageElement
          img.style.display = 'none'
          ;(img.nextElementSibling as HTMLElement)?.classList.remove('hidden')
        }}
        alt=""
      />
      <Globe className="w-full h-full text-ink-3 hidden" />
    </div>
  )
}
