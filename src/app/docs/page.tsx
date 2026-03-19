'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useLanguage } from '@/lib/LanguageContext'
import LanguageSwitch from '@/components/LanguageSwitch'
import { LogoFull } from '@/components/Logo'

const API_BASE = 'https://alignment-data-collection-production.up.railway.app'

interface Tool {
  name: string
  description?: string
  url?: string
  source?: string
  stars?: number
  tags?: string[]
  is_open_source?: boolean
}

const gettingStartedCards = [
  {
    href: '/technology/',
    title: 'What is GEO?',
    description: 'Learn how Generative Engine Optimization works and why it matters for your brand visibility in AI-generated answers.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    href: '/insights/',
    title: 'See the Data',
    description: 'Explore curated papers, blog posts, and videos from the GEO research landscape — updated every 6 hours.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    href: '/system/',
    title: 'System Overview',
    description: 'See how Alignment\'s AI Signal Intake & Path Decision Engine monitors, scores, and optimizes your content.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
  },
  {
    href: '/docs/mcp-setup/',
    title: 'MCP Setup Guide',
    description: 'Connect Claude Desktop, Cursor, or Windsurf to query your AI Visibility data with natural language. 5-minute setup.',
    badge: 'New',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
      </svg>
    ),
  },
]

const quickGuideSteps = [
  {
    number: '01',
    title: 'Understand AI Search',
    description: 'AI engines like ChatGPT and Perplexity generate answers by citing web sources. Unlike traditional search, users never see a list of links — they see a synthesized answer with inline citations. Your goal is to become one of those cited sources.',
  },
  {
    number: '02',
    title: 'Optimize Content Structure',
    description: 'Use clear headings, schema markup, FAQ sections, and concise definitions that LLMs can easily parse. Structure your content so AI can extract quotable snippets — stats, definitions, step-by-step instructions, and unique data points.',
  },
  {
    number: '03',
    title: 'Build Authority Signals',
    description: 'Get cited by reputable sources, maintain consistent NAP data, publish original research, and ensure your content is factually accurate. AI models weigh source authority heavily when selecting citations.',
  },
  {
    number: '04',
    title: 'Monitor & Iterate',
    description: 'Track your visibility across AI platforms using Alignment\'s dashboard. Monitor which queries cite your content, how your citation share changes over time, and where competitors are gaining ground.',
  },
]

const apiEndpoints = [
  {
    method: 'GET',
    path: '/public/insights',
    description: 'Fetch latest GEO content',
    curl: `curl -X GET "${API_BASE}/public/insights?page=1&page_size=10"`,
  },
  {
    method: 'GET',
    path: '/public/stats',
    description: 'Get real-time data metrics',
    curl: `curl -X GET "${API_BASE}/public/stats"`,
  },
  {
    method: 'GET',
    path: '/public/papers/top',
    description: 'Top-rated research papers',
    curl: `curl -X GET "${API_BASE}/public/papers/top?limit=5"`,
  },
  {
    method: 'GET',
    path: '/public/tools/top',
    description: 'Popular GEO tools',
    curl: `curl -X GET "${API_BASE}/public/tools/top?limit=10"`,
  },
]

const faqItems = [
  {
    question: 'What is GEO?',
    answer: 'Generative Engine Optimization (GEO) is the practice of optimizing your online content so that AI-powered answer engines — like ChatGPT, Perplexity, and Gemini — cite, quote, and reference your brand when responding to user queries. Unlike traditional SEO which targets search rankings, GEO targets citation placement inside AI-generated answers.',
  },
  {
    question: 'How is GEO different from SEO?',
    answer: 'SEO focuses on ranking your pages in traditional search engine results (Google, Bing). GEO focuses on getting your content cited in AI-generated answers. SEO optimizes for click-through rates and keyword rankings; GEO optimizes for source authority, content structure, semantic clarity, and citability — the factors AI models use when choosing which sources to reference.',
  },
  {
    question: 'What data sources does Alignment track?',
    answer: 'Alignment continuously monitors academic papers, industry blogs, YouTube content, open-source GEO tools, and AI platform behaviors. Our automated pipeline ingests data from sources like arXiv, HuggingFace, GitHub, major marketing blogs, and AI research labs to keep our knowledge base current.',
  },
  {
    question: 'How often is data updated?',
    answer: 'Every 6 hours via our automated data collection pipeline. New papers, blog posts, tools, and videos are ingested, processed, and made available through our API and dashboard in near real-time.',
  },
  {
    question: 'Is the API free to use?',
    answer: 'Yes — all public endpoints (/public/*) are free for read access with no authentication required. These endpoints provide access to our curated GEO knowledge base including papers, insights, tools, and aggregate statistics.',
  },
  {
    question: 'How do I get started?',
    answer: 'Start by exploring our Technology page to understand the 5-dimension GEO methodology. Then check the Insights page for the latest research. When you\'re ready, sign up for a free trial to run your first AI visibility audit and start optimizing your content for generative engines.',
  },
]

export default function DocsPage() {
  const { t } = useLanguage()
  const [mounted, setMounted] = useState(false)
  const [tools, setTools] = useState<Tool[]>([])
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  useEffect(() => {
    setMounted(true)

    fetch(`${API_BASE}/public/tools/top?limit=10`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setTools(data)
        else if (data?.tools) setTools(data.tools)
      })
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
              {navLinks.map((item, i) => (
                <Link
                  key={i}
                  href={item.href}
                  className={`px-3 py-2 text-sm font-medium transition-colors rounded-lg flex items-center gap-1 ${
                    item.href === '/docs/'
                      ? 'text-red-600 bg-red-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
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
                className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-red-600 rounded-lg hover:from-red-600 hover:to-red-700 transition-all shadow-soft hover:shadow-medium btn-shine"
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
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <div
            className={`inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur border border-gray-200/50 rounded-full shadow-soft mb-8 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          >
            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span className="text-sm text-gray-700 font-medium">Documentation</span>
          </div>

          <h1
            className={`text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 leading-[1.1] mb-6 transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          >
            Knowledge Base
            <br />
            <span className="gradient-text">& Resources</span>
          </h1>

          <p
            className={`text-lg md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          >
            Everything you need to master Generative Engine Optimization
          </p>
        </div>
      </section>

      {/* Getting Started */}
      <section className="py-24 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-100 rounded-full text-red-600 text-sm font-medium mb-6">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Quick Links
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Getting <span className="gradient-text">Started</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              New to GEO? Start here to understand the fundamentals and explore what Alignment offers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {gettingStartedCards.map((card, i) => (
              <Link
                key={i}
                href={card.href}
                className="group relative bg-white rounded-2xl border border-gray-200 p-8 shadow-soft hover:shadow-medium hover:border-red-200 transition-all duration-300"
              >
                {'badge' in card && card.badge && (
                  <span className="absolute top-4 right-4 px-2 py-0.5 bg-red-500 text-white text-xs font-semibold rounded-full">
                    {card.badge}
                  </span>
                )}
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform duration-300">
                  {card.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{card.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-6">{card.description}</p>
                <span className="inline-flex items-center gap-1 text-red-600 text-sm font-medium group-hover:gap-2 transition-all">
                  Learn More
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* GEO Quick Guide */}
      <section className="py-24 relative">
        <div className="absolute inset-0 bg-dots opacity-30" />
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-100 rounded-full text-red-600 text-sm font-medium mb-6">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              Step-by-Step
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              GEO <span className="gradient-text">Quick Guide</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Four essential steps to start optimizing your content for AI-generated answers.
            </p>
          </div>

          <div className="space-y-6 max-w-4xl mx-auto">
            {quickGuideSteps.map((step, i) => (
              <div
                key={i}
                className="flex gap-6 items-start opacity-0 animate-fade-in-up"
                style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'forwards' }}
              >
                <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg font-mono">{step.number}</span>
                </div>
                <div className="flex-1 bg-white rounded-2xl border border-gray-200 p-6 shadow-soft">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GEO Tools & Resources */}
      <section className="py-24 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-100 rounded-full text-red-600 text-sm font-medium mb-6">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Community Tools
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              GEO Tools & <span className="gradient-text">Resources</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Top-rated open-source tools and resources from the GEO community, ranked by popularity.
            </p>
          </div>

          {tools.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tools.map((tool, i) => (
                <div
                  key={`${tool.name}-${i}`}
                  className="bg-white rounded-2xl border border-gray-200 p-6 shadow-soft hover:shadow-medium hover:border-gray-300 transition-all duration-300 flex flex-col"
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900 leading-tight">{tool.name}</h3>
                    {tool.is_open_source && (
                      <span className="flex-shrink-0 ml-2 px-2 py-0.5 bg-green-50 border border-green-200 text-green-700 text-xs font-medium rounded-full">
                        Open Source
                      </span>
                    )}
                  </div>
                  {tool.description && (
                    <p className="text-gray-500 text-sm leading-relaxed mb-4 line-clamp-3 flex-1">
                      {tool.description}
                    </p>
                  )}
                  <div className="mt-auto">
                    {tool.tags && tool.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {tool.tags.slice(0, 4).map((tag, j) => (
                          <span
                            key={j}
                            className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      {typeof tool.stars === 'number' && (
                        <span className="text-sm text-gray-400 font-medium">
                          <span className="text-amber-400">&#9733;</span> {tool.stars.toLocaleString()}
                        </span>
                      )}
                      {tool.url && (
                        <a
                          href={tool.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-red-600 text-sm font-medium hover:gap-2 transition-all"
                        >
                          View on GitHub
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-soft animate-pulse">
                  <div className="flex items-start justify-between mb-4">
                    <div className="h-5 bg-gray-200 rounded w-2/3" />
                    <div className="h-5 w-16 bg-gray-100 rounded-full" />
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="h-4 bg-gray-100 rounded w-full" />
                    <div className="h-4 bg-gray-100 rounded w-full" />
                    <div className="h-4 bg-gray-100 rounded w-2/3" />
                  </div>
                  <div className="flex gap-1.5 mb-4">
                    <div className="h-5 w-12 bg-gray-100 rounded-full" />
                    <div className="h-5 w-14 bg-gray-100 rounded-full" />
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="h-4 w-12 bg-gray-100 rounded" />
                    <div className="h-4 w-24 bg-gray-200 rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* API Reference */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-stripe-gradient" />
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-red-500/[0.07] rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-100 rounded-full text-red-600 text-sm font-medium mb-6">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              Developer API
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              API <span className="gradient-text">Reference</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Access our GEO knowledge base programmatically. All public endpoints are free and require no authentication.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {apiEndpoints.map((ep, i) => (
              <div
                key={i}
                className="bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-6 shadow-soft"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-md font-mono">
                    {ep.method}
                  </span>
                  <code className="text-sm font-mono text-gray-800 font-medium">{ep.path}</code>
                </div>
                <p className="text-gray-500 text-sm mb-4">{ep.description}</p>
                <div className="bg-gray-900 rounded-xl p-4 overflow-x-auto">
                  <code className="text-green-400 text-xs font-mono whitespace-pre">{ep.curl}</code>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 bg-gray-50/50">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-100 rounded-full text-red-600 text-sm font-medium mb-6">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Common Questions
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Frequently Asked <span className="gradient-text">Questions</span>
            </h2>
          </div>

          <div className="space-y-3">
            {faqItems.map((faq, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-gray-200 shadow-soft overflow-hidden transition-all duration-300"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-5 text-left"
                >
                  <span className="text-base font-semibold text-gray-900 pr-4">{faq.question}</span>
                  <svg
                    className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-300 ${openFaq === i ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    openFaq === i ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <p className="px-6 pb-5 text-gray-500 text-sm leading-relaxed">{faq.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative">
        <div className="absolute inset-0 bg-dots opacity-30" />
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-gray-700 text-sm font-medium mb-6 shadow-soft">
            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Ready to Optimize
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Ready to optimize <span className="gradient-text">for AI?</span>
          </h2>
          <p className="text-lg text-gray-600 mb-10 max-w-2xl mx-auto">
            Start your free GEO audit and discover how AI platforms see your content today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login/"
              className="group inline-flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold px-8 py-4 rounded-xl transition-all shadow-large hover:shadow-glow btn-shine"
            >
              {t.nav.getStarted}
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link
              href="/pricing/"
              className="inline-flex items-center justify-center gap-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 font-semibold px-8 py-4 rounded-xl transition-all shadow-soft hover:shadow-medium"
            >
              View Pricing
            </Link>
          </div>
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
                AI Signal Intake & Path Decision Engine for Generative Engine Optimization.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Product</h4>
              <ul className="space-y-3 text-sm text-gray-600">
                <li><Link href="/system/" className="hover:text-gray-900 transition-colors">System</Link></li>
                <li><Link href="/technology/" className="hover:text-gray-900 transition-colors">Technology</Link></li>
                <li><Link href="/pricing/" className="hover:text-gray-900 transition-colors">Pricing</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Resources</h4>
              <ul className="space-y-3 text-sm text-gray-600">
                <li><Link href="/docs/" className="hover:text-gray-900 transition-colors">Docs</Link></li>
                <li><Link href="/insights/" className="hover:text-gray-900 transition-colors">Insights</Link></li>
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
            &copy; {new Date().getFullYear()} Alignment AI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
