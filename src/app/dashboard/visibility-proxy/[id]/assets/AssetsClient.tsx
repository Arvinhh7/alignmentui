'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { proxyApi, ModuleType } from '@/lib/api'
import {
  ArrowLeft, Layers, Save, Loader2, CheckCircle, AlertCircle,
  ChevronDown, ChevronRight, Zap, Globe, Building2, Package,
  HelpCircle, BarChart3, Swords, FileText, Bot, Wrench, Code2,
  Plus, Trash2,
} from 'lucide-react'

// ── Module metadata ───────────────────────────────────────────────────────────
const MODULES: { type: ModuleType; label: string; desc: string; icon: React.ElementType; color: string }[] = [
  { type: 'brand_identity',         label: 'Brand Identity',          desc: 'Core brand info — who you are, what you do', icon: Building2, color: 'text-blue-500 bg-blue-50' },
  { type: 'products_services',      label: 'Products & Services',     desc: 'Product catalog, features, pricing',         icon: Package,   color: 'text-purple-500 bg-purple-50' },
  { type: 'faq_knowledge',          label: 'FAQ Knowledge',           desc: 'Q&A pairs for AI to cite',                   icon: HelpCircle, color: 'text-amber-500 bg-amber-50' },
  { type: 'data_authority',         label: 'Data & Authority',        desc: 'Key metrics, certifications, case studies',  icon: BarChart3,  color: 'text-green-500 bg-green-50' },
  { type: 'competitive_positioning', label: 'Competitive Positioning', desc: 'Differentiators vs competitors',             icon: Swords,    color: 'text-red-500 bg-red-50' },
  { type: 'content_summaries',      label: 'Content Summaries',       desc: 'TL;DR for each key page',                    icon: FileText,  color: 'text-indigo-500 bg-indigo-50' },
  { type: 'ai_discovery_files',     label: 'AI Discovery Files',      desc: 'Auto-compiled from modules 1–6',             icon: Bot,       color: 'text-cyan-500 bg-cyan-50' },
  { type: 'technical_config',       label: 'Technical Config',        desc: 'Proxy behavior flags',                       icon: Wrench,    color: 'text-gray-500 bg-gray-100' },
  { type: 'html_enhancement',       label: 'HTML Enhancement',        desc: 'Alt-text & content injection rules',         icon: Code2,     color: 'text-orange-500 bg-orange-50' },
]

// ── Default content templates ─────────────────────────────────────────────────
const DEFAULTS: Record<ModuleType, unknown> = {
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
}

// ── JSON editor helper ────────────────────────────────────────────────────────
function JsonEditor({
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
        className="w-full px-4 py-3 bg-gray-950 text-green-300 font-mono text-xs rounded-xl border border-gray-800 focus:outline-none focus:border-gray-600 resize-y"
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

// ── FAQ editor ────────────────────────────────────────────────────────────────
interface FaqItem { question: string; answer: string }

function FaqEditor({ items, onChange }: { items: FaqItem[]; onChange: (items: FaqItem[]) => void }) {
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
        <div key={i} className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Q&A #{i + 1}</span>
            <button onClick={() => remove(i)} className="text-gray-400 hover:text-red-500 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <input
            value={faq.question}
            onChange={e => update(i, 'question', e.target.value)}
            placeholder="Question"
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-red-400"
          />
          <textarea
            value={faq.answer}
            onChange={e => update(i, 'answer', e.target.value)}
            placeholder="Answer"
            rows={3}
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-red-400 resize-none"
          />
        </div>
      ))}
      <button
        onClick={add}
        className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 font-medium transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add Q&A
      </button>
    </div>
  )
}

// ── Brand identity form ───────────────────────────────────────────────────────
function BrandIdentityForm({
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
        { key: 'brand_name', label: 'Brand Name', placeholder: 'Acme Corp' },
        { key: 'one_sentence_definition', label: 'One-Sentence Definition', placeholder: 'Acme helps mid-market companies automate supply chain operations.' },
        { key: 'industry', label: 'Industry', placeholder: 'B2B SaaS / Supply Chain' },
        { key: 'headquarters', label: 'Headquarters', placeholder: 'San Francisco, CA' },
        { key: 'company_size', label: 'Company Size', placeholder: '50-200' },
        { key: 'website_url', label: 'Website URL', placeholder: 'https://acme.com' },
        { key: 'contact_email', label: 'Contact Email', placeholder: 'contact@acme.com' },
        { key: 'brand_voice', label: 'Brand Voice', placeholder: 'Professional, data-driven, approachable' },
      ].map(f => (
        <div key={f.key}>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">{f.label}</label>
          <input
            value={str(f.key)}
            onChange={e => set(f.key, e.target.value)}
            placeholder={f.placeholder}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-red-400"
          />
        </div>
      ))}
      <div>
        <label className="text-xs font-semibold text-gray-600 mb-1 block">
          Short Description
        </label>
        <textarea
          value={str('short_description')}
          onChange={e => set('short_description', e.target.value)}
          placeholder="2–3 sentence brand description..."
          rows={3}
          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-red-400 resize-none"
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-600 mb-1 block">
          Key Differentiators <span className="text-gray-400 font-normal">(one per line)</span>
        </label>
        <textarea
          value={arr('key_differentiators').join('\n')}
          onChange={e => setArr('key_differentiators', e.target.value)}
          placeholder="First-mover GEO platform&#10;Real-time AI visibility tracking&#10;Multi-engine monitoring"
          rows={4}
          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-red-400 resize-none"
        />
      </div>
    </div>
  )
}

// ── Technical config form ─────────────────────────────────────────────────────
function TechnicalConfigForm({
  data,
  onChange,
}: {
  data: Record<string, unknown>
  onChange: (d: Record<string, unknown>) => void
}) {
  const bool = (k: string) => Boolean(data[k])
  const toggle = (k: string) => onChange({ ...data, [k]: !bool(k) })

  const toggles: { key: string; label: string; desc: string }[] = [
    { key: 'strip_noindex', label: 'Strip noindex for AI', desc: 'Remove noindex meta tags when AI bots visit' },
    { key: 'inject_canonical', label: 'Inject Canonical Tag', desc: 'Add <link rel=canonical> pointing to your domain' },
    { key: 'robots_allow_all_ai', label: 'Allow All AI Bots in robots.txt', desc: 'Generate AI-friendly robots.txt allowing 23+ known bots' },
    { key: 'bypass_paywall', label: 'Bypass Paywall for AI', desc: 'Serve full content to AI bots (requires written authorization)' },
    { key: 'prerender_csr', label: 'Pre-render CSR Pages', desc: 'Serve server-side rendered HTML to AI crawlers' },
    { key: 'date_modified_auto', label: 'Auto-inject dateModified', desc: 'Inject current timestamp as JSON-LD dateModified' },
  ]

  return (
    <div className="space-y-3">
      {toggles.map(t => (
        <div
          key={t.key}
          className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl"
        >
          <div>
            <div className="text-sm font-medium text-gray-800">{t.label}</div>
            <div className="text-xs text-gray-400 mt-0.5">{t.desc}</div>
          </div>
          <button
            onClick={() => toggle(t.key)}
            className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${bool(t.key) ? 'bg-red-500' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${bool(t.key) ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
      ))}
      <div>
        <label className="text-xs font-semibold text-gray-600 mb-1 block">Custom robots.txt Rules</label>
        <textarea
          value={String(data.custom_robots_rules ?? '')}
          onChange={e => onChange({ ...data, custom_robots_rules: e.target.value })}
          placeholder="# Additional robots.txt rules&#10;User-agent: *&#10;Disallow: /private/"
          rows={4}
          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono text-gray-800 focus:outline-none focus:border-red-400 resize-none"
        />
      </div>
    </div>
  )
}

// ── Module Panel ──────────────────────────────────────────────────────────────
function ModulePanel({
  type,
  label,
  desc,
  icon: Icon,
  color,
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
  initialContent: unknown
  onSave: (content: unknown) => Promise<void>
  isSaving: boolean
  saved: boolean
}) {
  const [open, setOpen] = useState(false)
  const [localData, setLocalData] = useState<unknown>(initialContent ?? DEFAULTS[type])
  const [jsonText, setJsonText] = useState(() => JSON.stringify(localData, null, 2))
  const [jsonValid, setJsonValid] = useState(true)
  const initialized = useRef(false)

  // Sync when server data arrives
  useEffect(() => {
    if (!initialized.current && initialContent !== null) {
      initialized.current = true
      setLocalData(initialContent)
      setJsonText(JSON.stringify(initialContent, null, 2))
    }
  }, [initialContent])

  const handleJsonChange = (raw: string) => {
    setJsonText(raw)
    try {
      const parsed = JSON.parse(raw)
      setLocalData(parsed)
      setJsonValid(true)
    } catch {
      setJsonValid(false)
    }
  }

  const handleSave = () => {
    if (!jsonValid) return
    onSave(localData)
  }

  const isFaqModule = type === 'faq_knowledge'
  const isProductsModule = type === 'products_services'
  const isSummaryModule = type === 'content_summaries'
  const isBrandModule = type === 'brand_identity'
  const isTechModule = type === 'technical_config'

  const useFormEditor = isBrandModule || isFaqModule || isTechModule

  return (
    <div id={type} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-800">{label}</div>
            <div className="text-xs text-gray-400">{desc}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {initialContent !== null && (
            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">Saved</span>
          )}
          {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 p-5 space-y-4">
          {/* FAQ form editor */}
          {isFaqModule && (
            <FaqEditor
              items={Array.isArray(localData) ? (localData as FaqItem[]) : []}
              onChange={items => {
                setLocalData(items)
                setJsonText(JSON.stringify(items, null, 2))
                setJsonValid(true)
              }}
            />
          )}

          {/* Brand identity form */}
          {isBrandModule && (
            <BrandIdentityForm
              data={typeof localData === 'object' && !Array.isArray(localData) ? (localData as Record<string, unknown>) : {}}
              onChange={d => {
                setLocalData(d)
                setJsonText(JSON.stringify(d, null, 2))
                setJsonValid(true)
              }}
            />
          )}

          {/* Technical config toggles */}
          {isTechModule && (
            <TechnicalConfigForm
              data={typeof localData === 'object' && !Array.isArray(localData) ? (localData as Record<string, unknown>) : {}}
              onChange={d => {
                setLocalData(d)
                setJsonText(JSON.stringify(d, null, 2))
                setJsonValid(true)
              }}
            />
          )}

          {/* Products / summaries — show JSON editor with helper */}
          {(isProductsModule || isSummaryModule) && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                {isProductsModule
                  ? 'Enter an array of product objects with fields: name, description, key_features[], target_audience, pricing (optional).'
                  : 'Enter an array of page summary objects with fields: page_url, page_type, tldr, key_points[], related_pages[].'}
              </p>
              <JsonEditor value={jsonText} onChange={handleJsonChange} />
            </div>
          )}

          {/* Generic JSON editor for remaining modules */}
          {!useFormEditor && !isProductsModule && !isSummaryModule && (
            <JsonEditor value={jsonText} onChange={handleJsonChange} />
          )}

          {/* Raw JSON toggle for form-based editors */}
          {useFormEditor && !isTechModule && (
            <details className="text-xs">
              <summary className="text-gray-400 cursor-pointer hover:text-gray-600">View raw JSON</summary>
              <pre className="mt-2 p-3 bg-gray-950 text-green-300 rounded-lg overflow-auto text-xs">{jsonText}</pre>
            </details>
          )}

          <div className="flex items-center justify-between pt-2">
            {!jsonValid && (
              <span className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Invalid JSON
              </span>
            )}
            <div className="ml-auto flex items-center gap-2">
              {saved && <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" />Saved</span>}
              <button
                onClick={handleSave}
                disabled={isSaving || !jsonValid}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {isSaving ? 'Saving...' : 'Save Module'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AssetsClient() {
  const params = useParams()
  const domainId = params.id as string
  const { user } = useAuth()

  const [assets, setAssets] = useState<Record<string, unknown>>({})
  const [loadingAssets, setLoadingAssets] = useState(true)
  const [savingModule, setSavingModule] = useState<ModuleType | null>(null)
  const [savedModules, setSavedModules] = useState<Set<ModuleType>>(new Set())
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)

  const loadAssets = useCallback(async () => {
    if (!user?.id) return
    setLoadingAssets(true)
    try {
      const data = await proxyApi.getAssets(domainId, user.id)
      setAssets(data.assets as Record<string, unknown>)
    } catch { /* empty state ok */ }
    finally { setLoadingAssets(false) }
  }, [domainId, user?.id])

  useEffect(() => { loadAssets() }, [loadAssets])

  const saveModule = async (type: ModuleType, content: unknown) => {
    if (!user?.id) return
    setSavingModule(type)
    setGlobalError(null)
    try {
      await proxyApi.updateAsset(domainId, type, content as Record<string, unknown>, user.id)
      setSavedModules(prev => new Set(prev).add(type))
      setAssets(prev => ({ ...prev, [type]: content }))
      setTimeout(() => setSavedModules(prev => { const s = new Set(prev); s.delete(type); return s }), 3000)
    } catch (e) {
      setGlobalError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSavingModule(null)
    }
  }

  const syncAll = async () => {
    if (!user?.id) return
    setSyncing(true)
    setSyncMsg(null)
    try {
      const result = await proxyApi.sync(domainId, user.id)
      setSyncMsg(result.message)
    } catch (e) {
      setSyncMsg(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  if (loadingAssets) return (
    <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/dashboard/visibility-proxy/${domainId}`} className="text-gray-400 hover:text-gray-600 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <Layers className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Brand Data Modules</h1>
              <p className="text-sm text-gray-400">Edit the 9 modules that AI uses to understand your brand</p>
            </div>
          </div>
          <button
            onClick={syncAll}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {syncing ? 'Syncing...' : 'Sync to Edge'}
          </button>
        </div>
      </div>

      <div className="p-6 max-w-3xl mx-auto space-y-4">
        {globalError && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span className="text-sm text-red-700">{globalError}</span>
          </div>
        )}

        {syncMsg && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            <span className="text-sm text-green-700">{syncMsg}</span>
          </div>
        )}

        {/* Progress bar */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500">Modules configured</span>
            <span className="text-xs font-bold text-gray-700">
              {Object.keys(assets).length} / {MODULES.length}
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-500 to-orange-400 rounded-full transition-all"
              style={{ width: `${(Object.keys(assets).length / MODULES.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Module panels */}
        {MODULES.map(m => (
          <ModulePanel
            key={m.type}
            {...m}
            initialContent={assets[m.type] ?? null}
            onSave={content => saveModule(m.type, content)}
            isSaving={savingModule === m.type}
            saved={savedModules.has(m.type)}
          />
        ))}

        {/* Sync reminder */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
          <Globe className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <div className="font-semibold mb-0.5">Remember to sync after saving</div>
            <div className="text-amber-700 text-xs">
              Click <strong>Sync to Edge</strong> to push saved data to the Cloudflare edge network. Changes take effect within ~60 seconds.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
