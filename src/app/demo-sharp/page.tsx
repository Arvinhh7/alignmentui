import Link from 'next/link'
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bot,
  Boxes,
  BrainCircuit,
  ChevronRight,
  Cpu,
  Database,
  Gauge,
  Globe2,
  Layers3,
  Network,
  Radio,
  Search,
  Server,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Zap,
} from 'lucide-react'

const accent = '#f15a2b'

const pipeline = [
  {
    id: '01',
    title: 'Collect',
    icon: Search,
    items: ['AI answers', 'Shopping surfaces', 'Product feeds', 'Broker signals'],
  },
  {
    id: '02',
    title: 'Normalize',
    icon: Cpu,
    items: ['Entity resolution', 'Brand canonicalization', 'Citation mapping', 'Quality gates'],
  },
  {
    id: '03',
    title: 'Score',
    icon: Gauge,
    items: ['Mention rank', 'Trust signals', 'Source authority', 'Offer quality'],
  },
  {
    id: '04',
    title: 'Activate',
    icon: Zap,
    items: ['Dashboards', 'MCP/API layer', 'Product agents', 'Visibility proxy'],
  },
]

const metricCards = [
  { label: 'AI sources monitored', value: '2.4M', change: '+12%', icon: Search, color: '#f15a2b', bars: [18, 26, 24, 34, 30, 38, 46] },
  { label: 'Citations tracked', value: '18.7K', change: '+8%', icon: Network, color: '#4f8cff', bars: [17, 22, 28, 31, 29, 35, 43] },
  { label: 'Products indexed', value: '94K', change: '+23%', icon: Boxes, color: '#22c58b', bars: [14, 18, 24, 30, 36, 38, 44] },
  { label: 'Answer records', value: '4.1M', change: '+31%', icon: BrainCircuit, color: '#f3b33f', bars: [12, 16, 20, 28, 34, 38, 41] },
  { label: 'Catalog files', value: '312K', change: '+5%', icon: Database, color: '#8b5cf6', bars: [21, 22, 24, 27, 30, 34, 37] },
  { label: 'Graph records', value: '8.9M', change: '+18%', icon: Layers3, color: '#21b8d8', bars: [16, 18, 26, 31, 36, 41, 45] },
]

const sources = [
  {
    tier: 'Tier 1',
    label: 'Primary AI platforms',
    items: [
      { name: 'OpenAI', type: 'Answers', logo: '/logos/openai.png' },
      { name: 'Anthropic', type: 'Answers', logo: '/logos/anthropic.png' },
      { name: 'Perplexity', type: 'Search', logo: '/logos/perplexity.png' },
      { name: 'Google AI', type: 'Answers', logo: '/logos/google.png' },
    ],
  },
  {
    tier: 'Tier 2',
    label: 'Commerce and cloud signals',
    items: [
      { name: 'Shopify', type: 'Products', logo: '/logos/shopify.png' },
      { name: 'AWS AI', type: 'Cloud', logo: '/logos/aws.png' },
      { name: 'Google Cloud', type: 'Cloud', logo: '/logos/googlecloud.png' },
      { name: 'GitHub', type: 'Repos', logo: '/logos/github.png' },
    ],
  },
  {
    tier: 'Tier 3',
    label: 'Editorial and research',
    items: [
      { name: 'SEJ', type: 'Editorial', logo: '/logos/searchenginejournal.png' },
      { name: 'Moz', type: 'SEO', logo: '/logos/moz.png' },
      { name: 'Ahrefs', type: 'SEO', logo: '/logos/ahrefs.png' },
      { name: 'YouTube', type: 'Video', logo: '/logos/youtube.png' },
    ],
  },
]

const stack = [
  { name: 'Next.js', detail: 'Frontend', icon: Layers3 },
  { name: 'FastAPI', detail: 'API layer', icon: Zap },
  { name: 'Supabase', detail: 'Database', icon: Database },
  { name: 'Railway', detail: 'Infrastructure', icon: Server },
  { name: 'Tailwind CSS', detail: 'Interface system', icon: Sparkles },
  { name: 'Cloudflare', detail: 'Edge worker', icon: ShieldCheck },
  { name: 'MCP', detail: 'Agent interface', icon: Bot },
  { name: 'GA4', detail: 'Attribution', icon: BarChart3 },
]

function LogoMark() {
  return (
    <span className="relative block h-16 w-44 overflow-hidden">
      <img
        src="/landing/alignment-logo-final.svg"
        alt="Alignment AI"
        className="absolute left-0 top-1/2 h-16 w-auto max-w-none -translate-y-1/2 object-contain"
      />
    </span>
  )
}

function SectionHeader({
  kicker,
  title,
  description,
}: {
  kicker: string
  title: string
  description: string
}) {
  return (
    <div className="mb-10">
      <div className="mb-4 inline-flex items-center gap-2 border border-[#552412] bg-[#190b06] px-3 py-1 text-[10px] font-black uppercase text-[#ff7a45]">
        <span className="h-1.5 w-1.5 bg-[#ff6a35]" />
        {kicker}
      </div>
      <h2 className="text-3xl font-bold leading-tight tracking-tight text-white md:text-4xl">
        {title}
      </h2>
      <p className="mt-4 max-w-2xl text-sm leading-6 text-[#858585]">{description}</p>
    </div>
  )
}

function MetricBars({ bars, color }: { bars: number[]; color: string }) {
  return (
    <div className="mt-5 flex h-12 items-end gap-1.5">
      {bars.map((height, index) => (
        <span
          key={`${height}-${index}`}
          className="flex-1 border-t"
          style={{ height, backgroundColor: color, borderColor: `${color}66` }}
        />
      ))}
    </div>
  )
}

function HeroGraphCard() {
  const linePoints = '0,78 48,68 96,72 144,50 192,56 240,36 288,43 336,30'

  return (
    <div className="relative mx-auto w-full max-w-[560px]">
      <div className="absolute -inset-10 bg-[#f15a2b]/10 blur-[80px]" />
      <div className="relative border border-[#2a2a2a] bg-[#101010] p-7 shadow-[0_32px_90px_rgba(0,0,0,0.55)]">
        <div className="mb-7 flex items-center justify-between">
          <div>
            <div className="text-[12px] font-black uppercase tracking-[0.22em] text-[#8d8d8d]">Commerce Graph</div>
            <div className="mt-2 text-[11px] font-bold uppercase text-[#5f5f5f]">Live entity intelligence</div>
          </div>
          <div className="flex items-center gap-2 text-[12px] font-black uppercase text-[#54c46f]">
            <span className="h-2 w-2 bg-[#54c46f]" />
            Live
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            ['2.4M', 'AI Sources'],
            ['18K', 'Citations'],
            ['94K', 'Products'],
          ].map(([value, label]) => (
            <div key={label} className="border border-[#202020] bg-[#151515] px-4 py-5 text-center">
              <div className="font-['Arial_Narrow',Arial,sans-serif] text-3xl font-black text-white">{value}</div>
              <div className="mt-1 text-[11px] font-bold uppercase text-[#777]">{label}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 border border-[#261914] bg-[#150d0a] p-4">
          <svg viewBox="0 0 336 96" className="h-28 w-full overflow-visible" aria-hidden="true">
            <defs>
              <linearGradient id="heroGraphFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accent} stopOpacity="0.28" />
                <stop offset="100%" stopColor={accent} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={`M${linePoints} L336,96 L0,96 Z`} fill="url(#heroGraphFill)" />
            <polyline points={linePoints} fill="none" stroke={accent} strokeWidth="4" strokeLinejoin="miter" />
          </svg>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {['ChatGPT', 'Perplexity', 'Claude', '+41 more'].map((item) => (
            <div key={item} className="border border-[#242424] bg-[#171717] px-3 py-2 text-center text-[12px] font-bold text-[#cfcfcf]">
              {item}
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-[1fr_auto] gap-3 border-t border-[#242424] pt-5">
          <div>
            <div className="text-[11px] font-black uppercase text-[#777]">Active pipeline</div>
            <div className="mt-2 flex items-center gap-2 text-[13px] font-black text-white">
              <Database className="h-4 w-4 text-[#f15a2b]" />
              8.9M normalized graph records
            </div>
          </div>
          <div className="grid h-10 w-10 place-items-center bg-[#f15a2b] text-white">
            <ArrowRight className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="absolute -bottom-8 -left-8 hidden border border-[#2a2a2a] bg-[#0d0d0d] px-4 py-3 shadow-[0_18px_60px_rgba(0,0,0,0.45)] lg:block">
        <div className="text-[10px] font-black uppercase text-[#777]">Latency</div>
        <div className="mt-1 font-['Arial_Narrow',Arial,sans-serif] text-2xl font-black text-white">
          50<span className="text-[#f15a2b]">ms</span>
        </div>
      </div>

      <div className="absolute -right-5 -top-7 hidden border border-[#4c2113] bg-[#160b07] px-4 py-3 text-[11px] font-black uppercase text-[#ff7a45] shadow-[0_18px_60px_rgba(0,0,0,0.45)] md:block">
        + AI commerce signals
      </div>
    </div>
  )
}

export default function DemoSharpPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-[#d9d9d9]">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:44px_44px]" />
      <div className="relative">
        <div className="overflow-hidden bg-[#090909]">
          <header className="sticky top-0 z-20 border-b border-[#1d1d1d] bg-[#080808]/95 backdrop-blur">
            <nav className="mx-auto flex h-24 max-w-[1180px] items-center justify-between px-5 md:px-8">
              <LogoMark />
              <div className="hidden items-center gap-8 text-[11px] font-bold uppercase text-[#777] md:flex">
                {['System', 'Technology', 'Pricing', 'Resources', 'Contact'].map((item, index) => (
                  <a key={item} className={index === 0 ? 'text-[#ff6a35]' : 'hover:text-white'} href={`#${item.toLowerCase()}`}>
                    {item}
                  </a>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/ai-visibility-check/"
                  className="hidden border border-[#2c2c2c] px-3 py-2 text-[11px] font-bold uppercase text-[#9a9a9a] hover:border-[#4a4a4a] hover:text-white sm:inline-flex"
                >
                  AI Visibility Check
                </Link>
                <Link
                  href="/login/"
                  className="bg-[#f15a2b] px-4 py-2 text-[11px] font-black uppercase text-white shadow-[0_0_28px_rgba(241,90,43,0.28)] hover:bg-[#ff6938]"
                >
                  Get Started
                </Link>
              </div>
            </nav>
          </header>

          <section
            id="system"
            className="relative min-h-[720px] border-b border-[#1d1d1d] px-5 py-16 md:px-12 md:py-20"
            style={{
              background:
                'radial-gradient(circle at 72% 42%, rgba(241,90,43,0.22), transparent 28%), radial-gradient(circle at 18% 18%, rgba(255,255,255,0.055), transparent 24%), #090909',
            }}
          >
            <div className="mx-auto grid min-h-[600px] max-w-[1180px] grid-cols-1 items-center gap-14 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="relative">
                <div className="mb-7 inline-flex items-center gap-2 border border-[#592513] bg-[#190b06] px-4 py-2 text-[11px] font-black uppercase text-[#ff7a45]">
                  <Activity className="h-3.5 w-3.5" />
                  AI Commerce Graph - Live
                </div>
                <h1 className="max-w-[620px] font-['Arial_Narrow',Arial,sans-serif] text-5xl font-black uppercase leading-[0.94] text-white md:text-7xl">
                  The Data System Behind
                  <span className="block text-[#f15a2b]">AI Commerce</span>
                </h1>
                <p className="mt-7 max-w-[580px] text-base leading-8 text-[#9a9a9a] md:text-lg">
                  Collect AI answers, shopping signals, and product data. Normalize it into a single commerce graph. Deliver to dashboards, APIs, and agents in real time.
                </p>

                <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/login/"
                    className="inline-flex items-center justify-center gap-2 bg-[#f15a2b] px-7 py-4 text-[13px] font-black uppercase text-white shadow-[0_0_34px_rgba(241,90,43,0.33)] hover:bg-[#ff6938]"
                  >
                    Get Started Free
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <a
                    href="#graph"
                    className="inline-flex items-center justify-center gap-2 border border-[#383838] bg-[#111] px-7 py-4 text-[13px] font-black uppercase text-[#d8d8d8] hover:border-[#555] hover:text-white"
                  >
                    See How It Works
                    <ChevronRight className="h-4 w-4" />
                  </a>
                </div>
              </div>

              <HeroGraphCard />
            </div>
          </section>

          <section className="border-b border-[#1d1d1d] bg-[#0e0e0e] px-5 py-16 md:px-12 md:py-20">
            <div className="mx-auto max-w-[1180px]">
              <SectionHeader
                kicker="Architecture"
                title="AI Commerce Graph Pipeline"
                description="A disciplined data path from raw AI outputs to normalized, machine-readable commerce intelligence."
              />
              <div className="grid grid-cols-1 border border-[#242424] md:grid-cols-4">
              {pipeline.map((step, index) => {
                const Icon = step.icon
                return (
                  <article key={step.title} className={`min-h-[230px] bg-[#111] p-6 ${index < pipeline.length - 1 ? 'border-b border-[#242424] md:border-b-0 md:border-r' : ''}`}>
                    <div className="text-[11px] font-black uppercase text-[#f15a2b]">{step.id}</div>
                    <Icon className="mt-5 h-7 w-7 text-white" strokeWidth={1.8} />
                    <h3 className="mt-5 text-[16px] font-black uppercase text-white">{step.title}</h3>
                    <ul className="mt-4 space-y-2 text-[12px] leading-5 text-[#858585]">
                      {step.items.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span className="mt-2 h-1 w-1 shrink-0 bg-[#f15a2b]" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </article>
                )
              })}
              </div>
            </div>
          </section>

          <section id="graph" className="border-b border-[#1d1d1d] px-5 py-16 md:px-12 md:py-20">
            <div className="mx-auto max-w-[1180px]">
              <SectionHeader
                kicker="Real-time stats"
                title="Commerce Graph Metrics"
                description="Pipeline ingest runs continuously. These cards show the operating layer behind AI commerce visibility."
              />
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {metricCards.map((metric) => {
                const Icon = metric.icon
                return (
                  <article
                    key={metric.label}
                    className="border border-[#292929] border-t-2 bg-[#111] p-6 hover:border-[#4b2a1c]"
                    style={{ borderTopColor: metric.color }}
                  >
                    <Icon className="h-5 w-5" style={{ color: metric.color }} />
                    <div className="mt-5 flex items-end gap-2">
                      <div className="font-['Arial_Narrow',Arial,sans-serif] text-4xl font-black uppercase text-white">{metric.value}</div>
                      <div className="pb-1 text-[11px] font-black uppercase text-[#2fb56f]">{metric.change}</div>
                    </div>
                    <div className="mt-1 text-[12px] font-bold text-[#777]">{metric.label}</div>
                    <MetricBars bars={metric.bars} color={metric.color} />
                  </article>
                )
              })}
              </div>
            </div>
          </section>

          <section id="resources" className="border-b border-[#1d1d1d] bg-[#0e0e0e] px-5 py-16 md:px-12 md:py-20">
            <div className="mx-auto max-w-[1180px]">
              <SectionHeader
                kicker="Intelligence network"
                title="Signal Sources"
                description="Monitoring authoritative sources across the AI ecosystem, organized by reliability tier."
              />
              <div className="space-y-8">
              {sources.map((group) => (
                <div key={group.tier}>
                  <div className="mb-3 flex items-center gap-3">
                    <span className="text-[11px] font-black uppercase text-[#f15a2b]">{group.tier}</span>
                    <span className="text-[11px] font-black uppercase text-[#777]">{group.label}</span>
                    <span className="h-px flex-1 bg-[#282828]" />
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                    {group.items.map((item) => {
                      return (
                        <div key={item.name} className="flex items-center gap-3 border border-[#242424] bg-[#121212] px-4 py-4">
                          <span className="grid h-9 w-9 place-items-center border border-[#2a2a2a] bg-[#181818]">
                            <img src={item.logo} alt="" className="h-5 w-5 object-contain brightness-0 invert opacity-90" />
                          </span>
                          <div>
                            <div className="text-[13px] font-black text-white">{item.name}</div>
                            <div className="mt-0.5 text-[11px] font-bold text-[#666]">{item.type}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
              </div>
            </div>
          </section>

          <section id="technology" className="border-b border-[#1d1d1d] px-5 py-16 md:px-12 md:py-20">
            <div className="mx-auto max-w-[1180px]">
              <SectionHeader
                kicker="Built with"
                title="Technical Stack"
                description="Modern infrastructure powering every layer of the pipeline, from product surfaces to agent-facing APIs."
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {stack.map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.name} className="flex items-center gap-3 border border-[#292929] bg-[#111] p-4">
                    <Icon className="h-5 w-5 text-[#f15a2b]" />
                    <div>
                      <div className="text-[13px] font-black text-white">{item.name}</div>
                      <div className="text-[11px] font-bold text-[#666]">{item.detail}</div>
                    </div>
                  </div>
                )
              })}
              </div>
            </div>
          </section>

          <section className="px-5 py-20 text-center md:px-12 md:py-24">
            <div className="mx-auto max-w-[1180px]">
              <div className="mx-auto inline-flex items-center gap-2 border border-[#592513] bg-[#190b06] px-4 py-2 text-[11px] font-black uppercase text-[#ff7a45]">
                <Radio className="h-3.5 w-3.5" />
                Start exploring
              </div>
              <h2 className="mx-auto mt-7 max-w-3xl text-4xl font-bold leading-tight tracking-tight text-white md:text-5xl">
                Explore the AI Commerce Graph
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-sm leading-6 text-[#858585]">
                Dive into answer engines, shopping surfaces, citations, and intelligence curated by the pipeline.
              </p>
              <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href="/login/" className="inline-flex items-center justify-center gap-2 bg-[#f15a2b] px-6 py-3 text-[12px] font-black uppercase text-white hover:bg-[#ff6938]">
                  Explore Insights
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/technology/" className="inline-flex items-center justify-center border border-[#303030] bg-[#121212] px-6 py-3 text-[12px] font-black uppercase text-[#c8c8c8] hover:border-[#555] hover:text-white">
                  Learn the science
                </Link>
              </div>
            </div>
          </section>

          <footer className="border-t border-[#1d1d1d] bg-[#080808] px-5 py-10 md:px-12">
            <div className="mx-auto grid max-w-[1180px] gap-10 md:grid-cols-[1.4fr_2fr]">
              <div>
                <LogoMark />
                <p className="mt-4 max-w-xs text-[12px] leading-6 text-[#6f6f6f]">
                  Build the operating layer for AI discovery, recommendations, and agentic commerce.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-8 text-[12px]">
                {[
                  ['Product', 'System', 'Technology', 'Pricing'],
                  ['Resources', 'Blog', 'Insights', 'Documentation'],
                  ['Company', 'Contact', 'Privacy', 'Terms'],
                ].map(([title, ...links]) => (
                  <div key={title}>
                    <div className="mb-4 text-[11px] font-black uppercase text-[#777]">{title}</div>
                    <div className="space-y-2">
                      {links.map((item) => (
                        <div key={item} className="font-bold text-[#8a8a8a]">{item}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mx-auto mt-10 flex max-w-[1180px] flex-col justify-between gap-4 border-t border-[#1d1d1d] pt-6 text-[11px] font-bold text-[#606060] md:flex-row">
              <span>(c) 2026 Alignment AI. All rights reserved.</span>
              <span style={{ color: accent }}>contact@alignmenttech.ai</span>
            </div>
          </footer>
        </div>
      </div>
    </main>
  )
}
