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
    <div className="bg-surface rounded-2xl border border-divider-light shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-divider-light flex items-start gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconColor}`}>
          <Icon className="w-4.5 h-4.5" strokeWidth={2} />
        </div>
        <div>
          <h3 className="text-[14px] font-bold text-ink">{title}</h3>
          {subtitle && <p className="text-[11px] text-ink-3 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

// ─── Tag input ─────────────────────────────────────────────────────────────────
function TagInput({
  label, tags, placeholder, onAdd, onRemove, tagColor = 'bg-surface-muted text-ink-2',
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
      <label className="text-[12px] font-semibold text-ink-2 mb-2 block">{label}</label>
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
          className="flex-1 px-3 py-2 text-[13px] border border-divider rounded-xl focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink"
        />
        <button
          onClick={submit}
          disabled={!input.trim()}
          className="px-3 py-2 bg-surface-muted hover:bg-surface-warm disabled:opacity-40 text-ink-2 text-[12px] font-semibold rounded-xl transition-colors"
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
    return <div className="min-h-screen bg-canvas"><BrandHubSkeleton /></div>
  }

  const displayName = editName || localConfig.brand_name || 'Your Brand'
  const displayDomain = editDomain || localConfig.domain

  return (
    <div className="min-h-screen bg-canvas">
      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* ── Header ──────────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="heading-dash">Brand Hub</h1>
            <p className="text-ink-3 text-sm mt-1">Your brand's knowledge base — the foundation of all GEO scans</p>
          </div>
          <div className="flex items-center gap-3">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 bg-ink hover:bg-[#2d2d2c] text-ink-inv text-[13px] font-semibold px-4 py-2 rounded-xl transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit Brand
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={handleCancel} className="px-4 py-2 border border-divider text-ink-2 text-[13px] font-semibold rounded-xl hover:bg-surface-warm transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 bg-ink hover:bg-[#2d2d2c] disabled:opacity-50 text-ink-inv text-[13px] font-semibold px-4 py-2 rounded-xl transition-colors"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save Changes
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Brand Identity ───────────────────────────────────────────────────── */}
        <SectionCard title="Brand Identity" subtitle="Core brand information used in all AI scans" icon={Building2} iconColor="bg-red-soft-bg text-red-soft">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-[12px] font-semibold text-ink-2 mb-1.5 block">Brand Name</label>
              {isEditing ? (
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="e.g., Alignment AI"
                  className="w-full px-3 py-2.5 text-[13px] border border-divider rounded-xl focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-bold text-ink">{displayName}</span>
                  {brand && <span className="text-[10px] px-2 py-0.5 bg-sage-bg text-sage rounded-full font-semibold">Synced</span>}
                </div>
              )}
            </div>
            <div>
              <label className="text-[12px] font-semibold text-ink-2 mb-1.5 block">Domain</label>
              {isEditing ? (
                <input
                  value={editDomain}
                  onChange={e => setEditDomain(e.target.value)}
                  placeholder="e.g., alignmenttech.ai"
                  className="w-full px-3 py-2.5 text-[13px] border border-divider rounded-xl focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-ink-3" />
                  {displayDomain ? (
                    <a href={`https://${displayDomain}`} target="_blank" rel="noopener noreferrer" className="text-[13px] text-ink underline underline-offset-2 hover:text-ink-2 flex items-center gap-1">
                      {displayDomain}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-[13px] text-ink-3 italic">Not set</span>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="text-[12px] font-semibold text-ink-2 mb-1.5 block">Industry</label>
              {isEditing ? (
                <input
                  value={editIndustry}
                  onChange={e => setEditIndustry(e.target.value)}
                  placeholder="e.g., AI Software / SaaS"
                  className="w-full px-3 py-2.5 text-[13px] border border-divider rounded-xl focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink"
                />
              ) : (
                <span className="text-[13px] text-ink-2">{editIndustry || <span className="text-ink-3 italic">Not set</span>}</span>
              )}
            </div>
            <div>
              <label className="text-[12px] font-semibold text-ink-2 mb-1.5 block">Brand Description</label>
              {isEditing ? (
                <textarea
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  placeholder="Brief description of your brand and what it does..."
                  rows={2}
                  className="w-full px-3 py-2.5 text-[13px] border border-divider rounded-xl focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink resize-none"
                />
              ) : (
                <p className="text-[13px] text-ink-2 leading-relaxed">
                  {editDescription || <span className="text-ink-3 italic">No description added</span>}
                </p>
              )}
            </div>
          </div>

          {/* Stats if brand exists */}
          {brand && (
            <div className="mt-6 pt-5 border-t border-divider-light grid grid-cols-3 gap-4">
              {[
                { label: 'AI Mentions', value: brand.mention_count, icon: BarChart3, color: 'text-ink-2' },
                { label: 'Citations', value: brand.citation_count, icon: Target, color: 'text-ink-2' },
                { label: 'AIGVR Score', value: Math.round(brand.aigvr_score), icon: Sparkles, color: 'text-caution' },
              ].map(stat => (
                <div key={stat.label} className="text-center">
                  <stat.icon className={`w-4 h-4 mx-auto mb-1 ${stat.color}`} strokeWidth={2} />
                  <p className="text-xl font-bold text-ink stat-value">{stat.value}</p>
                  <p className="text-[10px] text-ink-3">{stat.label}</p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Keywords */}
          <SectionCard title="Brand Keywords" subtitle="Terms AI should associate with your brand" icon={Tag} iconColor="bg-surface-warm text-ink-2">
            {isEditing ? (
              <TagInput
                label="Keywords"
                tags={editKeywords}
                placeholder="e.g., GEO optimization"
                onAdd={v => setEditKeywords(prev => [...prev, v])}
                onRemove={v => setEditKeywords(prev => prev.filter(k => k !== v))}
                tagColor="bg-surface-muted text-ink-2"
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                {editKeywords.length > 0 ? editKeywords.map(kw => (
                  <span key={kw} className="text-[11px] font-medium px-2.5 py-1 bg-surface-muted text-ink-2 rounded-lg border border-divider-light">
                    {kw}
                  </span>
                )) : (
                  <p className="text-[12px] text-ink-3 italic">No keywords yet. Edit to add.</p>
                )}
              </div>
            )}
          </SectionCard>

          {/* Competitors */}
          <SectionCard title="Competitors" subtitle="Brands you're tracking against" icon={Users} iconColor="bg-caution-bg text-caution">
            {isEditing ? (
              <TagInput
                label="Competitors"
                tags={editCompetitors}
                placeholder="e.g., Semrush, Ahrefs"
                onAdd={v => setEditCompetitors(prev => [...prev, v])}
                onRemove={v => setEditCompetitors(prev => prev.filter(c => c !== v))}
                tagColor="bg-caution-bg text-caution"
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                {editCompetitors.length > 0 ? editCompetitors.map(comp => (
                  <span key={comp} className="text-[11px] font-medium px-2.5 py-1 bg-caution-bg text-caution rounded-lg border border-caution/20">
                    {comp}
                  </span>
                )) : (
                  <p className="text-[12px] text-ink-3 italic">No competitors tracked yet.</p>
                )}
              </div>
            )}
          </SectionCard>
        </div>

        {/* ── Knowledge Base Context ─────────────────────────────────────────── */}
        <div className="mt-6">
          <SectionCard title="Knowledge Base" subtitle="AI-readable context about your brand — helps AI engines cite you correctly" icon={Cpu} iconColor="bg-surface-warm text-ink-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  title: 'llms.txt',
                  desc: 'Machine-readable brand context file for AI crawlers',
                  status: 'not_set',
                  action: 'Generate',
                  href: '/dashboard/agents',
                  color: 'bg-surface-warm border-divider-light',
                  dot: 'bg-ink-3/50',
                },
                {
                  title: 'FAQ Content',
                  desc: 'Structured Q&A that AI engines can directly cite',
                  status: 'not_set',
                  action: 'Create',
                  href: '/dashboard/geo-content',
                  color: 'bg-surface-warm border-divider-light',
                  dot: 'bg-ink-3/50',
                },
                {
                  title: 'Structured Data',
                  desc: 'Schema.org markup for AI-readable entity recognition',
                  status: 'not_set',
                  action: 'Audit',
                  href: '/dashboard/geo-audit',
                  color: 'bg-surface-warm border-divider-light',
                  dot: 'bg-ink-3/50',
                },
              ].map(item => (
                <div key={item.title} className={`rounded-xl border p-4 ${item.color}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2 h-2 rounded-full ${item.dot}`} />
                    <span className="text-[12px] font-bold text-ink-2">{item.title}</span>
                  </div>
                  <p className="text-[11px] text-ink-3 mb-3 leading-relaxed">{item.desc}</p>
                  <Link
                    href={item.href}
                    className="text-[11px] font-semibold text-ink-2 hover:text-ink flex items-center gap-1 transition-colors"
                  >
                    {item.action} <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              ))}
            </div>

            <div className="mt-4 bg-caution-bg border border-caution/30 rounded-xl p-4 flex items-start gap-3">
              <Info className="w-4 h-4 text-caution flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-caution leading-relaxed">
                <strong>Knowledge Base is the AI era's SEO foundation.</strong> The more structured, machine-readable content you publish, the more likely AI engines are to cite your brand accurately. Start with GEO Audit to identify gaps, then use Content to fill them.
              </p>
            </div>
          </SectionCard>
        </div>

        {/* ── Quick links ──────────────────────────────────────────────────────── */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Run GEO Audit', desc: 'Check AI readiness score', href: '/dashboard/geo-audit', icon: Target },
            { label: 'Manage Prompts', desc: 'Edit your tracking queries', href: '/dashboard/prompts', icon: Sparkles },
            { label: 'Create Content', desc: 'Generate AI-cited content', href: '/dashboard/geo-content', icon: BookOpen },
          ].map(item => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-3 bg-surface border border-divider-light rounded-2xl p-4 shadow-sm hover:shadow-elevation-md hover:border-divider transition-all group"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-ink">
                <item.icon className="w-4.5 h-4.5 text-ink-inv" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-ink">{item.label}</p>
                <p className="text-[11px] text-ink-3">{item.desc}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-ink-3 group-hover:text-ink-2 transition-colors" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
