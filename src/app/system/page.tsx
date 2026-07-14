'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Database,
  FileSearch,
  Gauge,
  Layers3,
  Network,
  RadioTower,
  SearchCheck,
  Server,
  ShieldCheck,
} from 'lucide-react'
import Footer from '@/components/Footer'
import PublicNavbar from '@/components/PublicNavbar'

const API_BASE = 'https://alignment-data-collection-production.up.railway.app'

interface DataSource {
  name: string
  tier: number
  type: string
}

interface Stats {
  papers?: number
  community_posts?: number
  products?: number
  drive_files?: number
  youtube_videos?: number
  total?: number
  data_sources?: DataSource[]
}

const pipelineStages = [
  {
    label: 'Collect',
    detail: 'AI answers, citation domains, category prompts, shopping surfaces, product feeds, and broker events.',
    icon: FileSearch,
    meta: 'Input Layer',
  },
  {
    label: 'Normalize',
    detail: 'Entity resolution, brand/product deduplication, citation canonicalization, and source quality gates.',
    icon: SearchCheck,
    meta: 'Processing Layer',
  },
  {
    label: 'Model',
    detail: 'A durable commerce graph connecting prompts, products, sources, claims, offers, and answer patterns.',
    icon: Database,
    meta: 'Graph Layer',
  },
  {
    label: 'Activate',
    detail: 'Dashboards, Visibility Proxy, MCP/API, Product Agents, alerts, and broker telemetry.',
    icon: RadioTower,
    meta: 'Delivery Layer',
  },
]

const reliabilityControls = [
  ['Canonical IDs', 'Every brand, product, source, and prompt is mapped to stable identifiers before reporting.'],
  ['Source Tiers', 'Authoritative sources are separated from volatile community signals and crawled artifacts.'],
  ['Quality Gates', 'Records pass completeness, duplication, freshness, and citation checks before entering the graph.'],
  ['Audit Trails', 'Teams can trace a visibility shift back to the prompt, answer, source, and run context.'],
]

const outputChannels = [
  { label: 'Executive Dashboards', desc: 'Category-level visibility, share of answer, and citation movement.', icon: BarChart3 },
  { label: 'Visibility Proxy', desc: 'Machine-readable pages and structured facts for agent consumption.', icon: Network },
  { label: 'MCP / API', desc: 'Graph records delivered to internal tools, analytics, and product workflows.', icon: Server },
  { label: 'Product Agents', desc: 'Offer, quote, and broker telemetry connected back to brand evidence.', icon: Layers3 },
]

const fallbackSources: DataSource[] = [
  { name: 'OpenAI', tier: 1, type: 'model' },
  { name: 'Perplexity', tier: 1, type: 'model' },
  { name: 'Google AI', tier: 1, type: 'model' },
  { name: 'Anthropic', tier: 1, type: 'model' },
  { name: 'Reddit', tier: 2, type: 'community' },
  { name: 'YouTube', tier: 2, type: 'media' },
  { name: 'G2', tier: 2, type: 'review' },
  { name: 'Search Engine Journal', tier: 3, type: 'research' },
]

const sourceLogos: Record<string, string> = {
  OpenAI: '/logos/openai.png',
  Perplexity: '/logos/perplexity.png',
  'Google AI': '/logos/google.png',
  Anthropic: '/logos/anthropic.png',
  Reddit: '/logos/reddit.png',
  YouTube: '/logos/youtube.png',
  G2: '/logos/g2.png',
  'Search Engine Journal': '/logos/searchenginejournal.png',
}

function formatCount(value: number | undefined, fallback: string) {
  if (!value || value <= 0) return fallback
  return new Intl.NumberFormat('en-US', {
    notation: value >= 100000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(value)
}

function SourceLogo({ source }: { source: DataSource }) {
  const [failed, setFailed] = useState(false)
  const logo = sourceLogos[source.name]

  if (!logo || failed) {
    return (
      <span className="grid h-8 w-8 flex-shrink-0 place-items-center border border-[#262b34] bg-[#11161f] text-[11px] font-medium text-[#9aa4b5]">
        {source.name.charAt(0)}
      </span>
    )
  }

  return (
    <img
      src={logo}
      alt={source.name}
      width={32}
      height={32}
      loading="lazy"
      className="h-8 w-8 flex-shrink-0 object-contain"
      onError={() => setFailed(true)}
    />
  )
}

function MetricTile({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="border border-[#232832] bg-[#0f1319] p-4">
      <div className="font-mono text-2xl font-semibold tabular-nums text-white md:text-3xl">{value}</div>
      <div className="mt-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[#d89a80]">{label}</div>
      <p className="mt-3 text-sm leading-6 text-[#9da6b5]">{detail}</p>
    </div>
  )
}

function SectionIntro({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto mb-12 max-w-3xl text-center">
      <div className="brand-eyebrow mb-5">
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        {eyebrow}
      </div>
      <h2 className="font-serif text-4xl font-normal leading-[1.04] text-white md:text-5xl" style={{ textWrap: 'balance' }}>
        {title}
      </h2>
      <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#aab3c2]">{children}</p>
    </div>
  )
}

function SystemDiagram({ stats }: { stats: Stats }) {
  const sources = formatCount(stats.papers, '2.4M')
  const records = formatCount(stats.total, '8.9M')
  const products = formatCount(stats.products, '94K')

  return (
    <div className="system-diagram relative mx-auto w-full max-w-[620px]">
      <div className="pointer-events-none absolute -inset-8 bg-[#f15a2b]/10 blur-[80px]" />
      <div className="relative overflow-hidden border border-[#272b34] bg-[#0c0f14] shadow-[0_36px_110px_rgba(0,0,0,0.48)]">
        <div className="border-b border-[#202530] px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#d89a80]">Commerce Graph</div>
              <div className="mt-1 text-sm text-[#8993a3]">Live infrastructure view</div>
            </div>
            <div className="inline-flex items-center gap-2 border border-[#243226] bg-[#101812] px-2.5 py-1 text-[11px] font-medium text-[#8ed29f]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#8ed29f]" />
              Online
            </div>
          </div>
        </div>

        <div className="relative p-5">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.022)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.022)_1px,transparent_1px)] bg-[size:32px_32px]" />

          <div className="relative grid gap-4 md:grid-cols-[0.84fr_1.16fr]">
            <div className="space-y-3">
              {[
                ['AI Answers', sources],
                ['Citation Runs', formatCount(stats.community_posts, '18K')],
                ['Product Facts', products],
              ].map(([label, value]) => (
                <div key={label} className="border border-[#222832] bg-[#10141b] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[12px] text-[#ccd4df]">{label}</span>
                    <span className="font-mono text-[12px] tabular-nums text-[#d89a80]">{value}</span>
                  </div>
                  <div className="mt-2 h-1 bg-[#1c222c]">
                    <div className="system-bar h-full bg-[linear-gradient(90deg,#7d5243,#f0d8ca)]" />
                  </div>
                </div>
              ))}
            </div>

            <div className="relative min-h-[270px] border border-[#222832] bg-[#0f1319] p-4">
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 360 270" aria-hidden="true">
                <defs>
                  <linearGradient id="systemPath" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor="#f15a2b" stopOpacity="0.12" />
                    <stop offset="48%" stopColor="#f0d8ca" stopOpacity="0.72" />
                    <stop offset="100%" stopColor="#f15a2b" stopOpacity="0.12" />
                  </linearGradient>
                </defs>
                <path className="system-flow" d="M38 70 C112 38 148 132 214 92 S304 72 326 132" fill="none" stroke="url(#systemPath)" strokeWidth="2" />
                <path className="system-flow system-flow-delay" d="M38 194 C118 216 156 142 222 172 S296 206 326 138" fill="none" stroke="url(#systemPath)" strokeWidth="2" />
              </svg>

              <div className="relative grid h-full grid-cols-3 items-center gap-3">
                {[
                  ['Input', FileSearch],
                  ['Graph', Database],
                  ['Delivery', RadioTower],
                ].map(([label, Icon]) => {
                  const DisplayIcon = Icon as typeof FileSearch
                  return (
                    <div key={label as string} className="relative z-10 border border-[#2b313d] bg-[#11161f] p-3 text-center">
                      <DisplayIcon className="mx-auto h-5 w-5 text-[#d89a80]" aria-hidden="true" />
                      <div className="mt-3 text-[11px] font-medium uppercase tracking-[0.16em] text-[#d7dee9]">{label as string}</div>
                    </div>
                  )
                })}
              </div>

              <div className="absolute bottom-4 left-4 right-4 border border-[#2b313d] bg-[rgba(11,14,20,0.86)] px-3 py-2 backdrop-blur">
                <div className="flex items-center justify-between gap-3 text-[12px]">
                  <span className="text-[#9da6b5]">Normalized graph records</span>
                  <span className="font-mono tabular-nums text-white">{records}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="relative mt-4 grid grid-cols-3 gap-px overflow-hidden border border-[#202530] bg-[#202530]">
            {[
              ['50ms', 'Query Latency'],
              ['44+', 'Signal Sources'],
              ['24/7', 'Monitoring'],
            ].map(([value, label]) => (
              <div key={label} className="bg-[#10141b] px-4 py-3 text-center">
                <div className="font-mono text-lg font-semibold tabular-nums text-white">{value}</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[#7d8797]">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SystemPage() {
  const [mounted, setMounted] = useState(false)
  const [stats, setStats] = useState<Stats>({})

  useEffect(() => {
    setMounted(true)

    let cancelled = false
    fetch(`${API_BASE}/public/stats`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setStats(data)
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [])

  const metricTiles = useMemo(
    () => [
      {
        label: 'AI Sources',
        value: formatCount(stats.papers, '2.4M'),
        detail: 'Answer surfaces, research sources, model outputs, and external evidence monitored across markets.',
      },
      {
        label: 'Citation Records',
        value: formatCount(stats.community_posts, '18K'),
        detail: 'Source mentions and evidence trails connected back to prompts, categories, and competitors.',
      },
      {
        label: 'Product Signals',
        value: formatCount(stats.products, '94K'),
        detail: 'Catalog, offer, retailer, and product facts normalized for commerce-aware AI visibility.',
      },
    ],
    [stats]
  )

  const sources = (stats.data_sources && stats.data_sources.length > 0 ? stats.data_sources : fallbackSources).slice(0, 8)

  return (
    <div className="min-h-screen overflow-x-hidden bg-canvas text-ink">
      <PublicNavbar activeHref="/system/" />

      <main id="main-content">
        <section className="relative border-b border-[#1f232c] px-5 pb-16 pt-28 md:px-8 md:pb-24 md:pt-36 lg:px-12">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_75%_28%,rgba(241,90,43,0.12),transparent_24%),radial-gradient(circle_at_20%_18%,rgba(255,255,255,0.055),transparent_20%),linear-gradient(180deg,#090909_0%,#0b0e13_100%)]" />
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.024)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.024)_1px,transparent_1px)] bg-[length:48px_48px]" />

          <div className="mx-auto grid max-w-marketing gap-14 lg:grid-cols-[0.86fr_1.14fr] lg:items-center">
            <div className={`transition-[opacity,transform] duration-500 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`}>
              <div className="brand-eyebrow mb-6">
                <Server className="h-4 w-4" aria-hidden="true" />
                Visibility Infrastructure
              </div>

              <h1 className="max-w-[740px] font-serif text-[44px] font-normal leading-[1.02] text-white md:text-[70px]" style={{ textWrap: 'balance' }}>
                The operating system for answer-engine visibility.
              </h1>

              <p className="mt-6 max-w-[620px] text-[16px] leading-8 text-[#aab3c2] md:text-[18px]">
                Alignment collects messy AI answers, sources, shopping signals, and product facts, then turns them into a normalized commerce graph your teams can inspect, query, and activate.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/contact/"
                  className="inline-flex min-h-[50px] items-center justify-center gap-2 border border-[#3a251d] bg-[#13100f] px-7 text-sm font-medium uppercase tracking-[0.14em] text-[#f0d8ca] transition-colors hover:border-[#f15a2b]/50 hover:bg-[#18110e]"
                >
                  Book Demo <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <a
                  href="#architecture"
                  className="inline-flex min-h-[50px] items-center justify-center gap-2 border border-[#2a3140] bg-transparent px-7 text-sm font-medium uppercase tracking-[0.14em] text-[#c7cfdb] transition-colors hover:border-[#3a4658] hover:text-white"
                >
                  See The Flow <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
              </div>

              <div className="mt-10 grid max-w-[620px] grid-cols-3 gap-px border border-[#202530] bg-[#202530]">
                {metricTiles.map((metric) => (
                  <div key={metric.label} className="bg-[#10141b] p-4">
                    <div className="font-mono text-xl font-semibold tabular-nums text-white">{metric.value}</div>
                    <div className="mt-2 text-[10px] uppercase tracking-[0.14em] text-[#7d8797]">{metric.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className={`transition-[opacity,transform] delay-150 duration-500 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
              <SystemDiagram stats={stats} />
            </div>
          </div>
        </section>

        <section id="architecture" className="scroll-mt-24 px-5 py-16 md:px-8 md:py-24 lg:px-12">
          <div className="mx-auto max-w-marketing">
            <SectionIntro eyebrow="Architecture" title="A four-layer pipeline built for repeatable evidence.">
              Each layer does one job clearly: collect the raw signal, normalize it, model the relationships, and activate the output where teams already work.
            </SectionIntro>

            <div className="grid gap-px overflow-hidden border border-[#222832] bg-[#222832] lg:grid-cols-4">
              {pipelineStages.map((stage, index) => {
                const Icon = stage.icon
                return (
                  <article key={stage.label} className="group relative bg-[#0d1016] p-6">
                    <div className="flex items-center justify-between gap-4">
                      <Icon className="h-6 w-6 text-[#d89a80]" aria-hidden="true" />
                      <span className="font-mono text-[11px] tabular-nums text-[#687386]">0{index + 1}</span>
                    </div>
                    <div className="mt-8 text-[11px] font-medium uppercase tracking-[0.16em] text-[#7d8797]">{stage.meta}</div>
                    <h3 className="mt-3 text-2xl font-medium text-white">{stage.label}</h3>
                    <p className="mt-4 text-sm leading-7 text-[#9da6b5]">{stage.detail}</p>
                    {index < pipelineStages.length - 1 && (
                      <ArrowRight className="absolute right-5 top-6 hidden h-4 w-4 text-[#4a5362] lg:block" aria-hidden="true" />
                    )}
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        <section className="border-y border-[#1f232c] bg-[#0b0e14] px-5 py-16 md:px-8 md:py-24 lg:px-12">
          <div className="mx-auto grid max-w-marketing gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <div className="brand-eyebrow mb-5">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                Data Trust
              </div>
              <h2 className="font-serif text-4xl font-normal leading-[1.04] text-white md:text-5xl" style={{ textWrap: 'balance' }}>
                Visibility data only matters when teams can trust the path behind it.
              </h2>
              <p className="mt-5 text-base leading-7 text-[#aab3c2]">
                The system is designed around stable records, source tiers, and traceable evidence rather than screenshots or one-off prompt runs.
              </p>
            </div>

            <div className="grid gap-px overflow-hidden border border-[#222832] bg-[#222832] md:grid-cols-2">
              {reliabilityControls.map(([title, desc]) => (
                <article key={title} className="bg-[#0d1016] p-5">
                  <CheckCircle2 className="h-5 w-5 text-[#d89a80]" aria-hidden="true" />
                  <h3 className="mt-5 text-lg font-medium text-white">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#9da6b5]">{desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-16 md:px-8 md:py-24 lg:px-12">
          <div className="mx-auto max-w-marketing">
            <SectionIntro eyebrow="Live Graph" title="Metrics that explain the system, not just the scale.">
              The public stats are treated as supporting proof points. The main story is the shape of the pipeline and how every signal becomes usable.
            </SectionIntro>

            <div className="grid gap-4 md:grid-cols-3">
              {metricTiles.map((metric) => (
                <MetricTile key={metric.label} label={metric.label} value={metric.value} detail={metric.detail} />
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-[#1f232c] bg-[#0a0d12] px-5 py-16 md:px-8 md:py-24 lg:px-12">
          <div className="mx-auto max-w-marketing">
            <SectionIntro eyebrow="Activation" title="The graph becomes useful through the channels teams already need.">
              Dashboards are only one surface. Alignment is structured so visibility intelligence can reach pages, APIs, agents, analytics, and operations.
            </SectionIntro>

            <div className="grid gap-px overflow-hidden border border-[#222832] bg-[#222832] md:grid-cols-2 lg:grid-cols-4">
              {outputChannels.map((channel) => {
                const Icon = channel.icon
                return (
                  <article key={channel.label} className="bg-[#0d1016] p-5">
                    <Icon className="h-6 w-6 text-[#d89a80]" aria-hidden="true" />
                    <h3 className="mt-6 text-lg font-medium text-white">{channel.label}</h3>
                    <p className="mt-3 text-sm leading-6 text-[#9da6b5]">{channel.desc}</p>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        <section className="px-5 py-16 md:px-8 md:py-24 lg:px-12">
          <div className="mx-auto max-w-marketing">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="brand-eyebrow mb-5">
                  <Gauge className="h-4 w-4" aria-hidden="true" />
                  Signal Network
                </div>
                <h2 className="max-w-2xl font-serif text-4xl font-normal leading-[1.04] text-white md:text-5xl" style={{ textWrap: 'balance' }}>
                  Sources are organized by reliability before they influence decisions.
                </h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-[#9da6b5]">
                Live deployments can use custom source policies by market, product line, region, and answer surface.
              </p>
            </div>

            <div className="grid gap-px overflow-hidden border border-[#222832] bg-[#222832] sm:grid-cols-2 lg:grid-cols-4">
              {sources.map((source) => (
                <article key={`${source.name}-${source.tier}-${source.type}`} className="flex min-w-0 items-center gap-3 bg-[#0d1016] p-4">
                  <SourceLogo source={source} />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-medium text-white">{source.name}</h3>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[#7d8797]">
                      Tier {source.tier} / {source.type}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-cta px-5 pb-20 text-center md:px-12 md:pb-28">
          <div className="brand-eyebrow mx-auto mb-6">
            <Network className="h-4 w-4" aria-hidden="true" />
            Operate The Graph
          </div>
          <h2 className="font-serif text-[34px] font-normal leading-tight text-white md:text-[46px]" style={{ textWrap: 'balance' }}>
            Turn fragmented AI visibility into infrastructure your teams can run.
          </h2>
          <p className="mx-auto mt-4 max-w-[680px] text-[15px] leading-7 text-[#9fa8b8]">
            Start with the system view, then connect the graph to dashboards, optimized pages, APIs, and agent-facing commerce workflows.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/contact/"
              className="inline-flex min-h-[50px] w-full items-center justify-center gap-2 border border-[#3a251d] bg-[#13100f] px-7 text-sm font-medium uppercase tracking-[0.14em] text-[#f0d8ca] transition-colors hover:border-[#f15a2b]/50 hover:bg-[#18110e] sm:w-auto"
            >
              Book Demo <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/technology/"
              className="inline-flex min-h-[50px] w-full items-center justify-center gap-2 border border-[#2a3140] bg-transparent px-7 text-sm font-medium uppercase tracking-[0.14em] text-[#c7cfdb] transition-colors hover:border-[#3a4658] hover:text-white sm:w-auto"
            >
              View Technology
            </Link>
          </div>
        </section>
      </main>

      <Footer />

      <style jsx>{`
        .system-flow {
          stroke-dasharray: 10 12;
          animation: system-flow 7s linear infinite;
        }
        .system-flow-delay {
          animation-delay: 1.4s;
        }
        .system-bar {
          animation: system-bar 4.5s ease-in-out infinite;
          transform-origin: left;
        }
        @media (prefers-reduced-motion: reduce) {
          .system-flow,
          .system-bar {
            animation: none;
          }
        }
        @keyframes system-flow {
          from {
            stroke-dashoffset: 0;
          }
          to {
            stroke-dashoffset: -88;
          }
        }
        @keyframes system-bar {
          0%,
          100% {
            transform: scaleX(0.62);
            opacity: 0.72;
          }
          50% {
            transform: scaleX(0.92);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
