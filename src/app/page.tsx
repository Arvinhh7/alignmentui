'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import {
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  CircleDot,
  Database,
  Eye,
  FileSearch,
  LineChart,
  Search,
  ShoppingCart,
} from 'lucide-react'
import { useLanguage } from '@/lib/LanguageContext'
import Footer from '@/components/Footer'
import PublicNavbar from '@/components/PublicNavbar'

const engines = ['ChatGPT', 'Perplexity', 'Gemini', 'Claude', 'Grok', 'Copilot']

const scrunchParticles = Array.from({ length: 74 }, (_, index) => ({
  left: `${18 + ((index * 17) % 66)}%`,
  top: `${8 + ((index * 29) % 84)}%`,
  delay: `${(index % 16) * 0.045}s`,
  size: `${3 + (index % 4)}px`,
}))

const engineTargets = [
  { name: 'ChatGPT', logo: '/logos/openai.png' },
  { name: 'Gemini', logo: '/logos/gemini.png' },
  { name: 'Perplexity', logo: '/logos/perplexity.png' },
  { name: 'Claude', logo: '/logos/anthropic.png' },
  { name: 'Grok', logo: '/logos/grok.png' },
  { name: 'Copilot', logo: '/logos/microsoft.png' },
]

const trustLogos = [
  { name: 'Shopify', logo: '/logos/shopify.png' },
  { name: 'WordPress', logo: '/logos/wordpress.png' },
  { name: 'Webflow', logo: '/logos/webflow.png' },
  { name: 'Wix', logo: '/logos/wix.png' },
]

const heroSignals = [
  { label: 'Tracked Prompts', value: '18.4K', delta: '+32%' },
  { label: 'Cited Sources', value: '2.1M', delta: '+19%' },
  { label: 'Product Signals', value: '94K', delta: '+41%' },
]

const productModules = [
  {
    label: 'Explore',
    eyebrow: 'Market Graph',
    title: 'Map the category before AI chooses a winner.',
    desc: 'See which topics, competitors, and source domains are shaping commercial recommendations in your market.',
    image: '/landing/ai-market-map.png',
    icon: BarChart3,
    points: ['Topic demand', 'Source authority', 'Competitive overlap'],
  },
  {
    label: 'AI Research',
    eyebrow: 'Question Trails',
    title: 'Understand the reasoning path behind each answer.',
    desc: 'Break buyer questions into sub-prompts, cited evidence, entities, and decision factors across engines.',
    image: '/landing/buyer-question-breakdown.png',
    icon: Search,
    points: ['Prompt decomposition', 'Citation trails', 'Persona context'],
  },
  {
    label: 'Shopping',
    eyebrow: 'Commerce Signals',
    title: 'Track what AI surfaces when a buyer is ready to act.',
    desc: 'Capture product cards, offers, retailer coverage, pricing clues, and the facts engines rely on.',
    image: '/landing/shopping.png',
    icon: ShoppingCart,
    points: ['Offer visibility', 'Retailer coverage', 'Product inclusion'],
  },
  {
    label: 'Monitoring',
    eyebrow: 'Answer Drift',
    title: 'Spot changes before the market feels them.',
    desc: 'Monitor recurring prompts for movement in mentions, citations, competitors, and sentiment over time.',
    image: '/landing/answer-change-monitoring.png',
    icon: Database,
    points: ['Historical runs', 'Citation movement', 'Competitor shifts'],
  },
]

const principleCards = [
  ['Quieter Positioning', 'Less "AI platform" rhetoric, more confidence in the operating model and outcomes.'],
  ['Product-Led Layout', 'Large, grounded UI surfaces do the talking before feature copy starts stacking up.'],
  ['Credible Motion', 'Small movements create polish and rhythm without tipping into demo theatrics.'],
]

const showcaseCards = [
  { label: 'AI Bot Traffic', value: '+42%', meta: 'crawl lift' },
  { label: 'Citation Gap', value: '12', meta: 'sources to fix' },
  { label: 'Agent Page', value: '98ms', meta: 'parse ready' },
]

function ProgressiveReveal({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  const [visible, setVisible] = useState(false)
  const [node, setNode] = useState<HTMLElement | null>(null)

  useEffect(() => {
    if (!node) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      setVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.18, rootMargin: '0px 0px -8% 0px' }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [node])

  return (
    <div
      ref={setNode}
      className={`progressive-reveal ${visible ? 'is-visible' : ''} ${className}`}
      style={{ transitionDelay: visible ? `${delay}ms` : '0ms' }}
    >
      {children}
    </div>
  )
}

function ScrunchLoadLayer() {
  return (
    <div className="scrunch-load pointer-events-none absolute inset-0 z-30 overflow-hidden" aria-hidden="true">
      <div className="scrunch-meter">Signal clarified</div>
      <div className="scrunch-wipe" />
      {scrunchParticles.map((particle, index) => (
        <span
          key={index}
          className="scrunch-particle"
          style={{
            left: particle.left,
            top: particle.top,
            width: particle.size,
            height: particle.size,
            animationDelay: particle.delay,
          }}
        />
      ))}
    </div>
  )
}

function RotatingEngineWord() {
  const [activeIndex, setActiveIndex] = useState(0)
  const active = engineTargets[activeIndex]

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    const interval = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % engineTargets.length)
    }, 2200)

    return () => window.clearInterval(interval)
  }, [])

  return (
    <span className="engine-word-wrap inline-flex min-h-10 w-full max-w-[330px] items-center justify-between gap-3 border border-[#2a211d] bg-[rgba(16,20,27,0.72)] px-3 py-2 text-[#f0d8ca] shadow-[0_18px_60px_rgba(0,0,0,0.18)] backdrop-blur sm:w-auto sm:min-w-[300px]">
      <span className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[#8b95a6]">
        <span className="engine-star" aria-hidden="true" />
        Tracking
      </span>
      <span className="relative inline-flex min-w-[126px] items-center justify-end gap-2" aria-live="polite" aria-atomic="true">
        <img
          key={`${active.name}-logo`}
          src={active.logo}
          alt=""
          width={56}
          height={56}
          className="engine-logo h-5 w-5 object-contain"
        />
        <span key={active.name} className="engine-name inline-block text-sm font-medium">
          {active.name}
        </span>
      </span>
    </span>
  )
}

function HeroConsole() {
  return (
    <div className="hero-showcase relative mx-auto w-full max-w-[620px] py-4 lg:py-5">
      <div className="pointer-events-none absolute -left-6 top-1 hidden w-[190px] rotate-[-6deg] border border-[#2a211d] bg-[#0d1016] p-2 opacity-70 shadow-[0_24px_80px_rgba(0,0,0,0.34)] md:block">
        <img
          src="/landing/visibility-action-layer.png"
          alt=""
          width={460}
          height={300}
          loading="eager"
          className="h-auto w-full object-cover opacity-80 grayscale-[0.18]"
        />
      </div>
      <div className="pointer-events-none absolute -right-5 bottom-5 hidden w-[174px] rotate-[5deg] border border-[#21242a] bg-[#0d1016] p-2 opacity-60 shadow-[0_24px_80px_rgba(0,0,0,0.34)] md:block">
        <img
          src="/landing/ai-market-map.png"
          alt=""
          width={460}
          height={300}
          loading="eager"
          className="h-auto w-full object-cover opacity-75 grayscale-[0.22]"
        />
      </div>

      <div className="hero-orbit-line pointer-events-none absolute left-[8%] top-[12%] hidden h-[72%] w-[86%] border border-[#3a251d]/70 md:block" />

      {showcaseCards.slice(0, 2).map((card, index) => (
        <div
          key={card.label}
          className={`showcase-float pointer-events-none absolute z-20 hidden border border-[#3a251d]/70 bg-[rgba(13,15,18,0.74)] px-3 py-2 opacity-80 shadow-[0_20px_60px_rgba(0,0,0,0.26)] backdrop-blur-md md:block ${
            index === 0
              ? 'left-2 top-12'
              : 'right-2 top-24'
          }`}
          style={{ animationDelay: `${index * 0.9}s` }}
        >
          <div className="flex items-center gap-2">
            <span className="signal-dot h-1.5 w-1.5 rounded-full bg-[#f15a2b]" />
            <span className="text-[10px] uppercase tracking-[0.16em] text-[#8d96a6]">{card.label}</span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-[16px] font-semibold tabular-nums text-[#f0d8ca]">{card.value}</span>
            <span className="text-[11px] text-[#7d8594]">{card.meta}</span>
          </div>
        </div>
      ))}

      <div className="hero-console relative mx-auto w-full max-w-[560px] overflow-hidden border border-[#262626] bg-[#0d0f12] shadow-[0_28px_92px_rgba(0,0,0,0.38)]">
      <ScrunchLoadLayer />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(195,211,255,0.12),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_38%)]" />
      <div className="hero-console-scan pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent)]" />
      <div className="hero-data-path pointer-events-none absolute left-0 top-[52%] h-px w-full bg-[linear-gradient(90deg,transparent,rgba(241,90,43,0.2),rgba(240,216,202,0.72),rgba(241,90,43,0.2),transparent)]" />

      <div className="relative border-b border-[#21242a] px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#f0d8ca]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#596171]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#596171]" />
          </div>
          <div className="font-mono text-[11px] tracking-[0.08em] text-[#7d8594]">alignment / visibility / live</div>
        </div>
      </div>

      <div className="relative p-4">
        <div className="grid gap-4 lg:grid-cols-[0.7fr_1.3fr]">
          <aside className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7d8594]">Coverage</div>
            {engines.map((engine, index) => (
              <div key={engine} className="border border-[#21242a] bg-[#11141a] px-3 py-2">
                <div className="flex items-center justify-between gap-3 text-[12px]">
                  <span className="text-[#e6ebf2]">{engine}</span>
                  <span className="font-mono tabular-nums text-[#7d8594]">{84 - index * 6}%</span>
                </div>
                <div className="mt-2 h-1 bg-[#1b1f27]">
                  <div
                    className="h-full bg-[linear-gradient(90deg,#8ea5d8,#d8e3ff)]"
                    style={{ width: `${74 - index * 5}%` }}
                  />
                </div>
              </div>
            ))}
          </aside>

          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7d8594]">Prompt Cluster</div>
                <h2 className="mt-2 max-w-[320px] text-[23px] font-medium leading-tight text-[#f3f6fb]" style={{ textWrap: 'balance' }}>
                  Enterprise commerce visibility across answer engines
                </h2>
              </div>
              <span className="inline-flex items-center gap-2 border border-[#283241] bg-[#121923] px-2.5 py-1 text-[11px] font-medium text-[#d4deed]">
                <CircleDot className="h-3.5 w-3.5 text-[#9bb7ea]" aria-hidden="true" />
                Stable
              </span>
            </div>

            <div className="mt-4 grid gap-px overflow-hidden border border-[#21242a] bg-[#21242a] sm:grid-cols-3">
              {heroSignals.map((signal) => (
                <div key={signal.label} className="bg-[#101319] px-3 py-3">
                  <div className="font-mono text-[18px] font-semibold tabular-nums text-[#f3f6fb]">{signal.value}</div>
                  <div className="mt-1 text-[11px] uppercase tracking-[0.15em] text-[#7d8594]">{signal.label}</div>
                  <div className="mt-3 font-mono text-[11px] text-[#d89a80]">{signal.delta}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 border border-[#21242a] bg-[#0f1218] p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7d8594]">Citation Mix</span>
                <span className="font-mono text-[11px] text-[#7d8594]">7d</span>
              </div>
              <div className="mt-3 space-y-2.5">
                {[
                  ['reddit.com', '34%', '#d5dceb'],
                  ['wirecutter.com', '18%', '#c2d3f3'],
                  ['brand.com', '12%', '#9db2d8'],
                  ['g2.com', '9%', '#8294b4'],
                ].map(([source, share, color]) => (
                  <div key={source} className="grid grid-cols-[112px_1fr_42px] items-center gap-3 text-[12px]">
                    <span className="truncate text-[#ccd4e0]">{source}</span>
                    <div className="h-1.5 bg-[#1d222c]">
                      <div className="h-full" style={{ width: share, backgroundColor: color }} />
                    </div>
                    <span className="font-mono tabular-nums text-[#7d8594]">{share}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 flex items-start gap-3 border border-[#21242a] bg-[#11141a] px-3 py-2.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#c9d8f2]" aria-hidden="true" />
              <p className="text-[12px] leading-5 text-[#b0bac8]">
                Highest leverage move this week: strengthen product comparison pages with source-backed facts and cleaner offer data.
              </p>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const { t } = useLanguage()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="min-h-screen overflow-x-hidden bg-canvas text-ink">
      <PublicNavbar />

      <main id="main-content">
        <section className="relative px-5 pb-10 pt-24 md:px-8 md:pb-14 md:pt-28 lg:px-12 lg:pb-16 lg:pt-[7.5rem]">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.06),transparent_18%),radial-gradient(circle_at_82%_22%,rgba(241,90,43,0.11),transparent_22%),linear-gradient(180deg,#090909_0%,#0b0e13_100%)]" />
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.024)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.024)_1px,transparent_1px)] bg-[length:48px_48px]" />

          <div className="mx-auto grid max-w-marketing gap-10 lg:grid-cols-[0.86fr_1.05fr] lg:items-center">
            <div className={`transition-[opacity,transform] duration-500 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`}>
              <div className="brand-eyebrow px-3 py-1.5">
                <CircleDot className="h-3.5 w-3.5" aria-hidden="true" />
                Visibility Operating Layer
              </div>

              <h1
                className="mt-6 max-w-[660px] font-serif text-[42px] font-normal leading-[1.02] text-white md:text-[64px] lg:text-[74px]"
                style={{ textWrap: 'balance' }}
              >
                Shape How AI Sees Your Brand.
              </h1>

              <div className="mt-5">
                <RotatingEngineWord />
              </div>

              <p className="mt-4 max-w-[570px] text-[16px] leading-7 text-[#b1b7c2] md:text-[17px]">
                Alignment turns noisy answer-engine outputs into one clear operating view for brand, content, commerce, and analytics teams.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link href="/contact" className="btn-primary min-h-[46px] px-6">
                  Book Demo <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link href="/system" className="btn-secondary min-h-[46px] px-6">
                  See The System
                </Link>
              </div>

              <div className="mt-7 border-y border-[#1f232c] py-3">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-[12px] uppercase tracking-[0.16em] text-[#7d8594]">
                  <span>Monitors</span>
                  {engines.map((engine) => (
                    <span key={engine} className="text-[#c7cfdb]">
                      {engine}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className={`transition-[opacity,transform] delay-150 duration-500 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
              <HeroConsole />
            </div>
          </div>
        </section>

        <section className="border-y border-[#1f232c] bg-[#0c0f14] px-5 py-6 md:px-8 lg:px-12">
          <div className="mx-auto flex max-w-marketing flex-wrap items-center justify-between gap-6">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#7d8594]">Used Across Modern Content & Commerce Stacks</p>
            </div>
            <div className="flex flex-wrap items-center gap-6">
              {trustLogos.map(({ name, logo }) => (
                <div key={name} className="flex items-center gap-2 opacity-70 transition-opacity duration-200 hover:opacity-100">
                  <img src={logo} alt={name} width={24} height={24} loading="lazy" className="h-6 w-6 object-contain" />
                  <span className="text-[14px] font-medium text-[#c7cfdb]">{name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-16 md:px-8 md:py-24 lg:px-12">
          <div className="mx-auto max-w-marketing">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
              <div>
                <p className="eyebrow text-[#7d8594]">Design Direction</p>
                <h2 className="mt-3 max-w-[620px] font-serif text-[34px] font-normal leading-tight text-white md:text-[48px]" style={{ textWrap: 'balance' }}>
                  More product confidence, less AI theater.
                </h2>
              </div>
              <div className="grid gap-px overflow-hidden border border-[#1f232c] bg-[#1f232c] md:grid-cols-3">
                {principleCards.map(([title, desc], index) => (
                  <ProgressiveReveal key={title} delay={index * 90} className="h-full">
                    <article className="h-full bg-[#0d1016] p-5">
                      <h3 className="text-[17px] font-medium text-[#f3f6fb]">{title}</h3>
                      <p className="mt-3 text-[13px] leading-6 text-[#a0a9b8]">{desc}</p>
                    </article>
                  </ProgressiveReveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-[#1f232c] bg-[#090b0f] px-5 py-16 md:px-8 md:py-20 lg:px-12">
          <div className="mx-auto grid max-w-marketing gap-10 lg:grid-cols-[0.34fr_0.66fr] lg:items-center">
            <div>
              <p className="eyebrow text-[#7d8594]">External Workflow</p>
              <h2 className="mt-3 font-serif text-[32px] font-normal leading-tight text-white md:text-[42px]" style={{ textWrap: 'balance' }}>
                A compact operating model for GEO work.
              </h2>
              <p className="mt-4 max-w-[440px] text-[14px] leading-7 text-[#a4adbb]">
                Brand inputs move through audit, monitoring, benchmarking, recommendations, tracking, and dashboard evidence.
              </p>
            </div>

            <div className="workflow-map relative overflow-hidden py-2">
              <div className="workflow-stage-grid">
                <div className="workflow-node" style={{ animationDelay: '0ms' }}>
                  <Database className="h-4 w-4 text-[#f0d8ca]" strokeWidth={1.8} aria-hidden="true" />
                  <p>Input</p>
                  <h3>Brand Input</h3>
                  <span>Products, pages, markets</span>
                </div>
                <div className="workflow-node" style={{ animationDelay: '100ms' }}>
                  <FileSearch className="h-4 w-4 text-[#f0d8ca]" strokeWidth={1.8} aria-hidden="true" />
                  <p>Audit</p>
                  <h3>GEO Audit</h3>
                  <span>Readiness score</span>
                </div>
                <div className="workflow-node" style={{ animationDelay: '200ms' }}>
                  <Eye className="h-4 w-4 text-[#f0d8ca]" strokeWidth={1.8} aria-hidden="true" />
                  <p>Monitor</p>
                  <h3>AI Visibility</h3>
                  <span>Prompt-level results</span>
                </div>
                <div className="workflow-node" style={{ animationDelay: '300ms' }}>
                  <BarChart3 className="h-4 w-4 text-[#f0d8ca]" strokeWidth={1.8} aria-hidden="true" />
                  <p>Score</p>
                  <h3>Benchmarking</h3>
                  <span>Citation and competitor metrics</span>
                </div>
                <div className="workflow-node workflow-node-accent" style={{ animationDelay: '400ms' }}>
                  <CheckCircle2 className="h-4 w-4 text-[#fff7f2]" strokeWidth={1.8} aria-hidden="true" />
                  <p>Action</p>
                  <h3>Recommendations</h3>
                  <span>Content and technical actions</span>
                </div>
                <div className="workflow-node" style={{ animationDelay: '500ms' }}>
                  <LineChart className="h-4 w-4 text-[#f0d8ca]" strokeWidth={1.8} aria-hidden="true" />
                  <p>Track</p>
                  <h3>Continuous Tracking</h3>
                  <span>Progress monitoring</span>
                </div>
                <div className="workflow-node" style={{ animationDelay: '600ms' }}>
                  <Search className="h-4 w-4 text-[#f0d8ca]" strokeWidth={1.8} aria-hidden="true" />
                  <p>View</p>
                  <h3>Dashboard Insights</h3>
                  <span>Evidence and outcomes</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="modules" className="px-5 py-16 md:px-8 md:py-24 lg:px-12">
          <div className="mx-auto max-w-marketing">
            <div className="max-w-[760px]">
              <p className="eyebrow text-[#7d8594]">Platform Views</p>
              <h2 className="mt-3 font-serif text-[36px] font-normal leading-tight text-white md:text-[50px]" style={{ textWrap: 'balance' }}>
                Every module shows the product, not a promise.
              </h2>
            </div>

            <div className="mt-12 space-y-6">
              {productModules.map((module, index) => {
                const Icon = module.icon
                const reverse = index % 2 === 1
                return (
                  <ProgressiveReveal
                    key={module.label}
                    delay={(index % 2) * 110}
                    className={`group grid gap-6 border border-[#1f232c] bg-[#0d1016] p-4 md:p-5 lg:grid-cols-[0.9fr_1.1fr] lg:gap-8 ${
                      reverse ? 'lg:grid-cols-[1.1fr_0.9fr]' : ''
                    }`}
                  >
                    <div className={`${reverse ? 'lg:order-2' : ''}`}>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center border border-[#29303b] bg-[#11161f] text-[#ced9ea]">
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <div>
                          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#7d8594]">{module.eyebrow}</p>
                          <h3 className="mt-1 text-[20px] font-medium text-[#f3f6fb]">{module.label}</h3>
                        </div>
                      </div>

                      <h4 className="mt-8 max-w-[460px] font-serif text-[28px] font-normal leading-tight text-white md:text-[36px]" style={{ textWrap: 'balance' }}>
                        {module.title}
                      </h4>
                      <p className="mt-4 max-w-[500px] text-[15px] leading-7 text-[#a4adbb]">{module.desc}</p>

                      <div className="mt-6 flex flex-wrap gap-2">
                        {module.points.map((point) => (
                          <span key={point} className="border border-[#29303b] bg-[#11161f] px-3 py-1.5 text-[12px] font-medium text-[#c7cfdb]">
                            {point}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className={`${reverse ? 'lg:order-1' : ''}`}>
                      <div className="module-image-shell overflow-hidden border border-[#212631] bg-[#0b0e14] p-2">
                        <img
                          src={module.image}
                          alt={`Alignment ${module.label} product view`}
                          width={960}
                          height={620}
                          loading="lazy"
                          className="aspect-[16/10] w-full object-cover object-left-top transition-[transform,opacity,filter] duration-500 group-hover:scale-[1.015] group-hover:opacity-100"
                        />
                      </div>
                    </div>
                  </ProgressiveReveal>
                )
              })}
            </div>
          </div>
        </section>

        <section className="px-5 py-16 text-center md:px-12 md:py-20">
          <p className="eyebrow text-[#7d8594]">Built For Modern Discovery Teams</p>
          <div className="brand-marquee mx-auto mt-8 max-w-[980px] overflow-hidden">
            <div className="brand-marquee-track flex w-max items-center gap-12">
              {[...trustLogos, ...trustLogos, ...trustLogos].map(({ name, logo }, index) => (
                <div key={`${name}-${index}`} className="flex shrink-0 items-center gap-2 opacity-55 transition-opacity duration-200 hover:opacity-90">
                  <img src={logo} alt={name} width={28} height={28} loading="lazy" className="h-7 w-7 flex-shrink-0 object-contain" />
                  <span className="whitespace-nowrap text-[21px] font-medium tracking-normal text-[#7d8594]">{name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-cta px-5 pb-20 text-center md:px-12 md:pb-28">
          <Bot className="mx-auto mb-5 h-9 w-9 text-[#ced9ea]" aria-hidden="true" />
          <h2 className="font-serif text-[34px] font-normal leading-tight text-white md:text-[46px]" style={{ textWrap: 'balance' }}>
            Start with visibility. Build a steadier brand presence from there.
          </h2>
          <p className="mx-auto mt-4 max-w-[680px] text-[15px] leading-7 text-[#9fa8b8]">
            Use Alignment to understand the market, clarify the signal, and coordinate the work that changes how your brand is represented.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/login" className="btn-primary flex w-full min-h-[48px] items-center justify-center gap-2 sm:w-auto">
              {t.nav.getStarted} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href="/contact" className="btn-secondary flex w-full min-h-[48px] items-center justify-center sm:w-auto">
              {t.nav.bookDemo}
            </Link>
          </div>
        </section>
      </main>

      <Footer />

      <style jsx global>{`
        .hero-console-scan {
          animation: hero-scan 6s ease-in-out infinite;
        }
        .progressive-reveal {
          opacity: 0;
          transform: translate3d(0, 22px, 0) scale(0.985);
          transition:
            opacity 620ms cubic-bezier(0.2, 0.8, 0.2, 1),
            transform 620ms cubic-bezier(0.2, 0.8, 0.2, 1);
          will-change: opacity, transform;
        }
        .progressive-reveal.is-visible {
          opacity: 1;
          transform: translate3d(0, 0, 0) scale(1);
        }
        .scrunch-load {
          animation: scrunch-hide 3.2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
          background: rgba(247, 247, 244, 0.88);
        }
        .scrunch-meter {
          position: absolute;
          left: 50%;
          top: 18px;
          z-index: 4;
          transform: translateX(-50%);
          min-width: 136px;
          border-radius: 999px;
          background: #f36b2b;
          padding: 9px 18px;
          text-align: center;
          font-size: 12px;
          font-weight: 800;
          color: #fff7f2;
          box-shadow: 0 0 44px rgba(243, 107, 43, 0.45);
          animation: scrunch-meter 2.5s ease forwards;
        }
        .scrunch-wipe {
          position: absolute;
          inset-block: -12%;
          left: 42%;
          z-index: 3;
          width: 84px;
          background: linear-gradient(90deg, transparent, rgba(243, 107, 43, 0.22), rgba(255, 142, 76, 0.78), rgba(243, 107, 43, 0.16), transparent);
          filter: blur(2px);
          transform: translateX(-220%);
          animation: scrunch-wipe 2.6s cubic-bezier(0.65, 0, 0.2, 1) forwards;
        }
        .scrunch-particle {
          position: absolute;
          z-index: 4;
          display: block;
          background: #f36b2b;
          box-shadow: 0 0 12px rgba(243, 107, 43, 0.64);
          opacity: 0;
          animation: scrunch-particle 1.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
        .engine-word-wrap {
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.035), 0 18px 60px rgba(0, 0, 0, 0.18);
        }
        .engine-name,
        .engine-logo {
          animation: engine-enter 420ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
        }
        .engine-logo {
          filter: grayscale(0.12) saturate(0.92);
        }
        .engine-star {
          position: relative;
          width: 0.66em;
          height: 0.66em;
          flex: 0 0 auto;
          transform: rotate(45deg);
          animation: engine-star-pulse 2.2s ease-in-out infinite;
        }
        .engine-star::before,
        .engine-star::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 999px;
          background: #f0d8ca;
          box-shadow: 0 0 28px rgba(241, 90, 43, 0.28);
        }
        .engine-star::after {
          transform: rotate(90deg);
        }
        .hero-data-path {
          animation: hero-data-path 5.5s ease-in-out infinite;
          transform-origin: center;
        }
        .hero-orbit-line {
          animation: hero-orbit-breathe 7s ease-in-out infinite;
        }
        .showcase-float {
          animation: showcase-float 6.5s ease-in-out infinite;
        }
        .signal-dot {
          animation: signal-pulse 2.4s ease-in-out infinite;
        }
        .module-image-shell img {
          filter: saturate(0.88) contrast(0.98);
          opacity: 0.92;
        }
        .workflow-map {
          background:
            radial-gradient(circle at 58% 42%, rgba(243, 107, 43, 0.12), transparent 30%),
            radial-gradient(circle at 82% 70%, rgba(255, 255, 255, 0.06), transparent 24%);
        }
        .workflow-map::before {
          content: '';
          position: absolute;
          inset: 8% 0 6% 4%;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.032) 1px, transparent 1px);
          background-size: 44px 44px;
          mask-image: linear-gradient(to right, transparent, black 12%, black 88%, transparent);
          opacity: 0.72;
        }
        .workflow-stage-grid {
          position: relative;
          z-index: 1;
          display: grid;
          gap: 14px;
        }
        @media (min-width: 768px) {
          .workflow-stage-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (min-width: 1024px) {
          .workflow-stage-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 16px;
          }
          .workflow-stage-grid::before {
            content: '';
            position: absolute;
            left: 9%;
            right: 9%;
            top: calc(50% - 1px);
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(243, 107, 43, 0.58), rgba(255, 255, 255, 0.18), transparent);
            opacity: 0.72;
          }
        }
        .workflow-node {
          position: relative;
          z-index: 2;
          width: 100%;
          min-height: 138px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          background: rgba(15, 17, 18, 0.84);
          padding: 18px;
          opacity: 0;
          transform: translate3d(0, 12px, 0);
          animation: workflow-node-in 620ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.035), 0 18px 54px rgba(0, 0, 0, 0.25);
          backdrop-filter: blur(12px);
        }
        .workflow-node::after {
          content: '';
          position: absolute;
          left: 18px;
          right: 18px;
          bottom: -1px;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(243, 107, 43, 0.66), transparent);
        }
        .workflow-node p {
          margin-top: 10px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #aeb4bd;
        }
        .workflow-node h3 {
          margin-top: 20px;
          max-width: 180px;
          font-size: 15px;
          line-height: 1.35;
          font-weight: 650;
          color: #f7f7f4;
        }
        .workflow-node span {
          display: block;
          margin-top: 12px;
          max-width: 190px;
          font-size: 12px;
          line-height: 1.55;
          color: #929ca9;
        }
        .workflow-node-accent {
          border-color: rgba(243, 107, 43, 0.42);
          background: linear-gradient(135deg, rgba(243, 107, 43, 0.16), rgba(15, 17, 18, 0.9) 46%);
        }
        .brand-marquee {
          mask-image: linear-gradient(to right, transparent, black 12%, black 88%, transparent);
        }
        .brand-marquee-track {
          animation: brand-marquee 28s linear infinite;
        }
        .brand-marquee:hover .brand-marquee-track {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-console-scan,
          .hero-data-path,
          .hero-orbit-line,
          .showcase-float,
          .signal-dot,
          .engine-name,
          .engine-logo,
          .engine-star,
          .workflow-node,
          .brand-marquee-track {
            animation: none;
          }
          .progressive-reveal {
            opacity: 1;
            transform: none;
            transition: none;
          }
          .scrunch-load {
            display: none;
          }
          .workflow-node {
            opacity: 1;
            transform: none;
          }
        }
        @keyframes workflow-node-in {
          from {
            opacity: 0;
            transform: translate3d(0, 12px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
        @keyframes scrunch-hide {
          0%,
          72% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            visibility: hidden;
          }
        }
        @keyframes scrunch-meter {
          0% {
            opacity: 0;
            transform: translate3d(-50%, -8px, 0) scale(0.96);
          }
          24%,
          70% {
            opacity: 1;
            transform: translate3d(-50%, 0, 0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate3d(-50%, -4px, 0) scale(0.98);
          }
        }
        @keyframes scrunch-wipe {
          0% {
            opacity: 0;
            transform: translateX(-240%) scaleX(0.7);
          }
          18% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translateX(360%) scaleX(1.25);
          }
        }
        @keyframes scrunch-particle {
          0% {
            opacity: 0;
            transform: translate3d(-62px, 0, 0) scale(0.4);
          }
          24%,
          72% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate3d(28px, -18px, 0) scale(0.9);
          }
        }
        @keyframes engine-enter {
          from {
            opacity: 0;
            transform: translate3d(0, 0.12em, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
        @keyframes engine-star-pulse {
          0%,
          100% {
            opacity: 0.82;
            transform: rotate(45deg) scale(0.92);
          }
          50% {
            opacity: 1;
            transform: rotate(45deg) scale(1.08);
          }
        }
        @keyframes hero-scan {
          0%,
          100% {
            transform: translateX(-100%);
            opacity: 0;
          }
          20%,
          80% {
            opacity: 0.7;
          }
          50% {
            transform: translateX(100%);
            opacity: 0.35;
          }
        }
        @keyframes hero-data-path {
          0%,
          100% {
            opacity: 0;
            transform: scaleX(0.25) translateX(-18%);
          }
          45%,
          65% {
            opacity: 0.9;
          }
          50% {
            transform: scaleX(0.9) translateX(12%);
          }
        }
        @keyframes hero-orbit-breathe {
          0%,
          100% {
            opacity: 0.2;
            transform: scale(0.985);
          }
          50% {
            opacity: 0.44;
            transform: scale(1);
          }
        }
        @keyframes showcase-float {
          0%,
          100% {
            transform: translate3d(0, 0, 0);
          }
          50% {
            transform: translate3d(0, -8px, 0);
          }
        }
        @keyframes signal-pulse {
          0%,
          100% {
            opacity: 0.5;
            transform: scale(0.9);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
        }
        @keyframes brand-marquee {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-33.333%);
          }
        }
      `}</style>
    </div>
  )
}
