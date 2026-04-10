'use client'

import Link from 'next/link'
import { useEffect, useState, useRef } from 'react'
import { useLanguage } from '@/lib/LanguageContext'
import LanguageSwitch from '@/components/LanguageSwitch'
import { LogoFull } from '@/components/Logo'

const API_BASE = 'https://alignment-data-collection-production.up.railway.app'

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

function SourceLogo({ name }: { name: string }) {
  const [err, setErr] = useState(false)
  const logoUrl = SOURCE_LOGOS[name]
  if (!logoUrl || err) return null
  return (
    <img
      src={logoUrl}
      alt={name}
      width={18}
      height={18}
      className="w-[18px] h-[18px] rounded object-contain flex-shrink-0"
      onError={() => setErr(true)}
    />
  )
}

interface Paper {
  title: string
  summary?: string
  url?: string
  source?: string
  published_at?: string
  quality_score?: number
}

interface Stats {
  papers?: number
  community_posts?: number
  products?: number
  youtube_videos?: number
  data_sources?: { name: string; tier: number; type: string }[]
}

const dimensionIcons = {
  accessibility: (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  ),
  semantic: (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
    </svg>
  ),
  citability: (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  ),
  risk: (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  reusability: (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
}

const dimensions = [
  {
    icon: dimensionIcons.accessibility,
    title: 'AI Accessibility',
    description: 'How easily AI platforms can find and read your site — including load speed, content discoverability, and how your pages are organized.',
    color: 'from-[#C84B31] to-[#A33820]',
  },
  {
    icon: dimensionIcons.semantic,
    title: 'Semantic Structure',
    description: 'Whether your content is organized clearly enough for AI to understand, quote, and reference with confidence.',
    color: 'from-[#C84B31] to-[#A33820]',
  },
  {
    icon: dimensionIcons.citability,
    title: 'Content Citability',
    description: 'How quotable your content is — TL;DRs, stats, definitions, and unique data points that AI prefers to cite verbatim.',
    color: 'from-[#4A6FA5] to-[#3D5E8C]',
  },
  {
    icon: dimensionIcons.risk,
    title: 'Risk Boundary',
    description: 'Identifying content that could trigger AI safety filters or hallucination — ensuring your brand appears reliably and accurately.',
    color: 'from-[#4A6FA5] to-[#3D5E8C]',
  },
  {
    icon: dimensionIcons.reusability,
    title: 'Reusability',
    description: 'How well your content survives across different AI platforms and query contexts. Measures format adaptability and cross-model performance.',
    color: 'from-[#4A7B5C] to-[#386248]',
  },
]

const featuredPapers: Paper[] = [
  {
    title: 'Introducing SearchGPT: Real-Time Web Search in ChatGPT',
    summary: 'OpenAI details how ChatGPT selects, ranks, and attributes web sources in real-time search responses — the foundation of modern GEO strategy.',
    source: 'OpenAI',
    published_at: '2024-09-01',
    url: 'https://openai.com/index/searchgpt-prototype/',
  },
  {
    title: 'How AI Overviews in Google Search selects and cites sources',
    summary: "Google's engineering team explains the grounding and citation logic behind AI Overviews — how content quality, structured data, and authority signals determine what gets surfaced.",
    source: 'Google AI',
    published_at: '2024-05-14',
    url: 'https://blog.google/products/search/ai-overviews-update-may-2024/',
  },
  {
    title: 'Building an Answer Engine That People Can Trust',
    summary: "Perplexity AI's approach to answer quality: real-time grounding, source diversity, and citation transparency — and what it means for brands that want to appear as cited sources.",
    source: 'Perplexity',
    published_at: '2024-04-01',
    url: 'https://www.perplexity.ai/hub/blog',
  },
  {
    title: "What Is GEO? The Marketer's Guide to AI Search Visibility",
    summary: "A practitioner's breakdown of why traditional SEO falls short in the age of AI answer engines, and which content structures get cited most often by LLMs.",
    source: 'Search Engine Journal',
    published_at: '2024-08-01',
    url: 'https://www.searchenginejournal.com/generative-engine-optimization/',
  },
]

export default function TechnologyPage() {
  const { t } = useLanguage()
  const [mounted, setMounted] = useState(false)
  const [papers, setPapers] = useState<Paper[]>([])
  const [stats, setStats] = useState<Stats>({})
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)

    fetch(`${API_BASE}/public/papers/top?limit=6`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setPapers(data)
        else if (data?.papers) setPapers(data.papers)
      })
      .catch(() => {})

    fetch(`${API_BASE}/public/stats`)
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(() => {})
  }, [])

  const navLinks = [
    { label: t.nav.system, href: '/system/' },
    { label: t.nav.technology, href: '/technology/' },
    { label: t.nav.pricing, href: '/pricing/' },
    { label: t.nav.docs, href: '/docs/' },
    { label: t.nav.insights, href: '/insights/' },
    { label: t.nav.contact, href: '/contact/' },
  ]

  const statCards = [
    { label: 'Papers', value: stats.papers ?? 0 },
    { label: 'Blog Posts', value: stats.community_posts ?? 0 },
    { label: 'GEO Tools', value: stats.products ?? 0 },
    { label: 'Videos', value: stats.youtube_videos ?? 0 },
  ]

  const allPapers = [...featuredPapers, ...papers]
  const duplicatedPapers = allPapers.length > 0 ? [...allPapers, ...allPapers] : []

  return (
    <div className="min-h-screen bg-canvas">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center group hover:opacity-90 transition-opacity">
              <LogoFull width={140} height={45} />
            </Link>

            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((item, i) => (
                <Link
                  key={i}
                  href={item.href}
                  className={`px-3 py-2 text-sm font-medium transition-colors rounded-lg flex items-center gap-1 ${
                    item.href === '/technology/'
                      ? 'text-red-soft bg-red-soft-bg'
                      : 'text-ink-2 hover:text-ink hover:bg-surface-warm'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <LanguageSwitch />
              <Link
                href="/login/"
                className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-ink-inv bg-ink rounded-lg hover:bg-[#2d2d2c] transition-all shadow-soft hover:shadow-medium btn-shine"
              >
                {t.nav.getStarted}
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-stripe-gradient" />
        <div className="absolute inset-0 bg-grid opacity-50" />
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-[#C84B31]/[0.08] rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#C84B31]/[0.08] rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <div
            className={`inline-flex items-center gap-2 px-4 py-2 bg-surface/80 backdrop-blur border border-divider-light/50 rounded-full shadow-soft mb-8 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          >
            <svg className="w-4 h-4 text-red-soft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span className="text-sm text-ink-2 font-medium">Research-Driven GEO</span>
          </div>

          <h1
            className={`text-5xl md:text-6xl lg:text-7xl font-bold text-ink leading-[1.1] mb-6 transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          >
            The Science Behind
            <br />
            <span className="gradient-text">GEO</span>
          </h1>

          <p
            className={`text-lg md:text-xl text-ink-2 mb-10 max-w-2xl mx-auto leading-relaxed transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          >
            {"Alignment's technology is built on cutting-edge research in Generative Engine Optimization — the new discipline of making your brand visible to AI."}
          </p>
        </div>
      </section>

      {/* Two-Layer Technology Architecture */}
      <section className="py-24 bg-surface-warm relative">
        <div className="absolute inset-0 bg-dots opacity-20" />
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-ink rounded-full text-ink-inv text-sm font-medium mb-6">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Platform Architecture
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-ink mb-4">
              Built on <span className="gradient-text">Two Layers</span>
            </h2>
            <p className="text-lg text-ink-2 max-w-2xl mx-auto">
              Most tools only optimize content. Alignment AI operates at both the infrastructure and content layers — ensuring AI can find, read, and cite your brand.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Layer 1 — Visibility Infrastructure */}
            <div className="bg-ink rounded-2xl p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/[0.04] rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-[10px] font-bold text-white/40 font-mono bg-white/10 px-2 py-1 rounded">LAYER 1</span>
                  <div className="w-px h-4 bg-white/20" />
                  <span className="text-xs text-white/50">Infrastructure</span>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-ink-inv">AI Visibility Infrastructure</h3>
                </div>
                <p className="text-white/65 text-sm leading-relaxed mb-8">
                  Works silently behind your existing site — automatically sends the signals that 58 AI platforms need to discover, understand, and cite your brand. No code changes on your side.
                </p>
                <div className="space-y-4">
                  {[
                    {
                      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" /></svg>,
                      label: 'AI Bot Detection & Routing',
                      desc: 'Identifies GPTBot, ClaudeBot, Googlebot-AI and 55+ more AI crawlers',
                    },
                    {
                      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>,
                      label: 'AI-Ready Data Delivery',
                      desc: 'Sends the structured information each AI platform needs to understand your brand',
                    },
                    {
                      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
                      label: 'AI Platform Instructions',
                      desc: 'Tells AI platforms exactly how to find, read, and represent your brand',
                    },
                    {
                      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
                      label: 'Zero Impact on Speed',
                      desc: 'Adds no noticeable delay to your site — runs on a global network for visitors everywhere',
                    },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center text-white/70 flex-shrink-0 mt-0.5">
                        {item.icon}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-ink-inv">{item.label}</p>
                        <p className="text-xs text-white/50 mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Layer 2 — GEO Platform */}
            <div className="bg-surface rounded-2xl p-8 border border-divider relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#C84B31]/[0.04] rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-[10px] font-bold text-ink-3 font-mono bg-surface-warm px-2 py-1 rounded">LAYER 2</span>
                  <div className="w-px h-4 bg-divider-light" />
                  <span className="text-xs text-ink-3">GEO Platform</span>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-red-soft-bg rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-red-soft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-ink">Content Intelligence Platform</h3>
                </div>
                <p className="text-ink-2 text-sm leading-relaxed mb-8">
                  A full-stack platform that audits, optimizes, and monitors how AI models represent your brand across every major answer engine. Built on academic GEO research and trained on 58 AI platform behaviors.
                </p>
                <div className="space-y-4">
                  {[
                    {
                      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>,
                      label: 'Complete AI Visibility Audit',
                      desc: 'Score your brand across 5 dimensions: discoverability, content clarity, citability, accuracy risk, and reach',
                    },
                    {
                      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>,
                      label: 'AI Content Optimization',
                      desc: 'Generate FAQs, articles, and content formats that AI platforms cite more often',
                    },
                    {
                      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>,
                      label: 'Cross-Platform Brand Monitor',
                      desc: 'Track mentions in ChatGPT, Gemini, Perplexity, Claude, and Grok in real time',
                    },
                    {
                      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>,
                      label: 'Citation Analytics & Alerts',
                      desc: 'See which content gets cited and get alerted when mention rates change',
                    },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-7 h-7 bg-surface-warm rounded-lg flex items-center justify-center text-ink-2 flex-shrink-0 mt-0.5">
                        {item.icon}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-ink">{item.label}</p>
                        <p className="text-xs text-ink-3 mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Connector note */}
          <p className="text-center text-sm text-ink-3">
            Layer 1 ensures AI can{' '}
            <span className="font-semibold text-ink">discover</span> your brand.{' '}
            Layer 2 ensures AI wants to{' '}
            <span className="font-semibold text-ink">cite</span> it.
          </p>
        </div>
      </section>

      {/* What is GEO? */}
      <section className="py-24 bg-canvas">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-soft-bg border border-divider rounded-full text-red-soft text-sm font-medium mb-6">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Understanding the Shift
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-ink mb-4">
              What is <span className="gradient-text">GEO?</span>
            </h2>
            <p className="text-lg text-ink-2 max-w-2xl mx-auto">
              The world is shifting from search engines to answer engines. Your optimization strategy must evolve with it.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: Explanation */}
            <div>
              <h3 className="text-2xl font-bold text-ink mb-4">From Search to Answer</h3>
              <p className="text-ink-2 leading-relaxed mb-6">
                Traditional SEO optimizes your content for search engine rankings — getting your page to appear on page one of Google or Bing results. Users still need to click through to your website.
              </p>
              <p className="text-ink-2 leading-relaxed mb-6">
                <strong>Generative Engine Optimization (GEO)</strong> is fundamentally different. It optimizes your content to be cited, quoted, and referenced directly inside AI-generated answers — from ChatGPT, Perplexity, Gemini, and other large language model interfaces.
              </p>
              <p className="text-ink-2 leading-relaxed">
                With GEO, the goal is not a ranking position — {"it's"} a <strong>citation</strong>. When an AI answers a {"user's"} question, your brand should be the source it references.
              </p>
            </div>

            {/* Right: Visual Comparison */}
            <div className="space-y-4">
              {/* SEO Card */}
              <div className="bg-surface rounded-2xl border border-divider-light p-6 shadow-soft">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-surface-muted rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-ink-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-ink">Traditional SEO</h4>
                    <p className="text-xs text-ink-3">Optimizing for search rankings</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {['Google page 1 ranking', 'Click-through rate optimization', 'Keyword density & backlinks', 'Meta tags & site speed'].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-ink-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-surface-muted" />
                      {item}
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-divider-light flex items-center gap-2">
                  {[
                    { name: 'Google', logo: '/logos/google.png' },
                    { name: 'Bing',   logo: '/logos/bing.png' },
                  ].map(p => (
                    <span key={p.name} className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-3 bg-surface-warm px-2 py-1 rounded-full">
                      <img src={p.logo} alt={p.name} width={12} height={12} className="w-3 h-3 object-contain rounded-sm flex-shrink-0" />
                      {p.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* GEO Card */}
              <div className="bg-ink rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold">GEO — Generative Engine Optimization</h4>
                      <p className="text-xs text-white/70">Optimizing for AI-generated answers</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {['Cited in AI responses', 'Source authority & trust signals', 'Clear content structure', 'Consistent citation across AI platforms'].map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-white/90">
                        <svg className="w-4 h-4 text-white/80 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        {item}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/20 flex items-center gap-2">
                    {[
                      { name: 'ChatGPT',   logo: '/logos/openai.png' },
                      { name: 'Perplexity', logo: '/logos/perplexity.png' },
                      { name: 'Gemini',     logo: '/logos/gemini.png' },
                    ].map(p => (
                      <span key={p.name} className="inline-flex items-center gap-1.5 text-xs font-medium text-white/80 bg-white/15 px-2 py-1 rounded-full">
                        <img src={p.logo} alt={p.name} width={12} height={12} className="w-3 h-3 object-contain rounded-sm flex-shrink-0" />
                        {p.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5-Dimension Methodology */}
      <section className="py-24 relative">
        <div className="absolute inset-0 bg-dots opacity-30" />
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-soft-bg border border-divider rounded-full text-red-soft text-sm font-medium mb-6">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              Our Framework
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-ink mb-4">
              Our 5-Dimension <span className="gradient-text">Methodology</span>
            </h2>
            <p className="text-lg text-ink-2 max-w-2xl mx-auto">
              Every GEO audit and optimization is measured across five critical dimensions that determine how AI platforms perceive your content.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dimensions.map((dim, i) => (
              <div
                key={i}
                className={`group relative bg-surface rounded-2xl p-6 card-interactive opacity-0 animate-fade-in-up ${i === 4 ? 'md:col-span-2 lg:col-span-1' : ''}`}
                style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'forwards' }}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 bg-surface-warm rounded-2xl flex items-center justify-center text-ink-2 group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                    {dim.icon}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-ink-3 font-mono">D{i + 1}</span>
                    <h3 className="text-lg font-semibold text-ink">{dim.title}</h3>
                  </div>
                </div>
                <p className="text-ink-3 text-sm leading-relaxed">{dim.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Research We Track */}
      <section className="py-24 bg-canvas overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 mb-12">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-soft-bg border border-divider rounded-full text-red-soft text-sm font-medium mb-6">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Academic Foundations
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-ink mb-4">
              Research We <span className="gradient-text">Track</span>
            </h2>
            <p className="text-lg text-ink-2 max-w-2xl mx-auto">
              Our methodology is grounded in the latest academic research on generative AI search behavior and content optimization.
            </p>
          </div>
        </div>

        {/* Scrolling Carousel */}
        {duplicatedPapers.length > 0 && (
          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-canvas to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-canvas to-transparent z-10 pointer-events-none" />

            <div
              ref={scrollRef}
              className="flex gap-6 animate-scroll-left"
              style={{
                width: 'max-content',
              }}
            >
              {duplicatedPapers.map((paper, i) => (
                <div
                  key={`paper-${i}`}
                  className="w-[400px] flex-shrink-0 bg-surface rounded-2xl border border-divider-light p-7 shadow-soft hover:shadow-medium transition-shadow"
                >
                  {/* Source header */}
                  <div className="flex items-center gap-2 mb-5">
                    <SourceLogo name={paper.source || ''} />
                    <span className="text-xs font-semibold text-ink-2">{paper.source || 'Research'}</span>
                    {paper.published_at && (
                      <span className="ml-auto text-[11px] text-ink-3 bg-surface-warm px-2 py-0.5 rounded-full">
                        {new Date(paper.published_at).getFullYear()}
                      </span>
                    )}
                  </div>
                  {/* Quote icon */}
                  <svg className="w-6 h-6 text-ink-3 mb-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zM0 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151C7.546 6.068 5.983 8.789 5.983 11h4v10H0z" />
                  </svg>
                  <p className="text-ink text-base font-semibold leading-snug mb-3 line-clamp-2">
                    {paper.title}
                  </p>
                  {paper.summary && (
                    <p className="text-ink-3 text-sm leading-relaxed line-clamp-3">{paper.summary}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {papers.length === 0 && (
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-surface rounded-2xl border border-divider-light p-8 shadow-soft animate-pulse">
                  <div className="h-8 w-8 bg-surface-muted rounded mb-4" />
                  <div className="h-5 bg-surface-muted rounded mb-2 w-full" />
                  <div className="h-5 bg-surface-muted rounded mb-2 w-3/4" />
                  <div className="h-4 bg-surface-warm rounded w-1/3 mt-6" />
                </div>
              ))}
            </div>
          </div>
        )}

        <style jsx>{`
          @keyframes scroll-left {
            0% {
              transform: translateX(0);
            }
            100% {
              transform: translateX(-50%);
            }
          }
          .animate-scroll-left {
            animation: scroll-left 40s linear infinite;
          }
          .animate-scroll-left:hover {
            animation-play-state: paused;
          }
        `}</style>
      </section>

      {/* Powered by Data */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-stripe-gradient" />
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-soft-bg0/[0.07] rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-soft-bg border border-divider rounded-full text-red-soft text-sm font-medium mb-6">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
              Data Infrastructure
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-ink mb-4">
              Powered by <span className="gradient-text">Data</span>
            </h2>
            <p className="text-lg text-ink-2 max-w-2xl mx-auto">
              Our research engine continuously ingests and processes data from the most authoritative sources in AI and GEO.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
            {statCards.map((card, i) => (
              <div
                key={i}
                className="bg-surface/70 backdrop-blur-sm border border-divider-light/60 rounded-2xl p-6 shadow-soft text-center opacity-0 animate-fade-in-up"
                style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'forwards' }}
              >
                
                <div className="text-4xl md:text-5xl font-bold font-mono text-ink mb-2">
                  {card.value > 0 ? card.value.toLocaleString() : '—'}
                </div>
                <div className="text-sm text-ink-3">{card.label}</div>
              </div>
            ))}
          </div>

          {/* Source Logos */}
          {stats.data_sources && stats.data_sources.length > 0 && (
            <div>
              <p className="text-center text-sm text-ink-3 mb-6 uppercase tracking-wider font-medium">
                Data Sources We Monitor
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {stats.data_sources.map((source, i) => (
                  <div
                    key={i}
                    className="px-4 py-2 bg-surface rounded-lg border border-divider-light text-sm font-medium text-ink-2 hover:border-divider hover:text-red-soft transition-colors flex items-center gap-2"
                  >
                    <SourceLogo name={source.name} />
                    {source.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-surface-warm relative">
        <div className="absolute inset-0 bg-dots opacity-30" />
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-surface border border-divider-light rounded-full text-ink-2 text-sm font-medium mb-6 shadow-soft">
            <svg className="w-4 h-4 text-red-soft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Ready to Optimize
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-ink mb-6">
            See GEO in <span className="gradient-text">Action</span>
          </h2>
          <p className="text-lg text-ink-2 mb-10 max-w-2xl mx-auto">
            Run a free 5-dimension audit on your website and see exactly how AI platforms perceive your content today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login/"
              className="group inline-flex items-center justify-center gap-2 bg-ink hover:bg-[#2d2d2c] text-ink-inv font-semibold px-8 py-4 rounded-xl transition-all shadow-large hover:shadow-glow btn-shine"
            >
              {t.nav.getStarted}
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link
              href="/pricing/"
              className="inline-flex items-center justify-center gap-2 bg-surface border border-divider-light hover:border-divider text-ink-2 font-semibold px-8 py-4 rounded-xl transition-all shadow-soft hover:shadow-medium"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface border-t border-divider-light py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="md:col-span-1">
              <div className="mb-4">
                <LogoFull width={160} height={100} />
              </div>
              <p className="text-ink-3 text-sm leading-relaxed">
                Get your brand seen and cited by AI — automatically.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-ink mb-4">Product</h4>
              <ul className="space-y-3 text-sm text-ink-2">
                <li><Link href="/system/" className="hover:text-ink transition-colors">System</Link></li>
                <li><Link href="/technology/" className="hover:text-ink transition-colors">Technology</Link></li>
                <li><Link href="/pricing/" className="hover:text-ink transition-colors">Pricing</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-ink mb-4">Resources</h4>
              <ul className="space-y-3 text-sm text-ink-2">
                <li><Link href="/docs/" className="hover:text-ink transition-colors">Docs</Link></li>
                <li><Link href="/insights/" className="hover:text-ink transition-colors">Insights</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-ink mb-4">Contact</h4>
              <ul className="space-y-3 text-sm text-ink-2">
                <li><a href="mailto:contact@alignmenttech.ai" className="hover:text-ink transition-colors">Send Email</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-divider-light text-center text-ink-3 text-sm">
            &copy; {new Date().getFullYear()} Alignment AI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
