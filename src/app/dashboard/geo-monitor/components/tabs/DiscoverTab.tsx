'use client'

import { useMemo } from 'react'
import { Compass, Globe, Play, Square, ExternalLink, ArrowRight, Loader2, ScanSearch, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useLanguage } from '@/lib/LanguageContext'
import { useUnified } from '../UnifiedContext'
import { DOMAIN_TYPE_LABELS, DASHBOARD_ROUTES } from '../shared/constants'
import { GeneratePromptsModal } from './GeneratePromptsModal'
import { CitationTruthMap } from './CitationTruthMap'
import { PromptIntelligence } from './PromptIntelligence'
import type { DiscoverSourceItem } from '@/lib/api'

// ── Phase 4: Action CTA routing per domain type ──────
const DISCOVER_ACTION: Record<string, {
  label: string
  href: (domain: string) => string
  external: boolean
}> = {
  reference:     { label: 'Add Schema Markup',    href: () => DASHBOARD_ROUTES.optimize,    external: false },
  editorial:     { label: 'Pitch This Source',    href: d  => `https://${d}`,               external: true  },
  ugc:           { label: 'Build Review Profile', href: d  => `https://${d}`,               external: true  },
  competitor:    { label: 'Monitor Competitor',   href: () => DASHBOARD_ROUTES.monitor,     external: false },
  you:           { label: 'Strengthen Entity',    href: () => DASHBOARD_ROUTES.optimize,    external: false },
  corporate:     { label: 'Strengthen Entity',    href: () => DASHBOARD_ROUTES.optimize,    external: false },
  institutional: { label: 'Cite This Reference',  href: d  => `https://${d}`,               external: true  },
  coupon:        { label: 'Track Distribution',   href: () => DASHBOARD_ROUTES.distribute,  external: false },
  other:         { label: 'Monitor Source',       href: d  => `https://${d}`,               external: true  },
}

// ── Phase 6: Engine definitions ──────────────────────
// Model names are fetched live from /api/monitor/engines and shown in tooltips.
const ENGINES: { key: string; label: string; fallbackDesc: string; logo: string }[] = [
  { key: 'chatgpt',    label: 'ChatGPT',    fallbackDesc: 'OpenAI · Responses API + web_search_preview', logo: 'https://www.google.com/s2/favicons?domain=chatgpt.com&sz=32' },
  { key: 'perplexity', label: 'Perplexity', fallbackDesc: 'real-time citations',                         logo: 'https://www.google.com/s2/favicons?domain=perplexity.ai&sz=32' },
  { key: 'gemini',     label: 'Gemini',     fallbackDesc: 'Google Search grounding',                     logo: 'https://www.google.com/s2/favicons?domain=gemini.google.com&sz=32' },
  { key: 'claude',     label: 'Claude',     fallbackDesc: 'web_search tool',                             logo: 'https://www.google.com/s2/favicons?domain=claude.ai&sz=32' },
]

// ── Source card ───────────────────────────────────────
function SourceCard({ item, total, rank }: {
  item: DiscoverSourceItem
  total: number
  rank: number
}) {
  const typeInfo = DOMAIN_TYPE_LABELS[item.domain_type]
  const action = DISCOVER_ACTION[item.domain_type] ?? DISCOVER_ACTION.other
  const href = action.href(item.domain)
  const isOwned = item.domain_type === 'you' || item.domain_type === 'corporate'
  const isCore = item.intent_coverage >= 4

  return (
    <div className="relative bg-surface rounded-xl border border-divider p-5 hover:shadow-md transition-shadow overflow-hidden">
      {isOwned && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#4A7C59] rounded-l-xl" />}

      {/* Header: rank + favicon + domain + badges */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] text-ink-3 font-mono flex-shrink-0 w-5 text-right">#{rank}</span>
          <img
            src={`https://www.google.com/s2/favicons?domain=${item.domain}&sz=32`}
            onError={e => {
              const img = e.target as HTMLImageElement
              img.style.display = 'none'
              img.nextElementSibling?.classList.remove('hidden')
            }}
            className="w-4 h-4 flex-shrink-0 rounded-sm object-contain"
            alt=""
          />
          <Globe className="w-4 h-4 text-ink-3 flex-shrink-0 hidden" />
          <span className="text-sm font-medium text-ink truncate">{item.domain}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
          {isCore && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sage-bg text-sage font-semibold">Core</span>
          )}
          {typeInfo && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${typeInfo.color}`}>
              {typeInfo.label}
            </span>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="flex items-end justify-between mb-3">
        <div>
          <p className="text-xl font-bold font-mono text-ink leading-none">
            {item.prompt_count}
            <span className="text-xs font-normal text-ink-3">/{total}</span>
          </p>
          <p className="text-xs text-ink-3 mt-0.5">{item.frequency_pct.toFixed(1)}% frequency</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold font-mono text-ink-2 leading-none">
            {item.intent_coverage}
            <span className="text-xs font-normal text-ink-3">/4</span>
          </p>
          <p className="text-xs text-ink-3 mt-0.5">{item.citation_share.toFixed(1)}% share</p>
        </div>
      </div>

      {/* Intent coverage bar — 4 segments */}
      <div className="flex gap-0.5 mb-3" title={`${item.intent_coverage}/4 intents covered`}>
        {['Info', 'Explore', 'Compare', 'Action'].map((label, idx) => (
          <div
            key={label}
            title={label}
            className={`h-1 flex-1 rounded-full transition-colors ${
              idx < item.intent_coverage ? 'bg-ink' : 'bg-divider'
            }`}
          />
        ))}
      </div>

      {/* Action CTA */}
      <div className="pt-3 border-t border-divider-light">
        {action.external ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-medium text-ink-2 hover:text-ink transition-colors"
          >
            <ExternalLink className="w-3 h-3 flex-shrink-0" />
            {action.label}
          </a>
        ) : (
          <Link
            href={href}
            className="flex items-center gap-1.5 text-xs font-medium text-ink-2 hover:text-ink transition-colors"
          >
            <ArrowRight className="w-3 h-3 flex-shrink-0" />
            {action.label}
          </Link>
        )}
      </div>
    </div>
  )
}

// ── Main tab ─────────────────────────────────────────
export function DiscoverTab({ variant = 'standalone' }: { variant?: 'standalone' | 'sources-gap' }) {
  const { t } = useLanguage()
  const ctx = useUnified()
  const d = t.dashboard.discover
  const result = ctx.discoverResult
  const isAnyRunning = ctx.isRunningDiscover || ctx.isRunningDeepDiscover
  const isAdminOrStaff = ctx.userRole === 'admin' || ctx.userRole === 'staff'
  const isSourcesGap = variant === 'sources-gap'

  const coreItems = useMemo(() => {
    if (!result) return []
    return result.source_domains.filter(item => item.intent_coverage >= 4).slice(0, 15)
  }, [result])

  const segmentItems = useMemo(() => {
    if (!result) return []
    return result.source_domains
      .filter(item => item.intent_coverage < 4 && item.prompt_count >= 3)
      .slice(0, 18)
  }, [result])

  return (
    <div className="space-y-6">

      {/* ── Header ───────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-ink">
            {isSourcesGap ? 'Sources Gap' : d.title}
          </h3>
          <p className="text-xs text-ink-3 mt-0.5">
            {result
              ? `${result.total_grounded_urls.toLocaleString()} grounded URLs · ${result.unique_domains} domains · ${result.engine_used}`
              : isSourcesGap
                ? 'Find the source domains AI already trusts, then turn missing citation layers into content, PR, review, and distribution actions.'
                : d.subtitle}
            {/* Show active model name for the currently selected engine */}
            {ctx.engineModels[ctx.discoverEngine] && (
              <span className="ml-1 text-ink-3/70 font-mono text-[10px]">
                · {ctx.engineModels[ctx.discoverEngine].quick}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
          {/* Phase 6: Engine selector */}
          <div className="flex items-center gap-1 p-1 bg-surface-warm rounded-lg border border-divider-light">
            {ENGINES.map(eng => {
              const available = ctx.availableEngines.includes(eng.key)
              const selected = ctx.discoverEngine === eng.key
              const hasCached = !!ctx.discoverResults[eng.key]
              const models = ctx.engineModels[eng.key]
              // Build tooltip: live model names from backend, falling back to static desc
              const modelDesc = models
                ? `Quick Map: ${models.quick}\nDeep Scan: ${models.deep}`
                : eng.fallbackDesc
              const tooltip = available
                ? (hasCached ? `${modelDesc}\n· has results` : modelDesc)
                : d.engineNotAvailable
              return (
                <button
                  key={eng.key}
                  onClick={() => available && ctx.setDiscoverEngine(eng.key)}
                  disabled={!available}
                  title={tooltip}
                  className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    selected && available
                      ? 'bg-ink text-ink-inv shadow-sm'
                      : available
                        ? 'text-ink-3 hover:text-ink-2'
                        : 'text-ink-3/40 cursor-not-allowed'
                  }`}
                >
                  <img
                    src={eng.logo}
                    alt=""
                    className="w-3.5 h-3.5 rounded-sm flex-shrink-0"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                  {eng.label}
                  {/* Green dot = this engine has cached results */}
                  {hasCached && !selected && (
                    <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-sage" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Stop (shown when either is running) */}
          {isAnyRunning ? (
            <button
              onClick={ctx.handleStopDiscover}
              className="flex items-center gap-2 px-4 py-2 bg-red-soft-bg hover:bg-red-soft/10 text-red-soft border border-red-soft/20 rounded-xl text-sm font-medium transition-colors"
            >
              <Square className="w-3.5 h-3.5" />
              {d.stopButton}
            </button>
          ) : (
            <>
              {/* Quick Map */}
              <button
                onClick={ctx.handleRunDiscover}
                disabled={!ctx.isConfigured}
                className="flex items-center gap-2 px-4 py-2 bg-ink hover:bg-[#2d2d2c] text-ink-inv rounded-xl text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Play className="w-3.5 h-3.5" />
                {d.runButton}
              </button>
              {/* Deep Scan */}
              <button
                onClick={ctx.handleRunDeepDiscover}
                disabled={!ctx.isConfigured}
                title={d.deepScanDesc}
                className="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-surface-warm text-ink-2 border border-divider rounded-xl text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ScanSearch className="w-3.5 h-3.5" />
                {isAdminOrStaff ? d.deepScanButtonAdmin : d.deepScanButton}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Running state ────────────────────────── */}
      {isAnyRunning && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-ink-3" />
          <div className="text-center">
            <p className="text-sm font-medium text-ink-2">
              {ctx.isRunningDeepDiscover ? d.runningDeep : d.running}
            </p>
            <p className="text-xs text-ink-3 mt-1">
              {ctx.isRunningDeepDiscover ? d.runningNoteDeep : d.runningNote}
            </p>
          </div>
        </div>
      )}

      {/* ── Error ───────────────────────────────── */}
      {ctx.discoverError && !isAnyRunning && (
        <div className="bg-red-soft-bg border border-red-soft/30 rounded-xl p-4">
          <p className="text-sm text-red-soft">{ctx.discoverError}</p>
        </div>
      )}

      {/* ── Empty state ─────────────────────────── */}
      {!result && !isAnyRunning && !ctx.discoverError && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Compass className="w-10 h-10 mb-3 text-ink-3 opacity-40" />
          <p className="text-sm font-medium text-ink-2">{d.noData}</p>
          <p className="text-xs text-ink-3 mt-1.5 max-w-xs leading-relaxed">{d.noDataDesc}</p>
          {!ctx.isConfigured && (
            <p className="text-xs text-caution mt-3">{d.notConfigured}</p>
          )}
        </div>
      )}

      {/* ── Results ─────────────────────────────── */}
      {result && !isAnyRunning && (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: d.promptsRun,    value: result.total_prompts.toLocaleString() },
              { label: d.groundedUrls,  value: result.total_grounded_urls.toLocaleString() },
              { label: d.uniqueDomains, value: result.unique_domains.toLocaleString() },
            ].map(stat => (
              <div key={stat.label} className="bg-surface border border-divider rounded-xl p-4 text-center">
                <p className="text-2xl font-bold font-mono text-ink">{stat.value}</p>
                <p className="text-xs text-ink-3 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Core Source Layer */}
          {coreItems.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h4 className="text-sm font-semibold text-ink-2">{d.coreLayer}</h4>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sage-bg text-sage font-semibold">
                  {d.coreBadge}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {coreItems.map((item, i) => (
                  <SourceCard key={item.domain} item={item} total={result.total_prompts} rank={i + 1} />
                ))}
              </div>
            </div>
          )}

          {/* Segment Sources */}
          {segmentItems.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h4 className="text-sm font-semibold text-ink-2">{d.segmentLayer}</h4>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-muted text-ink-3 font-semibold">
                  {d.segmentBadge}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {segmentItems.map((item, i) => (
                  <SourceCard
                    key={item.domain}
                    item={item}
                    total={result.total_prompts}
                    rank={coreItems.length + i + 1}
                  />
                ))}
              </div>
            </div>
          )}
          {/* ── P1: Generate Prompts CTA ──────────── */}
          <div className="bg-canvas border border-divider rounded-xl p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-ink">{d.generatePrompts.ctaTitle}</h4>
                <p className="text-xs text-ink-3 mt-0.5">{d.generatePrompts.ctaDesc}</p>
              </div>
              <button
                onClick={() => ctx.setShowGeneratePromptsModal(true)}
                disabled={!ctx.isConfigured}
                className="flex items-center gap-2 px-4 py-2 bg-ink hover:bg-[#2d2d2c] text-ink-inv rounded-xl text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {d.generatePrompts.ctaButton}
              </button>
            </div>
          </div>

          {/* ── P2+P3: Citation Truth Map ─────────── */}
          <CitationTruthMap discoverResult={result} scanResult={ctx.scanResult} />

          {/* ── P4: Prompt Intelligence ───────────── */}
          {ctx.scanResult && (
            <PromptIntelligence
              scanResult={ctx.scanResult}
              prompts={ctx.prompts}
              onOpenGenerateModal={() => ctx.setShowGeneratePromptsModal(true)}
            />
          )}
        </>
      )}

      {/* Modal (P1) */}
      {ctx.showGeneratePromptsModal && (
        <GeneratePromptsModal onClose={() => ctx.setShowGeneratePromptsModal(false)} />
      )}
    </div>
  )
}
