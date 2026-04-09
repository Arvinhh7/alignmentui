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
    description: 'How easily AI crawlers can discover, parse, and index your content. Covers robots.txt, sitemap, structured data, and page load performance.',
    color: 'from-[#C84B31] to-[#A33820]',
  },
  {
    icon: dimensionIcons.semantic,
    title: 'Semantic Structure',
    description: 'Whether your content uses clear headings, schema markup, and logical hierarchy that LLMs can decompose into citable knowledge graphs.',
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

  const duplicatedPapers = papers.length > 0 ? [...papers, ...papers] : []

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
                  <span className="text-xs font-medium text-ink-3 bg-surface-warm px-2 py-1 rounded-full">Google</span>
                  <span className="text-xs font-medium text-ink-3 bg-surface-warm px-2 py-1 rounded-full">Bing</span>
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
                    {['Cited in AI responses', 'Source authority & trust signals', 'Semantic structure & schema markup', 'Cross-model citation consistency'].map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-white/90">
                        <svg className="w-4 h-4 text-white/80 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        {item}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/20 flex items-center gap-2">
                    <span className="text-xs font-medium text-white/80 bg-white/15 px-2 py-1 rounded-full">ChatGPT</span>
                    <span className="text-xs font-medium text-white/80 bg-white/15 px-2 py-1 rounded-full">Perplexity</span>
                    <span className="text-xs font-medium text-white/80 bg-white/15 px-2 py-1 rounded-full">Gemini</span>
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
                  className="w-[400px] flex-shrink-0 bg-surface rounded-2xl border border-divider-light p-8 shadow-soft"
                >
                  <svg className="w-8 h-8 text-ink-3 mb-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zM0 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151C7.546 6.068 5.983 8.789 5.983 11h4v10H0z" />
                  </svg>
                  <p className="text-ink text-lg font-medium italic leading-relaxed mb-6 line-clamp-3">
                    {`"${paper.title}"`}
                  </p>
                  {paper.summary && (
                    <p className="text-ink-3 text-sm leading-relaxed mb-4 line-clamp-2">{paper.summary}</p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-ink-3">
                    <span className="font-medium">—</span>
                    <span>{paper.source || 'Research Paper'}</span>
                    {paper.published_at && <span>· {new Date(paper.published_at).getFullYear()}</span>}
                  </div>
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
                AI Signal Intake & Path Decision Engine for Generative Engine Optimization.
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
