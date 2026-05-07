'use client'

import {
  createContext, useContext, useState, useEffect, useCallback, useMemo, useRef,
  type ReactNode,
} from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  api,
  notifyCreditUsed,
  MonitorScanResult,
  MonitorPrompt,
  GapAnalysisResult,
  AdvancedMentionAnalysis,
  CompetitiveIntelReport,
  MultiBrandTrendData,
  AEOContentScore,
  DiscoverResult,
} from '@/lib/api'
import {
  BRAND_CONFIG_KEY,
  SCAN_RESULTS_KEY,
  SCAN_HISTORY_KEY,
  GAP_RESULTS_KEY,
  ADV_MENTIONS_KEY,
  RECENT_BRANDS_KEY,
  autoClassify,
  type BrandConfig,
  type ScanHistoryEntry,
  type RecentBrandRecord,
} from './shared/constants'
import { formatDate } from './shared/ChartComponents'

// ─── Tab type ────────────────────────────────────────

export type TabKey =
  | 'visibility' | 'discover' | 'prompts' | 'mentions' | 'citations' | 'sentiment'
  | 'competitors' | 'gap_analysis' | 'shopping' | 'personas'

// ─── Context shape ───────────────────────────────────

interface UnifiedState {
  // Brand config
  brandConfig: BrandConfig
  setBrandConfig: (c: BrandConfig) => void
  isConfigured: boolean
  showConfig: boolean
  setShowConfig: (v: boolean) => void
  configError: string
  recentBrands: RecentBrandRecord[]
  loadRecentBrand: (r: RecentBrandRecord) => void
  clearRecentBrands: () => void
  handleSaveConfig: () => void
  handleClearConfig: () => void

  // Date / filter
  datePreset: '7d' | '30d' | '90d' | 'custom'
  handleDatePreset: (p: '7d' | '30d' | '90d' | 'custom') => void
  startDate: string
  setStartDate: (s: string) => void
  endDate: string
  setEndDate: (s: string) => void
  filterTimeRange: '7d' | '30d' | '90d' | 'all'
  setFilterTimeRange: (v: '7d' | '30d' | '90d' | 'all') => void
  filterModel: string
  setFilterModel: (v: string) => void

  // Scan state
  scanResult: MonitorScanResult | null
  isScanning: boolean
  scanStep: number
  scanError: string
  handleRunScan: (isOnboarding?: boolean) => void
  handleStopScan: () => void
  scanHistory: ScanHistoryEntry[]
  filteredScanHistory: ScanHistoryEntry[]
  metricTrends: Record<string, number> | null

  // Geo-monitor analysis
  gapResult: GapAnalysisResult | null
  isRunningGap: boolean
  gapError: string
  handleRunGapAnalysis: () => void
  handleStopGapAnalysis: () => void

  advancedMentions: AdvancedMentionAnalysis | null
  isRunningAdvMentions: boolean
  advMentionsError: string
  handleRunAdvancedMentions: () => void
  handleStopAdvMentions: () => void

  intelReport: CompetitiveIntelReport | null
  isGeneratingReport: boolean
  reportError: string
  handleGenerateReport: () => void
  handleStopReport: () => void

  multiBrandTrends: MultiBrandTrendData | null
  isLoadingTrends: boolean

  // Discover
  discoverResult: DiscoverResult | null
  isRunningDiscover: boolean
  discoverError: string
  discoverEngine: string
  setDiscoverEngine: (engine: string) => void
  availableEngines: string[]
  handleRunDiscover: () => void
  handleStopDiscover: () => void

  // AEO
  aeoUrl: string
  setAeoUrl: (v: string) => void
  aeoResult: AEOContentScore | null
  aeoHistory: AEOContentScore[]
  isRunningAeo: boolean
  aeoError: string
  handleRunAeo: () => void

  // Prompts
  prompts: MonitorPrompt[]
  isLoadingPrompts: boolean
  loadPrompts: () => void
  showAddPrompt: boolean
  setShowAddPrompt: (v: boolean) => void
  newPromptForm: { template: string }
  setNewPromptForm: (v: { template: string }) => void
  editingPrompt: MonitorPrompt | null
  setEditingPrompt: (p: MonitorPrompt | null) => void
  promptError: string
  setPromptError: (e: string) => void
  handleAddPrompt: () => void
  handleUpdatePrompt: () => void
  handleTogglePrompt: (id: string, active: boolean) => void
  handleDeletePrompt: (id: string) => void
  togglingPromptId: string | null
  promptFilter: 'active' | 'inactive' | 'all'
  setPromptFilter: (v: 'active' | 'inactive' | 'all') => void
  filterTopic: string
  setFilterTopic: (v: string) => void
  filteredPrompts: MonitorPrompt[]
  selectedPromptIds: Set<string>
  togglePromptSelect: (id: string) => void
  toggleSelectAllPrompts: () => void
  handleBatchDelete: () => void
  cancelBatchDelete: () => void
  isBatchDeleting: boolean
  batchConfirmStep: boolean

  // Tab
  activeTab: TabKey
  setActiveTab: (t: TabKey) => void

  // Sub-tabs
  citationsSubTab: 'sources_overview' | 'url_detail'
  setCitationsSubTab: (v: 'sources_overview' | 'url_detail') => void
  competitorsSubTab: 'co_mention' | 'competitor_sov' | 'by_platform'
  setCompetitorsSubTab: (v: 'co_mention' | 'competitor_sov' | 'by_platform') => void
  coMentionRoleFilter: 'all' | 'competitor' | 'complementary'
  setCoMentionRoleFilter: (v: 'all' | 'competitor' | 'complementary') => void
}

const UnifiedContext = createContext<UnifiedState | null>(null)

export function useUnified() {
  const ctx = useContext(UnifiedContext)
  if (!ctx) throw new Error('useUnified must be inside UnifiedProvider')
  return ctx
}

// ─── Provider ────────────────────────────────────────

export function UnifiedProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()

  // ── Tab ─────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabKey>('visibility')
  const [citationsSubTab, setCitationsSubTab] = useState<'sources_overview' | 'url_detail'>('sources_overview')
  const [competitorsSubTab, setCompetitorsSubTab] = useState<'co_mention' | 'competitor_sov' | 'by_platform'>('co_mention')
  const [coMentionRoleFilter, setCoMentionRoleFilter] = useState<'all' | 'competitor' | 'complementary'>('all')

  // ── Brand config ────────────────────────────────
  const [brandConfig, setBrandConfig] = useState<BrandConfig>({ brand_name: '', domain: '', keywords: [], competitors: [], one_liner: '', target_audience: '', target_market: '', differentiation: '' })
  const [isConfigured, setIsConfigured] = useState(false)
  const [showConfig, setShowConfig] = useState(true)
  const [configError, setConfigError] = useState('')
  const [recentBrands, setRecentBrands] = useState<RecentBrandRecord[]>([])

  // ── Date / Filter ───────────────────────────────
  const [datePreset, setDatePreset] = useState<'7d' | '30d' | '90d' | 'custom'>('30d')
  const [startDate, setStartDate] = useState(() => formatDate(new Date(Date.now() - 90 * 86400000)))
  const [endDate, setEndDate] = useState(() => formatDate(new Date()))
  const [filterTimeRange, setFilterTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('all')
  const [filterModel, setFilterModel] = useState('chatgpt')

  const handleDatePreset = (preset: '7d' | '30d' | '90d' | 'custom') => {
    setDatePreset(preset)
    if (preset !== 'custom') {
      const days = { '7d': 7, '30d': 30, '90d': 90 }[preset]
      setStartDate(formatDate(new Date(Date.now() - days * 86400000)))
      setEndDate(formatDate(new Date()))
    }
  }

  // ── Scan state ──────────────────────────────────
  const [scanResult, setScanResult] = useState<MonitorScanResult | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [scanStep, setScanStep] = useState(0)
  const [scanError, setScanError] = useState('')
  const [scanHistory, setScanHistory] = useState<ScanHistoryEntry[]>([])

  // ── Geo-monitor analysis state ──────────────────
  const [gapResult, setGapResult] = useState<GapAnalysisResult | null>(null)
  const [isRunningGap, setIsRunningGap] = useState(false)
  const [gapError, setGapError] = useState('')
  const [advancedMentions, setAdvancedMentions] = useState<AdvancedMentionAnalysis | null>(null)
  const [isRunningAdvMentions, setIsRunningAdvMentions] = useState(false)
  const [advMentionsError, setAdvMentionsError] = useState('')
  const [intelReport, setIntelReport] = useState<CompetitiveIntelReport | null>(null)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [reportError, setReportError] = useState('')
  const [multiBrandTrends, setMultiBrandTrends] = useState<MultiBrandTrendData | null>(null)
  const [isLoadingTrends, setIsLoadingTrends] = useState(false)

  // ── AEO ─────────────────────────────────────────
  const [aeoUrl, setAeoUrl] = useState('')
  const [aeoResult, setAeoResult] = useState<AEOContentScore | null>(null)
  const [aeoHistory, setAeoHistory] = useState<AEOContentScore[]>([])
  const [isRunningAeo, setIsRunningAeo] = useState(false)
  const [aeoError, setAeoError] = useState('')

  // ── Prompts ─────────────────────────────────────
  const [prompts, setPrompts] = useState<MonitorPrompt[]>([])
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false)
  const [showAddPrompt, setShowAddPrompt] = useState(false)
  const [newPromptForm, setNewPromptForm] = useState({ template: '' })
  const [editingPrompt, setEditingPrompt] = useState<MonitorPrompt | null>(null)
  const [promptError, setPromptError] = useState('')
  const [togglingPromptId, setTogglingPromptId] = useState<string | null>(null)
  const [promptFilter, setPromptFilter] = useState<'active' | 'inactive' | 'all'>('active')
  const [filterTopic, setFilterTopic] = useState('all')
  const [selectedPromptIds, setSelectedPromptIds] = useState<Set<string>>(new Set())
  const [isBatchDeleting, setIsBatchDeleting] = useState(false)
  const [batchConfirmStep, setBatchConfirmStep] = useState(false)

  // ── Discover ─────────────────────────────────────
  const [discoverResult, setDiscoverResult] = useState<DiscoverResult | null>(null)
  const [isRunningDiscover, setIsRunningDiscover] = useState(false)
  const [discoverError, setDiscoverError] = useState('')
  const [discoverEngine, setDiscoverEngine] = useState('chatgpt')
  const [availableEngines, setAvailableEngines] = useState<string[]>(['chatgpt'])

  // ── Abort controllers ───────────────────────────
  const scanAbortRef = useRef<AbortController | null>(null)
  const scanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const gapAbortRef = useRef<AbortController | null>(null)
  const advMentionsAbortRef = useRef<AbortController | null>(null)
  const reportAbortRef = useRef<AbortController | null>(null)
  const discoverAbortRef = useRef<AbortController | null>(null)
  const autoScanTriggered = useRef(false)

  // ── Filtered prompts ────────────────────────────
  const filteredPrompts = useMemo(() => {
    let list = prompts
    if (promptFilter === 'inactive') list = list.filter(p => !p.is_active)
    else if (promptFilter === 'active') list = list.filter(p => p.is_active)
    if (filterTopic !== 'all') {
      const OLD_TO_NEW: Record<string, string> = { recommendation: 'action_choice', comparison: 'comparison_decision', information: 'info_cognition', review: 'comparison_decision', howto: 'action_choice' }
      list = list.filter(p => { const cat = OLD_TO_NEW[p.category] || p.category; return cat === filterTopic })
    }
    list = [...list].sort((a, b) => (b.mention_rate ?? -1) - (a.mention_rate ?? -1))
    return list
  }, [prompts, promptFilter, filterTopic])

  // ── Filtered scan history ───────────────────────
  const filteredScanHistory = useMemo(() => {
    if (filterTimeRange === 'all') return scanHistory
    const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 }
    const days = daysMap[filterTimeRange] || 0
    if (!days) return scanHistory
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    return scanHistory.filter(s => s.date >= cutoff)
  }, [scanHistory, filterTimeRange])

  const metricTrends = useMemo(() => {
    if (filteredScanHistory.length < 2) return null
    const oldest = filteredScanHistory[0]
    const latest = filteredScanHistory[filteredScanHistory.length - 1]
    return {
      visibilityDelta: latest.visibility_score - oldest.visibility_score,
      mentionsDelta: latest.mentions_found - oldest.mentions_found,
      citationDelta: latest.citation_count - oldest.citation_count,
      positivePctDelta: Math.round((latest.positive_pct || 0) - (oldest.positive_pct || 0)),
      prominenceDelta: Math.round((latest.prominence_score ?? 0) - (oldest.prominence_score ?? 0)),
      citationShareDelta: Math.round((latest.citation_share ?? 0) - (oldest.citation_share ?? 0)),
      sovDelta: Math.round((latest.sov_pct ?? 0) - (oldest.sov_pct ?? 0)),
      citationAuthorityDelta: Math.round((latest.citation_authority ?? 0) - (oldest.citation_authority ?? 0)),
    }
  }, [filteredScanHistory])

  // ═══ Load localStorage on mount ═══

  useEffect(() => {
    try {
      const saved = localStorage.getItem(BRAND_CONFIG_KEY)
      if (saved) {
        const config = JSON.parse(saved) as BrandConfig
        if (config.brand_name) {
          setBrandConfig(config)
          setIsConfigured(true)
          setShowConfig(false)
        }
      }
      const savedResults = localStorage.getItem(SCAN_RESULTS_KEY)
      if (savedResults) setScanResult(JSON.parse(savedResults))
      const savedHistory = localStorage.getItem(SCAN_HISTORY_KEY)
      if (savedHistory) setScanHistory(JSON.parse(savedHistory))
      const savedGap = localStorage.getItem(GAP_RESULTS_KEY)
      if (savedGap) setGapResult(JSON.parse(savedGap))
      const savedAdvMentions = localStorage.getItem(ADV_MENTIONS_KEY)
      if (savedAdvMentions) setAdvancedMentions(JSON.parse(savedAdvMentions))
      const savedRecent = localStorage.getItem(RECENT_BRANDS_KEY)
      if (savedRecent) setRecentBrands(JSON.parse(savedRecent))
      const params = new URLSearchParams(window.location.search)
      if (params.get('autoScan') === 'true' && !autoScanTriggered.current) {
        autoScanTriggered.current = true
        window.history.replaceState({}, '', window.location.pathname)
      }
    } catch { /* ignore */ }
  }, [])

  // ═══ Brand config handlers ═══════════════════════

  const saveRecentBrand = useCallback(() => {
    if (!brandConfig.brand_name.trim()) return
    const entry: RecentBrandRecord = { brand_name: brandConfig.brand_name.trim(), domain: brandConfig.domain.trim(), keywords: brandConfig.keywords, competitors: brandConfig.competitors, one_liner: brandConfig.one_liner, target_audience: brandConfig.target_audience, target_market: brandConfig.target_market, differentiation: brandConfig.differentiation, usedAt: new Date().toISOString() }
    setRecentBrands(prev => {
      const filtered = prev.filter(r => !(r.brand_name === entry.brand_name && r.domain === entry.domain))
      const updated = [entry, ...filtered].slice(0, 10)
      localStorage.setItem(RECENT_BRANDS_KEY, JSON.stringify(updated))
      return updated
    })
  }, [brandConfig])

  const loadRecentBrand = (rec: RecentBrandRecord) => {
    setBrandConfig({ brand_name: rec.brand_name, domain: rec.domain, keywords: rec.keywords, competitors: rec.competitors, one_liner: rec.one_liner ?? '', target_audience: rec.target_audience ?? '', target_market: rec.target_market ?? '', differentiation: rec.differentiation ?? '' })
  }

  const clearRecentBrands = () => { localStorage.removeItem(RECENT_BRANDS_KEY); setRecentBrands([]) }

  const handleSaveConfig = () => {
    if (!brandConfig.brand_name.trim()) { setConfigError('Brand name is required'); return }
    setConfigError('')
    localStorage.setItem(BRAND_CONFIG_KEY, JSON.stringify(brandConfig))
    setIsConfigured(true); setShowConfig(false)
    saveRecentBrand()
  }

  const handleClearConfig = () => {
    localStorage.removeItem(BRAND_CONFIG_KEY); localStorage.removeItem(SCAN_RESULTS_KEY)
    localStorage.removeItem(SCAN_HISTORY_KEY); localStorage.removeItem(GAP_RESULTS_KEY); localStorage.removeItem(ADV_MENTIONS_KEY)
    setBrandConfig({ brand_name: '', domain: '', keywords: [], competitors: [], one_liner: '', target_audience: '', target_market: '', differentiation: '' })
    setIsConfigured(false); setShowConfig(true)
    setScanResult(null); setScanHistory([]); setGapResult(null); setAdvancedMentions(null); setIntelReport(null)
  }

  // ═══ Scan handlers ═══════════════════════════════

  const loadPrompts = useCallback(async () => {
    setIsLoadingPrompts(true)
    try { const res = await api.getMonitorPrompts(); if (res.data) setPrompts(res.data) } catch { /* ignore */ }
    setIsLoadingPrompts(false)
  }, [])

  useEffect(() => { loadPrompts() }, [loadPrompts])

  useEffect(() => {
    api.getAvailableEngines().then(res => {
      if (res.data?.engines?.length) setAvailableEngines(res.data.engines)
    }).catch(() => { /* keep default */ })
  }, [])

  const autoTriggerAdvancedMentions = async () => {
    advMentionsAbortRef.current?.abort()
    const ctrl = new AbortController()
    advMentionsAbortRef.current = ctrl
    setIsRunningAdvMentions(true); setAdvMentionsError('')
    try {
      const res = await api.runAdvancedMentionAnalysis({ brand_name: brandConfig.brand_name, domain: brandConfig.domain, keywords: brandConfig.keywords, competitors: brandConfig.competitors }, ctrl.signal, user?.id)
      if (res.error === '__ABORTED__') { setIsRunningAdvMentions(false); return }
      if (res.error) { setAdvMentionsError(res.error) } else if (res.data) { setAdvancedMentions(res.data); localStorage.setItem(ADV_MENTIONS_KEY, JSON.stringify(res.data)) }
    } catch (e: any) { if (e.name !== 'AbortError') setAdvMentionsError(e.message || 'Auto advanced analysis failed') }
    advMentionsAbortRef.current = null; setIsRunningAdvMentions(false)
  }

  const handleRunScan = async (isOnboarding?: boolean) => {
    if (!brandConfig.brand_name) return
    scanAbortRef.current?.abort()
    const controller = new AbortController()
    scanAbortRef.current = controller
    setIsScanning(true); setScanError(''); setScanStep(0)
    const activeCount = prompts.filter(p => p.is_active).length || 8
    scanTimerRef.current = setInterval(() => { setScanStep(prev => prev < activeCount ? prev + 1 : prev) }, 3000)
    try {
      const res = await api.runMonitorScan({ brand_name: brandConfig.brand_name, domain: brandConfig.domain, keywords: brandConfig.keywords, competitors: brandConfig.competitors }, controller.signal, user?.id, isOnboarding)
      if (scanTimerRef.current) { clearInterval(scanTimerRef.current); scanTimerRef.current = null }
      if (res.error === '__ABORTED__') { setIsScanning(false); return }
      if (res.error) { setScanError(res.error) } else if (res.data) {
        setScanResult(res.data); localStorage.setItem(SCAN_RESULTS_KEY, JSON.stringify(res.data))
        // Notify Overview page to reload with latest scan data
        window.dispatchEvent(new CustomEvent('scanCompleted'))
        const _mentioned = res.data.mention_results.filter(m => m.mentioned)
        const _prominence = _mentioned.length > 0 ? Math.round((_mentioned.reduce((s, m) => s + m.position_score, 0) / _mentioned.length) * 100) : 0
        const _citShare = Math.round(res.data.source_domains.find(d => d.domain_type === 'you')?.frequency_pct ?? 0)
        const _sovPct = Math.round(res.data.share_of_voice?.[brandConfig.brand_name] ?? 0)
        const entry: ScanHistoryEntry = { scan_id: res.data.scan_id, date: res.data.scanned_at, visibility_score: res.data.visibility_score, mentions_found: res.data.mentions_found, total_prompts: res.data.total_prompts, citation_count: res.data.citation_count, positive_pct: res.data.sentiment_breakdown.positive_pct, prominence_score: _prominence, citation_share: _citShare, sov_pct: _sovPct, citation_authority: res.data.citation_authority_score ?? 0, engines_used: res.data.engines_used ?? ['chatgpt'] }
        const newHist = [...scanHistory, entry].slice(-30); setScanHistory(newHist); localStorage.setItem(SCAN_HISTORY_KEY, JSON.stringify(newHist))
        if (!isOnboarding) notifyCreditUsed()
        await loadPrompts()
        autoTriggerAdvancedMentions()
      }
    } catch (e: any) { if (scanTimerRef.current) { clearInterval(scanTimerRef.current); scanTimerRef.current = null }; if (e.name !== 'AbortError') setScanError(e.message || 'Scan failed') }
    scanAbortRef.current = null; setIsScanning(false)
  }
  const handleStopScan = () => { scanAbortRef.current?.abort(); scanAbortRef.current = null; if (scanTimerRef.current) { clearInterval(scanTimerRef.current); scanTimerRef.current = null }; setIsScanning(false); setScanStep(0) }

  // ── Auto-scan from onboarding ───────────────────
  useEffect(() => {
    if (autoScanTriggered.current && isConfigured && brandConfig.brand_name && !scanResult && !isScanning) {
      autoScanTriggered.current = false
      handleRunScan(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConfigured, brandConfig.brand_name])

  // ── Multi-brand trends ──────────────────────────
  const loadMultiBrandTrends = useCallback(async () => {
    if (!isConfigured || !brandConfig.brand_name) return
    setIsLoadingTrends(true)
    try {
      const res = await api.getMultiBrandTrends(brandConfig.brand_name, brandConfig.competitors, filterTimeRange)
      if (res.data) setMultiBrandTrends(res.data)
    } catch { /* ignore */ }
    setIsLoadingTrends(false)
  }, [isConfigured, brandConfig.brand_name, brandConfig.competitors, filterTimeRange])

  useEffect(() => { if (scanResult) loadMultiBrandTrends() }, [scanResult, loadMultiBrandTrends])

  // ═══ Gap Analysis ════════════════════════════════

  const handleRunGapAnalysis = async () => {
    if (!brandConfig.brand_name || brandConfig.competitors.length === 0) { setGapError('Add at least one competitor'); return }
    gapAbortRef.current?.abort()
    const controller = new AbortController()
    gapAbortRef.current = controller
    setIsRunningGap(true); setGapError('')
    try {
      const res = await api.runGapAnalysis({ brand_name: brandConfig.brand_name, domain: brandConfig.domain, keywords: brandConfig.keywords, competitors: brandConfig.competitors }, controller.signal, user?.id)
      if (res.error === '__ABORTED__') { setIsRunningGap(false); return }
      if (res.error) { setGapError(res.error) } else if (res.data) { setGapResult(res.data); localStorage.setItem(GAP_RESULTS_KEY, JSON.stringify(res.data)); notifyCreditUsed() }
    } catch (e: any) { if (e.name !== 'AbortError') setGapError(e.message || 'Gap analysis failed') }
    gapAbortRef.current = null; setIsRunningGap(false)
  }
  const handleStopGapAnalysis = () => { gapAbortRef.current?.abort(); gapAbortRef.current = null; setIsRunningGap(false) }

  // ═══ Advanced Mentions ═══════════════════════════

  const handleRunAdvancedMentions = async () => {
    advMentionsAbortRef.current?.abort()
    const controller = new AbortController()
    advMentionsAbortRef.current = controller
    setIsRunningAdvMentions(true); setAdvMentionsError('')
    try {
      const res = await api.runAdvancedMentionAnalysis({ brand_name: brandConfig.brand_name, domain: brandConfig.domain, keywords: brandConfig.keywords, competitors: brandConfig.competitors }, controller.signal, user?.id)
      if (res.error === '__ABORTED__') { setIsRunningAdvMentions(false); return }
      if (res.error) { setAdvMentionsError(res.error) } else if (res.data) { setAdvancedMentions(res.data); localStorage.setItem(ADV_MENTIONS_KEY, JSON.stringify(res.data)); notifyCreditUsed() }
    } catch (e: any) { if (e.name !== 'AbortError') setAdvMentionsError(e.message || 'Analysis failed') }
    advMentionsAbortRef.current = null; setIsRunningAdvMentions(false)
  }
  const handleStopAdvMentions = () => { advMentionsAbortRef.current?.abort(); advMentionsAbortRef.current = null; setIsRunningAdvMentions(false) }

  // ═══ Intel Report ════════════════════════════════

  const handleGenerateReport = async () => {
    if (brandConfig.competitors.length === 0) { setReportError('Add at least one competitor'); return }
    reportAbortRef.current?.abort()
    const controller = new AbortController()
    reportAbortRef.current = controller
    setIsGeneratingReport(true); setReportError('')
    try {
      const res = await api.generateIntelReport({ brand_name: brandConfig.brand_name, domain: brandConfig.domain, keywords: brandConfig.keywords, competitors: brandConfig.competitors }, controller.signal, user?.id)
      if (res.error === '__ABORTED__') { setIsGeneratingReport(false); return }
      if (res.error) { setReportError(res.error) } else if (res.data) { setIntelReport(res.data); notifyCreditUsed() }
    } catch (e: any) { if (e.name !== 'AbortError') setReportError(e.message || 'Report generation failed') }
    reportAbortRef.current = null; setIsGeneratingReport(false)
  }
  const handleStopReport = () => { reportAbortRef.current?.abort(); reportAbortRef.current = null; setIsGeneratingReport(false) }

  // ═══ AEO ═════════════════════════════════════════

  const handleRunAeo = async () => {
    if (!aeoUrl.trim()) { setAeoError('Enter a URL'); return }
    setIsRunningAeo(true); setAeoError('')
    try {
      const res = await api.runAEOScore(aeoUrl.trim(), user?.id)
      if (res.error) { setAeoError(res.error) } else if (res.data) {
        setAeoResult(res.data)
        setAeoHistory(prev => [res.data!, ...prev.filter(h => h.url !== res.data!.url)].slice(0, 20))
        notifyCreditUsed()
      }
    } catch (e: any) { setAeoError(e.message || 'AEO scoring failed') }
    setIsRunningAeo(false)
  }

  // ═══ Prompt handlers ═════════════════════════════

  const isDuplicatePrompt = (text: string, excludeId?: string): boolean => {
    const normalized = text.trim().toLowerCase()
    return prompts.some(p => p.template.trim().toLowerCase() === normalized && p.id !== excludeId)
  }

  const handleAddPrompt = async () => {
    if (!newPromptForm.template.trim()) return
    setPromptError('')
    if (isDuplicatePrompt(newPromptForm.template)) { setPromptError('Prompt already exists.'); return }
    try {
      const { category } = autoClassify(newPromptForm.template)
      const res = await api.createMonitorPrompt({ template: newPromptForm.template, category })
      if (res.error) { setPromptError(res.error); return }
      await loadPrompts(); setNewPromptForm({ template: '' }); setShowAddPrompt(false)
    } catch (e: any) { setPromptError(e.message) }
  }

  const handleUpdatePrompt = async () => {
    if (!editingPrompt) return
    setPromptError('')
    if (isDuplicatePrompt(editingPrompt.template, editingPrompt.id)) { setPromptError('Prompt already exists.'); return }
    try {
      const { category } = autoClassify(editingPrompt.template)
      const res = await api.updateMonitorPrompt(editingPrompt.id, { template: editingPrompt.template, category })
      if (res.error) { setPromptError(res.error); return }
      await loadPrompts(); setEditingPrompt(null)
    } catch (e: any) { setPromptError(e.message) }
  }

  const handleTogglePrompt = async (id: string, active: boolean) => {
    setTogglingPromptId(id)
    try { const res = await api.toggleMonitorPrompt(id); if (res.data) setPrompts(prev => prev.map(p => p.id === id ? { ...p, is_active: !active } : p)); await loadPrompts() } catch { /* ignore */ }
    setTogglingPromptId(null)
  }

  const handleDeletePrompt = async (id: string) => {
    setPrompts(prev => prev.filter(p => p.id !== id))
    await api.deleteMonitorPrompt(id)
    try { const res = await api.getMonitorPrompts(); if (res.data) setPrompts(res.data) } catch { /* ignore */ }
  }

  const togglePromptSelect = (id: string) => { setSelectedPromptIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next }); setBatchConfirmStep(false) }
  const toggleSelectAllPrompts = () => { setSelectedPromptIds(prev => prev.size === filteredPrompts.length ? new Set() : new Set(filteredPrompts.map(p => p.id))); setBatchConfirmStep(false) }
  const handleBatchDelete = async () => {
    if (selectedPromptIds.size === 0) return
    if (!batchConfirmStep) { setBatchConfirmStep(true); return }
    const idsToDelete = Array.from(selectedPromptIds)
    setPrompts(prev => prev.filter(p => !selectedPromptIds.has(p.id)))
    setSelectedPromptIds(new Set()); setBatchConfirmStep(false); setIsBatchDeleting(true)
    try { await api.batchDeleteMonitorPrompts(idsToDelete) } catch { /* ignore */ }
    try { const res = await api.getMonitorPrompts(); if (res.data) setPrompts(res.data) } catch { /* ignore */ }
    setIsBatchDeleting(false)
  }
  const cancelBatchDelete = () => { setBatchConfirmStep(false) }

  // ═══ Discover ════════════════════════════════════

  const handleRunDiscover = async () => {
    if (!brandConfig.brand_name) return
    discoverAbortRef.current?.abort()
    const ctrl = new AbortController()
    discoverAbortRef.current = ctrl
    setIsRunningDiscover(true); setDiscoverError('')
    try {
      const res = await api.runDiscover({
        brand_name: brandConfig.brand_name,
        domain: brandConfig.domain,
        one_liner: brandConfig.one_liner,
        target_audience: brandConfig.target_audience,
        target_market: brandConfig.target_market,
        differentiation: brandConfig.differentiation,
        keywords: brandConfig.keywords,
        competitors: brandConfig.competitors,
        engines: [discoverEngine],
      }, ctrl.signal, user?.id)
      if (res.error === '__ABORTED__') { setIsRunningDiscover(false); return }
      if (res.error) { setDiscoverError(res.error) } else if (res.data) {
        setDiscoverResult(res.data)
        notifyCreditUsed()
      }
    } catch (e: any) { if (e.name !== 'AbortError') setDiscoverError(e.message || 'Discovery failed') }
    discoverAbortRef.current = null; setIsRunningDiscover(false)
  }
  const handleStopDiscover = () => { discoverAbortRef.current?.abort(); discoverAbortRef.current = null; setIsRunningDiscover(false) }

  // ═══ Context value ═══════════════════════════════

  const value: UnifiedState = {
    brandConfig, setBrandConfig, isConfigured, showConfig, setShowConfig, configError, recentBrands,
    loadRecentBrand, clearRecentBrands, handleSaveConfig, handleClearConfig,
    datePreset, handleDatePreset, startDate, setStartDate, endDate, setEndDate,
    filterTimeRange, setFilterTimeRange, filterModel, setFilterModel,
    scanResult, isScanning, scanStep, scanError, handleRunScan, handleStopScan,
    scanHistory, filteredScanHistory, metricTrends,
    gapResult, isRunningGap, gapError, handleRunGapAnalysis, handleStopGapAnalysis,
    advancedMentions, isRunningAdvMentions, advMentionsError, handleRunAdvancedMentions, handleStopAdvMentions,
    intelReport, isGeneratingReport, reportError, handleGenerateReport, handleStopReport,
    multiBrandTrends, isLoadingTrends,
    discoverResult, isRunningDiscover, discoverError, discoverEngine, setDiscoverEngine, availableEngines, handleRunDiscover, handleStopDiscover,
    aeoUrl, setAeoUrl, aeoResult, aeoHistory, isRunningAeo, aeoError, handleRunAeo,
    prompts, isLoadingPrompts, loadPrompts, showAddPrompt, setShowAddPrompt,
    newPromptForm, setNewPromptForm, editingPrompt, setEditingPrompt,
    promptError, setPromptError, handleAddPrompt, handleUpdatePrompt,
    handleTogglePrompt, handleDeletePrompt, togglingPromptId,
    promptFilter, setPromptFilter, filterTopic, setFilterTopic, filteredPrompts,
    selectedPromptIds, togglePromptSelect, toggleSelectAllPrompts,
    handleBatchDelete, cancelBatchDelete, isBatchDeleting, batchConfirmStep,
    activeTab, setActiveTab,
    citationsSubTab, setCitationsSubTab, competitorsSubTab, setCompetitorsSubTab,
    coMentionRoleFilter, setCoMentionRoleFilter,
  }

  return <UnifiedContext.Provider value={value}>{children}</UnifiedContext.Provider>
}
