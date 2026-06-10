'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  BarChart2,
  BookOpen,
  CheckCircle2,
  FlaskConical,
  GitBranch,
  Grid3X3,
  Layers,
  Loader2,
  Play,
  RefreshCw,
  Target,
  XCircle,
  Zap,
} from 'lucide-react'
import { api, type AIResearchRun } from '@/lib/api'
import { BrandLogo } from '@/components/BrandLogo'
import { useUnified } from '../UnifiedContext'
import { DiscoverTab } from './DiscoverTab'

type Coverage = 'strong' | 'weak' | 'absent'

interface ResearchDimension {
  id: string
  label: string
  sources: number
  sub_questions: number
  depth: 'high' | 'medium' | 'low'
  terms?: string[]
}

interface ResearchBrand {
  name: string
  domain: string
  is_you?: boolean
}

interface ResearchGap {
  dimension: string
  your_coverage: Coverage
  top_competitor: string
  top_competitor_domain: string
  content_type: string
  priority: 'high' | 'medium' | 'low'
}

interface ResearchTrailItem {
  q: string
  dimension_id: string
  sources: number
  mentions: string[]
  terms: string
}

interface ResearchResult {
  v: number
  brand_name: string
  domain: string
  product_space: string
  market: string
  audience: string
  engines: string[]
  summary: {
    dimensions: number
    sub_questions: number
    sources_read: number
    readiness: number
  }
  dimensions: ResearchDimension[]
  brands: ResearchBrand[]
  coverage: Record<string, Record<string, Coverage>>
  trail: {
    question: string
    sub_questions: ResearchTrailItem[]
    final_citation: string
  }
  gaps: ResearchGap[]
  generated_at: string
}

function asResearchResult(value: unknown): ResearchResult | null {
  if (!value || typeof value !== 'object') return null
  const obj = value as Partial<ResearchResult>
  if (!Array.isArray(obj.dimensions) || !Array.isArray(obj.brands) || !obj.summary) return null
  return obj as ResearchResult
}

function domainFromName(name: string) {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, '')}.com`
}

function BlockHeader({ icon: Icon, title, question, number }: {
  icon: React.ElementType
  title: string
  question: string
  number: number
}) {
  return (
    <div className="flex items-start gap-4 mb-5">
      <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-ink text-ink-inv text-[12px] font-bold">
        {number}
      </div>
      <div className="flex items-start gap-3 flex-1">
        <div className="w-9 h-9 rounded-xl bg-sage-bg flex items-center justify-center flex-shrink-0">
          <Icon className="w-4.5 h-4.5 text-sage" strokeWidth={1.8} />
        </div>
        <div>
          <h3 className="text-[15px] font-bold text-ink leading-tight">{title}</h3>
          <p className="text-[12px] text-ink-3 mt-0.5 italic">"{question}"</p>
        </div>
      </div>
    </div>
  )
}

function CoverageIcon({ coverage }: { coverage: Coverage }) {
  if (coverage === 'strong') return <CheckCircle2 className="w-4 h-4 text-sage" strokeWidth={2} />
  if (coverage === 'weak') return <AlertCircle className="w-4 h-4 text-caution" strokeWidth={2} />
  return <XCircle className="w-4 h-4 text-[rgba(0,0,0,0.18)]" strokeWidth={1.6} />
}

function ResearchBrief({ result }: { result: ResearchResult }) {
  return (
    <div className="bg-surface rounded-2xl border border-divider-light p-6">
      <BlockHeader
        icon={BookOpen}
        number={1}
        title="Research Brief"
        question={`What dimensions does AI investigate when doing deep research on "${result.brand_name}"?`}
      />
      <div className="bg-canvas rounded-xl border border-divider-light p-4 mb-4">
        <div className="text-[11px] font-bold text-ink-3 uppercase tracking-wider mb-3">Customer-scoped research plan</div>
        <p className="text-[13px] text-ink-2 mb-3">
          <span className="font-semibold text-ink">Topic:</span> {result.product_space} · {result.market}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Dimensions', value: String(result.summary.dimensions) },
            { label: 'Sub-questions', value: String(result.summary.sub_questions) },
            { label: 'Sources read', value: String(result.summary.sources_read) },
            { label: 'Engines', value: result.engines.map(e => e.charAt(0).toUpperCase() + e.slice(1)).join(' · ') },
          ].map(metric => (
            <div key={metric.label} className="bg-surface rounded-xl p-3 border border-divider-light text-center">
              <div className="text-[20px] font-bold text-ink">{metric.value}</div>
              <div className="text-[10px] text-ink-3 mt-0.5">{metric.label}</div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {result.dimensions.map(d => (
            <span key={d.id} className={`text-[11px] px-2.5 py-1 rounded-full font-medium border ${
              d.depth === 'high' ? 'bg-sage-bg text-sage border-sage/20' :
              d.depth === 'medium' ? 'bg-caution-bg text-caution border-caution/20' :
              'bg-surface-muted text-ink-3 border-divider-light'
            }`}>
              {d.label}
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 p-3 bg-caution-bg/40 border border-caution/15 rounded-xl">
        <ArrowRight className="w-3.5 h-3.5 text-caution flex-shrink-0" />
        <p className="text-[12px] text-caution font-medium">
          AI Research is scoped to this customer profile: {result.brand_name}, {result.product_space}, {result.market}, and the active prompt set.
        </p>
      </div>
    </div>
  )
}

function DimensionMap({ result }: { result: ResearchResult }) {
  const maxSources = Math.max(...result.dimensions.map(d => d.sources), 1)
  return (
    <div className="bg-surface rounded-2xl border border-divider-light p-6">
      <BlockHeader icon={Layers} number={2} title="Dimension Map" question="Which dimensions does AI research most deeply?" />
      <div className="space-y-2.5">
        {result.dimensions.map(d => (
          <div key={d.id} className="flex items-center gap-3">
            <div className="w-44 text-[12px] text-ink-2 font-medium flex-shrink-0 truncate">{d.label}</div>
            <div className="flex-1 h-7 bg-canvas rounded-lg overflow-hidden border border-divider-light">
              <div
                className={`h-full rounded-lg ${d.depth === 'high' ? 'bg-ink' : d.depth === 'medium' ? 'bg-[rgba(0,0,0,0.35)]' : 'bg-[rgba(0,0,0,0.12)]'}`}
                style={{ width: `${(d.sources / maxSources) * 100}%` }}
              />
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 w-32 justify-end">
              <span className="text-[11px] text-ink-3">{d.sources} sources</span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                d.depth === 'high' ? 'bg-sage-bg text-sage' :
                d.depth === 'medium' ? 'bg-caution-bg text-caution' :
                'bg-surface-muted text-ink-3'
              }`}>{d.depth}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function BrandCoverage({ result }: { result: ResearchResult }) {
  return (
    <div className="bg-surface rounded-2xl border border-divider-light p-6">
      <BlockHeader icon={Grid3X3} number={3} title="Brand Coverage Matrix" question="Across research dimensions, where do I appear vs competitors?" />
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-divider-light">
              <th className="text-left py-2.5 pr-6 text-[11px] font-semibold text-ink-3 w-48">Dimension</th>
              {result.brands.map(brand => (
                <th key={brand.name} className="py-2.5 px-3 text-center">
                  <div className="flex flex-col items-center gap-1.5">
                    <BrandLogo domain={brand.domain} name={brand.name} size={24} />
                    <span className="text-[11px] font-semibold text-ink whitespace-nowrap">{brand.name}</span>
                    {brand.is_you && <span className="text-[8px] font-bold text-sage bg-sage-bg px-1.5 py-0.5 rounded-full leading-none">You</span>}
                  </div>
                </th>
              ))}
              <th className="py-2.5 pl-4 text-right text-[11px] font-semibold text-ink-3 w-24">Coverage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-divider-light">
            {result.dimensions.map(d => {
              const strongCount = result.brands.filter(b => result.coverage[b.name]?.[d.id] === 'strong').length
              const youBrand = result.brands.find(b => b.is_you)
              const youCoverage = youBrand ? result.coverage[youBrand.name]?.[d.id] : 'absent'
              const isGapForYou = youCoverage === 'absent'
              return (
                <tr key={d.id} className={isGapForYou ? 'bg-red-soft-bg/20' : ''}>
                  <td className="py-3 pr-6">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium text-[12px] ${isGapForYou ? 'text-red-soft' : 'text-ink'}`}>{d.label}</span>
                      {isGapForYou && <span className="text-[8px] font-bold px-1.5 py-0.5 bg-red-soft text-white rounded-full leading-none">Gap</span>}
                    </div>
                    <div className="text-[10px] text-ink-3 mt-0.5 capitalize">{d.depth} depth · {d.sources} sources</div>
                  </td>
                  {result.brands.map(brand => (
                    <td key={brand.name} className={`py-3 px-3 text-center ${brand.is_you ? 'bg-sage-bg/20' : ''}`}>
                      <div className="flex justify-center">
                        <CoverageIcon coverage={result.coverage[brand.name]?.[d.id] ?? 'absent'} />
                      </div>
                    </td>
                  ))}
                  <td className="py-3 pl-4 text-right">
                    <span className={`text-[11px] font-bold ${strongCount >= 3 ? 'text-sage' : strongCount >= 2 ? 'text-caution' : 'text-red-soft'}`}>
                      {strongCount}/{result.brands.length}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center gap-3 text-[11px] text-ink-3">
        <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-sage" /> Strong</span>
        <span className="flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5 text-caution" /> Weak</span>
        <span className="flex items-center gap-1"><XCircle className="w-3.5 h-3.5 text-[rgba(0,0,0,0.2)]" /> Absent</span>
      </div>
    </div>
  )
}

function ResearchTrail({ result }: { result: ResearchResult }) {
  const brandDomain = Object.fromEntries(result.brands.map(b => [b.name, b.domain]))
  return (
    <div className="bg-surface rounded-2xl border border-divider-light p-6">
      <BlockHeader icon={GitBranch} number={4} title="Research Trail" question="How did AI split this research into sub-questions?" />
      <div className="mb-4 flex items-start gap-3 p-4 bg-ink text-ink-inv rounded-xl">
        <BookOpen className="w-4 h-4 flex-shrink-0 mt-0.5 opacity-70" />
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider opacity-50 mb-0.5">Root research question</div>
          <div className="text-[13px] font-semibold">"{result.trail.question}"</div>
        </div>
      </div>
      <div className="space-y-2 mb-4 pl-4 border-l-2 border-divider">
        {result.trail.sub_questions.map((sq, i) => (
          <div key={`${sq.dimension_id}-${i}`} className="p-3 rounded-xl bg-canvas border border-divider-light">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-surface-muted border border-divider flex items-center justify-center text-[9px] font-bold text-ink-3 mt-0.5">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] text-ink font-medium">{sq.q}</div>
                <div className="text-[10px] text-ink-3 mt-0.5">{sq.sources} sources · {sq.terms}</div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {sq.mentions.map(name => (
                    <span key={name} className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg font-semibold border bg-surface border-divider-light">
                      <BrandLogo domain={brandDomain[name] ?? domainFromName(name)} name={name} size={16} />
                      <span className="text-ink-2">{name}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="p-4 bg-sage-bg/50 border border-sage/20 rounded-xl">
        <p className="text-[12.5px] text-ink-2 leading-relaxed">"{result.trail.final_citation}"</p>
      </div>
    </div>
  )
}

function GapPlaybook({ result }: { result: ResearchResult }) {
  return (
    <div className="bg-surface rounded-2xl border border-divider-light p-6">
      <BlockHeader icon={Target} number={6} title="Gap Playbook" question="Which gaps should I fix first?" />
      <div className="space-y-3">
        {result.gaps.map(gap => (
          <div key={gap.dimension} className={`p-4 rounded-xl border flex items-center gap-4 ${
            gap.priority === 'high' ? 'border-red-soft/25 bg-red-soft-bg/30' : 'border-caution/20 bg-caution-bg/20'
          }`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  gap.priority === 'high' ? 'bg-red-soft text-white' : 'bg-caution text-white'
                }`}>{gap.priority}</span>
                <span className="text-[13px] font-semibold text-ink">{gap.dimension}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-ink-3 mt-1">
                <span className="flex items-center gap-1.5">
                  <BrandLogo domain={result.domain} name={result.brand_name} size={14} />
                  <strong className={gap.your_coverage === 'absent' ? 'text-red-soft' : 'text-caution'}>{gap.your_coverage}</strong>
                </span>
                <span>vs</span>
                <span className="flex items-center gap-1.5">
                  <BrandLogo domain={gap.top_competitor_domain} name={gap.top_competitor} size={14} />
                  <strong className="text-sage">{gap.top_competitor}</strong>
                </span>
                <span className="flex items-center gap-1"><BarChart2 className="w-3 h-3" />{gap.content_type}</span>
              </div>
            </div>
            <button className="flex items-center gap-1.5 px-3 py-2 bg-ink text-ink-inv rounded-xl text-[11px] font-semibold hover:bg-ink/80 transition-colors flex-shrink-0 whitespace-nowrap">
              <Zap className="w-3 h-3" />
              Generate
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function SourcesGapSection({ number }: { number: number }) {
  return (
    <div id="sources-gap" className="scroll-mt-24 bg-surface rounded-2xl border border-divider-light p-6">
      <BlockHeader
        icon={GitBranch}
        number={number}
        title="Sources Gap"
        question="Which trusted external sources should I enter to close the research gaps?"
      />
      <div className="mb-5 rounded-xl border border-divider-light bg-canvas p-4">
        <p className="text-[13px] leading-relaxed text-ink-2">
          Sources Gap maps the domains AI already cites for this market. Use it to see where competitors appear,
          where your domain is missing, and which sources should become content, PR, review, schema, or distribution actions.
        </p>
      </div>
      <DiscoverTab variant="sources-gap" />
    </div>
  )
}

function EmptyState({ brandName, canRun, onRun, running }: {
  brandName: string
  canRun: boolean
  onRun: () => void
  running: boolean
}) {
  return (
    <div className="bg-surface rounded-2xl border border-divider-light p-8 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[rgba(100,180,255,0.08)] flex items-center justify-center mx-auto mb-4">
        <FlaskConical className="w-7 h-7 text-[rgba(100,180,255,0.7)]" strokeWidth={1.6} />
      </div>
      <h3 className="text-[16px] font-bold text-ink mb-2">AI Research</h3>
      <p className="text-[13px] text-ink-3 max-w-md mx-auto mb-6">
        Create a customer-scoped research run from the Customer Intelligence Profile, active prompts, market, product space, and competitors.
      </p>
      <button
        onClick={onRun}
        disabled={running || !canRun}
        className="inline-flex items-center gap-2.5 px-6 py-3 bg-ink text-ink-inv rounded-xl text-[13px] font-semibold hover:bg-ink/80 transition-colors disabled:opacity-50 shadow-sm"
      >
        {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
        {running ? 'Running customer research...' : `Run AI Research${brandName ? ` on ${brandName}` : ''}`}
      </button>
      {!canRun && <p className="text-[11px] text-ink-3 mt-2">Select a customer and complete the Customer Intelligence Profile first.</p>}
    </div>
  )
}

export function AIResearchTab() {
  const ctx = useUnified()
  const [run, setRun] = useState<AIResearchRun | null>(null)
  const [loading, setLoading] = useState(false)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')

  const result = useMemo(() => asResearchResult(run?.result_json), [run])
  const brandName = ctx.brandConfig.brand_name || ''
  const canRun = Boolean(ctx.activeCustomerId && brandName && ctx.brandConfig.domain)

  useEffect(() => {
    if (!ctx.activeCustomerId) {
      setRun(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')
    api.getLatestAIResearchRun(ctx.activeCustomerId)
      .then(res => {
        if (cancelled) return
        setRun(res.data?.run ?? null)
      })
      .catch(err => {
        if (!cancelled) setError(err.message || 'Failed to load AI Research')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [ctx.activeCustomerId])

  const handleRun = async () => {
    if (!ctx.activeCustomerId || !canRun) return
    setRunning(true)
    setError('')
    try {
      const res = await api.createAIResearchRun({
        customer_id: ctx.activeCustomerId,
        brand_config: ctx.brandConfig as unknown as Record<string, unknown>,
        prompts: ctx.prompts.filter(p => p.is_active).slice(0, 20).map(p => ({
          id: p.id,
          template: p.template,
          category: p.category,
          intent: p.intent,
        })),
        engines: ctx.availableEngines.length ? ctx.availableEngines : ['chatgpt', 'perplexity'],
      })
      if (res.error || !res.data?.run) {
        setError(res.error || res.data?.error || 'AI Research run failed')
      } else {
        setRun(res.data.run)
      }
    } catch (err: any) {
      setError(err.message || 'AI Research run failed')
    } finally {
      setRunning(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-divider-light bg-surface py-16">
          <Loader2 className="w-5 h-5 animate-spin text-ink-3" />
          <p className="mt-3 text-[13px] font-semibold text-ink-3">Loading AI Research…</p>
        </div>
        <SourcesGapSection number={2} />
      </div>
    )
  }

  if (!result) {
    return (
      <div className="space-y-4">
        {error && <div className="bg-red-soft-bg border border-red-soft/30 rounded-xl p-4 text-sm text-red-soft">{error}</div>}
        <EmptyState brandName={brandName} canRun={canRun} onRun={handleRun} running={running} />
        <SourcesGapSection number={2} />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {error && <div className="bg-red-soft-bg border border-red-soft/30 rounded-xl p-4 text-sm text-red-soft">{error}</div>}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-surface rounded-xl border border-divider-light">
        <div className="flex items-center gap-3 min-w-0">
          <BrandLogo domain={result.domain} name={result.brand_name} size={32} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[13px] font-semibold text-ink">AI Research — {result.brand_name}</span>
              <span className="text-[10px] px-2 py-0.5 bg-sage-bg text-sage rounded-full font-bold">Customer scoped</span>
              <span className="text-[10px] px-2 py-0.5 bg-surface-muted text-ink-3 rounded-full font-medium">Saved run</span>
            </div>
            <p className="text-[11px] text-ink-3 mt-0.5">
              {result.product_space} · {result.market} · readiness {result.summary.readiness}% · {run?.created_at ? new Date(run.created_at).toLocaleString() : ''}
            </p>
          </div>
        </div>
        <button
          onClick={handleRun}
          disabled={running}
          className="inline-flex items-center gap-2 px-4 py-2 bg-ink text-ink-inv rounded-xl text-sm font-semibold hover:bg-ink/80 transition-colors disabled:opacity-50"
        >
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Update Research
        </button>
      </div>

      <ResearchBrief result={result} />
      <DimensionMap result={result} />
      <BrandCoverage result={result} />
      <ResearchTrail result={result} />
      <SourcesGapSection number={5} />
      <GapPlaybook result={result} />
    </div>
  )
}
