'use client'

import Link from 'next/link'
import { useEffect, useState, useRef } from 'react'
import { useLanguage } from '@/lib/LanguageContext'
import { LogoFull } from '@/components/Logo'
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

function AnimatedCounter({ target, duration = 2000 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const started = useRef(false)

  useEffect(() => {
    if (target <= 0 || started.current) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true
          const startTime = performance.now()
          const step = (now: number) => {
            const elapsed = now - startTime
            const progress = Math.min(elapsed / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            setCount(Math.floor(eased * target))
            if (progress < 1) requestAnimationFrame(step)
          }
          requestAnimationFrame(step)
        }
      },
      { threshold: 0.3 }
    )

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [target, duration])

  return <span ref={ref}>{count.toLocaleString()}</span>
}

const pipelineStages = [
  {
    key: 'collect',
    label: 'COLLECT',
    color: 'from-[#C84B31] to-[#A33820]',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
    description: 'AI answers, category topics, citation domains, shopping surfaces, product feeds, and broker events',
  },
  {
    key: 'process',
    label: 'PROCESS',
    color: 'from-[#C84B31] to-[#A33820]',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    description: 'Entity normalization, brand/product deduplication, citation canonicalization, and quality gates',
  },
  {
    key: 'store',
    label: 'STORE',
    color: 'from-[#4A6FA5] to-[#3D5E8C]',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
      </svg>
    ),
    description: 'A durable AI commerce graph for brands, products, sources, prompts, offers, and quotes',
  },
  {
    key: 'deliver',
    label: 'DELIVER',
    color: 'from-[#4A7B5C] to-[#386248]',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    description: 'Dashboards, Visibility Proxy, MCP/API, Product Agents, and Broker telemetry',
  },
]

const techStack = [
  { name: 'Python',         logo: '/logos/python.png' },
  { name: 'FastAPI',        logo: '/logos/fastapi.png' },
  { name: 'Supabase',       logo: '/logos/supabase.png' },
  { name: 'Next.js',        logo: '/logos/nextjs.png' },
  { name: 'Railway',        logo: '/logos/railway.png' },
  { name: 'Tailwind CSS',   logo: '/logos/tailwindcss.png' },
  { name: 'Vercel',         logo: '/logos/vercel.png' },
  { name: 'GitHub Actions', logo: '/logos/github.png' },
]

const SOURCE_LOGOS: Record<string, string> = {
  'arXiv':                  '/logos/arxiv.png',
  'Semantic Scholar':       '/logos/semanticscholar.png',
  'Papers with Code':       '/logos/paperswithcode.png',
  'OpenReview':             '/logos/openreview.png',
  'OpenAI':                 '/logos/openai.png',
  'Google AI':              '/logos/google.png',
  'Anthropic':              '/logos/anthropic.png',
  'Perplexity':             '/logos/perplexity.png',
  'AWS AI':                 '/logos/aws.png',
  'Google Cloud':           '/logos/googlecloud.png',
  'GitHub':                 '/logos/github.png',
  'HuggingFace':            '/logos/huggingface.png',
  'Search Engine Journal':  '/logos/searchenginejournal.png',
  'Moz':                    '/logos/moz.png',
  'Ahrefs':                 '/logos/ahrefs.png',
  'Medium AI':              '/logos/medium.png',
  'YouTube':                '/logos/youtube.png',
  'Google Drive':           '/logos/googledrive.png',
}

function SourceIcon({ name }: { name: string }) {
  const [err, setErr] = useState(false)
  const logoUrl = SOURCE_LOGOS[name]

  if (!logoUrl || err) {
    return null
  }

  return (
    <img
      src={logoUrl}
      alt={name}
      width={20}
      height={20}
      className="w-5 h-5 rounded object-contain flex-shrink-0"
      onError={() => setErr(true)}
    />
  )
}

function TechLogo({ name, logo }: { name: string; logo: string }) {
  const [err, setErr] = useState(false)

  if (err) {
    return (
      <span className="w-12 h-12 mx-auto mb-3 bg-surface-muted rounded-xl flex items-center justify-center text-ink-3 text-lg font-bold">
        {name.charAt(0)}
      </span>
    )
  }

  return (
    <img
      src={logo}
      alt={name}
      width={48}
      height={48}
      className="w-12 h-12 mx-auto mb-3 rounded-xl object-contain group-hover:scale-110 transition-transform duration-300"
      onError={() => setErr(true)}
    />
  )
}

function tierBadge(tier: number) {
  if (tier === 1) return { label: 'Tier 1', bg: 'bg-surface-warm', text: 'text-caution', border: 'border-divider' }
  if (tier === 2) return { label: 'Tier 2', bg: 'bg-surface-warm', text: 'text-ink-2', border: 'border-divider-light' }
  return { label: 'Tier 3', bg: 'bg-surface-warm', text: 'text-caution', border: 'border-divider' }
}

function typeTag(type: string) {
  const map: Record<string, string> = {
    papers: 'bg-surface-warm text-ink-2',
    blog: 'bg-surface-warm text-ink-2',
    tools: 'bg-sage-bg text-sage',
    video: 'bg-red-soft-bg text-red-soft',
    manual: 'bg-surface-muted text-ink-3',
  }
  return map[type] || 'bg-surface-muted text-ink-3'
}

export default function SystemPage() {
  const { t } = useLanguage()
  const [mounted, setMounted] = useState(false)
  const [stats, setStats] = useState<Stats>({})

  useEffect(() => {
    setMounted(true)
    fetch(`${API_BASE}/public/stats`)
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(() => {})
  }, [])

  const metricCards = [
    {
      label: 'AI Sources',
      value: stats.papers ?? 0,
      icon: (
        <svg className="w-8 h-8 text-ink-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      label: 'Citations',
      value: stats.community_posts ?? 0,
      icon: (
        <svg className="w-8 h-8 text-caution" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      label: 'Products',
      value: stats.products ?? 0,
      icon: (
        <svg className="w-8 h-8 text-ink-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      label: 'Answer Records',
      value: stats.youtube_videos ?? 0,
      icon: (
        <svg className="w-8 h-8 text-red-soft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'Catalog Files',
      value: stats.drive_files ?? 0,
      icon: (
        <svg className="w-8 h-8 text-sage" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      ),
    },
    {
      label: 'Graph Records',
      value: stats.total ?? 0,
      icon: (
        <svg className="w-8 h-8 text-ink-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
        </svg>
      ),
    },
  ]

  const groupedSources = {
    1: (stats.data_sources ?? []).filter(s => s.tier === 1),
    2: (stats.data_sources ?? []).filter(s => s.tier === 2),
    3: (stats.data_sources ?? []).filter(s => s.tier === 3),
  }

  return (
    <div className="min-h-screen bg-canvas">
      {/* Navigation */}
      <PublicNavbar activeHref="/system/" />

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-stripe-gradient" />
        <div className="absolute inset-0 bg-grid opacity-50" />
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-red-soft-bg0/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-surface-warm0/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <div
            className={`inline-flex items-center gap-2 px-4 py-2 bg-surface/80 backdrop-blur border border-divider-light/50 rounded-full shadow-soft mb-8 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          >
            <svg className="w-4 h-4 text-red-soft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
            </svg>
            <span className="text-sm text-ink-2 font-medium">AI Commerce Graph</span>
          </div>

          <h1
            className={`text-5xl md:text-6xl lg:text-7xl font-bold text-ink leading-[1.1] mb-6 transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          >
            System
            <br />
            <span className="gradient-text">for AI Commerce</span>
          </h1>

          <p
            className={`text-lg md:text-xl text-ink-2 mb-10 max-w-2xl mx-auto leading-relaxed transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          >
            The data system behind Alignment: collect AI answer, source, shopping, product, and broker signals; clean them into a commerce graph; deliver them to dashboards, proxies, APIs, and agents.
          </p>
        </div>
      </section>

      {/* Data Pipeline Architecture */}
      <section className="py-24 bg-canvas">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-soft-bg border border-divider rounded-full text-red-soft text-sm font-medium mb-6">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              How It Works
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-ink mb-4">
              AI Commerce Graph <span className="gradient-text">Architecture</span>
            </h2>
            <p className="text-lg text-ink-2 max-w-2xl mx-auto">
              From messy AI outputs to normalized market intelligence and machine-callable commerce infrastructure.
            </p>
          </div>

          {/* Pipeline Flow */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 items-stretch">
            {pipelineStages.map((stage, i) => (
              <div key={stage.key} className="relative flex flex-col items-center">
                <div className="w-full bg-surface rounded-2xl border border-divider-light p-6 shadow-soft text-center hover:shadow-medium transition-shadow duration-300">
                  <div className="w-14 h-14 mx-auto mb-4 bg-surface-warm rounded-2xl flex items-center justify-center text-ink-2">
                    {stage.icon}
                  </div>
                  <span className="inline-block px-3 py-1 bg-surface-muted rounded-full text-xs font-bold text-ink-2 tracking-wider mb-3">
                    {stage.label}
                  </span>
                  <p className="text-sm text-ink-3 leading-relaxed">{stage.description}</p>
                </div>

                {/* Arrow connector (hidden on last item) */}
                {i < pipelineStages.length - 1 && (
                  <>
                    {/* Desktop arrow */}
                    <div className="hidden lg:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 items-center justify-center w-8 h-8 bg-surface border border-divider-light rounded-full shadow-sm">
                      <svg className="w-4 h-4 text-ink-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                    {/* Mobile arrow */}
                    <div className="flex lg:hidden items-center justify-center w-8 h-8 my-2">
                      <svg className="w-4 h-4 text-ink-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Data Metrics */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-stripe-gradient" />
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-soft-bg0/[0.07] rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-soft-bg border border-divider rounded-full text-red-soft text-sm font-medium mb-6">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Real-Time Stats
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-ink mb-4">
              Commerce Graph <span className="gradient-text">Metrics</span>
            </h2>
            <p className="text-lg text-ink-2 max-w-2xl mx-auto">
              Our pipeline continuously ingests data — here are the latest numbers, updated in real time.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-6">
            {metricCards.map((card, i) => (
              <div
                key={i}
                className="bg-surface/70 backdrop-blur-sm border border-divider-light/60 rounded-2xl p-6 lg:p-8 shadow-soft text-center opacity-0 animate-fade-in-up"
                style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'forwards' }}
              >
                <div className="flex justify-center mb-4">{card.icon}</div>
                <div className="text-4xl md:text-5xl font-bold font-mono text-ink mb-2">
                  {card.value > 0 ? <AnimatedCounter target={card.value} /> : '—'}
                </div>
                <div className="text-sm text-ink-3 font-medium">{card.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Data Sources */}
      <section className="py-24 bg-canvas">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-soft-bg border border-divider rounded-full text-red-soft text-sm font-medium mb-6">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Intelligence Network
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-ink mb-4">
              Signal <span className="gradient-text">Sources</span>
            </h2>
            <p className="text-lg text-ink-2 max-w-2xl mx-auto">
              We monitor and ingest from authoritative sources across the AI ecosystem, organized by reliability tier.
            </p>
          </div>

          {stats.data_sources && stats.data_sources.length > 0 ? (
            <div className="space-y-10">
              {([1, 2, 3] as const).map(tier => {
                const sources = groupedSources[tier]
                if (sources.length === 0) return null
                const badge = tierBadge(tier)
                return (
                  <div key={tier}>
                    <div className="flex items-center gap-3 mb-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 ${badge.bg} ${badge.text} border ${badge.border} rounded-full text-xs font-bold tracking-wider`}>
                        {tier === 1 && (
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        )}
                        {badge.label}
                      </span>
                      <div className="flex-1 h-px bg-surface-muted" />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {sources.map((source, j) => (
                        <div
                          key={j}
                          className="bg-surface rounded-xl border border-divider-light p-4 shadow-soft hover:shadow-medium hover:border-divider transition-all duration-200 flex items-center gap-2.5"
                        >
                          <SourceIcon name={source.name} />
                          <span className="text-sm font-medium text-ink flex-1 min-w-0 truncate">{source.name}</span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0 ${typeTag(source.type)}`}>
                            {source.type}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="bg-surface rounded-xl border border-divider-light p-4 animate-pulse">
                  <div className="h-4 bg-surface-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-surface-warm rounded w-1/3" />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Technical Stack */}
      <section className="py-24 relative">
        <div className="absolute inset-0 bg-dots opacity-30" />
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-soft-bg border border-divider rounded-full text-red-soft text-sm font-medium mb-6">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              Built With
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-ink mb-4">
              Technical <span className="gradient-text">Stack</span>
            </h2>
            <p className="text-lg text-ink-2 max-w-2xl mx-auto">
              Modern, battle-tested technologies powering every layer of the pipeline.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {techStack.map((tech, i) => (
              <div
                key={i}
                className="group bg-surface rounded-2xl border border-divider-light p-6 shadow-soft hover:shadow-medium transition-all duration-300 text-center opacity-0 animate-fade-in-up"
                style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'forwards' }}
              >
                <TechLogo name={tech.name} logo={tech.logo} />
                <span className="text-sm font-semibold text-ink">{tech.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-surface-warm relative">
        <div className="absolute inset-0 bg-dots opacity-30" />
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-surface border border-divider-light rounded-full text-ink-2 text-sm font-medium mb-6 shadow-soft">
            <svg className="w-4 h-4 text-red-soft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            Start Exploring
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-ink mb-6">
            Explore the <span className="gradient-text">AI Commerce Graph</span>
          </h2>
          <p className="text-lg text-ink-2 mb-10 max-w-2xl mx-auto">
            Dive into the latest GEO research, AI news, and intelligence curated by our pipeline — updated daily.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/insights/"
              className="group inline-flex items-center justify-center gap-2 bg-ink hover:bg-[#2d2d2c] text-ink-inv font-semibold px-8 py-4 rounded-xl transition-all shadow-large hover:shadow-glow btn-shine"
            >
              Explore Insights
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link
              href="/technology/"
              className="inline-flex items-center justify-center gap-2 bg-surface border border-divider-light hover:border-divider text-ink-2 font-semibold px-8 py-4 rounded-xl transition-all shadow-soft hover:shadow-medium"
            >
              Learn the Science
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  )
}
