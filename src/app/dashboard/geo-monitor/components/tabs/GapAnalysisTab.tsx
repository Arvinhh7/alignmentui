'use client'

import { Target, Loader2, StopCircle, AlertTriangle, Zap, Lightbulb, ArrowRight } from 'lucide-react'
import { useUnified } from '../UnifiedContext'
import { MetricCard, HorizontalBar } from '../shared/ChartComponents'
import { GAP_SEVERITY_COLORS, INTENT_FUNNEL, CONTENT_TYPE_LABELS } from '../shared/constants'

export function GapAnalysisTab() {
  const ctx = useUnified()
  const gap = ctx.gapResult

  // Count unique intent categories from category_gaps
  const uniqueIntents = gap
    ? new Set(gap.category_gaps.map(g => g.category)).size
    : 0

  return (
    <div className="space-y-8">
      {/* ── A) Hero Section ────────────────────────── */}
      {!gap && !ctx.isRunningGap && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <Target className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Gap Analysis</h3>
          <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
            Compare your AI visibility against competitors to uncover blind spots,
            missing content opportunities, and priority actions.
          </p>
          <button
            onClick={ctx.handleRunGapAnalysis}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            Run Gap Analysis
          </button>
        </div>
      )}

      {ctx.isRunningGap && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <Loader2 className="w-10 h-10 text-red-500 animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-600 mb-4">Running gap analysis...</p>
          <button
            onClick={ctx.handleStopGapAnalysis}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors inline-flex items-center gap-2"
          >
            <StopCircle className="w-4 h-4" />
            Stop
          </button>
        </div>
      )}

      {/* ── B) KPIs ────────────────────────────────── */}
      {gap && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
            label="Blind Spots"
            value={String(gap.blind_spots.length)}
            color="text-red-600"
            bgColor="bg-red-50"
          />
          <MetricCard
            icon={<Target className="w-5 h-5 text-blue-600" />}
            label="Intent Categories"
            value={String(uniqueIntents)}
            color="text-blue-600"
            bgColor="bg-blue-50"
          />
          <MetricCard
            icon={<Lightbulb className="w-5 h-5 text-orange-600" />}
            label="Priority Actions"
            value={String(gap.priority_actions.length)}
            color="text-orange-600"
            bgColor="bg-orange-50"
          />
          <MetricCard
            icon={<Zap className="w-5 h-5 text-purple-600" />}
            label="Overall Gap Score"
            value={String(gap.overall_gap_score)}
            color="text-purple-600"
            bgColor="bg-purple-50"
          />
        </div>
      )}

      {/* ── C) Intent Gap Bars ─────────────────────── */}
      {gap && gap.category_gaps.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Intent Gap Overview</h3>
          <div className="space-y-6">
            {Object.entries(INTENT_FUNNEL).map(([intentKey, funnelInfo]) => {
              const catGap = gap.category_gaps.find(g => g.category === intentKey)
              if (!catGap) return null
              const maxVal = Math.max(catGap.brand_visibility_pct, catGap.avg_competitor_visibility_pct, 1)
              return (
                <div key={intentKey}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm ${funnelInfo.bgColor}`}>
                      {funnelInfo.icon}
                    </span>
                    <span className={`text-xs font-semibold ${funnelInfo.color}`}>
                      {intentKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </span>
                    <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${
                      catGap.status === 'ahead' ? 'bg-green-50 text-green-600' :
                      catGap.status === 'even' ? 'bg-gray-50 text-gray-600' :
                      catGap.status === 'behind' ? 'bg-orange-50 text-orange-600' :
                      'bg-red-50 text-red-600'
                    }`}>
                      {catGap.status}
                    </span>
                  </div>
                  <div className="space-y-2 pl-9">
                    <HorizontalBar
                      label={`Your Brand (${catGap.brand_mentioned_count}/${catGap.prompt_count})`}
                      value={Math.round(catGap.brand_visibility_pct)}
                      max={Math.round(maxVal)}
                      color="bg-red-500"
                    />
                    <HorizontalBar
                      label={`Competitors Avg`}
                      value={Math.round(catGap.avg_competitor_visibility_pct)}
                      max={Math.round(maxVal)}
                      color="bg-gray-400"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── D) Priority Actions List ──────────────── */}
      {gap && gap.priority_actions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Priority Actions</h3>
          <div className="space-y-4">
            {gap.priority_actions.map((action, i) => {
              const severityStyle = GAP_SEVERITY_COLORS[action.severity] ?? GAP_SEVERITY_COLORS.medium
              return (
                <div key={i} className="border border-gray-100 rounded-lg p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ring-1 ${severityStyle.bg} ${severityStyle.text} ${severityStyle.ring}`}>
                        {action.severity}
                      </span>
                      <h4 className="text-sm font-medium text-gray-800 truncate">{action.title}</h4>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mb-3">{action.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-1.5">
                      {action.content_types.map((ct, j) => {
                        const ctInfo = CONTENT_TYPE_LABELS[ct]
                        return (
                          <span key={j} className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                            {ctInfo ? `${ctInfo.icon} ${ctInfo.label}` : ct}
                          </span>
                        )
                      })}
                    </div>
                    {action.action_url && (
                      <a
                        href={action.action_url}
                        className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1 flex-shrink-0"
                      >
                        Create Content
                        <ArrowRight className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── E) Error ───────────────────────────────── */}
      {ctx.gapError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{ctx.gapError}</p>
        </div>
      )}
    </div>
  )
}
