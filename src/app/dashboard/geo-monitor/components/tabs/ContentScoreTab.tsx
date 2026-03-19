'use client'

import { FileText, Search, Loader2, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react'
import { useUnified } from '../UnifiedContext'
import { MetricCard, formatNum, formatPct } from '../shared/ChartComponents'

export function ContentScoreTab() {
  const ctx = useUnified()
  const result = ctx.aeoResult

  // Score color helper
  const scoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600'
    if (score >= 40) return 'text-yellow-600'
    return 'text-red-600'
  }

  const scoreBg = (score: number) => {
    if (score >= 70) return 'bg-green-50 border-green-200'
    if (score >= 40) return 'bg-yellow-50 border-yellow-200'
    return 'bg-red-50 border-red-200'
  }

  const barColor = (score: number, max: number) => {
    const pct = max > 0 ? (score / max) * 100 : 0
    if (pct >= 70) return 'bg-green-500'
    if (pct >= 40) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="space-y-8">
      {/* ── A) URL Input + Score Button ─────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">AEO Content Scorer</h3>
        <p className="text-xs text-gray-500 mb-4">
          Enter a URL to analyze its optimization for AI engine visibility.
        </p>
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="url"
              value={ctx.aeoUrl}
              onChange={e => ctx.setAeoUrl(e.target.value)}
              placeholder="https://example.com/page"
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
              onKeyDown={e => { if (e.key === 'Enter') ctx.handleRunAeo() }}
            />
          </div>
          <button
            onClick={ctx.handleRunAeo}
            disabled={ctx.isRunningAeo || !ctx.aeoUrl.trim()}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            {ctx.isRunningAeo ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Scoring...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Score Content
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── B) Error ───────────────────────────────── */}
      {ctx.aeoError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{ctx.aeoError}</p>
        </div>
      )}

      {/* ── C) Result Display ──────────────────────── */}
      {result && (
        <div className="space-y-6">
          {/* Overall Score */}
          <div className={`rounded-xl border p-6 text-center ${scoreBg(result.overall_score)}`}>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Overall AEO Score</p>
            <p className={`text-5xl font-bold font-mono ${scoreColor(result.overall_score)}`}>
              {result.overall_score}
            </p>
            <p className="text-xs text-gray-500 mt-1">out of 100</p>
          </div>

          {/* Dimension Bars */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Score Dimensions</h3>
            <div className="space-y-4">
              {[
                { name: 'Readability', score: result.readability_score, max_score: 100 },
                { name: 'Structure', score: result.structure_score, max_score: 100 },
                { name: 'Information Density', score: Math.round(result.information_density * 100), max_score: 100 },
              ].map((dim) => {
                const pct = dim.max_score > 0 ? (dim.score / dim.max_score) * 100 : 0
                return (
                  <div key={dim.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600">{dim.name}</span>
                      <span className="text-xs font-mono font-bold text-gray-800">
                        {dim.score} / {dim.max_score}
                      </span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${barColor(dim.score, dim.max_score)}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Page Metadata</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-lg font-bold font-mono text-gray-900">{formatNum(result.word_count, 0)}</p>
                <p className="text-xs text-gray-500">Word Count</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-lg font-bold font-mono text-gray-900">{result.heading_count}</p>
                <p className="text-xs text-gray-500">Headings</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-lg font-bold font-mono text-gray-900">{result.list_count}</p>
                <p className="text-xs text-gray-500">Lists</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-center gap-2">
                  {result.has_faq_schema ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  )}
                  <span className="text-xs text-gray-600">FAQ Schema</span>
                </div>
                <div className="flex items-center justify-center gap-2 mt-1">
                  {result.has_howto_schema ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  )}
                  <span className="text-xs text-gray-600">HowTo Schema</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {result.recommendations.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Recommendations</h3>
              <ol className="space-y-2">
                {result.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-50 text-red-600 text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <p className="text-sm text-gray-700">{rec}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {/* ── D) History Table ───────────────────────── */}
      {ctx.aeoHistory.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Scoring History</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">URL</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Score</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Readability</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Structure</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ctx.aeoHistory.map((h, i) => (
                  <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-sm">
                      <a
                        href={h.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1 max-w-xs truncate"
                      >
                        {h.url}
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    </td>
                    <td className={`px-4 py-3 text-sm text-right font-mono font-bold ${scoreColor(h.overall_score)}`}>
                      {h.overall_score}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono">{h.readability_score}</td>
                    <td className="px-4 py-3 text-sm text-right font-mono">{h.structure_score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
