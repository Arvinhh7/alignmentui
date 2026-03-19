'use client'

import Link from 'next/link'
import { useLanguage } from '@/lib/LanguageContext'
import LanguageSwitch from '@/components/LanguageSwitch'
import { LogoFull } from '@/components/Logo'
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

function getCategoryBadge(category: string) {
  switch (category.toLowerCase()) {
    case 'paper':
      return { emoji: '📄', label: 'Paper', bg: 'bg-blue-100 text-blue-700' }
    case 'blog':
      return { emoji: '💬', label: 'Blog', bg: 'bg-green-100 text-green-700' }
    case 'youtube':
      return { emoji: '🎬', label: 'YouTube', bg: 'bg-red-100 text-red-700' }
    default:
      return { emoji: '📄', label: category, bg: 'bg-gray-100 text-gray-700' }
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
  const info = getSourceLogo(source, url)

  if (!info || imgError) {
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
    <div className="bg-white rounded-2xl border border-gray-200 shadow-soft p-6 animate-pulse">
      <div className="h-5 w-20 bg-gray-200 rounded-full mb-4" />
      <div className="h-5 bg-gray-200 rounded w-full mb-2" />
      <div className="h-5 bg-gray-200 rounded w-3/4 mb-4" />
      <div className="space-y-2 mb-6">
        <div className="h-4 bg-gray-100 rounded w-full" />
        <div className="h-4 bg-gray-100 rounded w-full" />
        <div className="h-4 bg-gray-100 rounded w-2/3" />
      </div>
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="h-3 bg-gray-100 rounded w-32" />
        <div className="h-4 bg-gray-200 rounded w-24" />
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

  const pageSize = 20

  const fetchInsights = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const catParam = category === 'all' ? '' : category
      const res = await fetch(
        `${API_BASE}/public/insights?page=${page}&page_size=${pageSize}&category=${catParam}`
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: InsightsResponse = await res.json()
      setItems(data.items ?? [])
    } catch (err) {
      setError('Failed to load insights. Please try again later.')
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
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center group hover:opacity-90 transition-opacity">
              <LogoFull width={140} height={45} />
            </Link>

            <div className="hidden lg:flex items-center gap-1">
              {[
                { label: t.nav.system, href: '/system/' },
                { label: t.nav.technology, href: '/technology/' },
                { label: t.nav.pricing, href: '/pricing/' },
                { label: t.nav.docs, href: '/docs/' },
                { label: t.nav.insights, href: '/insights/' },
                { label: t.nav.contact, href: '/contact/' },
              ].map((item, i) => (
                <Link
                  key={i}
                  href={item.href}
                  className={`px-3 py-2 text-sm font-medium transition-colors rounded-lg flex items-center gap-1 ${
                    item.href === '/insights/'
                      ? 'text-red-600 bg-red-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              {/* Solutions Dropdown */}
              <div className="relative group">
                <button className="px-3 py-2 text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors rounded-lg hover:bg-gray-50 flex items-center gap-1">
                  {t.nav.solutions}
                  <svg className="w-3.5 h-3.5 opacity-50 transition-transform group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-xl shadow-xl border border-gray-200 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  {[
                    { label: 'GEO Audit', href: '/dashboard/geo-audit', icon: '🔍' },
                    { label: 'GEO Optimization', href: '/dashboard/geo-optimization', icon: '⚡' },
                    { label: 'GEO Content', href: '/dashboard/geo-content', icon: '📝' },
                    { label: 'GEO Distribution', href: '/dashboard/geo-distribution', icon: '📡' },
                    { label: 'GEO Monitor', href: '/dashboard/geo-monitor', icon: '📊' },
                  ].map((item, i) => (
                    <Link key={i} href={item.href} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors">
                      <span>{item.icon}</span>
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  ))}
                  <div className="border-t border-gray-100 my-1" />
                  <Link href="/roi-simulator" className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                    <span>📈</span>
                    <span className="font-semibold">ROI Calculator <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full ml-1">Free</span></span>
                  </Link>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <LanguageSwitch />
              <Link
                href="/login/"
                className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-red-600 rounded-lg hover:from-red-600 hover:to-red-700 transition-all shadow-soft hover:shadow-medium btn-shine"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-stripe-gradient" />
        <div className="absolute inset-0 bg-grid opacity-50" />
        <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-red-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-100 rounded-full text-red-600 text-sm font-medium mb-6">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            Industry Research
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-[1.1] mb-4">
            GEO Industry{' '}
            <span className="gradient-text">Insights</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Stay ahead of AI search trends with curated papers, blog posts, and video content from the GEO ecosystem.
          </p>
        </div>
      </section>

      {/* Filter Tabs + Content */}
      <section className="py-12 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-6">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 mb-10 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => handleCategoryChange(cat.key)}
                className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                  category === cat.key
                    ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-soft'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:text-gray-900'
                }`}
              >
                {cat.label}
              </button>
            ))}
            {!loading && (
              <span className="ml-auto text-sm text-gray-400">
                {items.length} result{items.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Error State */}
          {error && (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <p className="text-gray-500 mb-4">{error}</p>
              <button
                onClick={fetchInsights}
                className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-xl transition-colors"
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
                    className="group bg-white rounded-2xl border border-gray-200 shadow-soft hover:shadow-medium transition-all duration-300 flex flex-col"
                  >
                    <div className="p-6 flex flex-col flex-1">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium w-fit mb-4 ${badge.bg}`}>
                        <span>{badge.emoji}</span>
                        {badge.label}
                      </span>

                      <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-red-600 transition-colors">
                        {item.title}
                      </h3>

                      <p className="text-sm text-gray-500 leading-relaxed mb-6 line-clamp-3 flex-1">
                        {stripHtml(item.summary)}
                      </p>

                      <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto">
                        {/* Source logo + name + date */}
                        <div className="flex items-center gap-1.5 min-w-0 max-w-[60%]">
                          <SourceLogo source={item.source} url={item.url} />
                          <span className="text-xs text-gray-400 truncate">
                            {item.source}
                            {item.date ? ` · ${formatDate(item.date)}` : ''}
                          </span>
                        </div>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-red-500 hover:text-red-600 transition-colors flex items-center gap-1 flex-shrink-0"
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
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-500">No insights found for this category.</p>
            </div>
          )}

          {/* Pagination */}
          {!loading && !error && items.length > 0 && (
            <div className="flex items-center justify-center gap-4 mt-12">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-gray-300 hover:text-gray-900 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-gray-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>
              <span className="text-sm text-gray-500">
                Page <span className="font-medium text-gray-900">{page}</span>
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={items.length < pageSize}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-gray-300 hover:text-gray-900 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-gray-200"
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
      <footer className="bg-white border-t border-gray-100 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="md:col-span-1">
              <div className="mb-4">
                <LogoFull width={160} height={100} />
              </div>
              <p className="text-gray-500 text-sm leading-relaxed">
                The complete GEO platform for AI search visibility.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Resources</h4>
              <ul className="space-y-3 text-sm text-gray-600">
                <li><Link href="/docs/" className="hover:text-gray-900 transition-colors">Documentation</Link></li>
                <li><Link href="/insights/" className="hover:text-gray-900 transition-colors">Insights</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Ecosystem</h4>
              <ul className="space-y-3 text-sm text-gray-600">
                <li><Link href="#" className="hover:text-gray-900 transition-colors">Partners</Link></li>
                <li><Link href="#" className="hover:text-gray-900 transition-colors">Integrations</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Contact</h4>
              <ul className="space-y-3 text-sm text-gray-600">
                <li><a href="mailto:contact@alignmenttech.ai" className="hover:text-gray-900 transition-colors">Send Email</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-100 text-center text-gray-500 text-sm">
            © {new Date().getFullYear()} Alignment AI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
