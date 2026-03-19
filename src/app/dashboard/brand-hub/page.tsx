'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { api, BrandWithStats } from '@/lib/api'
import {
  BookOpen, Edit2, Save, X, Globe,
  Building2, Sparkles, ArrowRight,
  Loader2, ExternalLink,
  Target, BarChart3, Info, Cpu, Database, Tag, Users,
} from 'lucide-react'
import { useToast } from '@/components/Toast'
import { BrandHubSkeleton } from '@/components/Skeleton'

const BRAND_CONFIG_KEY = 'alignment_monitor_brand_config'

interface LocalBrandConfig {
  brand_name: string
  domain: string
  keywords: string[]
  competitors: string[]
}

function getLocalConfig(): LocalBrandConfig {
  if (typeof window === 'undefined') return { brand_name: '', domain: '', keywords: [], competitors: [] }
  try {
    const raw = localStorage.getItem(BRAND_CONFIG_KEY)
    return raw ? JSON.parse(raw) : { brand_name: '', domain: '', keywords: [], competitors: [] }
  } catch { return { brand_name: '', domain: '', keywords: [], competitors: [] } }
}

// ─── Section Card ─────────────────────────────────────────────────────────────
function SectionCard({ title, subtitle, icon: Icon, iconColor, children }: {
  title: string
  subtitle?: string
  icon: React.ElementType
  iconColor: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-start gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconColor}`}>
          <Icon className="w-4.5 h-4.5" strokeWidth={2} />
        </div>
        <div>
          <h3 className="text-[14px] font-bold text-gray-900">{title}</h3>
          {subtitle && <p className="text-[11px] text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

// ─── Tag input ─────────────────────────────────────────────────────────────────
function TagInput({
  label, tags, placeholder, onAdd, onRemove, tagColor = 'bg-gray-100 text-gray-700',
}: {
  label: string
  tags: string[]
  placeholder: string
  onAdd: (v: string) => void
  onRemove: (v: string) => void
  tagColor?: string
}) {
  const [input, setInput] = useState('')
  const submit = () => {
    const v = input.trim()
    if (v && !tags.includes(v)) { onAdd(v); setInput('') }
  }
  return (
    <div>
      <label className="text-[12px] font-semibold text-gray-700 mb-2 block">{label}</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map(tag => (
          <span key={tag} className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg ${tagColor}`}>
            {tag}
            <button onClick={() => onRemove(tag)} className="hover:opacity-70 transition-opacity">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit() } }}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 text-[13px] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
        />
        <button
          onClick={submit}
          disabled={!input.trim()}
          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 text-gray-700 text-[12px] font-semibold rounded-xl transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BrandHubPage() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [brand, setBrand] = useState<BrandWithStats | null>(null)
  const [localConfig, setLocalConfig] = useState<LocalBrandConfig>(getLocalConfig())
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Edit state
  const [editName, setEditName] = useState('')
  const [editDomain, setEditDomain] = useState('')
  const [editIndustry, setEditIndustry] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editKeywords, setEditKeywords] = useState<string[]>([])
  const [editCompetitors, setEditCompetitors] = useState<string[]>([])
  const [isEditing, setIsEditing] = useState(false)

  // Load brand from API + local config
  const loadData = useCallback(async () => {
    setIsLoading(true)
    const config = getLocalConfig()
    setLocalConfig(config)

    try {
      if (user?.id) {
        const res = await api.getBrands(user.id)
        if (res.data && res.data.length > 0) {
          const b = res.data[0]
          setBrand(b)
          setEditName(b.name || config.brand_name)
          setEditDomain(b.domain || config.domain)
          setEditIndustry(b.industry || '')
          setEditDescription(b.description || '')
          setEditKeywords(b.keywords || config.keywords)
          setEditCompetitors(config.competitors)
        } else {
          setEditName(config.brand_name)
          setEditDomain(config.domain)
          setEditKeywords(config.keywords)
          setEditCompetitors(config.competitors)
        }
      } else {
        setEditName(config.brand_name)
        setEditDomain(config.domain)
        setEditKeywords(config.keywords)
        setEditCompetitors(config.competitors)
      }
    } catch { /* ignore */ } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  useEffect(() => { loadData() }, [loadData])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const newConfig: LocalBrandConfig = {
        brand_name: editName,
        domain: editDomain,
        keywords: editKeywords,
        competitors: editCompetitors,
      }
      localStorage.setItem(BRAND_CONFIG_KEY, JSON.stringify(newConfig))
      setLocalConfig(newConfig)

      if (brand && user?.id) {
        await api.updateBrand(brand.id, {
          name: editName,
          domain: editDomain,
          industry: editIndustry,
          description: editDescription,
          keywords: editKeywords,
        })
      }

      setIsEditing(false)
      toast.success('Brand saved', 'Your brand settings have been updated.')
    } catch {
      toast.error('Save failed', 'Please try again.')
    } finally { setIsSaving(false) }
  }

  const handleCancel = () => {
    setIsEditing(false)
    // Restore from current brand/config
    setEditName(brand?.name || localConfig.brand_name)
    setEditDomain(brand?.domain || localConfig.domain)
    setEditIndustry(brand?.industry || '')
    setEditDescription(brand?.description || '')
    setEditKeywords(brand?.keywords || localConfig.keywords)
    setEditCompetitors(localConfig.competitors)
  }

  if (isLoading) {
    return <div className="min-h-screen bg-gray-50"><BrandHubSkeleton /></div>
  }

  const displayName = editName || localConfig.brand_name || 'Your Brand'
  const displayDomain = editDomain || localConfig.domain

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* ── Header ──────────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Brand Hub</h1>
            <p className="text-gray-500 text-sm mt-1">Your brand's knowledge base — the foundation of all GEO scans</p>
          </div>
          <div className="flex items-center gap-3">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-white text-[13px] font-semibold px-4 py-2 rounded-xl transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit Brand
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={handleCancel} className="px-4 py-2 border border-gray-200 text-gray-700 text-[13px] font-semibold rounded-xl hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-[13px] font-semibold px-4 py-2 rounded-xl transition-colors"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save Changes
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Brand Identity ───────────────────────────────────────────────────── */}
        <SectionCard title="Brand Identity" subtitle="Core brand information used in all AI scans" icon={Building2} iconColor="bg-red-50 text-red-600">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-[12px] font-semibold text-gray-700 mb-1.5 block">Brand Name</label>
              {isEditing ? (
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="e.g., Alignment AI"
                  className="w-full px-3 py-2.5 text-[13px] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-bold text-gray-900">{displayName}</span>
                  {brand && <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-semibold">Synced</span>}
                </div>
              )}
            </div>
            <div>
              <label className="text-[12px] font-semibold text-gray-700 mb-1.5 block">Domain</label>
              {isEditing ? (
                <input
                  value={editDomain}
                  onChange={e => setEditDomain(e.target.value)}
                  placeholder="e.g., alignmenttech.ai"
                  className="w-full px-3 py-2.5 text-[13px] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-gray-400" />
                  {displayDomain ? (
                    <a href={`https://${displayDomain}`} target="_blank" rel="noopener noreferrer" className="text-[13px] text-blue-600 hover:underline flex items-center gap-1">
                      {displayDomain}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-[13px] text-gray-400 italic">Not set</span>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="text-[12px] font-semibold text-gray-700 mb-1.5 block">Industry</label>
              {isEditing ? (
                <input
                  value={editIndustry}
                  onChange={e => setEditIndustry(e.target.value)}
                  placeholder="e.g., AI Software / SaaS"
                  className="w-full px-3 py-2.5 text-[13px] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                />
              ) : (
                <span className="text-[13px] text-gray-700">{editIndustry || <span className="text-gray-400 italic">Not set</span>}</span>
              )}
            </div>
            <div>
              <label className="text-[12px] font-semibold text-gray-700 mb-1.5 block">Brand Description</label>
              {isEditing ? (
                <textarea
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  placeholder="Brief description of your brand and what it does..."
                  rows={2}
                  className="w-full px-3 py-2.5 text-[13px] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 resize-none"
                />
              ) : (
                <p className="text-[13px] text-gray-700 leading-relaxed">
                  {editDescription || <span className="text-gray-400 italic">No description added</span>}
                </p>
              )}
            </div>
          </div>

          {/* Stats if brand exists */}
          {brand && (
            <div className="mt-6 pt-5 border-t border-gray-100 grid grid-cols-3 gap-4">
              {[
                { label: 'AI Mentions', value: brand.mention_count, icon: BarChart3, color: 'text-blue-600' },
                { label: 'Citations', value: brand.citation_count, icon: Target, color: 'text-purple-600' },
                { label: 'AIGVR Score', value: Math.round(brand.aigvr_score), icon: Sparkles, color: 'text-amber-600' },
              ].map(stat => (
                <div key={stat.label} className="text-center">
                  <stat.icon className={`w-4 h-4 mx-auto mb-1 ${stat.color}`} strokeWidth={2} />
                  <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-[10px] text-gray-500">{stat.label}</p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Keywords */}
          <SectionCard title="Brand Keywords" subtitle="Terms AI should associate with your brand" icon={Tag} iconColor="bg-blue-50 text-blue-600">
            {isEditing ? (
              <TagInput
                label="Keywords"
                tags={editKeywords}
                placeholder="e.g., GEO optimization"
                onAdd={v => setEditKeywords(prev => [...prev, v])}
                onRemove={v => setEditKeywords(prev => prev.filter(k => k !== v))}
                tagColor="bg-blue-100 text-blue-700"
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                {editKeywords.length > 0 ? editKeywords.map(kw => (
                  <span key={kw} className="text-[11px] font-medium px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg border border-blue-100">
                    {kw}
                  </span>
                )) : (
                  <p className="text-[12px] text-gray-400 italic">No keywords yet. Edit to add.</p>
                )}
              </div>
            )}
          </SectionCard>

          {/* Competitors */}
          <SectionCard title="Competitors" subtitle="Brands you're tracking against" icon={Users} iconColor="bg-orange-50 text-orange-600">
            {isEditing ? (
              <TagInput
                label="Competitors"
                tags={editCompetitors}
                placeholder="e.g., Semrush, Ahrefs"
                onAdd={v => setEditCompetitors(prev => [...prev, v])}
                onRemove={v => setEditCompetitors(prev => prev.filter(c => c !== v))}
                tagColor="bg-orange-100 text-orange-700"
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                {editCompetitors.length > 0 ? editCompetitors.map(comp => (
                  <span key={comp} className="text-[11px] font-medium px-2.5 py-1 bg-orange-50 text-orange-700 rounded-lg border border-orange-100">
                    {comp}
                  </span>
                )) : (
                  <p className="text-[12px] text-gray-400 italic">No competitors tracked yet.</p>
                )}
              </div>
            )}
          </SectionCard>
        </div>

        {/* ── Knowledge Base Context ─────────────────────────────────────────── */}
        <div className="mt-6">
          <SectionCard title="Knowledge Base" subtitle="AI-readable context about your brand — helps AI engines cite you correctly" icon={Cpu} iconColor="bg-purple-50 text-purple-600">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  title: 'llms.txt',
                  desc: 'Machine-readable brand context file for AI crawlers',
                  status: 'not_set',
                  action: 'Generate',
                  href: '/dashboard/agents',
                  color: 'bg-purple-50 border-purple-200',
                  dot: 'bg-gray-300',
                },
                {
                  title: 'FAQ Content',
                  desc: 'Structured Q&A that AI engines can directly cite',
                  status: 'not_set',
                  action: 'Create',
                  href: '/dashboard/geo-content',
                  color: 'bg-blue-50 border-blue-200',
                  dot: 'bg-gray-300',
                },
                {
                  title: 'Structured Data',
                  desc: 'Schema.org markup for AI-readable entity recognition',
                  status: 'not_set',
                  action: 'Audit',
                  href: '/dashboard/geo-audit',
                  color: 'bg-emerald-50 border-emerald-200',
                  dot: 'bg-gray-300',
                },
              ].map(item => (
                <div key={item.title} className={`rounded-xl border p-4 ${item.color}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2 h-2 rounded-full ${item.dot}`} />
                    <span className="text-[12px] font-bold text-gray-700">{item.title}</span>
                  </div>
                  <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">{item.desc}</p>
                  <Link
                    href={item.href}
                    className="text-[11px] font-semibold text-gray-700 hover:text-gray-900 flex items-center gap-1 transition-colors"
                  >
                    {item.action} <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              ))}
            </div>

            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-800 leading-relaxed">
                <strong>Knowledge Base is the AI era's SEO foundation.</strong> The more structured, machine-readable content you publish, the more likely AI engines are to cite your brand accurately. Start with GEO Audit to identify gaps, then use Content to fill them.
              </p>
            </div>
          </SectionCard>
        </div>

        {/* ── Quick links ──────────────────────────────────────────────────────── */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Run GEO Audit', desc: 'Check AI readiness score', href: '/dashboard/geo-audit', color: 'bg-red-500', icon: Target },
            { label: 'Manage Prompts', desc: 'Edit your tracking queries', href: '/dashboard/prompts', color: 'bg-blue-600', icon: Sparkles },
            { label: 'Create Content', desc: 'Generate AI-cited content', href: '/dashboard/geo-content', color: 'bg-purple-600', icon: BookOpen },
          ].map(item => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-gray-200 transition-all group"
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${item.color}`}>
                <item.icon className="w-4.5 h-4.5 text-white" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-gray-900">{item.label}</p>
                <p className="text-[11px] text-gray-500">{item.desc}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
