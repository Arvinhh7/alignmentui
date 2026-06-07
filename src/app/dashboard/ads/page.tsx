'use client'

import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
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
import { fetchWithRetry } from '@/lib/api'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

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

interface CollectorConnector {
  ready: boolean
  purpose: string
  required: string[]
  note?: string
}

interface CollectorRun {
  id: string
  status: 'planned' | 'blocked' | 'running' | 'completed' | 'failed'
  mode: 'pilot' | 'standard' | 'deep'
  plan_json?: {
    query_universe_count?: number
    observation_query_count?: number
    accepted_card_count?: number
  }
  cost_estimate_json?: {
    rough_monthly_envelope?: { expected?: string }
    ai_model_calls?: number
  }
  result_json?: {
    message?: string
    next_connector?: string
    query_universe_persisted?: number
    observation_queue_persisted?: number
    queue_status?: string
  }
  created_at?: string
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

function CollectorPanel({ data }: { data: AdsResponse | null }) {
  const [readiness, setReadiness] = useState<Record<string, CollectorConnector>>({})
  const [run, setRun] = useState<CollectorRun | null>(null)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    fetchWithRetry(`${API_BASE_URL}/api/ads/collector/readiness`)
      .then((r) => r.ok ? r.json() : null)
      .then((payload) => setReadiness(payload?.connectors ?? {}))
      .catch(() => setReadiness({}))
  }, [])

  useEffect(() => {
    const slug = data?.ads_space.slug
    if (!slug) return
    fetchWithRetry(`${API_BASE_URL}/api/ads/collector/runs/latest?ads_space_slug=${encodeURIComponent(slug)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((payload) => setRun(payload?.run ?? null))
      .catch(() => setRun(null))
  }, [data?.ads_space.slug])

  const createRun = async () => {
    if (!data?.ads_space) return
    setRunning(true)
    try {
      const competitors = data.advertiser_leaderboard.map((row) => row.advertiser.name).slice(0, 8)
      const seeds = data.observed_cards.flatMap((card) => card.contexts.map((ctx) => ctx.observed_query)).slice(0, 20)
      const response = await fetchWithRetry(`${API_BASE_URL}/api/ads/collector/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ads_space_slug: data.ads_space.slug,
          product_space: data.ads_space.name,
          market: data.ads_space.locale.startsWith('US') ? 'United States' : data.ads_space.locale,
          language: 'en',
          brand_name: 'EcoFlow',
          domain: 'ecoflow.com',
          seed_keywords: seeds,
          competitors,
          mode: 'pilot',
          persist: true,
          execute_connectors: false,
        }),
      })
      const payload = await response.json()
      setRun(payload?.run ?? null)
    } finally {
      setRunning(false)
    }
  }

  const connectors = Object.entries(readiness)
  const readyCount = connectors.filter(([, value]) => value.ready).length

  return (
    <section className="rounded-[28px] border border-[#d9cfbd] bg-[linear-gradient(135deg,#fffaf0_0%,#fffdf8_54%,#f5ecda_100%)] shadow-[0_24px_60px_rgba(59,42,18,0.09)]">
      <div className="flex flex-col gap-4 border-b border-[#e0d4c2] p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#efe2c9]">
            <Database className="h-5 w-5 text-ink" />
          </div>
          <div>
            <h2 className="text-[18px] font-black text-ink">Observation collector</h2>
            <p className="mt-1 max-w-4xl text-[13px] leading-relaxed text-ink-3">
              Planning, queueing, and image/query quality gates stay active. The library renders only accepted observations with durable creative URLs.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={createRun}
          disabled={running || !data?.ads_space}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-[13px] font-black text-ink-inv transition-colors hover:bg-ink-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />}
          Create pilot plan
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 p-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {connectors.map(([key, value]) => (
            <div key={key} className="rounded-[22px] border border-[#ded3c2] bg-white/75 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="text-[11px] font-black uppercase tracking-[0.15em] text-ink-3">{key.replaceAll('_', ' ')}</div>
                {value.ready ? <CheckCircle2 className="h-4 w-4 text-sage" /> : <AlertCircle className="h-4 w-4 text-caution" />}
              </div>
              <div className={`text-[13px] font-black ${value.ready ? 'text-sage' : 'text-caution'}`}>
                {value.ready ? 'Ready' : 'Blocked'}
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-ink-3">{value.note || value.purpose}</p>
            </div>
          ))}
        </div>

        <div className="rounded-[22px] border border-[#ded3c2] bg-white/75 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.15em] text-ink-3">Latest run</div>
              <div className="mt-1 text-[18px] font-black capitalize text-ink">{run?.status ?? 'No run yet'}</div>
            </div>
            <div className="rounded-full border border-[#ddd2c0] bg-white px-3 py-1 text-[11px] font-black text-ink-3">
              {readyCount}/{connectors.length || 4} ready
            </div>
          </div>
          <div className="mt-4 grid gap-2 text-[13px]">
            <div className="flex items-center justify-between"><span className="text-ink-3">Query universe</span><strong>{run?.plan_json?.query_universe_count ?? '-'}</strong></div>
            <div className="flex items-center justify-between"><span className="text-ink-3">Observation sample</span><strong>{run?.plan_json?.observation_query_count ?? run?.plan_json?.accepted_card_count ?? '-'}</strong></div>
            <div className="flex items-center justify-between"><span className="text-ink-3">Queued</span><strong>{run?.result_json?.observation_queue_persisted ?? '-'}</strong></div>
            <div className="flex items-center justify-between"><span className="text-ink-3">AI model calls</span><strong>{run?.cost_estimate_json?.ai_model_calls ?? 0}</strong></div>
            <div className="flex items-start justify-between gap-3"><span className="text-ink-3">Envelope</span><strong className="text-right">{run?.cost_estimate_json?.rough_monthly_envelope?.expected ?? '-'}</strong></div>
          </div>
          {run?.result_json?.message ? (
            <p className="mt-3 rounded-2xl bg-[#f8f3e8] px-3 py-2 text-[12px] font-semibold text-ink-3">{run.result_json.message}</p>
          ) : null}
        </div>
      </div>
    </section>
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

function ObservedCardTile({
  card,
  selected,
  hidden,
  onSelect,
  onBadImage,
}: {
  card: ObservedCard
  selected: boolean
  hidden: boolean
  onSelect: () => void
  onBadImage: (id: string) => void
}) {
  if (hidden) return null

  const queryCount = cardQueryCount(card)
  const topicCount = cardTopicCount(card)
  const destinationDomain = domainFromUrl(card.destination_url)
  const topics = cardTopicLabels(card)

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
          <EntityChip entity={card.advertiser} />
          <span className="rounded-full border border-white/35 bg-black/35 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-white">
            {destinationDomain}
          </span>
        </div>
      </div>

      <div className="space-y-4 p-4">
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
            <div className="mt-1 text-[16px] font-black text-ink">{queryCount}</div>
          </div>
          <div className="rounded-2xl bg-[#f7f1e4] p-3">
            <div className="text-[10px] font-black uppercase tracking-[0.15em] text-ink-3">Topics</div>
            <div className="mt-1 text-[16px] font-black text-ink">{topicCount}</div>
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
  const [search, setSearch] = useState('')
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
          setSelectedId((current) => payload.observed_cards.some((card) => card.id === current) ? current : (payload.observed_cards[0]?.id ?? null))
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

  const visibleCards = useMemo(() => {
    return (data?.observed_cards ?? []).filter((card) => !badImageIds.includes(card.id))
  }, [badImageIds, data?.observed_cards])

  const selected = useMemo(() => {
    if (!visibleCards.length) return null
    return visibleCards.find((card) => card.id === selectedId) ?? visibleCards[0]
  }, [selectedId, visibleCards])

  const selectedAdvertiserId = selected?.advertiser.id ?? visibleCards[0]?.advertiser.id ?? null

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

  const selectedAdvertiserCards = useMemo(() => {
    if (!selectedAdvertiserId) return visibleCards
    return visibleCards.filter((card) => card.advertiser.id === selectedAdvertiserId)
  }, [selectedAdvertiserId, visibleCards])

  const observationSourceLabel = data?.quality.data_source === 'database' ? 'Database observations' : data?.quality.data_source === 'preview_cache' ? 'Preview cache from real ingest' : 'Accepted observations'

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f7eedf_0%,#f3efe7_36%,#efe7d8_68%,#f7f3eb_100%)]">
      <div className="border-b border-[#d8cfbf] bg-[linear-gradient(135deg,#fff8ea_0%,#f8f2e6_55%,#efe3cf_100%)] px-6 py-6">
        <div className="mx-auto max-w-[1480px]">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d9cfbd] bg-white/80 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-ink-3">
                <LibraryBig className="h-3.5 w-3.5" />
                GEOly-style observation library
              </div>
              <h1 className="mt-4 text-[40px] font-black leading-[0.95] text-ink md:text-[52px]">Ads observation cards</h1>
              <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-ink-3">
                Advertiser identity, official logos, accepted creative images, destination domains, and query-context drilldowns across observed ChatGPT ad cards.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={activeSlug}
                onChange={(event) => {
                  setActiveSlug(event.target.value)
                  setSearch('')
                }}
                className="h-11 min-w-[220px] rounded-full border border-[#d8cfbf] bg-white px-4 text-[13px] font-bold text-ink"
              >
                {spaces.map((space) => (
                  <option key={space.slug} value={space.slug}>{space.name}</option>
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
              <MetricCard label="Advertisers" value={formatNumber(filteredLeaderboard.length)} icon={Target} accent="#ead8b1" />
              <MetricCard label="Cards" value={formatNumber(visibleCards.length)} icon={ImageIcon} accent="#d8ebcf" />
              <MetricCard label="Queries" value={formatNumber(visibleQueries.length)} icon={Search} accent="#f4d8c2" />
              <MetricCard label="Topics" value={formatNumber(visibleTopics.length)} icon={Layers3} accent="#d8dff4" />
            </div>
          ) : null}
        </div>
      </div>

      <div className="mx-auto max-w-[1480px] space-y-5 p-6">
        <div className="rounded-[24px] border border-[#d8cfbf] bg-white/75 px-4 py-3 text-[13px] font-semibold text-ink-3 shadow-[0_16px_40px_rgba(59,42,18,0.06)]">
          {observationSourceLabel}. Hidden invalid images: {formatNumber(data?.quality.hidden_cards_missing_images ?? 0)}. Cards without durable images or query context do not render.
        </div>

        <CollectorPanel data={data} />

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[320px_minmax(0,1fr)_420px]">
          <AdvertiserRail
            rows={filteredLeaderboard}
            selectedAdvertiserId={selectedAdvertiserId}
            onSelect={(advertiserId) => {
              const firstCard = visibleCards.find((card) => card.advertiser.id === advertiserId)
              if (firstCard) setSelectedId(firstCard.id)
            }}
          />

          <section className="overflow-hidden rounded-[28px] border border-[#d9cfbd] bg-[#fffdf8] shadow-[0_24px_60px_rgba(59,42,18,0.08)]">
            <div className="flex flex-col gap-4 border-b border-[#e1d5c4] p-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-ink-3">Card library</div>
                <h2 className="mt-2 text-[20px] font-black text-ink">Observed ad cards</h2>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-3">
                  Real observed-card payloads only. Each card exposes advertiser identity, destination domain, and unique topic/query breadth.
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
            ) : selectedAdvertiserCards.length ? (
              <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 2xl:grid-cols-3">
                {selectedAdvertiserCards.map((card) => (
                  <ObservedCardTile
                    key={card.id}
                    card={card}
                    selected={card.id === selected?.id}
                    hidden={badImageIds.includes(card.id)}
                    onSelect={() => setSelectedId(card.id)}
                    onBadImage={(id) => setBadImageIds((current) => current.includes(id) ? current : [...current, id])}
                  />
                ))}
              </div>
            ) : (
              <div className="flex min-h-[520px] items-center justify-center p-8 text-sm font-semibold text-ink-3">
                No accepted observed cards are available for this filter.
              </div>
            )}
          </section>

          <aside className="h-fit rounded-[28px] border border-[#d9cfbd] bg-[#fffdf8] shadow-[0_24px_60px_rgba(59,42,18,0.08)] xl:sticky xl:top-20">
            <div className="border-b border-[#e1d5c4] p-5">
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-ink-3">Drilldown</div>
              <h2 className="mt-2 text-[20px] font-black text-ink">Query context</h2>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-3">
                Destination, platform, channel, query list, and observation timings for the selected card.
              </p>
            </div>

            {selected ? (
              <div className="space-y-5 p-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selected.creative_asset.image_url} alt={selected.title} className="h-60 w-full rounded-[22px] border border-[#ddd2c1] bg-[#f3ecdf] object-cover" />

                <div className="flex flex-wrap gap-1.5">
                  <EntityChip entity={selected.advertiser} />
                  <EntityChip entity={selected.contexts[0].platform} />
                  {selected.contexts[0].channel ? <EntityChip entity={selected.contexts[0].channel!} /> : null}
                </div>

                <div>
                  <div className="rounded-full border border-[#ddd2c1] bg-[#f8f2e7] px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-ink-3">
                    {domainFromUrl(selected.destination_url)}
                  </div>
                  <h3 className="mt-3 text-[22px] font-black leading-tight text-ink">{selected.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-ink-3">{selected.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[12px]">
                  <div className="rounded-[20px] bg-[#f8f2e7] p-3">
                    <div className="text-[10px] font-black uppercase tracking-[0.15em] text-ink-3">Appearances</div>
                    <div className="mt-1 text-[16px] font-black text-ink">{formatNumber(selected.appearance_count)}</div>
                  </div>
                  <div className="rounded-[20px] bg-[#f8f2e7] p-3">
                    <div className="text-[10px] font-black uppercase tracking-[0.15em] text-ink-3">Contexts</div>
                    <div className="mt-1 text-[16px] font-black text-ink">{selected.contexts.length}</div>
                  </div>
                  <div className="rounded-[20px] bg-[#f8f2e7] p-3">
                    <div className="text-[10px] font-black uppercase tracking-[0.15em] text-ink-3">Queries</div>
                    <div className="mt-1 text-[16px] font-black text-ink">{cardQueryCount(selected)}</div>
                  </div>
                  <div className="rounded-[20px] bg-[#f8f2e7] p-3">
                    <div className="text-[10px] font-black uppercase tracking-[0.15em] text-ink-3">Topics</div>
                    <div className="mt-1 text-[16px] font-black text-ink">{cardTopicCount(selected)}</div>
                  </div>
                </div>

                <div className="grid gap-2 border-y border-[#e1d5c4] py-4 text-[13px]">
                  <div className="flex items-center justify-between"><span className="text-ink-3">First seen</span><strong>{formatDate(selected.first_seen_at)}</strong></div>
                  <div className="flex items-center justify-between"><span className="text-ink-3">Last seen</span><strong>{formatDate(selected.last_seen_at)}</strong></div>
                  <div className="flex items-center justify-between"><span className="text-ink-3">Destination</span><strong>{domainFromUrl(selected.destination_url)}</strong></div>
                </div>

                <div className="space-y-2">
                  <div className="text-[13px] font-black text-ink">Observed query context</div>
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
                </div>

                <a
                  href={selected.destination_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[12px] font-bold text-ink underline underline-offset-4"
                >
                  Destination URL <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </div>
            ) : (
              <div className="p-5 text-sm font-semibold text-ink-3">Select a visible ad card to inspect.</div>
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
