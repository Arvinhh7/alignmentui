'use client'

import { useMemo, useState } from 'react'
import { Shield, Target, AlertTriangle, Hash, Globe, Sparkles, Pin, RefreshCw, ExternalLink } from 'lucide-react'
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

// ─── Heatmap cell shading ─────────────────────────────
// Brand-hued intensity: each matrix cell is tinted with the brand's own color
// at alpha ∝ share, so each row reads at a glance as "who owns this prompt /
// source". Text flips to white on dark cells (estimated composite luminance)
// so the % stays legible across the whole palette. rgba (not solid) lets the
// tint compose over the row's hover background too.
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  const n = parseInt(full, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function heatCell(hexColor: string, share: number): { bg: string | undefined; dark: boolean } {
  const s = Math.max(0, Math.min(share, 100)) / 100
  if (s <= 0) return { bg: undefined, dark: false }
  const alpha = 0.14 + 0.74 * s                 // floor so small shares still register
  const [r, g, b] = hexToRgb(hexColor)
  const base = 247                              // light surface the tint composites over
  const lum = (
    0.299 * (r * alpha + base * (1 - alpha)) +
    0.587 * (g * alpha + base * (1 - alpha)) +
    0.114 * (b * alpha + base * (1 - alpha))
  ) / 255
  return { bg: `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`, dark: lum < 0.58 }
}

// Tiny low→high gradient swatch shown next to the heatmap intro copy.
function HeatLegend() {
  return (
    <span className="inline-flex items-center gap-1 align-middle">
      <span className="text-[10px] text-ink-3">low</span>
      <span
        className="inline-block h-2.5 w-16 rounded-sm border border-divider-light"
        style={{ background: 'linear-gradient(to right, rgba(74,111,165,0.10), rgba(74,111,165,0.88))' }}
      />
      <span className="text-[10px] text-ink-3">high share</span>
    </span>
  )
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
  const [tracked, setTracked] = useState(false)

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
    // Server-resolved official domains (brand_logos cache) win for every detected
    // brand — unified logo source of truth shared with Brand Ranking / Overview.
    for (const [name, dom] of Object.entries(scanResult.brand_domains ?? {})) {
      if (dom) map[name] = dom
    }
    return map
  }, [brandConfig, scanResult.brand_domains])

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

  // Does the scan carry weighted per-prompt rows? (true for both pinned competitors
  // AND the new provisional auto-discovered weighting). When true, Prompt/Sourcing
  // SOV render real data instead of an empty "configure competitors" gate.
  const hasWeightedRows = (wsov?.per_prompt?.length ?? 0) > 0
  // Weighted against auto-discovered (not pinned) brands — drives the "pin them" nudge.
  const provisional = !!wsov?.provisional

  // User HAS pinned competitors, but this cached scan predates them (it auto-discovered
  // instead). Their weighted SOV won't reflect the pinned set until a rescan.
  const staleConfig =
    brandConfig.competitors.length > 0 && !!scanResult.has_discovered_brands

  // Brands auto-found in this scan that the user hasn't yet configured as named competitors
  const discoveredCompetitors = usingDiscovered
    ? Object.keys(scanResult.share_of_voice ?? {}).filter(b => b !== brandConfig.brand_name)
    : []

  const handleTrackDiscovered = () => {
    if (discoveredCompetitors.length) {
      ctx.handleSaveConfig('', discoveredCompetitors.join(', '), '')
    }
    setTracked(true)
  }

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

  // Brand set + order for the WEIGHTED tabs (Prompt / Sourcing). When weighted data
  // exists (pinned or provisional) derive columns from the weighted overall_sov so we
  // show exactly the brands that were scored — not the wider count-based discovery set.
  const weightedBrands = useMemo(() => {
    const src = wsov?.overall_sov ?? {}
    const entries = Object.entries(src)
    if (!entries.length) return orderedBrands
    return entries
      .sort(([a, aS], [b, bS]) => {
        if (Math.abs(aS - bS) < 0.01) {
          if (a === brandConfig.brand_name) return -1
          if (b === brandConfig.brand_name) return 1
        }
        return bS - aS
      })
      .map(([b]) => b)
      .slice(0, 8)   // cap matrix columns — extraction can surface many rivals; show the top by share
  }, [wsov, brandConfig.brand_name, orderedBrands])

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

      {/* ── Stale config: user pinned competitors AFTER this scan ran ──────
          Most specific case — show it instead of the generic discovered banner. */}
      {staleConfig && !tracked && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-caution-bg border border-caution/30 text-sm">
          <RefreshCw className="w-4 h-4 flex-shrink-0 text-caution mt-0.5" />
          <div className="flex-1 min-w-0">
            <span className="text-ink font-medium">Your tracked competitors changed since this scan.</span>
            <span className="text-ink-3"> This result was scanned before you added{' '}
              <strong className="text-ink-2">{brandConfig.competitors.join(', ')}</strong>
              {' '}— click <strong className="text-ink-2">Scan</strong> to compute their weighted Prompt &amp; Sourcing SOV.
            </span>
          </div>
        </div>
      )}

      {/* ── Provisional weighted SOV: auto-discovered rivals, real weights ──
          New backend path — Prompt/Sourcing render below. Nudge to pin a stable set. */}
      {provisional && hasWeightedRows && !staleConfig && (
        tracked ? (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-sage-bg border border-sage/30 text-sm">
            <Pin className="w-4 h-4 flex-shrink-0 text-sage" />
            <span className="font-semibold text-sage">✓ {discoveredCompetitors.length} competitor{discoveredCompetitors.length !== 1 ? 's' : ''} pinned.</span>
            <span className="text-ink-3">Next scan will track this exact set week-over-week.</span>
          </div>
        ) : (
          <div className="flex flex-col gap-3 px-4 py-3 rounded-xl bg-sage-bg/40 border border-sage/30 text-sm">
            <div className="flex items-start gap-3">
              <Sparkles className="w-4 h-4 flex-shrink-0 text-sage mt-0.5 animate-pulse" />
              <div className="flex-1 min-w-0">
                <span className="text-ink font-medium">Weighted SOV is live.</span>
                <span className="text-ink-3"> Computed against rivals we auto-detected in your AI responses — </span>
                <strong className="text-ink-2">Prompt SOV</strong>
                <span className="text-ink-3"> and </span>
                <strong className="text-ink-2">Sourcing SOV</strong>
                <span className="text-ink-3"> are populated below. Pin them to lock the set for stable week-over-week tracking.</span>
              </div>
            </div>
            {discoveredCompetitors.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pl-7">
                {discoveredCompetitors.map(brand => (
                  <span key={brand} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-canvas border border-divider text-xs text-ink-2 font-medium">
                    <BrandLogo domain={guessBrandDomain(brand)} name={brand} size={12} />
                    {brand}
                  </span>
                ))}
                <button
                  onClick={handleTrackDiscovered}
                  className="relative inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-ink text-ink-inv text-xs font-semibold hover:bg-ink/80 transition-colors"
                >
                  <span className="pointer-events-none absolute -inset-px rounded-full ring-2 ring-sage/60 animate-pulse" aria-hidden="true" />
                  <Pin className="w-3 h-3 relative" />
                  <span className="relative">Pin these</span>
                </button>
              </div>
            )}
          </div>
        )
      )}

      {/* ── Old scan (auto-discovered, NO weighted rows): pre-provisional fallback ── */}
      {usingDiscovered && !hasWeightedRows && !staleConfig && (
        tracked ? (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-sage-bg border border-sage/30 text-sm">
            <span className="font-semibold text-sage">✓ {discoveredCompetitors.length} competitor{discoveredCompetitors.length !== 1 ? 's' : ''} saved.</span>
            <span className="text-ink-3">Rescan to see weighted Prompt SOV and Sourcing SOV.</span>
          </div>
        ) : (
          <div className="flex flex-col gap-3 px-4 py-3 rounded-xl bg-surface border border-divider text-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-caution mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="text-ink-2 font-medium">Showing auto-discovered brands</span>
                <span className="text-ink-3"> (count-based). Pin who to benchmark against, then </span>
                <strong className="text-ink-2">rescan</strong>
                <span className="text-ink-3"> to unlock weighted Prompt &amp; Sourcing SOV.</span>
              </div>
            </div>
            {discoveredCompetitors.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pl-7">
                {discoveredCompetitors.map(brand => (
                  <span key={brand} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-canvas border border-divider text-xs text-ink-2 font-medium">
                    <BrandLogo domain={guessBrandDomain(brand)} name={brand} size={12} />
                    {brand}
                  </span>
                ))}
                <button
                  onClick={handleTrackDiscovered}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-ink text-ink-inv text-xs font-semibold hover:bg-ink/80 transition-colors"
                >
                  <Pin className="w-3 h-3" /> Pin these
                </button>
              </div>
            )}
          </div>
        )
      )}

      {/* ── Truly old scan (no weighted_sov, no discovery) ───── */}
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
          usingDiscovered={usingDiscovered}
        />
      )}

      {/* ═══ Prompt SOV ════════════════════════════════════ */}
      {/* Render whatever weighted rows exist — pinned OR provisional (auto-discovered).
          Only fall back to the empty "pin competitors" state when there's no weighted
          data at all (old pre-weighted scan). */}
      {ctx.competitorsSubTab === 'prompt_sov' && (
        <PromptSOVTab
          perPrompt={wsov?.per_prompt ?? []}
          orderedBrands={weightedBrands}
          brandName={brandConfig.brand_name}
          brandDomainMap={brandDomainMap}
          needsCompetitors={!hasWeightedRows}
          provisional={provisional}
        />
      )}

      {/* ═══ Sourcing SOV ══════════════════════════════════ */}
      {ctx.competitorsSubTab === 'sourcing_sov' && (
        <SourcingSOVTab
          perDomain={wsov?.per_domain ?? []}
          orderedBrands={weightedBrands}
          brandName={brandConfig.brand_name}
          brandDomainMap={brandDomainMap}
          needsCompetitors={!hasWeightedRows}
          provisional={provisional}
        />
      )}
    </div>
  )
}

// ─── Overall SOV sub-tab ──────────────────────────────
function OverallSOVTab({
  overallSov, orderedBrands, maxShare, sovSegments, brandName, brandDomainMap, usingDiscovered = false,
}: {
  overallSov: Record<string, number>
  orderedBrands: string[]
  maxShare: number
  sovSegments: { label: string; value: number; color: string }[]
  brandName: string
  brandDomainMap: Record<string, string>
  usingDiscovered?: boolean
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
            {usingDiscovered ? 'Count-based Share' : 'Weighted Share of Voice'}
            <span className="text-xs text-ink-3 font-normal">
              {usingDiscovered ? '(auto-discovered · add competitors to enable position weighting)' : '(position × prominence)'}
            </span>
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

      {/* ── Weight legend (only when data is truly weighted) ── */}
      {!usingDiscovered && (
        <div className="bg-canvas rounded-xl border border-divider-light p-4">
          <p className="text-xs text-ink-3 font-medium mb-2">How weights are calculated</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-3">
            <span><strong className="text-ink-2">Position weight</strong> = 1 / log₂(rank+1) — DCG; unranked prose = 1.0</span>
            <span><strong className="text-ink-2">Prominence weight</strong>: primary rec 1.0 → passing ref 0.2</span>
            <span><strong className="text-ink-2">SOV</strong> = Σ brand_weight / Σ all_weights</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Prompt SOV sub-tab ───────────────────────────────
function PromptSOVTab({
  perPrompt, orderedBrands, brandName, brandDomainMap, needsCompetitors = false, provisional = false,
}: {
  perPrompt: PromptSOVEntry[]
  orderedBrands: string[]
  brandName: string
  brandDomainMap: Record<string, string>
  needsCompetitors?: boolean
  provisional?: boolean
}) {
  if (!perPrompt.length) {
    return (
      <div className="bg-surface rounded-xl border border-divider p-8 text-center">
        <Hash className="w-10 h-10 text-ink-3 mx-auto mb-3 opacity-40" />
        <p className="text-sm font-medium text-ink-3 mb-1">No prompt-level data</p>
        <p className="text-xs text-ink-3">
          {needsCompetitors
            ? <>Add the brands you compete with to see how you rank on each prompt — weighted by position and recommendation strength. Use <strong>Pin these</strong> above or add them in <strong>brand settings</strong>, then rescan.</>
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-ink-3 max-w-2xl">
          Heatmap — each row is one prompt, each column a brand. Deeper cell = larger weighted
          share of that prompt (mentioned earlier <em>and</em> as a stronger recommendation).
          {provisional && (
            <span className="ml-1 inline-flex items-center gap-1 text-ink-3">
              <Sparkles className="w-3 h-3 text-sage" />
              Columns are auto-detected rivals — <strong className="text-ink-2">Pin these</strong> above to lock them.
            </span>
          )}
        </p>
        <HeatLegend />
      </div>

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
                      const color = getBrandColor(brand, orderedBrands)
                      const { bg, dark } = heatCell(color, share)
                      return (
                        <td
                          key={brand}
                          className="px-3 py-2.5 text-center transition-colors"
                          style={bg ? { backgroundColor: bg } : undefined}
                          title={bw && bw.weight > 0 ? `${brand} · ${formatPct(share)} · ${SUB_TYPE_LABELS[bw.sub_type] ?? bw.sub_type}` : `${brand} · not mentioned`}
                        >
                          {bw && bw.weight > 0 ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span
                                className={`font-mono font-bold text-sm leading-none ${dark ? '' : 'text-ink'}`}
                                style={dark ? { color: '#fff' } : undefined}
                              >
                                {formatPct(share)}
                              </span>
                              <span
                                className={`text-[9px] leading-tight ${dark ? '' : 'text-ink-3'}`}
                                style={dark ? { color: 'rgba(255,255,255,0.78)' } : undefined}
                              >
                                {SUB_TYPE_LABELS[bw.sub_type] ?? bw.sub_type}
                              </span>
                            </div>
                          ) : (
                            <span className="text-ink-3 text-xs opacity-30">·</span>
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
        Cell % = brand weight / row total, where weight = <span className="font-mono">position × recommendation-strength</span>.
        Empty cell = brand not mentioned for that prompt.
      </p>
    </div>
  )
}

// ─── Sourcing SOV sub-tab ─────────────────────────────
function SourcingSOVTab({
  perDomain, orderedBrands, brandName, brandDomainMap, needsCompetitors = false, provisional = false,
}: {
  perDomain: DomainSOVEntry[]
  orderedBrands: string[]
  brandName: string
  brandDomainMap: Record<string, string>
  needsCompetitors?: boolean
  provisional?: boolean
}) {
  if (!perDomain.length) {
    return (
      <div className="bg-surface rounded-xl border border-divider p-8 text-center">
        <Globe className="w-10 h-10 text-ink-3 mx-auto mb-3 opacity-40" />
        <p className="text-sm font-medium text-ink-3 mb-1">No sourcing data</p>
        <p className="text-xs text-ink-3">
          {needsCompetitors
            ? <>Add competitors to see which AI citation sources drive visibility for them vs. you — and where you&apos;re winning or losing. Use <strong>Pin these</strong> above or add them in <strong>brand settings</strong>, then rescan.</>
            : <>This scan predates weighted SOV, or no citation URLs were returned. Click <strong>Scan</strong> to generate domain-level data.</>}
        </p>
      </div>
    )
  }

  const topDomains = perDomain.slice(0, 15)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-ink-3 max-w-2xl">
          Heatmap — each row is a citation source, each column a brand. Deeper cell = that brand
          owns more of the AI mentions sourced from that domain. Find domains favoring a rival to
          target with PR / outreach.
          {provisional && (
            <span className="ml-1 inline-flex items-center gap-1 text-ink-3">
              <Sparkles className="w-3 h-3 text-sage" />
              Columns are auto-detected rivals — <strong className="text-ink-2">Pin these</strong> above to lock them.
            </span>
          )}
        </p>
        <HeatLegend />
      </div>

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
                    {/* Domain: favicon + clickable verify link to the actual cited page */}
                    <td className="px-4 py-3 max-w-[220px]">
                      <div className="flex items-center gap-2 min-w-0">
                        <FaviconImg domain={row.domain} size={14} />
                        {(() => {
                          const href = row.urls?.[0] ?? `https://${row.domain}`
                          return (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group/srclink flex items-center gap-1 min-w-0 text-xs font-medium text-ink hover:text-sage hover:underline"
                              title={`Open cited source — verify the brand appears: ${href}`}
                            >
                              <span className="truncate">{row.domain}</span>
                              <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-30 group-hover/srclink:opacity-80 transition-opacity" />
                            </a>
                          )
                        })()}
                      </div>
                      {row.urls && row.urls.length > 1 && (
                        <span className="block text-[10px] text-ink-3 ml-[22px] mt-0.5">{row.urls.length} cited pages</span>
                      )}
                    </td>
                    {/* Brand columns */}
                    {orderedBrands.map(brand => {
                      const share = row.brand_sov[brand] ?? 0
                      const color = getBrandColor(brand, orderedBrands)
                      const { bg, dark } = heatCell(color, share)
                      return (
                        <td
                          key={brand}
                          className="px-3 py-2.5 text-center transition-colors"
                          style={bg ? { backgroundColor: bg } : undefined}
                          title={share > 0 ? `${brand} · ${formatPct(share)} of ${row.domain}` : `${brand} · not sourced from ${row.domain}`}
                        >
                          {share > 0 ? (
                            <span
                              className={`font-mono font-bold text-sm leading-none ${dark ? '' : 'text-ink'}`}
                              style={dark ? { color: '#fff' } : undefined}
                            >
                              {formatPct(share)}
                            </span>
                          ) : (
                            <span className="text-ink-3 text-xs opacity-30">·</span>
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
        <span className="ml-1 inline-flex items-center gap-1">
          <ExternalLink className="w-3 h-3" /> Click a source to open the cited page and verify the brand actually appears.
        </span>
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
