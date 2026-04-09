'use client'

import { useMemo } from 'react'
import { ShoppingCart, Eye, TrendingUp, MessageSquare, Star, ExternalLink, Zap } from 'lucide-react'
import { useUnified } from '../UnifiedContext'
import { formatPct, formatNum } from '../shared/ChartComponents'
import { INTENT_FUNNEL } from '../shared/constants'

// Purchase-intent mention card
function MentionCard({ prompt, response, sentiment, position, mentioned }: {
  prompt: string; response: string; sentiment: string; position: number | null; mentioned: boolean
}) {
  const truncated = response.length > 240 ? response.slice(0, 240) + '…' : response
  const sentimentColor = sentiment === 'positive' ? 'text-sage bg-sage-bg border-sage/30'
    : sentiment === 'negative' ? 'text-red-soft bg-red-soft-bg border-red-soft/30'
    : 'text-ink-2 bg-surface-warm border-divider'

  return (
    <div className={`bg-surface rounded-xl border p-5 transition-shadow hover:shadow-md ${mentioned ? 'border-sage/30' : 'border-divider'}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-sm font-medium text-ink flex-1">{prompt}</p>
        <div className="flex items-center gap-2 flex-shrink-0">
          {mentioned ? (
            <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 bg-sage-bg text-sage border border-sage/30 rounded-full">
              <Eye className="w-3 h-3" /> Visible
            </span>
          ) : (
            <span className="text-[10px] font-semibold px-2 py-0.5 bg-surface-warm text-ink-3 border border-divider rounded-full">
              Not Visible
            </span>
          )}
        </div>
      </div>

      <p className="text-xs text-ink-3 leading-relaxed mb-3">{truncated}</p>

      <div className="flex items-center gap-3 flex-wrap">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${sentimentColor}`}>
          {sentiment}
        </span>
        {position !== null && (
          <span className="text-[10px] text-ink-3 font-mono">
            Position #{position}
          </span>
        )}
      </div>
    </div>
  )
}

// Shopping visibility score bar
function ScoreBar({ label, value, max = 100, color = 'bg-sage' }: {
  label: string; value: number; max?: number; color?: string
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="flex items-center gap-4 py-2">
      <div className="w-32 flex-shrink-0 text-sm text-ink-2">{label}</div>
      <div className="flex-1 h-2 bg-surface-warm rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
      <div className="w-12 text-right font-mono text-sm font-medium text-ink">{value.toFixed(0)}%</div>
    </div>
  )
}

export function ShoppingTab() {
  const ctx = useUnified()
  const scan = ctx.scanResult
  const brandName = ctx.brandConfig.brand_name

  // Filter mentions by purchase intent (action_choice)
  const shoppingMentions = useMemo(() => {
    if (!scan) return []
    return scan.mention_results.filter(m => {
      const intent = (m as any).intent as string | undefined
      return intent === 'action_choice'
    })
  }, [scan])

  // All prompts with action_choice intent (from prompts list)
  const shoppingPrompts = useMemo(() => {
    return ctx.prompts.filter(p => {
      const intent = (p as any).intent as string | undefined
      return intent === 'action_choice'
    })
  }, [ctx.prompts])

  // KPIs
  const kpis = useMemo(() => {
    if (!scan) return null
    const total = shoppingMentions.length
    const visible = shoppingMentions.filter(m => m.mentioned).length
    const positive = shoppingMentions.filter(m => m.mentioned && m.sentiment === 'positive').length
    const avgPos = shoppingMentions.filter(m => m.mentioned && m.position_score != null)
      .reduce((sum, m, _, arr) => sum + m.position_score / arr.length, 0)
    const visScore = total > 0 ? (visible / total) * 100 : 0
    return { total, visible, positive, avgPos: avgPos * 100, visScore }
  }, [shoppingMentions])

  // Visibility by AI model for action_choice mentions
  const modelBreakdown = useMemo(() => {
    if (!scan) return []
    const byModel: Record<string, { total: number; visible: number }> = {}
    for (const m of shoppingMentions) {
      const model = (m as any).model || 'ChatGPT'
      if (!byModel[model]) byModel[model] = { total: 0, visible: 0 }
      byModel[model].total++
      if (m.mentioned) byModel[model].visible++
    }
    return Object.entries(byModel).map(([model, stats]) => ({
      model,
      visScore: stats.total > 0 ? (stats.visible / stats.total) * 100 : 0,
      visible: stats.visible,
      total: stats.total,
    })).sort((a, b) => b.visScore - a.visScore)
  }, [shoppingMentions])

  // No scan state
  if (!scan) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 bg-sage-bg rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ShoppingCart className="w-8 h-8 text-sage" />
        </div>
        <h3 className="text-base font-semibold text-ink-2 mb-2">No shopping data yet</h3>
        <p className="text-sm text-ink-3 max-w-sm mx-auto">
          Run a scan with purchase-intent prompts to see how often AI recommends your brand when users are ready to buy.
        </p>
      </div>
    )
  }

  // No action_choice prompts
  if (shoppingPrompts.length === 0 && shoppingMentions.length === 0) {
    return (
      <div className="space-y-4">
        <div className="bg-caution-bg border border-caution/30 rounded-xl p-5 flex items-start gap-3">
          <Zap className="w-5 h-5 text-caution mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-caution mb-1">Add purchase-intent prompts to track Shopping visibility</h4>
            <p className="text-xs text-caution leading-relaxed mb-3">
              Shopping visibility measures how often AI recommends your brand when users are in buying mode.
              Add prompts like <em>"best [product category] to buy"</em>, <em>"where to buy [product]"</em>, or
              <em>"[product] recommendation for [use case]"</em> — then run a scan.
            </p>
            <p className="text-xs text-caution font-medium">
              Prompts are automatically classified as "Purchase Intent" when they contain buying keywords.
            </p>
          </div>
        </div>

        {/* Show overall scan stats as a preview */}
        <div className="bg-surface rounded-xl border border-divider p-5">
          <h4 className="text-sm font-semibold text-ink-2 mb-4">Overall Scan Preview</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-ink">{formatPct(scan.visibility_score)}</div>
              <div className="text-xs text-ink-3 mt-1">Overall Visibility</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-ink">{scan.mention_results.filter(m => m.mentioned).length}</div>
              <div className="text-xs text-ink-3 mt-1">Total Mentions</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-ink">{scan.mention_results.length}</div>
              <div className="text-xs text-ink-3 mt-1">Prompts Tested</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ═══ KPI Cards ══════════════════════════════════ */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-surface rounded-xl border border-divider p-5 text-center">
            <div className="text-3xl font-bold text-sage mb-1">{kpis.visScore.toFixed(0)}%</div>
            <div className="text-xs text-ink-3">Shopping Visibility</div>
            <div className="text-[10px] text-ink-3 mt-0.5">{kpis.visible} / {kpis.total} prompts</div>
          </div>
          <div className="bg-surface rounded-xl border border-divider p-5 text-center">
            <div className="text-3xl font-bold text-ink-2 mb-1">{kpis.visible}</div>
            <div className="text-xs text-ink-3">AI Mentions</div>
            <div className="text-[10px] text-ink-3 mt-0.5">in buying-intent queries</div>
          </div>
          <div className="bg-surface rounded-xl border border-divider p-5 text-center">
            <div className="text-3xl font-bold text-ink-2 mb-1">
              {kpis.total > 0 ? Math.round((kpis.positive / kpis.visible || 0) * 100) : 0}%
            </div>
            <div className="text-xs text-ink-3">Positive Sentiment</div>
            <div className="text-[10px] text-ink-3 mt-0.5">of purchase mentions</div>
          </div>
          <div className="bg-surface rounded-xl border border-divider p-5 text-center">
            <div className="text-3xl font-bold text-caution mb-1">
              {kpis.avgPos > 0 ? formatPct(kpis.avgPos) : '—'}
            </div>
            <div className="text-xs text-ink-3">Avg Prominence</div>
            <div className="text-[10px] text-ink-3 mt-0.5">in AI responses</div>
          </div>
        </div>
      )}

      {/* ═══ Visibility by Model ════════════════════════ */}
      {modelBreakdown.length > 0 && (
        <div className="bg-surface rounded-xl border border-divider p-5">
          <h4 className="text-sm font-semibold text-ink-2 mb-4 flex items-center gap-2">
            <Star className="w-4 h-4 text-caution" />
            Shopping Visibility by AI Model
          </h4>
          <div className="space-y-2">
            {modelBreakdown.map((row, i) => (
              <ScoreBar key={i} label={row.model} value={row.visScore}
                color={row.visScore >= 60 ? 'bg-sage' : row.visScore >= 30 ? 'bg-caution' : 'bg-red-soft'} />
            ))}
          </div>
        </div>
      )}

      {/* ═══ Purchase-Intent Mention Cards ═════════════ */}
      {shoppingMentions.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4 text-sage" />
            <h4 className="text-sm font-semibold text-ink-2">Purchase-Intent Responses</h4>
            <span className="text-xs text-ink-3">({shoppingMentions.length} prompts)</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {shoppingMentions.map((m, i) => (
              <MentionCard
                key={i}
                prompt={m.prompt_text}
                response={m.response_text}
                sentiment={m.sentiment}
                position={null}
                mentioned={m.mentioned}
              />
            ))}
          </div>
        </div>
      )}

      {/* ═══ Tip ════════════════════════════════════════ */}
      <div className="bg-sage-bg border border-sage/30 rounded-xl p-4 flex items-start gap-3">
        <TrendingUp className="w-4 h-4 text-sage mt-0.5 flex-shrink-0" />
        <div className="text-xs text-sage leading-relaxed">
          <span className="font-semibold">Improve your Shopping Visibility:</span> Create FAQ content around purchase decisions, add structured data (Product, Review, Offer schema), publish comparison guides and buying guides. AI models heavily cite trusted product review pages.
        </div>
      </div>
    </div>
  )
}
