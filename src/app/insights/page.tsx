'use client'

import Link from 'next/link'
import { useLanguage } from '@/lib/LanguageContext'
import Footer from '@/components/Footer'
import PublicNavbar from '@/components/PublicNavbar'
import { fetchWithRetry } from '@/lib/api'
import { useEffect, useState, useCallback } from 'react'

const API_BASE = 'https://alignment-data-collection-production.up.railway.app'

interface InsightItem {
  type: string
  title: string
  summary: string
  source: string
  url: string
  date: string
  score: number
  tags: string[]
  authors: string[]
}

interface InsightsResponse {
  items: InsightItem[]
  page: number
  page_size: number
}

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'paper', label: 'Papers' },
  { key: 'blog', label: 'Blog' },
  { key: 'youtube', label: 'YouTube' },
] as const

type CategoryKey = (typeof CATEGORIES)[number]['key']

/** Strip HTML tags from a string */
function stripHtml(html: string): string {
  if (!html) return ''
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, ' ')
    .trim()
}

// ────────────────────────────────────────────────────────────
// Company logo registry
// Maps source_name → { logoUrl, domain, bg, initials }
// logoUrl: Clearbit Logo API (free, CDN-cached)
// ────────────────────────────────────────────────────────────
interface LogoInfo {
  logoUrl: string
  bg: string        // fallback avatar bg color
  initials: string  // fallback text if logo fails
}

const SOURCE_LOGO_MAP: Record<string, LogoInfo> = {
  'openai':               { logoUrl: '/logos/openai.png',        bg: '#000000', initials: 'OA' },
  'openai changelog':     { logoUrl: '/logos/openai.png',        bg: '#000000', initials: 'OA' },
  'google ai blog':       { logoUrl: '/logos/google.png',        bg: '#4285F4', initials: 'G'  },
  'google ai':            { logoUrl: '/logos/google.png',        bg: '#4285F4', initials: 'G'  },
  'google cloud ai':      { logoUrl: '/logos/googlecloud.png',   bg: '#4285F4', initials: 'GC' },
  'anthropic':            { logoUrl: '/logos/anthropic.png',     bg: '#C97B46', initials: 'An' },
  'anthropic updates':    { logoUrl: '/logos/anthropic.png',     bg: '#C97B46', initials: 'An' },
  'perplexity':           { logoUrl: '/logos/perplexity.png',    bg: '#20808D', initials: 'Px' },
  'perplexity blog':      { logoUrl: '/logos/perplexity.png',    bg: '#20808D', initials: 'Px' },
  'aws ai blog':          { logoUrl: '/logos/aws.png',           bg: '#FF9900', initials: 'AWS'},
  'aws':                  { logoUrl: '/logos/aws.png',           bg: '#FF9900', initials: 'AWS'},
  'microsoft':            { logoUrl: '/logos/microsoft.png',     bg: '#0078D4', initials: 'MS' },
  'meta ai':              { logoUrl: '/logos/meta.png',          bg: '#0866FF', initials: 'M'  },
  'huggingface':          { logoUrl: '/logos/huggingface.png',   bg: '#FFD21E', initials: 'HF' },
  'hugging face':         { logoUrl: '/logos/huggingface.png',   bg: '#FFD21E', initials: 'HF' },
  'arxiv':                { logoUrl: '/logos/arxiv.png',         bg: '#B31B1B', initials: 'arX'},
  'arxiv information retrieval': { logoUrl: '/logos/arxiv.png',  bg: '#B31B1B', initials: 'arX'},
  'semantic scholar':     { logoUrl: '/logos/semanticscholar.png', bg: '#1857B6', initials: 'SS' },
  'papers with code':     { logoUrl: '/logos/paperswithcode.png', bg: '#21CBCE', initials: 'PwC'},
  'openreview':           { logoUrl: '/logos/openreview.png',    bg: '#8B4513', initials: 'OR' },
  'search engine journal':{ logoUrl: '/logos/searchenginejournal.png', bg: '#E84455', initials: 'SEJ'},
  'moz':                  { logoUrl: '/logos/moz.png',           bg: '#00A4A4', initials: 'Moz'},
  'moz blog':             { logoUrl: '/logos/moz.png',           bg: '#00A4A4', initials: 'Moz'},
  'ahrefs':               { logoUrl: '/logos/ahrefs.png',        bg: '#FF6729', initials: 'Ah' },
  'ahrefs blog':          { logoUrl: '/logos/ahrefs.png',        bg: '#FF6729', initials: 'Ah' },
  'semrush':              { logoUrl: '/logos/semrush.png',       bg: '#FF642D', initials: 'Sr' },
  'medium ai':            { logoUrl: '/logos/medium.png',        bg: '#000000', initials: 'M'  },
  'medium':               { logoUrl: '/logos/medium.png',        bg: '#000000', initials: 'M'  },
  'github':               { logoUrl: '/logos/github.png',        bg: '#24292E', initials: 'GH' },
  'youtube':              { logoUrl: '/logos/youtube.png',       bg: '#FF0000', initials: 'YT' },
}

function getSourceLogo(sourceName: string, url?: string): LogoInfo | null {
  const key = sourceName?.toLowerCase().trim()
  if (SOURCE_LOGO_MAP[key]) return SOURCE_LOGO_MAP[key]

  // Fallback: try to match by partial name
  for (const [mapKey, info] of Object.entries(SOURCE_LOGO_MAP)) {
    if (key && key.includes(mapKey.split(' ')[0])) return info
  }

  return null
}

function getYouTubeVideoId(url?: string): string | null {
  if (!url) return null

  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase()

    if (host === 'youtu.be') {
      return parsed.pathname.split('/').filter(Boolean)[0] ?? null
    }

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      const watchId = parsed.searchParams.get('v')
      if (watchId) return watchId

      const [prefix, id] = parsed.pathname.split('/').filter(Boolean)
      if (['embed', 'shorts', 'live'].includes(prefix) && id) return id
    }
  } catch {
    return null
  }

  return null
}

function getCategoryBadge(category: string) {
  switch (category.toLowerCase()) {
    case 'paper':
      return { emoji: '', label: 'Paper', bg: 'bg-surface-warm text-ink-2' }
    case 'blog':
      return { emoji: '', label: 'Blog', bg: 'bg-sage-bg text-sage' }
    case 'youtube':
      return { emoji: '', label: 'YouTube', bg: 'bg-surface-muted text-ink-2' }
    default:
      return { emoji: '', label: category, bg: 'bg-surface-muted text-ink-2' }
  }
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

/** Source logo avatar: real img with text fallback */
function SourceLogo({ source, url }: { source: string; url?: string }) {
  const [imgError, setImgError] = useState(false)
  const youtubeVideoId = getYouTubeVideoId(url)
  const isYouTube = Boolean(youtubeVideoId || source?.toLowerCase().includes('youtube'))
  const info = getSourceLogo(source, url)

  if (youtubeVideoId && !imgError) {
    return (
      <img
        src={`https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg`}
        alt={source}
        width={32}
        height={20}
        className="h-5 w-8 rounded object-cover flex-shrink-0"
        onError={() => setImgError(true)}
      />
    )
  }

  if (!info || imgError) {
    if (isYouTube) {
      return (
        <img
          src="/logos/youtube.png"
          alt={source}
          width={20}
          height={20}
          className="w-5 h-5 rounded object-contain flex-shrink-0"
        />
      )
    }

    return (
      <span
        className="inline-flex items-center justify-center w-5 h-5 rounded text-white text-[9px] font-bold flex-shrink-0"
        style={{ backgroundColor: info?.bg ?? '#6B7280' }}
      >
        {(info?.initials ?? source?.charAt(0) ?? '?').substring(0, 2)}
      </span>
    )
  }

  return (
    <img
      src={info.logoUrl}
      alt={source}
      width={20}
      height={20}
      className="w-5 h-5 rounded object-contain flex-shrink-0"
      onError={() => setImgError(true)}
    />
  )
}

function SkeletonCard() {
  return (
    <div className="bg-surface rounded-2xl border border-divider-light shadow-soft p-6 animate-pulse">
      <div className="h-5 w-20 bg-surface-muted rounded-full mb-4" />
      <div className="h-5 bg-surface-muted rounded w-full mb-2" />
      <div className="h-5 bg-surface-muted rounded w-3/4 mb-4" />
      <div className="space-y-2 mb-6">
        <div className="h-4 bg-surface-muted rounded w-full" />
        <div className="h-4 bg-surface-muted rounded w-full" />
        <div className="h-4 bg-surface-muted rounded w-2/3" />
      </div>
      <div className="flex items-center justify-between pt-4 border-t border-divider-light">
        <div className="h-3 bg-surface-muted rounded w-32" />
        <div className="h-4 bg-surface-muted rounded w-24" />
      </div>
    </div>
  )
}

export default function InsightsPage() {
  const { t } = useLanguage()
  const [items, setItems] = useState<InsightItem[]>([])
  const [page, setPage] = useState(1)
  const [category, setCategory] = useState<CategoryKey>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [technicalError, setTechnicalError] = useState<string | null>(null)

  const pageSize = 20

  const fetchInsights = useCallback(async () => {
    setLoading(true)
    setError(null)
    setTechnicalError(null)
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
      })
      if (category !== 'all') params.set('category', category)
      const url = `${API_BASE}/public/insights?${params.toString()}`
      const res = await fetchWithRetry(url, {}, { timeoutMs: 9000, budgetMs: 45000 })
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText || ''}`.trim())
      const data: InsightsResponse = await res.json()
      setItems(data.items ?? [])
    } catch (err) {
      setError('Failed to load insights. Please try again later.')
      setTechnicalError(err instanceof Error ? err.message : String(err))
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [page, category])

  useEffect(() => {
    fetchInsights()
  }, [fetchInsights])

  const handleCategoryChange = (cat: CategoryKey) => {
    setCategory(cat)
    setPage(1)
  }

  return (
    <div className="min-h-screen bg-canvas">
      {/* Navigation */}
      <PublicNavbar activeHref="/insights/" />

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-[#1f1f1f] bg-[#090909] pb-16 pt-32">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.022)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.022)_1px,transparent_1px)] bg-[size:44px_44px]" />
        <div className="absolute left-1/2 top-0 h-80 w-[620px] -translate-x-1/2 bg-[rgba(241,90,43,0.10)] blur-[110px]" />

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <div className="brand-eyebrow mb-6">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            Market Research
          </div>
          <h1 className="mb-5 font-serif text-4xl font-normal leading-[1.02] text-white md:text-6xl lg:text-7xl">
            Signals shaping answer-engine discovery
          </h1>
          <p className="text-base md:text-lg text-[#c7c7c7] max-w-2xl mx-auto leading-7">
            Curated analysis on how AI platforms discover, rank, and cite brands, products, and supporting evidence.
          </p>
        </div>
      </section>

      {/* Filter Tabs + Content */}
      <section className="py-12 bg-canvas">
        <div className="max-w-7xl mx-auto px-6">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 mb-10 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => handleCategoryChange(cat.key)}
                className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                  category === cat.key
                    ? 'bg-ink text-ink-inv shadow-soft'
                    : 'bg-surface text-ink-2 border border-divider-light hover:border-divider hover:text-ink'
                }`}
              >
                {cat.label}
              </button>
            ))}
            {!loading && (
              <span className="ml-auto text-sm text-ink-3">
                {items.length} result{items.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Error State */}
          {error && (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-red-soft-bg rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-soft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <p className="text-ink-3 mb-4">{error}</p>
              {technicalError && (
                <p className="mx-auto mb-4 max-w-[620px] rounded-xl border border-divider-light bg-surface px-4 py-3 font-mono text-xs leading-5 text-ink-3">
                  GET {API_BASE}/public/insights failed: {technicalError}
                </p>
              )}
              <button
                onClick={fetchInsights}
                className="px-5 py-2.5 bg-ink hover:bg-[#2d2d2c] text-ink-inv text-sm font-medium rounded-xl transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* Loading Skeleton */}
          {loading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {/* Card Grid */}
          {!loading && !error && items.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item, idx) => {
                const badge = getCategoryBadge(item.type || 'paper')
                return (
                  <article
                    key={`${item.url}-${idx}`}
                    className="group bg-surface rounded-2xl border border-divider-light shadow-soft hover:shadow-medium transition-all duration-300 flex flex-col"
                  >
                    <div className="p-6 flex flex-col flex-1">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium w-fit mb-4 ${badge.bg}`}>
                        {badge.label}
                      </span>

                      <h3 className="text-lg font-semibold text-ink mb-2 line-clamp-2 group-hover:text-ink transition-colors">
                        {item.title}
                      </h3>

                      <p className="text-sm text-ink-3 leading-relaxed mb-6 line-clamp-3 flex-1">
                        {stripHtml(item.summary)}
                      </p>

                      <div className="flex items-center justify-between pt-4 border-t border-divider-light mt-auto">
                        {/* Source logo + name + date */}
                        <div className="flex items-center gap-1.5 min-w-0 max-w-[60%]">
                          <SourceLogo source={item.source} url={item.url} />
                          <span className="text-xs text-ink-3 truncate">
                            {item.source}
                            {item.date ? ` · ${formatDate(item.date)}` : ''}
                          </span>
                        </div>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-ink-2 hover:text-ink transition-colors flex items-center gap-1 flex-shrink-0"
                        >
                          Read More
                          <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                          </svg>
                        </a>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && items.length === 0 && (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-surface-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-ink-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-ink-3">No insights found for this category.</p>
            </div>
          )}

          {/* Pagination */}
          {!loading && !error && items.length > 0 && (
            <div className="flex items-center justify-center gap-4 mt-12">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-surface border border-divider-light rounded-xl text-sm font-medium text-ink-2 hover:border-divider hover:text-ink transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-divider-light"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>
              <span className="text-sm text-ink-3">
                Page <span className="font-medium text-ink">{page}</span>
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={items.length < pageSize}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-surface border border-divider-light rounded-xl text-sm font-medium text-ink-2 hover:border-divider hover:text-ink transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-divider-light"
              >
                Next
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  )
}
