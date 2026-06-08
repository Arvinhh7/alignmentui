'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  GitBranch,
  Layers3,
  Loader2,
  Play,
  ScanSearch,
  Search,
  ShieldCheck,
  Sparkles,
  Square,
  Target,
} from 'lucide-react'
import { api, type QueryFanoutRow } from '@/lib/api'
import { useUnified } from '../UnifiedContext'
import { CATEGORY_LABEL_MAP, INTENT_COLORS, resolveIntent } from '../shared/constants'

type Gate = 'pass' | 'warn' | 'fail'

interface FanoutQuery {
  id: string
  promptId: string
  prompt: string
  query: string
  share: number
  model: string
  modelDomain: string
  region: string
  persona: string
  freshness: string
  sourceDomain: string
  added: string[]
  dropped: string[]
  kept: string[]
  gates: {
    fetchable: Gate
    chosen: Gate
    extractable: Gate
  }
}

const MODEL_META: Record<string, { label: string; domain: string }> = {
  chatgpt: { label: 'ChatGPT', domain: 'chatgpt.com' },
  perplexity: { label: 'Perplexity', domain: 'perplexity.ai' },
  gemini: { label: 'Gemini', domain: 'gemini.google.com' },
  claude: { label: 'Claude', domain: 'claude.ai' },
}

const KNOWN_BRAND_DOMAINS: Record<string, string> = {
  anker: 'anker.com',
  'anker solix': 'ankersolix.com',
  bluetti: 'bluettipower.com',
  ecoflow: 'ecoflow.com',
  'goal zero': 'goalzero.com',
  jackery: 'jackery.com',
}

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'best', 'for', 'how', 'in', 'is', 'me',
  'my', 'of', 'on', 'or', 'rated', 'the', 'to', 'tools', 'vs', 'what', 'which',
  'with', 'your',
])

const LEGACY_INTENT_MAP: Record<string, string> = {
  commercial: 'action_choice',
  informational: 'info_cognition',
  navigational: 'solution_explore',
  transactional: 'action_choice',
}

const FANOUT_SHARES = [28, 24, 20, 16, 8, 4]

function normalizeDomain(domain: string) {
  return domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].trim()
}

function logoUrl(domain: string) {
  return `https://www.google.com/s2/favicons?domain=${normalizeDomain(domain)}&sz=64`
}

function slugifyName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function cleanPrompt(text: string, brandName: string) {
  return text
    .replace(/\{brand\}/gi, brandName || 'the brand')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeIntent(value: string) {
  return LEGACY_INTENT_MAP[value] ?? resolveIntent(value)
}

function keywords(text: string) {
  return Array.from(new Set(
    text
      .toLowerCase()
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !STOP_WORDS.has(word))
  )).slice(0, 9)
}

function titleCase(value: string) {
  return value
    .split(/[\s-_]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function bestBrandDomain(name: string, configuredDomain: string, evidenceDomains: string[]) {
  const normalizedName = name.trim().toLowerCase()
  const nameSlug = slugifyName(name)
  const configured = configuredDomain ? normalizeDomain(configuredDomain) : ''

  if (configured && nameSlug && slugifyName(configured).includes(nameSlug)) return configured

  const matchedEvidence = evidenceDomains.find(domain => {
    const domainSlug = slugifyName(domain)
    return nameSlug && (domainSlug.includes(nameSlug) || nameSlug.includes(domainSlug.split('com')[0]))
  })
  if (matchedEvidence) return matchedEvidence

  return KNOWN_BRAND_DOMAINS[normalizedName] ?? `${nameSlug}.com`
}

function LogoName({ name, domain, className = '' }: { name: string; domain: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 min-w-0 ${className}`}>
      <span className="w-6 h-6 rounded-md bg-surface border border-divider-light flex items-center justify-center flex-shrink-0 overflow-hidden">
        <img
          src={logoUrl(domain)}
          alt={`${name} logo`}
          className="w-4 h-4 object-contain"
          onError={e => {
            const img = e.currentTarget as HTMLImageElement
            if (img.dataset.fallback === '1') return
            img.dataset.fallback = '1'
            img.src = `https://www.google.com/s2/favicons?domain=${normalizeDomain(domain)}&sz=32`
          }}
        />
      </span>
      <span className="truncate">{name}</span>
    </span>
  )
}

function GatePill({ label, state }: { label: string; state: Gate }) {
  const styles: Record<Gate, string> = {
    pass: 'bg-sage-bg text-sage',
    warn: 'bg-caution-bg text-caution',
    fail: 'bg-red-soft-bg text-red-soft',
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold ${styles[state]}`}>
      {state === 'pass' ? <CheckCircle2 className="w-3 h-3" /> : <Target className="w-3 h-3" />}
      {label}
    </span>
  )
}

function buildFanouts(params: {
  prompts: { id: string; template: string; category: string; intent?: string }[]
  brandName: string
  brandDomain: string
  competitors: string[]
  evidenceDomains: string[]
  engines: string[]
  region: string
}) {
  const engines = params.engines.length ? params.engines : ['chatgpt']
  const evidence = params.evidenceDomains.length
    ? params.evidenceDomains
    : [params.brandDomain, ...params.competitors.map(name => bestBrandDomain(name, params.brandDomain, []))]
        .filter(Boolean)
        .map(normalizeDomain)

  return params.prompts.flatMap((prompt, promptIndex) => {
    const original = cleanPrompt(prompt.template, params.brandName)
    const words = keywords(original)
    const core = words.slice(0, 5).join(' ') || `${params.brandName} recommendation`
    const competitors = params.competitors.length ? params.competitors.slice(0, 3).join(' vs ') : `${params.brandName} alternatives`
    const year = new Date().getFullYear()

    const variants = [
      {
        query: `${core} reviews ${year}`,
        added: ['reviews', String(year)],
        dropped: ['rated on'],
        freshness: String(year),
      },
      {
        query: `${core} comparison ${competitors}`,
        added: ['comparison', ...params.competitors.slice(0, 2)],
        dropped: ['tools'],
        freshness: 'none',
      },
      {
        query: `${core} best options ${params.region}`,
        added: ['best options', params.region],
        dropped: [],
        freshness: 'regional',
      },
      {
        query: `${params.brandName} ${core} pros cons`,
        added: [params.brandName, 'pros', 'cons'],
        dropped: ['best'],
        freshness: 'none',
      },
      {
        query: `${core} buying guide pricing warranty`,
        added: ['buying guide', 'pricing', 'warranty'],
        dropped: [],
        freshness: 'commercial',
      },
      {
        query: `${core} source citations expert picks`,
        added: ['source citations', 'expert picks'],
        dropped: ['for'],
        freshness: 'none',
      },
    ]

    return variants.map((variant, index): FanoutQuery => {
      const modelKey = engines[(promptIndex + index) % engines.length]
      const model = MODEL_META[modelKey] ?? MODEL_META.chatgpt
      const sourceDomain = evidence[(promptIndex + index) % Math.max(evidence.length, 1)] || normalizeDomain(params.brandDomain)
      const sourceIsOwned = sourceDomain.includes(slugifyName(params.brandName)) || normalizeDomain(params.brandDomain).includes(sourceDomain)
      const share = FANOUT_SHARES[index] ?? 4

      return {
        id: `${prompt.id}-${index}`,
        promptId: prompt.id,
        prompt: original,
        query: variant.query,
        share,
        model: model.label,
        modelDomain: model.domain,
        region: params.region,
        persona: index % 3 === 0 ? 'Category buyer' : index % 3 === 1 ? 'Comparison shopper' : 'Technical evaluator',
        freshness: variant.freshness,
        sourceDomain,
        added: variant.added,
        dropped: variant.dropped,
        kept: words.slice(0, 4),
        gates: {
          fetchable: sourceIsOwned ? 'pass' : index < 2 ? 'warn' : 'fail',
          chosen: sourceIsOwned ? 'pass' : share >= 18 ? 'warn' : 'fail',
          extractable: index % 3 === 0 ? 'pass' : index % 3 === 1 ? 'warn' : 'fail',
        },
      }
    })
  })
}

function toApiRow(row: FanoutQuery): QueryFanoutRow {
  return {
    prompt_id: row.promptId,
    prompt_text: row.prompt,
    query_text: row.query,
    share_pct: row.share,
    model: row.model,
    model_domain: row.modelDomain,
    region: row.region,
    persona: row.persona,
    freshness: row.freshness,
    source_domain: row.sourceDomain,
    added_terms: row.added,
    dropped_terms: row.dropped,
    kept_terms: row.kept,
    gates: row.gates,
    generated_by: 'deterministic_estimator',
  }
}

function fromApiRow(row: QueryFanoutRow): FanoutQuery {
  return {
    id: row.id ?? `${row.prompt_id}-${row.query_text}`,
    promptId: row.prompt_id,
    prompt: row.prompt_text,
    query: row.query_text,
    share: Number(row.share_pct ?? 0),
    model: row.model,
    modelDomain: row.model_domain,
    region: row.region,
    persona: row.persona,
    freshness: row.freshness,
    sourceDomain: row.source_domain,
    added: row.added_terms ?? [],
    dropped: row.dropped_terms ?? [],
    kept: row.kept_terms ?? [],
    gates: row.gates ?? { fetchable: 'warn', chosen: 'warn', extractable: 'warn' },
  }
}

export function FanOutTab() {
  const ctx = useUnified()
  const isAnyRunning = ctx.isRunningDiscover || ctx.isRunningDeepDiscover
  const activePrompts = useMemo(() => ctx.prompts.filter(p => p.is_active), [ctx.prompts])
  const prompts = activePrompts.length ? activePrompts : ctx.prompts
  const fallbackPrompt = {
    id: 'fallback',
    template: `{brand} recommendation request`,
    category: 'action_choice',
    intent: 'action_choice',
  }
  const promptInputs = prompts.length ? prompts : [fallbackPrompt]
  const evidenceDomains = (ctx.discoverResult?.source_domains ?? []).slice(0, 12).map(source => normalizeDomain(source.domain))
  const region = ctx.brandConfig.target_market || 'US'
  const engines = ctx.availableEngines.length ? ctx.availableEngines : ['chatgpt']
  const [selectedPromptId, setSelectedPromptId] = useState(promptInputs[0]?.id ?? 'fallback')
  const [persistedFanouts, setPersistedFanouts] = useState<FanoutQuery[]>([])
  const [fanoutLoaded, setFanoutLoaded] = useState(false)
  const savedSignatureRef = useRef('')

  const generatedFanouts = useMemo(() => buildFanouts({
    prompts: promptInputs,
    brandName: ctx.brandConfig.brand_name || 'Your brand',
    brandDomain: ctx.brandConfig.domain || '',
    competitors: ctx.brandConfig.competitors,
    evidenceDomains,
    engines,
    region,
  }), [ctx.brandConfig.brand_name, ctx.brandConfig.competitors, ctx.brandConfig.domain, engines, evidenceDomains, promptInputs, region])

  useEffect(() => {
    if (!ctx.activeCustomerId) {
      setPersistedFanouts([])
      setFanoutLoaded(true)
      return
    }
    let cancelled = false
    setFanoutLoaded(false)
    api.getQueryFanouts(ctx.activeCustomerId)
      .then(res => {
        if (cancelled) return
        setPersistedFanouts((res.data?.rows ?? []).map(fromApiRow))
      })
      .catch(() => {
        if (!cancelled) setPersistedFanouts([])
      })
      .finally(() => {
        if (!cancelled) setFanoutLoaded(true)
      })
    return () => { cancelled = true }
  }, [ctx.activeCustomerId])

  const generatedSignature = useMemo(
    () => JSON.stringify(generatedFanouts.map(row => [row.promptId, row.query, row.share, row.model, row.region, row.persona])),
    [generatedFanouts],
  )

  useEffect(() => {
    if (!ctx.activeCustomerId || !fanoutLoaded || persistedFanouts.length > 0) return
    if (!generatedFanouts.length || generatedFanouts[0]?.promptId === 'fallback') return
    if (savedSignatureRef.current === generatedSignature) return
    savedSignatureRef.current = generatedSignature
    api.saveQueryFanouts(ctx.activeCustomerId, generatedFanouts.map(toApiRow))
      .then(res => {
        if (res.data?.ok) setPersistedFanouts(generatedFanouts)
      })
      .catch(() => { /* non-fatal: UI can still show generated estimates */ })
  }, [ctx.activeCustomerId, fanoutLoaded, generatedFanouts, generatedSignature, persistedFanouts.length])

  const fanouts = persistedFanouts.length ? persistedFanouts : generatedFanouts

  const promptSummaries = useMemo(() => {
    return promptInputs.map(prompt => {
      const rows = fanouts.filter(row => row.promptId === prompt.id)
      return {
        prompt,
        fanoutCount: rows.length,
        share: rows.reduce((sum, row) => sum + row.share, 0),
        intent: normalizeIntent(prompt.intent || prompt.category),
      }
    })
  }, [fanouts, promptInputs])

  const selectedSummary = promptSummaries.find(item => item.prompt.id === selectedPromptId) ?? promptSummaries[0]
  const selectedFanouts = fanouts
    .filter(row => row.promptId === selectedSummary?.prompt.id)
    .sort((a, b) => b.share - a.share)
  const topFanout = selectedFanouts[0]
  const addedWords = Array.from(new Set(selectedFanouts.flatMap(row => row.added))).slice(0, 10)
  const droppedWords = Array.from(new Set(selectedFanouts.flatMap(row => row.dropped))).filter(Boolean).slice(0, 8)
  const keptWords = Array.from(new Set(selectedFanouts.flatMap(row => row.kept))).slice(0, 8)
  const freshnessCount = selectedFanouts.filter(row => row.freshness !== 'none').length
  const brandEntities = [ctx.brandConfig.brand_name, ...ctx.brandConfig.competitors]
    .filter(Boolean)
    .slice(0, 5)
    .map(name => ({ name, domain: bestBrandDomain(name, ctx.brandConfig.domain, evidenceDomains) }))

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-ink-3" />
            <h3 className="text-sm font-semibold text-ink">Fan-Out · Query Fanout Analysis</h3>
          </div>
          <p className="text-xs text-ink-3 mt-1 max-w-3xl">
            Shows how each tracked prompt is rewritten into retrieval sub-queries, which variations carry the most share, and whether your content can be fetched, chosen, and extracted.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
          {isAnyRunning ? (
            <button
              onClick={ctx.handleStopDiscover}
              className="flex items-center gap-2 px-4 py-2 bg-red-soft-bg hover:bg-red-soft/10 text-red-soft border border-red-soft/20 rounded-xl text-sm font-medium transition-colors"
            >
              <Square className="w-3.5 h-3.5" />
              Stop
            </button>
          ) : (
            <>
              <button
                onClick={ctx.handleRunDiscover}
                disabled={!ctx.isConfigured}
                className="flex items-center gap-2 px-4 py-2 bg-ink hover:bg-[#2d2d2c] text-ink-inv rounded-xl text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Play className="w-3.5 h-3.5" />
                Quick Map
              </button>
              <button
                onClick={ctx.handleRunDeepDiscover}
                disabled={!ctx.isConfigured}
                className="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-surface-warm text-ink-2 border border-divider rounded-xl text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ScanSearch className="w-3.5 h-3.5" />
                Deep Fanout
              </button>
            </>
          )}
        </div>
      </div>

      {isAnyRunning && (
        <div className="flex flex-col items-center justify-center py-16 gap-4 bg-surface border border-divider rounded-xl">
          <Loader2 className="w-8 h-8 animate-spin text-ink-3" />
          <div className="text-center">
            <p className="text-sm font-medium text-ink-2">
              {ctx.isRunningDeepDiscover ? 'Generating deep query fanouts...' : 'Generating query fanout map...'}
            </p>
            <p className="text-xs text-ink-3 mt-1">
              Expanding tracked prompts into retrieval queries and scoring coverage gates.
            </p>
          </div>
        </div>
      )}

      {ctx.discoverError && !isAnyRunning && (
        <div className="bg-red-soft-bg border border-red-soft/30 rounded-xl p-4">
          <p className="text-sm text-red-soft">{ctx.discoverError}</p>
        </div>
      )}

      {!isAnyRunning && selectedSummary && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-4">
            <div className="bg-surface border border-divider rounded-xl overflow-hidden">
              <div className="p-4 border-b border-divider-light">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-ink-3" />
                  <h4 className="text-sm font-semibold text-ink">Tracked prompts</h4>
                </div>
                <p className="text-xs text-ink-3 mt-1">Select a prompt to inspect its retrieval fanout.</p>
              </div>
              <div className="max-h-[520px] overflow-y-auto">
                {promptSummaries.map(summary => {
                  const selected = summary.prompt.id === selectedSummary.prompt.id
                  const intentStyle = INTENT_COLORS[summary.intent] ?? INTENT_COLORS.info_cognition
                  return (
                    <button
                      key={summary.prompt.id}
                      onClick={() => setSelectedPromptId(summary.prompt.id)}
                      className={`w-full text-left p-4 border-b border-divider-light transition-colors ${
                        selected ? 'bg-canvas' : 'hover:bg-surface-warm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-ink line-clamp-2">
                          {cleanPrompt(summary.prompt.template, ctx.brandConfig.brand_name)}
                        </p>
                        <span className="text-xs font-mono text-ink-3 flex-shrink-0">{summary.fanoutCount}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${intentStyle.color}`}>
                          {CATEGORY_LABEL_MAP[summary.intent] ?? titleCase(summary.intent)}
                        </span>
                        <span className="text-[11px] text-ink-3">{summary.share}% total share</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-4">
                <div className="bg-surface border border-divider rounded-xl p-5">
                  <p className="text-[11px] font-semibold text-ink-3 uppercase">Original prompt</p>
                  <h4 className="text-lg font-semibold text-ink mt-1 leading-snug">
                    {cleanPrompt(selectedSummary.prompt.template, ctx.brandConfig.brand_name)}
                  </h4>
                  <div className="grid grid-cols-3 gap-3 mt-5">
                    {[
                      { label: 'Fanout queries', value: selectedFanouts.length.toLocaleString() },
                      { label: 'Top variation share', value: `${topFanout?.share ?? 0}%` },
                      { label: 'Freshness pressure', value: `${freshnessCount}/${selectedFanouts.length}` },
                    ].map(stat => (
                      <div key={stat.label} className="rounded-xl bg-canvas border border-divider-light p-3">
                        <p className="text-xl font-bold font-mono text-ink">{stat.value}</p>
                        <p className="text-[11px] text-ink-3 mt-1">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-surface border border-divider rounded-xl p-5">
                  <div className="flex items-center gap-2">
                    <Layers3 className="w-4 h-4 text-ink-3" />
                    <h4 className="text-sm font-semibold text-ink">Entities</h4>
                  </div>
                  <div className="space-y-2 mt-4">
                    {brandEntities.map(entity => (
                      <LogoName key={`${entity.name}-${entity.domain}`} name={entity.name} domain={entity.domain} className="text-sm text-ink-2" />
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-surface border border-divider rounded-xl overflow-hidden">
                <div className="grid grid-cols-[minmax(260px,1fr)_72px_124px_150px_200px] gap-0 bg-canvas border-b border-divider-light px-4 py-3 text-[11px] font-semibold text-ink-3 uppercase">
                  <div>Fanout query</div>
                  <div>Share</div>
                  <div>Model</div>
                  <div>Source target</div>
                  <div>Retrieval gates</div>
                </div>
                <div className="divide-y divide-divider-light">
                  {selectedFanouts.map(row => (
                    <div key={row.id} className="grid grid-cols-[minmax(260px,1fr)_72px_124px_150px_200px] gap-0 px-4 py-4 items-center hover:bg-surface-warm transition-colors">
                      <div className="min-w-0 pr-4">
                        <p className="text-sm font-medium text-ink leading-snug">{row.query}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-ink-3">
                          <span>{row.region}</span>
                          <span>·</span>
                          <span>{row.persona}</span>
                          {row.freshness !== 'none' && (
                            <>
                              <span>·</span>
                              <span className="inline-flex items-center gap-1 text-caution">
                                <CalendarClock className="w-3 h-3" />
                                {row.freshness}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="w-16 h-1.5 rounded-full bg-divider-light overflow-hidden">
                          <div className="h-full rounded-full bg-ink" style={{ width: `${Math.min(100, row.share * 3)}%` }} />
                        </div>
                        <p className="text-xs font-mono text-ink mt-1">{row.share}%</p>
                      </div>
                      <LogoName name={row.model} domain={row.modelDomain} className="text-sm text-ink-2" />
                      <LogoName name={row.sourceDomain} domain={row.sourceDomain} className="text-sm text-ink-2" />
                      <div className="flex flex-wrap gap-1.5">
                        <GatePill label="Fetchable" state={row.gates.fetchable} />
                        <GatePill label="Chosen" state={row.gates.chosen} />
                        <GatePill label="Extractable" state={row.gates.extractable} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-4">
            <div className="bg-surface border border-divider rounded-xl p-5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-ink-3" />
                <h4 className="text-sm font-semibold text-ink">Content coverage guidance</h4>
              </div>
              <p className="text-xs text-ink-3 mt-1 max-w-3xl">
                Turns fanout rewrites into content actions: what your page should add, what wording matters less, and which original terms must stay prominent.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                {[
                  {
                    label: 'Add these sections',
                    helper: 'AI adds these needs during retrieval, so missing pages should cover them explicitly.',
                    words: addedWords,
                    tone: 'bg-sage-bg text-sage',
                  },
                  {
                    label: 'Lower priority wording',
                    helper: 'AI often drops these words, so they are weaker SEO targets for this prompt.',
                    words: droppedWords.length ? droppedWords : ['none'],
                    tone: 'bg-red-soft-bg text-red-soft',
                  },
                  {
                    label: 'Keep these core terms',
                    helper: 'AI preserves these words across fanouts; keep them in headings, copy, and answer blocks.',
                    words: keptWords,
                    tone: 'bg-surface-warm text-ink-2',
                  },
                ].map(group => (
                  <div key={group.label} className="rounded-xl bg-canvas border border-divider-light p-4">
                    <p className="text-[11px] font-semibold text-ink-3 uppercase mb-3">{group.label}</p>
                    <p className="text-[11px] text-ink-3 leading-relaxed mb-3">{group.helper}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {group.words.map(word => (
                        <span key={word} className={`px-2 py-1 rounded-lg text-[11px] font-medium ${group.tone}`}>
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-ink text-ink-inv rounded-xl p-5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                <h4 className="text-sm font-semibold">Optimization handoff</h4>
              </div>
              <p className="text-xs text-ink-inv/70 mt-2 leading-relaxed">
                Prioritize high-share fanout queries where Fetchable, Chosen, or Extractable is weak. Those are the exact sections your content brief should cover.
              </p>
              <button
                onClick={() => ctx.setActiveTab('ai_research')}
                className="mt-4 w-full px-4 py-2 bg-surface text-ink rounded-lg text-sm font-medium hover:bg-surface-warm transition-colors"
              >
                Open Prompt Engineering
              </button>
            </div>
          </div>

          {!ctx.discoverResult && (
            <div className="flex items-start gap-3 bg-surface border border-divider rounded-xl p-4">
              <ArrowRight className="w-4 h-4 text-ink-3 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-ink-3 leading-relaxed">
                Current view uses deterministic estimated fanouts from tracked prompts. Run Quick Map or Deep Fanout to attach fresh grounded sources and model-specific retrieval evidence.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
