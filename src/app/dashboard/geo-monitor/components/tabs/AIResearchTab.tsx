'use client'

import { useState } from 'react'
import {
  FlaskConical, Play, Loader2, Sparkles, ChevronRight,
  Layers, Grid3X3, GitBranch, Target, TrendingUp,
  ArrowRight, CheckCircle2, AlertCircle, XCircle,
  BookOpen, Zap, BarChart2,
} from 'lucide-react'
import { useUnified } from '../UnifiedContext'
import { BrandLogo } from '@/components/BrandLogo'

// ─── Result shape (persisted to monitor_analysis_cache 'ai_research') ─────────
// When the real backend ships, it returns this exact shape — storage/hydration
// stays identical; only the generator changes.
const RESEARCH_SCHEMA_VERSION = 1

// ─── Mock data (EcoFlow example) ──────────────────────────────────────────────
// Replace with real API response once backend ships.

const MOCK_DIMENSIONS = [
  { id: 'battery',   label: 'Battery Technology',      sources: 38, subQuestions: 9,  depth: 'high'   },
  { id: 'capacity',  label: 'Capacity & Output Specs',  sources: 31, subQuestions: 8,  depth: 'high'   },
  { id: 'usecases',  label: 'Use Cases',                sources: 27, subQuestions: 7,  depth: 'high'   },
  { id: 'brands',    label: 'Brand Comparison',         sources: 24, subQuestions: 6,  depth: 'high'   },
  { id: 'price',     label: 'Price & Value',            sources: 18, subQuestions: 5,  depth: 'medium' },
  { id: 'safety',    label: 'Safety & Certifications',  sources: 14, subQuestions: 4,  depth: 'medium' },
  { id: 'env',       label: 'Environmental Impact',     sources: 8,  subQuestions: 3,  depth: 'low'    },
  { id: 'warranty',  label: 'Warranty & Support',       sources: 6,  subQuestions: 2,  depth: 'low'    },
]

type Coverage = 'strong' | 'weak' | 'absent'
const MOCK_BRANDS: { name: string; domain: string; isYou?: boolean; coverage: Record<string, Coverage> }[] = [
  { name: 'EcoFlow',   domain: 'ecoflow.com',       isYou: true, coverage: { battery: 'strong', capacity: 'strong', usecases: 'strong', brands: 'strong', price: 'weak',   safety: 'weak',   env: 'absent', warranty: 'absent' } },
  { name: 'Jackery',   domain: 'jackery.com',                    coverage: { battery: 'weak',   capacity: 'weak',   usecases: 'strong', brands: 'strong', price: 'strong',  safety: 'weak',   env: 'absent', warranty: 'absent' } },
  { name: 'Bluetti',   domain: 'bluettipower.com',               coverage: { battery: 'strong', capacity: 'strong', usecases: 'weak',   brands: 'strong', price: 'weak',    safety: 'strong', env: 'weak',   warranty: 'absent' } },
  { name: 'Goal Zero', domain: 'goalzero.com',                   coverage: { battery: 'weak',   capacity: 'weak',   usecases: 'strong', brands: 'weak',   price: 'weak',    safety: 'weak',   env: 'strong', warranty: 'weak'   } },
]

// ── Shared brand chip: official logo + name ───────────
function BrandChip({ name, domain, size = 18, isYou = false }: { name: string; domain: string; size?: number; isYou?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <BrandLogo domain={domain} name={name} size={size} />
      <span className="font-semibold text-ink">{name}</span>
      {isYou && <span className="text-[8px] font-bold text-sage bg-sage-bg px-1.5 py-0.5 rounded-full leading-none">You</span>}
    </span>
  )
}

const MOCK_TRAIL = {
  question: 'What is the best portable power station for home backup?',
  subQuestions: [
    { q: 'Which brands dominate the home backup portable power station market?', sources: 12, mentions: ['EcoFlow', 'Bluetti', 'Jackery'] },
    { q: 'What capacity (Wh) is recommended for whole-home vs partial backup?', sources: 9,  mentions: ['EcoFlow', 'Bluetti'] },
    { q: 'How does LFP battery chemistry compare for safety in home use?', sources: 7,  mentions: ['EcoFlow', 'Bluetti'] },
    { q: 'What are the top-rated units under $2000 for home backup?', sources: 8,  mentions: ['Jackery', 'EcoFlow'] },
  ],
  finalCitation: 'EcoFlow Delta Pro is consistently recommended for whole-home backup due to its 3.6kWh capacity and LFP battery chemistry, with Bluetti AC300+B300 as a modular alternative.',
}

const MOCK_GAPS = [
  { dimension: 'Environmental Impact', yourCoverage: 0,  topCompetitor: 'Bluetti', topCompetitorDomain: 'bluettipower.com', competitorCoverage: 40, contentType: 'Sustainability Report',  priority: 'high'   },
  { dimension: 'Warranty & Support',   yourCoverage: 0,  topCompetitor: 'Jackery', topCompetitorDomain: 'jackery.com',      competitorCoverage: 35, contentType: 'Support Documentation',  priority: 'high'   },
  { dimension: 'Price & Value',        yourCoverage: 25, topCompetitor: 'Jackery', topCompetitorDomain: 'jackery.com',      competitorCoverage: 80, contentType: 'Comparison Article',     priority: 'medium' },
  { dimension: 'Safety & Certs',       yourCoverage: 30, topCompetitor: 'Bluetti', topCompetitorDomain: 'bluettipower.com', competitorCoverage: 75, contentType: 'Technical Spec Page',    priority: 'medium' },
]

// ─── Brand domain lookup (for logo rendering in Research Trail mentions) ─────
const BRAND_DOMAINS: Record<string, string> = Object.fromEntries(
  MOCK_BRANDS.map(b => [b.name, b.domain])
)
function domainForBrand(name: string): string {
  return BRAND_DOMAINS[name] ?? name.toLowerCase().replace(/\s+/g, '') + '.com'
}

// ─── Shared helpers ────────────────────────────────────────────────────────────

function BlockHeader({ icon: Icon, title, question, number }: {
  icon: React.ElementType; title: string; question: string; number: number
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

// ─── Block 1: Research Brief ──────────────────────────────────────────────────

function ResearchBrief({ brandName }: { brandName: string }) {
  return (
    <div className="bg-surface rounded-2xl border border-divider-light p-6">
      <BlockHeader
        icon={BookOpen} number={1}
        title="Research Brief"
        question={`What dimensions does AI investigate when doing deep research on "${brandName}"?`}
      />

      {/* Research plan */}
      <div className="bg-canvas rounded-xl border border-divider-light p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-3.5 h-3.5 text-caution" />
          <span className="text-[11px] font-bold text-ink-3 uppercase tracking-wider">AI-Generated Research Plan</span>
        </div>
        <p className="text-[13px] text-ink-2 mb-3">
          <span className="font-semibold text-ink">Topic:</span> Portable power stations for home backup & outdoor use
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Dimensions', value: '8', color: 'text-ink' },
            { label: 'Sub-questions', value: '44', color: 'text-ink' },
            { label: 'Sources read', value: '166', color: 'text-ink' },
            { label: 'Engines', value: 'ChatGPT · Perplexity', color: 'text-ink-2', small: true },
          ].map(m => (
            <div key={m.label} className="bg-surface rounded-xl p-3 border border-divider-light text-center">
              <div className={`text-[20px] font-bold ${m.color} ${m.small ? 'text-[13px]' : ''}`}>{m.value}</div>
              <div className="text-[10px] text-ink-3 mt-0.5">{m.label}</div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {MOCK_DIMENSIONS.map(d => (
            <span key={d.id} className={`text-[11px] px-2.5 py-1 rounded-full font-medium border ${
              d.depth === 'high'   ? 'bg-sage-bg text-sage border-sage/20' :
              d.depth === 'medium' ? 'bg-caution-bg text-caution border-caution/20' :
              'bg-surface-muted text-ink-3 border-divider-light'
            }`}>
              {d.label}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 p-3 bg-caution-bg/40 border border-caution/15 rounded-xl">
        <TrendingUp className="w-3.5 h-3.5 text-caution flex-shrink-0" />
        <p className="text-[12px] text-caution font-medium">
          AI spent 60% of research depth on Battery Tech, Capacity, and Use Cases — these are your highest-value content investment areas.
        </p>
      </div>
    </div>
  )
}

// ─── Block 2: Dimension Map ───────────────────────────────────────────────────

function DimensionMap() {
  const maxSources = Math.max(...MOCK_DIMENSIONS.map(d => d.sources))
  return (
    <div className="bg-surface rounded-2xl border border-divider-light p-6">
      <BlockHeader
        icon={Layers} number={2}
        title="Dimension Map"
        question="Which dimensions does AI research most deeply — and where does competition concentrate?"
      />

      <div className="space-y-2.5">
        {MOCK_DIMENSIONS.map(d => (
          <div key={d.id} className="flex items-center gap-3">
            <div className="w-40 text-[12px] text-ink-2 font-medium flex-shrink-0 truncate">{d.label}</div>
            <div className="flex-1 h-7 bg-canvas rounded-lg overflow-hidden border border-divider-light relative">
              <div
                className={`h-full rounded-lg transition-all ${
                  d.depth === 'high' ? 'bg-ink' : d.depth === 'medium' ? 'bg-[rgba(0,0,0,0.35)]' : 'bg-[rgba(0,0,0,0.12)]'
                }`}
                style={{ width: `${(d.sources / maxSources) * 100}%` }}
              />
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 w-32 justify-end">
              <span className="text-[11px] text-ink-3">{d.sources} sources</span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                d.depth === 'high'   ? 'bg-sage-bg text-sage' :
                d.depth === 'medium' ? 'bg-caution-bg text-caution' :
                'bg-surface-muted text-ink-3'
              }`}>{d.depth}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2 p-3 bg-surface-muted rounded-xl border border-divider-light">
        <ArrowRight className="w-3.5 h-3.5 text-ink-3 flex-shrink-0" />
        <p className="text-[12px] text-ink-3">
          Top 4 dimensions account for 73% of all research depth — this is where your content dollars have the highest ROI.
        </p>
      </div>
    </div>
  )
}

// ─── Block 3: Brand Coverage Matrix ───────────────────────────────────────────

function CoverageCell({ coverage }: { coverage: Coverage }) {
  if (coverage === 'strong') return (
    <div className="flex items-center justify-center">
      <CheckCircle2 className="w-4 h-4 text-sage" strokeWidth={2} />
    </div>
  )
  if (coverage === 'weak') return (
    <div className="flex items-center justify-center">
      <AlertCircle className="w-4 h-4 text-caution" strokeWidth={2} />
    </div>
  )
  return (
    <div className="flex items-center justify-center">
      <XCircle className="w-4 h-4 text-[rgba(0,0,0,0.15)]" strokeWidth={1.5} />
    </div>
  )
}

function BrandCoverage() {
  return (
    <div className="bg-surface rounded-2xl border border-divider-light p-6">
      <BlockHeader
        icon={Grid3X3} number={3}
        title="Brand Coverage Matrix"
        question="Across all research dimensions, where do I appear vs competitors?"
      />

      {/* Transposed: dimensions = rows (readable full names), brands = columns (short names) */}
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-divider-light">
              <th className="text-left py-2.5 pr-6 text-[11px] font-semibold text-ink-3 w-48">Dimension</th>
              {MOCK_BRANDS.map(brand => (
                <th key={brand.name} className="py-2.5 px-3 text-center">
                  <div className="flex flex-col items-center gap-1.5">
                    <BrandLogo domain={brand.domain} name={brand.name} size={24} />
                    <span className="text-[11px] font-semibold text-ink whitespace-nowrap">{brand.name}</span>
                    {brand.isYou && (
                      <span className="text-[8px] font-bold text-sage bg-sage-bg px-1.5 py-0.5 rounded-full leading-none">You</span>
                    )}
                  </div>
                </th>
              ))}
              <th className="py-2.5 pl-4 text-right text-[11px] font-semibold text-ink-3 w-24">
                Coverage
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-divider-light">
            {MOCK_DIMENSIONS.map(d => {
              // How many brands have strong coverage on this dimension
              const strongCount = MOCK_BRANDS.filter(b => b.coverage[d.id] === 'strong').length
              const youCoverage = MOCK_BRANDS.find(b => b.isYou)?.coverage[d.id]
              const isGapForYou = youCoverage === 'absent'
              return (
                <tr key={d.id} className={isGapForYou ? 'bg-red-soft-bg/20' : ''}>
                  <td className="py-3 pr-6">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium text-[12px] ${isGapForYou ? 'text-red-soft' : 'text-ink'}`}>
                        {d.label}
                      </span>
                      {isGapForYou && (
                        <span className="text-[8px] font-bold px-1.5 py-0.5 bg-red-soft text-white rounded-full leading-none flex-shrink-0">
                          Gap
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-ink-3 mt-0.5 capitalize">{d.depth} depth · {d.sources} sources</div>
                  </td>
                  {MOCK_BRANDS.map(brand => (
                    <td key={brand.name} className={`py-3 px-3 text-center ${brand.isYou ? 'bg-sage-bg/20' : ''}`}>
                      <CoverageCell coverage={brand.coverage[d.id]} />
                    </td>
                  ))}
                  <td className="py-3 pl-4 text-right">
                    <span className={`text-[11px] font-bold ${strongCount >= 3 ? 'text-sage' : strongCount >= 2 ? 'text-caution' : 'text-red-soft'}`}>
                      {strongCount}/{MOCK_BRANDS.length}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
          {/* Brand score footer */}
          <tfoot>
            <tr className="border-t-2 border-divider">
              <td className="pt-3 pr-6 text-[11px] font-semibold text-ink-3">Overall Score</td>
              {MOCK_BRANDS.map(brand => {
                const strong = Object.values(brand.coverage).filter(v => v === 'strong').length
                const total = Object.values(brand.coverage).length
                const pct = Math.round((strong / total) * 100)
                return (
                  <td key={brand.name} className={`pt-3 px-3 text-center ${brand.isYou ? 'bg-sage-bg/20' : ''}`}>
                    <span className={`text-[13px] font-bold ${pct >= 60 ? 'text-sage' : pct >= 40 ? 'text-caution' : 'text-red-soft'}`}>
                      {pct}%
                    </span>
                  </td>
                )
              })}
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-4 flex items-center gap-3 text-[11px] text-ink-3">
        <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-sage" /> Strong coverage</span>
        <span className="flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5 text-caution" /> Weak / passing</span>
        <span className="flex items-center gap-1"><XCircle className="w-3.5 h-3.5 text-[rgba(0,0,0,0.2)]" /> Absent</span>
      </div>

      <div className="mt-4 p-3 bg-red-soft-bg/40 border border-red-soft/15 rounded-xl flex items-start gap-2">
        <AlertCircle className="w-3.5 h-3.5 text-red-soft flex-shrink-0 mt-0.5" />
        <p className="text-[12px] text-red-soft font-medium">
          EcoFlow is absent from Environmental Impact and Warranty — Bluetti covers both. These are the gaps widening the citation gap.
        </p>
      </div>
    </div>
  )
}

// ─── Block 4: Research Trail ───────────────────────────────────────────────────

function ResearchTrail() {
  const [expanded, setExpanded] = useState<number | null>(null)
  return (
    <div className="bg-surface rounded-2xl border border-divider-light p-6">
      <BlockHeader
        icon={GitBranch} number={4}
        title="Research Trail"
        question="How did AI actually build this research? (one real thread, made visible)"
      />

      {/* Root question */}
      <div className="mb-4">
        <div className="flex items-start gap-3 p-4 bg-ink text-ink-inv rounded-xl">
          <BookOpen className="w-4 h-4 flex-shrink-0 mt-0.5 opacity-70" />
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider opacity-50 mb-0.5">User asked AI</div>
            <div className="text-[13px] font-semibold">"{MOCK_TRAIL.question}"</div>
          </div>
        </div>
      </div>

      {/* Sub-questions tree */}
      <div className="space-y-2 mb-4 pl-4 border-l-2 border-divider">
        {MOCK_TRAIL.subQuestions.map((sq, i) => (
          <div key={i}>
            <button
              onClick={() => setExpanded(expanded === i ? null : i)}
              className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-surface-warm transition-colors text-left"
            >
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-surface-muted border border-divider flex items-center justify-center text-[9px] font-bold text-ink-3 mt-0.5">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] text-ink font-medium">{sq.q}</div>
                <div className="text-[10px] text-ink-3 mt-0.5">{sq.sources} sources read</div>
              </div>
              <ChevronRight className={`w-3.5 h-3.5 text-ink-3 flex-shrink-0 mt-0.5 transition-transform ${expanded === i ? 'rotate-90' : ''}`} />
            </button>
            {expanded === i && (
              <div className="ml-8 mt-1 mb-2 p-3 bg-canvas rounded-xl border border-divider-light">
                <div className="text-[10px] font-bold text-ink-3 uppercase tracking-wider mb-2">Brands mentioned in this sub-question</div>
                <div className="flex flex-wrap gap-2">
                  {sq.mentions.map(m => {
                    const isYouBrand = MOCK_BRANDS.find(b => b.name === m)?.isYou
                    return (
                      <span key={m} className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg font-semibold border ${
                        isYouBrand ? 'bg-sage-bg border-sage/20' : 'bg-surface border-divider-light'
                      }`}>
                        <BrandLogo domain={domainForBrand(m)} name={m} size={16} />
                        <span className={isYouBrand ? 'text-sage' : 'text-ink-2'}>{m}</span>
                      </span>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Final synthesis — no label, just the quote */}
      <div className="p-4 bg-sage-bg/50 border border-sage/20 rounded-xl">
        <p className="text-[12.5px] text-ink-2 leading-relaxed">
          "{MOCK_TRAIL.finalCitation}"
        </p>
      </div>

      <div className="mt-4 p-3 bg-surface-muted rounded-xl flex items-start gap-2">
        <ArrowRight className="w-3.5 h-3.5 text-ink-3 flex-shrink-0 mt-0.5" />
        <p className="text-[12px] text-ink-3">
          EcoFlow appears in 3 of 4 sub-questions — but is absent in the price sub-question where Jackery dominates.
        </p>
      </div>
    </div>
  )
}

// ─── Block 5: Gap Playbook ─────────────────────────────────────────────────────

function GapPlaybook({ brandName }: { brandName: string }) {
  return (
    <div className="bg-surface rounded-2xl border border-divider-light p-6">
      <BlockHeader
        icon={Target} number={5}
        title="Gap Playbook"
        question="Which gaps should I fix first — and what content closes each one?"
      />

      <div className="space-y-3">
        {MOCK_GAPS.map((gap) => (
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
                {/* Your brand coverage */}
                <span className="flex items-center gap-1.5">
                  <BrandLogo domain={domainForBrand(brandName)} name={brandName} size={14} />
                  <strong className={gap.yourCoverage === 0 ? 'text-red-soft' : 'text-caution'}>
                    {gap.yourCoverage === 0 ? 'Absent' : `${gap.yourCoverage}%`}
                  </strong>
                </span>
                <span className="text-ink-3">vs</span>
                {/* Top competitor coverage */}
                <span className="flex items-center gap-1.5">
                  <BrandLogo domain={gap.topCompetitorDomain} name={gap.topCompetitor} size={14} />
                  <strong className="text-sage">{gap.competitorCoverage}%</strong>
                </span>
                <span className="flex items-center gap-1 text-ink-3">
                  <BarChart2 className="w-3 h-3" />{gap.contentType}
                </span>
              </div>
            </div>
            <button className="flex items-center gap-1.5 px-3 py-2 bg-ink text-ink-inv rounded-xl text-[11px] font-semibold hover:bg-ink/80 transition-colors flex-shrink-0 whitespace-nowrap">
              <Zap className="w-3 h-3" />
              Generate
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 p-4 bg-canvas rounded-xl border border-divider-light flex items-center justify-between">
        <div>
          <div className="text-[13px] font-semibold text-ink">Close all 4 gaps → projected coverage jump</div>
          <div className="text-[11px] text-ink-3 mt-0.5">Based on competitor benchmarks in this category</div>
        </div>
        <div className="text-right">
          <div className="text-[22px] font-bold text-sage">50% → 87%</div>
          <div className="text-[10px] text-ink-3">citation coverage</div>
        </div>
      </div>
    </div>
  )
}

// ─── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ brandName, onRun, running }: {
  brandName: string; onRun: () => void; running: boolean
}) {
  return (
    <div className="space-y-4">
      {/* Prompt card */}
      <div className="bg-surface rounded-2xl border border-divider-light p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[rgba(100,180,255,0.08)] flex items-center justify-center mx-auto mb-4">
          <FlaskConical className="w-7 h-7 text-[rgba(100,180,255,0.7)]" strokeWidth={1.6} />
        </div>
        <h3 className="text-[16px] font-bold text-ink mb-2">AI Research</h3>
        <p className="text-[13px] text-ink-3 max-w-md mx-auto mb-6">
          Simulate a <strong className="text-ink">Deep Research</strong> run on your brand and category.
          See how AI builds its research plan, which dimensions it investigates, and where{' '}
          <strong className="text-ink">{brandName || 'your brand'}</strong> appears vs competitors.
        </p>

        {/* What you'll get */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-8 max-w-2xl mx-auto text-left">
          {[
            { n: '①', title: 'Research Brief',   desc: 'WHAT dimensions AI studies' },
            { n: '②', title: 'Dimension Map',     desc: 'SO WHAT patterns emerge' },
            { n: '③', title: 'Brand Coverage',    desc: 'WHERE you stand vs rivals' },
            { n: '④', title: 'Research Trail',    desc: 'WHY it plays out this way' },
            { n: '⑤', title: 'Gap Playbook',      desc: 'NOW WHAT to build' },
          ].map(s => (
            <div key={s.n} className="p-3 bg-canvas rounded-xl border border-divider-light">
              <div className="text-[11px] font-bold text-ink-3 mb-1">{s.n} {s.title}</div>
              <div className="text-[10px] text-ink-3 leading-relaxed">{s.desc}</div>
            </div>
          ))}
        </div>

        <button
          onClick={onRun}
          disabled={running || !brandName}
          className="inline-flex items-center gap-2.5 px-6 py-3 bg-ink text-ink-inv rounded-xl text-[13px] font-semibold hover:bg-ink/80 transition-colors disabled:opacity-50 shadow-sm"
        >
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {running ? 'Running deep research…' : `Run AI Research${brandName ? ` on ${brandName}` : ''}`}
        </button>
        {!brandName && (
          <p className="text-[11px] text-ink-3 mt-2">Configure a brand first to run research</p>
        )}
      </div>
    </div>
  )
}

// ─── Main export ───────────────────────────────────────────────────────────────

export function AIResearchTab() {
  const ctx = useUnified()
  const brandName = ctx.brandConfig.brand_name || ''

  // Persisted result lives in UnifiedContext (hydrated from DB via getLatest).
  // `running` is the only local state — the result itself is permanent.
  const result = ctx.aiResearchResult
  const [running, setRunning] = useState(false)

  const handleRun = () => {
    if (!brandName) return
    setRunning(true)
    // Simulate a 2.5s research run. The bundled blob is what a real backend
    // would return — saved to monitor_analysis_cache('ai_research') so it
    // survives logout / customer switch / refresh (no re-run needed).
    setTimeout(() => {
      ctx.saveAiResearch({
        v: RESEARCH_SCHEMA_VERSION,
        brandName,
        simulated: true,
        dimensions: MOCK_DIMENSIONS,
        brands: MOCK_BRANDS,
        trail: MOCK_TRAIL,
        gaps: MOCK_GAPS,
      })
      setRunning(false)
    }, 2500)
  }

  if (!result) {
    return <EmptyState brandName={brandName} onRun={handleRun} running={running} />
  }

  return (
    <div className="space-y-5">
      {/* Re-run header */}
      <div className="flex items-center justify-between p-4 bg-surface rounded-xl border border-divider-light">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-ink-3" />
          <span className="text-[13px] font-semibold text-ink">AI Research — {brandName}</span>
          {(result as { simulated?: boolean }).simulated && (
            <span className="text-[10px] px-2 py-0.5 bg-sage-bg text-sage rounded-full font-bold">Simulated</span>
          )}
          <span className="text-[10px] px-2 py-0.5 bg-surface-muted text-ink-3 rounded-full font-medium">Saved</span>
        </div>
        <button
          onClick={() => { ctx.clearAiResearch() }}
          className="text-[11px] font-semibold text-ink-3 hover:text-ink transition-colors flex items-center gap-1.5"
        >
          <Play className="w-3 h-3" /> Re-run
        </button>
      </div>

      {/* 5-block narrative */}
      <ResearchBrief brandName={brandName} />
      <DimensionMap />
      <BrandCoverage />
      <ResearchTrail />
      <GapPlaybook brandName={brandName} />
    </div>
  )
}
