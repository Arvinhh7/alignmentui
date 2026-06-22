/* eslint-disable @next/next/no-img-element */
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Database, ExternalLink, Filter, Search, ShieldCheck } from 'lucide-react'
import { API_BASE_URL } from '@/lib/api'
import {
  SOURCE_TYPES,
  SOURCE_TYPE_STYLES,
  faviconUrl,
  type PublicSourceDomain,
  type SourceDistributionItem,
  type SourcesResponse,
  type SourceSummary,
  type SourceType,
} from './source-data'

const PAGE_SIZE = 50

const EMPTY_SUMMARY: SourceSummary = {
  source_domains: 0,
  citations: 0,
  featured_sources: 0,
  top_source: {
    name: '',
    domain: '',
    citations: 0,
    share_pct: 0,
  },
}

const EMPTY_DISTRIBUTION: SourceDistributionItem[] = SOURCE_TYPES.map(sourceType => ({
  source_type: sourceType,
  source_count: 0,
  citation_count: 0,
  domain_share_pct: 0,
  citation_share_pct: 0,
}))

function formatNumber(value: number) {
  return value.toLocaleString('en-US')
}

function citationShare(citations: number, totalCitations: number) {
  return totalCitations > 0 ? citations / totalCitations * 100 : 0
}

function formatPercent(value: number) {
  if (!Number.isFinite(value) || value === 0) return '0%'
  const absoluteValue = Math.abs(value)
  if (absoluteValue < 0.01) return '<0.01%'
  if (absoluteValue < 0.1) return `${value.toFixed(2)}%`
  return `${value.toFixed(1)}%`
}

function TypeBadge({ type }: { type: SourceType }) {
  const style = SOURCE_TYPE_STYLES[type]
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${style.badge}`}>
      {type}
    </span>
  )
}

export default function SourcesPage() {
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<SourceType | 'All'>('All')
  const [summary, setSummary] = useState<SourceSummary>(EMPTY_SUMMARY)
  const [distribution, setDistribution] = useState<SourceDistributionItem[]>(EMPTY_DISTRIBUTION)
  const [sources, setSources] = useState<PublicSourceDomain[]>([])
  const [pagination, setPagination] = useState<SourcesResponse['pagination'] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadSources = useCallback(async (offset = 0) => {
    const isInitial = offset === 0
    if (isInitial) {
      setIsLoading(true)
      setError(null)
    } else {
      setIsLoadingMore(true)
    }

    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
      })
      const needle = query.trim()
      if (needle) params.set('search', needle)
      if (typeFilter !== 'All') params.set('source_type', typeFilter)

      const response = await fetch(`${API_BASE_URL}/api/sources?${params.toString()}`)
      if (!response.ok) {
        throw new Error(`Sources API returned ${response.status}`)
      }
      const payload = await response.json() as SourcesResponse
      setSummary(payload.summary ?? EMPTY_SUMMARY)
      setDistribution(payload.distribution?.length ? payload.distribution : EMPTY_DISTRIBUTION)
      setPagination(payload.pagination ?? null)
      setSources(previous => isInitial ? payload.sources ?? [] : [...previous, ...(payload.sources ?? [])])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load sources.')
      if (isInitial) {
        setSources([])
        setPagination(null)
      }
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [query, typeFilter])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadSources(0)
    }, query.trim() ? 250 : 0)
    return () => window.clearTimeout(timer)
  }, [loadSources, query])

  const typeDistribution = useMemo(() => {
    const byType = new Map(distribution.map(item => [item.source_type, item]))
    return SOURCE_TYPES.map(type => ({
      type,
      count: byType.get(type)?.source_count ?? 0,
      citations: byType.get(type)?.citation_count ?? 0,
      share: byType.get(type)?.citation_share_pct ?? 0,
    })).sort((a, b) => b.share - a.share || a.type.localeCompare(b.type))
  }, [distribution])

  const activeTypeCount = typeDistribution.filter(item => item.count > 0 || item.citations > 0).length

  const maxCitations = sources[0]?.citation_count ?? 1
  const hasExpanded = sources.length > PAGE_SIZE

  return (
    <div className="min-h-screen bg-canvas">
      <div className="border-b border-divider-light bg-surface px-8 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sage-bg">
              <Database className="h-5 w-5 text-sage" />
            </div>
            <div>
              <h1 className="heading-dash">Sources</h1>
              <p className="text-sm text-ink-3">
                Public source index across AI-cited domains, topics, and citation categories
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-divider-light bg-canvas px-3 py-2 text-xs font-semibold text-ink-3">
            <ShieldCheck className="h-4 w-4 text-sage" />
            Public Source Index
          </div>
        </div>
      </div>

      <div className="space-y-6 p-6">
        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-divider bg-surface p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Source Domains</p>
            <p className="mt-3 font-mono text-3xl font-bold text-ink">{formatNumber(summary.source_domains)}</p>
            <p className="mt-1 text-xs text-ink-3">cited domains across AI models</p>
          </div>
          <div className="rounded-xl border border-divider bg-surface p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Citations</p>
            <p className="mt-3 font-mono text-3xl font-bold text-ink">{formatNumber(summary.citations)}</p>
            <p className="mt-1 text-xs text-ink-3">citations across AI models</p>
          </div>
          <div className="rounded-xl border border-divider bg-surface p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Featured Sources</p>
            <p className="mt-3 font-mono text-3xl font-bold text-ink">{formatNumber(summary.featured_sources)}</p>
            <p className="mt-1 text-xs text-ink-3">top domains in the first view</p>
          </div>
          <div className="rounded-xl border border-divider bg-surface p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Top Source Share</p>
            <p className="mt-3 font-mono text-3xl font-bold text-ink">{formatPercent(summary.top_source.share_pct)}</p>
            <p className="mt-1 text-xs text-ink-3">{summary.top_source.name || 'Top source'} across AI models</p>
          </div>
        </section>

        <section className="rounded-xl border border-divider bg-surface p-5">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-ink">Sources by Distribution</h2>
              <p className="mt-1 text-sm text-ink-3">Domain types for where AI models cite evidence.</p>
            </div>
            <span className="text-xs font-medium text-ink-3">{activeTypeCount} active source types</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {typeDistribution.map(item => {
              const style = SOURCE_TYPE_STYLES[item.type]
              return (
                <button
                  key={item.type}
                  onClick={() => setTypeFilter(typeFilter === item.type ? 'All' : item.type)}
                  className={`rounded-xl border p-4 text-left transition-colors ${
                    typeFilter === item.type
                      ? 'border-ink bg-canvas'
                      : 'border-divider-light bg-canvas hover:border-divider'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <TypeBadge type={item.type} />
                    <span className="font-mono text-sm font-semibold text-ink">{formatPercent(item.share)}</span>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-muted">
                    <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${item.share > 0 ? Math.max(5, item.share) : 0}%` }} />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-ink-3">
                    <span>{item.count} sources</span>
                    <span>{formatNumber(item.citations)} citations</span>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        <section className="rounded-xl border border-divider bg-surface">
          <div className="border-b border-divider-light px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-ink">Most-Cited Source Domains</h2>
                <p className="mt-1 text-sm text-ink-3">
                  {formatNumber(summary.source_domains)} domains, {formatNumber(summary.citations)} citations across AI models
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
                  <input
                    value={query}
                    onChange={event => setQuery(event.target.value)}
                    placeholder="Search sources or topics..."
                    className="h-10 w-72 rounded-lg border border-divider bg-canvas pl-9 pr-3 text-sm text-ink-2 outline-none transition-colors focus:border-ink"
                  />
                </div>
                <div className="flex h-10 items-center gap-2 rounded-lg border border-divider bg-canvas px-3">
                  <Filter className="h-4 w-4 text-ink-3" />
                  <select
                    value={typeFilter}
                    onChange={event => setTypeFilter(event.target.value as SourceType | 'All')}
                    className="bg-transparent text-sm font-medium text-ink-2 outline-none"
                  >
                    <option value="All">All types</option>
                    {SOURCE_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px]">
              <thead>
                <tr className="border-b border-divider-light bg-canvas">
                  <th className="w-14 px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-3">#</th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-3">Domain</th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-3">Type</th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-3">Citations</th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-3">Share</th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-3">Avg. Pos.</th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-3">Topics</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider-light">
                {sources.map(source => (
                  <tr key={source.rank} className={source.rank <= 5 ? 'bg-[#EFFAFF]' : 'hover:bg-surface-warm'}>
                    <td className="px-5 py-4 align-top font-mono text-sm font-semibold text-ink-3">{source.rank}</td>
                    <td className="px-5 py-4 align-top">
                      <div className="flex items-start gap-3">
                        <img
                          src={faviconUrl(source.domain)}
                          alt={`${source.name} logo`}
                          className="mt-0.5 h-6 w-6 rounded-md"
                          loading="lazy"
                        />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-ink">{source.name}</span>
                            <a
                              href={`https://${source.domain}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-medium text-ink-3 hover:text-ink"
                            >
                              {source.domain}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                          {(source.sample_topics ?? []).map(topic => (
                              <span key={topic} className="rounded-md border border-divider-light bg-surface px-2 py-1 text-[11px] font-medium text-ink-3">
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 align-top"><TypeBadge type={source.source_type} /></td>
                    <td className="px-5 py-4 align-top text-right">
                      <div className="flex items-center justify-end gap-3">
                        <div className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-surface-muted lg:block">
                          <div className="h-full rounded-full bg-ink" style={{ width: `${Math.max(4, source.citation_count / maxCitations * 100)}%` }} />
                        </div>
                        <span className="font-mono text-sm font-semibold text-ink">{formatNumber(source.citation_count)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 align-top text-right font-mono text-sm font-semibold text-ink">{formatPercent(citationShare(source.citation_count, summary.citations))}</td>
                    <td className="px-5 py-4 align-top text-right font-mono text-sm text-ink-2">{typeof source.avg_position === 'number' ? source.avg_position.toFixed(1) : '—'}</td>
                    <td className="px-5 py-4 align-top text-right font-mono text-sm text-ink-2">{formatNumber(source.topic_count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {isLoading && (
            <div className="px-5 py-16 text-center text-sm text-ink-3">Loading source domains...</div>
          )}

          {!isLoading && error && (
            <div className="px-5 py-16 text-center text-sm text-red-600">{error}</div>
          )}

          {!isLoading && !error && sources.length === 0 && (
            <div className="px-5 py-16 text-center text-sm text-ink-3">No sources match the current filter.</div>
          )}

          {!isLoading && !error && sources.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-divider-light px-5 py-4">
              <p className="text-xs text-ink-3">
                Showing {formatNumber(sources.length)} of {formatNumber(pagination?.total ?? sources.length)} source domains
              </p>
              <div className="flex items-center gap-2">
                {hasExpanded && (
                  <button
                    type="button"
                    onClick={() => loadSources(0)}
                    className="h-9 rounded-lg border border-divider bg-canvas px-3 text-sm font-semibold text-ink-2 hover:border-ink"
                  >
                    Collapse to top 50
                  </button>
                )}
                {pagination?.has_next && (
                  <button
                    type="button"
                    onClick={() => loadSources(sources.length)}
                    disabled={isLoadingMore}
                    className="h-9 rounded-lg bg-ink px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoadingMore ? 'Loading...' : 'Load more'}
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
