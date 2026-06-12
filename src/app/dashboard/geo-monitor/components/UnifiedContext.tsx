'use client'

import {
  createContext, useContext, useState, useEffect, useCallback, useMemo, useRef,
  type ReactNode,
} from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  api,
  customersApi,
  CustomerSummary,
  WarehouseSummary,
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
  DISCOVER_RESULT_KEY,
  ACTIVE_CUSTOMER_KEY,
  ACTIVE_CUSTOMER_EVENT,
  CUSTOMER_CACHE_KEY,
  CUSTOMER_PROFILE_CONFIRMED_KEY,
  SNAPSHOTS_KEY,
  autoClassify,
  sanitizeBrandConfig,
  type BrandConfig,
  type ScanHistoryEntry,
  type RecentBrandRecord,
  type ReportSnapshot,
} from './shared/constants'
import { formatDate } from './shared/ChartComponents'

// ─── Client-side domain re-classification ───────────────────────────────────
// Re-classifies YOU/CORPORATE/COMPETITOR from brand config without a backend
// round-trip. Applied after loading from localStorage and after API cache hits
// so stale domain_type values don't persist across brand config changes.
function applyBrandClassification(
  result: DiscoverResult,
  brandDomain: string,
  competitors: string[],
): DiscoverResult {
  if (!result?.source_domains?.length) return result

  // Normalize: "https://us.ecoflow.com/" → "us.ecoflow.com"
  const bd = brandDomain.toLowerCase()
    .replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].trim()

  // Registered-domain family for sibling/parent detection.
  // "us.ecoflow.com" → "ecoflow.com"  (works for .com/.io/.ai/etc.)
  const bdParts = bd.split('.')
  const bdRegistered = bdParts.length > 2 ? bdParts.slice(-2).join('.') : bd

  const compSlugs = competitors.map(c => c.toLowerCase().replace(/[\s&.]/g, ''))

  const recl = result.source_domains.map(item => {
    const d = item.domain.toLowerCase()

    if (bd) {
      // Rule 1: exact configured domain → YOU (geo-subdomains like us.* are YOU)
      if (d === bd) return { ...item, domain_type: 'you' }

      // Rule 2: sub-path of configured domain → CORPORATE
      if (d.endsWith('.' + bd)) return { ...item, domain_type: 'corporate' }

      // Rule 3: registered-domain family (parent + siblings) → CORPORATE
      // e.g. bd="us.ecoflow.com" → bdRegistered="ecoflow.com"
      // so ecoflow.com and uk.ecoflow.com both → CORPORATE
      if (bdRegistered !== bd && (d === bdRegistered || d.endsWith('.' + bdRegistered))) {
        return { ...item, domain_type: 'corporate' }
      }
    }

    // COMPETITOR — slug appears in registered domain
    const dSlug = d.replace(/\./g, '')
    for (const slug of compSlugs) {
      if (slug && dSlug.includes(slug)) {
        return { ...item, domain_type: 'competitor' }
      }
    }

    return item
  })

  return { ...result, source_domains: recl }
}

// ─── Tab type ────────────────────────────────────────

export type TabKey =
  | 'visibility' | 'discover' | 'prompts' | 'mentions' | 'citations' | 'sentiment'
  | 'competitors' | 'gap_analysis' | 'shopping' | 'personas' | 'ai_research'

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
  handleSaveConfig: (pendingKeyword?: string, pendingCompetitor?: string, pendingSource?: string) => void
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

  // AI Research (Deep Research simulation) — persisted via monitor_analysis_cache('ai_research')
  aiResearchResult: Record<string, unknown> | null
  saveAiResearch: (result: Record<string, unknown>) => void
  clearAiResearch: () => void

  intelReport: CompetitiveIntelReport | null
  isGeneratingReport: boolean
  reportError: string
  handleGenerateReport: () => void
  handleStopReport: () => void

  multiBrandTrends: MultiBrandTrendData | null
  isLoadingTrends: boolean

  // Discover
  discoverResult: DiscoverResult | null           // derived: discoverResults[discoverEngine] ?? null
  discoverResults: Record<string, DiscoverResult> // per-engine cache
  isRunningDiscover: boolean
  isRunningDeepDiscover: boolean
  discoverError: string
  discoverEngine: string
  setDiscoverEngine: (engine: string) => void
  availableEngines: string[]
  engineModels: Record<string, { quick: string; deep: string }>  // per-engine model names
  userRole: string | null
  handleRunDiscover: () => void
  handleRunDeepDiscover: () => void
  handleStopDiscover: () => void
  showGeneratePromptsModal: boolean
  setShowGeneratePromptsModal: (v: boolean) => void
  handleBatchSavePrompts: (prompts: import('@/lib/api').SmartPrompt[]) => Promise<void>

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

  // Customer mode (admin)
  activeCustomerId: string | null
  customerHydrating: boolean
  customers: CustomerSummary[]
  switchCustomer: (customerId: string) => void
  // Warehouse pre-loaded data (no scan needed, reads agg_brand_daily)
  warehouseLoaded: boolean
  lastRefreshed: string | null

  // Report snapshots — frozen metric sets saved by user for client reporting
  savedSnapshots: ReportSnapshot[]
  saveSnapshot: (name?: string) => ReportSnapshot

  // Tab
  activeTab: TabKey
  setActiveTab: (t: TabKey) => void

  // Sub-tabs
  citationsSubTab: 'sources_overview' | 'url_detail'
  setCitationsSubTab: (v: 'sources_overview' | 'url_detail') => void
  competitorsSubTab: 'overall_sov' | 'prompt_sov' | 'sourcing_sov'
  setCompetitorsSubTab: (v: 'overall_sov' | 'prompt_sov' | 'sourcing_sov') => void
}

const UnifiedContext = createContext<UnifiedState | null>(null)

export function useUnified() {
  const ctx = useContext(UnifiedContext)
  if (!ctx) throw new Error('useUnified must be inside UnifiedProvider')
  return ctx
}

// ─── Provider ────────────────────────────────────────

// ── Preview mode: auto-load preset brand config from env vars ──────────────
// Set NEXT_PUBLIC_PREVIEW_MODE=true + NEXT_PUBLIC_PREVIEW_BRAND_* in .env.local.
// Never set these in production — stripped at build time.
const _PREVIEW_BRAND: BrandConfig | null =
  process.env.NEXT_PUBLIC_PREVIEW_MODE === 'true'
    ? {
        brand_name:      process.env.NEXT_PUBLIC_PREVIEW_BRAND_NAME      || 'RedMagic',
        domain:          process.env.NEXT_PUBLIC_PREVIEW_BRAND_DOMAIN     || 'https://global.redmagic.gg/',
        product_space:   'Gaming phones',
        one_liner:       process.env.NEXT_PUBLIC_PREVIEW_BRAND_ONELINER   || '',
        target_market:   process.env.NEXT_PUBLIC_PREVIEW_BRAND_MARKET     || 'UAE',
        industry:        'Consumer Electronics',
        target_audience: 'Competitive mobile gamers aged 18–35',
        differentiation: 'Active turbo fan cooling (22,000 RPM) vs passive cooling competitors',
        keywords:        ['best gaming phone UAE', 'gaming phone with cooling fan', 'best phone for PUBG Mobile'],
        competitors:     ['ASUS ROG Phone 9 Pro', 'Samsung Galaxy S25 Ultra', 'iQOO 13', 'POCO F7 Ultra'],
        source_domains:  ['redmagic.gg', 'gsmarena.com', 'notebookcheck.net'],
      }
    : null

const _IS_PREVIEW = process.env.NEXT_PUBLIC_PREVIEW_MODE === 'true'
// Preview lands on this real customer so prompts/scan hydrate with real data.
const _PREVIEW_CUSTOMER_ID = process.env.NEXT_PUBLIC_PREVIEW_CUSTOMER_ID || null

const REQUIRED_PROFILE_FIELDS: Array<{ key: keyof BrandConfig; label: string }> = [
  { key: 'brand_name', label: 'Brand Name' },
  { key: 'domain', label: 'Domain' },
  { key: 'industry', label: 'Industry' },
  { key: 'product_space', label: 'Product Space' },
  { key: 'target_market', label: 'Target Country' },
]

function missingRequiredProfileFields(config: BrandConfig) {
  return REQUIRED_PROFILE_FIELDS
    .filter(field => !String(config[field.key] ?? '').trim())
    .map(field => field.label)
}

function profileConfirmationId(customerId: string | null, config: Pick<BrandConfig, 'brand_name' | 'domain'>) {
  if (customerId) return `customer:${customerId}`
  const brand = config.brand_name.trim().toLowerCase()
  const domain = config.domain.trim().toLowerCase()
  return `local:${brand}:${domain}`
}

function isProfileConfirmed(customerId: string | null, config: Pick<BrandConfig, 'brand_name' | 'domain'>) {
  if (typeof window === 'undefined') return false
  try {
    const id = profileConfirmationId(customerId, config)
    const confirmed = JSON.parse(localStorage.getItem(CUSTOMER_PROFILE_CONFIRMED_KEY) || '{}') as Record<string, boolean>
    return confirmed[id] === true
  } catch {
    return false
  }
}

function markProfileConfirmed(customerId: string | null, config: Pick<BrandConfig, 'brand_name' | 'domain'>) {
  if (typeof window === 'undefined') return
  try {
    const id = profileConfirmationId(customerId, config)
    const confirmed = JSON.parse(localStorage.getItem(CUSTOMER_PROFILE_CONFIRMED_KEY) || '{}') as Record<string, boolean>
    confirmed[id] = true
    localStorage.setItem(CUSTOMER_PROFILE_CONFIRMED_KEY, JSON.stringify(confirmed))
  } catch {
    // Non-critical; server/local profile persistence still succeeds.
  }
}

export function UnifiedProvider({ children }: { children: ReactNode }) {
  const { user, role: userRole } = useAuth()

  // ── Tab ─────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabKey>('prompts')
  const [citationsSubTab, setCitationsSubTab] = useState<'sources_overview' | 'url_detail'>('sources_overview')
  const [competitorsSubTab, setCompetitorsSubTab] = useState<'overall_sov' | 'prompt_sov' | 'sourcing_sov'>('overall_sov')

  // ── Brand config ────────────────────────────────
  const [brandConfig, setBrandConfig] = useState<BrandConfig>(
    _PREVIEW_BRAND ?? { brand_name: '', domain: '', keywords: [], competitors: [], industry: '', product_space: '', one_liner: '', target_audience: '', target_market: '', differentiation: '', source_domains: [] }
  )
  const [isConfigured, setIsConfigured] = useState(_PREVIEW_BRAND !== null)
  const [showConfig, setShowConfig] = useState(_PREVIEW_BRAND === null)
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
  const [aiResearchResult, setAiResearchResult] = useState<Record<string, unknown> | null>(null)
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
  const [discoverResults, setDiscoverResults] = useState<Record<string, DiscoverResult>>({})
  const [isRunningDiscover, setIsRunningDiscover] = useState(false)
  const [isRunningDeepDiscover, setIsRunningDeepDiscover] = useState(false)
  const [discoverError, setDiscoverError] = useState('')
  const [discoverEngine, setDiscoverEngine] = useState('chatgpt')
  const [availableEngines, setAvailableEngines] = useState<string[]>(['chatgpt'])
  const [engineModels, setEngineModels] = useState<Record<string, { quick: string; deep: string }>>({})
  const [showGeneratePromptsModal, setShowGeneratePromptsModal] = useState(false)

  // ── Customer mode ────────────────────────────────
  const [activeCustomerId, setActiveCustomerId] = useState<string | null>(null)
  const [customerHydrating, setCustomerHydrating] = useState(false)
  const [customers, setCustomers] = useState<CustomerSummary[]>([])
  const [warehouseLoaded, setWarehouseLoaded] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null)
  const [savedSnapshots, setSavedSnapshots] = useState<ReportSnapshot[]>([])

  // ── Abort controllers ───────────────────────────
  const scanAbortRef = useRef<AbortController | null>(null)
  const scanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const scanJobPollRef = useRef<ReturnType<typeof setInterval> | null>(null)  // A′-2: job polling
  const gapAbortRef = useRef<AbortController | null>(null)
  const advMentionsAbortRef = useRef<AbortController | null>(null)
  const reportAbortRef = useRef<AbortController | null>(null)
  const discoverAbortRef = useRef<AbortController | null>(null)
  const autoScanTriggered = useRef(false)
  // Guard so the mount-init runs exactly once. React 18 StrictMode double-invokes
  // effects in dev; without this the 2nd run reads the (already-stripped) URL and
  // the preview-default fallback would clobber the real ?customer= selection.
  const mountInitDone = useRef(false)

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

  // ═══ Load on mount: customer-mode or localStorage ═══

  useEffect(() => {
    if (mountInitDone.current) return  // StrictMode guard — run once
    mountInitDone.current = true
    try {
      const params = new URLSearchParams(window.location.search)
      const tabParam = params.get('tab')
      if (tabParam && ['prompts', 'discover', 'ai_research'].includes(tabParam)) {
        setActiveTab(tabParam as TabKey)
      }

      // ── Phase 4: customer mode — hydrate from backend, skip localStorage ──
      // Preview falls back to a default customer so the demo lands on real data.
      // Priority: explicit ?customer= param > last-selected (localStorage) > preview default.
      // The localStorage fallback makes the dropdown selection survive page refresh.
      const cid = params.get('customer')
        || (typeof window !== 'undefined' ? localStorage.getItem(ACTIVE_CUSTOMER_KEY) : null)
        || (_IS_PREVIEW ? _PREVIEW_CUSTOMER_ID : null)
      if (cid) {
        setActiveCustomerId(cid)
        if (typeof window !== 'undefined') {
          localStorage.setItem(ACTIVE_CUSTOMER_KEY, cid)
          // Tell the global sidebar switcher which customer we landed on
          window.dispatchEvent(new CustomEvent(ACTIVE_CUSTOMER_EVENT, { detail: cid }))
        }
        // ④ Pre-fill brand name from cache so new tabs show the brand instantly
        // (no "Loading..." flash — backend hydration overwrites when it completes)
        try {
          const nameCache: Record<string, { brand_name: string; domain: string }> =
            JSON.parse(localStorage.getItem(CUSTOMER_CACHE_KEY) || '{}')
          if (nameCache[cid]) {
            setBrandConfig(prev => ({
              ...prev,
              brand_name: nameCache[cid].brand_name,
              domain: nameCache[cid].domain || prev.domain,
            }))
            setIsConfigured(true)
          }
        } catch { /* cache miss is safe to ignore */ }
        // Capture autoScan BEFORE the early return — the backend hydration effect
        // sets isConfigured after loading the customer, which then triggers the
        // autoScan watcher (line ~659). This is how onboarding → first scan works.
        if (params.get('autoScan') === 'true' && !autoScanTriggered.current) {
          autoScanTriggered.current = true
        }
        // Remove params from URL so refreshes don't re-trigger
        window.history.replaceState({}, '', window.location.pathname)
        return // skip localStorage hydration; backend effect handles the rest
      }

      // ── Normal localStorage hydration ─────────────────────────────────────
      const saved = localStorage.getItem(BRAND_CONFIG_KEY)
      if (saved) {
        const config = sanitizeBrandConfig(JSON.parse(saved) as BrandConfig)
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
      const savedDiscover = localStorage.getItem(DISCOVER_RESULT_KEY)
      if (savedDiscover) {
        const parsed = JSON.parse(savedDiscover)
        // Re-classify YOU/CORPORATE/COMPETITOR using current brand config
        // (stale localStorage results may have empty domain → everything was OTHER)
        const savedConfig = saved ? (JSON.parse(saved) as BrandConfig) : null
        const bd = savedConfig?.domain ?? ''
        const comps = savedConfig?.competitors ?? []
        // Handle legacy format (single DiscoverResult) vs new format (Record<engine, DiscoverResult>)
        if (parsed && typeof parsed === 'object' && parsed.source_domains) {
          // Old single-result format — restore under its actual engine key
          const eng: string = parsed.engine_used ?? 'chatgpt'
          setDiscoverResults({ [eng]: applyBrandClassification(parsed, bd, comps) })
        } else if (parsed && typeof parsed === 'object') {
          const reClassified: Record<string, DiscoverResult> = {}
          for (const [eng, res] of Object.entries(parsed)) {
            reClassified[eng] = applyBrandClassification(res as DiscoverResult, bd, comps)
          }
          setDiscoverResults(reClassified)
        }
      }
      const savedRecent = localStorage.getItem(RECENT_BRANDS_KEY)
      if (savedRecent) setRecentBrands(JSON.parse(savedRecent))
      const savedSnaps = localStorage.getItem(SNAPSHOTS_KEY)
      if (savedSnaps) setSavedSnapshots(JSON.parse(savedSnaps))
      if (params.get('autoScan') === 'true' && !autoScanTriggered.current) {
        autoScanTriggered.current = true
        window.history.replaceState({}, '', window.location.pathname)
      }
    } catch { /* ignore */ }
  }, [])

  // ═══ Phase 4: hydrate from backend when customer + user are both ready ═══

  useEffect(() => {
    if (!activeCustomerId || !user?.id) return
    setCustomerHydrating(true)

    // Clear the previous customer's results FIRST so switching to a customer
    // with no scan/discover yet doesn't briefly show the old customer's data.
    setScanResult(null)
    setScanHistory([])
    setGapResult(null)
    setAdvancedMentions(null)
    setIntelReport(null)
    setAiResearchResult(null)
    setDiscoverResults({})
    setMultiBrandTrends(null)

    customersApi.getLatest(activeCustomerId, user.id)
      .then(data => {
        const cfg = (data.customer.config_json ?? {}) as Partial<BrandConfig>
        const hydratedConfig = sanitizeBrandConfig({
          brand_name:       data.customer.brand_name,
          domain:           data.customer.domain,
          keywords:         (cfg.keywords as string[])        ?? [],
          competitors:      (cfg.competitors as string[])     ?? [],
          industry:         (cfg.industry as string)          ?? '',
          product_space:    (cfg.product_space as string)     ?? '',
          one_liner:        (cfg.one_liner as string)         ?? '',
          target_audience:  (cfg.target_audience as string)   ?? '',
          target_market:    (cfg.target_market as string)     ?? '',
          differentiation:  (cfg.differentiation as string)   ?? '',
          source_domains:   (cfg.source_domains as string[])  ?? [],
        })
        setBrandConfig(hydratedConfig)
        setIsConfigured(true)
        setShowConfig(!isProfileConfirmed(activeCustomerId, hydratedConfig))
        // ④ Write brand name to cache so future new tabs show it immediately
        try {
          const nameCache: Record<string, { brand_name: string; domain: string }> =
            JSON.parse(localStorage.getItem(CUSTOMER_CACHE_KEY) || '{}')
          nameCache[activeCustomerId!] = {
            brand_name: data.customer.brand_name,
            domain:     data.customer.domain,
          }
          localStorage.setItem(CUSTOMER_CACHE_KEY, JSON.stringify(nameCache))
        } catch { /* non-critical */ }

        if (data.latest_scan) {
          setScanResult(data.latest_scan as unknown as MonitorScanResult)
        }
        if (data.scan_history_summary?.length) {
          // Normalize backend rows → ScanHistoryEntry. The /latest endpoint
          // returns raw monitor_scans columns (scanned_at, sentiment_positive),
          // but the charts expect `date` / `positive_pct`. Without this mapping
          // entry.date is undefined and fmtDate(...).split('T') crashes the page.
          const normalized: ScanHistoryEntry[] = (data.scan_history_summary as unknown[]).map((row) => {
            const r = row as Record<string, unknown>
            return {
              scan_id:          String(r.scan_id ?? ''),
              date:             String(r.date ?? r.scanned_at ?? ''),
              visibility_score: Number(r.visibility_score ?? 0),
              mentions_found:   Number(r.mentions_found ?? 0),
              total_prompts:    Number(r.total_prompts ?? 0),
              citation_count:   Number(r.citation_count ?? 0),
              positive_pct:     Number(r.positive_pct ?? r.sentiment_positive ?? 0),
            }
          }).filter(e => e.date)  // drop any row without a usable date
          setScanHistory(normalized)
        }
        if (data.latest_discover) {
          // New format: { results_by_engine: { chatgpt: DiscoverResult, ... } }
          // Old format (backwards-compat): a DiscoverResult directly
          const ld = data.latest_discover as unknown as Record<string, unknown>
          if (ld.results_by_engine && typeof ld.results_by_engine === 'object') {
            const byEngine = ld.results_by_engine as Record<string, DiscoverResult>
            setDiscoverResults(prev => ({ ...prev, ...byEngine }))
          } else {
            const dr = data.latest_discover as unknown as DiscoverResult
            const eng = dr.engine_used ?? 'chatgpt'
            setDiscoverResults({ [eng]: dr })
          }
        }
        // Restore cached analyses (gap / intel / advanced_mentions) — Phase 4
        const ac = (data as unknown as { analysis_cache?: Record<string, unknown> }).analysis_cache
        if (ac && typeof ac === 'object') {
          if (ac.gap)               setGapResult(ac.gap as GapAnalysisResult)
          if (ac.intel)             setIntelReport(ac.intel as CompetitiveIntelReport)
          if (ac.advanced_mentions) setAdvancedMentions(ac.advanced_mentions as AdvancedMentionAnalysis)
          if (ac.ai_research)       setAiResearchResult(ac.ai_research as Record<string, unknown>)
        }
      })
      .catch(err => console.warn('[UnifiedContext] customer hydration failed:', err))
      .finally(() => setCustomerHydrating(false))

    // ── Warehouse pre-load: fetch aggregated data so dashboard shows
    //    historical data IMMEDIATELY without requiring a manual scan.
    //    Runs in parallel with getLatest, fills scanHistory from agg_brand_daily.
    customersApi.getLatest(activeCustomerId, user.id)
      .then(data => {
        // Only load warehouse if we don't already have scan history from the
        // /latest endpoint (scan history from real scans is more accurate).
        const brandName = data.customer?.brand_name
        if (!brandName) return
        return api.getWarehouseSummary(brandName, 30)
      })
      .then(whResp => {
        if (!whResp?.data?.has_data) return
        const wh = whResp.data
        // Merge warehouse history into scanHistory IF it's richer than what
        // /latest returned (agg covers full 30 days; /latest only 30 raw scans).
        // Use agg data as the baseline; real scan results sit on top.
        setScanHistory(prev => {
          if (prev.length >= (wh.history?.length ?? 0)) return prev  // real data wins
          return (wh.history ?? []).map(h => ({
            scan_id:          h.scan_id,
            date:             h.date,
            visibility_score: h.visibility_score,
            mentions_found:   h.mentions_found,
            total_prompts:    h.total_prompts,
            citation_count:   h.citation_count,
            positive_pct:     h.positive_pct,
            engines_used:     h.engines_used,
          } as ScanHistoryEntry))
        })
        setLastRefreshed(wh.last_refreshed ?? null)
        setWarehouseLoaded(true)
      })
      .catch(() => { /* warehouse load is non-critical */ })
  }, [activeCustomerId, user?.id])

  // ═══ Load the customer list for the header dropdown switcher ═══
  useEffect(() => {
    if (!user?.id) return
    customersApi.list(user.id, false)
      .then(setCustomers)
      .catch(() => setCustomers([]))
  }, [user?.id])

  // ═══ Switch to another customer (dropdown) — instant, no navigation ═══
  const switchCustomer = useCallback((customerId: string) => {
    if (!customerId || customerId === activeCustomerId) return
    if (typeof window !== 'undefined') localStorage.setItem(ACTIVE_CUSTOMER_KEY, customerId)
    // ④ Pre-cache brand name from the already-loaded customers list so the new
    // tab shows it immediately without waiting for the backend hydration round-trip.
    const found = customers.find(c => c.id === customerId)
    if (found) {
      try {
        const cache: Record<string, { brand_name: string; domain: string }> =
          JSON.parse(localStorage.getItem(CUSTOMER_CACHE_KEY) || '{}')
        cache[customerId] = { brand_name: found.brand_name, domain: found.domain }
        localStorage.setItem(CUSTOMER_CACHE_KEY, JSON.stringify(cache))
      } catch { /* non-critical */ }
    }
    setActiveCustomerId(customerId)  // triggers hydration effect (clears + loads new data)
    // Notify the global sidebar switcher (lives outside this provider)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(ACTIVE_CUSTOMER_EVENT, { detail: customerId }))
    }
  }, [activeCustomerId, customers])

  // ═══ React to customer switches from the global sidebar switcher ═══
  // The sidebar lives outside UnifiedProvider, so it signals via a window
  // event. We only adopt the new id (the sidebar already wrote localStorage);
  // setActiveCustomerId then triggers the hydration effect. No re-dispatch →
  // no loop.
  useEffect(() => {
    const onExternalSwitch = (e: Event) => {
      const id = (e as CustomEvent<string>).detail
      if (id) setActiveCustomerId(prev => (prev === id ? prev : id))
    }
    window.addEventListener(ACTIVE_CUSTOMER_EVENT, onExternalSwitch as EventListener)
    return () => window.removeEventListener(ACTIVE_CUSTOMER_EVENT, onExternalSwitch as EventListener)
  }, [])

  // ═══ Report snapshot ═══════════════════════════════
  const saveSnapshot = useCallback((name?: string): ReportSnapshot => {
    const label = name?.trim() ||
      `${brandConfig.brand_name} — ${new Date().toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })}`
    const latest = scanHistory[scanHistory.length - 1]
    const snapshot: ReportSnapshot = {
      id: (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : String(Date.now()),
      name: label,
      brand_name: brandConfig.brand_name,
      domain:     brandConfig.domain,
      created_at: new Date().toISOString(),
      date_range: { preset: datePreset, start: startDate, end: endDate },
      metrics: {
        visibility_score: (scanResult as unknown as Record<string, number> | null)?.visibility_score
          ?? latest?.visibility_score,
        mentions_found:   (scanResult as unknown as Record<string, number> | null)?.mentions_found
          ?? latest?.mentions_found,
        total_prompts:    (scanResult as unknown as Record<string, number> | null)?.total_prompts
          ?? latest?.total_prompts,
        citation_count:   (scanResult as unknown as Record<string, number> | null)?.citation_count
          ?? latest?.citation_count,
        positive_pct:     latest?.positive_pct,
      },
    }
    setSavedSnapshots(prev => {
      const updated = [snapshot, ...prev]
      try { localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(updated)) } catch { /* storage full */ }
      return updated
    })
    return snapshot
  }, [brandConfig, datePreset, startDate, endDate, scanResult, scanHistory])

  // ═══ Brand config handlers ═══════════════════════

  const saveRecentBrand = useCallback(() => {
    if (!brandConfig.brand_name.trim()) return
    const entry: RecentBrandRecord = { brand_name: brandConfig.brand_name.trim(), domain: brandConfig.domain.trim(), keywords: brandConfig.keywords, competitors: brandConfig.competitors, product_space: brandConfig.product_space, one_liner: brandConfig.one_liner, target_audience: brandConfig.target_audience, target_market: brandConfig.target_market, differentiation: brandConfig.differentiation, source_domains: brandConfig.source_domains, usedAt: new Date().toISOString() }
    setRecentBrands(prev => {
      const filtered = prev.filter(r => !(r.brand_name === entry.brand_name && r.domain === entry.domain))
      const updated = [entry, ...filtered].slice(0, 10)
      localStorage.setItem(RECENT_BRANDS_KEY, JSON.stringify(updated))
      return updated
    })
  }, [brandConfig])

  const loadRecentBrand = (rec: RecentBrandRecord) => {
    setBrandConfig({ brand_name: rec.brand_name, domain: rec.domain, keywords: rec.keywords, competitors: rec.competitors, industry: rec.industry ?? '', product_space: rec.product_space ?? '', one_liner: rec.one_liner ?? '', target_audience: rec.target_audience ?? '', target_market: rec.target_market ?? '', differentiation: rec.differentiation ?? '', source_domains: rec.source_domains ?? [] })
  }

  const clearRecentBrands = () => { localStorage.removeItem(RECENT_BRANDS_KEY); setRecentBrands([]) }

  const handleSaveConfig = (pendingKeyword = '', pendingCompetitor = '', pendingSource = '') => {
    // Merge any still-typed (unsubmitted) text from TagInputs.
    // pendingKeyword/pendingCompetitor may contain comma-separated values
    // (user typed multiple but didn't hit Enter) — sanitizeBrandConfig splits them.
    const kw = pendingKeyword.trim()
    const comp = pendingCompetitor.trim()
    const source = pendingSource.trim()
    const mergedKeywords = kw ? [...brandConfig.keywords, kw] : brandConfig.keywords
    const mergedCompetitors = comp ? [...brandConfig.competitors, comp] : brandConfig.competitors
    const mergedSources = source ? [...(brandConfig.source_domains ?? []), source] : (brandConfig.source_domains ?? [])
    const merged = sanitizeBrandConfig({
      ...brandConfig,
      keywords: mergedKeywords,
      competitors: mergedCompetitors,
      source_domains: mergedSources,
    })

    const missingRequired = missingRequiredProfileFields(merged)
    if (missingRequired.length > 0) {
      setConfigError(`Complete required fields: ${missingRequired.join(', ')}`)
      return
    }

    setConfigError('')
    setBrandConfig(merged)

    // ── Level 1: Detect brand change → read OLD brand BEFORE overwriting localStorage ──
    // The edit form updates brandConfig in real-time, so we can't rely on React state for "old" brand.
    // Read the previously-persisted value from localStorage as the authoritative old brand.
    const savedConfigRaw = localStorage.getItem(BRAND_CONFIG_KEY)
    const savedBrand = savedConfigRaw ? (JSON.parse(savedConfigRaw) as BrandConfig).brand_name?.trim().toLowerCase() : ''
    const newBrand = merged.brand_name.trim().toLowerCase()
    const brandChanged = isConfigured && savedBrand && savedBrand !== newBrand

    // Now persist the new config (localStorage = fast local cache)
    localStorage.setItem(BRAND_CONFIG_KEY, JSON.stringify(merged))

    // ── Persist config_json to DB so it survives logout (customer mode) ──
    // The customer record is the source of truth that getLatest() re-hydrates
    // from on next login. Without this, config_json stays {} and every field
    // except brand_name/domain is lost on logout.
    if (activeCustomerId && user?.id) {
      customersApi.update(activeCustomerId, user.id, {
        brand_name: merged.brand_name.trim(),
        domain:     merged.domain.trim(),
        config_json: {
          keywords:        merged.keywords,
          competitors:     merged.competitors,
          industry:        merged.industry,
          product_space:   merged.product_space,
          one_liner:       merged.one_liner,
          target_audience: merged.target_audience,
          target_market:   merged.target_market,
          differentiation: merged.differentiation,
          source_domains:  merged.source_domains,
        },
      }).catch(err => {
        console.error('[UnifiedContext] config persist to DB failed:', err)
        setConfigError('Saved locally but failed to sync to server — click Save again to retry.')
      })
    }

    if (brandChanged) {
      // Clear all result caches from localStorage
      localStorage.removeItem(SCAN_RESULTS_KEY)
      localStorage.removeItem(SCAN_HISTORY_KEY)
      localStorage.removeItem(GAP_RESULTS_KEY)
      localStorage.removeItem(ADV_MENTIONS_KEY)
      localStorage.removeItem(DISCOVER_RESULT_KEY)
      // Clear all result state
      setScanResult(null)
      setScanHistory([])
      setGapResult(null)
      setAdvancedMentions(null)
      setIntelReport(null)
      setDiscoverResults({})
      setMultiBrandTrends(null)
      // ── Level 2: Auto re-scan for the new brand ────────────────────────────
      autoScanTriggered.current = true
    }

    markProfileConfirmed(activeCustomerId, merged)
    setIsConfigured(true); setShowConfig(false)

    // Save to recent brands with merged config (avoids stale closure in saveRecentBrand)
    const entry: RecentBrandRecord = { brand_name: merged.brand_name.trim(), domain: merged.domain.trim(), keywords: merged.keywords, competitors: merged.competitors, industry: merged.industry, product_space: merged.product_space, one_liner: merged.one_liner, target_audience: merged.target_audience, target_market: merged.target_market, differentiation: merged.differentiation, source_domains: merged.source_domains, usedAt: new Date().toISOString() }
    setRecentBrands(prev => {
      const filtered = prev.filter(r => !(r.brand_name === entry.brand_name && r.domain === entry.domain))
      const updated = [entry, ...filtered].slice(0, 10)
      localStorage.setItem(RECENT_BRANDS_KEY, JSON.stringify(updated))
      return updated
    })
  }

  const handleClearConfig = () => {
    localStorage.removeItem(BRAND_CONFIG_KEY); localStorage.removeItem(SCAN_RESULTS_KEY)
    localStorage.removeItem(SCAN_HISTORY_KEY); localStorage.removeItem(GAP_RESULTS_KEY); localStorage.removeItem(ADV_MENTIONS_KEY)
    localStorage.removeItem(DISCOVER_RESULT_KEY)
    setBrandConfig({ brand_name: '', domain: '', keywords: [], competitors: [], industry: '', product_space: '', one_liner: '', target_audience: '', target_market: '', differentiation: '', source_domains: [] })
    setIsConfigured(false); setShowConfig(true)
    setScanResult(null); setScanHistory([]); setGapResult(null); setAdvancedMentions(null); setIntelReport(null); setAiResearchResult(null); setDiscoverResults({})
  }

  // ═══ Scan handlers ═══════════════════════════════

  const loadPrompts = useCallback(async () => {
    // Prompts are per-customer — no active customer means nothing to show.
    if (!activeCustomerId) { setPrompts([]); return }
    setIsLoadingPrompts(true)
    try { const res = await api.getMonitorPrompts(false, activeCustomerId); if (res.data) setPrompts(res.data) } catch { /* ignore */ }
    setIsLoadingPrompts(false)
  }, [activeCustomerId])

  useEffect(() => { loadPrompts() }, [loadPrompts])

  useEffect(() => {
    api.getAvailableEngines().then(res => {
      if (res.data?.engines?.length) setAvailableEngines(res.data.engines)
      if (res.data?.models) setEngineModels(res.data.models)
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
      if (res.error) { setAdvMentionsError(res.error) } else if (res.data) { setAdvancedMentions(res.data); localStorage.setItem(ADV_MENTIONS_KEY, JSON.stringify(res.data)); if (activeCustomerId) api.saveAnalysisCache(activeCustomerId, 'advanced_mentions', res.data).catch(() => {}) }
    } catch (e: any) { if (e.name !== 'AbortError') setAdvMentionsError(e.message || 'Auto advanced analysis failed') }
    advMentionsAbortRef.current = null; setIsRunningAdvMentions(false)
  }

  // ── A′-2: async scan with job_id polling ─────────────────────────────────
  // POST /scan → 202 + {job_id} → poll GET /scan/{job_id} every 2s
  // When done: re-hydrate from customer backend (full scan result already persisted by worker)
  const handleRunScan = async (isOnboarding?: boolean) => {
    if (!brandConfig.brand_name) return

    // Cancel any previous scan
    if (scanJobPollRef.current) { clearInterval(scanJobPollRef.current); scanJobPollRef.current = null }
    scanAbortRef.current?.abort()

    setIsScanning(true); setScanError(''); setScanStep(0)

    // 1. Enqueue scan — returns immediately with job_id (HTTP 202)
    const enqueueRes = await api.runMonitorScan(
      { brand_name: brandConfig.brand_name, domain: brandConfig.domain,
        keywords: brandConfig.keywords, competitors: brandConfig.competitors,
        customer_id: activeCustomerId ?? undefined },
      undefined, user?.id, isOnboarding
    )
    if (enqueueRes.error) {
      setScanError(enqueueRes.error)
      setIsScanning(false)
      return
    }
    const jobId = enqueueRes.data?.job_id
    if (!jobId) { setScanError('Failed to start scan'); setIsScanning(false); return }

    // 2. Poll job status every 2s
    const totalPrompts = prompts.filter(p => p.is_active).length || 8
    scanJobPollRef.current = setInterval(async () => {
      const jobRes = await api.getScanJob(jobId)
      if (!jobRes.data) return

      const { status, progress, error } = jobRes.data

      // Update visual progress bar from real server progress
      setScanStep(Math.round((progress / 100) * totalPrompts))

      if (status === 'failed') {
        if (scanJobPollRef.current) { clearInterval(scanJobPollRef.current); scanJobPollRef.current = null }
        setScanError(error || 'Scan failed in worker')
        setIsScanning(false)
        return
      }

      if (status === 'done') {
        if (scanJobPollRef.current) { clearInterval(scanJobPollRef.current); scanJobPollRef.current = null }

        // 3. Re-hydrate full result from backend (worker persisted it to Supabase)
        try {
          if (activeCustomerId && user?.id) {
            // Customer mode: reload via getLatest which returns full scan
            const latest = await customersApi.getLatest(activeCustomerId, user.id)
            if (latest.latest_scan) {
              const fullScan = latest.latest_scan as unknown as MonitorScanResult
              setScanResult(fullScan)
              localStorage.setItem(SCAN_RESULTS_KEY, JSON.stringify(fullScan))
              window.dispatchEvent(new CustomEvent('scanCompleted'))

              // Build history entry from full scan data
              const _mentioned = fullScan.mention_results?.filter(m => m.mentioned) ?? []
              const _prominence = _mentioned.length > 0
                ? Math.round((_mentioned.reduce((s, m) => s + m.position_score, 0) / _mentioned.length) * 100) : 0
              const _citShare = Math.round(fullScan.source_domains?.find(d => d.domain_type === 'you')?.frequency_pct ?? 0)
              const _sovPct = Math.round(fullScan.share_of_voice?.[brandConfig.brand_name] ?? 0)
              const entry: ScanHistoryEntry = {
                scan_id: fullScan.scan_id, date: fullScan.scanned_at,
                visibility_score: fullScan.visibility_score,
                mentions_found: fullScan.mentions_found, total_prompts: fullScan.total_prompts,
                citation_count: fullScan.citation_count,
                positive_pct: fullScan.sentiment_breakdown?.positive_pct ?? 0,
                prominence_score: _prominence, citation_share: _citShare, sov_pct: _sovPct,
                citation_authority: fullScan.citation_authority_score ?? 0,
                engines_used: fullScan.engines_used ?? ['chatgpt'],
              }
              setScanHistory(prev => [...prev, entry].slice(-30))
            }
          } else {
            // Standalone mode: fetch latest from history endpoint
            const histRes = await api.getMonitorHistory(brandConfig.brand_name)
            const latest = histRes.data?.[0]
            if (latest) {
              setScanResult(latest)
              localStorage.setItem(SCAN_RESULTS_KEY, JSON.stringify(latest))
              window.dispatchEvent(new CustomEvent('scanCompleted'))
            }
          }
        } catch (hydrateErr) {
          console.warn('[Scan] Result hydration failed, using result_summary', hydrateErr)
        }

        setScanStep(totalPrompts)
        if (!isOnboarding) notifyCreditUsed()
        await loadPrompts()
        autoTriggerAdvancedMentions()
        setIsScanning(false)
      }
    }, 2000)
  }

  const handleStopScan = () => {
    // Cancel polling — the actual worker job continues in the background
    // (fire-and-forget; a future enhancement can send a cancel signal to the worker)
    if (scanJobPollRef.current) { clearInterval(scanJobPollRef.current); scanJobPollRef.current = null }
    scanAbortRef.current?.abort(); scanAbortRef.current = null
    if (scanTimerRef.current) { clearInterval(scanTimerRef.current); scanTimerRef.current = null }
    setIsScanning(false); setScanStep(0)
  }

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
      if (res.error) { setGapError(res.error) } else if (res.data) { setGapResult(res.data); localStorage.setItem(GAP_RESULTS_KEY, JSON.stringify(res.data)); if (activeCustomerId) api.saveAnalysisCache(activeCustomerId, 'gap', res.data).catch(() => {}); notifyCreditUsed() }
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
      if (res.error) { setAdvMentionsError(res.error) } else if (res.data) { setAdvancedMentions(res.data); localStorage.setItem(ADV_MENTIONS_KEY, JSON.stringify(res.data)); if (activeCustomerId) api.saveAnalysisCache(activeCustomerId, 'advanced_mentions', res.data).catch(() => {}); notifyCreditUsed() }
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
      if (res.error) { setReportError(res.error) } else if (res.data) { setIntelReport(res.data); if (activeCustomerId) api.saveAnalysisCache(activeCustomerId, 'intel', res.data).catch(() => {}); notifyCreditUsed() }
    } catch (e: any) { if (e.name !== 'AbortError') setReportError(e.message || 'Report generation failed') }
    reportAbortRef.current = null; setIsGeneratingReport(false)
  }
  const handleStopReport = () => { reportAbortRef.current?.abort(); reportAbortRef.current = null; setIsGeneratingReport(false) }

  // ═══ AI Research persistence (same 4-step contract as gap/intel) ═══
  // Save → DB (monitor_analysis_cache 'ai_research'); hydrated by getLatest on load.
  const saveAiResearch = useCallback((result: Record<string, unknown>) => {
    setAiResearchResult(result)
    if (activeCustomerId) api.saveAnalysisCache(activeCustomerId, 'ai_research', result).catch(() => {})
  }, [activeCustomerId])
  const clearAiResearch = useCallback(() => setAiResearchResult(null), [])

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
    if (!activeCustomerId) { setPromptError('Select a customer first.'); return }
    try {
      const { category } = autoClassify(newPromptForm.template)
      const res = await api.createMonitorPrompt({ template: newPromptForm.template, category, customer_id: activeCustomerId })
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
    await loadPrompts()
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
    await loadPrompts()
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
        industry: brandConfig.industry,
        one_liner: brandConfig.one_liner,
        target_audience: brandConfig.target_audience,
        target_market: brandConfig.target_market,
        differentiation: brandConfig.differentiation,
        keywords: brandConfig.keywords,
        competitors: brandConfig.competitors,
        engines: [discoverEngine],
        deep: false,
        customer_id: activeCustomerId ?? undefined,  // persist to discover_results table
      }, ctrl.signal, user?.id, userRole ?? undefined)
      if (res.error === '__ABORTED__') { setIsRunningDiscover(false); return }
      if (res.error) { setDiscoverError(res.error) } else if (res.data) {
        const classified = applyBrandClassification(res.data, brandConfig.domain, brandConfig.competitors)
        setDiscoverResults(prev => {
          const updated = { ...prev, [discoverEngine]: classified }
          localStorage.setItem(DISCOVER_RESULT_KEY, JSON.stringify(updated))
          return updated
        })
        notifyCreditUsed()
      }
    } catch (e: any) { if (e.name !== 'AbortError') setDiscoverError(e.message || 'Discovery failed') }
    discoverAbortRef.current = null; setIsRunningDiscover(false)
  }

  const handleRunDeepDiscover = async () => {
    if (!brandConfig.brand_name) return
    discoverAbortRef.current?.abort()
    const ctrl = new AbortController()
    discoverAbortRef.current = ctrl
    setIsRunningDeepDiscover(true); setDiscoverError('')
    try {
      const res = await api.runDiscover({
        brand_name: brandConfig.brand_name,
        domain: brandConfig.domain,
        industry: brandConfig.industry,
        one_liner: brandConfig.one_liner,
        target_audience: brandConfig.target_audience,
        target_market: brandConfig.target_market,
        differentiation: brandConfig.differentiation,
        keywords: brandConfig.keywords,
        competitors: brandConfig.competitors,
        engines: [discoverEngine],
        deep: true,
        customer_id: activeCustomerId ?? undefined,  // persist to discover_results table
      }, ctrl.signal, user?.id, userRole ?? undefined)
      if (res.error === '__ABORTED__') { setIsRunningDeepDiscover(false); return }
      if (res.error) { setDiscoverError(res.error) } else if (res.data) {
        const classified = applyBrandClassification(res.data, brandConfig.domain, brandConfig.competitors)
        setDiscoverResults(prev => {
          const updated = { ...prev, [discoverEngine]: classified }
          localStorage.setItem(DISCOVER_RESULT_KEY, JSON.stringify(updated))
          return updated
        })
        notifyCreditUsed()
      }
    } catch (e: any) { if (e.name !== 'AbortError') setDiscoverError(e.message || 'Deep scan failed') }
    discoverAbortRef.current = null; setIsRunningDeepDiscover(false)
  }

  const handleStopDiscover = () => {
    discoverAbortRef.current?.abort()
    discoverAbortRef.current = null
    setIsRunningDiscover(false)
    setIsRunningDeepDiscover(false)
  }

  const handleBatchSavePrompts = async (newPrompts: import('@/lib/api').SmartPrompt[]) => {
    // Dedup against ALL saved prompts (active + inactive), not just the active-filter view.
    // Using the outer `prompts` state (MonitorPrompt[]) — the parameter was renamed to
    // avoid shadowing, which previously caused inactive duplicates to bypass the check.
    if (!activeCustomerId) return
    const existing = new Set(prompts.map(p => p.template.trim().toLowerCase()))
    const toSave = newPrompts.filter(p => !existing.has(p.template.trim().toLowerCase()))
    await Promise.all(
      toSave.map(p => api.createMonitorPrompt({ template: p.template, category: p.intent, customer_id: activeCustomerId }))
    )
    await loadPrompts()
  }

  // ── Reactive re-classification when brandConfig changes ──────────────────
  // Covers brand config loaded from API (customer portal) — those never write
  // to BRAND_CONFIG_KEY localStorage, so the localStorage-load fix misses them.
  // Runs whenever domain or competitors change, skips if no domain set.
  useEffect(() => {
    if (!brandConfig.domain && !brandConfig.competitors.length) return
    setDiscoverResults(prev => {
      const keys = Object.keys(prev)
      if (!keys.length) return prev
      const updated: Record<string, DiscoverResult> = {}
      for (const [eng, res] of Object.entries(prev)) {
        updated[eng] = applyBrandClassification(res, brandConfig.domain, brandConfig.competitors)
      }
      return updated
    })
  }, [brandConfig.domain, brandConfig.competitors])

  // ── Derived: current engine's result ────────────
  const discoverResult = discoverResults[discoverEngine] ?? null

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
    aiResearchResult, saveAiResearch, clearAiResearch,
    multiBrandTrends, isLoadingTrends,
    discoverResult, discoverResults, isRunningDiscover, isRunningDeepDiscover, discoverError, discoverEngine, setDiscoverEngine, availableEngines, engineModels, userRole, handleRunDiscover, handleRunDeepDiscover, handleStopDiscover, showGeneratePromptsModal, setShowGeneratePromptsModal, handleBatchSavePrompts,
    aeoUrl, setAeoUrl, aeoResult, aeoHistory, isRunningAeo, aeoError, handleRunAeo,
    prompts, isLoadingPrompts, loadPrompts, showAddPrompt, setShowAddPrompt,
    newPromptForm, setNewPromptForm, editingPrompt, setEditingPrompt,
    promptError, setPromptError, handleAddPrompt, handleUpdatePrompt,
    handleTogglePrompt, handleDeletePrompt, togglingPromptId,
    promptFilter, setPromptFilter, filterTopic, setFilterTopic, filteredPrompts,
    selectedPromptIds, togglePromptSelect, toggleSelectAllPrompts,
    handleBatchDelete, cancelBatchDelete, isBatchDeleting, batchConfirmStep,
    activeCustomerId, customerHydrating, customers, switchCustomer,
    warehouseLoaded, lastRefreshed,
    savedSnapshots, saveSnapshot,
    activeTab, setActiveTab,
    citationsSubTab, setCitationsSubTab, competitorsSubTab, setCompetitorsSubTab,
  }

  return <UnifiedContext.Provider value={value}>{children}</UnifiedContext.Provider>
}
