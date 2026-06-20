'use client'

import { useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { Loader2, LineChart, Eye, MessageSquare, Link2, ThumbsUp, Users, Lock } from 'lucide-react'
import { UnifiedProvider, useUnified, type TabKey } from '../geo-monitor/components/UnifiedContext'
import { DateRangeControls } from '../geo-monitor/components/ControlBar'

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

const ANALYSIS_MODELS = [
  { key: 'chatgpt', label: 'ChatGPT' },
  { key: 'perplexity', label: 'Perplexity' },
  { key: 'gemini', label: 'Gemini' },
  { key: 'claude', label: 'Claude' },
] as const

function AnalysisContent() {
  const ctx = useUnified()
  const router = useRouter()
  const { filterModel, setFilterModel } = ctx
  const normalizedPlan = String(ctx.promptQuota.plan || 'starter').toLowerCase()
  const starterLocked = normalizedPlan === 'starter' || normalizedPlan === 'trial'
  const allowedModels = useMemo(
    () => starterLocked ? ['chatgpt'] : ANALYSIS_MODELS.map(model => model.key),
    [starterLocked],
  )

  useEffect(() => {
    if (!allowedModels.includes(filterModel as typeof allowedModels[number])) {
      setFilterModel('chatgpt')
    }
  }, [allowedModels, filterModel, setFilterModel])

  useEffect(() => {
    if (ctx.customerHydrating) return
    if (ctx.activeCustomerId && !ctx.isProfileComplete) {
      router.replace('/dashboard/brand-hub')
    }
  }, [ctx.activeCustomerId, ctx.customerHydrating, ctx.isProfileComplete, router])

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

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <div className="bg-surface border-b border-divider-light px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sage-bg flex items-center justify-center">
            <LineChart className="w-5 h-5 text-sage" />
          </div>
          <div>
            <h1 className="heading-dash">Analysis</h1>
            <p className="text-sm text-ink-3">AI visibility and performance metrics across dimensions</p>
          </div>
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
            <div className="text-sm text-ink-3">Metrics recalculate for the selected model.</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {ANALYSIS_MODELS.map(model => {
              const enabled = allowedModels.includes(model.key)
              const selected = filterModel === model.key
              return (
                <button
                  key={model.key}
                  type="button"
                  disabled={!enabled}
                  onClick={() => enabled && setFilterModel(model.key)}
                  title={enabled ? `View ${model.label} metrics` : 'Starter includes ChatGPT only. Upgrade to unlock this model.'}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition-all ${
                    selected
                      ? 'border-ink bg-ink text-ink-inv'
                      : enabled
                        ? 'border-divider bg-canvas text-ink-2 hover:bg-surface-warm'
                        : 'cursor-not-allowed border-divider-light bg-surface-muted text-ink-3 opacity-55'
                  }`}
                >
                  {model.label}
                  {!enabled && <Lock className="h-3.5 w-3.5" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab content */}
        {activeTab === 'visibility'  && <VisibilityTab />}
        {activeTab === 'mentions'    && <MentionsTab />}
        {activeTab === 'citations'   && <CitationsTab />}
        {activeTab === 'sentiment'   && <SentimentTab />}
        {activeTab === 'competitors' && <CompetitorsTab />}
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
