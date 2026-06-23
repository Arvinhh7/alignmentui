'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AlertCircle, Compass, Search, Loader2, Zap } from 'lucide-react'
import { API_BASE_URL, fetchWithRetry, readStaleCache, writeStaleCache } from '@/lib/api'

const EXPLORE_CACHE_KEY = 'explore:categories:v1'

interface Category {
  id: string
  slug: string
  name: string
  vertical: string
  display_vertical?: string | null
  industry_vertical?: string | null
  locale: string
  depth_tier?: string | null
  topic_count: number
  brand_count: number
  citation_count: number
  ai_traffic_mo: number | null
  est_revenue_mo: number | null
  last_scanned_at: string | null
  source?: string | null
}

const VERTICAL_ORDER = [
  'Consumer Electronics & Audio',
  'Computers, Gaming & Office Tech',
  'Smart Home & Security',
  'Home & Living',
  'Kitchen & Home Appliances',
  'Beauty & Personal Care',
  'Health, Wellness & Baby',
  'Fitness, Sports & Outdoor',
  'Fashion, Apparel & Accessories',
  'Pet Care',
  'Tools, Auto & Industrial',
  'Power, Energy & Outdoor Tech',
  'SaaS & Digital Tools',
]

const VERTICAL_ICON: Record<string, string> = {
  'Consumer Electronics & Audio':    '🎧',
  'Computers, Gaming & Office Tech': '🖥️',
  'Smart Home & Security':           '🏠',
  'Home & Living':                   '🛋️',
  'Kitchen & Home Appliances':       '🍳',
  'Beauty & Personal Care':          '💄',
  'Health, Wellness & Baby':         '💊',
  'Fitness, Sports & Outdoor':       '🏃',
  'Fashion, Apparel & Accessories':  '👟',
  'Pet Care':                        '🐾',
  'Tools, Auto & Industrial':        '🧰',
  'Power, Energy & Outdoor Tech':    '⚡',
  'SaaS & Digital Tools':            '💻',
}

const BASE_VISIBLE_CATEGORY_SLUGS = new Set([
  'bluetooth-speakers',
  'laptops',
  'mechanical-keyboards',
  'wireless-earbuds',
  'security-cameras',
  'electric-toothbrushes',
  'skincare-serums',
  'mattresses',
  'protein-powder',
  'e-bikes',
  'running-shoes',
  'luggage',
  'sunglasses',
  'office-chairs',
  'standing-desks',
  'crm-software',
])

function isVisibleCategory(cat: Category): boolean {
  return Boolean(cat.slug && cat.name) && (
    BASE_VISIBLE_CATEGORY_SLUGS.has(cat.slug)
    || cat.source === 'alignment_clean_public'
    || cat.depth_tier === 'public'
    || Boolean(cat.last_scanned_at)
  )
}

function displayVertical(cat: Category): string {
  return cat.display_vertical || cat.industry_vertical || cat.vertical || 'Other'
}

function fmt(n: number | null): string {
  if (!n) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

function CategoryCard({ cat }: { cat: Category }) {
  const scanned = !!cat.last_scanned_at
  return (
    <Link
      href={`/dashboard/explore/${cat.slug}`}
      className="group block bg-surface rounded-2xl border border-divider-light hover:border-ink-2 hover:shadow-md transition-all duration-200 overflow-hidden"
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-[14px] font-bold text-ink group-hover:text-ink transition-colors leading-tight">
            {cat.name}
          </h3>
          {scanned ? (
            <span className="flex-shrink-0 text-[9px] font-bold px-2 py-0.5 bg-sage-bg text-sage border border-sage/20 rounded-full ml-2">
              Live
            </span>
          ) : (
            <span className="flex-shrink-0 text-[9px] font-bold px-2 py-0.5 bg-surface-muted text-ink-3 border border-divider-light rounded-full ml-2">
              Ready
            </span>
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 text-[11px] text-ink-3 mb-4">
          <span>{cat.topic_count} topics</span>
          <span className="w-px h-3 bg-divider-light" />
          {scanned
            ? <span className="text-ink-2 font-medium">{cat.brand_count} brands tracked</span>
            : <span>—</span>
          }
        </div>

        {/* AI Traffic + Revenue (B-layer) */}
        {(cat.ai_traffic_mo || cat.est_revenue_mo) && (
          <div className="flex items-center gap-4 pt-3 border-t border-divider-light">
            {cat.ai_traffic_mo && (
              <div>
                <div className="text-[11px] font-bold text-ink">{fmt(cat.ai_traffic_mo)}</div>
                <div className="text-[9px] text-ink-3 uppercase tracking-wide">AI queries/mo</div>
              </div>
            )}
            {cat.est_revenue_mo && (
              <div>
                <div className="text-[11px] font-bold text-caution">${fmt(cat.est_revenue_mo)}</div>
                <div className="text-[9px] text-ink-3 uppercase tracking-wide">Est. AI revenue</div>
              </div>
            )}
          </div>
        )}

        {/* Scan CTA */}
        {!scanned && (
          <div className="mt-3 pt-3 border-t border-divider-light">
            <span className="text-[11px] text-ink-3 flex items-center gap-1.5">
              <Zap className="w-3 h-3" />
              Click to scan this category
            </span>
          </div>
        )}
      </div>
    </Link>
  )
}

export default function ExplorePage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeVertical, setActiveVertical] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    // Stale-while-revalidate: paint the last good categories immediately so a
    // backend redeploy / cold start never shows a blank page. We still refresh
    // in the background below.
    const cached = readStaleCache<Category[]>(EXPLORE_CACHE_KEY)
    if (cached?.data?.length) {
      setCategories(cached.data)
      setLoading(false)
    }

    // budgetMs 45s rides out a Railway cold-start window (Python boot ~30–90s);
    // fetchWithRetry already backs off and retries 502/503/504 + network errors.
    fetchWithRetry(`${API_BASE_URL}/api/explore/categories`, {}, { timeoutMs: 8000, budgetMs: 45000 })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(d => {
        if (cancelled) return
        const cats: Category[] = d?.categories || []
        if (cats.length) {
          setCategories(cats)
          writeStaleCache(EXPLORE_CACHE_KEY, cats)
        }
        setError(null)
      })
      .catch(() => {
        if (cancelled) return
        // Keep showing stale data if we have any; only hard-error when there's
        // genuinely nothing to show (first visit + backend down).
        const fallback = readStaleCache<Category[]>(EXPLORE_CACHE_KEY)
        if (fallback?.data?.length) {
          setCategories(fallback.data)
          setError(null)
        } else {
          setCategories([])
          setError('Explore data is temporarily unavailable. Please retry in a moment.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const displayCategories = categories.filter(isVisibleCategory)

  const filtered = displayCategories.filter(c => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase())
    const matchVertical = !activeVertical || displayVertical(c) === activeVertical
    return matchSearch && matchVertical
  })

  // Group by vertical
  const grouped: Record<string, Category[]> = {}
  for (const cat of filtered) {
    const vertical = displayVertical(cat)
    if (!grouped[vertical]) grouped[vertical] = []
    grouped[vertical].push(cat)
  }

  const verticals = [
    ...VERTICAL_ORDER.filter(v => grouped[v]?.length),
    ...Object.keys(grouped).filter(v => !VERTICAL_ORDER.includes(v)).sort(),
  ]

  const totalScanned = displayCategories.filter(c => c.last_scanned_at).length

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <div className="bg-surface border-b border-divider-light px-8 py-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-sage-bg flex items-center justify-center">
            <Compass className="w-5 h-5 text-sage" />
          </div>
          <div>
            <h1 className="heading-dash">Explore</h1>
            <p className="text-sm text-ink-3">
              Browse AI market intelligence — categories, brands, and citation sources tracked across AI search
            </p>
          </div>
        </div>

        {/* Summary stats */}
        <div className="flex items-center gap-6 text-[12px] text-ink-3">
          <span><strong className="text-ink">{displayCategories.length}</strong> categories</span>
          <span><strong className="text-ink">{displayCategories.reduce((a, c) => a + c.topic_count, 0)}</strong> topics</span>
          <span><strong className="text-ink">{totalScanned}</strong> scanned</span>
          {totalScanned < displayCategories.length && (
            <span className="text-caution font-medium">
              {displayCategories.length - totalScanned} categories pending first scan
            </span>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Search + vertical filter */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-3" />
            <input
              type="search"
              data-search-input="true"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search categories…"
              className="w-full pl-9 pr-3 py-2 text-[13px] bg-surface border border-divider rounded-xl focus:outline-none focus:border-ink-2 transition-colors"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveVertical(null)}
              className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all ${
                !activeVertical ? 'bg-ink text-ink-inv border-ink' : 'bg-surface text-ink-3 border-divider hover:border-ink-2'
              }`}
            >
              All
            </button>
            {[
              ...VERTICAL_ORDER.filter(v => categories.some(c => displayVertical(c) === v)),
              ...Array.from(new Set(categories.map(c => displayVertical(c)).filter(Boolean)))
                .filter(v => !VERTICAL_ORDER.includes(v))
                .sort(),
            ].map(v => (
              <button
                key={v}
                onClick={() => setActiveVertical(v === activeVertical ? null : v)}
                className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all ${
                  activeVertical === v ? 'bg-ink text-ink-inv border-ink' : 'bg-surface text-ink-3 border-divider hover:border-ink-2'
                }`}
              >
                {VERTICAL_ICON[v]} {v.split(' & ')[0].split(',')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-ink-3" />
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-divider-light bg-surface px-6 py-14 text-center">
            <AlertCircle className="h-8 w-8 text-caution" />
            <p className="text-sm font-semibold text-ink">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-xl bg-ink px-4 py-2 text-[12px] font-semibold text-ink-inv transition-colors hover:bg-ink/80"
            >
              Retry
            </button>
          </div>
        )}

        {/* Category grid by vertical */}
        {!loading && !error && verticals.length === 0 && (
          <div className="text-center py-16 text-ink-3">
            <Compass className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No categories found.</p>
          </div>
        )}

        {!loading && !error && verticals.map(vertical => (
          <div key={vertical}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{VERTICAL_ICON[vertical] || '🧭'}</span>
              <h2 className="text-[13px] font-bold text-ink">{vertical}</h2>
              <span className="text-[11px] text-ink-3">({grouped[vertical].length})</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {grouped[vertical].map(cat => (
                <CategoryCard key={cat.slug} cat={cat} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
