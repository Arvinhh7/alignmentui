'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Database,
  Image as ImageIcon,
  Loader2,
  Megaphone,
  Search,
  ShieldCheck,
  Target,
} from 'lucide-react'
import { fetchWithRetry } from '@/lib/api'
import { ADS_PREVIEW_DATA } from './previewData'

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

function EntityChip({ entity }: { entity: Entity }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-divider-light bg-surface px-2.5 py-1 text-[11px] font-bold text-ink-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={entity.logo_url} alt={`${entity.name} logo`} className="h-4 w-4 rounded-full bg-white object-contain" />
      <span>{entity.name}</span>
    </span>
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
    <section className="rounded-lg border border-divider-light bg-surface shadow-elevation-sm">
      <div className="flex flex-col gap-3 border-b border-divider-light p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sage-bg">
            <Database className="h-4 w-4 text-sage" />
          </div>
          <div>
            <h2 className="text-[16px] font-black text-ink">Observation collector</h2>
            <p className="mt-1 max-w-4xl text-[13px] leading-relaxed text-ink-3">
              Query planning is automated, but this build records real observed cards through manual CSV ingest. Rows without images or query context are rejected before display.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={createRun}
          disabled={running || !data?.ads_space}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-ink px-4 text-[13px] font-black text-ink-inv transition-colors hover:bg-ink-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />}
          Create pilot plan
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 p-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {connectors.map(([key, value]) => (
            <div key={key} className="rounded-lg border border-divider-light bg-[#fbfaf7] p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="text-[11px] font-black uppercase text-ink-3">{key.replaceAll('_', ' ')}</div>
                {value.ready ? <CheckCircle2 className="h-4 w-4 text-sage" /> : <AlertCircle className="h-4 w-4 text-caution" />}
              </div>
              <div className={`text-[13px] font-black ${value.ready ? 'text-sage' : 'text-caution'}`}>
                {value.ready ? 'Ready' : 'Blocked'}
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-ink-3">{value.note || value.purpose}</p>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-divider-light bg-[#fbfaf7] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-black uppercase text-ink-3">Latest run</div>
              <div className="mt-1 text-[18px] font-black capitalize text-ink">{run?.status ?? 'No run yet'}</div>
            </div>
            <div className="rounded-full border border-divider-light bg-surface px-3 py-1 text-[11px] font-black text-ink-3">
              {readyCount}/{connectors.length || 4} ready
            </div>
          </div>
          <div className="mt-4 grid gap-2 text-[13px]">
            <div className="flex items-center justify-between"><span className="text-ink-3">Query universe</span><strong>{run?.plan_json?.query_universe_count ?? '-'}</strong></div>
            <div className="flex items-center justify-between"><span className="text-ink-3">Observation sample</span><strong>{run?.plan_json?.observation_query_count ?? run?.plan_json?.accepted_card_count ?? '-'}</strong></div>
            <div className="flex items-center justify-between"><span className="text-ink-3">AI model calls</span><strong>{run?.cost_estimate_json?.ai_model_calls ?? 0}</strong></div>
            <div className="flex items-start justify-between gap-3"><span className="text-ink-3">Envelope</span><strong className="text-right">{run?.cost_estimate_json?.rough_monthly_envelope?.expected ?? '-'}</strong></div>
          </div>
          {run?.result_json?.message ? (
            <p className="mt-3 rounded-md bg-surface px-3 py-2 text-[12px] font-semibold text-ink-3">{run.result_json.message}</p>
          ) : null}
        </div>
      </div>
    </section>
  )
}

function LeaderboardRowView({ row, maxAppearances }: { row: LeaderboardRow; maxAppearances: number }) {
  const width = maxAppearances > 0 ? Math.max(8, Math.round((row.total_appearances / maxAppearances) * 100)) : 0
  return (
    <div className="grid grid-cols-[minmax(180px,260px)_1fr_80px] items-center gap-3 text-[12px]">
      <div className="min-w-0">
        <EntityChip entity={row.advertiser} />
        <div className="mt-1 text-[11px] text-ink-3">{row.observed_card_count} cards</div>
      </div>
      <div className="h-2 rounded-full bg-surface-muted/70">
        <div className="h-full rounded-full bg-ink" style={{ width: `${width}%` }} />
      </div>
      <div className="text-right font-bold text-ink-3">{formatNumber(row.total_appearances)}</div>
    </div>
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
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`overflow-hidden rounded-lg border bg-surface text-left transition-all hover:-translate-y-0.5 hover:border-ink-3 hover:shadow-elevation-md ${
        selected ? 'border-ink-3 shadow-elevation-md' : 'border-divider-light'
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={card.creative_asset.image_url}
        alt={card.title}
        className="h-52 w-full bg-[#f3ecdf] object-cover"
        onError={() => onBadImage(card.id)}
        onLoad={(event) => {
          const img = event.currentTarget
          if (!img.naturalWidth || !img.naturalHeight) onBadImage(card.id)
        }}
      />
      <div className="space-y-3 p-4">
        <div className="flex flex-wrap gap-1.5">
          <EntityChip entity={card.advertiser} />
          <EntityChip entity={card.contexts[0].platform} />
        </div>
        <div>
          <h3 className="text-[15px] font-black leading-snug text-ink">{card.title}</h3>
          <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-ink-3">{card.description}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[12px]">
          <div className="rounded-md bg-[#fbfaf7] p-2">
            <div className="text-[10px] font-black uppercase text-ink-3">Appearances</div>
            <div className="mt-1 font-black text-ink">{formatNumber(card.appearance_count)}</div>
          </div>
          <div className="rounded-md bg-[#fbfaf7] p-2">
            <div className="text-[10px] font-black uppercase text-ink-3">Contexts</div>
            <div className="mt-1 font-black text-ink">{card.contexts.length}</div>
          </div>
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
      if (search.trim()) params.set('search', search.trim())

      fetchWithRetry(`${API_BASE_URL}/api/ads/spaces/${activeSlug}?${params.toString()}`, { signal: controller.signal })
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`)
          return r.json()
        })
        .then((payload: AdsResponse) => {
          setData(payload)
          setSelectedId(payload.observed_cards[0]?.id ?? null)
        })
        .catch((err) => {
          if (err instanceof DOMException && err.name === 'AbortError') return
          setError('Observed ads API is unavailable in this environment, so the local preview fallback is shown instead.')
          setData(ADS_PREVIEW_DATA as unknown as AdsResponse)
          setSelectedId(ADS_PREVIEW_DATA.observed_cards[0]?.id ?? null)
        })
        .finally(() => setLoading(false))
    }, 180)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [activeSlug, search])

  const visibleCards = useMemo(() => {
    return (data?.observed_cards ?? []).filter((card) => !badImageIds.includes(card.id))
  }, [badImageIds, data?.observed_cards])

  const selected = useMemo(() => {
    if (!visibleCards.length) return null
    return visibleCards.find((card) => card.id === selectedId) ?? visibleCards[0]
  }, [selectedId, visibleCards])

  const maxAppearances = Math.max(...(data?.advertiser_leaderboard.map((row) => row.total_appearances) ?? [0]))

  return (
    <div className="min-h-screen bg-canvas">
      <div className="border-b border-divider-light bg-surface px-6 py-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-warm">
              <Megaphone className="h-5 w-5 text-ink" />
            </div>
            <div>
              <h1 className="heading-dash">Ads</h1>
              <p className="max-w-4xl text-sm text-ink-3">
                Observed GEM/ChatGPT ad cards with advertiser identity, creative image, destination URL, and query context.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={activeSlug}
              onChange={(event) => {
                setActiveSlug(event.target.value)
                setSearch('')
              }}
              className="h-10 min-w-[220px] rounded-full border border-divider bg-surface px-4 text-[13px] font-bold text-ink"
            >
              {spaces.map((space) => (
                <option key={space.slug} value={space.slug}>{space.name}</option>
              ))}
            </select>
            <span className="rounded-full border border-divider-light bg-surface px-4 py-2 text-[13px] font-bold">{data?.ads_space.locale ?? 'US/en'}</span>
            <span className="rounded-full border border-divider-light bg-surface px-4 py-2 text-[13px] font-bold">{data?.ads_space.model ?? 'GPT-4.1'}</span>
            <span className="inline-flex items-center gap-2 rounded-full border border-divider-light bg-surface px-4 py-2 text-[13px] font-bold">
              <CalendarDays className="h-4 w-4" />
              {formatDate(data?.ads_space.last_observed_at)}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-6">
        {data?.ads_space ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-divider-light bg-surface p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] font-black uppercase text-ink-3">Observed cards</div>
                <ImageIcon className="h-4 w-4 text-ink-3" />
              </div>
              <div className="mt-2 text-2xl font-black text-ink">{formatNumber(visibleCards.length)}</div>
            </div>
            <div className="rounded-lg border border-divider-light bg-surface p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] font-black uppercase text-ink-3">Advertisers</div>
                <Target className="h-4 w-4 text-ink-3" />
              </div>
              <div className="mt-2 text-2xl font-black text-ink">{formatNumber(data.advertiser_leaderboard.length)}</div>
            </div>
            <div className="rounded-lg border border-divider-light bg-surface p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] font-black uppercase text-ink-3">Appearances</div>
                <Megaphone className="h-4 w-4 text-ink-3" />
              </div>
              <div className="mt-2 text-2xl font-black text-ink">{formatNumber(visibleCards.reduce((sum, card) => sum + card.appearance_count, 0))}</div>
            </div>
            <div className="rounded-lg border border-divider-light bg-surface p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] font-black uppercase text-ink-3">Image gate</div>
                <ShieldCheck className="h-4 w-4 text-ink-3" />
              </div>
              <div className="mt-2 text-2xl font-black text-ink">{badImageIds.length ? `${badImageIds.length} hidden` : 'All pass'}</div>
            </div>
          </div>
        ) : null}

        <CollectorPanel data={data} />

        {data?.quality.fixture ? (
          <div className="rounded-lg border border-amber/25 bg-amber-bg px-4 py-3 text-[13px] font-semibold text-caution">
            Local preview data is active. This page is wired for real observed-card CSV ingest, but no real export is loaded in this environment.
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="overflow-hidden rounded-lg border border-divider-light bg-surface shadow-elevation-sm">
            <div className="flex flex-col gap-3 border-b border-divider-light p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-[16px] font-black text-ink">Observed ad card library</h2>
                <p className="mt-1 text-[13px] text-ink-3">Only cards with nonblank images and query context are displayed.</p>
              </div>
              <div className="relative w-full lg:w-[320px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search advertisers, titles, queries"
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
                <Megaphone className="h-8 w-8 text-ink-3" />
                <p className="max-w-md text-sm font-semibold text-ink-3">{error}</p>
              </div>
            ) : visibleCards.length ? (
              <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-2 2xl:grid-cols-3">
                {data?.observed_cards.map((card) => (
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
              <div className="flex min-h-[420px] items-center justify-center p-8 text-sm font-semibold text-ink-3">
                No observed cards are available for this filter.
              </div>
            )}
          </section>

          <aside className="h-fit rounded-lg border border-divider-light bg-surface shadow-elevation-sm xl:sticky xl:top-20">
            <div className="border-b border-divider-light p-5">
              <h2 className="text-[16px] font-black text-ink">Card drilldown</h2>
              <p className="mt-1 text-[13px] text-ink-3">Query, topic, platform, channel, and destination context for the selected card.</p>
            </div>

            {selected ? (
              <div className="space-y-5 p-5">
                <div className="space-y-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selected.creative_asset.image_url} alt={selected.title} className="h-52 w-full rounded-lg border border-divider-light bg-[#f3ecdf] object-cover" />
                  <div className="flex flex-wrap gap-1.5">
                    <EntityChip entity={selected.advertiser} />
                    <EntityChip entity={selected.contexts[0].platform} />
                    {selected.contexts[0].channel ? <EntityChip entity={selected.contexts[0].channel!} /> : null}
                  </div>
                  <div>
                    <h3 className="text-[18px] font-black leading-tight text-ink">{selected.title}</h3>
                    <p className="mt-2 text-[13px] leading-relaxed text-ink-3">{selected.description}</p>
                  </div>
                </div>

                <div className="grid gap-2 border-y border-divider-light py-3 text-[13px]">
                  <div className="flex items-center justify-between"><span className="text-ink-3">Appearances</span><strong>{formatNumber(selected.appearance_count)}</strong></div>
                  <div className="flex items-center justify-between"><span className="text-ink-3">Contexts</span><strong>{selected.contexts.length}</strong></div>
                  <div className="flex items-center justify-between"><span className="text-ink-3">First seen</span><strong>{formatDate(selected.first_seen_at)}</strong></div>
                  <div className="flex items-center justify-between"><span className="text-ink-3">Last seen</span><strong>{formatDate(selected.last_seen_at)}</strong></div>
                </div>

                <div className="space-y-2">
                  <div className="text-[13px] font-black text-ink">Observed query context</div>
                  {selected.contexts.map((context) => (
                    <div key={context.id} className="rounded-lg border border-divider-light bg-[#fbfaf7] p-3">
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
          <section className="rounded-lg border border-divider-light bg-surface shadow-elevation-sm">
            <div className="border-b border-divider-light p-5">
              <h2 className="text-[16px] font-black text-ink">Advertiser leaderboard</h2>
              <p className="mt-1 text-[13px] text-ink-3">Ranked by observed card appearances across the selected query space.</p>
            </div>
            <div className="space-y-4 p-5">
              {(data?.advertiser_leaderboard ?? []).map((row) => (
                <LeaderboardRowView key={row.advertiser.id} row={row} maxAppearances={maxAppearances} />
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-divider-light bg-surface shadow-elevation-sm">
            <div className="border-b border-divider-light p-5">
              <h2 className="text-[16px] font-black text-ink">Observation rules</h2>
              <p className="mt-1 text-[13px] text-ink-3">Display gates that keep blank or weak ad-card facts out of the UI.</p>
            </div>
            <div className="space-y-3 p-5">
              {(data?.quality.cleaning_rules ?? []).map((rule) => (
                <div key={rule} className="rounded-lg border border-divider-light bg-[#fbfaf7] px-3 py-2 text-[13px] text-ink-3">{rule}</div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
