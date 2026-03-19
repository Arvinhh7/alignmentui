'use client'

import { useMemo } from 'react'
import { Users, Award, Shield, Target, Monitor } from 'lucide-react'
import { useUnified } from '../UnifiedContext'
import { MetricCard, DonutChart, HorizontalBar, formatPct, formatNum } from '../shared/ChartComponents'
import { POSITIONING_LABELS, RELATIONSHIP_COLORS, COMP_POSITION_COLORS } from '../shared/constants'

export function CompetitorsTab() {
  const ctx = useUnified()
  const { scanResult, brandConfig, advancedMentions } = ctx

  // ── co_mention: filtered brands ────────────────────────
  const filteredBrands = useMemo(() => {
    if (!scanResult?.suggested_brands) return []
    if (ctx.coMentionRoleFilter === 'all') return scanResult.suggested_brands
    if (ctx.coMentionRoleFilter === 'competitor') {
      return scanResult.suggested_brands.filter(b => b.is_competitor || b.relationship === 'competitive')
    }
    return scanResult.suggested_brands.filter(b => b.relationship === 'complementary')
  }, [scanResult?.suggested_brands, ctx.coMentionRoleFilter])

  // ── competitor_sov: sorted competitors ─────────────────
  const sortedCompetitors = useMemo(() => {
    if (!scanResult?.competitor_comparison) return []
    return [...scanResult.competitor_comparison].sort((a, b) => b.visibility_pct - a.visibility_pct)
  }, [scanResult?.competitor_comparison])

  const maxVisibility = useMemo(
    () => Math.max(...(sortedCompetitors.map(c => c.visibility_pct)), 1),
    [sortedCompetitors],
  )

  // ── SOV donut segments ─────────────────────────────────
  const sovSegments = useMemo(() => {
    if (!scanResult?.share_of_voice) return []
    const colors = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#6366f1']
    return Object.entries(scanResult.share_of_voice).map(([name, pct], i) => ({
      label: name,
      value: pct,
      color: name === brandConfig.brand_name ? '#ef4444' : colors[(i + 1) % colors.length],
    }))
  }, [scanResult?.share_of_voice, brandConfig.brand_name])

  // ── No data state ──────────────────────────────────────
  if (!scanResult) {
    return (
      <div className="text-center py-16 text-gray-400">
        <Shield className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p className="text-sm font-medium">Run a scan first</p>
        <p className="text-xs mt-1">Competitor analysis will appear here after your first scan.</p>
      </div>
    )
  }

  // ── By-platform data (derived from scan results) ────────────────────
  const platformRows = useMemo(() => {
    if (!ctx.scanResult?.competitor_comparison?.length) return []
    const byPlatform: Record<string, { visibility: number; count: number }> = {}
    for (const comp of ctx.scanResult.competitor_comparison) {
      const platform = 'All Platforms'
      if (!byPlatform[platform]) byPlatform[platform] = { visibility: 0, count: 0 }
      byPlatform[platform].visibility += comp.visibility_pct
      byPlatform[platform].count += 1
    }
    return Object.entries(byPlatform).map(([platform, d]) => ({
      platform,
      visibility: d.count > 0 ? d.visibility / d.count : 0,
      sov: 0,
      mentions: 0,
      avgPosition: 0,
    })).sort((a, b) => b.visibility - a.visibility)
  }, [ctx.scanResult])

  const maxPlatformVis = useMemo(() => Math.max(...platformRows.map(r => r.visibility), 1), [platformRows])

  return (
    <div className="space-y-6">
      {/* ── Sub-tab switcher ──────────────────────────────── */}
      <div className="flex gap-2 flex-wrap">
        {([
          { key: 'co_mention' as const, label: 'Brand Co-Mentions' },
          { key: 'competitor_sov' as const, label: 'Competitor SOV' },
          { key: 'by_platform' as const, label: 'By Platform' },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => ctx.setCompetitorsSubTab(tab.key as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              ctx.competitorsSubTab === tab.key
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border border-transparent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ co_mention sub-tab ═══════════════════════════ */}
      {ctx.competitorsSubTab === 'co_mention' && (
        <div className="space-y-6">
          {/* ── Filter pills ─────────────────────────────── */}
          <div className="flex gap-2">
            {([
              { key: 'all' as const, label: 'All Brands' },
              { key: 'competitor' as const, label: 'Competitors' },
              { key: 'complementary' as const, label: 'Complementary' },
            ]).map(f => (
              <button
                key={f.key}
                onClick={() => ctx.setCoMentionRoleFilter(f.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  ctx.coMentionRoleFilter === f.key
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* ── Brand co-mention cards ───────────────────── */}
          {filteredBrands.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBrands.map((brand, i) => {
                const rel = RELATIONSHIP_COLORS[brand.relationship] || RELATIONSHIP_COLORS.neutral
                const pos = POSITIONING_LABELS[brand.is_competitor ? 'challenger' : 'unknown'] || POSITIONING_LABELS.unknown
                return (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="text-sm font-semibold text-gray-900">{brand.name}</h4>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${rel.color}`}>
                        {rel.icon} {rel.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        Co-mentioned <span className="font-bold text-gray-900">{brand.co_occurrence_count}</span> times
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${pos.color}`}>
                        {pos.icon} {pos.label}
                      </span>
                    </div>

                    {brand.co_occurrence_rate > 0 && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Co-occurrence Rate</span>
                          <span className="font-mono font-medium">{formatPct(brand.co_occurrence_rate)}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-red-400 transition-all duration-700"
                            style={{ width: `${Math.min(brand.co_occurrence_rate, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm">No co-mentioned brands found for this filter.</div>
          )}

          {/* ── Advanced context clusters ────────────────── */}
          {advancedMentions?.context_clusters && advancedMentions.context_clusters.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h4 className="text-sm font-semibold text-gray-700 mb-4">Context Clusters</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {advancedMentions.context_clusters.map((cluster, i) => (
                  <div
                    key={i}
                    className={`rounded-lg border p-4 ${
                      cluster.is_positive_topic
                        ? 'bg-green-50/50 border-green-200'
                        : 'bg-red-50/50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-800">{cluster.topic}</span>
                      <span className="text-xs font-mono text-gray-500">{cluster.mention_count} mentions</span>
                    </div>
                    <div className="text-xs text-gray-500 mb-2">
                      Avg sentiment: <span className={`font-medium ${cluster.avg_sentiment >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {cluster.avg_sentiment.toFixed(2)}
                      </span>
                    </div>
                    {cluster.sample_phrases.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {cluster.sample_phrases.slice(0, 3).map((phrase, j) => (
                          <span key={j} className="px-2 py-0.5 bg-white/70 rounded text-xs text-gray-600 border border-gray-100">
                            {phrase}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ competitor_sov sub-tab ═══════════════════════ */}
      {ctx.competitorsSubTab === 'competitor_sov' && (
        <div className="space-y-6">
          {/* ── Brand Ranking Table ──────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Award className="w-4 h-4 text-yellow-500" />
              Brand Ranking
            </h4>
            {sortedCompetitors.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Rank</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Brand</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Visibility %</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Mention Quality</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Position</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sortedCompetitors.map((comp, i) => {
                      const isOwnBrand = comp.name.toLowerCase() === brandConfig.brand_name.toLowerCase()
                      const posConfig = COMP_POSITION_COLORS[comp.positioning?.toLowerCase()] || null
                      return (
                        <tr key={i} className={`transition-colors ${isOwnBrand ? 'bg-red-50/50' : 'hover:bg-gray-50/50'}`}>
                          <td className="px-4 py-3 text-sm font-mono font-bold text-gray-400">#{i + 1}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`font-medium ${isOwnBrand ? 'text-red-600' : 'text-gray-900'}`}>
                              {comp.name}
                            </span>
                            {isOwnBrand && (
                              <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full font-semibold">You</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-mono font-medium">{formatPct(comp.visibility_pct)}</td>
                          <td className="px-4 py-3 text-sm text-right font-mono">{comp.avg_position_score?.toFixed(1) ?? '—'}</td>
                          <td className="px-4 py-3 text-sm">
                            {posConfig ? (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${posConfig.bg} ${posConfig.text}`}>
                                {posConfig.label}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">{comp.positioning || '—'}</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-gray-400">No competitor data available.</div>
            )}
          </div>

          {/* ── SOV Donut Chart ──────────────────────────── */}
          {sovSegments.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Target className="w-4 h-4 text-red-500" />
                Share of Voice
              </h4>
              <div className="flex justify-center">
                <DonutChart segments={sovSegments} centerLabel="SOV" size={180} />
              </div>
            </div>
          )}

          {/* ── Competitive Position Bars ────────────────── */}
          {sortedCompetitors.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-500" />
                Competitive Position
              </h4>
              <div className="space-y-3">
                {sortedCompetitors.map((comp, i) => {
                  const posKey = comp.positioning?.toLowerCase() || ''
                  const posConfig = COMP_POSITION_COLORS[posKey]
                  const barColor = posConfig?.bg || 'bg-gray-400'
                  return (
                    <HorizontalBar
                      key={i}
                      label={comp.name}
                      value={Math.round(comp.visibility_pct)}
                      max={Math.round(maxVisibility)}
                      color={barColor}
                      icon={posConfig?.label?.split(' ')[0] || ''}
                    />
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ by_platform sub-tab ════════════════════════ */}
      {ctx.competitorsSubTab === ('by_platform' as any) && (
        <div className="space-y-6">
          {platformRows.length > 0 ? (
            <>
              {/* Share of Voice by Platform */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-blue-500" />
                  Visibility by AI Platform
                </h4>
                <div className="flex items-center gap-4 pb-2 border-b border-gray-100 mb-1">
                  <div className="w-28 text-xs font-medium text-gray-400 uppercase tracking-wider">Platform</div>
                  <div className="flex-1 text-xs font-medium text-gray-400 uppercase tracking-wider">Score</div>
                  <div className="w-18 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Visibility</div>
                  <div className="w-14 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">SOV</div>
                  <div className="w-18 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Mentions</div>
                  <div className="w-18 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Avg Pos</div>
                </div>
                {platformRows.map((row, i) => {
                  const barPct = maxPlatformVis > 0 ? Math.min((row.visibility / maxPlatformVis) * 100, 100) : 0
                  const barColor = row.visibility >= 60 ? 'bg-green-500' : row.visibility >= 30 ? 'bg-blue-500' : 'bg-orange-400'
                  return (
                    <div key={i} className="flex items-center gap-4 py-2.5 border-b border-gray-50 last:border-0">
                      <div className="w-28 flex-shrink-0">
                        <span className="text-sm font-medium text-gray-800 capitalize">{row.platform}</span>
                      </div>
                      <div className="flex-1">
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${barColor} transition-all duration-700`} style={{ width: `${barPct}%` }} />
                        </div>
                      </div>
                      <div className="w-18 text-right font-mono text-sm font-medium text-gray-800">{formatPct(row.visibility)}</div>
                      <div className="w-14 text-right font-mono text-xs text-gray-500">{formatPct(row.sov)}</div>
                      <div className="w-18 text-right font-mono text-xs text-gray-500">{formatNum(row.mentions, 0)}</div>
                      <div className="w-18 text-right font-mono text-xs text-gray-500">{formatNum(row.avgPosition)}</div>
                    </div>
                  )
                })}
              </div>

              {/* Average Position by Platform */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Target className="w-4 h-4 text-purple-500" />
                  Average Position by Platform
                  <span className="text-xs text-gray-400 font-normal">(lower = mentioned earlier in response)</span>
                </h4>
                <div className="space-y-3">
                  {platformRows.map((row, i) => {
                    const maxPos = Math.max(...platformRows.map(r => r.avgPosition), 1)
                    return (
                      <div key={i} className="flex items-center gap-4">
                        <div className="w-28 flex-shrink-0 text-sm text-gray-700 capitalize">{row.platform}</div>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-purple-400 transition-all duration-700"
                            style={{ width: `${Math.min((row.avgPosition / maxPos) * 100, 100)}%` }} />
                        </div>
                        <div className="w-16 text-right font-mono text-sm text-gray-700">{formatNum(row.avgPosition)}</div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Platform comparison table */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  Platform Comparison
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Platform</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Visibility</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Share of Voice</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Mentions</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Avg Position</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Signal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {platformRows.map((row, i) => {
                        const signal = row.visibility >= 60 ? { label: 'Strong', color: 'bg-green-100 text-green-700' }
                          : row.visibility >= 30 ? { label: 'Moderate', color: 'bg-yellow-100 text-yellow-700' }
                          : { label: 'Weak', color: 'bg-red-100 text-red-600' }
                        return (
                          <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-3 text-sm font-medium text-gray-800 capitalize">{row.platform}</td>
                            <td className="px-4 py-3 text-sm text-right font-mono font-medium">{formatPct(row.visibility)}</td>
                            <td className="px-4 py-3 text-sm text-right font-mono text-gray-600">{formatPct(row.sov)}</td>
                            <td className="px-4 py-3 text-sm text-right font-mono text-gray-600">{formatNum(row.mentions, 0)}</td>
                            <td className="px-4 py-3 text-sm text-right font-mono text-gray-600">{formatNum(row.avgPosition)}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${signal.color}`}>
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
            </>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <Monitor className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500 mb-1">No platform data available</p>
              <p className="text-xs text-gray-400">Run a scan to see how your brand performs across different AI platforms.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
