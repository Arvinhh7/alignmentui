'use client'

import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import {
  ArrowUpRight,
  CalendarDays,
  Database,
  Globe,
  Image as ImageIcon,
  Layers3,
  LibraryBig,
  Loader2,
  Megaphone,
  Search,
  ShieldCheck,
  Target,
} from 'lucide-react'
import { API_BASE_URL, fetchWithRetry } from '@/lib/api'


interface Entity {
  id: string
  type: 'advertiser' | 'platform' | 'channel'
  name: string
  domain: string
  logo_url: string
  official_url?: string
}

interface CreativeAsset {
  id: string
  image_url: string
  source_image_url?: string
  cached_image_url?: string
  mime_type: string
  width_px: number
  height_px: number
}

interface CardContext {
  id: string
  observed_query: string
  query_topic: string
  country_code: string
  language_code: string
  model_name: string
  observed_at?: string | null
  platform: Entity
  channel?: Entity
}

interface ObservedCard {
  id: string
  advertiser: Entity
  creative_asset: CreativeAsset
  title: string
  description: string
  destination_url: string
  appearance_count: number
  first_seen_at?: string | null
  last_seen_at?: string | null
  contexts: CardContext[]
}

interface LeaderboardRow {
  advertiser: Entity
  observed_card_count: number
  total_appearances: number
  latest_observed_at?: string | null
}

interface AdsSpace {
  id: string
  slug: string
  name: string
  locale: string
  platform: string
  model: string
  query_topic: string
  advertiser_count: number
  observed_card_count: number
  total_appearances: number
  last_observed_at?: string | null
  source_mode: string
  fixture?: boolean
}

interface AdsResponse {
  ads_space: AdsSpace
  advertiser_leaderboard: LeaderboardRow[]
  observed_cards: ObservedCard[]
  quality: {
    fixture: boolean
    cards_returned: number
    hidden_cards_missing_images: number
    data_source: string
    cleaning_rules: string[]
  }
}

function formatDate(value?: string | null) {
  if (!value) return 'Not observed yet'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value)
}

function domainFromUrl(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, '')
  } catch {
    return value.replace(/^https?:\/\//, '').split('/')[0] || value
  }
}

function uniq(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

function cardQueryCount(card: ObservedCard) {
  return uniq(card.contexts.map((context) => context.observed_query.trim().toLowerCase())).length
}

function cardTopicCount(card: ObservedCard) {
  return uniq(card.contexts.map((context) => context.query_topic.trim().toLowerCase())).length
}

function cardTopicLabels(card: ObservedCard) {
  return uniq(card.contexts.map((context) => context.query_topic)).slice(0, 3)
}

function EntityChip({ entity }: { entity: Entity }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[#d8cfbf] bg-white/90 px-2.5 py-1 text-[11px] font-bold text-ink-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={entity.logo_url} alt={`${entity.name} logo`} className="h-4 w-4 rounded-full bg-white object-contain" />
      <span>{entity.name}</span>
    </span>
  )
}

interface AdvertiserSummary {
  advertiser: Entity
  cards: ObservedCard[]
  previewCard: ObservedCard
  totalAppearances: number
  topics: string[]
  queries: string[]
  latestSeen?: string | null
}

function MetricCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  accent: string
}) {
  const Icon = icon
  return (
    <div className="rounded-[24px] border border-[#d9cfbd] bg-[#fffdf8] p-4 shadow-[0_18px_42px_rgba(58,40,18,0.07)]">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] font-black uppercase tracking-[0.18em] text-ink-3">{label}</div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: accent }}>
          <Icon className="h-4 w-4 text-ink" />
        </div>
      </div>
      <div className="mt-3 text-[30px] font-black leading-none text-ink">{value}</div>
    </div>
  )
}

function AdvertiserRail({
  rows,
  selectedAdvertiserId,
  onSelect,
}: {
  rows: LeaderboardRow[]
  selectedAdvertiserId: string | null
  onSelect: (advertiserId: string) => void
}) {
  return (
    <section className="rounded-[28px] border border-[#d9cfbd] bg-[#fffdf8] shadow-[0_24px_60px_rgba(59,42,18,0.08)]">
      <div className="border-b border-[#e1d5c4] p-5">
        <div className="text-[11px] font-black uppercase tracking-[0.18em] text-ink-3">Advertiser library</div>
        <h2 className="mt-2 text-[18px] font-black text-ink">Observed advertisers</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-3">
          Each advertiser is ranked by accepted card appearances inside the selected query space.
        </p>
      </div>
      <div className="space-y-3 p-4">
        {rows.map((row) => {
          const selected = row.advertiser.id === selectedAdvertiserId
          return (
            <button
              key={row.advertiser.id}
              type="button"
              onClick={() => onSelect(row.advertiser.id)}
              className={`w-full rounded-[22px] border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(59,42,18,0.09)] ${
                selected ? 'border-ink bg-[#f5ecda]' : 'border-[#e3d9c9] bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <EntityChip entity={row.advertiser} />
                  <div className="mt-3 text-[15px] font-black text-ink">{row.advertiser.name}</div>
                  <div className="mt-1 text-[12px] text-ink-3">{row.advertiser.domain}</div>
                </div>
                <div className="rounded-full border border-[#d9cfbd] bg-white px-3 py-1 text-[11px] font-black text-ink-3">
                  {formatNumber(row.total_appearances)}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-[12px]">
                <div className="rounded-2xl bg-[#fbf5ea] p-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.15em] text-ink-3">Cards</div>
                  <div className="mt-1 text-[16px] font-black text-ink">{row.observed_card_count}</div>
                </div>
                <div className="rounded-2xl bg-[#fbf5ea] p-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.15em] text-ink-3">Latest seen</div>
                  <div className="mt-1 text-[12px] font-black text-ink">{formatDate(row.latest_observed_at)}</div>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function AdvertiserCardTile({
  summary,
  rank,
  selected,
  onSelect,
  onBadImage,
}: {
  summary: AdvertiserSummary
  rank: number
  selected: boolean
  onSelect: () => void
  onBadImage: (id: string) => void
}) {
  const card = summary.previewCard
  const queryCount = cardQueryCount(card)
  const topicCount = cardTopicCount(card)
  const destinationDomain = domainFromUrl(card.destination_url)
  const topics = summary.topics.slice(0, 3)

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`overflow-hidden rounded-[24px] border bg-[#fffdf8] text-left transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(57,40,16,0.10)] ${
        selected ? 'border-ink shadow-[0_18px_42px_rgba(57,40,16,0.12)]' : 'border-[#ddd2c0]'
      }`}
    >
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={card.creative_asset.image_url}
          alt={card.title}
          className="h-56 w-full bg-[#f3ecdf] object-cover"
          onError={() => onBadImage(card.id)}
          onLoad={(event) => {
            const img = event.currentTarget
            if (!img.naturalWidth || !img.naturalHeight) onBadImage(card.id)
          }}
        />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 bg-[linear-gradient(180deg,rgba(33,24,16,0.66)_0%,rgba(33,24,16,0)_100%)] p-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-black/35 px-3 py-1 text-[11px] font-black text-white">
            #{rank} <span className="opacity-70">·</span> {summary.totalAppearances} cards seen
          </span>
          {summary.cards.length > 1 ? (
            <span className="rounded-full border border-white/35 bg-white/90 px-2.5 py-1 text-[11px] font-black text-ink">×{summary.cards.length}</span>
          ) : null}
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <EntityChip entity={summary.advertiser} />
            <div className="mt-2 text-[12px] text-ink-3">{summary.advertiser.domain}</div>
          </div>
          <div className="rounded-full border border-[#ddd2c1] bg-white px-3 py-1 text-[11px] font-black text-ink-3">{destinationDomain}</div>
        </div>
        <div>
          <h3 className="text-[16px] font-black leading-tight text-ink">{card.title}</h3>
          <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-ink-3">{card.description}</p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-[12px]">
          <div className="rounded-2xl bg-[#f7f1e4] p-3">
            <div className="text-[10px] font-black uppercase tracking-[0.15em] text-ink-3">Appearances</div>
            <div className="mt-1 text-[16px] font-black text-ink">{formatNumber(card.appearance_count)}</div>
          </div>
          <div className="rounded-2xl bg-[#f7f1e4] p-3">
            <div className="text-[10px] font-black uppercase tracking-[0.15em] text-ink-3">Queries</div>
            <div className="mt-1 text-[16px] font-black text-ink">{summary.queries.length || queryCount}</div>
          </div>
          <div className="rounded-2xl bg-[#f7f1e4] p-3">
            <div className="text-[10px] font-black uppercase tracking-[0.15em] text-ink-3">Topics</div>
            <div className="mt-1 text-[16px] font-black text-ink">{summary.topics.length || topicCount}</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {topics.map((topic) => (
            <span key={topic} className="rounded-full border border-[#ddd2c1] bg-white px-3 py-1 text-[11px] font-bold text-ink-3">
              {topic}
            </span>
          ))}
        </div>
      </div>
    </button>
  )
}

export default function AdsPage() {
  const [spaces, setSpaces] = useState<AdsSpace[]>([])
  const [activeSlug, setActiveSlug] = useState('portable-power-stations')
  const [data, setData] = useState<AdsResponse | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedAdvertiserId, setSelectedAdvertiserId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const deferredSearch = useDeferredValue(search)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [badImageIds, setBadImageIds] = useState<string[]>([])

  useEffect(() => {
    fetchWithRetry(`${API_BASE_URL}/api/ads/spaces`)
      .then((r) => r.ok ? r.json() : null)
      .then((payload) => {
        const loaded = payload?.ads_spaces ?? []
        setSpaces(loaded)
        if (loaded.length && !loaded.some((space: AdsSpace) => space.slug === activeSlug)) {
          setActiveSlug(loaded[0].slug)
        }
      })
      .catch(() => setSpaces([]))
  }, [activeSlug])

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setLoading(true)
      setError(null)
      setBadImageIds([])
      const params = new URLSearchParams({ limit: '36' })
      if (deferredSearch.trim()) params.set('search', deferredSearch.trim())

      fetchWithRetry(`${API_BASE_URL}/api/ads/spaces/${activeSlug}?${params.toString()}`, { signal: controller.signal })
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`)
          return r.json()
        })
        .then((payload: AdsResponse) => {
          setData(payload)
          const firstCard = payload.observed_cards[0]
          setSelectedId((current) => payload.observed_cards.some((card) => card.id === current) ? current : (firstCard?.id ?? null))
          setSelectedAdvertiserId((current) => payload.observed_cards.some((card) => card.advertiser.id === current) ? current : (firstCard?.advertiser.id ?? null))
        })
        .catch((err) => {
          if (err instanceof DOMException && err.name === 'AbortError') return
          setError('Observed ads API is unavailable. No fallback fixture cards are rendered because this library only displays accepted observations.')
          setData(null)
          setSelectedId(null)
        })
        .finally(() => setLoading(false))
    }, 180)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [activeSlug, deferredSearch])

  const categoryOptions = useMemo(() => {
    const topics = uniq((data?.observed_cards ?? []).flatMap((card) => card.contexts.map((context) => context.query_topic)))
    return ['all', ...topics]
  }, [data?.observed_cards])

  const visibleCards = useMemo(() => {
    return (data?.observed_cards ?? []).filter((card) => {
      if (badImageIds.includes(card.id)) return false
      if (activeCategory === 'all') return true
      return card.contexts.some((context) => context.query_topic === activeCategory)
    })
  }, [activeCategory, badImageIds, data?.observed_cards])

  const advertiserSummaries = useMemo<AdvertiserSummary[]>(() => {
    const byAdvertiser = new Map<string, ObservedCard[]>()
    for (const card of visibleCards) {
      const current = byAdvertiser.get(card.advertiser.id) ?? []
      current.push(card)
      byAdvertiser.set(card.advertiser.id, current)
    }
    return Array.from(byAdvertiser.values())
      .map((cards) => {
        const sortedCards = [...cards].sort((a, b) => b.appearance_count - a.appearance_count)
        const contexts = sortedCards.flatMap((card) => card.contexts)
        return {
          advertiser: sortedCards[0].advertiser,
          cards: sortedCards,
          previewCard: sortedCards[0],
          totalAppearances: sortedCards.reduce((sum, card) => sum + card.appearance_count, 0),
          topics: uniq(contexts.map((context) => context.query_topic)),
          queries: uniq(contexts.map((context) => context.observed_query)),
          latestSeen: sortedCards
            .map((card) => card.last_seen_at)
            .filter(Boolean)
            .sort()
            .at(-1),
        }
      })
      .sort((a, b) => b.totalAppearances - a.totalAppearances || a.advertiser.name.localeCompare(b.advertiser.name))
  }, [visibleCards])

  const effectiveSelectedAdvertiserId = selectedAdvertiserId && advertiserSummaries.some((summary) => summary.advertiser.id === selectedAdvertiserId)
    ? selectedAdvertiserId
    : advertiserSummaries[0]?.advertiser.id ?? null

  const selectedAdvertiser = useMemo(() => {
    return advertiserSummaries.find((summary) => summary.advertiser.id === effectiveSelectedAdvertiserId) ?? advertiserSummaries[0] ?? null
  }, [advertiserSummaries, effectiveSelectedAdvertiserId])

  const selectedAdvertiserCards = selectedAdvertiser?.cards ?? []

  const selected = useMemo(() => {
    if (!selectedAdvertiserCards.length) return null
    return selectedAdvertiserCards.find((card) => card.id === selectedId) ?? selectedAdvertiserCards[0]
  }, [selectedAdvertiserCards, selectedId])

  const filteredLeaderboard = useMemo(() => {
    const visibleAdvertiserIds = new Set(visibleCards.map((card) => card.advertiser.id))
    return (data?.advertiser_leaderboard ?? []).filter((row) => visibleAdvertiserIds.has(row.advertiser.id))
  }, [data?.advertiser_leaderboard, visibleCards])

  const visibleQueries = useMemo(() => {
    return uniq(visibleCards.flatMap((card) => card.contexts.map((context) => context.observed_query.toLowerCase())))
  }, [visibleCards])

  const visibleTopics = useMemo(() => {
    return uniq(visibleCards.flatMap((card) => card.contexts.map((context) => context.query_topic.toLowerCase())))
  }, [visibleCards])

  const observationSourceLabel = data?.quality.data_source === 'database' ? 'Database observations' : data?.quality.data_source === 'preview_cache' ? 'Preview cache from real ingest' : 'Accepted observations'

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f7eedf_0%,#f3efe7_36%,#efe7d8_68%,#f7f3eb_100%)]">
      <div className="border-b border-[#d8cfbf] bg-[linear-gradient(135deg,#fff8ea_0%,#f8f2e6_55%,#efe3cf_100%)] px-6 py-6">
        <div className="mx-auto max-w-[1480px]">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d9cfbd] bg-white/80 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-ink-3">
                <LibraryBig className="h-3.5 w-3.5" />
                AI ads library
              </div>
              <h1 className="mt-4 text-[40px] font-black leading-[0.95] text-ink md:text-[52px]">AI Ads</h1>
              <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-ink-3">
                ChatGPT ad cards observed across AI commerce surfaces. Search advertisers, switch product spaces, or filter observed topics to see who is buying attention in this market.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-[320px]">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search brand or ad title..."
                  className="h-11 w-full rounded-full border border-[#d8cfbf] bg-white pl-10 pr-4 text-[13px] focus:border-ink-3 focus:outline-none"
                />
              </div>
              <select
                value={activeSlug}
                onChange={(event) => {
                  setActiveSlug(event.target.value)
                  setSearch('')
                  setActiveCategory('all')
                }}
                className="h-11 min-w-[220px] rounded-full border border-[#d8cfbf] bg-white px-4 text-[13px] font-bold text-ink"
              >
                {spaces.map((space) => (
                  <option key={space.slug} value={space.slug}>{space.name}</option>
                ))}
              </select>
              <select
                value={activeCategory}
                onChange={(event) => setActiveCategory(event.target.value)}
                className="h-11 min-w-[180px] rounded-full border border-[#d8cfbf] bg-white px-4 text-[13px] font-bold text-ink"
              >
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>{category === 'all' ? 'All observed topics' : category}</option>
                ))}
              </select>
              <span className="rounded-full border border-[#d8cfbf] bg-white px-4 py-2 text-[13px] font-bold text-ink">{data?.ads_space.locale ?? 'US/en'}</span>
              <span className="rounded-full border border-[#d8cfbf] bg-white px-4 py-2 text-[13px] font-bold text-ink">{data?.ads_space.model ?? 'GPT-4.1'}</span>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#d8cfbf] bg-white px-4 py-2 text-[13px] font-bold text-ink">
                <CalendarDays className="h-4 w-4" />
                {formatDate(data?.ads_space.last_observed_at)}
              </span>
            </div>
          </div>

          {data?.ads_space ? (
            <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Advertisers" value={formatNumber(advertiserSummaries.length)} icon={Target} accent="#ead8b1" />
              <MetricCard label="Ad cards" value={formatNumber(visibleCards.length)} icon={ImageIcon} accent="#d8ebcf" />
              <MetricCard label="Observed queries" value={formatNumber(visibleQueries.length)} icon={Search} accent="#f4d8c2" />
              <MetricCard label="Observed topics" value={formatNumber(visibleTopics.length)} icon={Layers3} accent="#d8dff4" />
            </div>
          ) : null}
        </div>
      </div>

      <div className="mx-auto max-w-[1480px] space-y-5 p-6">
        <div className="rounded-[24px] border border-[#d8cfbf] bg-white/75 px-4 py-3 text-[13px] font-semibold text-ink-3 shadow-[0_16px_40px_rgba(59,42,18,0.06)]">
          {observationSourceLabel}. Showing {formatNumber(advertiserSummaries.length)} advertisers and {formatNumber(visibleCards.length)} accepted ad cards for {activeCategory === 'all' ? data?.ads_space.name ?? 'this product space' : `the observed topic "${activeCategory}"`}.
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[320px_minmax(0,1fr)_420px]">
          <AdvertiserRail
            rows={filteredLeaderboard}
            selectedAdvertiserId={effectiveSelectedAdvertiserId}
            onSelect={(advertiserId) => {
              const firstCard = visibleCards.find((card) => card.advertiser.id === advertiserId)
              if (firstCard) {
                setSelectedAdvertiserId(advertiserId)
                setSelectedId(firstCard.id)
              }
            }}
          />

          <section className="overflow-hidden rounded-[28px] border border-[#d9cfbd] bg-[#fffdf8] shadow-[0_24px_60px_rgba(59,42,18,0.08)]">
            <div className="flex flex-col gap-4 border-b border-[#e1d5c4] p-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-ink-3">Advertiser library</div>
                <h2 className="mt-2 text-[20px] font-black text-ink">Who is advertising here?</h2>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-3">
                  Ranked advertisers with official logos, destination domains, representative ad previews, card volume, and observed-topic coverage.
                </p>
              </div>
              <div className="w-full lg:w-[320px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search advertisers, titles, queries"
                    className="h-11 w-full rounded-full border border-[#d8cfbf] bg-white pl-10 pr-4 text-[13px] focus:border-ink-3 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex min-h-[520px] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-ink-3" />
              </div>
            ) : error ? (
              <div className="flex min-h-[520px] flex-col items-center justify-center gap-3 p-8 text-center">
                <Megaphone className="h-8 w-8 text-ink-3" />
                <p className="max-w-md text-sm font-semibold text-ink-3">{error}</p>
              </div>
            ) : advertiserSummaries.length ? (
              <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 2xl:grid-cols-3">
                {advertiserSummaries.map((summary, index) => (
                  <AdvertiserCardTile
                    key={summary.advertiser.id}
                    summary={summary}
                    rank={index + 1}
                    selected={summary.advertiser.id === effectiveSelectedAdvertiserId}
                    onSelect={() => {
                      setSelectedAdvertiserId(summary.advertiser.id)
                      setSelectedId(summary.previewCard.id)
                    }}
                    onBadImage={(id) => setBadImageIds((current) => current.includes(id) ? current : [...current, id])}
                  />
                ))}
              </div>
            ) : (
              <div className="flex min-h-[520px] items-center justify-center p-8 text-sm font-semibold text-ink-3">
                No advertisers are available for this observed topic or search.
              </div>
            )}
          </section>

          <aside className="h-fit rounded-[28px] border border-[#d9cfbd] bg-[#fffdf8] shadow-[0_24px_60px_rgba(59,42,18,0.08)] xl:sticky xl:top-20">
            <div className="border-b border-[#e1d5c4] p-5">
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-ink-3">Drilldown</div>
              <h2 className="mt-2 text-[20px] font-black text-ink">Advertiser detail</h2>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-3">
                All observed ad cards, destination pages, categories, and query context for the selected advertiser.
              </p>
            </div>

            {selectedAdvertiser ? (
              <div className="space-y-5 p-5">
                <div className="rounded-[24px] border border-[#ded3c2] bg-[#fbf6ec] p-4">
                  <EntityChip entity={selectedAdvertiser.advertiser} />
                  <h3 className="mt-3 text-[24px] font-black leading-tight text-ink">{selectedAdvertiser.advertiser.name}</h3>
                  <p className="mt-1 text-[13px] font-semibold text-ink-3">{selectedAdvertiser.advertiser.domain}</p>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-[12px]">
                    <div className="rounded-2xl bg-white p-3">
                      <div className="text-[10px] font-black uppercase tracking-[0.15em] text-ink-3">Cards</div>
                      <div className="mt-1 text-[16px] font-black text-ink">{selectedAdvertiser.cards.length}</div>
                    </div>
                    <div className="rounded-2xl bg-white p-3">
                      <div className="text-[10px] font-black uppercase tracking-[0.15em] text-ink-3">Topics</div>
                      <div className="mt-1 text-[16px] font-black text-ink">{selectedAdvertiser.topics.length}</div>
                    </div>
                    <div className="rounded-2xl bg-white p-3">
                      <div className="text-[10px] font-black uppercase tracking-[0.15em] text-ink-3">Queries</div>
                      <div className="mt-1 text-[16px] font-black text-ink">{selectedAdvertiser.queries.length}</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[12px]">
                  <div className="rounded-[20px] bg-[#f8f2e7] p-3">
                    <div className="text-[10px] font-black uppercase tracking-[0.15em] text-ink-3">Appearances</div>
                    <div className="mt-1 text-[16px] font-black text-ink">{formatNumber(selectedAdvertiser.totalAppearances)}</div>
                  </div>
                  <div className="rounded-[20px] bg-[#f8f2e7] p-3">
                    <div className="text-[10px] font-black uppercase tracking-[0.15em] text-ink-3">Latest seen</div>
                    <div className="mt-1 text-[13px] font-black text-ink">{formatDate(selectedAdvertiser.latestSeen)}</div>
                  </div>
                  <div className="rounded-[20px] bg-[#f8f2e7] p-3">
                    <div className="text-[10px] font-black uppercase tracking-[0.15em] text-ink-3">Platform</div>
                    <div className="mt-1 text-[13px] font-black text-ink">{selectedAdvertiser.previewCard.contexts[0]?.platform.name ?? 'ChatGPT Ads'}</div>
                  </div>
                  <div className="rounded-[20px] bg-[#f8f2e7] p-3">
                    <div className="text-[10px] font-black uppercase tracking-[0.15em] text-ink-3">Channel</div>
                    <div className="mt-1 text-[13px] font-black text-ink">{selectedAdvertiser.previewCard.contexts[0]?.channel?.name ?? 'ChatGPT Ads'}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[13px] font-black text-ink">All ad cards from this advertiser</div>
                  {selectedAdvertiser.cards.map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => setSelectedId(card.id)}
                      className={`w-full rounded-[22px] border p-3 text-left transition-all ${
                        selected?.id === card.id ? 'border-ink bg-[#f5ecda]' : 'border-[#ded3c2] bg-[#fbf6ec] hover:border-ink-3'
                      }`}
                    >
                      <div className="flex gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={card.creative_asset.image_url} alt={card.title} className="h-20 w-20 shrink-0 rounded-2xl border border-[#ddd2c1] bg-white object-cover" />
                        <div className="min-w-0">
                          <div className="line-clamp-2 text-[13px] font-black leading-snug text-ink">{card.title}</div>
                          <div className="mt-1 text-[11px] font-semibold text-ink-3">{domainFromUrl(card.destination_url)}</div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {cardTopicLabels(card).map((topic) => (
                              <span key={topic} className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-ink-3">{topic}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {selected ? (
                  <div className="space-y-3 border-t border-[#e1d5c4] pt-4">
                    <div>
                      <div className="text-[13px] font-black text-ink">Selected card query context</div>
                      <p className="mt-1 text-[12px] text-ink-3">{selected.title}</p>
                    </div>
                    {selected.contexts.map((context) => (
                      <div key={context.id} className="rounded-[22px] border border-[#ded3c2] bg-[#fbf6ec] p-3">
                        <div className="text-[13px] font-bold text-ink">{context.observed_query}</div>
                        <div className="mt-1 text-[12px] text-ink-3">{context.query_topic}</div>
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-ink-3">
                          <span>{context.country_code}</span>
                          <span>{context.language_code.toUpperCase()}</span>
                          <span>{context.model_name}</span>
                          <span>{formatDate(context.observed_at)}</span>
                        </div>
                      </div>
                    ))}
                    <a
                      href={selected.destination_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[12px] font-bold text-ink underline underline-offset-4"
                    >
                      Destination URL <ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="p-5 text-sm font-semibold text-ink-3">Select an advertiser to inspect.</div>
            )}
          </aside>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <section className="rounded-[28px] border border-[#d9cfbd] bg-[#fffdf8] shadow-[0_24px_60px_rgba(59,42,18,0.08)]">
            <div className="border-b border-[#e1d5c4] p-5">
              <h2 className="text-[18px] font-black text-ink">Observation rules</h2>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-3">The accepted-card filters keeping fake, blank, or contextless payloads out of the library.</p>
            </div>
            <div className="space-y-3 p-5">
              {(data?.quality.cleaning_rules ?? []).map((rule) => (
                <div key={rule} className="rounded-[20px] border border-[#ded3c2] bg-[#fbf6ec] px-4 py-3 text-[13px] text-ink-3">{rule}</div>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-[#d9cfbd] bg-[#fffdf8] shadow-[0_24px_60px_rgba(59,42,18,0.08)]">
            <div className="border-b border-[#e1d5c4] p-5">
              <h2 className="text-[18px] font-black text-ink">Space facts</h2>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-3">Category, model, source mode, and image-gate status for the currently selected Ads space.</p>
            </div>
            <div className="grid gap-3 p-5 text-[13px]">
              <div className="flex items-center justify-between rounded-[20px] bg-[#fbf6ec] px-4 py-3"><span className="inline-flex items-center gap-2 text-ink-3"><Globe className="h-4 w-4" />Locale</span><strong>{data?.ads_space.locale ?? 'US/en'}</strong></div>
              <div className="flex items-center justify-between rounded-[20px] bg-[#fbf6ec] px-4 py-3"><span className="inline-flex items-center gap-2 text-ink-3"><Megaphone className="h-4 w-4" />Platform</span><strong>{data?.ads_space.platform ?? 'ChatGPT Ads'}</strong></div>
              <div className="flex items-center justify-between rounded-[20px] bg-[#fbf6ec] px-4 py-3"><span className="inline-flex items-center gap-2 text-ink-3"><Database className="h-4 w-4" />Source mode</span><strong>{data?.ads_space.source_mode ?? '-'}</strong></div>
              <div className="flex items-center justify-between rounded-[20px] bg-[#fbf6ec] px-4 py-3"><span className="inline-flex items-center gap-2 text-ink-3"><ShieldCheck className="h-4 w-4" />Image gate</span><strong>{badImageIds.length ? `${badImageIds.length} hidden` : 'All visible cards pass'}</strong></div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
