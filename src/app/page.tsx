'use client'

import Link from 'next/link'
import { useLanguage } from '@/lib/LanguageContext'
import Footer from '@/components/Footer'
import PublicNavbar from '@/components/PublicNavbar'
import { useEffect, useState } from 'react'
import {
  ArrowRight,
  BarChart3,
  Bot,
  Code2,
  Database,
  Search,
  ShoppingCart,
} from 'lucide-react'

const productModules = [
  {
    label: 'Explore',
    icon: BarChart3,
    eyebrow: 'Market intelligence',
    title: 'Map the AI market',
    desc: 'See which topics, brands, and citation sources shape AI recommendations across a category.',
    image: '/landing/ai-market-map.png',
    points: ['Brand competitive landscape', 'Citation source authority', 'Topic ranking'],
  },
  {
    label: 'AI Research',
    icon: Search,
    eyebrow: 'Research trail',
    title: 'See how AI breaks down buyer questions',
    desc: 'Follow the sub-questions, sources, competitors, and decision dimensions behind an AI research path.',
    image: '/landing/buyer-question-breakdown.png',
    points: ['Root question', 'Sub-question trail', 'Competitor context'],
  },
  {
    label: 'Shopping',
    icon: ShoppingCart,
    eyebrow: 'Shopping intelligence',
    title: 'Track products surfaced in AI buying mode',
    desc: 'Understand product cards, offer facts, price signals, quality gates, and prompt evidence.',
    image: '/landing/shopping.png',
    points: ['Product cards', 'Offer facts', 'Prompt evidence'],
  },
  {
    label: 'Monitoring',
    icon: Database,
    eyebrow: 'Prompt tracking',
    title: 'Track how AI answers change over time',
    desc: 'Monitor prompt performance, fan-out behavior, competitor mentions, and source movement across recurring runs.',
    image: '/landing/answer-change-monitoring.png',
    points: ['Prompt history', 'Fan-out analysis', 'Source movement'],
  },
  {
    label: 'Analysis',
    icon: Database,
    eyebrow: 'Decision layer',
    title: 'Turn AI visibility into action',
    desc: 'Review the AI response, brands mentioned, highlighted entities, citations, and source links behind each signal.',
    image: '/landing/visibility-action-layer.png',
    points: ['AI response', 'Brands mentioned', 'Citation links'],
  },
]

const outcomes = [
  {
    title: 'Know which products AI chooses',
    desc: 'Track product cards, brands, and competitors surfaced across buyer-intent prompts.',
  },
  {
    title: 'See the facts behind AI recommendations',
    desc: 'Capture prices, offers, ratings, channels, citations, and source domains before they become purchase decisions.',
  },
  {
    title: 'Turn demand into owned-channel action',
    desc: 'Use product, source, and query context to improve pages, feeds, retailer coverage, and attribution.',
  },
]

const trustedBrands = [
  { name: 'Shopify', logo: '/logos/shopify.png' },
  { name: 'WordPress', logo: '/logos/wordpress.png' },
  { name: 'Webflow', logo: '/logos/webflow.png' },
  { name: 'Wix', logo: '/logos/wix.png' },
  { name: 'Custom Sites', logo: null },
]

const heroPlatforms = [
  { name: 'ChatGPT', logo: '/logos/openai.png' },
  { name: 'Gemini', logo: '/logos/gemini.png' },
  { name: 'Google AI', logo: '/logos/google.png' },
  { name: 'Perplexity', logo: '/logos/perplexity.png' },
  { name: 'Claude', logo: '/logos/anthropic.png' },
  { name: 'Grok', logo: '/logos/grok.png' },
]

const heroStats = [
  { value: '8,432', label: 'AI Traffic', change: '↑ +104%' },
  { value: '1,247', label: 'Brand Mentions', change: '↑ +12%' },
  { value: '342', label: 'Citations', change: '↑ +18%' },
  { value: '87.3', label: 'AIGVR Score', change: '↑ +5.2' },
]

export default function LandingPage() {
  const { t } = useLanguage()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  return (
    <div className="min-h-screen bg-canvas">
      <PublicNavbar />

      <section className="px-5 pb-12 pt-28 md:px-8 md:pb-16 md:pt-36 lg:px-12">
        <div className="mx-auto max-w-marketing text-center">
          <div
            className={`inline-flex items-center gap-2 rounded-full border border-divider bg-surface px-4 py-1.5 text-[12.5px] text-ink-2 transition-all duration-500 ${
              mounted ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
            }`}
          >
            <span className="h-1.5 w-1.5 animate-blink rounded-full bg-sage" />
            AI commerce intelligence across search, shopping, and answer engines
          </div>

          <div
            className={`mt-6 flex flex-wrap items-center justify-center gap-2 transition-all delay-75 duration-500 ${
              mounted ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
            }`}
          >
            {heroPlatforms.map((platform) => (
              <span
                key={platform.name}
                className="inline-flex items-center gap-2 rounded-full border border-divider-light bg-surface px-3 py-1.5 text-[13px] font-semibold text-ink-2 shadow-elevation-sm"
              >
                <img src={platform.logo} alt={platform.name} width={16} height={16} className="h-4 w-4 rounded-sm object-contain" />
                {platform.name}
              </span>
            ))}
          </div>

          <h1
            className={`heading-hero mx-auto mt-10 max-w-[980px] transition-all delay-100 duration-500 ${
              mounted ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
            }`}
          >
            Get your brand
            <br />
            <em className="underline decoration-2 underline-offset-[6px]">recommended and bought by AI</em>
          </h1>

          <p
            className={`text-lead mx-auto mt-6 max-w-[720px] transition-all delay-150 duration-500 ${
              mounted ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
            }`}
          >
            Alignment helps brands win visibility across AI search, shopping, and agentic commerce.
            See how ChatGPT, Gemini, Google AI, Perplexity, Claude, and Grok mention your brand,
            surface your products, cite your sources, and prepare buyers or agents to take action.
          </p>

          <div
            className={`mt-9 flex flex-col items-center justify-center gap-3 transition-all delay-200 duration-500 sm:flex-row ${
              mounted ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
            }`}
          >
            <Link href="/login" className="btn-primary flex items-center gap-2">
              {t.nav.getStarted} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="#modules" className="btn-secondary">
              See How It Works
            </Link>
          </div>

          <div
            className={`mx-auto mt-16 grid max-w-[920px] grid-cols-2 overflow-hidden rounded-2xl border border-divider bg-surface shadow-elevation-sm transition-all delay-300 duration-500 md:grid-cols-4 ${
              mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
            }`}
          >
            {heroStats.map((stat) => (
              <div key={stat.label} className="border-divider px-5 py-8 text-center md:border-r md:last:border-r-0">
                <div className="font-serif text-[36px] leading-none text-ink md:text-[42px]">{stat.value}</div>
                <div className="mt-2 text-[14px] font-medium text-ink-2">{stat.label}</div>
                <div className="mt-2 text-[13px] font-semibold text-sage">{stat.change}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-divider bg-surface px-5 py-12 md:px-8 lg:px-12">
        <div className="mx-auto grid max-w-marketing grid-cols-1 gap-5 md:grid-cols-3">
          {outcomes.map((item) => (
            <div key={item.title} className="rounded-2xl border border-divider-light bg-canvas p-5">
              <h3 className="text-[17px] font-semibold tracking-tight text-ink">{item.title}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="modules" className="px-5 py-16 md:px-8 md:py-24 lg:px-12">
        <div className="mx-auto max-w-marketing">
          <div className="max-w-[760px]">
            <p className="eyebrow">Launch modules</p>
            <h2 className="heading-section mt-3">Every module has its own product surface</h2>
            <p className="text-lead mt-4">
              The homepage now shows the actual product, module by module, so users can understand Alignment without reading a long theory page.
            </p>
          </div>

          <div className="mt-12 space-y-10">
            {productModules.map((module, index) => {
              const Icon = module.icon
              const reverse = index % 2 === 1
              return (
                <article
                  key={module.label}
                  className={`grid grid-cols-1 gap-6 rounded-[28px] border border-divider bg-surface p-4 shadow-elevation-sm lg:grid-cols-[0.58fr_1.42fr] lg:p-6 ${
                    reverse ? 'lg:grid-cols-[1.42fr_0.58fr]' : ''
                  }`}
                >
                  <div className={`p-3 md:p-5 ${reverse ? 'lg:order-2' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sage-bg text-sage">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="rounded-full border border-divider-light bg-canvas px-3 py-1.5 text-[12px] font-bold text-ink">
                        {module.label}
                      </span>
                    </div>
                    <p className="eyebrow mt-6">{module.eyebrow}</p>
                    <h3 className="mt-3 text-[28px] font-semibold leading-tight tracking-tight text-ink md:text-[34px]">
                      {module.title}
                    </h3>
                    <p className="mt-4 text-[15px] leading-relaxed text-ink-2">{module.desc}</p>
                    <div className="mt-6 flex flex-wrap gap-2">
                      {module.points.map((point) => (
                        <span key={point} className="rounded-full border border-divider-light bg-canvas px-3 py-1.5 text-[12px] font-semibold text-ink-2">
                          {point}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className={`rounded-[22px] border border-divider-light bg-canvas p-3 ${reverse ? 'lg:order-1' : ''}`}>
                    <img
                      src={module.image}
                      alt={`Alignment ${module.label} module`}
                      className="mx-auto h-auto w-full object-contain"
                    />
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="px-5 pb-16 md:px-8 md:pb-24 lg:px-12">
        <div className="card-dark mx-auto max-w-marketing">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <div>
              <p className="eyebrow text-[rgba(250,245,236,0.45)]">Why now</p>
              <h2 className="heading-section mt-3 text-ink-inv">AI answers are becoming the new storefront</h2>
              <p className="mt-4 text-[15px] leading-relaxed text-[rgba(250,245,236,0.65)]">
                Visibility alone is not enough. Brands need clean entity data, trusted citations, product evidence, and measurable paths back to owned channels.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {[
                ['Discover', 'Which prompts and topics create demand?'],
                ['Recommend', 'Which brands, sources, and products does AI choose?'],
                ['Trust', 'Which citations and facts make the answer believable?'],
                ['Attribute', 'Which AI journeys create measurable traffic and conversions?'],
              ].map(([title, desc]) => (
                <div key={title} className="card-dark-inner">
                  <div className="text-[15px] font-semibold text-ink-inv">{title}</div>
                  <div className="mt-2 text-[13px] leading-relaxed text-[rgba(250,245,236,0.55)]">{desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-16 text-center md:px-12 md:py-20">
        <p className="eyebrow">Trusted by forward-thinking brands</p>
        <div className="brand-marquee mx-auto mt-8 max-w-[980px] overflow-hidden">
          <div className="brand-marquee-track flex w-max items-center gap-12">
            {[...trustedBrands, ...trustedBrands, ...trustedBrands].map(({ name, logo }, index) => (
              <div key={`${name}-${index}`} className="flex shrink-0 items-center gap-2 opacity-50 transition-opacity hover:opacity-80">
                {logo ? (
                  <img src={logo} alt={name} width={28} height={28} className="h-7 w-7 flex-shrink-0 rounded-sm object-contain" />
                ) : (
                  <Code2 className="h-7 w-7 flex-shrink-0 text-ink-3" />
                )}
                <span className="whitespace-nowrap text-[24px] font-semibold tracking-tight text-ink-3">{name}</span>
              </div>
            ))}
          </div>
        </div>
        <style jsx>{`
          .brand-marquee {
            mask-image: linear-gradient(to right, transparent, black 12%, black 88%, transparent);
          }
          .brand-marquee-track {
            animation: brand-marquee 26s linear infinite;
          }
          .brand-marquee:hover .brand-marquee-track {
            animation-play-state: paused;
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
      </section>

      <section className="mx-auto max-w-cta px-5 pb-20 text-center md:px-12 md:pb-28">
        <Bot className="mx-auto mb-5 h-9 w-9 text-ink" />
        <h2 className="heading-section">Start with visibility. Build toward measurable AI growth.</h2>
        <p className="text-lead mx-auto mt-4 max-w-[680px]">
          Use Alignment to see the AI market, clean the signals, and prepare your products for AI-driven buying journeys.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/login" className="btn-primary flex w-full items-center justify-center gap-2 sm:w-auto">
            {t.nav.getStarted} <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/contact" className="btn-secondary w-full text-center sm:w-auto">
            {t.nav.bookDemo}
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
