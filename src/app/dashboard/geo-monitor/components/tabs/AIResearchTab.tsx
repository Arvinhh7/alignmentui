'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Eye,
  Loader2,
  Play,
  RefreshCw,
  Search,
  Target,
  TrendingDown,
  Trophy,
  XCircle,
  Zap,
} from 'lucide-react'
import { api, type AIResearchRun, type SmartPrompt } from '@/lib/api'
import { BrandLogo } from '@/components/BrandLogo'
import { useUnified } from '../UnifiedContext'
import { GeneratePromptsModal } from './GeneratePromptsModal'

// ─── Real-data report shape (v3) ──────────────────────────────────────────────
// Every field is measured: visibility / standings / prompt-gaps come from the
// customer's real scan; category sources / source-gaps come from the shared
// Explore category warehouse. No synthetic numbers.

interface Standing {
  name: string
  is_you: boolean
  visibility_pct: number
  share_of_voice_pct: number
  mentions: number
}

interface PromptGap {
  prompt: string
  competitors: string[]
  engine: string
}

interface SourceItem {
  domain: string
  name: string
  source_type: string
  citation_count: number
  you_cited: boolean
}

interface ResearchResult {
  v: number
  brand_name: string
  domain: string
  category: string
  market: string
  engines: string[]
  has_scan: boolean
  scanned_at: string | null
  category_slug: string | null
  category_name: string | null
  visibility: { score: number; mentions_found: number; total_prompts: number; citation_count: number }
  standings: Standing[]
  prompt_gaps: PromptGap[]
  source_gaps: SourceItem[]
  source_fallback?: boolean
  source_fallback_cross_customer?: boolean
  category_sources: SourceItem[]
  summary: { prompt_gap_count: number; source_gap_count: number; competitor_count: number; category_source_count: number }
  generated_at: string
}

function asResearchResult(value: unknown): ResearchResult | null {
  if (!value || typeof value !== 'object') return null
  const obj = value as Partial<ResearchResult>
  if (obj.v !== 3 || !obj.visibility || !Array.isArray(obj.standings)) return null
  return obj as ResearchResult
}

// A run exists but predates the real-data rebuild (old synthetic v2).
function isStaleRun(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  const v = (value as { v?: number }).v
  return v !== undefined && v !== 3
}

function cleanText(value: string | undefined | null, fallback: string) {
  return String(value ?? '').trim() || fallback
}

function domainFromName(name: string) {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, '')}.com`
}

// Tolerant timestamp parse. The cached run's scanned_at is a Python str
// ("2026-06-23T18:06:56.348259", often tz-naive) while the live scan API returns
// "2026-06-23 18:51:07+00". Normalize both so a stale report can be detected.
function parseTs(s: string | null | undefined): number {
  if (!s) return NaN
  let v = String(s).trim().replace(' ', 'T')
  if (/[+-]\d{2}$/.test(v)) v += ':00'                              // "+00" → "+00:00"
  if (!/([zZ]|[+-]\d{2}:?\d{2})$/.test(v)) v += 'Z'                 // assume UTC when tz missing
  return Date.parse(v)
}

function buildDefaultPrompts(
  brand: string,
  productSpace: string,
  market: string,
  audience: string,
  competitor: string,
  targetDomain: string,
  engines: string[],
): SmartPrompt[] {
  const provenance = {
    target_domain: targetDomain || null,
    engines: engines.length ? engines : ['chatgpt'],
    why: 'Auto-created after AI Research so the first scan has a measurable baseline.',
  }
  return [
    { template: `What is ${brand} and what problem does it solve for ${audience} looking for ${productSpace}?`, intent: 'info_cognition', layer: 'foundation', provenance },
    { template: `What are the best ${productSpace} options for ${audience} in ${market}?`, intent: 'solution_explore', layer: 'foundation', provenance },
    { template: `How does ${brand} compare with ${competitor} for ${productSpace}?`, intent: 'comparison_decision', layer: 'gap', provenance },
    { template: `Should I choose ${brand} for ${productSpace}, and what trusted sources support that?`, intent: 'action_choice', layer: 'gap', provenance },
  ]
}

// ─── Small building blocks ────────────────────────────────────────────────────

function SectionCard({ title, hint, icon: Icon, children }: {
  title: string
  hint?: string
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <div className="bg-surface rounded-2xl border border-divider-light p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-sage-bg flex items-center justify-center flex-shrink-0">
          <Icon className="w-4.5 h-4.5 text-sage" strokeWidth={1.8} />
        </div>
        <div>
          <h3 className="text-[15px] font-bold text-ink leading-tight">{title}</h3>
          {hint && <p className="text-[12px] text-ink-3 mt-0.5">{hint}</p>}
        </div>
      </div>
      {children}
    </div>
  )
}

const SOURCE_TYPE_LABEL: Record<string, string> = {
  editorial: 'Editorial', ugc: 'Community', reference: 'Reference',
  owned: 'Owned', institutional: 'Institutional', other: 'Source',
}

// ─── Command center (replaces workflow chips + closed-loop card + saved-run bar) ─

function CommandCenter({ result, activePrompts, hasScan, running, onUpdate, onGeneratePrompts }: {
  result: ResearchResult
  activePrompts: number
  hasScan: boolean
  running: boolean
  onUpdate: () => void
  onGeneratePrompts: () => void
}) {
  const v = result.visibility
  const promptGaps = result.summary.prompt_gap_count
  const sourceGaps = result.summary.source_gap_count

  const nextStep = !result.has_scan
    ? 'We haven’t measured your AI visibility yet. Generate prompts and run a scan to see whether AI answers actually mention you.'
    : promptGaps > 0
      ? `AI mentions competitors but not you in ${promptGaps} buyer question${promptGaps > 1 ? 's' : ''}. Turn those into prompts you monitor.`
      : sourceGaps > 0
        ? `${sourceGaps} trusted source${sourceGaps > 1 ? 's' : ''} AI cites in your category don’t mention you yet.`
        : 'You’re showing up well. Keep monitoring and refresh after content or source changes.'

  return (
    <div className="rounded-2xl border border-divider-light bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <BrandLogo domain={result.domain} name={result.brand_name} size={28} />
            <span className="text-[13px] font-semibold text-ink">{result.brand_name}</span>
            <span className="text-[11px] text-ink-3">· {result.category} · {result.market}</span>
          </div>
          <div className="mt-3 flex items-end gap-3">
            {result.has_scan ? (
              <>
                <div className="text-[40px] font-bold leading-none text-ink">{Math.round(v.score)}<span className="text-[20px] text-ink-3">%</span></div>
                <div className="pb-1">
                  <div className="text-[13px] font-semibold text-ink">AI Visibility</div>
                  <div className="text-[12px] text-ink-3">Mentioned in {v.mentions_found} of {v.total_prompts} AI answers · cited {v.citation_count}×</div>
                </div>
              </>
            ) : (
              <div>
                <div className="text-[20px] font-bold text-ink">Not measured yet</div>
                <div className="text-[12px] text-ink-3">Run a scan to see if AI mentions you</div>
              </div>
            )}
          </div>
          <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-ink-2">{nextStep}</p>
        </div>

        {/* Compact journey strip */}
        <div className="grid w-full max-w-[272px] grid-cols-4 gap-1.5">
          {[
            { label: 'Profile', done: true, count: null as number | null },
            { label: 'Sources', done: result.summary.category_source_count > 0, count: result.summary.category_source_count > 0 ? result.summary.category_source_count : null },
            { label: 'Prompts', done: activePrompts > 0, count: activePrompts > 0 ? activePrompts : null },
            { label: 'Scan', done: hasScan, count: null },
          ].map(step => (
            <div key={step.label} className={`rounded-xl border px-2 py-2.5 text-center ${step.done ? 'border-sage/25 bg-sage-bg/45' : 'border-divider-light bg-canvas'}`}>
              <div className={`text-[17px] font-bold leading-none ${step.done ? 'text-sage' : 'text-ink-4'}`}>
                {step.count !== null ? step.count : step.done ? '✓' : '—'}
              </div>
              <div className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-ink-3">{step.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onGeneratePrompts}
          className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2 text-[12px] font-semibold text-ink-inv hover:bg-ink/80"
        >
          <Zap className="h-3.5 w-3.5" />
          Generate recommended prompts
        </button>
        <Link href="/dashboard/geo-monitor?tab=prompts" className="inline-flex items-center gap-2 rounded-xl border border-divider-light bg-canvas px-4 py-2 text-[12px] font-semibold text-ink hover:bg-surface-warm">
          <Target className="h-3.5 w-3.5" />
          Open Prompt
        </Link>
        <button
          type="button"
          onClick={onUpdate}
          disabled={running}
          className="ml-auto inline-flex items-center gap-2 rounded-xl border border-divider-light bg-canvas px-4 py-2 text-[12px] font-semibold text-ink hover:bg-surface-warm disabled:opacity-50"
        >
          {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Update research
        </button>
      </div>
    </div>
  )
}

// ─── Standings: who AI recommends in your category (real share of voice) ───────

function StandingsCard({ result }: { result: ResearchResult }) {
  if (!result.has_scan || result.standings.length === 0) return null
  const maxVis = Math.max(...result.standings.map(s => s.visibility_pct), 1)
  return (
    <SectionCard icon={Trophy} title="Who AI recommends in your category" hint="From your latest scan — how often each brand shows up in AI answers, and its share of the conversation.">
      <div className="space-y-2.5">
        {result.standings.map(s => (
          <div key={s.name} className="flex items-center gap-3">
            <div className="flex w-40 flex-shrink-0 items-center gap-2">
              <BrandLogo domain={s.is_you ? result.domain : domainFromName(s.name)} name={s.name} size={20} />
              <span className={`truncate text-[12px] font-medium ${s.is_you ? 'text-sage' : 'text-ink-2'}`}>{s.name}</span>
              {s.is_you && <span className="rounded-full bg-sage-bg px-1.5 py-0.5 text-[8px] font-bold leading-none text-sage">You</span>}
            </div>
            <div className="h-7 flex-1 overflow-hidden rounded-lg border border-divider-light bg-canvas">
              <div className={`h-full rounded-lg ${s.is_you ? 'bg-sage' : 'bg-[rgba(0,0,0,0.28)]'}`} style={{ width: `${(s.visibility_pct / maxVis) * 100}%` }} />
            </div>
            <div className="flex w-28 flex-shrink-0 items-center justify-end gap-2">
              <span className="text-[11px] font-bold text-ink">{Math.round(s.visibility_pct)}%</span>
              <span className="text-[10px] text-ink-3">SoV {Math.round(s.share_of_voice_pct)}%</span>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

// ─── Where you lose: prompt gaps + source gaps (both real) ─────────────────────

function WhereYouLoseCard({ result }: { result: ResearchResult }) {
  const hasPromptGaps = result.prompt_gaps.length > 0
  const hasSourceGaps = result.source_gaps.length > 0
  if (!result.has_scan && !hasSourceGaps) return null

  return (
    <SectionCard icon={TrendingDown} title="Where you’re losing to competitors" hint="The two reasons AI skips you: questions where rivals get named, and trusted sites that cite them but not you.">
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Prompt-level gaps */}
        <div className="rounded-xl border border-divider-light bg-canvas p-4">
          <div className="mb-3 flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-ink-3" />
            <span className="text-[12px] font-bold text-ink">Questions competitors win</span>
          </div>
          {result.has_scan ? (
            hasPromptGaps ? (
              <div className="space-y-2">
                {result.prompt_gaps.map((g, i) => (
                  <div key={i} className="rounded-lg border border-divider-light bg-surface p-2.5">
                    <div className="text-[12px] font-medium text-ink">&ldquo;{g.prompt}&rdquo;</div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] text-ink-3">AI named instead:</span>
                      {g.competitors.map(c => (
                        <span key={c} className="rounded-full bg-red-soft-bg px-2 py-0.5 text-[10px] font-semibold text-red-soft">{c}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[12px] text-sage">You appear in every scanned question — no prompt gaps.</p>
            )
          ) : (
            <p className="text-[12px] text-ink-3">Run a scan to find questions where AI names competitors but not you.</p>
          )}
        </div>

        {/* Source-level gaps */}
        <div className="rounded-xl border border-divider-light bg-canvas p-4">
          <div className="mb-3 flex items-center gap-2">
            <ExternalLink className="h-3.5 w-3.5 text-ink-3" />
            <span className="text-[12px] font-bold text-ink">Trusted sources missing you</span>
          </div>
          {hasSourceGaps ? (
            <div className="space-y-1.5">
              {result.source_gaps.map(s => (
                <div key={s.domain} className="flex items-center justify-between gap-2 rounded-lg border border-divider-light bg-surface px-2.5 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <BrandLogo domain={s.domain} name={s.name} size={18} />
                    <span className="truncate text-[12px] font-medium text-ink">{s.name}</span>
                  </div>
                  <span className="flex-shrink-0 text-[10px] text-ink-3">
                    {SOURCE_TYPE_LABEL[s.source_type] || "Source"}
                    {s.citation_count > 0 && <> &middot; {s.citation_count} URLs</>}
                  </span>
                </div>
              ))}
              {result.source_fallback && (
                <p className="mt-1 text-[10px] text-ink-3">
                  {result.source_fallback_cross_customer
                    ? <>From similar brands&apos; scans &mdash; <Link href="/dashboard/brand-hub" className="underline underline-offset-2 hover:text-ink-2">set your Category</Link> for full Explore coverage.</>
                    : <>From your scan &mdash; <Link href="/dashboard/brand-hub" className="underline underline-offset-2 hover:text-ink-2">update Product Space</Link> for category-level coverage.</>
                  }
                </p>
              )}
            </div>
          ) : result.category_slug ? (
            <p className="text-[12px] text-sage">You&apos;re cited by every tracked source in your category.</p>
          ) : (
            <div className="flex items-start gap-2.5 rounded-lg border border-caution/30 bg-caution-bg px-3 py-2.5">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-caution" />
              <div className="min-w-0">
                <p className="text-[12px] text-ink">No Explore category matched your brand.</p>
                <p className="mt-0.5 text-[11px] text-ink-3">
                  Set <strong>Category</strong> in your Brand Profile to a tracked category (e.g. &quot;Jewelry&quot;, &quot;Cameras&quot;) so we can map trusted sources for you.
                </p>
                <Link href="/dashboard/brand-hub" className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-ink underline underline-offset-2 hover:text-ink-2">
                  Open Brand Hub <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  )
}

// ─── Sources Map: shared Explore category sources (reused, not re-collected) ────

function SourcesMapCard({ result }: { result: ResearchResult }) {
  if (result.category_sources.length === 0) return null
  return (
    <SectionCard
      icon={ExternalLink}
      title={`Trusted sources AI cites for ${result.category_name || result.category}`}
      hint="Shared category data from Explore (not re-collected per customer). ✓ = a source that already cites you."
    >
      <div className="grid gap-1.5 sm:grid-cols-2">
        {result.category_sources.map(s => (
          <div key={s.domain} className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 ${s.you_cited ? 'border-sage/25 bg-sage-bg/30' : 'border-divider-light bg-canvas'}`}>
            <div className="flex min-w-0 items-center gap-2">
              {s.you_cited
                ? <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-sage" />
                : <XCircle className="h-3.5 w-3.5 flex-shrink-0 text-[rgba(0,0,0,0.2)]" />}
              <BrandLogo domain={s.domain} name={s.name} size={18} />
              <span className="truncate text-[12px] font-medium text-ink">{s.name}</span>
            </div>
            <span className="flex-shrink-0 text-[10px] text-ink-3">{s.citation_count} cites</span>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

// ─── Empty / stale states ─────────────────────────────────────────────────────

function EmptyState({ brandName, canRun, onRun, running, stale }: {
  brandName: string
  canRun: boolean
  onRun: () => void
  running: boolean
  stale: boolean
}) {
  const ctx = useUnified()
  const profileMissing = [
    !ctx.brandConfig.brand_name.trim() ? 'Brand Name' : null,
    !ctx.brandConfig.domain.trim() ? 'Domain' : null,
    !String(ctx.brandConfig.industry ?? '').trim() ? 'Industry' : null,
    !String(ctx.brandConfig.category ?? '').trim() ? 'Product Space' : null,
    !String(ctx.brandConfig.target_market ?? '').trim() ? 'Target Country' : null,
  ].filter(Boolean) as string[]
  const missingReason = !ctx.activeCustomerId
    ? 'Select a customer workspace first so the research can be saved.'
    : profileMissing.length > 0
      ? `Complete the brand profile in Brand Hub first: ${profileMissing.join(', ')}`
      : 'Complete the brand profile in Brand Hub first.'

  return (
    <div className="bg-surface rounded-2xl border border-divider-light p-8 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sage-bg">
        <Eye className="h-7 w-7 text-sage" strokeWidth={1.6} />
      </div>
      <h3 className="mb-2 text-[16px] font-bold text-ink">{stale ? 'Refresh for the real-data report' : 'See how AI answers about your category'}</h3>
      <p className="mx-auto mb-6 max-w-md text-[13px] text-ink-3">
        {stale
          ? 'Your saved research predates the real-data rebuild. Update it to replace the old estimates with your measured visibility, competitor standings, and source gaps.'
          : `We’ll measure whether AI mentions ${brandName || 'your brand'}, where competitors beat you, and which trusted sources cite you — from your real scan and the shared Explore category data.`}
      </p>
      <button
        onClick={onRun}
        disabled={running || !canRun}
        className="inline-flex items-center gap-2.5 rounded-xl bg-ink px-6 py-3 text-[13px] font-semibold text-ink-inv shadow-sm transition-colors hover:bg-ink/80 disabled:opacity-50"
      >
        {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        {running ? 'Building your report…' : stale ? 'Update research' : `Run AI Research${brandName ? ` on ${brandName}` : ''}`}
      </button>
      {!canRun && (
        <div className="mt-3 space-y-2">
          <p className="text-[11px] text-ink-3">{missingReason}</p>
          <Link href="/dashboard/brand-hub" className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink underline underline-offset-4">
            Open Brand Hub <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function AIResearchTab() {
  const ctx = useUnified()
  const [run, setRun] = useState<AIResearchRun | null>(null)
  const [loading, setLoading] = useState(false)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [autoBootstrapStatus, setAutoBootstrapStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const autoBootstrappedKeys = useRef(new Set<string>())
  const autoRegenKeys = useRef(new Set<string>())

  const result = useMemo(() => asResearchResult(run?.result_json), [run])
  const stale = useMemo(() => !result && isStaleRun(run?.result_json), [result, run])
  const brandName = ctx.brandConfig.brand_name || ''
  const activePrompts = ctx.prompts.filter(p => p.is_active).length
  const hasProfile = Boolean(
    ctx.activeCustomerId &&
    ctx.brandConfig.brand_name.trim() &&
    ctx.brandConfig.domain.trim() &&
    String(ctx.brandConfig.industry ?? '').trim() &&
    String(ctx.brandConfig.category ?? '').trim() &&
    String(ctx.brandConfig.target_market ?? '').trim(),
  )
  const canRun = hasProfile
  const hasScan = Boolean(ctx.scanResult)
  const handleGeneratePrompts = () => ctx.setShowGeneratePromptsModal(true)

  useEffect(() => {
    if (!ctx.activeCustomerId) {
      setRun(null)
      return
    }
    let cancelled = false
    const releaseLoading = window.setTimeout(() => {
      if (!cancelled) setLoading(false)
    }, 5000)
    setLoading(true)
    setError('')
    api.getLatestAIResearchRun(ctx.activeCustomerId, ctx.userId ?? undefined)
      .then(res => {
        if (cancelled) return
        setRun(res.data?.run ?? null)
      })
      .catch(err => {
        if (!cancelled) setError(err.message || 'Failed to load AI Research')
      })
      .finally(() => {
        window.clearTimeout(releaseLoading)
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
      window.clearTimeout(releaseLoading)
    }
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
      }, ctx.userId ?? undefined)
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

  // Keep a stable ref to the latest handleRun so the auto-regenerate effect can
  // call it without re-subscribing every render.
  const handleRunRef = useRef(handleRun)
  handleRunRef.current = handleRun

  // Auto-regenerate when the cached report is older than the latest scan. The
  // report is a cached object — re-running prompts (a new scan) does NOT refresh
  // it on its own, so a fresh scan would otherwise never reach this view. Aggregation
  // is cheap (no LLM; just reads the latest scan + Explore), and we gate on the
  // scan timestamp so it fires once per new scan, then settles.
  const latestScanAt = ctx.scanResult?.scanned_at || ''
  useEffect(() => {
    if (!result || !ctx.activeCustomerId || !canRun) return
    if (running || loading) return
    const liveT = parseTs(latestScanAt)
    if (!Number.isFinite(liveT)) return
    const runT = parseTs(result.scanned_at)
    // Not stale: the report already aggregated this scan (allow 1s of clock slack).
    if (Number.isFinite(runT) && liveT <= runT + 1000) return
    const key = `${ctx.activeCustomerId}:${latestScanAt}`
    if (autoRegenKeys.current.has(key)) return
    autoRegenKeys.current.add(key)
    handleRunRef.current()
  }, [result, latestScanAt, ctx.activeCustomerId, canRun, running, loading])

  // Auto-bootstrap: a customer with no prompts gets a default set + first scan, so
  // the report has real data to aggregate on the next refresh.
  const bootstrapKey = result && ctx.activeCustomerId
    ? `${ctx.activeCustomerId}:${run?.id ?? result.generated_at}`
    : ''

  useEffect(() => {
    if (!result || !ctx.activeCustomerId || !bootstrapKey) return
    if (!hasProfile || ctx.isLoadingPrompts || ctx.isScanning) return
    if (ctx.prompts.length > 0 || activePrompts > 0) return
    if (autoBootstrappedKeys.current.has(bootstrapKey)) return

    autoBootstrappedKeys.current.add(bootstrapKey)
    let cancelled = false

    const bootstrap = async () => {
      setAutoBootstrapStatus('running')
      setError('')
      try {
        const competitor = (ctx.brandConfig.competitors || []).find(c => c.trim()) || 'top alternatives'
        const audience = String(ctx.brandConfig.target_audience ?? '') || 'buyers'
        await ctx.handleBatchSavePrompts(buildDefaultPrompts(
          cleanText(result.brand_name, 'this brand'),
          cleanText(result.category, 'this product category'),
          cleanText(result.market, 'the target market'),
          audience,
          competitor,
          result.domain,
          result.engines,
        ))
        if (cancelled) return
        await ctx.loadPrompts()
        if (cancelled) return
        await ctx.handleRunScan(true)
        if (!cancelled) setAutoBootstrapStatus('done')
      } catch (err: any) {
        if (!cancelled) {
          setAutoBootstrapStatus('error')
          setError(err?.message || 'AI Research finished, but default prompt setup failed.')
        }
      }
    }

    bootstrap()
    return () => { cancelled = true }
  }, [activePrompts, bootstrapKey, ctx, hasProfile, result])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-divider-light bg-surface py-16">
        <Loader2 className="h-5 w-5 animate-spin text-ink-3" />
        <p className="mt-3 text-[13px] font-semibold text-ink-3">Loading AI Research…</p>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="space-y-4">
        {error && <div className="rounded-xl border border-red-soft/30 bg-red-soft-bg p-4 text-sm text-red-soft">{error}</div>}
        <EmptyState brandName={brandName} canRun={canRun} onRun={handleRun} running={running} stale={stale} />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {error && <div className="rounded-xl border border-red-soft/30 bg-red-soft-bg p-4 text-sm text-red-soft">{error}</div>}
      {autoBootstrapStatus === 'running' && (
        <div className="flex items-center gap-3 rounded-xl border border-sage/25 bg-sage-bg/45 px-4 py-3 text-[13px] font-semibold text-sage">
          <Loader2 className="h-4 w-4 animate-spin" />
          Creating starter prompts and running your first scan…
        </div>
      )}

      <CommandCenter
        result={result}
        activePrompts={activePrompts}
        hasScan={hasScan}
        running={running}
        onUpdate={handleRun}
        onGeneratePrompts={handleGeneratePrompts}
      />
      <StandingsCard result={result} />
      <WhereYouLoseCard result={result} />
      <SourcesMapCard result={result} />
      {ctx.showGeneratePromptsModal && (
        <GeneratePromptsModal onClose={() => ctx.setShowGeneratePromptsModal(false)} />
      )}
    </div>
  )
}
