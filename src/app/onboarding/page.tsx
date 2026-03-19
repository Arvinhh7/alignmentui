'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { getSupabase } from '@/lib/supabase'
import {
  ArrowRight, ArrowLeft, Loader2, Plus, X, ChevronDown, ChevronRight,
  Check, Globe, Clock, Languages, Building2, Briefcase, Users, RefreshCw,
} from 'lucide-react'
import { gaEvent } from '@/lib/gtag'

// ─── Constants ────────────────────────────────────────
const BRAND_CONFIG_KEY = 'alignment_monitor_brand_config'
const ONBOARDING_DONE_KEY = 'alignment_onboarding_done'
const ONBOARDING_SESSION_KEY = 'alignment_onboarding_session'
const ONBOARDING_VERSION = 4

const LOCATIONS = [
  { code: 'US', label: 'United States', flag: '🇺🇸' },
  { code: 'GB', label: 'United Kingdom', flag: '🇬🇧' },
  { code: 'DE', label: 'Germany', flag: '🇩🇪' },
  { code: 'FR', label: 'France', flag: '🇫🇷' },
  { code: 'JP', label: 'Japan', flag: '🇯🇵' },
  { code: 'CN', label: 'China', flag: '🇨🇳' },
  { code: 'KR', label: 'South Korea', flag: '🇰🇷' },
  { code: 'AU', label: 'Australia', flag: '🇦🇺' },
  { code: 'CA', label: 'Canada', flag: '🇨🇦' },
  { code: 'SG', label: 'Singapore', flag: '🇸🇬' },
]
const LANGUAGES = ['English', 'Chinese', 'Japanese', 'Korean', 'German', 'French', 'Spanish', 'Portuguese']
const TIMEZONES = [
  'America/Los_Angeles', 'America/New_York', 'America/Chicago',
  'Europe/London', 'Europe/Berlin', 'Europe/Paris',
  'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Singapore', 'Asia/Seoul',
  'Australia/Sydney', 'Pacific/Auckland',
]
const INDUSTRIES = [
  'SaaS / Software', 'E-commerce / Retail', 'Financial Services',
  'Healthcare / Biotech', 'Education / EdTech', 'Real Estate',
  'Manufacturing', 'Media / Publishing', 'Travel / Hospitality',
  'Professional Services', 'Telecommunications', 'Food & Beverage',
  'Automotive', 'Other',
]
const COMPANY_SIZES = [
  { value: '1-10', label: '1–10 (Startup)' },
  { value: '11-50', label: '11–50 (Small)' },
  { value: '51-200', label: '51–200 (Mid-size)' },
  { value: '201-1000', label: '201–1,000 (Large)' },
  { value: '1000+', label: '1,000+ (Enterprise)' },
]
const TESTIMONIALS = [
  { quote: "Setting up our brand profile took under 2 minutes. The AI-generated topics were spot-on for our industry.", name: 'Lisa Zhang', title: 'CMO, GrowthStack' },
  { quote: "Alignment Agent gives us the clarity we need. Set up your prompts, see your AI visibility, and act on real citation data — all in minutes.", name: 'Sarah Chen', title: 'VP of Marketing, TechFlow' },
  { quote: "Understanding how AI platforms talk about your brand is the next frontier. This tool made it dead simple to get started.", name: 'Emily Park', title: 'Director of Digital, NovaBrand' },
]
const TOPIC_MSGS = ['Analyzing your brand…', 'Identifying key topics…', 'Researching your industry…']
const PROMPT_MSGS = ['Crafting AI search queries…', 'Building your tracking setup…', 'Generating prompts per topic…']

const TOTAL_STEPS = 3

// ─── Types ────────────────────────────────────────────
interface TopicItem { topic: string; description: string; selected: boolean }
interface PromptItem { prompt_text: string; intent: string; selected: boolean }
interface CompetitorItem { brand_name: string; domain: string; reason: string; selected: boolean }

// ─── Helpers ──────────────────────────────────────────
function normalizeUrl(url: string) {
  if (!url.trim()) return ''
  const u = url.trim()
  return u.startsWith('http') ? u : `https://${u}`
}

// ─── Progress Bar ─────────────────────────────────────
function ProgressBar({ step }: { step: number }) {
  const labels = ['Brand Setup', 'Topics & Prompts', 'Competitors']
  return (
    <div className="flex items-start w-full mb-8">
      {labels.map((label, i) => {
        const idx = i + 1
        const done = step > idx
        const active = step === idx
        return (
          <div key={idx} className="flex items-start flex-1">
            <div className="flex flex-col items-center w-full">
              <div className="flex items-center w-full">
                {i > 0 && <div className={`h-px flex-1 mt-3.5 transition-all ${done || active ? 'bg-gray-900' : 'bg-gray-200'}`} />}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${
                  done ? 'bg-gray-900 text-white' : active ? 'bg-gray-900 text-white ring-4 ring-gray-200' : 'bg-gray-100 text-gray-400'
                }`}>
                  {done ? <Check className="w-3.5 h-3.5" /> : idx}
                </div>
                {i < labels.length - 1 && <div className={`h-px flex-1 mt-3.5 transition-all ${step > idx ? 'bg-gray-900' : 'bg-gray-200'}`} />}
              </div>
              <span className={`text-[10px] mt-1.5 font-medium text-center leading-tight ${active ? 'text-gray-900' : 'text-gray-400'}`}>{label}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter()
  const { user, isLoading: authLoading, isAuthenticated } = useAuth()
  const [step, setStep] = useState(1)
  const [authChecked, setAuthChecked] = useState(false)

  // Step 1 — Profile
  const [profileCompany, setProfileCompany] = useState('')
  const [profileJobTitle, setProfileJobTitle] = useState('')
  const [profileIndustry, setProfileIndustry] = useState('')
  const [profileCompanySize, setProfileCompanySize] = useState('')
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  // Step 1 — Brand (merged from old step 2)
  const [brandName, setBrandName] = useState('')
  const [brandUrl, setBrandUrl] = useState('')
  const [location, setLocation] = useState('US')
  const [language, setLanguage] = useState('English')
  const [timezone, setTimezone] = useState('America/Los_Angeles')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [urlError, setUrlError] = useState('')

  // Step 2 — Topics
  const [topics, setTopics] = useState<TopicItem[]>([])
  const [isLoadingTopics, setIsLoadingTopics] = useState(false)
  const [customTopicInput, setCustomTopicInput] = useState('')
  const [topicMsgIdx, setTopicMsgIdx] = useState(0)

  // Step 2 — Prompts (auto-loads after topics)
  const [topicPrompts, setTopicPrompts] = useState<Record<string, PromptItem[]>>({})
  // expandedTopic removed — prompts now shown as flat list (4 intent-based prompts)
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false)
  const [customPromptInput, setCustomPromptInput] = useState('')
  const [addingPromptTopic, setAddingPromptTopic] = useState<string | null>(null)
  const [promptMsgIdx, setPromptMsgIdx] = useState(0)
  const promptsTriggered = useRef(false)

  // Step 3 — Competitors
  const [competitors, setCompetitors] = useState<CompetitorItem[]>([])
  const [isLoadingCompetitors, setIsLoadingCompetitors] = useState(false)
  const [customCompInput, setCustomCompInput] = useState('')

  // Completing
  const [isCompleting, setIsCompleting] = useState(false)

  // ─── GA4 purchase event on Stripe success redirect ──
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('subscription') !== 'success') return
    try {
      const raw = localStorage.getItem('alignment_checkout_plan')
      if (raw) {
        const { plan, value, billing_interval } = JSON.parse(raw)
        gaEvent('purchase', {
          transaction_id: `stripe_${plan}_${Date.now()}`,
          value: value,
          currency: 'USD',
          items: [{ item_name: `Alignment ${plan}`, price: value }],
          billing_interval,
        })
        localStorage.removeItem('alignment_checkout_plan')
      }
    } catch {}
  }, [])

  // ─── Animate loading messages ──────────────────────
  useEffect(() => {
    if (!isLoadingTopics) return
    const t = setInterval(() => setTopicMsgIdx(i => (i + 1) % TOPIC_MSGS.length), 2200)
    return () => clearInterval(t)
  }, [isLoadingTopics])

  useEffect(() => {
    if (!isLoadingPrompts) return
    const t = setInterval(() => setPromptMsgIdx(i => (i + 1) % PROMPT_MSGS.length), 2200)
    return () => clearInterval(t)
  }, [isLoadingPrompts])

  // ─── Auth + onboarding check ──────────────────────
  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated) { window.location.href = '/login'; return }
    const check = async () => {
      const supabase = getSupabase()
      if (supabase && user) {
        const { data } = await supabase
          .from('profiles')
          .select('onboarding_completed, company, company_website, job_title, industry, company_size')
          .eq('id', user.id)
          .single()
        if (data?.onboarding_completed) { window.location.href = '/dashboard/geo-audit'; return }
        if (data?.company) setProfileCompany(data.company)
        if (data?.company_website) setBrandUrl(data.company_website)
        if (data?.job_title) setProfileJobTitle(data.job_title)
        if (data?.industry) setProfileIndustry(data.industry)
        if (data?.company_size) setProfileCompanySize(data.company_size)
      }
      if (user?.user_metadata?.company_name) setProfileCompany(prev => prev || user.user_metadata.company_name)
      setAuthChecked(true)
    }
    check()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated, user])

  // ─── Session persistence ───────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(ONBOARDING_SESSION_KEY)
      if (!saved) return
      const s = JSON.parse(saved)
      if (s.brandName) setBrandName(s.brandName)
      if (s.brandUrl) setBrandUrl(s.brandUrl)
      if (s.location) setLocation(s.location)
      if (s.language) setLanguage(s.language)
      if (s.timezone) setTimezone(s.timezone)
      if (s._version === ONBOARDING_VERSION) {
        if (s.topics?.length) setTopics(s.topics)
        if (s.topicPrompts && Object.keys(s.topicPrompts).length) {
          setTopicPrompts(s.topicPrompts)
          promptsTriggered.current = true
        }
        if (s.competitors?.length) setCompetitors(s.competitors)
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(ONBOARDING_SESSION_KEY, JSON.stringify({
        _version: ONBOARDING_VERSION,
        brandName, brandUrl, location, language, timezone,
        topics, topicPrompts, competitors,
      }))
    } catch { /* ignore */ }
  }, [brandName, brandUrl, location, language, timezone, topics, topicPrompts, competitors])

  // ─── Helpers ──────────────────────────────────────
  const selectedTopics = topics.filter(t => t.selected)
  const selectedTopicNames = selectedTopics.map(t => t.topic)
  const totalPrompts = Object.values(topicPrompts).reduce((s, a) => s + a.length, 0)
  const selectedPrompts = Object.values(topicPrompts).reduce((s, a) => s + a.filter(p => p.selected).length, 0)
  const selectedCompetitors = competitors.filter(c => c.selected)

  // ─── Load topics ──────────────────────────────────
  const doLoadTopics = useCallback(async (bn: string, bu: string, existingCustom: TopicItem[]) => {
    setIsLoadingTopics(true)
    try {
      const res = await api.onboardingSuggestTopics({ brand_name: bn, domain: bu })
      if (res.data?.topics) {
        const ai = res.data.topics.slice(0, 5).map(t => ({ ...t, selected: true }))
        setTopics([...ai, ...existingCustom])
      }
    } catch { /* fallback */ }
    setIsLoadingTopics(false)
  }, [])

  // ─── Load prompts ─────────────────────────────────
  const doLoadPrompts = useCallback(async (bn: string, topicNames: string[]) => {
    if (topicNames.length === 0) return
    // Only send the primary (first selected) topic — backend generates 4 intent-based prompts
    const primaryTopic = topicNames[0]
    setIsLoadingPrompts(true)
    try {
      const res = await api.onboardingGeneratePrompts({ brand_name: bn, topics: [primaryTopic] })
      if (res.data?.topic_prompts) {
        const mapped: Record<string, PromptItem[]> = {}
        for (const [topic, items] of Object.entries(res.data.topic_prompts)) {
          mapped[topic] = (items as { prompt_text: string; intent: string }[])
            .slice(0, 4)
            .map(p => ({ ...p, selected: true }))
        }
        setTopicPrompts(mapped)
      }
    } catch { /* fallback */ }
    setIsLoadingPrompts(false)
  }, [])

  // ─── Auto-load prompts when topics finish ─────────
  useEffect(() => {
    if (step !== 2) return
    if (isLoadingTopics) return
    if (promptsTriggered.current) return
    if (Object.keys(topicPrompts).length > 0) { promptsTriggered.current = true; return }
    const names = topics.filter(t => t.selected).map(t => t.topic)
    if (names.length === 0) return
    promptsTriggered.current = true
    doLoadPrompts(brandName.trim(), names)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, isLoadingTopics, topics])

  // ─── Step 1 → 2 ───────────────────────────────────
  const handleStep1Next = useCallback(async () => {
    if (!profileCompany.trim() || !brandName.trim()) return

    // Validate URL if provided
    if (brandUrl.trim()) {
      const normalized = normalizeUrl(brandUrl)
      try { new URL(normalized) } catch {
        setUrlError('Please enter a valid URL (e.g. yourcompany.com)')
        return
      }
      setUrlError('')
      setBrandUrl(normalized)
    }

    setIsSavingProfile(true)
    try {
      const supabase = getSupabase()
      if (supabase && user) {
        await supabase.from('profiles').update({
          company: profileCompany.trim(),
          company_website: brandUrl.trim() ? normalizeUrl(brandUrl) : null,
          job_title: profileJobTitle.trim() || null,
          industry: profileIndustry || null,
          company_size: profileCompanySize || null,
          updated_at: new Date().toISOString(),
        }).eq('id', user.id)
      }
    } catch { /* continue */ }
    setIsSavingProfile(false)

    setStep(2)

    // Kick off topic loading if not yet done
    const hasAI = topics.some(t => t.description !== 'Custom topic')
    if (!hasAI) {
      const custom = topics.filter(t => t.description === 'Custom topic')
      promptsTriggered.current = false
      await doLoadTopics(brandName.trim(), normalizeUrl(brandUrl), custom)
    }
  }, [profileCompany, brandName, brandUrl, profileJobTitle, profileIndustry, profileCompanySize, user, topics, doLoadTopics])

  // ─── Regenerate topics ────────────────────────────
  const handleRegenerateTopics = useCallback(() => {
    const custom = topics.filter(t => t.description === 'Custom topic')
    setTopics(custom)
    setTopicPrompts({})
    promptsTriggered.current = false
    doLoadTopics(brandName.trim(), normalizeUrl(brandUrl), custom)
  }, [topics, brandName, brandUrl, doLoadTopics])

  // ─── Regenerate prompts ───────────────────────────
  const handleRegeneratePrompts = useCallback(() => {
    setTopicPrompts({})
    promptsTriggered.current = false
    doLoadPrompts(brandName.trim(), selectedTopicNames)
  }, [brandName, selectedTopicNames, doLoadPrompts])

  // ─── Step 2 → 3 ───────────────────────────────────
  const handleStep2Next = useCallback(async () => {
    setStep(3)
    const hasAI = competitors.some(c => c.reason !== 'Manually added')
    if (hasAI) return
    const custom = competitors.filter(c => c.reason === 'Manually added')
    setIsLoadingCompetitors(true)
    try {
      const res = await api.onboardingSuggestCompetitors({
        brand_name: brandName.trim(),
        domain: normalizeUrl(brandUrl),
        topics: selectedTopicNames,
      })
      if (res.data?.competitors) {
        const ai = res.data.competitors.slice(0, 3).map(c => ({ ...c, selected: true }))
        setCompetitors([...ai, ...custom])
      }
    } catch { /* fallback */ }
    setIsLoadingCompetitors(false)
  }, [brandName, brandUrl, selectedTopicNames, competitors])

  // ─── Complete ─────────────────────────────────────
  const handleComplete = useCallback(async () => {
    setIsCompleting(true)
    const bn = brandName.trim()
    const du = normalizeUrl(brandUrl)
    const compNames = selectedCompetitors.map(c => c.brand_name)

    localStorage.setItem(BRAND_CONFIG_KEY, JSON.stringify({
      brand_name: bn, domain: du, keywords: selectedTopicNames, competitors: compNames,
    }))
    if (du) {
      localStorage.setItem('geo_audit_session', JSON.stringify({ url: du, auditingUrl: '', auditResult: null }))
      localStorage.setItem('geo_optimization_session', JSON.stringify({ url: du, result: null, loadingUrl: '' }))
    }
    localStorage.setItem('geo_content_session', JSON.stringify({
      selectedType: 'faq', selectedChannel: 'official_website',
      brandName: bn, productName: '', topic: '', forbiddenClaims: '', generated: null,
    }))
    localStorage.setItem('geo_distribution_session', JSON.stringify({
      brandName: bn, domain: du, industry: 'tech',
      brandDescTags: selectedTopicNames, competitorTags: compNames, strategy: null,
    }))

    // Create (or reuse) the Brand record so GA4 Attribution can bind to it
    try {
      if (user?.id) {
        const existingBrands = await api.getBrands()
        const alreadyExists = existingBrands.data?.find(
          (b: { name: string; domain?: string }) =>
            b.name.trim().toLowerCase() === bn.toLowerCase() ||
            (du && b.domain === du)
        )
        if (!alreadyExists) {
          await api.createBrand(
            { name: bn, domain: du || undefined, keywords: selectedTopicNames },
            user.id,
          )
        }
      }
    } catch { /* non-critical, continue */ }

    const allPrompts = Object.values(topicPrompts).flat().filter(p => p.selected && p.prompt_text.trim())
    try {
      const existingRes = await api.getMonitorPrompts()
      const existingSet = new Set((existingRes.data || []).map(ep => ep.template.trim().toLowerCase()))
      const uniqueNew = allPrompts.filter(p => !existingSet.has(p.prompt_text.trim().toLowerCase()))
      for (const p of uniqueNew.slice(0, 30)) {
        await api.createMonitorPrompt({ template: p.prompt_text, category: p.intent })
      }
    } catch { /* ignore */ }

    localStorage.setItem(ONBOARDING_DONE_KEY, 'true')
    try {
      const supabase = getSupabase()
      if (supabase && user) {
        await supabase.from('profiles').update({
          onboarding_completed: true, updated_at: new Date().toISOString(),
        }).eq('id', user.id)
      }
    } catch { /* continue */ }

    router.push('/dashboard/geo-monitor?autoScan=true')
  }, [brandName, brandUrl, selectedTopicNames, selectedCompetitors, topicPrompts, router, user])

  // ─── Add custom items ──────────────────────────────
  const addCustomTopic = () => {
    if (!customTopicInput.trim()) return
    setTopics(prev => [...prev, { topic: customTopicInput.trim(), description: 'Custom topic', selected: true }])
    setCustomTopicInput('')
  }
  const addCustomPrompt = (topicName: string) => {
    if (!customPromptInput.trim()) return
    setTopicPrompts(prev => ({
      ...prev,
      [topicName]: [...(prev[topicName] || []), { prompt_text: customPromptInput.trim(), intent: 'info_cognition', selected: true }],
    }))
    setCustomPromptInput('')
    setAddingPromptTopic(null)
  }
  const addCustomCompetitor = () => {
    if (!customCompInput.trim()) return
    setCompetitors(prev => [...prev, { brand_name: customCompInput.trim(), domain: '', reason: 'Manually added', selected: true }])
    setCustomCompInput('')
  }

  // ─── Auth guard ───────────────────────────────────
  if (authLoading || !authChecked) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      </div>
    )
  }

  const testimonial = TESTIMONIALS[step - 1] || TESTIMONIALS[0]

  return (
    <div className="min-h-screen flex bg-white">

      {/* ════ Left Panel ════ */}
      <div className="w-full lg:w-[460px] xl:w-[500px] flex-shrink-0 flex flex-col">

        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gray-900 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">A</span>
            </div>
            <span className="font-semibold text-gray-900 text-sm">Alignment Agent</span>
          </div>
          <button onClick={() => router.push('/login')} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            Logout
          </button>
        </div>

        {/* Form content */}
        <div className="flex-1 overflow-y-auto px-8 py-8">
          <ProgressBar step={step} />

          {/* ════ STEP 1: Brand Setup ════ */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h1 className="text-xl font-bold text-gray-900">Set up your brand</h1>
                <p className="text-sm text-gray-500 mt-1">Tell us about your company and the brand you want to track in AI platforms.</p>
              </div>

              {/* Company section */}
              <div className="space-y-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Your Company</p>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Company Name <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input value={profileCompany} onChange={e => setProfileCompany(e.target.value)}
                      placeholder="Your company name"
                      className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Job Title</label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input value={profileJobTitle} onChange={e => setProfileJobTitle(e.target.value)}
                        placeholder="e.g., VP Marketing"
                        className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Company Size</label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <select value={profileCompanySize} onChange={e => setProfileCompanySize(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 appearance-none focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all">
                        <option value="">Size</option>
                        {COMPANY_SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Industry</label>
                  <div className="relative">
                    <select value={profileIndustry} onChange={e => setProfileIndustry(e.target.value)}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 appearance-none focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all">
                      <option value="">Select industry</option>
                      {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Brand to Track</p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Brand Name <span className="text-red-400">*</span></label>
                    <input value={brandName} onChange={e => setBrandName(e.target.value)}
                      placeholder="e.g., Acme Inc"
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Website URL</label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input value={brandUrl} onChange={e => { setBrandUrl(e.target.value); setUrlError('') }}
                        placeholder="e.g., acme.com"
                        className={`w-full pl-10 pr-3 py-2.5 bg-gray-50 border rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-all ${urlError ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-gray-300'}`} />
                    </div>
                    {urlError && <p className="text-xs text-red-500 mt-1">{urlError}</p>}
                  </div>
                </div>
              </div>

              {/* Advanced settings (collapsible) */}
              <div className="border border-gray-100 rounded-lg overflow-hidden">
                <button onClick={() => setShowAdvanced(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-500 hover:bg-gray-50 transition-colors">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tracking Region & Language</span>
                  {showAdvanced ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                {showAdvanced && (
                  <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
                    <div className="pt-3">
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">Default Location</label>
                      <div className="relative">
                        <select value={location} onChange={e => setLocation(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 appearance-none focus:outline-none focus:ring-2 focus:ring-gray-900/10">
                          {LOCATIONS.map(loc => <option key={loc.code} value={loc.code}>{loc.flag} {loc.label}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">Language</label>
                      <div className="relative">
                        <Languages className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <select value={language} onChange={e => setLanguage(e.target.value)}
                          className="w-full pl-10 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 appearance-none focus:outline-none focus:ring-2 focus:ring-gray-900/10">
                          {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">Timezone</label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <select value={timezone} onChange={e => setTimezone(e.target.value)}
                          className="w-full pl-10 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 appearance-none focus:outline-none focus:ring-2 focus:ring-gray-900/10">
                          {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button onClick={handleStep1Next}
                disabled={!profileCompany.trim() || !brandName.trim() || isSavingProfile}
                className="w-full py-3 bg-gray-900 hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-sm transition-all flex items-center justify-center gap-2">
                {isSavingProfile
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                  : <>Continue <ArrowRight className="w-4 h-4" /></>}
              </button>
            </div>
          )}

          {/* ════ STEP 2: Topics & Prompts ════ */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-bold text-gray-900">Topics & Prompts</h1>
                <p className="text-sm text-gray-500 mt-1">Review the AI-generated topics and prompts for <span className="font-medium text-gray-800">{brandName}</span>. Customize as needed.</p>
              </div>

              {/* ── Topics section ── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Topics</p>
                  {!isLoadingTopics && topics.length > 0 && (
                    <button onClick={handleRegenerateTopics}
                      className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors">
                      <RefreshCw className="w-3 h-3" /> Regenerate
                    </button>
                  )}
                </div>

                {isLoadingTopics ? (
                  <div className="flex items-center gap-3 py-6 px-4 bg-gray-50 rounded-lg">
                    <Loader2 className="w-5 h-5 text-gray-400 animate-spin flex-shrink-0" />
                    <p className="text-sm text-gray-500 transition-all">{TOPIC_MSGS[topicMsgIdx]}</p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-gray-400">{selectedTopics.length}/{topics.length} selected</p>
                    <div className="space-y-2">
                      {topics.map((t, i) => (
                        <button key={i}
                          onClick={() => setTopics(prev => prev.map((item, idx) => idx === i ? { ...item, selected: !item.selected } : item))}
                          className="w-full flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all text-left">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${t.selected ? 'bg-gray-900' : 'border-2 border-gray-300'}`}>
                            {t.selected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <span className="text-sm text-gray-900">{t.topic}</span>
                        </button>
                      ))}
                    </div>

                    {customTopicInput !== '' ? (
                      <div className="flex gap-2">
                        <input value={customTopicInput.trim() ? customTopicInput : ''}
                          onChange={e => setCustomTopicInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') addCustomTopic() }}
                          placeholder="Enter custom topic" autoFocus
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
                        <button onClick={addCustomTopic} className="px-3 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800">Add</button>
                        <button onClick={() => setCustomTopicInput('')} className="px-2 py-2 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <button onClick={() => setCustomTopicInput(' ')}
                        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors">
                        <Plus className="w-4 h-4" /> Add custom topic
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* ── Prompts section ── */}
              {!isLoadingTopics && topics.length > 0 && (
                <div className="space-y-3 border-t border-gray-100 pt-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">AI Prompts</p>
                      {!isLoadingPrompts && totalPrompts > 0 && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          Based on your primary topic · {selectedPrompts}/{totalPrompts} selected
                        </p>
                      )}
                    </div>
                    {!isLoadingPrompts && totalPrompts > 0 && (
                      <button onClick={handleRegeneratePrompts}
                        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors">
                        <RefreshCw className="w-3 h-3" /> Regenerate
                      </button>
                    )}
                  </div>

                  {isLoadingPrompts ? (
                    <div className="flex items-center gap-3 py-6 px-4 bg-gray-50 rounded-lg">
                      <Loader2 className="w-5 h-5 text-gray-400 animate-spin flex-shrink-0" />
                      <p className="text-sm text-gray-500">{PROMPT_MSGS[promptMsgIdx]}</p>
                    </div>
                  ) : totalPrompts > 0 ? (
                    <div className="space-y-2">
                      {Object.entries(topicPrompts).flatMap(([topicName, prompts]) =>
                        prompts.map((p, pi) => {
                          const intentLabel: Record<string, string> = {
                            info_cognition: 'Info',
                            solution_explore: 'Solution',
                            comparison_decision: 'Compare',
                            action_choice: 'Action',
                          }
                          const intentColor: Record<string, string> = {
                            info_cognition: 'bg-blue-50 text-blue-600',
                            solution_explore: 'bg-green-50 text-green-600',
                            comparison_decision: 'bg-purple-50 text-purple-600',
                            action_choice: 'bg-orange-50 text-orange-600',
                          }
                          return (
                            <div key={`${topicName}-${pi}`}
                              className="flex items-start gap-3 px-3 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                              <button onClick={() => setTopicPrompts(prev => ({
                                ...prev,
                                [topicName]: prev[topicName].map((item, idx) => idx === pi ? { ...item, selected: !item.selected } : item),
                              }))}
                                className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${p.selected ? 'bg-gray-900' : 'border-2 border-gray-300'}`}>
                                {p.selected && <Check className="w-3 h-3 text-white" />}
                              </button>
                              <span className={`text-sm flex-1 leading-snug ${p.selected ? 'text-gray-900' : 'text-gray-400'}`}>
                                {p.prompt_text}
                              </span>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${intentColor[p.intent] ?? 'bg-gray-100 text-gray-500'}`}>
                                  {intentLabel[p.intent] ?? p.intent}
                                </span>
                                <button onClick={() => setTopicPrompts(prev => ({
                                  ...prev,
                                  [topicName]: prev[topicName].filter((_, idx) => idx !== pi),
                                }))} className="text-gray-300 hover:text-red-400">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          )
                        })
                      )}
                      {/* Add custom prompt */}
                      {(() => {
                        const primaryTopic = Object.keys(topicPrompts)[0]
                        if (!primaryTopic) return null
                        return addingPromptTopic === primaryTopic ? (
                          <div className="flex gap-2 mt-1">
                            <input value={customPromptInput} onChange={e => setCustomPromptInput(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') addCustomPrompt(primaryTopic) }}
                              placeholder="Enter custom prompt" autoFocus
                              className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
                            <button onClick={() => addCustomPrompt(primaryTopic)} className="px-2.5 py-1.5 bg-gray-900 text-white text-xs rounded-lg">Add</button>
                            <button onClick={() => { setAddingPromptTopic(null); setCustomPromptInput('') }} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                          </div>
                        ) : (
                          <button onClick={() => setAddingPromptTopic(primaryTopic)}
                            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 mt-1 transition-colors">
                            <Plus className="w-3.5 h-3.5" /> Add custom prompt
                          </button>
                        )
                      })()}
                    </div>
                  ) : null}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(1)}
                  className="px-4 py-3 border border-gray-200 hover:bg-gray-50 text-gray-600 font-semibold rounded-lg text-sm transition-all flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={handleStep2Next} disabled={selectedTopics.length === 0 || isLoadingTopics}
                  className="flex-1 py-3 bg-gray-900 hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-sm transition-all flex items-center justify-center gap-2">
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ════ STEP 3: Competitors ════ */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-bold text-gray-900">Competitors</h1>
                <p className="text-sm text-gray-500 mt-1">Select brands you compete with — we&apos;ll track how AI mentions them alongside <span className="font-medium text-gray-800">{brandName}</span>.</p>
              </div>

              {isLoadingCompetitors ? (
                <div className="flex items-center gap-3 py-8 px-4 bg-gray-50 rounded-lg">
                  <Loader2 className="w-5 h-5 text-gray-400 animate-spin flex-shrink-0" />
                  <p className="text-sm text-gray-500">Finding competitors in your space…</p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-gray-400">{selectedCompetitors.length} selected</p>
                  <div className="space-y-2">
                    {competitors.map((c, i) => (
                      <button key={i}
                        onClick={() => setCompetitors(prev => prev.map((item, idx) => idx === i ? { ...item, selected: !item.selected } : item))}
                        className="w-full flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all text-left">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${c.selected ? 'bg-gray-900' : 'border-2 border-gray-300'}`}>
                          {c.selected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{c.brand_name}</p>
                          {c.reason && c.reason !== 'Manually added' && <p className="text-xs text-gray-400 truncate">{c.reason}</p>}
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input value={customCompInput} onChange={e => setCustomCompInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') addCustomCompetitor() }}
                      placeholder="Add a competitor brand name"
                      className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
                    <button onClick={addCustomCompetitor} disabled={!customCompInput.trim()}
                      className="px-3 py-2.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 rounded-lg text-sm text-gray-600 transition-colors">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} disabled={isCompleting}
                  className="px-4 py-3 border border-gray-200 hover:bg-gray-50 text-gray-600 font-semibold rounded-lg text-sm transition-all flex items-center gap-2 disabled:opacity-40">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={handleComplete} disabled={isCompleting}
                  className="flex-1 py-3 bg-gray-900 hover:bg-gray-800 disabled:opacity-70 text-white font-semibold rounded-lg text-sm transition-all flex items-center justify-center gap-2">
                  {isCompleting
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Setting up your dashboard…</>
                    : <>Complete Setup <ArrowRight className="w-4 h-4" /></>}
                </button>
              </div>

              {/* Skip option */}
              {!isCompleting && (
                <div className="text-center">
                  <button onClick={handleComplete}
                    className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors">
                    Skip competitors for now →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ════ Right Panel — Decorative ════ */}
      <div className="hidden lg:flex flex-1 bg-gray-50 relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0">
          <div className="absolute top-[10%] left-[15%] w-32 h-8 bg-gray-200/60 rounded-full blur-[1px] rotate-[-5deg]" />
          <div className="absolute top-[20%] right-[20%] w-28 h-8 bg-gray-200/50 rounded-full blur-[1px] rotate-[3deg]" />
          <div className="absolute top-[35%] left-[30%] w-36 h-8 bg-gray-200/40 rounded-full blur-[2px] rotate-[-2deg]" />
          <div className="absolute top-[50%] right-[10%] w-24 h-8 bg-gray-200/50 rounded-full blur-[1px] rotate-[5deg]" />
          <div className="absolute top-[65%] left-[10%] w-30 h-8 bg-gray-200/60 rounded-full blur-[1px] rotate-[-3deg]" />
          <div className="absolute top-[75%] right-[25%] w-32 h-8 bg-gray-200/40 rounded-full blur-[2px] rotate-[4deg]" />
          <div className="absolute top-[15%] left-[55%] w-20 h-8 bg-gray-200/50 rounded-full blur-[1px] rotate-[-1deg]" />
          <div className="absolute top-[85%] left-[40%] w-28 h-8 bg-gray-200/50 rounded-full blur-[1px] rotate-[2deg]" />
        </div>
        <div className="relative z-10 max-w-md mx-8">
          <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 p-8 border border-gray-100">
            <p className="text-gray-700 text-sm leading-relaxed mb-6">&ldquo;{testimonial.quote}&rdquo;</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-sm">
                {testimonial.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{testimonial.name}</p>
                <p className="text-xs text-gray-500">{testimonial.title}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
