'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Sparkles, ChevronRight, Check, Loader2,
  MessageSquare, RefreshCw, Tag, ArrowLeft,
  Search, ChevronDown,
} from 'lucide-react'
import { useUnified } from '../UnifiedContext'
import { useLanguage } from '@/lib/LanguageContext'

// Language label for display (follows system setting, not selectable here)
const LANG_LABEL: Record<string, string> = {
  en: 'English', zh: '中文 (Chinese)', es: 'Español', de: 'Deutsch',
  fr: 'Français', ja: '日本語', pt: 'Português', ko: '한국어',
}

// ─── Country list with flag emojis ─────────────────────────────────────────────

// Global pinned first; rest sorted A→Z by name. Taiwan removed per policy.
export const COUNTRIES = [
  { code: 'GLOBAL', name: 'Global / Worldwide', flag: '🌍' },
  ...([
    { code: 'AR', name: 'Argentina',      flag: '🇦🇷' },
    { code: 'AT', name: 'Austria',        flag: '🇦🇹' },
    { code: 'AU', name: 'Australia',      flag: '🇦🇺' },
    { code: 'BE', name: 'Belgium',        flag: '🇧🇪' },
    { code: 'BR', name: 'Brazil',         flag: '🇧🇷' },
    { code: 'CA', name: 'Canada',         flag: '🇨🇦' },
    { code: 'CH', name: 'Switzerland',    flag: '🇨🇭' },
    { code: 'CL', name: 'Chile',          flag: '🇨🇱' },
    { code: 'CN', name: 'China',          flag: '🇨🇳' },
    { code: 'CO', name: 'Colombia',       flag: '🇨🇴' },
    { code: 'DE', name: 'Germany',        flag: '🇩🇪' },
    { code: 'DK', name: 'Denmark',        flag: '🇩🇰' },
    { code: 'EG', name: 'Egypt',          flag: '🇪🇬' },
    { code: 'ES', name: 'Spain',          flag: '🇪🇸' },
    { code: 'FI', name: 'Finland',        flag: '🇫🇮' },
    { code: 'FR', name: 'France',         flag: '🇫🇷' },
    { code: 'HK', name: 'Hong Kong',      flag: '🇭🇰' },
    { code: 'ID', name: 'Indonesia',      flag: '🇮🇩' },
    { code: 'IL', name: 'Israel',         flag: '🇮🇱' },
    { code: 'IN', name: 'India',          flag: '🇮🇳' },
    { code: 'IT', name: 'Italy',          flag: '🇮🇹' },
    { code: 'JP', name: 'Japan',          flag: '🇯🇵' },
    { code: 'KR', name: 'South Korea',    flag: '🇰🇷' },
    { code: 'MX', name: 'Mexico',         flag: '🇲🇽' },
    { code: 'MY', name: 'Malaysia',       flag: '🇲🇾' },
    { code: 'NG', name: 'Nigeria',        flag: '🇳🇬' },
    { code: 'NL', name: 'Netherlands',    flag: '🇳🇱' },
    { code: 'NO', name: 'Norway',         flag: '🇳🇴' },
    { code: 'NZ', name: 'New Zealand',    flag: '🇳🇿' },
    { code: 'PH', name: 'Philippines',    flag: '🇵🇭' },
    { code: 'PL', name: 'Poland',         flag: '🇵🇱' },
    { code: 'PT', name: 'Portugal',       flag: '🇵🇹' },
    { code: 'RU', name: 'Russia',         flag: '🇷🇺' },
    { code: 'SA', name: 'Saudi Arabia',   flag: '🇸🇦' },
    { code: 'SE', name: 'Sweden',         flag: '🇸🇪' },
    { code: 'SG', name: 'Singapore',      flag: '🇸🇬' },
    { code: 'TH', name: 'Thailand',       flag: '🇹🇭' },
    { code: 'TR', name: 'Turkey',         flag: '🇹🇷' },
    { code: 'AE', name: 'UAE',            flag: '🇦🇪' },
    { code: 'UK', name: 'United Kingdom', flag: '🇬🇧' },
    { code: 'US', name: 'United States',  flag: '🇺🇸' },
    { code: 'VN', name: 'Vietnam',        flag: '🇻🇳' },
    { code: 'ZA', name: 'South Africa',   flag: '🇿🇦' },
  ].sort((a, b) => a.name.localeCompare(b.name))),
]

/** Map onboarding target_market string → country code */
const MARKET_TO_CODE: Record<string, string> = {
  'Worldwide':      'GLOBAL',
  'United States':  'US',
  'United Kingdom': 'UK',
  'Canada':         'CA',
  'Australia':      'AU',
  'Germany':        'DE',
  'France':         'FR',
  'Japan':          'JP',
  'China':          'CN',
  'Singapore':      'SG',
  'India':          'IN',
  'Brazil':         'BR',
  'South Korea':    'KR',
  'Netherlands':    'NL',
  'Sweden':         'SE',
  'Spain':          'ES',
  'Italy':          'IT',
  'Mexico':         'MX',
  'UAE':            'AE',
  'New Zealand':    'NZ',
}

// ─── Country selector (custom searchable dropdown) ─────────────────────────────

function CountrySelector({ value, onChange }: {
  value: string
  onChange: (code: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  useEffect(() => {
    if (open) { setQuery(''); setTimeout(() => inputRef.current?.focus(), 60) }
  }, [open])

  const filtered = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.code.toLowerCase().includes(query.toLowerCase())
  )

  const active = COUNTRIES.find(c => c.code === value) ?? COUNTRIES[0]

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 border border-divider rounded-xl bg-canvas hover:border-ink-2 transition-colors text-left"
      >
        <span className="text-lg leading-none flex-shrink-0">{active.flag}</span>
        <span className="flex-1 text-[13px] text-ink font-medium truncate">{active.name}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-ink-3 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-surface border border-divider rounded-xl shadow-lg overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-divider-light">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-3" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search country…"
                className="w-full pl-8 pr-3 py-1.5 text-[12px] bg-canvas border border-divider-light rounded-lg focus:outline-none focus:border-ink-2 transition-colors"
              />
            </div>
          </div>
          {/* List */}
          <div className="max-h-52 overflow-y-auto py-1 scrollbar-none">
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-[12px] text-ink-3 text-center">No results</div>
            ) : filtered.map(c => (
              <button
                key={c.code}
                type="button"
                onClick={() => { onChange(c.code); setOpen(false) }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 hover:bg-surface-warm transition-colors text-left ${c.code === value ? 'bg-surface-warm' : ''}`}
              >
                <span className="text-lg leading-none w-6 flex-shrink-0">{c.flag}</span>
                <span className="flex-1 text-[12px] text-ink font-medium">{c.name}</span>
                {c.code === value && <Check className="w-3.5 h-3.5 text-sage flex-shrink-0" strokeWidth={2.5} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface GeneratedPrompt {
  id: string
  template: string
  intent: 'info_cognition' | 'solution_explore' | 'comparison_decision' | 'action_choice'
  topic: string
  selected: boolean
}

const INTENT_META = {
  info_cognition:      { label: 'Info / Awareness', color: 'bg-surface-warm text-ink-2 border-divider',       dot: 'bg-ink-3'    },
  solution_explore:    { label: 'Solution Explore',  color: 'bg-sage-bg text-sage border-sage/20',             dot: 'bg-sage'     },
  comparison_decision: { label: 'Comparison',        color: 'bg-caution-bg text-caution border-caution/20',   dot: 'bg-caution'  },
  action_choice:       { label: 'Recommendation',    color: 'bg-red-soft-bg text-red-soft border-red-soft/20', dot: 'bg-red-soft' },
}

// ─── Mock generator — balanced across 4 intents, respects count ───────────────

const INTENT_POOL: { template: (b: string, kw: string, kw2: string) => string; intent: GeneratedPrompt['intent'] }[] = [
  // info_cognition
  { intent: 'info_cognition',      template: (b)         => `What is ${b} and what do they make?` },
  { intent: 'info_cognition',      template: (b, kw)     => `Tell me about ${b}'s ${kw} technology` },
  { intent: 'info_cognition',      template: (b, kw, k2) => `What are the key features of ${b} ${k2}?` },
  // solution_explore
  { intent: 'solution_explore',    template: (_, kw)     => `What ${kw} should I buy for a 3-day camping trip?` },
  { intent: 'solution_explore',    template: (_, __, k2) => `Which ${k2} works best for van life?` },
  { intent: 'solution_explore',    template: (_, kw)     => `How to choose a ${kw} for whole-home backup power?` },
  // comparison_decision
  { intent: 'comparison_decision', template: (b)         => `How does ${b} compare to Jackery for home backup?` },
  { intent: 'comparison_decision', template: (b, __, k2) => `${b} vs Bluetti — which is better for outdoor camping?` },
  { intent: 'comparison_decision', template: (b, __, k2) => `Best alternatives to ${b} ${k2}` },
  // action_choice
  { intent: 'action_choice',       template: (b)         => `Is ${b} worth buying in 2025?` },
  { intent: 'action_choice',       template: (b, __, k2) => `Best ${k2} under $1000 — is ${b} the top pick?` },
  { intent: 'action_choice',       template: (_, kw)     => `Recommend a ${kw} for a family of 4 during power outages` },
]

function buildMockPrompts(brand: string, keywords: string[], count: number): GeneratedPrompt[] {
  const kw  = keywords[0] ?? brand
  const kw2 = keywords[1] ?? 'portable power station'
  return INTENT_POOL.slice(0, Math.max(1, Math.min(count, INTENT_POOL.length))).map((item, i) => ({
    id: String(i + 1),
    template: item.template(brand, kw, kw2),
    intent: item.intent,
    topic: item.intent,   // topic === intent for grouping
    selected: true,
  }))
}

// ─── Step indicator ────────────────────────────────────────────────────────────

function StepBar({ current }: { current: 1 | 2 }) {
  const steps = ['Configure', 'Select & Add']
  return (
    <div className="flex items-center mb-6">
      {steps.map((label, i) => {
        const n = i + 1; const done = current > n; const active = current === n
        return (
          <div key={n} className="flex items-center flex-1">
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold border-2 transition-colors ${done ? 'border-sage bg-sage text-white' : active ? 'border-ink bg-ink text-ink-inv' : 'border-divider bg-canvas text-ink-3'}`}>
                {done ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : n}
              </div>
              <span className={`text-[12px] font-semibold ${active ? 'text-ink' : done ? 'text-sage' : 'text-ink-3'}`}>{label}</span>
            </div>
            {i < steps.length - 1 && <div className={`flex-1 h-px mx-3 ${done ? 'bg-sage' : 'bg-divider-light'}`} />}
          </div>
        )
      })}
    </div>
  )
}

// ─── Step 1: Configure ────────────────────────────────────────────────────────

interface Config {
  domain: string
  language: string
  country: string
  keywords: string[]
  count: number
  groupByIntent: boolean
}

function StepConfigure({ config, setConfig, onNext }: {
  config: Config
  setConfig: React.Dispatch<React.SetStateAction<Config>>
  onNext: () => void
}) {
  const { lang } = useLanguage()
  const [kwInput, setKwInput] = useState('')

  const addKw = () => {
    const v = kwInput.trim()
    if (v && !config.keywords.includes(v)) { setConfig(c => ({ ...c, keywords: [...c.keywords, v] })); setKwInput('') }
  }

  return (
    <div className="bg-surface rounded-2xl border border-divider-light p-6 space-y-5">
      <div>
        <h3 className="text-[14px] font-bold text-ink mb-0.5">Research Configuration</h3>
        <p className="text-[12px] text-ink-3">Configure your brand context to generate targeted monitoring prompts</p>
      </div>

      {/* Domain */}
      <div>
        <label className="text-[12px] font-semibold text-ink-2 block mb-1.5">Domain</label>
        <input
          value={config.domain}
          onChange={e => setConfig(c => ({ ...c, domain: e.target.value }))}
          placeholder="yourbrand.com"
          className="w-full px-3 py-2.5 text-[13px] border border-divider rounded-xl bg-canvas focus:outline-none focus:border-ink-2 transition-colors"
        />
      </div>

      {/* Language — read-only, follows system setting */}
      <div>
        <label className="text-[12px] font-semibold text-ink-2 block mb-1.5">Language</label>
        <div className="flex items-center gap-2.5 px-3 py-2.5 bg-canvas border border-divider rounded-xl">
          <span className="text-[13px] font-semibold text-ink">{LANG_LABEL[lang] ?? 'English'}</span>
          <span className="text-[11px] text-ink-3">· follows your system language</span>
        </div>
        <p className="text-[10px] text-ink-3 mt-1">
          To change language, use the language toggle in the top-right corner of the app.
        </p>
      </div>

      {/* Country — custom searchable dropdown */}
      <div>
        <label className="text-[12px] font-semibold text-ink-2 block mb-1.5">Country</label>
        <CountrySelector
          value={config.country}
          onChange={code => setConfig(c => ({ ...c, country: code }))}
        />
        <p className="text-[10px] text-ink-3 mt-1">Defaults to your onboarding market setting</p>
      </div>

      {/* Seed Keywords */}
      <div>
        <label className="text-[12px] font-semibold text-ink-2 block mb-1.5">
          Seed Keywords
          <span className="ml-1.5 text-[10px] font-normal text-ink-3">(optional — improves prompt relevance)</span>
        </label>
        <div className="flex gap-2 mb-2">
          <input
            value={kwInput}
            onChange={e => setKwInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addKw() } }}
            placeholder="Enter a keyword and press Enter"
            className="flex-1 px-3 py-2.5 text-[13px] border border-divider rounded-xl bg-canvas focus:outline-none focus:border-ink-2 transition-colors"
          />
          <button type="button" onClick={addKw}
            className="px-4 py-2.5 text-[13px] font-semibold bg-surface border border-divider rounded-xl hover:bg-surface-warm transition-colors">
            Add
          </button>
        </div>
        {config.keywords.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {config.keywords.map(kw => (
              <span key={kw} className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 bg-surface-muted text-ink-2 rounded-lg border border-divider-light">
                {kw}
                <button type="button" onClick={() => setConfig(c => ({ ...c, keywords: c.keywords.filter(k => k !== kw) }))} className="hover:text-red-soft transition-colors">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Prompt count + Group toggle */}
      <div className="flex items-center gap-6">
        <div className="flex-1">
          <label className="text-[12px] font-semibold text-ink-2 block mb-1.5">
            Prompt Count: <span className="text-ink font-bold">{config.count}</span>
          </label>
          <input type="range" min={1} max={10} step={1} value={config.count}
            onChange={e => setConfig(c => ({ ...c, count: parseInt(e.target.value) }))}
            className="w-full accent-ink" />
          <div className="flex justify-between text-[10px] text-ink-3 mt-0.5"><span>1</span><span>10</span></div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button type="button" onClick={() => setConfig(c => ({ ...c, groupByIntent: !c.groupByIntent }))}
            className={`relative rounded-full transition-colors ${config.groupByIntent ? 'bg-ink' : 'bg-divider'}`}
            style={{ width: 40, height: 22 }}>
            <span className={`absolute top-0.5 w-[18px] h-[18px] bg-white rounded-full shadow transition-all ${config.groupByIntent ? 'left-[22px]' : 'left-0.5'}`} />
          </button>
          <span className="text-[12px] font-medium text-ink-2">Group by Intents</span>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button type="button" onClick={onNext} disabled={!config.domain}
          className="flex items-center gap-2 px-5 py-2.5 bg-ink text-ink-inv rounded-xl text-[13px] font-semibold hover:bg-ink/80 transition-colors disabled:opacity-40">
          <Sparkles className="w-4 h-4" />
          Start Research
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ─── Step 2: Preview & Select ─────────────────────────────────────────────────

const INTENT_ORDER: GeneratedPrompt['intent'][] = [
  'info_cognition', 'solution_explore', 'comparison_decision', 'action_choice',
]

function StepPreview({ prompts, setPrompts, onBack, onImport, importing, groupByIntent }: {
  prompts: GeneratedPrompt[]
  setPrompts: React.Dispatch<React.SetStateAction<GeneratedPrompt[]>>
  onBack: () => void
  onImport: () => Promise<void>
  importing: boolean
  groupByIntent: boolean
}) {
  const toggle = (id: string) => setPrompts(p => p.map(pr => pr.id === id ? { ...pr, selected: !pr.selected } : pr))
  const toggleAll = () => { const all = prompts.every(p => p.selected); setPrompts(p => p.map(pr => ({ ...pr, selected: !all }))) }
  const selectedCount = prompts.filter(p => p.selected).length

  const renderPrompt = (p: GeneratedPrompt) => {
    const meta = INTENT_META[p.intent]
    return (
      <button key={p.id} type="button" onClick={() => toggle(p.id)}
        className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${p.selected ? 'border-ink bg-ink/[0.03]' : 'border-divider-light hover:border-divider'}`}>
        <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 transition-colors ${p.selected ? 'border-ink bg-ink' : 'border-divider'}`}>
          {p.selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
        </div>
        <p className="flex-1 text-[12.5px] text-ink font-medium leading-relaxed">{p.template}</p>
        <span className={`flex-shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${meta.color}`}>{meta.label}</span>
      </button>
    )
  }

  return (
    <div className="bg-surface rounded-2xl border border-divider-light p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[14px] font-bold text-ink">Generated Prompts</h3>
          <p className="text-[12px] text-ink-3">{prompts.length} prompts generated — select which to add to your tracking list</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={toggleAll} className="text-[11px] font-semibold text-ink-2 hover:text-ink transition-colors">
            {prompts.every(p => p.selected) ? 'Deselect all' : 'Select all'}
          </button>
          <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-ink-3 border border-divider rounded-lg hover:border-ink-2 transition-colors">
            <RefreshCw className="w-3 h-3" /> Regenerate
          </button>
        </div>
      </div>

      {/* Intent legend */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(INTENT_META).map(([k, v]) => (
          <span key={k} className={`flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full border ${v.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${v.dot}`} />{v.label}
          </span>
        ))}
      </div>

      {/* Prompts list */}
      <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
        {groupByIntent
          ? INTENT_ORDER.map(intent => {
              const group = prompts.filter(p => p.intent === intent)
              if (group.length === 0) return null
              const meta = INTENT_META[intent]
              return (
                <div key={intent} className="mb-4">
                  <div className={`flex items-center gap-2 px-2.5 py-1 rounded-lg mb-2 w-fit text-[10px] font-bold border ${meta.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                    {meta.label}
                  </div>
                  <div className="space-y-2">{group.map(renderPrompt)}</div>
                </div>
              )
            })
          : <div className="space-y-2">{prompts.map(renderPrompt)}</div>
        }
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-divider-light">
        <button type="button" onClick={onBack} disabled={importing}
          className="flex items-center gap-1.5 px-4 py-2 text-[12px] font-semibold text-ink-3 hover:text-ink transition-colors disabled:opacity-40">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
        <button type="button" onClick={onImport}
          disabled={selectedCount === 0 || importing}
          className="flex items-center gap-2 px-5 py-2.5 bg-ink text-ink-inv rounded-xl text-[13px] font-semibold hover:bg-ink/80 transition-colors disabled:opacity-40"
        >
          {importing
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding to Prompts…</>
            : <><Tag className="w-4 h-4" /> Add {selectedCount} to Prompts</>
          }
        </button>
      </div>
    </div>
  )
}

// ─── Main export ───────────────────────────────────────────────────────────────

export function PromptEngineeringTab() {
  const ctx = useUnified()
  const { lang } = useLanguage()

  const defaultCountry = MARKET_TO_CODE[ctx.brandConfig.target_market ?? ''] ?? 'US'

  const [step, setStep] = useState<1 | 2>(1)
  const [generating, setGenerating] = useState(false)
  const [importing, setImporting] = useState(false)
  const [prompts, setPrompts] = useState<GeneratedPrompt[]>([])
  const [importError, setImportError] = useState<string | null>(null)

  const [config, setConfig] = useState<Config>({
    domain:        ctx.brandConfig.domain || '',
    language:      lang,
    country:       defaultCountry,
    keywords:      ctx.brandConfig.keywords ?? [],
    count:         8,           // default: 2 per intent × 4 intents
    groupByIntent: true,
  })

  const handleGenerate = () => {
    setGenerating(true)
    setImportError(null)
    setTimeout(() => {
      setPrompts(buildMockPrompts(ctx.brandConfig.brand_name || 'your brand', config.keywords, config.count))
      setGenerating(false)
      setStep(2)
    }, 1800)
  }

  // ── Real import: save selected prompts to DB, then jump to Prompts tab ──
  const handleImport = async () => {
    const selected = prompts.filter(p => p.selected)
    if (selected.length === 0) return
    setImporting(true)
    setImportError(null)
    try {
      await ctx.handleBatchSavePrompts(
        selected.map(p => ({
          template:   p.template,
          intent:     p.intent,
          layer:      'universal' as const,
          provenance: { target_domain: ctx.brandConfig.domain || null, engines: [], why: `Generated by Prompt Engineering for topic: ${p.topic}` },
        }))
      )
      // Success → switch directly to Prompts tab so user sees the new items
      ctx.setActiveTab('prompts')
      // Reset wizard state so next open starts fresh
      setStep(1)
      setPrompts([])
    } catch {
      setImportError('Failed to save prompts. Please try again.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3 mb-2">
        <div className="w-9 h-9 rounded-xl bg-[rgba(100,180,255,0.08)] flex items-center justify-center flex-shrink-0">
          <MessageSquare className="w-[18px] h-[18px] text-[rgba(100,180,255,0.75)]" strokeWidth={1.8} />
        </div>
        <div>
          <h2 className="text-[15px] font-bold text-ink">Prompt Engineering</h2>
          <p className="text-[12px] text-ink-3">Don't know what prompts to track? Describe your brand and we'll generate a tailored set automatically.</p>
        </div>
      </div>

      <StepBar current={step} />

      {step === 1 && !generating && (
        <StepConfigure config={config} setConfig={setConfig} onNext={handleGenerate} />
      )}

      {step === 1 && generating && (
        <div className="bg-surface rounded-2xl border border-divider-light p-16 flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-ink-3" />
          <div className="text-center">
            <div className="text-[14px] font-semibold text-ink mb-1">Generating prompts…</div>
            <div className="text-[12px] text-ink-3">Analysing your brand and building targeted queries</div>
          </div>
        </div>
      )}

      {step === 2 && (
        <>
          <StepPreview
            prompts={prompts}
            setPrompts={setPrompts}
            onBack={() => setStep(1)}
            onImport={handleImport}
            importing={importing}
            groupByIntent={config.groupByIntent}
          />
          {importError && (
            <p className="text-[12px] text-red-soft text-center">{importError}</p>
          )}
        </>
      )}
    </div>
  )
}
