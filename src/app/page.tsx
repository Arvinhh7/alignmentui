'use client'

import Link from 'next/link'
import { useLanguage } from '@/lib/LanguageContext'
import LanguageSwitch from '@/components/LanguageSwitch'
import { LogoFull } from '@/components/Logo'
import { useEffect, useState } from 'react'
import {
  ShieldCheck, TrendingUp, PenTool, Globe,
  BarChart3, Search, ArrowRight,
} from 'lucide-react'

// Platform logo icons
const PlatformIcon = ({ src, alt }: { src: string; alt: string }) => (
  <img src={src} alt={alt} width={22} height={22} className="w-[22px] h-[22px] object-contain" />
)

export default function LandingPage() {
  const { t } = useLanguage()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const navLinks = [
    { label: t.nav.system,     href: '/system' },
    { label: t.nav.technology, href: '/technology' },
    { label: t.nav.pricing,    href: '/pricing' },
    { label: t.nav.docs,       href: '/docs' },
    { label: t.nav.insights,   href: '/insights' },
  ]

  const stats = [
    { value: t.hero.stats.mentionsValue,  label: t.hero.stats.mentions,  change: t.hero.stats.mentionsChange },
    { value: t.hero.stats.scoreValue,     label: t.hero.stats.score,     change: t.hero.stats.scoreChange },
    { value: t.hero.stats.citationsValue, label: t.hero.stats.citations, change: t.hero.stats.citationsChange },
  ]

  const features = [
    {
      icon: <Search className="w-[18px] h-[18px]" />,
      title: 'GEO Audit',
      desc: 'Deep analysis of how AI platforms perceive your brand, products, and content. Identify gaps before your competitors do.',
      bg: 'bg-surface-warm',
    },
    {
      icon: <TrendingUp className="w-[18px] h-[18px]" />,
      title: 'GEO Monitor',
      desc: 'Real-time tracking of brand mentions, citations, and sentiment across ChatGPT, Perplexity, Gemini, and 30+ platforms.',
      bg: 'bg-sage-bg',
    },
    {
      icon: <PenTool className="w-[18px] h-[18px]" />,
      title: 'GEO Content',
      desc: 'AI-generated FAQ pairs, brand stories, and product descriptions optimized for machine comprehension and citation.',
      bg: 'bg-surface-warm',
    },
    {
      icon: <Globe className="w-[18px] h-[18px]" />,
      title: 'Visibility Proxy',
      desc: 'Cloudflare-powered reverse proxy that serves enriched structured data to AI crawlers — zero changes to your site code.',
      bg: 'bg-surface-warm',
    },
    {
      icon: <BarChart3 className="w-[18px] h-[18px]" />,
      title: 'ROI Tracking',
      desc: 'Measure the revenue impact of AI-driven traffic with GA4 attribution, referral tracking, and conversion analysis.',
      bg: 'bg-surface-warm',
    },
    {
      icon: <ShieldCheck className="w-[18px] h-[18px]" />,
      title: 'Competitor Intel',
      desc: 'See how competitors rank in AI recommendations. Benchmark your visibility score and find opportunities to overtake them.',
      bg: 'bg-surface-warm',
    },
  ]

  const steps = [
    { n: 1, title: 'Audit',    desc: 'Scan how AI platforms currently perceive your brand' },
    { n: 2, title: 'Optimize', desc: 'Fix gaps in structured data and knowledge graph' },
    { n: 3, title: 'Content',  desc: 'Generate AI-optimized FAQ, stories, and product data' },
    { n: 4, title: 'Distribute', desc: 'Push structured content to AI crawl endpoints' },
    { n: 5, title: 'Monitor',  desc: 'Track mentions, citations, and visibility scores' },
  ]

  const proxyFeatures = [
    { title: 'Zero-Impact for Humans',  desc: 'Real visitors never notice anything different. No speed loss, no layout shifts, no changes to your website code.', tag: 'Transparent' },
    { title: 'Enhanced for AI',         desc: 'When GPTBot, ClaudeBot, or PerplexityBot visits, they receive your original content plus structured knowledge graph data.', tag: '34+ AI Platforms' },
    { title: 'Referral Tracking',       desc: 'Dual-signal attribution: passive Referer header detection plus active URL parameter planting in llms.txt and agent.json.', tag: 'GA4 Compatible' },
    { title: 'Edge Deployment',         desc: "Runs on Cloudflare's global edge network. Sub-50ms response times. DNS-level setup — works with any website platform.", tag: 'Cloudflare Workers' },
  ]

  return (
    <div className="min-h-screen bg-canvas">

      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-5 md:px-8 lg:px-12 flex items-center justify-between h-16 bg-[rgba(250,247,242,0.88)] backdrop-blur-md border-b border-divider/50">
        <Link href="/" className="flex items-center hover:opacity-90 transition-opacity">
          <LogoFull width={140} height={45} />
        </Link>

        <div className="hidden lg:flex items-center gap-8">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[13.5px] text-ink-2 hover:text-ink transition-colors duration-150"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <LanguageSwitch />
          <Link href="/login" className="btn-primary btn-primary-sm">
            {t.nav.getStarted}
          </Link>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="pt-28 md:pt-40 pb-16 md:pb-20 px-5 md:px-8 lg:px-12 max-w-marketing mx-auto text-center">

        {/* Badge */}
        <div
          className={`inline-flex items-center gap-2 px-4 py-1.5 border border-divider rounded-full text-[12.5px] text-ink-2 bg-surface mb-7 transition-all duration-500 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-sage animate-blink flex-shrink-0" />
          {t.hero.badge}
          <span className="flex items-center gap-1 ml-1 pl-2 border-l border-divider-light">
            <PlatformIcon src="/logos/openai.png"     alt="ChatGPT" />
            <PlatformIcon src="/logos/perplexity.png" alt="Perplexity" />
            <PlatformIcon src="/logos/gemini.png"     alt="Gemini" />
            <PlatformIcon src="/logos/grok.png"       alt="Grok" />
            <PlatformIcon src="/logos/google.png"     alt="Google AI" />
          </span>
        </div>

        {/* Headline — DM Serif with italic+underline emphasis */}
        <h1
          className={`heading-hero mb-6 transition-all duration-500 delay-75 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
        >
          {t.hero.headline}
          <br />
          <em className="underline underline-offset-[6px] decoration-2 decoration-ink">
            {t.hero.headlineHighlight}
          </em>
        </h1>

        {/* Subtitle */}
        <p
          className={`text-lead max-w-subtitle mx-auto mb-10 transition-all duration-500 delay-150 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
        >
          {t.hero.subheadline}
        </p>

        {/* CTA Buttons */}
        <div
          className={`flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-3.5 transition-all duration-500 delay-200 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
        >
          <Link href="/login" className="btn-primary flex items-center gap-2">
            {t.nav.getStarted} <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="#how-it-works" className="btn-secondary">
            {t.nav.seeHowItWorks}
          </Link>
        </div>

        {/* Stats row — 2-col on mobile, 3-col on sm+ */}
        <div
          className={`grid grid-cols-2 sm:grid-cols-3 mt-12 md:mt-16 max-w-[720px] mx-auto rounded-2xl overflow-hidden gap-px bg-divider transition-all duration-500 delay-300 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
        >
          {stats.map((stat, i) => (
            <div
              key={i}
              className={`px-4 sm:px-6 py-6 sm:py-7 bg-surface text-center ${
                i === 0 ? 'rounded-tl-2xl sm:rounded-l-2xl' : i === stats.length - 1 ? 'rounded-br-2xl sm:rounded-r-2xl' : ''
              }`}
            >
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label mt-1">{stat.label}</div>
              <div className="inline-flex items-center gap-0.5 mt-1.5 text-[11px] font-medium text-sage">
                ↑ {stat.change}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-16 md:py-25 px-5 md:px-8 lg:px-12 max-w-marketing mx-auto">
        <p className="eyebrow">How it works</p>
        <h2 className="heading-section mt-3 mb-4">Five steps to AI visibility</h2>
        <p className="text-lead max-w-[520px]">
          A systematic approach to making your brand discoverable, citable, and recommended by every major AI platform.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-14">
          {steps.map((step, i) => (
            <div key={step.n} className="relative card text-center hover:shadow-elevation-md transition-all duration-[250ms]">
              <div className="w-7 h-7 rounded-full bg-ink text-ink-inv text-[12px] font-semibold flex items-center justify-center mx-auto mb-3.5">
                {step.n}
              </div>
              <h4 className="text-[14px] font-semibold text-ink mb-1.5 tracking-tight">{step.title}</h4>
              <p className="text-[12px] text-ink-3 leading-relaxed">{step.desc}</p>
              {i < steps.length - 1 && (
                <span className="hidden lg:block absolute top-[44px] right-[-12px] w-6 h-px bg-divider" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section className="py-16 md:py-25 px-5 md:px-8 lg:px-12 max-w-marketing mx-auto">
        <p className="eyebrow">Platform</p>
        <h2 className="heading-section mt-3">Everything you need for AI visibility</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-14">
          {features.map((feature, i) => (
            <div
              key={i}
              className="card card-hover opacity-0 animate-fade-in-up"
              style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'forwards' }}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 text-ink-2 ${feature.bg}`}>
                {feature.icon}
              </div>
              <h3 className="text-[15px] font-semibold text-ink mb-2 tracking-tight">{feature.title}</h3>
              <p className="text-[13.5px] text-ink-2 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Dark Section — Visibility Proxy ──────────────────────────────── */}
      <section className="px-5 md:px-8 lg:px-12 pb-10 max-w-marketing mx-auto">
        <div className="card-dark">
          <p className="eyebrow text-[rgba(250,247,242,0.4)]">Technology</p>
          <h2 className="heading-section text-ink-inv mt-3 max-w-[480px]">
            The invisible layer between your website and AI
          </h2>
          <p className="text-lead text-[rgba(250,247,242,0.6)] mt-4 max-w-[520px]">
            Visibility Proxy sits at the edge. Human visitors see your site unchanged. AI crawlers receive an enriched knowledge graph — JSON-LD, llms.txt, agent.json — automatically.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-12">
            {proxyFeatures.map((item, i) => (
              <div key={i} className="card-dark-inner hover:bg-[rgba(250,247,242,0.06)] hover:border-[rgba(250,247,242,0.12)] transition-all duration-200">
                <h4 className="text-[15px] font-semibold text-ink-inv mb-1.5">{item.title}</h4>
                <p className="text-[13px] text-[rgba(250,247,242,0.5)] leading-relaxed">{item.desc}</p>
                <span className="inline-block mt-2.5 text-[10px] px-2.5 py-1 rounded-md bg-[rgba(250,247,242,0.08)] text-[rgba(250,247,242,0.55)] font-medium uppercase tracking-wider">
                  {item.tag}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust ────────────────────────────────────────────────────────── */}
      <div className="py-16 md:py-20 px-5 md:px-12 text-center">
        <p className="eyebrow">Trusted by forward-thinking brands</p>
        <div className="flex items-center justify-center gap-6 md:gap-12 mt-8 flex-wrap">
          {['Shopify', 'WordPress', 'Webflow', 'Wix', 'Custom Sites'].map(name => (
            <span
              key={name}
              className="text-[18px] font-semibold text-ink-3 opacity-50 hover:opacity-80 transition-opacity tracking-tight"
            >
              {name}
            </span>
          ))}
        </div>
      </div>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section className="py-16 md:py-20 pb-20 md:pb-28 px-5 md:px-12 text-center max-w-cta mx-auto">
        <h2 className="heading-section">Start getting mentioned by AI today</h2>
        <p className="text-lead mt-4 mb-9">
          Join the brands already optimizing their visibility across ChatGPT, Perplexity, Claude, and every major AI platform.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-3.5">
          <Link href="/login" className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center">
            {t.nav.getStarted} — Free <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/contact" className="btn-secondary w-full sm:w-auto text-center">
            {t.nav.bookDemo}
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-divider">
        <div className="max-w-marketing mx-auto px-5 md:px-12 py-8 md:py-10 flex flex-col sm:flex-row items-center sm:justify-between gap-4 sm:gap-0">
          <span className="text-[12px] text-ink-3">© 2026 Alignment AI. All rights reserved.</span>
          <div className="flex items-center gap-6">
            {[
              { label: 'Privacy', href: '/privacy' },
              { label: 'Terms',   href: '/terms' },
              { label: 'Docs',    href: '/docs' },
              { label: 'Contact', href: '/contact' },
            ].map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[12px] text-ink-3 hover:text-ink transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>

    </div>
  )
}
