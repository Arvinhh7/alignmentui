'use client'

import Link from 'next/link'
import { useLanguage } from '@/lib/LanguageContext'
import { LogoFull } from '@/components/Logo'
import Footer from '@/components/Footer'
import PublicNavbar from '@/components/PublicNavbar'
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

  const stats = [
    { value: t.hero.stats.trafficValue,   label: t.hero.stats.traffic,   change: t.hero.stats.trafficChange },
    { value: t.hero.stats.mentionsValue,  label: t.hero.stats.mentions,  change: t.hero.stats.mentionsChange },
    { value: t.hero.stats.citationsValue, label: t.hero.stats.citations, change: t.hero.stats.citationsChange },
    { value: t.hero.stats.scoreValue,     label: t.hero.stats.score,     change: t.hero.stats.scoreChange },
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
      desc: 'Works invisibly in the background — AI platforms get what they need to cite your brand, your visitors see nothing different.',
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
    { title: 'Global Performance',       desc: "Lightning-fast and always on. Works with Shopify, WordPress, Webflow, or any custom site — no engineers needed.", tag: 'Global Infrastructure' },
  ]

  return (
    <div className="min-h-screen bg-canvas">

      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <PublicNavbar />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="pt-28 md:pt-40 pb-16 md:pb-20 px-5 md:px-8 lg:px-12 max-w-marketing mx-auto text-center">

        {/* Badge — Global 58 AI Platforms */}
        <div
          className={`inline-flex items-center gap-2 px-4 py-1.5 border border-divider rounded-full text-[12.5px] text-ink-2 bg-surface mb-4 transition-all duration-500 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-sage animate-blink flex-shrink-0" />
          {t.hero.badge}
        </div>

        {/* Platform chips — logo + name */}
        <div
          className={`flex flex-wrap items-center justify-center gap-2 mb-7 transition-all duration-500 delay-75 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}
        >
          {[
            { name: 'ChatGPT',    logo: '/logos/openai.png' },
            { name: 'Gemini',     logo: '/logos/gemini.png' },
            { name: 'Google AI',  logo: '/logos/google.png' },
            { name: 'Perplexity', logo: '/logos/perplexity.png' },
            { name: 'Claude',     logo: '/logos/anthropic.png' },
            { name: 'Grok',       logo: '/logos/grok.png' },
          ].map(p => (
            <span
              key={p.name}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface border border-divider-light rounded-full text-[11.5px] font-medium text-ink-2 shadow-elevation-sm"
            >
              <img src={p.logo} alt={p.name} width={14} height={14} className="w-3.5 h-3.5 object-contain rounded-sm" />
              {p.name}
            </span>
          ))}
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
          className={`grid grid-cols-2 sm:grid-cols-4 mt-12 md:mt-16 max-w-[900px] mx-auto rounded-2xl overflow-hidden gap-px bg-divider transition-all duration-500 delay-300 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
        >
          {stats.map((stat, i) => (
            <div
              key={i}
              className={`px-4 sm:px-6 py-6 sm:py-7 bg-surface text-center ${
                i === 0 ? 'rounded-tl-2xl rounded-bl-none sm:rounded-bl-2xl' : i === 1 ? 'rounded-tr-2xl sm:rounded-tr-none' : i === 2 ? 'rounded-bl-2xl sm:rounded-bl-none' : i === stats.length - 1 ? 'rounded-br-2xl sm:rounded-r-2xl' : ''
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
          <p className="eyebrow text-[rgba(250,245,236,0.4)]">Technology</p>
          <h2 className="heading-section text-ink-inv mt-3 max-w-[480px]">
            The invisible layer between your website and AI
          </h2>
          <p className="text-lead text-[rgba(250,245,236,0.6)] mt-4 max-w-[520px]">
            Visibility Proxy sits at the edge. Human visitors see your site unchanged. AI platforms automatically receive the signals they need to discover and cite your brand.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-12">
            {proxyFeatures.map((item, i) => (
              <div key={i} className="card-dark-inner hover:bg-[rgba(250,245,236,0.06)] hover:border-[rgba(250,245,236,0.12)] transition-all duration-200">
                <h4 className="text-[15px] font-semibold text-ink-inv mb-1.5">{item.title}</h4>
                <p className="text-[13px] text-[rgba(250,245,236,0.5)] leading-relaxed">{item.desc}</p>
                <span className="inline-block mt-2.5 text-[10px] px-2.5 py-1 rounded-md bg-[rgba(250,245,236,0.08)] text-[rgba(250,245,236,0.55)] font-medium uppercase tracking-wider">
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
        <div className="flex items-center justify-center gap-6 md:gap-10 mt-8 flex-wrap">
          {[
            { name: 'Shopify',      logo: '/logos/shopify.png' },
            { name: 'WordPress',    logo: '/logos/wordpress.png' },
            { name: 'Webflow',      logo: '/logos/webflow.png' },
            { name: 'Wix',          logo: '/logos/wix.png' },
            { name: 'Custom Sites', logo: null },
          ].map(({ name, logo }) => (
            <div
              key={name}
              className="flex items-center gap-2 opacity-50 hover:opacity-80 transition-opacity"
            >
              {logo ? (
                <img src={logo} alt={name} width={22} height={22} className="w-[22px] h-[22px] object-contain rounded-sm flex-shrink-0" />
              ) : (
                <svg className="w-[22px] h-[22px] text-ink-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              )}
              <span className="text-[17px] font-semibold text-ink-3 tracking-tight">{name}</span>
            </div>
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
      <Footer />

    </div>
  )
}
