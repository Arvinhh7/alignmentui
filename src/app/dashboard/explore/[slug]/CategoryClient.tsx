'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  ArrowLeft, Play, Loader2, RefreshCw, BarChart2, Link2, Tag,
  CheckCircle2, Quote, ExternalLink, Search, X, MessageSquareText,
  ChevronRight, Database,
} from 'lucide-react'
import { BrandLogo } from '@/components/BrandLogo'

const EXPLORE_BRAND_DOMAINS: [string, string][] = [
  ['apple', 'apple.com'],
  ['sony', 'sony.com'],
  ['bose', 'bose.com'],
  ['samsung', 'samsung.com'],
  ['google nest', 'store.google.com'],
  ['google', 'google.com'],
  ['jbl', 'jbl.com'],
  ['shokz', 'shokz.com'],
  ['oura', 'ouraring.com'],
  ['ringconn', 'ringconn.com'],
  ['ultrahuman', 'ultrahuman.com'],
  ['garmin', 'garmin.com'],
  ['keychron', 'keychron.com'],
  ['logitech', 'logitech.com'],
  ['irobot', 'irobot.com'],
  ['roborock', 'roborock.com'],
  ['eufy', 'eufy.com'],
  ['ecovacs', 'ecovacs.com'],
  ['dreame', 'dreametech.com'],
  ['ring', 'ring.com'],
  ['arlo', 'arlo.com'],
  ['wyze', 'wyze.com'],
  ['blink', 'blinkforhome.com'],
  ['reolink', 'reolink.com'],
  ['tp-link', 'tp-link.com'],
  ['ninja', 'ninjakitchen.com'],
  ['breville', 'breville.com'],
  ['philips', 'philips.com'],
  ['coway', 'cowaymega.com'],
  ['levoit', 'levoit.com'],
  ['blueair', 'blueair.com'],
  ['iqair', 'iqair.com'],
  ['ecoflow', 'ecoflow.com'],
  ['jackery', 'jackery.com'],
  ['bluetti', 'bluettipower.com'],
  ['anker', 'anker.com'],
  ['ray-ban', 'ray-ban.com'],
  ['oakley', 'oakley.com'],
  ['maui jim', 'mauijim.com'],
  ['warby parker', 'warbyparker.com'],
  ['flexispot', 'flexispot.com'],
  ['uplift', 'upliftdesk.com'],
  ['secretlab', 'secretlab.co'],
  ['herman miller', 'hermanmiller.com'],
  ['steelcase', 'steelcase.com'],
  ['salesforce', 'salesforce.com'],
  ['hubspot', 'hubspot.com'],
  ['zoho', 'zoho.com'],
  ['pipedrive', 'pipedrive.com'],
  ['monday.com', 'monday.com'],
]

const ENGINE_META: Record<string, { name: string; domain: string }> = {
  chatgpt: { name: 'ChatGPT', domain: 'chatgpt.com' },
  perplexity: { name: 'Perplexity', domain: 'perplexity.ai' },
  claude: { name: 'Claude', domain: 'claude.ai' },
  gemini: { name: 'Gemini', domain: 'gemini.google.com' },
  google_overview: { name: 'Google Overview', domain: 'google.com' },
  'google-overview': { name: 'Google Overview', domain: 'google.com' },
  grok: { name: 'Grok', domain: 'x.ai' },
}

const ENGINE_ORDER = ['chatgpt', 'perplexity', 'claude', 'gemini', 'google_overview', 'grok']

function guessBrandDomain(brandName: string): string {
  const lower = (brandName || '').toLowerCase().trim()
  for (const [key, domain] of EXPLORE_BRAND_DOMAINS) {
    if (lower === key || lower.startsWith(key + ' ')) return domain
  }
  const first = lower.split(/[\s\-–—]/)[0].replace(/[^a-z0-9]/g, '')
  return first ? `${first}.com` : ''
}

function engineMeta(engine?: string | null) {
  const key = (engine || 'chatgpt').toLowerCase()
  return ENGINE_META[key] || { name: key.charAt(0).toUpperCase() + key.slice(1), domain: '' }
}

function fmt(n: number | null | undefined): string {
  if (!n) return '-'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

function shortDate(value?: string | null): string {
  if (!value) return '-'
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function snippet(text: string, max = 260): string {
  const clean = (text || '').replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  return `${clean.slice(0, max).trim()}...`
}

const INTENT_COLOR: Record<string, string> = {
  solution_explore: 'bg-sage-bg text-sage',
  comparison_decision: 'bg-caution-bg text-caution',
  action_choice: 'bg-red-soft-bg text-red-soft',
  info_cognition: 'bg-surface-muted text-ink-3',
}

const INTENT_LABEL: Record<string, string> = {
  solution_explore: 'Solution',
  comparison_decision: 'Comparison',
  action_choice: 'Action',
  info_cognition: 'Info',
}

interface CategoryDetail {
  category: Record<string, unknown>
  brands: Brand[]
  citations: Citation[]
  topics: Topic[]
  latest_scan: ScanRun | null
  recent_answers: RecentAnswer[]
}

interface Brand {
  brand_name: string
  brand_domain: string | null
  som_pct: number
  mentions: number
  topics_led?: number
  topics_in_top3?: number
  rank: number
}

interface Citation {
  domain: string
  url?: string
  citation_count?: number
  answer_count?: number
}

interface Topic {
  slot_number: number
  slot_type: string
  name: string
  intent_type: string
  leader_brand: string | null
  leader_mentions?: number | null
  total_mentions?: number | null
  ai_traffic_mo: number | null
}

interface ScanRun {
  id: string
  status: string
  prompt_count: number
  completed_count: number
  started_at: string
  completed_at: string | null
  engine: string
}

interface MentionedBrand {
  name?: string
  domain?: string
  mentions?: number
  is_recommended?: boolean
}

interface RecentAnswer {
  id: string
  topic_name?: string
  topic_slot?: number
  intent_type?: string
  prompt?: string
  answer_text: string
  image_urls?: string[]
  brands: MentionedBrand[]
  citations: Citation[]
  quoted_citations: Citation[]
  source_only_citations: Citation[]
  search_sources: Citation[]
  scanned_at?: string
  engine?: string
}

function EnginePill({ engine, active = false }: { engine: string; active?: boolean }) {
  const meta = engineMeta(engine)
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
      active ? 'border-sage/30 bg-sage-bg text-sage' : 'border-divider-light bg-surface text-ink-3'
    }`}>
      <BrandLogo domain={meta.domain} name={meta.name} size={16} />
      {meta.name}
    </span>
  )
}

function BrandChip({ brand }: { brand: MentionedBrand }) {
  const name = brand.name || 'Unknown'
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-divider-light bg-canvas px-2 py-1 text-[10px] font-medium text-ink-3">
      <BrandLogo domain={brand.domain || guessBrandDomain(name)} name={name} size={14} />
      <span className="max-w-[140px] truncate">{name}</span>
      {!!brand.mentions && <span className="text-ink-3">x{brand.mentions}</span>}
    </span>
  )
}

function CitationRow({ citation }: { citation: Citation }) {
  const domain = citation.domain || (citation.url ? citation.url.replace(/^https?:\/\//, '').split('/')[0] : 'source')
  const href = citation.url || (domain ? `https://${domain}` : '#')
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex min-w-0 items-center gap-2 rounded-lg border border-divider-light bg-surface px-3 py-2 text-[11px] text-ink hover:border-ink/20"
    >
      <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`} alt="" className="h-4 w-4 rounded" />
      <span className="truncate">{domain}</span>
      <ExternalLink className="ml-auto h-3 w-3 shrink-0 text-ink-3" />
    </a>
  )
}

function brandKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function highlightKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function brandListForRecord(record: RecentAnswer, allBrands: Brand[]): MentionedBrand[] {
  const byName = new Map<string, MentionedBrand>()
  for (const brand of allBrands) {
    byName.set(brandKey(brand.brand_name), {
      name: brand.brand_name,
      domain: brand.brand_domain || guessBrandDomain(brand.brand_name),
      mentions: brand.mentions,
    })
  }
  for (const brand of record.brands || []) {
    if (!brand.name) continue
    byName.set(brandKey(brand.name), brand)
  }
  return Array.from(byName.values()).filter(brand => (brand.name || '').length > 2)
}

function stripEmphasisMarkers(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*\*/g, '')
    .replace(/(^|\s)\*(?=\S)/g, '$1')
    .replace(/(\S)\*(?=\s|$|[.,:;!?])/g, '$1')
}

function stripMarkdown(text: string): string {
  return stripEmphasisMarkers(text)
    .replace(/\[([^\]]+)]\((https?:\/\/[^)]+)\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim()
}

function normalizeImageUrl(url: string): string {
  return url.replace(/[),.;]+$/g, '')
}

function renderInline(text: string, brands: MentionedBrand[], keyPrefix: string) {
  const linkRe = /\[([^\]]+)]\((https?:\/\/[^)]+)\)|(https?:\/\/[^\s)]+)/g
  const displayText = stripEmphasisMarkers(text)
  const parts: { text: string; href?: string }[] = []
  let last = 0
  let match: RegExpExecArray | null
  while ((match = linkRe.exec(displayText)) !== null) {
    if (match.index > last) parts.push({ text: displayText.slice(last, match.index) })
    parts.push({ text: match[1] || match[3], href: match[2] || normalizeImageUrl(match[3]) })
    last = match.index + match[0].length
  }
  if (last < displayText.length) parts.push({ text: displayText.slice(last) })

  const orderedBrands = [...brands]
    .filter(brand => brand.name)
    .sort((a, b) => (b.name || '').length - (a.name || '').length)

  const renderBrandText = (raw: string, partKey: string) => {
    let remaining = raw
    const nodes = []
    let idx = 0
    while (remaining) {
      const lower = remaining.toLowerCase()
      let found: { brand: MentionedBrand; index: number } | null = null
      for (const brand of orderedBrands) {
        const name = brand.name || ''
        const index = lower.indexOf(name.toLowerCase())
        if (index >= 0 && (!found || index < found.index)) found = { brand, index }
      }
      if (!found) {
        nodes.push(<span key={`${partKey}-t-${idx}`}>{stripMarkdown(remaining)}</span>)
        break
      }
      if (found.index > 0) nodes.push(<span key={`${partKey}-t-${idx}`}>{stripMarkdown(remaining.slice(0, found.index))}</span>)
      const name = found.brand.name || ''
      nodes.push(
        <span key={`${partKey}-b-${idx}`} className="mx-0.5 inline-flex items-center gap-1 rounded bg-sage-bg px-1.5 py-0.5 font-semibold text-sage">
          <BrandLogo domain={found.brand.domain || guessBrandDomain(name)} name={name} size={14} />
          {name}
        </span>
      )
      remaining = remaining.slice(found.index + name.length)
      idx += 1
    }
    return nodes
  }

  return parts.map((part, idx) => {
    const nodes = renderBrandText(part.text, `${keyPrefix}-${idx}`)
    if (!part.href) return <span key={`${keyPrefix}-${idx}`}>{nodes}</span>
    return (
      <a key={`${keyPrefix}-${idx}`} href={part.href} target="_blank" rel="noreferrer" className="font-medium text-blue-700 underline decoration-blue-200 underline-offset-2">
        {nodes}
      </a>
    )
  })
}

function RenderAIResponse({ record, brands }: { record: RecentAnswer; brands: Brand[] }) {
  const highlightBrands = brandListForRecord(record, brands)
  const imageUrls = new Set((record.image_urls || []).map(normalizeImageUrl))
  const renderedImageUrls = new Set<string>()
  const lines = (record.answer_text || '').split('\n')

  return (
    <div className="rounded-xl bg-canvas p-5 text-[13px] leading-6 text-ink">
      <div className="space-y-3">
        {lines.map((rawLine, idx) => {
          const line = rawLine.trim()
          if (!line) return <div key={`space-${idx}`} className="h-1" />

          const imageMatch = line.match(/!\[[^\]]*]\((https?:\/\/[^)\s]+)\)/i)
          const bareImageMatch = line.match(/(https?:\/\/[^\s)]+?\.(?:png|jpe?g|webp|gif)(?:\?[^\s)]*)?)/i)
          const imageUrl = imageMatch?.[1] || bareImageMatch?.[1]
          if (imageUrl) {
            const cleanUrl = normalizeImageUrl(imageUrl)
            imageUrls.add(cleanUrl)
            renderedImageUrls.add(cleanUrl)
            return (
              <figure key={`img-${idx}`} className="max-w-xl overflow-hidden rounded-xl border border-divider-light bg-white">
                <img src={cleanUrl} alt="AI response visual" className="max-h-[520px] w-full object-contain" />
              </figure>
            )
          }

          const clean = stripMarkdown(line).replace(/^#{1,4}\s*/, '')
          if (/^[-*•]\s+/.test(line)) {
            return (
              <div key={`li-${idx}`} className="flex gap-2 pl-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ink" />
                <p>{renderInline(line.replace(/^[-*•]\s+/, ''), highlightBrands, `li-${idx}`)}</p>
              </div>
            )
          }
          const numbered = line.match(/^(\d+)\.\s+(.+)$/)
          if (numbered) {
            return (
              <div key={`num-${idx}`} className="flex gap-2">
                <span className="w-5 shrink-0 font-semibold text-ink-3">{numbered[1]}.</span>
                <p>{renderInline(numbered[2], highlightBrands, `num-${idx}`)}</p>
              </div>
            )
          }
          if (/^\*\*[^*]+:\*\*$/.test(line) || /^#{1,4}\s+/.test(line) || (clean.endsWith(':') && clean.length < 90)) {
            return <h5 key={`h-${idx}`} className="pt-2 text-[13px] font-bold text-ink">{renderInline(clean, highlightBrands, `h-${idx}`)}</h5>
          }
          return <p key={`p-${idx}`}>{renderInline(line, highlightBrands, `p-${idx}`)}</p>
        })}
      </div>
      {Array.from(imageUrls).length > 0 && (
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          {Array.from(imageUrls).filter(url => !renderedImageUrls.has(url)).map(url => (
            <a key={url} href={url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-xl border border-divider-light bg-white">
              <img src={url} alt="AI response visual" className="max-h-80 w-full object-contain" />
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CategoryClient({ slug }: { slug: string }) {
  const searchParams = useSearchParams()
  const [data, setData] = useState<CategoryDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [scanRunId, setScanRunId] = useState<string | null>(null)
  const [scanProgress, setScanProgress] = useState(0)
  const [selectedRecord, setSelectedRecord] = useState<RecentAnswer | null>(null)

  const base = process.env.NEXT_PUBLIC_API_URL || ''

  const loadData = useCallback(() => {
    fetch(`${base}/api/explore/categories/${slug}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(d => {
        if (!d || !d.category) { setData(null); return }
        setData(d)
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [slug, base])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    if (!scanRunId || !scanning) return
    const poll = setInterval(async () => {
      try {
        const r = await fetch(`${base}/api/explore/scan/${scanRunId}`)
        const run = await r.json()
        setScanProgress(run.progress_pct ?? 0)
        if (run.status === 'completed' || run.status === 'failed') {
          setScanning(false)
          setScanRunId(null)
          setScanProgress(0)
          loadData()
        }
      } catch { /* keep polling */ }
    }, 2500)
    return () => clearInterval(poll)
  }, [scanRunId, scanning, base, loadData])

  const handleScan = async () => {
    if (scanning) return
    setScanning(true)
    setScanProgress(0)
    try {
      const r = await fetch(`${base}/api/explore/categories/${slug}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ engine: 'chatgpt' }),
      })
      const res = await r.json()
      if (res.run_id) setScanRunId(res.run_id)
      if (res.status === 'already_running' && res.run_id) setScanRunId(res.run_id)
    } catch {
      setScanning(false)
    }
  }

  const highlightBrand = highlightKey(searchParams.get('brand') || '')
  const highlightTopic = highlightKey(searchParams.get('topic') || '')
  const highlightSource = highlightKey(searchParams.get('source') || '')

  useEffect(() => {
    if (!data) return
    const candidates = [
      highlightBrand ? `brand-${highlightBrand}` : '',
      highlightTopic ? `topic-${highlightTopic}` : '',
      highlightSource ? `source-${highlightSource}` : '',
      highlightSource ? 'citation-sources-section' : '',
    ].filter(Boolean)
    if (!candidates.length) return
    const timer = window.setTimeout(() => {
      for (const id of candidates) {
        const node = document.getElementById(id)
        if (!node) continue
        node.scrollIntoView({ behavior: 'smooth', block: 'center' })
        break
      }
    }, 120)
    return () => window.clearTimeout(timer)
  }, [data, highlightBrand, highlightTopic, highlightSource])

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-canvas">
      <Loader2 className="h-6 w-6 animate-spin text-ink-3" />
    </div>
  )

  if (!data) return (
    <div className="flex min-h-screen items-center justify-center bg-canvas">
      <p className="text-ink-3">Category not found.</p>
    </div>
  )

  const cat = data.category || {}
  const brands = data.brands || []
  const citations = data.citations || []
  const topics = data.topics || []
  const recentAnswers = data.recent_answers || []
  const latestScan = data.latest_scan || null
  const hasData = brands.length > 0
  const currentEngine = latestScan?.engine || 'chatgpt'
  const highlightedBrand = highlightBrand
    ? brands.find(brand => highlightKey(brand.brand_name) === highlightBrand)
    : null
  const visibleBrands = highlightedBrand && !brands.slice(0, 20).some(brand => brand.brand_name === highlightedBrand.brand_name)
    ? [...brands.slice(0, 19), highlightedBrand]
    : brands.slice(0, 20)

  return (
    <div className="min-h-screen bg-canvas">
      <div className="border-b border-divider-light bg-surface px-8 py-6">
        <Link href="/dashboard/explore" className="mb-3 flex w-fit items-center gap-1.5 text-[12px] text-ink-3 transition-colors hover:text-ink">
          <ArrowLeft className="h-3.5 w-3.5" /> Explore
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="heading-dash">{cat.name as string}</h1>
            <p className="mt-0.5 text-sm text-ink-3">{cat.vertical as string} · {cat.topic_count as number} topics</p>
          </div>
          <button
            onClick={handleScan}
            disabled={scanning}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-all ${
              scanning ? 'border border-caution/20 bg-caution-bg text-caution' : 'bg-ink text-ink-inv hover:bg-ink/80'
            }`}
          >
            {scanning ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Scanning {scanProgress}%</>
            ) : hasData ? (
              <><RefreshCw className="h-4 w-4" /> Re-scan</>
            ) : (
              <><Play className="h-4 w-4" /> Scan Now (~$1.35)</>
            )}
          </button>
        </div>

        {scanning && (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-muted">
            <div className="h-full rounded-full bg-caution transition-all duration-500" style={{ width: `${scanProgress}%` }} />
          </div>
        )}

        {hasData && (
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 text-[12px] text-ink-3">
            <span><strong className="text-ink">{brands.length}</strong> brands tracked</span>
            <span><strong className="text-ink">{citations.length}</strong> citation sources</span>
            <span><strong className="text-ink">{topics.length}</strong> topics ranked</span>
            {latestScan && (
              <span className="inline-flex flex-wrap items-center gap-2">
                <CheckCircle2 className={`h-4 w-4 ${latestScan.status === 'completed' ? 'text-sage' : 'text-caution'}`} />
                <span className="font-semibold text-ink">{latestScan.status}</span>
                <span>{latestScan.completed_count}/{latestScan.prompt_count} prompts</span>
                <EnginePill engine={currentEngine} active />
                <span>Completed {shortDate(latestScan.completed_at)}</span>
              </span>
            )}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {ENGINE_ORDER.map(engine => <EnginePill key={engine} engine={engine} active={engine === currentEngine} />)}
        </div>
      </div>

      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <section className="rounded-2xl border border-divider-light bg-surface p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-[14px] font-bold text-ink">
                  <BarChart2 className="h-4 w-4 text-ink-3" />
                  Brand Competitive Landscape
                </h2>
                <span className="text-[11px] text-ink-3">{brands.length} brands</span>
              </div>
              {!hasData ? (
                <div className="py-12 text-center">
                  <BarChart2 className="mx-auto mb-3 h-10 w-10 text-ink-3 opacity-30" />
                  <p className="mb-1 text-[13px] font-medium text-ink-3">No scan data yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {visibleBrands.map((brand, i) => {
                    const isHighlighted = highlightKey(brand.brand_name) === highlightBrand
                    return (
                    <div
                      key={brand.brand_name}
                      id={`brand-${highlightKey(brand.brand_name)}`}
                      className={`flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors ${
                        isHighlighted ? 'bg-sage-bg ring-1 ring-sage/30' : ''
                      }`}
                    >
                      <span className="w-5 shrink-0 text-right text-[11px] text-ink-3">{i + 1}</span>
                      <BrandLogo domain={brand.brand_domain || guessBrandDomain(brand.brand_name)} name={brand.brand_name} size={20} />
                      <span className="w-32 shrink-0 truncate text-[12px] font-semibold text-ink">{brand.brand_name}</span>
                      <div className="h-5 flex-1 overflow-hidden rounded bg-canvas">
                        <div
                          className="h-full rounded transition-all"
                          style={{
                            width: `${Math.max(2, brand.som_pct)}%`,
                            background: i === 0 ? '#000' : `rgba(0,0,0,${0.35 - i * 0.012})`,
                          }}
                        />
                      </div>
                      <span className="w-12 shrink-0 text-right text-[11px] font-bold text-ink">{brand.som_pct.toFixed(1)}%</span>
                      <span className="w-16 shrink-0 text-right text-[10px] text-ink-3">{brand.mentions} mentions</span>
                    </div>
                  )})}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-divider-light bg-surface p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-[14px] font-bold text-ink">
                  <Quote className="h-4 w-4 text-ink-3" />
                  How AI talks about this category
                </h2>
                <span className="text-[11px] text-ink-3">{recentAnswers.length} recent answers</span>
              </div>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {recentAnswers.slice(0, 4).map(answer => {
                  const answerBrands = brandListForRecord(answer, brands)
                  return (
                    <button
                      key={answer.id}
                      onClick={() => setSelectedRecord(answer)}
                      className="min-h-[160px] rounded-xl border border-divider-light bg-canvas p-4 text-left transition hover:border-ink/20 hover:bg-surface"
                    >
                      <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] text-ink-3">
                        <EnginePill engine={answer.engine || currentEngine} active />
                        <span>{shortDate(answer.scanned_at)}</span>
                        {answer.topic_name && <span className="truncate">· {answer.topic_name}</span>}
                      </div>
                      <p className="mb-3 text-[12px] italic text-ink-3">"{answer.prompt || answer.topic_name || 'AI answer sample'}"</p>
                      <p className="border-l-2 border-sage/50 pl-3 text-[12px] leading-5 text-ink">
                        {renderInline(snippet(answer.answer_text, 260), answerBrands, `snippet-${answer.id}`)}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {answer.brands.slice(0, 4).map((brand, idx) => <BrandChip key={`${answer.id}-${brand.name}-${idx}`} brand={brand} />)}
                      </div>
                      <div className="mt-4 flex items-center justify-end gap-1 text-[11px] font-semibold text-ink">
                        View full answer <ChevronRight className="h-3.5 w-3.5" />
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section id="citation-sources-section" className="rounded-2xl border border-divider-light bg-surface p-6">
              <h2 className="mb-4 flex items-center gap-2 text-[14px] font-bold text-ink">
                <Link2 className="h-4 w-4 text-ink-3" />
                Citation Sources
              </h2>
              <div className="mb-5">
                <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-sage">
                  <span className="h-1.5 w-1.5 rounded-full bg-sage" />
                  Quoted in answer
                </div>
                <div className="space-y-2">
                  {citations.slice(0, 20).map(c => {
                    const isHighlighted = highlightKey(c.domain) === highlightSource
                    return (
                    <div
                      key={c.domain}
                      id={`source-${highlightKey(c.domain)}`}
                      className={`flex items-center gap-2 rounded-xl px-2 py-1.5 text-[12px] transition-colors ${
                        isHighlighted ? 'bg-sage-bg ring-1 ring-sage/30' : ''
                      }`}
                    >
                      <img src={`https://www.google.com/s2/favicons?domain=${c.domain}&sz=32`} alt="" className="h-4 w-4 rounded" />
                      <span className="min-w-0 flex-1 truncate font-medium text-ink">{c.domain}</span>
                      <span className="text-[10px] text-ink-3">{c.citation_count}x · {c.answer_count} answers</span>
                    </div>
                  )})}
                </div>
              </div>
              <div className="mb-5">
                <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-3">
                  <Database className="h-3.5 w-3.5" />
                  Source only
                </div>
                <p className="rounded-lg bg-canvas px-3 py-2 text-[11px] text-ink-3">No source-only records in this scan.</p>
              </div>
              <div>
                <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-3">
                  <Search className="h-3.5 w-3.5" />
                  Search sources
                </div>
                <p className="rounded-lg bg-canvas px-3 py-2 text-[11px] text-ink-3">Search-source capture is ready for the next scanner enrichment.</p>
              </div>
            </section>
          </div>
        </div>

        <section className="rounded-2xl border border-divider-light bg-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[14px] font-bold text-ink">
              <Tag className="h-4 w-4 text-ink-3" />
              Topic Ranking
            </h2>
            <span className="text-[11px] text-ink-3">{topics.length} topics</span>
          </div>
          <div className="overflow-hidden rounded-xl border border-divider-light">
            <div className="grid grid-cols-[minmax(280px,1fr)_130px_110px_180px_36px] bg-canvas px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-ink-3">
              <span>Topic</span>
              <span className="text-right">AI Traffic / Mo</span>
              <span className="text-right">Mentions</span>
              <span>Leader</span>
              <span />
            </div>
            {topics.map(topic => {
              const isHighlighted = highlightKey(topic.name) === highlightTopic
              return (
              <div
                key={`${topic.slot_number}-${topic.name}`}
                id={`topic-${highlightKey(topic.name)}`}
                className={`grid grid-cols-[minmax(280px,1fr)_130px_110px_180px_36px] items-center border-t border-divider-light px-4 py-3 text-[12px] transition-colors ${
                  isHighlighted ? 'bg-sage-bg/70' : ''
                }`}
              >
                <div className="min-w-0">
                  <div className="truncate font-semibold text-ink">{topic.name}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${INTENT_COLOR[topic.intent_type] || 'bg-surface-muted text-ink-3'}`}>
                      {INTENT_LABEL[topic.intent_type] || topic.intent_type}
                    </span>
                    <span className="text-[10px] text-ink-3">US · en</span>
                  </div>
                </div>
                <span className="text-right font-medium text-ink">{fmt(topic.ai_traffic_mo)}</span>
                <span className="text-right font-medium text-ink">{topic.total_mentions ?? topic.leader_mentions ?? 0}</span>
                <span className="flex min-w-0 items-center gap-2 font-semibold text-ink">
                  {topic.leader_brand ? (
                    <>
                      <BrandLogo domain={guessBrandDomain(topic.leader_brand)} name={topic.leader_brand} size={18} />
                      <span className="truncate">{topic.leader_brand}</span>
                    </>
                  ) : (
                    <span className="text-ink-3">-</span>
                  )}
                </span>
                <ChevronRight className="h-4 w-4 justify-self-end text-ink-3" />
              </div>
            )})}
          </div>
        </section>
      </div>

      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/20">
          <div className="absolute inset-y-0 right-0 flex w-full max-w-5xl flex-col border-l border-divider-light bg-surface shadow-2xl">
            <div className="flex items-start justify-between border-b border-divider-light px-6 py-4">
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-ink-3">Record</p>
                <h3 className="text-[15px] font-bold text-ink">{selectedRecord.prompt || selectedRecord.topic_name}</h3>
              </div>
              <button onClick={() => setSelectedRecord(null)} className="rounded-lg p-2 text-ink-3 hover:bg-canvas hover:text-ink">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-6">
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-3">
                <EnginePill engine={selectedRecord.engine || currentEngine} active />
                <span>Date: {shortDate(selectedRecord.scanned_at)}</span>
                <span className="rounded-full bg-sage-bg px-2 py-1 font-semibold text-sage">completed</span>
                <span className="rounded-full bg-sage-bg px-2 py-1 font-semibold text-sage">brand mention</span>
              </div>

              <div className="rounded-xl border border-divider-light bg-canvas p-4">
                <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-ink">
                  <Search className="h-4 w-4 text-blue-500" />
                  AI web search
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] text-blue-600">triggered</span>
                </div>
                <p className="font-mono text-[11px] text-ink-3">Query: {selectedRecord.prompt || selectedRecord.topic_name}</p>
              </div>

              <div className="rounded-xl border border-divider-light bg-canvas p-4">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-ink-3">Brands Mentioned ({selectedRecord.brands.length})</p>
                <div className="flex flex-wrap gap-2">
                  {selectedRecord.brands.map((brand, idx) => <BrandChip key={`${brand.name}-${idx}`} brand={brand} />)}
                </div>
              </div>

              <div>
                <h4 className="mb-3 flex items-center gap-2 text-[13px] font-bold text-ink">
                  <MessageSquareText className="h-4 w-4 text-ink-3" />
                  AI Response
                </h4>
                <RenderAIResponse record={selectedRecord} brands={brands} />
              </div>

              <div>
                <h4 className="mb-3 flex items-center gap-2 text-[13px] font-bold text-ink">
                  <Link2 className="h-4 w-4 text-ink-3" />
                  Citations ({selectedRecord.citations.length})
                </h4>
                <div className="mb-4">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-sage">Quoted in answer ({selectedRecord.quoted_citations.length})</p>
                  <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                    {selectedRecord.quoted_citations.map((citation, idx) => <CitationRow key={`${citation.url || citation.domain}-${idx}`} citation={citation} />)}
                  </div>
                </div>
                <div className="mb-4">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-3">Listed as source only ({selectedRecord.source_only_citations.length})</p>
                  {selectedRecord.source_only_citations.length ? (
                    <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                      {selectedRecord.source_only_citations.map((citation, idx) => <CitationRow key={`${citation.url || citation.domain}-${idx}`} citation={citation} />)}
                    </div>
                  ) : (
                    <p className="rounded-lg bg-canvas px-3 py-2 text-[11px] text-ink-3">No source-only citations captured for this record.</p>
                  )}
                </div>
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-3">Search sources ({selectedRecord.search_sources.length})</p>
                  {selectedRecord.search_sources.length ? (
                    <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                      {selectedRecord.search_sources.map((citation, idx) => <CitationRow key={`${citation.url || citation.domain}-${idx}`} citation={citation} />)}
                    </div>
                  ) : (
                    <p className="rounded-lg bg-canvas px-3 py-2 text-[11px] text-ink-3">No separate search-source list captured yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
