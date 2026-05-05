'use client'

/**
 * Shared form components for brand data modules.
 * Used by both BrandDataTab (inline) and AssetsClient (full-page editor).
 */

import { useState, useEffect, useRef } from 'react'
import {
  Save, Loader2, CheckCircle, AlertCircle,
  ChevronDown, ChevronRight,
  Building2, Package, HelpCircle, BarChart3, Swords, FileText, Code2,
  Plus, Trash2, Brain, Server,
} from 'lucide-react'
import type { ModuleType } from '@/lib/api'

// ── 9 brand data modules (technical_config moved to Overview tab; ai_discovery_files auto-generated) ──
export const MODULES: {
  type: ModuleType
  label: string
  desc: string
  icon: React.ElementType
  color: string
  optional?: boolean
}[] = [
  { type: 'brand_identity',          label: 'Brand Identity',          desc: 'Core brand info — who you are, what you do',                      icon: Building2,  color: 'text-ink-2 bg-surface-warm'    },
  { type: 'products_services',       label: 'Products & Services',     desc: 'Product catalog, features, pricing',                              icon: Package,    color: 'text-ink-2 bg-surface-warm' },
  { type: 'faq_knowledge',           label: 'FAQ Knowledge',           desc: 'Q&A pairs for AI to cite',                                        icon: HelpCircle, color: 'text-caution bg-caution-bg'  },
  { type: 'data_authority',          label: 'Data & Authority',        desc: 'Key metrics, certifications, case studies',                       icon: BarChart3,  color: 'text-sage bg-sage-bg'  },
  { type: 'competitive_positioning', label: 'Competitive Positioning', desc: 'Differentiators vs competitors',                                  icon: Swords,     color: 'text-red-soft bg-red-soft-bg'      },
  { type: 'content_summaries',       label: 'Content Summaries',       desc: 'TL;DR for each key page',                                         icon: FileText,   color: 'text-ink-2 bg-surface-warm' },
  { type: 'html_enhancement',        label: 'HTML Enhancement',        desc: 'Alt-text & content injection rules',                              icon: Code2,      color: 'text-ink-2 bg-surface-warm' },
  // Phase 1 V2 — optional protocol modules (auto-derived from above data when empty)
  { type: 'agent_skills',            label: 'Agent Skills (D1-09)',    desc: 'V2 structured skills — auto-derived from FAQ & Products if empty', icon: Brain,      color: 'text-ink-2 bg-surface-warm', optional: true },
  { type: 'mcp_capabilities',        label: 'MCP Capabilities (D1-08)',desc: 'MCP server tools & resources — auto-derived if empty',            icon: Server,     color: 'text-ink-2 bg-surface-warm', optional: true },
]

// ── Default templates (must cover all ModuleType values) ──────────────────────
export const DEFAULTS: Record<ModuleType, unknown> = {
  brand_identity: {
    brand_name: '',
    one_sentence_definition: '',
    short_description: '',
    founding_year: null,
    headquarters: '',
    company_size: '',
    industry: '',
    key_differentiators: [],
    brand_voice: '',
    website_url: '',
    contact_email: '',
    social_links: {},
  },
  products_services: [],
  faq_knowledge: [],
  data_authority: {
    key_metrics: [],
    certifications: [],
    awards: [],
    case_studies: [],
    testimonials: [],
  },
  competitive_positioning: {
    competitors: [],
    differentiators: [],
    designed_for: '',
    not_designed_for: '',
    market_position: '',
  },
  content_summaries: [],
  ai_discovery_files: {},
  technical_config: {
    strip_noindex: true,
    bypass_paywall: false,
    inject_canonical: true,
    prerender_csr: false,
    robots_allow_all_ai: true,
    custom_robots_rules: '',
    date_modified_auto: true,
  },
  html_enhancement: {
    h1_overrides: {},
    alt_text_mappings: {},
    inject_lists: [],
  },
  // Phase 1 V2 defaults (optional — leave empty to let Worker auto-derive)
  agent_skills: [],
  mcp_capabilities: {
    tools: [],
    resources: [],
    prompts: [],
  },
}

// ── JSON editor ───────────────────────────────────────────────────────────────
export function JsonEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const [error, setError] = useState<string | null>(null)
  return (
    <div>
      <textarea
        value={value}
        onChange={e => {
          onChange(e.target.value)
          try { JSON.parse(e.target.value); setError(null) } catch { setError('Invalid JSON') }
        }}
        rows={12}
        placeholder={placeholder}
        className="w-full px-4 py-3 bg-ink text-green-400 font-mono text-xs rounded-xl border border-white/10 focus:outline-none focus:border-white/30 resize-y"
      />
      {error && <p className="text-xs text-red-soft mt-1">{error}</p>}
    </div>
  )
}

// ── FAQ editor ────────────────────────────────────────────────────────────────
export interface FaqItem { question: string; answer: string }

export function FaqEditor({ items, onChange }: { items: FaqItem[]; onChange: (items: FaqItem[]) => void }) {
  const add = () => onChange([...items, { question: '', answer: '' }])
  const remove = (i: number) => onChange(items.filter((_, j) => j !== i))
  const update = (i: number, field: keyof FaqItem, value: string) => {
    const next = [...items]
    next[i] = { ...next[i], [field]: value }
    onChange(next)
  }
  return (
    <div className="space-y-3">
      {items.map((faq, i) => (
        <div key={i} className="bg-surface-warm border border-divider-light rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-ink-3">Q&A #{i + 1}</span>
            <button onClick={() => remove(i)} className="text-ink-3 hover:text-red-soft transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <input
            value={faq.question}
            onChange={e => update(i, 'question', e.target.value)}
            placeholder="Question"
            className="w-full px-3 py-2 bg-surface border border-divider-light rounded-lg text-sm text-ink focus:outline-none focus:border-ink"
          />
          <textarea
            value={faq.answer}
            onChange={e => update(i, 'answer', e.target.value)}
            placeholder="Answer"
            rows={3}
            className="w-full px-3 py-2 bg-surface border border-divider-light rounded-lg text-sm text-ink focus:outline-none focus:border-ink resize-none"
          />
        </div>
      ))}
      <button
        onClick={add}
        className="flex items-center gap-2 text-sm text-red-soft hover:text-red-soft font-medium transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add Q&A
      </button>
    </div>
  )
}

// ── Brand identity form ───────────────────────────────────────────────────────
export function BrandIdentityForm({
  data,
  onChange,
}: {
  data: Record<string, unknown>
  onChange: (d: Record<string, unknown>) => void
}) {
  const set = (k: string, v: unknown) => onChange({ ...data, [k]: v })
  const str = (k: string) => String(data[k] ?? '')
  const arr = (k: string): string[] => {
    const v = data[k]
    return Array.isArray(v) ? v.map(String) : []
  }
  const setArr = (k: string, raw: string) => set(k, raw.split('\n').map(s => s.trim()).filter(Boolean))

  return (
    <div className="space-y-4">
      {[
        { key: 'brand_name',             label: 'Brand Name',             placeholder: 'Acme Corp' },
        { key: 'one_sentence_definition', label: 'One-Sentence Definition', placeholder: 'Acme helps mid-market companies automate supply chain operations.' },
        { key: 'industry',               label: 'Industry',               placeholder: 'B2B SaaS / Supply Chain' },
        { key: 'headquarters',           label: 'Headquarters',           placeholder: 'San Francisco, CA' },
        { key: 'company_size',           label: 'Company Size',           placeholder: '50-200' },
        { key: 'website_url',            label: 'Website URL',            placeholder: 'https://acme.com' },
        { key: 'contact_email',          label: 'Contact Email',          placeholder: 'contact@acme.com' },
        { key: 'brand_voice',            label: 'Brand Voice',            placeholder: 'Professional, data-driven, approachable' },
      ].map(f => (
        <div key={f.key}>
          <label className="text-xs font-semibold text-ink-2 mb-1 block">{f.label}</label>
          <input
            value={str(f.key)}
            onChange={e => set(f.key, e.target.value)}
            placeholder={f.placeholder}
            className="w-full px-3 py-2 bg-surface-warm border border-divider-light rounded-lg text-sm text-ink focus:outline-none focus:border-ink"
          />
        </div>
      ))}
      <div>
        <label className="text-xs font-semibold text-ink-2 mb-1 block">Short Description</label>
        <textarea
          value={str('short_description')}
          onChange={e => set('short_description', e.target.value)}
          placeholder="2–3 sentence brand description..."
          rows={3}
          className="w-full px-3 py-2 bg-surface-warm border border-divider-light rounded-lg text-sm text-ink focus:outline-none focus:border-ink resize-none"
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-ink-2 mb-1 block">
          Key Differentiators <span className="text-ink-3 font-normal">(one per line)</span>
        </label>
        <textarea
          value={arr('key_differentiators').join('\n')}
          onChange={e => setArr('key_differentiators', e.target.value)}
          rows={4}
          placeholder="First-mover GEO platform&#10;Real-time AI visit analytics&#10;Works with any website stack"
          className="w-full px-3 py-2 bg-surface-warm border border-divider-light rounded-lg text-sm text-ink focus:outline-none focus:border-ink resize-none"
        />
      </div>
    </div>
  )
}

// ── Agent Skills editor (D1-09) ───────────────────────────────────────────────
export interface AgentSkillItem { id: string; name: string; description: string; examples: string }

export function AgentSkillsEditor({
  items,
  onChange,
}: {
  items: AgentSkillItem[]
  onChange: (items: AgentSkillItem[]) => void
}) {
  const add = () => onChange([...items, { id: '', name: '', description: '', examples: '' }])
  const remove = (i: number) => onChange(items.filter((_, j) => j !== i))
  const update = (i: number, field: keyof AgentSkillItem, value: string) => {
    const next = [...items]
    next[i] = { ...next[i], [field]: value }
    onChange(next)
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-3">
        V2 structured skills for <code className="font-mono">agent.json</code>. Leave empty to auto-derive from FAQ &amp; Products data.
        Each skill needs an ID, name, description, and optional examples.
      </p>
      {items.map((skill, i) => (
        <div key={i} className="bg-surface-warm border border-divider-light rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-ink-3">Skill #{i + 1}</span>
            <button onClick={() => remove(i)} className="text-ink-3 hover:text-red-soft transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-semibold text-ink-3 mb-0.5 block">Skill ID</label>
              <input
                value={skill.id}
                onChange={e => update(i, 'id', e.target.value)}
                placeholder="faq-answering"
                className="w-full px-3 py-1.5 bg-surface border border-divider-light rounded-lg text-xs font-mono text-ink focus:outline-none focus:border-ink"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-ink-3 mb-0.5 block">Name</label>
              <input
                value={skill.name}
                onChange={e => update(i, 'name', e.target.value)}
                placeholder="FAQ Answering"
                className="w-full px-3 py-1.5 bg-surface border border-divider-light rounded-lg text-xs text-ink focus:outline-none focus:border-ink"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-ink-3 mb-0.5 block">Description</label>
            <textarea
              value={skill.description}
              onChange={e => update(i, 'description', e.target.value)}
              placeholder="Answers frequently asked questions about products and pricing."
              rows={2}
              className="w-full px-3 py-1.5 bg-surface border border-divider-light rounded-lg text-xs text-ink focus:outline-none focus:border-ink resize-none"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-ink-3 mb-0.5 block">
              Examples <span className="font-normal text-ink-3">(one per line)</span>
            </label>
            <textarea
              value={skill.examples}
              onChange={e => update(i, 'examples', e.target.value)}
              placeholder={"What is your pricing?\nDo you offer a free trial?"}
              rows={2}
              className="w-full px-3 py-1.5 bg-surface border border-divider-light rounded-lg text-xs text-ink focus:outline-none focus:border-ink resize-none"
            />
          </div>
        </div>
      ))}
      <button
        onClick={add}
        className="flex items-center gap-2 text-sm text-red-soft font-medium transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add Skill
      </button>
    </div>
  )
}

// Helper: convert AgentSkillItem[] (with examples as string) → API format
function skillsToApi(items: AgentSkillItem[]): Record<string, unknown>[] {
  return items.map(s => ({
    id: s.id,
    name: s.name,
    description: s.description,
    examples: s.examples.split('\n').map(e => e.trim()).filter(Boolean),
  }))
}

// Helper: convert API format → AgentSkillItem[] (examples as string)
export function skillsFromApi(raw: unknown): AgentSkillItem[] {
  if (!Array.isArray(raw)) return []
  return raw.map((s: Record<string, unknown>) => ({
    id: String(s.id ?? ''),
    name: String(s.name ?? ''),
    description: String(s.description ?? ''),
    examples: Array.isArray(s.examples) ? (s.examples as string[]).join('\n') : '',
  }))
}

// ── Technical config form ─────────────────────────────────────────────────────
export function TechnicalConfigForm({
  data,
  onChange,
}: {
  data: Record<string, unknown>
  onChange: (d: Record<string, unknown>) => void
}) {
  const bool = (k: string) => Boolean(data[k])
  const toggle = (k: string) => onChange({ ...data, [k]: !bool(k) })

  const toggles: { key: string; label: string; desc: string }[] = [
    { key: 'strip_noindex',      label: 'Strip noindex for AI',         desc: 'Remove noindex meta tags when AI bots visit' },
    { key: 'inject_canonical',   label: 'Inject Canonical Tag',         desc: 'Add <link rel=canonical> pointing to your domain' },
    { key: 'robots_allow_all_ai', label: 'Allow All AI Bots in robots.txt', desc: 'Generate AI-friendly robots.txt allowing 23+ known bots' },
    { key: 'bypass_paywall',     label: 'Bypass Paywall for AI',        desc: 'Serve full content to AI bots (requires written authorization)' },
    { key: 'prerender_csr',      label: 'Pre-render CSR Pages',         desc: 'Serve server-side rendered HTML to AI crawlers' },
    { key: 'date_modified_auto', label: 'Auto-inject dateModified',     desc: 'Inject current timestamp as JSON-LD dateModified' },
  ]

  return (
    <div className="space-y-3">
      {toggles.map(t => (
        <div key={t.key} className="flex items-center justify-between p-3 bg-surface-warm border border-divider-light rounded-xl">
          <div>
            <div className="text-sm font-medium text-ink">{t.label}</div>
            <div className="text-xs text-ink-3 mt-0.5">{t.desc}</div>
          </div>
          <button
            onClick={() => toggle(t.key)}
            className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${bool(t.key) ? 'bg-ink' : 'bg-surface-muted'}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 bg-surface rounded-full shadow transition-transform ${bool(t.key) ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
      ))}
      <div>
        <label className="text-xs font-semibold text-ink-2 mb-1 block">Custom robots.txt Rules</label>
        <textarea
          value={String(data.custom_robots_rules ?? '')}
          onChange={e => onChange({ ...data, custom_robots_rules: e.target.value })}
          placeholder="# Additional robots.txt rules&#10;User-agent: *&#10;Disallow: /private/"
          rows={4}
          className="w-full px-3 py-2 bg-surface-warm border border-divider-light rounded-lg text-sm font-mono text-ink focus:outline-none focus:border-ink resize-none"
        />
      </div>
    </div>
  )
}

// ── Module Panel ──────────────────────────────────────────────────────────────
export function ModulePanel({
  type,
  label,
  desc,
  icon: Icon,
  color,
  optional,
  initialContent,
  onSave,
  isSaving,
  saved,
}: {
  type: ModuleType
  label: string
  desc: string
  icon: React.ElementType
  color: string
  optional?: boolean
  initialContent: unknown
  onSave: (content: unknown) => Promise<void>
  isSaving: boolean
  saved: boolean
}) {
  const [open, setOpen] = useState(false)
  const [localData, setLocalData] = useState<unknown>(initialContent ?? DEFAULTS[type])
  const [jsonText, setJsonText] = useState(() => JSON.stringify(localData, null, 2))
  const [jsonValid, setJsonValid] = useState(true)
  // Agent skills: maintain human-friendly form state separately
  const [skillItems, setSkillItems] = useState<AgentSkillItem[]>(() =>
    skillsFromApi(initialContent)
  )
  const initialized = useRef(false)

  // Sync when server data first arrives
  useEffect(() => {
    if (!initialized.current && initialContent !== null) {
      initialized.current = true
      setLocalData(initialContent)
      setJsonText(JSON.stringify(initialContent, null, 2))
      if (type === 'agent_skills') {
        setSkillItems(skillsFromApi(initialContent))
      }
    }
  }, [initialContent, type])

  const handleJsonChange = (raw: string) => {
    setJsonText(raw)
    try {
      setLocalData(JSON.parse(raw))
      setJsonValid(true)
    } catch {
      setJsonValid(false)
    }
  }

  const handleSave = async () => {
    if (type === 'agent_skills') {
      // Convert form state → API format before saving
      const apiFormat = skillsToApi(skillItems)
      try {
        await onSave(apiFormat)
        setOpen(false)
      } catch { /* error shown in parent */ }
      return
    }
    if (!jsonValid) return
    try {
      await onSave(localData)
      setOpen(false) // collapse immediately on success
    } catch {
      // error shown in parent error banner; keep panel open so user can retry
    }
  }

  const isFaqModule      = type === 'faq_knowledge'
  const isProductsMod    = type === 'products_services'
  const isSummaryMod     = type === 'content_summaries'
  const isBrandMod       = type === 'brand_identity'
  const isTechMod        = type === 'technical_config'
  const isAgentSkillsMod = type === 'agent_skills'
  const isMcpMod         = type === 'mcp_capabilities'
  const useFormEditor    = isBrandMod || isFaqModule || isTechMod || isAgentSkillsMod

  const isConfigured = initialContent !== null

  return (
    <div id={type} className="bg-surface border border-divider-light rounded-2xl overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-warm transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-ink">{label}</div>
            <div className="text-xs text-ink-3">{desc}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {optional && !isConfigured && (
            <span className="text-[10px] px-1.5 py-0.5 bg-surface-muted text-ink-3 rounded-full">Optional</span>
          )}
          {saved
            ? <span className="text-xs px-2 py-0.5 bg-sage-bg text-sage rounded-full font-medium flex items-center gap-1"><CheckCircle className="w-3 h-3" />Saved</span>
            : isConfigured
              ? <span className="text-xs px-2 py-0.5 bg-sage-bg text-sage rounded-full font-medium">Configured</span>
              : <span className="text-xs px-2 py-0.5 bg-surface-muted text-ink-3 rounded-full">Empty</span>
          }
          {open
            ? <ChevronDown className="w-4 h-4 text-ink-3" />
            : <ChevronRight className="w-4 h-4 text-ink-3" />
          }
        </div>
      </button>

      {/* Expanded body */}
      {open && (
        <div className="border-t border-divider-light p-5 space-y-4">
          {isFaqModule && (
            <FaqEditor
              items={Array.isArray(localData) ? (localData as FaqItem[]) : []}
              onChange={items => { setLocalData(items); setJsonText(JSON.stringify(items, null, 2)); setJsonValid(true) }}
            />
          )}
          {isBrandMod && (
            <BrandIdentityForm
              data={typeof localData === 'object' && !Array.isArray(localData) ? (localData as Record<string, unknown>) : {}}
              onChange={d => { setLocalData(d); setJsonText(JSON.stringify(d, null, 2)); setJsonValid(true) }}
            />
          )}
          {isTechMod && (
            <TechnicalConfigForm
              data={typeof localData === 'object' && !Array.isArray(localData) ? (localData as Record<string, unknown>) : {}}
              onChange={d => { setLocalData(d); setJsonText(JSON.stringify(d, null, 2)); setJsonValid(true) }}
            />
          )}
          {isAgentSkillsMod && (
            <AgentSkillsEditor
              items={skillItems}
              onChange={setSkillItems}
            />
          )}
          {isMcpMod && (
            <div className="space-y-3">
              <p className="text-xs text-ink-3">
                MCP Server capabilities. Leave empty to auto-derive from brand data.
                Configure <code className="font-mono text-[10px]">tools[]</code>, <code className="font-mono text-[10px]">resources[]</code>, and <code className="font-mono text-[10px]">prompts[]</code>.
              </p>
              <JsonEditor value={jsonText} onChange={handleJsonChange} />
            </div>
          )}
          {(isProductsMod || isSummaryMod) && (
            <div className="space-y-3">
              <p className="text-xs text-ink-3">
                {isProductsMod
                  ? 'Array of product objects: name, description, key_features[], pricing (optional).'
                  : 'Array of page summaries: page_url, title, summary.'}
              </p>
              <JsonEditor value={jsonText} onChange={handleJsonChange} />
            </div>
          )}
          {!useFormEditor && !isProductsMod && !isSummaryMod && !isMcpMod && (
            <JsonEditor value={jsonText} onChange={handleJsonChange} />
          )}
          {useFormEditor && !isTechMod && (
            <details className="text-xs">
              <summary className="text-ink-3 cursor-pointer hover:text-ink-2">View raw JSON</summary>
              <pre className="mt-2 p-3 bg-ink text-green-400 rounded-lg overflow-auto text-xs">{jsonText}</pre>
            </details>
          )}

          {/* Save row */}
          <div className="flex items-center justify-end gap-2 pt-2">
            {!jsonValid && (
              <span className="text-xs text-red-soft flex items-center gap-1 mr-auto">
                <AlertCircle className="w-3 h-3" /> Invalid JSON
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving || !jsonValid}
              className="flex items-center gap-1.5 px-4 py-2 bg-ink hover:bg-[#2d2d2c] disabled:opacity-50 text-ink-inv text-xs font-semibold rounded-xl transition-colors"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {isSaving ? 'Saving...' : 'Save Module'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
