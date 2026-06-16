'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Layers,
  Loader2,
  PackageSearch,
  Search,
  ShoppingCart,
  Sparkles,
  Star,
} from 'lucide-react'
import { API_BASE_URL, fetchWithRetry } from '@/lib/api'


interface ShoppingEntity {
  id: string
  type: 'brand' | 'channel'
  name: string
  domain: string
  logo_url: string
  official_url?: string
}

interface ProductSpace {
  id: string
  slug: string
  name: string
  vertical: string
  locale: string
  engine: string
  topic_count: number
  prompt_count: number
  product_count: number
  offer_fact_count: number
  last_scanned_at: string | null
}

interface ShoppingProduct {
  id: string
  slug: string
  name: string
  product_url: string
  image_url: string
  fallback_image_url?: string | null
  price_usd: number
  currency: string
  rating?: number | null
  review_count?: number | null
  channel_type: string
  ai_rank: number
  appearances: number
  topic_count: number
  prompt_examples: string[]
  tags: string[]
  brand: ShoppingEntity
  channel: ShoppingEntity
  data_quality_score: number
  source_checked_at?: string | null
}

interface ChannelStat {
  rank: number
  appearance_count: number
  product_count: number
  share_pct: number
  channel: ShoppingEntity
}

interface PriceBand {
  label: string
  min_price_usd: number | null
  max_price_usd: number | null
  product_count: number
  appearance_count: number
  share_pct: number
}

interface ShoppingResponse {
  product_space: ProductSpace
  products: ShoppingProduct[]
  channel_stats: ChannelStat[]
  price_bands: PriceBand[]
  pagination?: {
    limit: number
    offset: number
    total: number
    returned: number
    has_next: boolean
    has_previous: boolean
  }
  quality: {
    cleaning_rules: string[]
    returned_products: number
  }
}

function formatMoney(value: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value)
}

function formatDate(value?: string | null) {
  if (!value) return 'Not scanned'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

function logoFallback(domain: string) {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
}

function ProductSpacePicker({
  spaces,
  activeSlug,
  onChange,
}: {
  spaces: ProductSpace[]
  activeSlug: string
  onChange: (slug: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const active = spaces.find((space) => space.slug === activeSlug)
  const filtered = spaces.filter((space) => (
    !query.trim() || space.name.toLowerCase().includes(query.trim().toLowerCase())
  ))

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-10 min-w-[150px] items-center justify-between gap-3 rounded-full border border-divider bg-surface px-4 text-[13px] font-bold text-ink shadow-elevation-sm transition-colors hover:border-ink-3 focus:outline-none focus:border-ink-3"
      >
        <span className="inline-flex min-w-0 items-center gap-2">
          <Layers className="h-4 w-4 shrink-0 text-ink-3" />
          <span className="truncate">{active?.name ?? 'Categories'}</span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-ink-3" />
      </button>

      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-[360px] overflow-hidden rounded-lg border border-divider-light bg-surface shadow-elevation-lg">
          <div className="relative border-b border-divider-light">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              autoFocus
              placeholder="Search categories"
              className="h-11 w-full bg-surface pl-9 pr-3 text-[13px] text-ink focus:outline-none"
            />
          </div>
          <div className="max-h-[330px] overflow-y-auto p-1.5">
            {filtered.length ? filtered.map((space) => (
              <button
                key={space.slug}
                type="button"
                onClick={() => {
                  onChange(space.slug)
                  setQuery('')
                  setOpen(false)
                }}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors ${
                  space.slug === activeSlug ? 'bg-surface-warm text-ink' : 'hover:bg-surface-warm/70'
                }`}
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                  {space.slug === activeSlug ? <Check className="h-4 w-4 text-ink" /> : null}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-bold text-ink">{space.name}</span>
                  <span className="mt-0.5 block truncate text-[12px] text-ink-3">
                    {space.topic_count} topics · {space.product_count.toLocaleString()} products
                  </span>
                </span>
              </button>
            )) : (
              <div className="px-4 py-8 text-center text-[13px] font-semibold text-ink-3">No categories found.</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function EntityBadge({ entity, compact = false }: { entity: ShoppingEntity; compact?: boolean }) {
  const [src, setSrc] = useState(entity.logo_url)

  useEffect(() => {
    setSrc(entity.logo_url)
  }, [entity.logo_url])

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border border-divider-light bg-surface px-2.5 py-1 text-[11px] font-semibold text-ink-2 ${compact ? 'max-w-[150px]' : ''}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`${entity.name} logo`}
        className="h-4 w-4 rounded-full object-contain bg-white"
        onError={() => {
          if (src !== logoFallback(entity.domain)) setSrc(logoFallback(entity.domain))
        }}
      />
      <span className={compact ? 'truncate' : ''}>{entity.name}</span>
    </span>
  )
}

function ProductImage({ product }: { product: ShoppingProduct }) {
  const [src, setSrc] = useState(product.image_url)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setSrc(product.image_url)
    setFailed(false)
  }, [product.image_url])

  if (failed) return null

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={product.name}
      className="max-h-full max-w-full object-contain"
      onError={() => {
        if (product.fallback_image_url && src !== product.fallback_image_url) {
          setSrc(product.fallback_image_url)
        } else {
          setFailed(true)
        }
      }}
    />
  )
}

function ProductCard({
  product,
  selected,
  onSelect,
}: {
  product: ShoppingProduct
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group flex min-h-[398px] flex-col overflow-hidden rounded-lg border bg-surface text-left transition-all hover:-translate-y-0.5 hover:border-ink-3 hover:shadow-elevation-md ${
        selected ? 'border-ink-3 shadow-elevation-md' : 'border-divider-light'
      }`}
    >
      <div className="flex h-[205px] items-center justify-center bg-[#fbfaf7] p-6">
        <ProductImage product={product} />
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 className="min-h-[42px] text-[14px] font-bold leading-snug text-ink">{product.name}</h3>
          <span className="shrink-0 rounded-full bg-ink px-2 py-1 text-[10px] font-bold text-ink-inv">#{product.ai_rank}</span>
        </div>

        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="text-[22px] font-black text-ink">{formatMoney(product.price_usd, product.currency)}</div>
          {product.rating ? (
            <div className="inline-flex items-center gap-1 text-[12px] font-semibold text-caution">
              <Star className="h-3.5 w-3.5 fill-current" />
              {product.rating.toFixed(1)}
              {product.review_count ? <span className="text-ink-3">· {product.review_count}</span> : null}
            </div>
          ) : null}
        </div>

        <div className="mb-4 flex flex-wrap gap-1.5">
          <EntityBadge entity={product.brand} compact />
          <EntityBadge entity={product.channel} compact />
        </div>

        <div className="mt-auto flex items-center justify-between text-[12px] text-ink-3">
          <span>{product.topic_count} topics · {product.appearances} appearances</span>
          <span>Q{product.data_quality_score}</span>
        </div>
      </div>
    </button>
  )
}

function BarRow({
  label,
  value,
  max,
  tone = 'ink',
  left,
}: {
  label: string
  value: number
  max: number
  tone?: 'ink' | 'sage'
  left?: ReactNode
}) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0
  return (
    <div className="grid grid-cols-[minmax(120px,190px)_1fr_54px] items-center gap-3 text-[12px]">
      <div className="min-w-0">
        {left ?? <span className="truncate font-semibold text-ink">{label}</span>}
      </div>
      <div className="h-2 rounded-full bg-surface-muted/70">
        <div
          className={`h-full rounded-full ${tone === 'sage' ? 'bg-sage' : 'bg-ink'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-right font-semibold text-ink-3">{value.toFixed(value % 1 === 0 ? 0 : 1)}%</div>
    </div>
  )
}

export default function ShoppingPage() {
  const pageSize = 24
  const [spaces, setSpaces] = useState<ProductSpace[]>([])
  const [activeSlug, setActiveSlug] = useState('')
  const [data, setData] = useState<ShoppingResponse | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchWithRetry(`${API_BASE_URL}/api/shopping/product-spaces`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((payload) => {
        const loaded = payload.product_spaces ?? []
        setSpaces(loaded)
        if (loaded.length && (!activeSlug || !loaded.some((space: ProductSpace) => space.slug === activeSlug))) {
          setActiveSlug(loaded[0].slug)
        }
      })
      .catch(() => setSpaces([]))
  }, [activeSlug])

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      if (!activeSlug) return
      setLoading(true)
      setError(null)
      const params = new URLSearchParams({
        limit: String(pageSize),
        offset: String((page - 1) * pageSize),
      })
      if (search.trim()) params.set('search', search.trim())

      fetchWithRetry(`${API_BASE_URL}/api/shopping/product-spaces/${activeSlug}?${params.toString()}`, {
        signal: controller.signal,
      })
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`)
          return r.json()
        })
        .then((payload: ShoppingResponse) => {
          setData(payload)
          setSelectedId(payload.products[0]?.id ?? null)
        })
        .catch((err) => {
          if (err instanceof DOMException && err.name === 'AbortError') return
          setError('Shopping data is not available yet. Please try again after the warehouse sync finishes.')
          setData(null)
          setSelectedId(null)
        })
        .finally(() => setLoading(false))
    }, 180)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [activeSlug, search, page])

  const selected = useMemo(() => {
    if (!data?.products.length) return null
    return data.products.find((product) => product.id === selectedId) ?? data.products[0]
  }, [data, selectedId])

  const maxChannelShare = Math.max(...(data?.channel_stats.map((row) => row.share_pct) ?? [0]))
  const maxBandShare = Math.max(...(data?.price_bands.map((row) => row.share_pct) ?? [0]))
  const pagination = data?.pagination
  const totalProducts = pagination?.total ?? data?.product_space.product_count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalProducts / pageSize))
  const pageStart = totalProducts > 0 ? (page - 1) * pageSize + 1 : 0
  const pageEnd = pagination ? Math.min(pagination.offset + pagination.returned, totalProducts) : Math.min(page * pageSize, totalProducts)

  return (
    <div className="min-h-screen bg-canvas">
      <div className="border-b border-divider-light bg-surface px-6 py-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-warm">
              <ShoppingCart className="h-5 w-5 text-ink" />
            </div>
            <div>
              <h1 className="heading-dash">Shopping</h1>
              <p className="max-w-4xl text-sm text-ink-3">
                AI-recommended products grouped by category, persisted in the Alignment warehouse after quality cleaning.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ProductSpacePicker
              spaces={spaces}
              activeSlug={activeSlug}
              onChange={(slug) => {
                setActiveSlug(slug)
                setSearch('')
                setPage(1)
              }}
            />
            <span className="rounded-full border border-divider-light bg-surface px-4 py-2 text-[13px] font-bold">US · en</span>
            <span className="rounded-full border border-divider-light bg-surface px-4 py-2 text-[13px] font-bold">GPT-4.1 + Web</span>
            <span className="inline-flex items-center gap-2 rounded-full border border-divider-light bg-surface px-4 py-2 text-[13px] font-bold">
              <CalendarDays className="h-4 w-4" />
              Last 30 days
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-6">
        {data?.product_space ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-divider-light bg-surface p-4">
              <div className="text-[11px] font-black uppercase text-ink-3">Category</div>
              <div className="mt-2 text-2xl font-black text-ink">{data.product_space.name}</div>
            </div>
            <div className="rounded-lg border border-divider-light bg-surface p-4">
              <div className="text-[11px] font-black uppercase text-ink-3">Shopping prompts</div>
              <div className="mt-2 text-2xl font-black text-ink">{data.product_space.prompt_count}</div>
            </div>
            <div className="rounded-lg border border-divider-light bg-surface p-4">
              <div className="text-[11px] font-black uppercase text-ink-3">Products surfaced</div>
              <div className="mt-2 text-2xl font-black text-ink">{data.product_space.product_count.toLocaleString()}</div>
            </div>
            <div className="rounded-lg border border-divider-light bg-surface p-4">
              <div className="text-[11px] font-black uppercase text-ink-3">Offer facts</div>
              <div className="mt-2 text-2xl font-black text-ink">{data.product_space.offer_fact_count.toLocaleString()}</div>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="overflow-hidden rounded-lg border border-divider-light bg-surface shadow-elevation-sm">
            <div className="flex flex-col gap-3 border-b border-divider-light p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-[16px] font-black text-ink">Product cards</h2>
                <p className="mt-1 text-[13px] text-ink-3">Ranked by AI shopping appearances across topics.</p>
              </div>
              <div className="relative w-full lg:w-[300px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value)
                    setPage(1)
                  }}
                  placeholder="Search products"
                  className="h-10 w-full rounded-lg border border-divider-light bg-surface pl-9 pr-3 text-[13px] focus:outline-none focus:border-ink-3"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex min-h-[420px] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-ink-3" />
              </div>
            ) : error ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 p-8 text-center">
                <PackageSearch className="h-8 w-8 text-ink-3" />
                <p className="max-w-md text-sm font-semibold text-ink-3">{error}</p>
              </div>
            ) : data?.products.length ? (
              <div>
                <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-2 2xl:grid-cols-3">
                  {data.products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      selected={product.id === selected?.id}
                      onSelect={() => setSelectedId(product.id)}
                    />
                  ))}
                </div>
                <div className="flex flex-col gap-3 border-t border-divider-light px-5 py-4 md:flex-row md:items-center md:justify-between">
                  <div className="text-[13px] font-semibold text-ink-3">
                    Showing {pageStart.toLocaleString()}-{pageEnd.toLocaleString()} of {totalProducts.toLocaleString()} products
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={loading || page <= 1}
                      onClick={() => setPage((value) => Math.max(1, value - 1))}
                      className="inline-flex h-10 items-center gap-2 rounded-lg border border-divider-light bg-surface px-3 text-[13px] font-bold text-ink transition-colors hover:border-ink-3 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </button>
                    <span className="min-w-[92px] text-center text-[13px] font-bold text-ink">
                      Page {page} / {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={loading || page >= totalPages || pagination?.has_next === false}
                      onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                      className="inline-flex h-10 items-center gap-2 rounded-lg border border-divider-light bg-surface px-3 text-[13px] font-bold text-ink transition-colors hover:border-ink-3 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[420px] items-center justify-center p-8 text-sm font-semibold text-ink-3">
                No cleaned products match this search.
              </div>
            )}
          </section>

          <aside className="h-fit rounded-lg border border-divider-light bg-surface shadow-elevation-sm xl:sticky xl:top-20">
            <div className="border-b border-divider-light p-5">
              <h2 className="text-[16px] font-black text-ink">Product drilldown</h2>
              <p className="mt-1 text-[13px] text-ink-3">Why this product appears in AI shopping answers.</p>
            </div>

            {selected ? (
              <div className="space-y-5 p-5">
                <div className="grid grid-cols-[96px_1fr] gap-4">
                  <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-divider-light bg-[#fbfaf7] p-2">
                    <ProductImage product={selected} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[18px] font-black leading-tight text-ink">{selected.name}</h3>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <EntityBadge entity={selected.brand} compact />
                      <EntityBadge entity={selected.channel} compact />
                    </div>
                    <a
                      href={selected.product_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-1 text-[12px] font-bold text-ink underline underline-offset-4"
                    >
                      Source page <ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>

                <div className="grid gap-2 border-y border-divider-light py-3">
                  <div className="flex items-center justify-between text-[13px]"><span className="text-ink-3">AI shopping rank</span><strong>#{selected.ai_rank}</strong></div>
                  <div className="flex items-center justify-between text-[13px]"><span className="text-ink-3">Listed price</span><strong>{formatMoney(selected.price_usd, selected.currency)}</strong></div>
                  <div className="flex items-center justify-between text-[13px]"><span className="text-ink-3">Appearances</span><strong>{selected.appearances}</strong></div>
                  <div className="flex items-center justify-between text-[13px]"><span className="text-ink-3">Topic coverage</span><strong>{selected.topic_count}</strong></div>
                  <div className="flex items-center justify-between text-[13px]"><span className="text-ink-3">Quality gate</span><strong>{selected.data_quality_score}/100</strong></div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[13px] font-black text-ink">
                    <Sparkles className="h-4 w-4" />
                    Prompt evidence
                  </div>
                  {selected.prompt_examples.map((prompt, index) => (
                    <div key={prompt} className="rounded-lg border border-divider-light bg-[#fbfaf7] p-3">
                      <div className="mb-1 text-[11px] font-black uppercase text-ink">Prompt {index + 1}</div>
                      <div className="text-[13px] leading-relaxed text-ink-3">{prompt}</div>
                    </div>
                  ))}
                </div>

                <p className="text-[12px] text-ink-3">Source checked {formatDate(selected.source_checked_at)}</p>
              </div>
            ) : (
              <div className="p-5 text-sm font-semibold text-ink-3">Select a product to inspect.</div>
            )}
          </aside>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <section className="rounded-lg border border-divider-light bg-surface shadow-elevation-sm">
            <div className="border-b border-divider-light p-5">
              <h2 className="text-[16px] font-black text-ink">Top retail channels</h2>
              <p className="mt-1 text-[13px] text-ink-3">Official logo + name for every surfaced channel.</p>
            </div>
            <div className="space-y-4 p-5">
              {(data?.channel_stats ?? []).map((row) => (
                <BarRow
                  key={row.channel.id}
                  label={row.channel.name}
                  value={row.share_pct}
                  max={maxChannelShare}
                  left={<EntityBadge entity={row.channel} />}
                />
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-divider-light bg-surface shadow-elevation-sm">
            <div className="border-b border-divider-light p-5">
              <h2 className="text-[16px] font-black text-ink">Price bands</h2>
              <p className="mt-1 text-[13px] text-ink-3">Distribution of AI-recommended products by listed price.</p>
            </div>
            <div className="space-y-4 p-5">
              {(data?.price_bands ?? []).map((row) => (
                <BarRow key={row.label} label={row.label} value={row.share_pct} max={maxBandShare} tone="sage" />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
