'use client'

import { useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { Loader2, LineChart, Eye, MessageSquare, Link2, ThumbsUp, Users, Lock, Compass } from 'lucide-react'
import { UnifiedProvider, useUnified, type TabKey } from '../geo-monitor/components/UnifiedContext'
import { DateRangeControls } from '../geo-monitor/components/ControlBar'
import { useLanguage } from '@/lib/LanguageContext'
import { startProductTour } from '@/components/tour/ProductTour'
import { TOUR_UI } from '@/components/tour/tourSteps'

const TabLoader = () => (
  <div className="flex items-center justify-center py-12">
    <Loader2 className="w-5 h-5 animate-spin text-ink-3" />
  </div>
)

// Re-use geo-monitor tab components — same UnifiedContext shape
const VisibilityTab  = dynamic(() => import('../geo-monitor/components/tabs/VisibilityTab').then(m => ({ default: m.VisibilityTab })),   { loading: TabLoader })
const MentionsTab    = dynamic(() => import('../geo-monitor/components/tabs/MentionsTab').then(m => ({ default: m.MentionsTab })),       { loading: TabLoader })
const CitationsTab   = dynamic(() => import('../geo-monitor/components/tabs/CitationsTab').then(m => ({ default: m.CitationsTab })),     { loading: TabLoader })
const SentimentTab   = dynamic(() => import('../geo-monitor/components/tabs/SentimentTab').then(m => ({ default: m.SentimentTab })),     { loading: TabLoader })
const CompetitorsTab = dynamic(() => import('../geo-monitor/components/tabs/CompetitorsTab').then(m => ({ default: m.CompetitorsTab })), { loading: TabLoader })
// Persona tab archived 2026-06-20 — hidden from UI pending a clearer purpose.
// Component file (tabs/PersonasTab.tsx) is kept intact for future revival.

// Keep in sync with backend PLAN_LIMITS[*].scan_engines_allowed and the engine
// client registry (engine_clients.get_engine_client). ai_overviews = Google AI
// Overview via SerpAPI; it only yields data once SERPAPI_KEY is configured on
// the Railway API + worker — otherwise it renders the per-model empty state.
const ANALYSIS_MODELS = [
  { key: 'chatgpt', label: 'ChatGPT', logo: '/logos/openai.png' },
  { key: 'perplexity', label: 'Perplexity', logo: '/logos/perplexity.png' },
  { key: 'ai_overviews', label: 'Google AI Overview', logo: '/logos/google.png' },
  { key: 'gemini', label: 'Gemini', logo: '/logos/gemini.png' },
  { key: 'claude', label: 'Claude', logo: '/logos/anthropic.png' },
] as const

function AnalysisContent() {
  const ctx = useUnified()
  const router = useRouter()
  const { lang } = useLanguage()
  const { filterModel, setFilterModel } = ctx
  const normalizedPlan = String(ctx.promptQuota.plan || 'starter').toLowerCase()
  // Mirror backend PLAN_LIMITS[*].scan_engines_allowed. Claude is Pro/Enterprise only.
  const PLAN_ENGINE_ALLOWLIST: Record<string, string[]> = {
    starter:    ['chatgpt'],
    trial:      ['chatgpt'],
    standard:   ['chatgpt', 'perplexity', 'ai_overviews', 'gemini'],
    growth:     ['chatgpt', 'perplexity', 'ai_overviews', 'gemini'],
    pro:        ['chatgpt', 'perplexity', 'ai_overviews', 'gemini', 'claude'],
    enterprise: ['chatgpt', 'perplexity', 'ai_overviews', 'gemini', 'claude'],
    admin:      ['chatgpt', 'perplexity', 'ai_overviews', 'gemini', 'claude'],
  }
  const planEngines = PLAN_ENGINE_ALLOWLIST[normalizedPlan] ?? PLAN_ENGINE_ALLOWLIST['starter']
  // Prefer the backend's authoritative engine set (GET /api/monitor/engines →
  // ctx.availableEngines) — it is already intersected with the plan AND the
  // engines actually configured on the server (e.g. SERPAPI_KEY present for
  // Google AI Overview). This removes the hardcoded mirror that drifted from
  // PLAN_LIMITS and stops the AI-Overview pill showing enabled when SerpAPI is
  // not configured. The static allowlist is only a fallback before /engines
  // resolves (availableEngines defaults to ['chatgpt']).
  const backendEngines = (ctx.availableEngines ?? []).map(e => e.toLowerCase())
  const resolvedEngines = backendEngines.length > 0 ? backendEngines : planEngines
  // 'all' = aggregate across every engine that ran (the default). Specific
  // engines re-slice the Overview; locked engines show an upgrade prompt.
  const allowedModels = useMemo(
    () => ['all', ...resolvedEngines],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resolvedEngines.join(',')],
  )

  // Default the Analysis view to the aggregate ('all') on each open.
  useEffect(() => {
    setFilterModel('all')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!allowedModels.includes(filterModel as typeof allowedModels[number])) {
      setFilterModel('all')
    }
  }, [allowedModels, filterModel, setFilterModel])

  useEffect(() => {
    if (ctx.customerHydrating) return
    if (ctx.activeCustomerId && !ctx.isProfileComplete) {
      router.replace('/dashboard/brand-hub')
    }
  }, [ctx.activeCustomerId, ctx.customerHydrating, ctx.isProfileComplete, router])

  // Engines present in the latest scan. Declared before the early return below
  // so this hook always runs (React requires a stable hook order every render).
  const latestEngines = useMemo(
    () => (ctx.scanResult?.engines_used ?? []).map(e => e.toLowerCase()),
    [ctx.scanResult],
  )

  if (ctx.activeCustomerId && !ctx.customerHydrating && !ctx.isProfileComplete) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-ink-3" />
      </div>
    )
  }

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; badge?: string }[] = [
    { key: 'visibility',  label: 'Overview',     icon: <Eye className="w-4 h-4" /> },
    { key: 'mentions',    label: 'Mentions',      icon: <MessageSquare className="w-4 h-4" /> },
    { key: 'citations',   label: 'Citations',     icon: <Link2 className="w-4 h-4" /> },
    { key: 'sentiment',   label: 'Sentiment',     icon: <ThumbsUp className="w-4 h-4" /> },
    { key: 'competitors', label: 'Competitors',   icon: <Users className="w-4 h-4" />, badge: ctx.scanResult?.suggested_brands?.length ? `${ctx.scanResult.suggested_brands.length}` : undefined },
  ]

  // Default to 'visibility' on first load
  const activeTab = (['mentions', 'citations', 'sentiment', 'competitors'] as TabKey[]).includes(ctx.activeTab)
    ? ctx.activeTab
    : 'visibility'

  // ── Per-model data guard ──────────────────────────────────────────────────
  // When a specific engine is selected, the Overview re-slices to that engine.
  // If that engine wasn't in the latest scan there's nothing to show, so render
  // an explicit empty state instead. 'all' (aggregate) is never blocked.
  const selectedModel = ANALYSIS_MODELS.find(m => m.key === filterModel)
  // When the scan was read back via the compact R2-fallback path, engines_used
  // collapses to ['all'] — we genuinely don't know which engines ran. Treat that
  // (and an empty list) as "engines unknown" and DON'T block: falsely telling a
  // user "No ChatGPT data yet" for an engine that definitely ran is worse than
  // falling through to the aggregate slice.
  const enginesUnknown =
    latestEngines.length === 0 || (latestEngines.length === 1 && latestEngines[0] === 'all')
  // Only block when a SPECIFIC engine is selected, we have a scan, we know its
  // engines, and the selected engine is genuinely absent.
  const modelHasNoData =
    filterModel !== 'all' && !!ctx.scanResult && !enginesUnknown && !latestEngines.includes(filterModel)
  const firstEngineWithData = ANALYSIS_MODELS.find(m => latestEngines.includes(m.key))?.key ?? 'chatgpt'

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <div className="bg-surface border-b border-divider-light px-8 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sage-bg flex items-center justify-center">
              <LineChart className="w-5 h-5 text-sage" />
            </div>
            <div>
              <h1 className="heading-dash">Analysis</h1>
              <p className="text-sm text-ink-3">AI visibility and performance metrics across dimensions</p>
            </div>
          </div>
          <button
            onClick={startProductTour}
            className="inline-flex items-center gap-1.5 rounded-lg border border-divider-light bg-surface px-3 py-1.5 text-[12px] font-semibold text-ink-2 hover:bg-surface-warm transition-colors"
          >
            <Compass className="w-3.5 h-3.5" />
            {TOUR_UI.replay[lang]}
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {ctx.scanError && (
          <div className="bg-red-soft-bg border border-red-soft/30 rounded-xl p-4">
            <span className="text-sm text-red-soft">{ctx.scanError}</span>
          </div>
        )}

        {/* Tab bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-surface border border-divider-light rounded-xl p-1">
          <div className="flex items-center gap-1 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => ctx.setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'bg-ink text-ink-inv shadow-sm'
                    : 'text-ink-2 hover:bg-surface-warm'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    activeTab === tab.key ? 'bg-[rgba(250,245,236,0.2)] text-ink-inv' : 'bg-surface-muted text-ink-3'
                  }`}>{tab.badge}</span>
                )}
              </button>
            ))}
          </div>
          <div className="px-1">
            <DateRangeControls />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 bg-surface border border-divider-light rounded-xl px-4 py-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-ink-3 font-semibold">AI Model</div>
            <div className="text-sm text-ink-3">
              {latestEngines.length === 1
                ? `Showing ${ANALYSIS_MODELS.find(m => m.key === latestEngines[0])?.label ?? latestEngines[0]} data. Upgrade to scan more engines.`
                : latestEngines.length > 1
                  ? `"All" aggregates all ${latestEngines.length} engines. Click a pill to re-slice by engine.`
                  : 'Re-slice the Overview by engine. “All” aggregates every engine in the latest scan.'}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* "All" aggregate pill — label reflects actual engine count in latest scan */}
            <button
              type="button"
              onClick={() => setFilterModel('all')}
              title={latestEngines.length > 1 ? `Aggregate across ${latestEngines.length} engines` : 'Aggregate view'}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition-all ${
                filterModel === 'all'
                  ? 'border-ink bg-ink text-ink-inv'
                  : 'border-divider bg-canvas text-ink-2 hover:bg-surface-warm'
              }`}
            >
              {latestEngines.length === 1
                ? `All Models (${ANALYSIS_MODELS.find(m => m.key === latestEngines[0])?.label ?? latestEngines[0]})`
                : latestEngines.length > 1
                  ? `All Models (${latestEngines.length})`
                  : 'All Models'}
            </button>
            {ANALYSIS_MODELS.map(model => {
              const enabled = allowedModels.includes(model.key)
              const selected = filterModel === model.key
              return (
                <button
                  key={model.key}
                  type="button"
                  disabled={!enabled}
                  onClick={() => enabled && setFilterModel(model.key)}
                  title={enabled
                    ? `View ${model.label} metrics`
                    : model.key === 'claude'
                      ? 'Upgrade to Pro to unlock Claude.'
                      : `Upgrade your plan to unlock ${model.label}.`}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition-all ${
                    selected
                      ? 'border-ink bg-ink text-ink-inv'
                      : enabled
                        ? 'border-divider bg-canvas text-ink-2 hover:bg-surface-warm'
                        : 'cursor-not-allowed border-divider-light bg-surface-muted text-ink-3 opacity-55'
                  }`}
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white ring-1 ring-black/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={model.logo} alt={model.label} className="h-3.5 w-3.5 object-contain" />
                  </span>
                  {model.label}
                  {!enabled && <Lock className="h-3.5 w-3.5" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab content — or a per-model empty state when the selected engine
            wasn't in the latest scan (avoids showing aggregate as that model). */}
        {modelHasNoData ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-divider bg-surface px-6 py-16 text-center">
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white ring-1 ring-black/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selectedModel?.logo} alt={selectedModel?.label} className="h-7 w-7 object-contain" />
            </span>
            <h3 className="text-base font-semibold text-ink mb-1">No {selectedModel?.label} data yet</h3>
            <p className="max-w-md text-sm text-ink-3 mb-5">
              Your latest scan covered {latestEngines.map(e => ANALYSIS_MODELS.find(m => m.key === e)?.label ?? e).join(', ')}.
              {' '}{selectedModel?.label} wasn&apos;t included, so there&apos;s nothing to show for it yet — run a new scan
              from Prompts with {selectedModel?.label} enabled to populate this view.
            </p>
            <button
              type="button"
              onClick={() => setFilterModel(firstEngineWithData)}
              className="inline-flex items-center gap-2 rounded-full border border-ink bg-ink px-4 py-1.5 text-sm font-semibold text-ink-inv transition-all hover:bg-[#2d2d2c]"
            >
              View {ANALYSIS_MODELS.find(m => m.key === firstEngineWithData)?.label} data instead
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'visibility'  && <VisibilityTab />}
            {activeTab === 'mentions'    && <MentionsTab />}
            {activeTab === 'citations'   && <CitationsTab />}
            {activeTab === 'sentiment'   && <SentimentTab />}
            {activeTab === 'competitors' && <CompetitorsTab />}
          </>
        )}
      </div>
    </div>
  )
}

export default function AnalysisPage() {
  return (
    <UnifiedProvider>
      <AnalysisContent />
    </UnifiedProvider>
  )
}
