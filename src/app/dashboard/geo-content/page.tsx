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
  { key: 'chatgpt', name: 'ChatGPT', color: 'bg-green-500' },
  { key: 'perplexity', name: 'Perplexity', color: 'bg-blue-500' },
  { key: 'gemini', name: 'Gemini', color: 'bg-purple-500' },
  { key: 'grok', name: 'Grok', color: 'bg-gray-700' },
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
    <div className="min-h-screen bg-gray-50/50">
      <Header title={t.dashboard.geoContent} subtitle={t.dashboard.geoContentDesc} />

      <div className="p-6 space-y-6">
        {/* Tab Bar */}
        <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-200 p-1 w-fit">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.key ? 'bg-red-500 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>
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
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Output Channel <span className="text-red-500">*</span></h3>
                <div className="space-y-2">
                  {OUTPUT_CHANNELS.map(ch => (
                    <label key={ch.key}
                      className={`flex items-start gap-2.5 p-3 rounded-lg cursor-pointer border transition-all ${selectedChannel === ch.key ? 'border-red-300 bg-red-50/50' : 'border-transparent hover:bg-gray-50'}`}
                      onClick={() => setSelectedChannel(ch.key)}>
                      <input type="radio" name="channel" checked={selectedChannel === ch.key} readOnly
                        className="mt-0.5 accent-red-500" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 leading-tight">{ch.label}</p>
                        <p className="text-[10px] text-gray-400 leading-snug mt-0.5">{ch.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* ╔═══ MIDDLE COLUMN: Input Panel (4 cols) ═══╗ */}
            <div className="lg:col-span-4 space-y-5">

              {/* Brand */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Brand <span className="text-red-500">*</span></label>
                <input type="text" value={brandName} onChange={e => setBrandName(e.target.value)}
                  placeholder="e.g., TickTalk, Benpay, Apple"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none text-sm" />
              </div>

              {/* Product */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Product <span className="text-gray-400 text-xs font-normal">(optional)</span></label>
                <input type="text" value={productName} onChange={e => setProductName(e.target.value)}
                  placeholder="e.g., Kids GPS Smartwatch, Crypto Debit Card"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none text-sm" />
              </div>

              {/* Content Type */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Content Type</h3>
                <div className="space-y-1">
                  {CONTENT_TYPES.map(ct => (
                    <label key={ct.key}
                      className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer border transition-all ${selectedType === ct.key ? 'border-red-300 bg-red-50/50' : 'border-transparent hover:bg-gray-50'}`}
                      onClick={() => setSelectedType(ct.key)}>
                      <input type="radio" name="contentType" checked={selectedType === ct.key} readOnly
                        className="mt-0.5 accent-red-500" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 leading-tight">{ct.label}</p>
                        <p className="text-[10px] text-gray-400 leading-snug mt-0.5">{ct.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Topic */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Topic <span className="text-red-500">*</span></label>
                <input type="text" value={topic} onChange={e => setTopic(e.target.value)}
                  placeholder="e.g., kids GPS smartwatch, crypto debit card"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none text-sm" />
              </div>

              {/* Content Guardrails */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Content Guardrails <span className="text-gray-400 text-xs font-normal">(optional)</span></label>
                <input type="text" value={forbiddenClaims} onChange={e => setForbiddenClaims(e.target.value)}
                  placeholder="e.g., Do not mention competitor X, avoid pricing claims, no medical advice"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none text-sm" />
              </div>

              {/* Generate Button */}
              <div>
                {generating ? (
                  <button onClick={handleStopGenerate} className="w-full px-4 py-3.5 bg-red-100 hover:bg-red-200 text-red-600 font-semibold rounded-xl flex items-center justify-center gap-2 border border-red-200">
                    <StopCircle className="w-5 h-5" /> Stop Generating
                  </button>
                ) : (
                  <button onClick={handleGenerate} disabled={!brandName.trim() || !topic.trim()}
                    className="w-full px-4 py-3.5 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl transition-all disabled:opacity-40 flex items-center justify-center gap-2 border border-gray-900">
                    <Sparkles className="w-5 h-5" /> Generate GEO Optimized Content
                  </button>
                )}
              </div>
            </div>

            {/* ╔═══ RIGHT COLUMN: Output Preview (6 cols) ═══╗ */}
            <div className="lg:col-span-6 space-y-5">

              {genError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div><p className="font-medium text-red-900">Generation Failed</p><p className="text-sm text-red-700 mt-1">{genError}</p></div>
                </div>
              )}

              {generating && (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <Loader2 className="w-10 h-10 text-red-500 animate-spin mx-auto mb-4" />
                  <p className="text-gray-900 font-semibold">Generating {CONTENT_TYPES.find(c => c.key === selectedType)?.label}...</p>
                  <p className="text-gray-400 text-sm mt-1">AI is crafting GEO-optimized content. This may take 10-30 seconds.</p>
                </div>
              )}

              {generated && !generating && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="text-sm font-bold text-gray-700 tracking-wide">Output Preview</h3>
                  </div>

                  {/* AI Prompt (Generated, editable) */}
                  <div className="px-5 py-4 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">AI Prompt (Generated)</span>
                      <button onClick={() => { setEditingPrompt(!editingPrompt); setEditedPrompt(generated.ai_prompt) }}
                        className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors" title="Edit prompt">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {editingPrompt ? (
                      <textarea value={editedPrompt} onChange={e => setEditedPrompt(e.target.value)}
                        rows={3} className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-blue-50 focus:ring-2 focus:ring-blue-200 outline-none" />
                    ) : (
                      <p className="text-sm text-gray-700 bg-gray-50 px-3 py-2.5 rounded-lg border border-gray-100 leading-relaxed">
                        {generated.ai_prompt || 'System-generated, editable query for AI-friendly content generation.'}
                      </p>
                    )}
                    <p className="text-[10px] text-gray-400 mt-1.5">System-generated, editable query for AI-friendly content generation.</p>
                  </div>

                  {/* Title Options */}
                  <div className="px-5 py-4 border-b border-gray-100">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Title Options</span>
                    <div className="space-y-1.5">
                      {(generated.title_options && generated.title_options.length > 0 ? generated.title_options : [generated.title]).map((t, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                          <span className="text-gray-400 font-mono text-xs">{i + 1}.</span>
                          <span>{t}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* TL;DR */}
                  <div className="px-5 py-4 border-b border-gray-100 bg-blue-50/30">
                    <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1.5 block">TL;DR (Fact Summary)</span>
                    <p className="text-sm text-gray-800 leading-relaxed">{generated.tldr}</p>
                  </div>

                  {/* Main Content (Markdown) */}
                  <div className="px-5 py-4 border-b border-gray-100">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Main Content (Markdown)</span>
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded-lg border border-gray-100 font-mono leading-relaxed max-h-[400px] overflow-y-auto">
                      {generated.main_content_md}
                    </pre>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                      <span>{generated.word_count} words</span>
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
                        GEO Score: {generated.geo_score}/100
                      </span>
                    </div>
                  </div>

                  {/* GEO Quality Checklist */}
                  <div className="px-5 py-4 border-b border-gray-100">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">GEO Quality Checklist</span>
                    <div className="space-y-1.5">
                      {generated.quality_checks.map((qc, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          {qc.passed
                            ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                            : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                          <span className={qc.passed ? 'text-gray-700' : 'text-red-600'}>{qc.label}</span>
                          <span className="text-[10px] text-gray-400 ml-auto">{qc.note}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="px-5 py-4 space-y-3">
                    <a href={`/dashboard/geo-distribution`}
                      className="w-full px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-medium rounded-lg text-sm flex items-center justify-center gap-2 transition-all shadow-sm">
                      <Globe className="w-4 h-4" /> Push to Distribution Queue
                    </a>
                    <div className="flex items-center gap-3">
                      <button onClick={handleCopy}
                        className="flex-1 px-4 py-2.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-medium rounded-lg text-sm flex items-center justify-center gap-2 transition-colors">
                        <Copy className="w-4 h-4" /> Copy Markdown
                      </button>
                      <button onClick={handleDownload}
                        className="flex-1 px-4 py-2.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-medium rounded-lg text-sm flex items-center justify-center gap-2 transition-colors">
                        <Download className="w-4 h-4" /> Download .md
                      </button>
                      <button onClick={handleGenerate}
                        className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium rounded-lg text-sm flex items-center gap-2 transition-colors">
                        <RefreshCw className="w-4 h-4" /> Redo
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {!generated && !generating && !genError && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="text-sm font-bold text-gray-700 tracking-wide">Output Preview</h3>
                  </div>
                  <div className="p-8 text-center flex flex-col items-center justify-center min-h-[500px]">
                    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                      <Wand2 className="w-8 h-8 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Output Preview</h3>
                    <p className="text-gray-400 text-sm max-w-sm">
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
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Validator</h3>
              </div>

              {/* Content Type selector */}
              <div className="px-6 pt-4">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Content Type</label>
                <select value={valContentType} onChange={e => setValContentType(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none text-sm bg-white">
                  {CONTENT_TYPES.map(ct => <option key={ct.key} value={ct.key}>{ct.label}</option>)}
                </select>
              </div>

              {/* Upload Draft area */}
              <div className="px-6 pt-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">Upload Draft</p>
                <div
                  className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors cursor-pointer"
                  onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-blue-400', 'bg-blue-50/30') }}
                  onDragLeave={e => { e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50/30') }}
                  onDrop={e => {
                    e.preventDefault()
                    e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50/30')
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
                  <div className="flex items-center justify-center gap-3 text-gray-400">
                    <span className="text-sm">Drag & drop or</span>
                    <span className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-200 transition-colors inline-flex items-center gap-1.5">
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
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none text-sm font-mono leading-relaxed resize-none" />
              </div>

              {/* Validate Draft button */}
              <div className="px-6 pb-5 pt-2">
                <button onClick={handleValidate} disabled={!valArticle.trim() || validating}
                  className="w-full px-4 py-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl disabled:opacity-40 flex items-center justify-center gap-2 transition-all">
                  {validating
                    ? <><Loader2 className="w-5 h-5 animate-spin" /> Validating...</>
                    : <><Shield className="w-5 h-5" /> Validate Draft</>}
                </button>
              </div>
            </div>

            {/* ╔═══ RIGHT: Validation Results ═══╗ */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Validation Results</h3>
              </div>

              {valResult ? (() => {
                // Group violations by module
                const modules = ['Structural Contract', 'Risk Boundary', 'GEO Compliance'] as const
                const grouped: Record<string, typeof valResult.violations> = {}
                for (const m of modules) grouped[m] = valResult.violations.filter(v => v.module === m)

                return (
                  <div>
                    {/* Validation Summary */}
                    <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Validation Summary</p>
                      <div className="flex items-start gap-3">
                        {valResult.passed
                          ? <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                          : <AlertTriangle className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5" />}
                        <div>
                          <p className={`font-bold text-base ${valResult.passed ? 'text-green-800' : 'text-gray-900'}`}>
                            {valResult.passed ? 'All Checks Passed' : 'Detected Issues'}
                          </p>
                          <p className="text-sm font-semibold text-red-600 mt-0.5">
                            {valResult.violations_count} Violation{valResult.violations_count !== 1 ? 's' : ''} Detected
                          </p>
                          <p className="text-sm text-gray-500 mt-1">{valResult.summary}</p>
                        </div>
                      </div>
                    </div>

                    {/* 3-module collapsible sections */}
                    <div className="divide-y divide-gray-100">
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
                              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                {isExpanded
                                  ? <ChevronDown className="w-4 h-4 text-gray-400" />
                                  : <ChevronRight className="w-4 h-4 text-gray-400" />}
                                <span className="text-sm font-semibold text-gray-800">{moduleName}</span>
                                {items.length > 0 && (
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${hasErrors ? 'bg-red-100 text-red-600' : hasWarnings ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-600'}`}>
                                    {items.length}
                                  </span>
                                )}
                                {items.length === 0 && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-green-100 text-green-600">Pass</span>
                                )}
                              </div>
                              <ChevronDown className={`w-4 h-4 text-gray-300 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                            </button>

                            {/* Accordion content */}
                            {isExpanded && (
                              <div className="px-6 pb-4 space-y-3">
                                {items.length === 0 ? (
                                  <div className="flex items-center gap-2 text-sm text-green-600 px-2">
                                    <CheckCircle className="w-4 h-4" />
                                    <span>All checks passed for this module.</span>
                                  </div>
                                ) : (
                                  items.map((v, i) => (
                                    <div key={i} className="flex items-start gap-3 px-2">
                                      {v.severity === 'error'
                                        ? <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5"><XCircle className="w-3.5 h-3.5 text-red-500" /></div>
                                        : <div className="w-5 h-5 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0 mt-0.5"><AlertTriangle className="w-3 h-3 text-yellow-600" /></div>}
                                      <div className="min-w-0">
                                        <p className={`text-sm font-medium ${v.severity === 'error' ? 'text-red-800' : 'text-yellow-800'}`}>
                                          {v.rule}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{v.text_snippet}</p>
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
                    <div className="px-6 py-4 border-t border-gray-200 flex items-center gap-3">
                      <button onClick={() => { setValResult(null); }}
                        className="flex-1 px-4 py-2.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-medium rounded-lg text-sm transition-colors">
                        Make Edits
                      </button>
                      <a
                        href={valResult.passed ? '/dashboard/geo-distribution' : '#'}
                        onClick={e => { if (!valResult.passed) e.preventDefault() }}
                        className={`flex-1 px-4 py-2.5 font-medium rounded-lg text-sm transition-all flex items-center justify-center gap-1.5 ${valResult.passed ? 'bg-gray-900 hover:bg-gray-800 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                        Submit for Review <span className="ml-1">&rarr;</span>
                      </a>
                    </div>
                  </div>
                )
              })() : (
                <div className="p-8 text-center flex flex-col items-center justify-center min-h-[400px]">
                  <Shield className="w-12 h-12 text-gray-200 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Validation Results</h3>
                  <p className="text-gray-400 text-sm max-w-sm">
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
              <h3 className="text-lg font-semibold text-gray-900">History</h3>
              <button onClick={loadHistory} className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Refresh</button>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <select value={histFilterType} onChange={e => setHistFilterType(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-500/20 outline-none">
                <option value="all">All Content Types</option>
                {CONTENT_TYPES.map(ct => <option key={ct.key} value={ct.key}>{ct.label}</option>)}
              </select>
              <select value={histFilterChannel} onChange={e => setHistFilterChannel(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-500/20 outline-none">
                <option value="all">All Output Channels</option>
                {OUTPUT_CHANNELS.map(ch => <option key={ch.key} value={ch.key}>{ch.label}</option>)}
              </select>
              <div className="ml-auto px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-500 bg-white">
                Last 30 Days
              </div>
            </div>

            {/* ── Table ── */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {historyLoading ? (
                <div className="p-12 text-center"><Loader2 className="w-8 h-8 text-gray-300 animate-spin mx-auto" /></div>
              ) : filteredHistory.length === 0 ? (
                <div className="p-12 text-center">
                  <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">No content generated yet. Go to the Generate tab to create your first article.</p>
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/50">
                      <th className="px-4 py-3 w-10">
                        <input type="checkbox" className="accent-red-500 rounded"
                          checked={histSelectedIds.size === filteredHistory.length && filteredHistory.length > 0}
                          onChange={toggleAllHistory} />
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Generated Articles</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Content Type</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Project</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Updated</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredHistory.map(item => {
                      const ct = CONTENT_TYPES.find(c => c.key === item.content_type)
                      const ch = OUTPUT_CHANNELS.find(c => c.key === item.output_channel)
                      const dateStr = item.created_at ? new Date(item.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''
                      return (
                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-4">
                            <input type="checkbox" className="accent-red-500 rounded"
                              checked={histSelectedIds.has(item.id)}
                              onChange={() => toggleHistorySelect(item.id)} />
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-sm font-medium text-gray-900 leading-snug">
                              GEO - {ct?.label} | {item.title}
                            </p>
                            <span className="inline-block mt-1 text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded border border-gray-200">{ct?.label}</span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="inline-block text-[11px] px-2.5 py-1 bg-gray-100 text-gray-700 rounded border border-gray-200 font-medium">{ct?.label}</span>
                            <span className="block mt-1 text-[11px] px-2.5 py-1 bg-gray-100 text-gray-700 rounded border border-gray-200 font-medium w-fit">{ch?.label}</span>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-600">
                            TickTalk GEO Project
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-sm text-gray-700">{dateStr}</p>
                            <p className="text-xs text-gray-400">By {item.brand_name || 'User'}</p>
                          </td>
                          <td className="px-4 py-4 text-right space-y-1.5">
                            <button onClick={() => setViewOutputItem(item)}
                              className="block ml-auto px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors w-[120px]">
                              View Output
                            </button>
                            <button onClick={() => handleReuseStructure(item)}
                              className="block ml-auto px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors w-[120px]">
                              Reuse Structure
                            </button>
                            <a href="/dashboard/geo-distribution"
                              className="block ml-auto px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-xs font-medium text-green-700 hover:bg-green-100 transition-colors w-[120px] text-center">
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
                <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                  <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-2xl">
                    <div>
                      <h3 className="font-semibold text-gray-900">{viewOutputItem.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{CONTENT_TYPES.find(c => c.key === viewOutputItem.content_type)?.label}</span>
                        <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{OUTPUT_CHANNELS.find(c => c.key === viewOutputItem.output_channel)?.label}</span>
                        <span className={`text-xs font-bold font-mono ${viewOutputItem.geo_score >= 80 ? 'text-green-600' : viewOutputItem.geo_score >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>GEO: {viewOutputItem.geo_score}/100</span>
                      </div>
                    </div>
                    <button onClick={() => setViewOutputItem(null)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
                  </div>

                  {/* AI Prompt */}
                  {viewOutputItem.ai_prompt && (
                    <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">AI Prompt</p>
                      <p className="text-sm text-gray-700">{viewOutputItem.ai_prompt}</p>
                    </div>
                  )}

                  {/* TL;DR */}
                  <div className="px-6 py-3 bg-blue-50/50 border-b border-blue-100">
                    <p className="text-[10px] font-semibold text-blue-600 uppercase mb-1">TL;DR</p>
                    <p className="text-sm text-blue-900">{viewOutputItem.tldr}</p>
                  </div>

                  {/* Main Content */}
                  <div className="px-6 py-4">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase mb-2">Main Content</p>
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded-lg border border-gray-100 font-mono leading-relaxed max-h-[400px] overflow-y-auto">
                      {viewOutputItem.main_content_md}
                    </pre>
                  </div>

                  {/* Quality Checks */}
                  {viewOutputItem.quality_checks?.length > 0 && (
                    <div className="px-6 py-4 border-t border-gray-100">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase mb-2">Quality Checks</p>
                      <div className="space-y-1.5">
                        {viewOutputItem.quality_checks.map((qc, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            {qc.passed ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-400" />}
                            <span className={qc.passed ? 'text-gray-700' : 'text-red-600'}>{qc.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Footer actions */}
                  <div className="px-6 py-4 border-t border-gray-200 flex items-center gap-3 sticky bottom-0 bg-white rounded-b-2xl">
                    <button onClick={() => { handleReuseStructure(viewOutputItem); setViewOutputItem(null) }}
                      className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm font-medium flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5" /> Reuse Structure
                    </button>
                    <button onClick={() => { navigator.clipboard.writeText(viewOutputItem.main_content_md) }}
                      className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium flex items-center gap-1.5">
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
          const renderRuleList = (section: 'structural_contract' | 'risk_boundary' | 'geo_compliance', key: string, items: string[], bulletColor: string = 'text-gray-400') => (
            <div className="space-y-2">
              {items.map((item: string, i: number) => (
                <div key={i} className="flex items-center gap-2 group">
                  <span className={`${bulletColor} mt-0.5 flex-shrink-0`}>&#8226;</span>
                  {isEditing ? (
                    <>
                      <input value={item} onChange={(e) => updateRule(section, key, i, e.target.value)}
                        className="flex-1 text-sm text-gray-700 bg-transparent border-b border-gray-200 hover:border-gray-400 focus:border-red-400 focus:outline-none px-1 py-0.5 transition-colors" />
                      <button onClick={() => deleteRule(section, key, i)}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all flex-shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <span className="text-sm text-gray-700">{item}</span>
                  )}
                </div>
              ))}
              {isEditing && (
                <button onClick={() => addRule(section, key)}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 mt-1 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Add rule
                </button>
              )}
            </div>
          )

          return (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* ── Left sidebar: Templates navigation (3 cols) ── */}
              <div className="lg:col-span-3">
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100">
                    <h3 className="text-sm font-bold text-gray-700">Templates</h3>
                  </div>
                  <div className="p-2">
                    {CONTENT_TYPES.map(ct => (
                      <button key={ct.key} onClick={() => { if (adminDirty && !confirm('Discard unsaved changes?')) return; cancelEditing(); setAdminSelectedType(ct.key) }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-sm transition-all ${adminSelectedType === ct.key ? 'bg-gray-100 font-semibold text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${adminSelectedType === ct.key ? 'bg-gray-900' : 'bg-gray-300'}`} />
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
                  <h3 className="text-lg font-semibold text-gray-900">
                    {CONTENT_TYPES.find(c => c.key === adminSelectedType)?.label}
                  </h3>
                  {currentTemplate && !isEditing && (
                    <button onClick={startEditing}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200 hover:border-red-300 hover:bg-red-50 text-gray-600 hover:text-red-600 font-medium rounded-lg text-sm transition-all">
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                  )}
                  {isEditing && (
                    <span className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full font-medium">
                      <Edit3 className="w-3 h-3" />
                      Editing mode
                    </span>
                  )}
                </div>

                {adminLoading ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <Loader2 className="w-8 h-8 text-gray-300 animate-spin mx-auto" />
                  </div>
                ) : !currentTemplate ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <Settings className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">No template data loaded. Templates are fetched from the backend.</p>
                  </div>
                ) : (
                  <>
                    {/* ── Structural Contract ── */}
                    <div className={`bg-white rounded-xl border overflow-hidden ${isEditing ? 'border-amber-200' : 'border-gray-200'}`}>
                      <button onClick={() => toggleAdminSection('structural')}
                        className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                        <span className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                          {adminExpandedSections.includes('structural') ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                          Structural Contract
                        </span>
                        <ChevronDown className={`w-4 h-4 text-gray-300 transition-transform ${adminExpandedSections.includes('structural') ? '' : '-rotate-90'}`} />
                      </button>
                      {adminExpandedSections.includes('structural') && (
                        <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Mandatory Sections</p>
                            {renderRuleList('structural_contract', 'mandatory_sections', sc.mandatory_sections || [], 'text-gray-400')}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Explicitly Forbidden</p>
                            {renderRuleList('structural_contract', 'forbidden', sc.forbidden || [], 'text-gray-400')}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ── Risk Boundary ── */}
                    <div className={`bg-white rounded-xl border overflow-hidden ${isEditing ? 'border-amber-200' : 'border-gray-200'}`}>
                      <button onClick={() => toggleAdminSection('risk')}
                        className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                        <span className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                          {adminExpandedSections.includes('risk') ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                          Risk Boundary
                        </span>
                        <ChevronDown className={`w-4 h-4 text-gray-300 transition-transform ${adminExpandedSections.includes('risk') ? '' : '-rotate-90'}`} />
                      </button>
                      {adminExpandedSections.includes('risk') && (
                        <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-3">Forbidden</p>
                            {renderRuleList('risk_boundary', 'forbidden', rb.forbidden || [], 'text-red-400')}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-green-600 uppercase tracking-wider mb-3">Allowed</p>
                            {renderRuleList('risk_boundary', 'allowed', rb.allowed || [], 'text-green-400')}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ── GEO Compliance ── */}
                    <div className={`bg-white rounded-xl border overflow-hidden ${isEditing ? 'border-amber-200' : 'border-gray-200'}`}>
                      <button onClick={() => toggleAdminSection('geo')}
                        className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                        <span className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                          {adminExpandedSections.includes('geo') ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                          GEO Compliance
                        </span>
                        <ChevronDown className={`w-4 h-4 text-gray-300 transition-transform ${adminExpandedSections.includes('geo') ? '' : '-rotate-90'}`} />
                      </button>
                      {adminExpandedSections.includes('geo') && (
                        <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">Citation Safety</p>
                            {renderRuleList('geo_compliance', 'citation_safety', gc.citation_safety || [], 'text-blue-400')}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-3">Answer Engine Readiness</p>
                            {renderRuleList('geo_compliance', 'answer_engine_readiness', gc.answer_engine_readiness || [], 'text-purple-400')}
                            <div className="mt-4">
                              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Model Safety</p>
                              <p className="text-xs text-gray-400 italic">Reserved for future model strategy rules.</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ── Save / Cancel buttons ── */}
                    {isEditing && (
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-400">
                          {adminDirty ? 'You have unsaved changes.' : 'No changes yet.'}
                        </p>
                        <div className="flex items-center gap-3">
                          <button onClick={cancelEditing}
                            className="px-5 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 font-medium rounded-lg text-sm transition-colors">
                            Cancel
                          </button>
                          <button onClick={handleSave} disabled={!adminDirty || adminSaving}
                            className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg text-sm transition-all flex items-center gap-2">
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
