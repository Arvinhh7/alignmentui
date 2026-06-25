'use client'

import { useEffect, useState } from 'react'
import { X, Loader2, TrendingUp, MessageSquare, Link2, Award, ExternalLink, AlertCircle } from 'lucide-react'
import { api, PromptDetail } from '@/lib/api'
import { TrendLineChart } from './shared/ChartComponents'

// Single-prompt dashboard (Step 1). Slides over from the right when a prompt row
// is clicked. Reconstructs from the per-prompt detail endpoint, which correlates
// scan history to this prompt by its UUID (the ① spine).
export default function PromptDetailDrawer({
  promptId,
  customerId,
  onClose,
}: {
  promptId: string
  customerId: string
  onClose: () => void
}) {
  const [data, setData] = useState<PromptDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    api.getPromptDetail(promptId, customerId)
      .then(res => {
        if (cancelled) return
        if (res.data) setData(res.data)
        else setError(res.error || 'Failed to load prompt detail')
      })
      .catch(() => { if (!cancelled) setError('Failed to load prompt detail') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [promptId, customerId])

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const sentimentColor = (s: string) =>
    s === 'positive' ? 'text-sage' : s === 'negative' ? 'text-red-soft' : 'text-ink-3'

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-ink/20 backdrop-blur-[1px]" onClick={onClose} aria-hidden="true" />

      {/* Panel */}
      <div className="relative w-full max-w-2xl h-full bg-surface shadow-2xl overflow-y-auto" role="dialog" aria-modal="true">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-surface/95 backdrop-blur border-b border-divider-light px-6 py-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-ink-3 uppercase tracking-wider mb-1">Prompt detail</p>
            <h2 className="text-sm font-medium text-ink leading-snug break-words">
              {data?.template || 'Loading…'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-lg hover:bg-surface-warm text-ink-3 hover:text-ink transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5">
          {loading && (
            <div className="flex items-center justify-center py-20 text-ink-3">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading prompt data…
            </div>
          )}

          {!loading && error && (
            <div className="flex items-center gap-2 text-sm text-red-soft py-12 justify-center">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}

          {!loading && !error && data && data.scan_count === 0 && (
            <div className="text-center text-sm text-ink-3 py-16">
              No scan data for this prompt yet. Run a scan to populate this dashboard.
            </div>
          )}

          {!loading && !error && data && data.scan_count > 0 && (
            <div className="space-y-6">
              {/* Headline metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-divider-light bg-canvas px-4 py-3">
                  <p className="text-xs text-ink-3 mb-1">Visibility</p>
                  <p className="text-xl font-semibold text-ink">{data.visibility_score}%</p>
                </div>
                <div className="rounded-xl border border-divider-light bg-canvas px-4 py-3">
                  <p className="text-xs text-ink-3 mb-1">Mentioned</p>
                  <p className={`text-xl font-semibold ${data.mentioned ? 'text-sage' : 'text-ink-3'}`}>
                    {data.mentioned ? 'Yes' : 'No'}
                  </p>
                </div>
                <div className="rounded-xl border border-divider-light bg-canvas px-4 py-3">
                  <p className="text-xs text-ink-3 mb-1">Days tracked</p>
                  <p className="text-xl font-semibold text-ink">{data.scan_count}</p>
                </div>
              </div>

              {/* Visibility trend */}
              <section>
                <h3 className="flex items-center gap-1.5 text-sm font-medium text-ink mb-2">
                  <TrendingUp className="w-4 h-4 text-ink-3" /> Visibility trend
                </h3>
                <div className="rounded-xl border border-divider-light bg-canvas p-3">
                  <TrendLineChart
                    label="Visibility %"
                    color="#1D9E75"
                    data={data.trend.map(p => ({ date: p.date, value: p.visibility_score }))}
                  />
                </div>
              </section>

              {/* Brand ranking */}
              {data.ranking.length > 0 && (
                <section>
                  <h3 className="flex items-center gap-1.5 text-sm font-medium text-ink mb-2">
                    <Award className="w-4 h-4 text-ink-3" /> Brand ranking
                  </h3>
                  <div className="rounded-xl border border-divider-light overflow-hidden">
                    {data.ranking.map((b, i) => (
                      <div
                        key={b.name}
                        className={`flex items-center justify-between px-4 py-2.5 text-sm ${i > 0 ? 'border-t border-divider-light' : ''} ${b.is_own_brand ? 'bg-sage-bg' : ''}`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-ink-3 font-mono text-xs w-4">{i + 1}</span>
                          <span className={b.is_own_brand ? 'font-medium text-ink' : 'text-ink-2'}>{b.name}</span>
                          {b.is_own_brand && <span className="text-[10px] bg-sage text-surface px-1.5 py-0.5 rounded-full">You</span>}
                        </span>
                        <span className="text-ink-3 font-mono text-xs">{b.mentions_count}×</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Per-engine answers (chats) */}
              {data.engines.length > 0 && (
                <section>
                  <h3 className="flex items-center gap-1.5 text-sm font-medium text-ink mb-2">
                    <MessageSquare className="w-4 h-4 text-ink-3" /> Answers by engine
                  </h3>
                  <div className="space-y-3">
                    {data.engines.map(e => (
                      <div key={e.platform} className="rounded-xl border border-divider-light bg-canvas p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-ink capitalize">{e.platform}</span>
                          <span className="flex items-center gap-3 text-xs">
                            <span className={e.mentioned ? 'text-sage font-medium' : 'text-ink-3'}>
                              {e.mentioned ? 'Mentioned' : 'Not mentioned'}
                            </span>
                            {e.mentioned && (
                              <span className={sentimentColor(e.sentiment)}>{e.sentiment}</span>
                            )}
                            {e.ordinal_rank != null && (
                              <span className="text-ink-3 font-mono">#{e.ordinal_rank}</span>
                            )}
                          </span>
                        </div>
                        {e.response_snippet && (
                          <p className="text-xs text-ink-2 leading-relaxed whitespace-pre-wrap">{e.response_snippet}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Cited sources */}
              {data.sources.length > 0 && (
                <section>
                  <h3 className="flex items-center gap-1.5 text-sm font-medium text-ink mb-2">
                    <Link2 className="w-4 h-4 text-ink-3" /> Top cited sources
                  </h3>
                  <div className="rounded-xl border border-divider-light overflow-hidden">
                    {data.sources.slice(0, 10).map((s, i) => (
                      <div key={s.domain} className={`px-4 py-2.5 text-sm ${i > 0 ? 'border-t border-divider-light' : ''}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-ink-2 font-medium">{s.domain}</span>
                          <span className="text-ink-3 font-mono text-xs">{s.url_count} {s.url_count === 1 ? 'URL' : 'URLs'}</span>
                        </div>
                        {s.urls.slice(0, 3).map(u => (
                          <a
                            key={u}
                            href={u}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 flex items-center gap-1 text-xs text-sage hover:underline truncate"
                          >
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            <span className="truncate">{u}</span>
                          </a>
                        ))}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
