'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Header from '@/components/Header'
import { useLanguage } from '@/lib/LanguageContext'
import { useAuth } from '@/hooks/useAuth'
import { api, ContentGenerateResult, ContentValidateResult, ContentTemplate, notifyCreditUsed } from '@/lib/api'
import {
  FileText, Sparkles, Copy, Download, RefreshCw,
  CheckCircle, XCircle, Globe, BookOpen, HelpCircle, ListChecks,
  Layers, Star, Clock, Wand2, Shield, Link2, Search,
  MessageSquare, Briefcase, FileCode, Loader2, StopCircle,
  AlertTriangle, ChevronDown, ChevronRight, Edit3, Settings,
  Eye, RotateCcw, Filter, X, Plus, Trash2, Save,
} from 'lucide-react'

// ─── Content Types (match wireframe descriptions) ───────
const CONTENT_TYPES = [
  { key: 'definition', label: 'Definition', desc: 'For explaining a concept so AI builds a stable understanding.' },
  { key: 'comparison_ranking', label: 'Comparison / Ranking', desc: 'For helping users make a choice (Best / VS / Top).' },
  { key: 'how_to', label: 'How-to', desc: 'For guiding someone step-by-step.' },
  { key: 'faq', label: 'FAQ', desc: 'For answering specific questions (Yes / No / It depends).' },
  { key: 'evaluation_risk', label: 'Evaluation & Risk', desc: 'For explaining risks, limitations, who it\'s not for.' },
  { key: 'use_case_mapping', label: 'Use-case Mapping', desc: 'For illustrating product or service applications.' },
  { key: 'reference_source', label: 'Reference / Source', desc: 'For official, document, policy, research content.' },
]

// ─── Output Channels (match wireframe descriptions) ─────
const OUTPUT_CHANNELS = [
  { key: 'reddit_community', label: 'Reddit / Community', desc: 'Neutral, non-promotional Q&A-friendly', icon: <MessageSquare className="w-4 h-4" /> },
  { key: 'linkedin_professional', label: 'LinkedIn / Professional', desc: 'Insight-driven, MIQ positioning allowed, Opinion + facts', icon: <Briefcase className="w-4 h-4" /> },
  { key: 'official_website', label: 'Official Website', desc: 'Canonical facts, Stable definitions', icon: <Globe className="w-4 h-4" /> },
  { key: 'blog_content_site', label: 'Blog / Content Site', desc: 'SEO + GEO balanced, Structured sections', icon: <FileText className="w-4 h-4" /> },
  { key: 'docs_help_center', label: 'Docs / Help Center', desc: 'Technical, precise, reference-friendly', icon: <FileCode className="w-4 h-4" /> },
]

const PLATFORMS = [
  { key: 'chatgpt', name: 'ChatGPT', color: 'bg-sage-bg' },
  { key: 'perplexity', name: 'Perplexity', color: 'bg-surface-muted' },
  { key: 'gemini', name: 'Gemini', color: 'bg-ink/40' },
  { key: 'grok', name: 'Grok', color: 'bg-ink/70' },
]

// ─── Tab Types ──────────────────────────────────────────
type Tab = 'generate' | 'validate' | 'history' | 'admin'

// ─── Suspense wrapper ───────────────────────────────────
export default function GEOContentPage() {
  return (
    <Suspense fallback={null}>
      <GEOContentPageInner />
    </Suspense>
  )
}

// ─── Main Page ──────────────────────────────────────────
function GEOContentPageInner() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const searchParams = useSearchParams()

  // ─── Tab state ────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<Tab>('generate')

  // ─── Generate state ───────────────────────────────────
  const [selectedType, setSelectedType] = useState('faq')
  const [selectedChannel, setSelectedChannel] = useState('official_website')
  const [brandName, setBrandName] = useState('')
  const [productName, setProductName] = useState('')
  const [topic, setTopic] = useState('')
  const [forbiddenClaims, setForbiddenClaims] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['chatgpt'])
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState<ContentGenerateResult | null>(null)
  const [genError, setGenError] = useState('')
  const genAbortRef = useRef<AbortController | null>(null)
  const [editingPrompt, setEditingPrompt] = useState(false)
  const [editedPrompt, setEditedPrompt] = useState('')

  // ─── Validate state ───────────────────────────────────
  const [valContentType, setValContentType] = useState('faq')
  const [valArticle, setValArticle] = useState('')
  const [validating, setValidating] = useState(false)
  const [valResult, setValResult] = useState<ContentValidateResult | null>(null)
  const [valExpandedModules, setValExpandedModules] = useState<string[]>(['Structural Contract', 'Risk Boundary', 'GEO Compliance'])

  // ─── History state ────────────────────────────────────
  const [history, setHistory] = useState<ContentGenerateResult[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [histFilterType, setHistFilterType] = useState('all')
  const [histFilterChannel, setHistFilterChannel] = useState('all')
  const [histSelectedIds, setHistSelectedIds] = useState<Set<string>>(new Set())
  const [viewOutputItem, setViewOutputItem] = useState<ContentGenerateResult | null>(null)

  // ─── Admin state ───────────────────────────────────
  const [adminTemplates, setAdminTemplates] = useState<ContentTemplate[]>([])
  const [adminSelectedType, setAdminSelectedType] = useState('definition')
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminExpandedSections, setAdminExpandedSections] = useState<string[]>(['structural', 'risk', 'geo'])
  const [adminEditing, setAdminEditing] = useState<ContentTemplate | null>(null)
  const [adminSaving, setAdminSaving] = useState(false)
  const [adminDirty, setAdminDirty] = useState(false)

  // ─── Restore session from localStorage on mount ───────
  useEffect(() => {
    // URL params take priority (cross-module navigation)
    const typeParam = searchParams.get('type')
    if (typeParam && CONTENT_TYPES.some(c => c.key === typeParam)) {
      setSelectedType(typeParam)
    }
    // Restore previous generate session
    try {
      const saved = localStorage.getItem('geo_content_session')
      if (saved) {
        const s = JSON.parse(saved)
        if (s.selectedType && !typeParam) setSelectedType(s.selectedType)
        if (s.selectedChannel) setSelectedChannel(s.selectedChannel)
        if (s.brandName) setBrandName(s.brandName)
        if (s.productName) setProductName(s.productName)
        if (s.topic) setTopic(s.topic)
        if (s.forbiddenClaims) setForbiddenClaims(s.forbiddenClaims)
        if (s.generated) setGenerated(s.generated)
      }
    } catch {}
    // Restore validator session
    try {
      const saved = localStorage.getItem('geo_content_validator_session')
      if (saved) {
        const s = JSON.parse(saved)
        if (s.valContentType) setValContentType(s.valContentType)
        if (s.valArticle) setValArticle(s.valArticle)
        if (s.valResult) setValResult(s.valResult)
      }
    } catch {}
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Persist generate session to localStorage ────────
  useEffect(() => {
    try {
      localStorage.setItem('geo_content_session', JSON.stringify({
        selectedType, selectedChannel, brandName, productName, topic, forbiddenClaims, generated,
      }))
    } catch {}
  }, [selectedType, selectedChannel, brandName, productName, topic, forbiddenClaims, generated])

  // ─── Persist validator session to localStorage ───────
  useEffect(() => {
    if (valArticle || valResult) {
      try {
        localStorage.setItem('geo_content_validator_session', JSON.stringify({
          valContentType, valArticle, valResult,
        }))
      } catch {}
    }
  }, [valContentType, valArticle, valResult])

  // ─── Load history / templates on tab switch ──────────
  useEffect(() => {
    if (activeTab === 'history') loadHistory()
    if (activeTab === 'admin') loadTemplates()
  }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadHistory = async () => {
    setHistoryLoading(true)
    const res = await api.getContentHistory()
    if (res.data) setHistory(res.data)
    setHistoryLoading(false)
  }

  const loadTemplates = async () => {
    setAdminLoading(true)
    const res = await api.getContentTemplates()
    if (res.data) setAdminTemplates(res.data)
    setAdminLoading(false)
  }

  // ─── Filtered history ──────────────────────────────
  const filteredHistory = history.filter(item => {
    if (histFilterType !== 'all' && item.content_type !== histFilterType) return false
    if (histFilterChannel !== 'all' && item.output_channel !== histFilterChannel) return false
    return true
  })

  // ─── Reuse Structure handler ───────────────────────
  const handleReuseStructure = (item: ContentGenerateResult) => {
    setSelectedType(item.content_type)
    setSelectedChannel(item.output_channel)
    setBrandName('')
    setProductName('')
    setTopic('')
    setGenerated(null)
    setGenError('')
    setActiveTab('generate')
  }

  // ─── History checkbox toggle ───────────────────────
  const toggleHistorySelect = (id: string) => {
    setHistSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  const toggleAllHistory = () => {
    if (histSelectedIds.size === filteredHistory.length) {
      setHistSelectedIds(new Set())
    } else {
      setHistSelectedIds(new Set(filteredHistory.map(h => h.id)))
    }
  }

  // ─── Generate ─────────────────────────────────────────
  const handleGenerate = async () => {
    if (!brandName.trim() || !topic.trim()) return
    genAbortRef.current?.abort()
    const ctrl = new AbortController()
    genAbortRef.current = ctrl
    setGenerating(true)
    setGenError('')
    setGenerated(null)
    const fullBrand = productName.trim()
      ? `${brandName.trim()} — ${productName.trim()}`
      : brandName.trim()
    try {
      const res = await api.generateContent({
        brand_name: fullBrand,
        topic: topic.trim(),
        content_type: selectedType,
        output_channel: selectedChannel,
        target_platforms: selectedPlatforms,
        forbidden_claims: forbiddenClaims,
        extra_instructions: '',
      }, ctrl.signal, user?.id)
      if (res.error && res.error !== '__ABORTED__') setGenError(res.error)
      if (res.data) { setGenerated(res.data); notifyCreditUsed() }
    } catch (e: any) {
      if (e.name !== 'AbortError') setGenError(e.message || 'Generation failed')
    }
    setGenerating(false)
    genAbortRef.current = null
  }

  const handleStopGenerate = () => {
    genAbortRef.current?.abort()
    genAbortRef.current = null
    setGenerating(false)
  }

  // ─── Copy / Download ─────────────────────────────────
  const handleCopy = () => {
    if (!generated) return
    navigator.clipboard.writeText(generated.main_content_md)
  }

  const handleDownload = () => {
    if (!generated) return
    const blob = new Blob([generated.main_content_md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${generated.brand_name.replace(/\s+/g, '-')}-${generated.content_type}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // ─── Validate ─────────────────────────────────────────
  const handleValidate = async () => {
    if (!valArticle.trim()) return
    setValidating(true)
    setValResult(null)
    try {
      const res = await api.validateContent({ content_type: valContentType, article_content: valArticle }, user?.id)
      if (res.data) { setValResult(res.data); notifyCreditUsed() }
    } catch {}
    setValidating(false)
  }

  const togglePlatform = (key: string) => setSelectedPlatforms(prev => prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key])

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'generate', label: 'Generate', icon: <Wand2 className="w-4 h-4" /> },
    { key: 'validate', label: 'Validator', icon: <Shield className="w-4 h-4" /> },
    { key: 'history', label: 'History', icon: <Clock className="w-4 h-4" /> },
    { key: 'admin', label: 'Admin', icon: <Settings className="w-4 h-4" /> },
  ]

  return (
    <div className="min-h-screen bg-canvas">
      <Header title={t.dashboard.geoContent} subtitle={t.dashboard.geoContentDesc} />

      <div className="p-6 space-y-6">
        {/* Tab Bar */}
        <div className="flex items-center gap-1 bg-surface rounded-xl border border-divider-light p-1 w-fit">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.key ? 'bg-ink text-ink-inv shadow-sm' : 'text-ink-2 hover:bg-surface-muted'}`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════ */}
        {/* TAB: Generate  (3-column wireframe layout)         */}
        {/* ═══════════════════════════════════════════════════ */}
        {activeTab === 'generate' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* ╔═══ LEFT COLUMN: Output Channel (2 cols) ═══╗ */}
            <div className="lg:col-span-2">
              <div className="bg-surface rounded-xl border border-divider-light p-4">
                <h3 className="text-xs font-semibold text-ink-3 uppercase tracking-wider mb-3">Output Channel <span className="text-red-soft">*</span></h3>
                <div className="space-y-2">
                  {OUTPUT_CHANNELS.map(ch => (
                    <label key={ch.key}
                      className={`flex items-start gap-2.5 p-3 rounded-lg cursor-pointer border transition-all ${selectedChannel === ch.key ? 'border-divider bg-surface-warm' : 'border-transparent hover:bg-surface-warm'}`}
                      onClick={() => setSelectedChannel(ch.key)}>
                      <input type="radio" name="channel" checked={selectedChannel === ch.key} readOnly
                        className="mt-0.5 accent-[#000000]" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink leading-tight">{ch.label}</p>
                        <p className="text-[10px] text-ink-3 leading-snug mt-0.5">{ch.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* ╔═══ MIDDLE COLUMN: Input Panel (4 cols) ═══╗ */}
            <div className="lg:col-span-4 space-y-5">

              {/* Brand */}
              <div className="bg-surface rounded-xl border border-divider-light p-5">
                <label className="block text-sm font-semibold text-ink-2 mb-1">Brand <span className="text-red-soft">*</span></label>
                <input type="text" value={brandName} onChange={e => setBrandName(e.target.value)}
                  placeholder="e.g., TickTalk, Benpay, Apple"
                  className="w-full px-4 py-2.5 border border-divider rounded-lg focus:ring-2 focus:ring-ink/10 focus:border-ink outline-none text-sm" />
              </div>

              {/* Product */}
              <div className="bg-surface rounded-xl border border-divider-light p-5">
                <label className="block text-sm font-semibold text-ink-2 mb-1">Product <span className="text-ink-3 text-xs font-normal">(optional)</span></label>
                <input type="text" value={productName} onChange={e => setProductName(e.target.value)}
                  placeholder="e.g., Kids GPS Smartwatch, Crypto Debit Card"
                  className="w-full px-4 py-2.5 border border-divider rounded-lg focus:ring-2 focus:ring-ink/10 focus:border-ink outline-none text-sm" />
              </div>

              {/* Content Type */}
              <div className="bg-surface rounded-xl border border-divider-light p-5">
                <h3 className="text-sm font-semibold text-ink-2 mb-3">Content Type</h3>
                <div className="space-y-1">
                  {CONTENT_TYPES.map(ct => (
                    <label key={ct.key}
                      className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer border transition-all ${selectedType === ct.key ? 'border-divider bg-surface-warm' : 'border-transparent hover:bg-surface-warm'}`}
                      onClick={() => setSelectedType(ct.key)}>
                      <input type="radio" name="contentType" checked={selectedType === ct.key} readOnly
                        className="mt-0.5 accent-[#000000]" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink leading-tight">{ct.label}</p>
                        <p className="text-[10px] text-ink-3 leading-snug mt-0.5">{ct.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Topic */}
              <div className="bg-surface rounded-xl border border-divider-light p-5">
                <label className="block text-sm font-semibold text-ink-2 mb-1">Topic <span className="text-red-soft">*</span></label>
                <input type="text" value={topic} onChange={e => setTopic(e.target.value)}
                  placeholder="e.g., kids GPS smartwatch, crypto debit card"
                  className="w-full px-4 py-2.5 border border-divider rounded-lg focus:ring-2 focus:ring-ink/10 focus:border-ink outline-none text-sm" />
              </div>

              {/* Content Guardrails */}
              <div className="bg-surface rounded-xl border border-divider-light p-5">
                <label className="block text-sm font-semibold text-ink-2 mb-1">Content Guardrails <span className="text-ink-3 text-xs font-normal">(optional)</span></label>
                <input type="text" value={forbiddenClaims} onChange={e => setForbiddenClaims(e.target.value)}
                  placeholder="e.g., Do not mention competitor X, avoid pricing claims, no medical advice"
                  className="w-full px-4 py-2.5 border border-divider rounded-lg focus:ring-2 focus:ring-ink/10 focus:border-ink outline-none text-sm" />
              </div>

              {/* Generate Button */}
              <div>
                {generating ? (
                  <button onClick={handleStopGenerate} className="w-full px-4 py-3.5 bg-red-soft-bg hover:bg-red-soft-bg text-red-soft font-semibold rounded-xl flex items-center justify-center gap-2 border border-red-soft/30">
                    <StopCircle className="w-5 h-5" /> Stop Generating
                  </button>
                ) : (
                  <button onClick={handleGenerate} disabled={!brandName.trim() || !topic.trim()}
                    className="w-full px-4 py-3.5 bg-ink hover:bg-[#2d2d2c] text-ink-inv font-semibold rounded-xl transition-all disabled:opacity-40 flex items-center justify-center gap-2 border border-ink">
                    <Sparkles className="w-5 h-5" /> Generate GEO Optimized Content
                  </button>
                )}
              </div>
            </div>

            {/* ╔═══ RIGHT COLUMN: Output Preview (6 cols) ═══╗ */}
            <div className="lg:col-span-6 space-y-5">

              {genError && (
                <div className="bg-red-soft-bg border border-red-soft/30 rounded-xl p-4 flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-soft flex-shrink-0 mt-0.5" />
                  <div><p className="font-medium text-ink">Generation Failed</p><p className="text-sm text-red-soft mt-1">{genError}</p></div>
                </div>
              )}

              {generating && (
                <div className="bg-surface rounded-xl border border-divider-light p-12 text-center">
                  <Loader2 className="w-10 h-10 text-red-soft animate-spin mx-auto mb-4" />
                  <p className="text-ink font-semibold">Generating {CONTENT_TYPES.find(c => c.key === selectedType)?.label}...</p>
                  <p className="text-ink-3 text-sm mt-1">AI is crafting GEO-optimized content. This may take 10-30 seconds.</p>
                </div>
              )}

              {generated && !generating && (
                <div className="bg-surface rounded-xl border border-divider-light overflow-hidden">
                  <div className="px-5 py-3 border-b border-divider-light bg-canvas">
                    <h3 className="text-sm font-bold text-ink-2 tracking-wide">Output Preview</h3>
                  </div>

                  {/* AI Prompt (Generated, editable) */}
                  <div className="px-5 py-4 border-b border-divider-light">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-ink-3 uppercase tracking-wider">AI Prompt (Generated)</span>
                      <button onClick={() => { setEditingPrompt(!editingPrompt); setEditedPrompt(generated.ai_prompt) }}
                        className="text-ink-3 hover:text-ink-2 p-1 rounded transition-colors" title="Edit prompt">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {editingPrompt ? (
                      <textarea value={editedPrompt} onChange={e => setEditedPrompt(e.target.value)}
                        rows={3} className="w-full px-3 py-2 border border-divider rounded-lg text-sm bg-surface-warm focus:ring-2 focus:ring-ink/10 focus:border-ink outline-none" />
                    ) : (
                      <p className="text-sm text-ink-2 bg-canvas px-3 py-2.5 rounded-lg border border-divider-light leading-relaxed">
                        {generated.ai_prompt || 'System-generated, editable query for AI-friendly content generation.'}
                      </p>
                    )}
                    <p className="text-[10px] text-ink-3 mt-1.5">System-generated, editable query for AI-friendly content generation.</p>
                  </div>

                  {/* Title Options */}
                  <div className="px-5 py-4 border-b border-divider-light">
                    <span className="text-xs font-semibold text-ink-3 uppercase tracking-wider mb-2 block">Title Options</span>
                    <div className="space-y-1.5">
                      {(generated.title_options && generated.title_options.length > 0 ? generated.title_options : [generated.title]).map((t, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-ink-2">
                          <span className="text-ink-3 font-mono text-xs">{i + 1}.</span>
                          <span>{t}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* TL;DR */}
                  <div className="px-5 py-4 border-b border-divider-light bg-surface-warm">
                    <span className="text-xs font-semibold text-ink-2 uppercase tracking-wider mb-1.5 block">TL;DR (Fact Summary)</span>
                    <p className="text-sm text-ink leading-relaxed">{generated.tldr}</p>
                  </div>

                  {/* Main Content (Markdown) */}
                  <div className="px-5 py-4 border-b border-divider-light">
                    <span className="text-xs font-semibold text-ink-3 uppercase tracking-wider mb-2 block">Main Content (Markdown)</span>
                    <pre className="whitespace-pre-wrap text-sm text-ink-2 bg-canvas p-4 rounded-lg border border-divider-light font-mono leading-relaxed max-h-[400px] overflow-y-auto">
                      {generated.main_content_md}
                    </pre>
                    <div className="flex items-center gap-2 mt-2 text-xs text-ink-3">
                      <span>{generated.word_count} words</span>
                      <span className="px-2 py-0.5 bg-sage-bg text-sage rounded-full font-medium">
                        GEO Score: {generated.geo_score}/100
                      </span>
                    </div>
                  </div>

                  {/* GEO Quality Checklist */}
                  <div className="px-5 py-4 border-b border-divider-light">
                    <span className="text-xs font-semibold text-ink-3 uppercase tracking-wider mb-2 block">GEO Quality Checklist</span>
                    <div className="space-y-1.5">
                      {generated.quality_checks.map((qc, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          {qc.passed
                            ? <CheckCircle className="w-4 h-4 text-sage flex-shrink-0" />
                            : <XCircle className="w-4 h-4 text-red-soft flex-shrink-0" />}
                          <span className={qc.passed ? 'text-ink-2' : 'text-red-soft'}>{qc.label}</span>
                          <span className="text-[10px] text-ink-3 ml-auto">{qc.note}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="px-5 py-4 space-y-3">
                    <a href={`/dashboard/geo-distribution`}
                      className="w-full px-4 py-2.5 bg-sage hover:bg-[#3D6B4E] text-ink-inv font-medium rounded-lg text-sm flex items-center justify-center gap-2 transition-all shadow-sm">
                      <Globe className="w-4 h-4" /> Push to Distribution Queue
                    </a>
                    <div className="flex items-center gap-3">
                      <button onClick={handleCopy}
                        className="flex-1 px-4 py-2.5 bg-surface hover:bg-surface-warm border border-divider-light text-ink-2 font-medium rounded-lg text-sm flex items-center justify-center gap-2 transition-colors">
                        <Copy className="w-4 h-4" /> Copy Markdown
                      </button>
                      <button onClick={handleDownload}
                        className="flex-1 px-4 py-2.5 bg-surface hover:bg-surface-warm border border-divider-light text-ink-2 font-medium rounded-lg text-sm flex items-center justify-center gap-2 transition-colors">
                        <Download className="w-4 h-4" /> Download .md
                      </button>
                      <button onClick={handleGenerate}
                        className="px-4 py-2.5 bg-surface-warm hover:bg-surface-muted text-ink-2 font-medium rounded-lg text-sm flex items-center gap-2 transition-colors">
                        <RefreshCw className="w-4 h-4" /> Redo
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {!generated && !generating && !genError && (
                <div className="bg-surface rounded-xl border border-divider-light overflow-hidden">
                  <div className="px-5 py-3 border-b border-divider-light bg-canvas">
                    <h3 className="text-sm font-bold text-ink-2 tracking-wide">Output Preview</h3>
                  </div>
                  <div className="p-8 text-center flex flex-col items-center justify-center min-h-[500px]">
                    <div className="w-16 h-16 bg-surface-warm rounded-2xl flex items-center justify-center mb-4">
                      <Wand2 className="w-8 h-8 text-ink-3" />
                    </div>
                    <h3 className="text-lg font-semibold text-ink mb-2">Output Preview</h3>
                    <p className="text-ink-3 text-sm max-w-sm">
                      Configure the content type, brand, and channel on the left, then click &quot;Generate&quot; to see AI Prompt, Title Options, TL;DR, Main Content, and Quality Checklist here.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════ */}
        {/* TAB: Validator  (wireframe: Upload Draft → Results)*/}
        {/* ═══════════════════════════════════════════════════ */}
        {activeTab === 'validate' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* ╔═══ LEFT: Validator Input ═══╗ */}
            <div className="bg-surface rounded-xl border border-divider-light overflow-hidden">
              <div className="px-6 py-4 border-b border-divider-light">
                <h3 className="font-semibold text-ink">Validator</h3>
              </div>

              {/* Content Type selector */}
              <div className="px-6 pt-4">
                <label className="block text-xs font-semibold text-ink-3 uppercase tracking-wider mb-1.5">Content Type</label>
                <select value={valContentType} onChange={e => setValContentType(e.target.value)}
                  className="w-full px-4 py-2.5 border border-divider rounded-lg focus:ring-2 focus:ring-ink/10 focus:border-ink outline-none text-sm bg-surface">
                  {CONTENT_TYPES.map(ct => <option key={ct.key} value={ct.key}>{ct.label}</option>)}
                </select>
              </div>

              {/* Upload Draft area */}
              <div className="px-6 pt-4">
                <p className="text-sm font-semibold text-ink-2 mb-2">Upload Draft</p>
                <div
                  className="border-2 border-dashed border-divider rounded-xl p-6 text-center hover:border-divider transition-colors cursor-pointer"
                  onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-divider', 'bg-surface-warm') }}
                  onDragLeave={e => { e.currentTarget.classList.remove('border-divider', 'bg-surface-warm') }}
                  onDrop={e => {
                    e.preventDefault()
                    e.currentTarget.classList.remove('border-divider', 'bg-surface-warm')
                    const file = e.dataTransfer.files[0]
                    if (file) {
                      const reader = new FileReader()
                      reader.onload = ev => { if (ev.target?.result) setValArticle(ev.target.result as string) }
                      reader.readAsText(file)
                    }
                  }}
                  onClick={() => {
                    const input = document.createElement('input')
                    input.type = 'file'
                    input.accept = '.md,.txt,.markdown'
                    input.onchange = (ev: any) => {
                      const file = ev.target.files?.[0]
                      if (file) {
                        const reader = new FileReader()
                        reader.onload = e => { if (e.target?.result) setValArticle(e.target.result as string) }
                        reader.readAsText(file)
                      }
                    }
                    input.click()
                  }}
                >
                  <div className="flex items-center justify-center gap-3 text-ink-3">
                    <span className="text-sm">Drag & drop or</span>
                    <span className="px-3 py-1.5 bg-surface-warm text-ink-2 rounded-lg text-sm font-medium border border-divider-light hover:bg-surface-muted transition-colors inline-flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" /> Browse file
                    </span>
                  </div>
                </div>
              </div>

              {/* Text editor area */}
              <div className="px-6 pt-4 pb-2">
                <textarea value={valArticle} onChange={e => setValArticle(e.target.value)}
                  placeholder="Paste or upload your edited draft here for validator."
                  rows={14}
                  className="w-full px-4 py-3 border border-divider rounded-lg focus:ring-2 focus:ring-ink/10 focus:border-ink outline-none text-sm font-mono leading-relaxed resize-none" />
              </div>

              {/* Validate Draft button */}
              <div className="px-6 pb-5 pt-2">
                <button onClick={handleValidate} disabled={!valArticle.trim() || validating}
                  className="w-full px-4 py-3 bg-ink hover:bg-[#2d2d2c] text-ink-inv font-semibold rounded-xl disabled:opacity-40 flex items-center justify-center gap-2 transition-all">
                  {validating
                    ? <><Loader2 className="w-5 h-5 animate-spin" /> Validating...</>
                    : <><Shield className="w-5 h-5" /> Validate Draft</>}
                </button>
              </div>
            </div>

            {/* ╔═══ RIGHT: Validation Results ═══╗ */}
            <div className="bg-surface rounded-xl border border-divider-light overflow-hidden">
              <div className="px-6 py-4 border-b border-divider-light">
                <h3 className="font-semibold text-ink">Validation Results</h3>
              </div>

              {valResult ? (() => {
                // Group violations by module
                const modules = ['Structural Contract', 'Risk Boundary', 'GEO Compliance'] as const
                const grouped: Record<string, typeof valResult.violations> = {}
                for (const m of modules) grouped[m] = valResult.violations.filter(v => v.module === m)

                return (
                  <div>
                    {/* Validation Summary */}
                    <div className="px-6 py-5 border-b border-divider-light bg-canvas">
                      <p className="text-xs font-semibold text-ink-3 uppercase tracking-wider mb-2">Validation Summary</p>
                      <div className="flex items-start gap-3">
                        {valResult.passed
                          ? <CheckCircle className="w-6 h-6 text-sage flex-shrink-0 mt-0.5" />
                          : <AlertTriangle className="w-6 h-6 text-caution flex-shrink-0 mt-0.5" />}
                        <div>
                          <p className={`font-bold text-base ${valResult.passed ? 'text-sage' : 'text-ink'}`}>
                            {valResult.passed ? 'All Checks Passed' : 'Detected Issues'}
                          </p>
                          <p className="text-sm font-semibold text-red-soft mt-0.5">
                            {valResult.violations_count} Violation{valResult.violations_count !== 1 ? 's' : ''} Detected
                          </p>
                          <p className="text-sm text-ink-3 mt-1">{valResult.summary}</p>
                        </div>
                      </div>
                    </div>

                    {/* 3-module collapsible sections */}
                    <div className="divide-y divide-divider-light">
                      {modules.map(moduleName => {
                        const items = grouped[moduleName] || []
                        const hasErrors = items.some(v => v.severity === 'error')
                        const hasWarnings = items.some(v => v.severity === 'warning')
                        const isExpanded = valExpandedModules.includes(moduleName)

                        return (
                          <div key={moduleName}>
                            {/* Accordion header */}
                            <button
                              onClick={() => setValExpandedModules(prev =>
                                prev.includes(moduleName)
                                  ? prev.filter(m => m !== moduleName)
                                  : [...prev, moduleName]
                              )}
                              className="w-full px-6 py-4 flex items-center justify-between hover:bg-surface-warm transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                {isExpanded
                                  ? <ChevronDown className="w-4 h-4 text-ink-3" />
                                  : <ChevronRight className="w-4 h-4 text-ink-3" />}
                                <span className="text-sm font-semibold text-ink">{moduleName}</span>
                                {items.length > 0 && (
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${hasErrors ? 'bg-red-soft-bg text-red-soft' : hasWarnings ? 'bg-caution-bg text-caution' : 'bg-sage-bg text-sage'}`}>
                                    {items.length}
                                  </span>
                                )}
                                {items.length === 0 && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-sage-bg text-sage">Pass</span>
                                )}
                              </div>
                              <ChevronDown className={`w-4 h-4 text-ink-3 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                            </button>

                            {/* Accordion content */}
                            {isExpanded && (
                              <div className="px-6 pb-4 space-y-3">
                                {items.length === 0 ? (
                                  <div className="flex items-center gap-2 text-sm text-sage px-2">
                                    <CheckCircle className="w-4 h-4" />
                                    <span>All checks passed for this module.</span>
                                  </div>
                                ) : (
                                  items.map((v, i) => (
                                    <div key={i} className="flex items-start gap-3 px-2">
                                      {v.severity === 'error'
                                        ? <div className="w-5 h-5 rounded-full bg-red-soft-bg flex items-center justify-center flex-shrink-0 mt-0.5"><XCircle className="w-3.5 h-3.5 text-red-soft" /></div>
                                        : <div className="w-5 h-5 rounded-full bg-caution-bg flex items-center justify-center flex-shrink-0 mt-0.5"><AlertTriangle className="w-3 h-3 text-caution" /></div>}
                                      <div className="min-w-0">
                                        <p className={`text-sm font-medium ${v.severity === 'error' ? 'text-red-soft' : 'text-caution'}`}>
                                          {v.rule}
                                        </p>
                                        <p className="text-xs text-ink-3 mt-0.5 leading-relaxed">{v.text_snippet}</p>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Action buttons: Make Edits / Submit for Review */}
                    <div className="px-6 py-4 border-t border-divider flex items-center gap-3">
                      <button onClick={() => { setValResult(null); }}
                        className="flex-1 px-4 py-2.5 bg-surface hover:bg-surface-warm border border-divider-light text-ink-2 font-medium rounded-lg text-sm transition-colors">
                        Make Edits
                      </button>
                      <a
                        href={valResult.passed ? '/dashboard/geo-distribution' : '#'}
                        onClick={e => { if (!valResult.passed) e.preventDefault() }}
                        className={`flex-1 px-4 py-2.5 font-medium rounded-lg text-sm transition-all flex items-center justify-center gap-1.5 ${valResult.passed ? 'bg-ink hover:bg-[#2d2d2c] text-ink-inv' : 'bg-surface-muted text-ink-3 cursor-not-allowed'}`}>
                        Submit for Review <span className="ml-1">&rarr;</span>
                      </a>
                    </div>
                  </div>
                )
              })() : (
                <div className="p-8 text-center flex flex-col items-center justify-center min-h-[400px]">
                  <Shield className="w-12 h-12 text-ink-3 mb-4" />
                  <h3 className="text-lg font-semibold text-ink mb-2">Validation Results</h3>
                  <p className="text-ink-3 text-sm max-w-sm">
                    Upload or paste your edited draft on the left, then click &quot;Validate Draft&quot;. The system checks Structural Contract, Risk Boundary, and GEO Compliance.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════ */}
        {/* TAB: History  (wireframe: filter bar + table)       */}
        {/* ═══════════════════════════════════════════════════ */}
        {activeTab === 'history' && (
          <div className="space-y-4">

            {/* ── Header + Filter Bar ── */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-ink">History</h3>
              <button onClick={loadHistory} className="text-xs text-ink-3 hover:text-red-soft flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Refresh</button>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <select value={histFilterType} onChange={e => setHistFilterType(e.target.value)}
                className="px-3 py-2 border border-divider rounded-lg text-sm bg-surface focus:ring-2 focus:ring-ink/10 outline-none">
                <option value="all">All Content Types</option>
                {CONTENT_TYPES.map(ct => <option key={ct.key} value={ct.key}>{ct.label}</option>)}
              </select>
              <select value={histFilterChannel} onChange={e => setHistFilterChannel(e.target.value)}
                className="px-3 py-2 border border-divider rounded-lg text-sm bg-surface focus:ring-2 focus:ring-ink/10 outline-none">
                <option value="all">All Output Channels</option>
                {OUTPUT_CHANNELS.map(ch => <option key={ch.key} value={ch.key}>{ch.label}</option>)}
              </select>
              <div className="ml-auto px-3 py-2 border border-divider-light rounded-lg text-sm text-ink-3 bg-surface">
                Last 30 Days
              </div>
            </div>

            {/* ── Table ── */}
            <div className="bg-surface rounded-xl border border-divider-light overflow-hidden">
              {historyLoading ? (
                <div className="p-12 text-center"><Loader2 className="w-8 h-8 text-ink-3 animate-spin mx-auto" /></div>
              ) : filteredHistory.length === 0 ? (
                <div className="p-12 text-center">
                  <FileText className="w-12 h-12 text-ink-3 mx-auto mb-3" />
                  <p className="text-ink-3 text-sm">No content generated yet. Go to the Generate tab to create your first article.</p>
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-divider bg-canvas">
                      <th className="px-4 py-3 w-10">
                        <input type="checkbox" className="accent-[#000000] rounded"
                          checked={histSelectedIds.size === filteredHistory.length && filteredHistory.length > 0}
                          onChange={toggleAllHistory} />
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-ink-3 uppercase tracking-wider">Generated Articles</th>
                      <th className="px-4 py-3 text-xs font-semibold text-ink-3 uppercase tracking-wider">Content Type</th>
                      <th className="px-4 py-3 text-xs font-semibold text-ink-3 uppercase tracking-wider">Project</th>
                      <th className="px-4 py-3 text-xs font-semibold text-ink-3 uppercase tracking-wider">Last Updated</th>
                      <th className="px-4 py-3 text-xs font-semibold text-ink-3 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-divider-light">
                    {filteredHistory.map(item => {
                      const ct = CONTENT_TYPES.find(c => c.key === item.content_type)
                      const ch = OUTPUT_CHANNELS.find(c => c.key === item.output_channel)
                      const dateStr = item.created_at ? new Date(item.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''
                      return (
                        <tr key={item.id} className="hover:bg-surface-warm transition-colors">
                          <td className="px-4 py-4">
                            <input type="checkbox" className="accent-[#000000] rounded"
                              checked={histSelectedIds.has(item.id)}
                              onChange={() => toggleHistorySelect(item.id)} />
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-sm font-medium text-ink leading-snug">
                              GEO - {ct?.label} | {item.title}
                            </p>
                            <span className="inline-block mt-1 text-[10px] px-2 py-0.5 bg-surface-warm text-ink-2 rounded border border-divider-light">{ct?.label}</span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="inline-block text-[11px] px-2.5 py-1 bg-surface-warm text-ink-2 rounded border border-divider-light font-medium">{ct?.label}</span>
                            <span className="block mt-1 text-[11px] px-2.5 py-1 bg-surface-warm text-ink-2 rounded border border-divider-light font-medium w-fit">{ch?.label}</span>
                          </td>
                          <td className="px-4 py-4 text-sm text-ink-2">
                            TickTalk GEO Project
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-sm text-ink-2">{dateStr}</p>
                            <p className="text-xs text-ink-3">By {item.brand_name || 'User'}</p>
                          </td>
                          <td className="px-4 py-4 text-right space-y-1.5">
                            <button onClick={() => setViewOutputItem(item)}
                              className="block ml-auto px-3 py-1.5 bg-surface border border-divider-light rounded-lg text-xs font-medium text-ink-2 hover:bg-surface-warm transition-colors w-[120px]">
                              View Output
                            </button>
                            <button onClick={() => handleReuseStructure(item)}
                              className="block ml-auto px-3 py-1.5 bg-surface border border-divider-light rounded-lg text-xs font-medium text-ink-2 hover:bg-surface-warm transition-colors w-[120px]">
                              Reuse Structure
                            </button>
                            <a href="/dashboard/geo-distribution"
                              className="block ml-auto px-3 py-1.5 bg-sage-bg border border-sage/30 rounded-lg text-xs font-medium text-sage hover:bg-sage-bg transition-colors w-[120px] text-center">
                              Add to Queue
                            </a>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* ── View Output Modal ── */}
            {viewOutputItem && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6" onClick={() => setViewOutputItem(null)}>
                <div className="bg-surface rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                  <div className="px-6 py-4 border-b border-divider flex items-center justify-between sticky top-0 bg-surface z-10 rounded-t-2xl">
                    <div>
                      <h3 className="font-semibold text-ink">{viewOutputItem.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] px-2 py-0.5 bg-surface-warm text-ink-2 rounded-full">{CONTENT_TYPES.find(c => c.key === viewOutputItem.content_type)?.label}</span>
                        <span className="text-[10px] px-2 py-0.5 bg-surface-warm text-ink-2 rounded-full">{OUTPUT_CHANNELS.find(c => c.key === viewOutputItem.output_channel)?.label}</span>
                        <span className={`text-xs font-bold font-mono ${viewOutputItem.geo_score >= 80 ? 'text-sage' : viewOutputItem.geo_score >= 50 ? 'text-caution' : 'text-red-soft'}`}>GEO: {viewOutputItem.geo_score}/100</span>
                      </div>
                    </div>
                    <button onClick={() => setViewOutputItem(null)} className="p-2 hover:bg-surface-warm rounded-lg"><X className="w-5 h-5 text-ink-3" /></button>
                  </div>

                  {/* AI Prompt */}
                  {viewOutputItem.ai_prompt && (
                    <div className="px-6 py-3 bg-canvas border-b border-divider-light">
                      <p className="text-[10px] font-semibold text-ink-3 uppercase mb-1">AI Prompt</p>
                      <p className="text-sm text-ink-2">{viewOutputItem.ai_prompt}</p>
                    </div>
                  )}

                  {/* TL;DR */}
                  <div className="px-6 py-3 bg-surface-warm border-b border-divider-light">
                    <p className="text-[10px] font-semibold text-ink-2 uppercase mb-1">TL;DR</p>
                    <p className="text-sm text-ink">{viewOutputItem.tldr}</p>
                  </div>

                  {/* Main Content */}
                  <div className="px-6 py-4">
                    <p className="text-[10px] font-semibold text-ink-3 uppercase mb-2">Main Content</p>
                    <pre className="whitespace-pre-wrap text-sm text-ink-2 bg-canvas p-4 rounded-lg border border-divider-light font-mono leading-relaxed max-h-[400px] overflow-y-auto">
                      {viewOutputItem.main_content_md}
                    </pre>
                  </div>

                  {/* Quality Checks */}
                  {viewOutputItem.quality_checks?.length > 0 && (
                    <div className="px-6 py-4 border-t border-divider-light">
                      <p className="text-[10px] font-semibold text-ink-3 uppercase mb-2">Quality Checks</p>
                      <div className="space-y-1.5">
                        {viewOutputItem.quality_checks.map((qc, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            {qc.passed ? <CheckCircle className="w-4 h-4 text-sage" /> : <XCircle className="w-4 h-4 text-red-soft" />}
                            <span className={qc.passed ? 'text-ink-2' : 'text-red-soft'}>{qc.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Footer actions */}
                  <div className="px-6 py-4 border-t border-divider flex items-center gap-3 sticky bottom-0 bg-surface rounded-b-2xl">
                    <button onClick={() => { handleReuseStructure(viewOutputItem); setViewOutputItem(null) }}
                      className="px-4 py-2 bg-ink hover:bg-[#2d2d2c] text-ink-inv rounded-lg text-sm font-medium flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5" /> Reuse Structure
                    </button>
                    <button onClick={() => { navigator.clipboard.writeText(viewOutputItem.main_content_md) }}
                      className="px-4 py-2 bg-surface border border-divider-light hover:bg-surface-warm text-ink-2 rounded-lg text-sm font-medium flex items-center gap-1.5">
                      <Copy className="w-3.5 h-3.5" /> Copy Markdown
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════ */}
        {/* TAB: Admin (Template Management — editable) */}
        {/* ═══════════════════════════════════════════════════ */}
        {activeTab === 'admin' && (() => {
          const currentTemplate = adminTemplates.find(t => t.content_type === adminSelectedType)
          // Use editing copy if available, otherwise the original
          const editSource = adminEditing && adminEditing.content_type === adminSelectedType ? adminEditing : currentTemplate
          const sc = (editSource?.structural_contract || {}) as Record<string, string[]>
          const rb = (editSource?.risk_boundary || {}) as Record<string, string[]>
          const gc = (editSource?.geo_compliance || {}) as Record<string, string[]>

          const toggleAdminSection = (key: string) => {
            setAdminExpandedSections(prev =>
              prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
            )
          }

          // Start editing: deep-clone the current template
          const startEditing = () => {
            if (currentTemplate) {
              setAdminEditing(JSON.parse(JSON.stringify(currentTemplate)))
              setAdminDirty(false)
            }
          }

          // Cancel editing: discard changes
          const cancelEditing = () => {
            setAdminEditing(null)
            setAdminDirty(false)
          }

          const isEditing = adminEditing !== null && adminEditing.content_type === adminSelectedType

          // Helper: update a rule item in the editing copy
          const updateRule = (section: 'structural_contract' | 'risk_boundary' | 'geo_compliance', key: string, idx: number, value: string) => {
            if (!adminEditing) return
            const copy = JSON.parse(JSON.stringify(adminEditing)) as ContentTemplate
            const sectionData = (copy[section] || {}) as Record<string, string[]>
            if (sectionData[key]) { sectionData[key][idx] = value }
            copy[section] = sectionData
            setAdminEditing(copy)
            setAdminDirty(true)
          }

          // Helper: add a new rule
          const addRule = (section: 'structural_contract' | 'risk_boundary' | 'geo_compliance', key: string) => {
            if (!adminEditing) return
            const copy = JSON.parse(JSON.stringify(adminEditing)) as ContentTemplate
            const sectionData = (copy[section] || {}) as Record<string, string[]>
            if (!sectionData[key]) sectionData[key] = []
            sectionData[key].push('')
            copy[section] = sectionData
            setAdminEditing(copy)
            setAdminDirty(true)
          }

          // Helper: delete a rule
          const deleteRule = (section: 'structural_contract' | 'risk_boundary' | 'geo_compliance', key: string, idx: number) => {
            if (!adminEditing) return
            const copy = JSON.parse(JSON.stringify(adminEditing)) as ContentTemplate
            const sectionData = (copy[section] || {}) as Record<string, string[]>
            if (sectionData[key]) { sectionData[key].splice(idx, 1) }
            copy[section] = sectionData
            setAdminEditing(copy)
            setAdminDirty(true)
          }

          // Save to backend
          const handleSave = async () => {
            if (!adminEditing) return
            setAdminSaving(true)
            try {
              const res = await api.updateContentTemplate(adminEditing.content_type, adminEditing)
              if (res.data) {
                setAdminTemplates(prev => prev.map(t => t.content_type === res.data!.content_type ? res.data! : t))
                setAdminEditing(null)
                setAdminDirty(false)
              }
            } catch { /* ignore */ }
            setAdminSaving(false)
          }

          // Render a rule list (editable or readonly)
          const renderRuleList = (section: 'structural_contract' | 'risk_boundary' | 'geo_compliance', key: string, items: string[], bulletColor: string = 'text-ink-3') => (
            <div className="space-y-2">
              {items.map((item: string, i: number) => (
                <div key={i} className="flex items-center gap-2 group">
                  <span className={`${bulletColor} mt-0.5 flex-shrink-0`}>&#8226;</span>
                  {isEditing ? (
                    <>
                      <input value={item} onChange={(e) => updateRule(section, key, i, e.target.value)}
                        className="flex-1 text-sm text-ink-2 bg-transparent border-b border-divider-light hover:border-divider focus:border-ink focus:outline-none px-1 py-0.5 transition-colors" />
                      <button onClick={() => deleteRule(section, key, i)}
                        className="opacity-0 group-hover:opacity-100 text-ink-3 hover:text-red-soft transition-all flex-shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <span className="text-sm text-ink-2">{item}</span>
                  )}
                </div>
              ))}
              {isEditing && (
                <button onClick={() => addRule(section, key)}
                  className="flex items-center gap-1.5 text-xs text-ink-3 hover:text-red-soft mt-1 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Add rule
                </button>
              )}
            </div>
          )

          return (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* ── Left sidebar: Templates navigation (3 cols) ── */}
              <div className="lg:col-span-3">
                <div className="bg-surface rounded-xl border border-divider-light overflow-hidden">
                  <div className="px-5 py-4 border-b border-divider-light">
                    <h3 className="text-sm font-bold text-ink-2">Templates</h3>
                  </div>
                  <div className="p-2">
                    {CONTENT_TYPES.map(ct => (
                      <button key={ct.key} onClick={() => { if (adminDirty && !confirm('Discard unsaved changes?')) return; cancelEditing(); setAdminSelectedType(ct.key) }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-sm transition-all ${adminSelectedType === ct.key ? 'bg-surface-warm font-semibold text-ink' : 'text-ink-2 hover:bg-surface-warm'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${adminSelectedType === ct.key ? 'bg-ink' : 'bg-ink-3'}`} />
                        {ct.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Main area: Template detail (9 cols) ── */}
              <div className="lg:col-span-9 space-y-5">

                {/* Header with Edit button */}
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-ink">
                    {CONTENT_TYPES.find(c => c.key === adminSelectedType)?.label}
                  </h3>
                  {currentTemplate && !isEditing && (
                    <button onClick={startEditing}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-surface border border-divider-light hover:border-divider hover:bg-surface-warm text-ink-2 font-medium rounded-lg text-sm transition-all">
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                  )}
                  {isEditing && (
                    <span className="flex items-center gap-1.5 text-xs text-caution bg-caution-bg px-3 py-1.5 rounded-full font-medium">
                      <Edit3 className="w-3 h-3" />
                      Editing mode
                    </span>
                  )}
                </div>

                {adminLoading ? (
                  <div className="bg-surface rounded-xl border border-divider-light p-12 text-center">
                    <Loader2 className="w-8 h-8 text-ink-3 animate-spin mx-auto" />
                  </div>
                ) : !currentTemplate ? (
                  <div className="bg-surface rounded-xl border border-divider-light p-12 text-center">
                    <Settings className="w-12 h-12 text-ink-3 mx-auto mb-3" />
                    <p className="text-ink-3 text-sm">No template data loaded. Templates are fetched from the backend.</p>
                  </div>
                ) : (
                  <>
                    {/* ── Structural Contract ── */}
                    <div className={`bg-surface rounded-xl border overflow-hidden ${isEditing ? 'border-caution/30' : 'border-divider-light'}`}>
                      <button onClick={() => toggleAdminSection('structural')}
                        className="w-full px-5 py-4 flex items-center justify-between hover:bg-surface-warm transition-colors">
                        <span className="text-sm font-semibold text-ink flex items-center gap-2">
                          {adminExpandedSections.includes('structural') ? <ChevronDown className="w-4 h-4 text-ink-3" /> : <ChevronRight className="w-4 h-4 text-ink-3" />}
                          Structural Contract
                        </span>
                        <ChevronDown className={`w-4 h-4 text-ink-3 transition-transform ${adminExpandedSections.includes('structural') ? '' : '-rotate-90'}`} />
                      </button>
                      {adminExpandedSections.includes('structural') && (
                        <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <p className="text-xs font-bold text-ink-2 uppercase tracking-wider mb-3">Mandatory Sections</p>
                            {renderRuleList('structural_contract', 'mandatory_sections', sc.mandatory_sections || [], 'text-ink-3')}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-ink-2 uppercase tracking-wider mb-3">Explicitly Forbidden</p>
                            {renderRuleList('structural_contract', 'forbidden', sc.forbidden || [], 'text-ink-3')}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ── Risk Boundary ── */}
                    <div className={`bg-surface rounded-xl border overflow-hidden ${isEditing ? 'border-caution/30' : 'border-divider-light'}`}>
                      <button onClick={() => toggleAdminSection('risk')}
                        className="w-full px-5 py-4 flex items-center justify-between hover:bg-surface-warm transition-colors">
                        <span className="text-sm font-semibold text-ink flex items-center gap-2">
                          {adminExpandedSections.includes('risk') ? <ChevronDown className="w-4 h-4 text-ink-3" /> : <ChevronRight className="w-4 h-4 text-ink-3" />}
                          Risk Boundary
                        </span>
                        <ChevronDown className={`w-4 h-4 text-ink-3 transition-transform ${adminExpandedSections.includes('risk') ? '' : '-rotate-90'}`} />
                      </button>
                      {adminExpandedSections.includes('risk') && (
                        <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <p className="text-xs font-bold text-red-soft uppercase tracking-wider mb-3">Forbidden</p>
                            {renderRuleList('risk_boundary', 'forbidden', rb.forbidden || [], 'text-red-soft')}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-sage uppercase tracking-wider mb-3">Allowed</p>
                            {renderRuleList('risk_boundary', 'allowed', rb.allowed || [], 'text-sage')}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ── GEO Compliance ── */}
                    <div className={`bg-surface rounded-xl border overflow-hidden ${isEditing ? 'border-caution/30' : 'border-divider-light'}`}>
                      <button onClick={() => toggleAdminSection('geo')}
                        className="w-full px-5 py-4 flex items-center justify-between hover:bg-surface-warm transition-colors">
                        <span className="text-sm font-semibold text-ink flex items-center gap-2">
                          {adminExpandedSections.includes('geo') ? <ChevronDown className="w-4 h-4 text-ink-3" /> : <ChevronRight className="w-4 h-4 text-ink-3" />}
                          GEO Compliance
                        </span>
                        <ChevronDown className={`w-4 h-4 text-ink-3 transition-transform ${adminExpandedSections.includes('geo') ? '' : '-rotate-90'}`} />
                      </button>
                      {adminExpandedSections.includes('geo') && (
                        <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <p className="text-xs font-bold text-ink-2 uppercase tracking-wider mb-3">Citation Safety</p>
                            {renderRuleList('geo_compliance', 'citation_safety', gc.citation_safety || [], 'text-ink-2')}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-ink-2 uppercase tracking-wider mb-3">Answer Engine Readiness</p>
                            {renderRuleList('geo_compliance', 'answer_engine_readiness', gc.answer_engine_readiness || [], 'text-ink-2')}
                            <div className="mt-4">
                              <p className="text-xs font-bold text-ink-3 uppercase tracking-wider mb-2">Model Safety</p>
                              <p className="text-xs text-ink-3 italic">Reserved for future model strategy rules.</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ── Save / Cancel buttons ── */}
                    {isEditing && (
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-ink-3">
                          {adminDirty ? 'You have unsaved changes.' : 'No changes yet.'}
                        </p>
                        <div className="flex items-center gap-3">
                          <button onClick={cancelEditing}
                            className="px-5 py-2.5 bg-surface border border-divider-light hover:bg-surface-warm text-ink-2 font-medium rounded-lg text-sm transition-colors">
                            Cancel
                          </button>
                          <button onClick={handleSave} disabled={!adminDirty || adminSaving}
                            className="px-5 py-2.5 bg-ink hover:bg-[#2d2d2c] disabled:opacity-50 disabled:cursor-not-allowed text-ink-inv font-medium rounded-lg text-sm transition-all flex items-center gap-2">
                            {adminSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save Changes
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
