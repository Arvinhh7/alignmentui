'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  Users, Plus, X, Edit2, Save, Lightbulb, TrendingUp,
  ChevronRight, Target, Award, BarChart3, Eye, Zap,
} from 'lucide-react'
import { useUnified } from '../UnifiedContext'
import { formatPct } from '../shared/ChartComponents'
import type { MonitorScanResult } from '@/lib/api'

// ─── Types ───────────────────────────────────────────

interface Persona {
  id: string
  name: string
  role: string
  goal: string
  focusIntents: string[]   // which intent categories matter to this persona
  color: string
  icon: string
  isPreset: boolean
}

interface PersonaScore {
  persona: Persona
  visibilityScore: number      // 0-100 weighted visibility
  mentionRate: number          // % prompts where brand appeared
  sentimentScore: number       // 0-100 positive sentiment
  qualityScore: number         // 0-100 avg mention quality
  positioningScore: number     // 0-100 leadership positioning
  relevantPrompts: number      // # prompts relevant to this persona
  topInsights: string[]
  recommendations: string[]
}

// ─── Preset Personas ──────────────────────────────────

const PRESET_PERSONAS: Persona[] = [
  {
    id: 'researcher',
    name: 'Researcher',
    role: 'Analyst / Researcher',
    goal: 'Understand the landscape, compare options, gather facts',
    focusIntents: ['info_cognition', 'information'],
    color: '#4A6FA5',
    icon: '🔬',
    isPreset: true,
  },
  {
    id: 'explorer',
    name: 'Explorer',
    role: 'Solution Seeker',
    goal: 'Explore alternatives and evaluate use cases',
    focusIntents: ['solution_explore', 'comparison'],
    color: '#7B5E96',
    icon: '🧭',
    isPreset: true,
  },
  {
    id: 'decision_maker',
    name: 'Decision Maker',
    role: 'CTO / VP / Director',
    goal: 'Make confident vendor decisions with confidence',
    focusIntents: ['comparison_decision', 'comparison', 'review'],
    color: '#B8860B',
    icon: '🏆',
    isPreset: true,
  },
  {
    id: 'buyer',
    name: 'Buyer',
    role: 'Ready-to-Purchase User',
    goal: 'Find the best product to buy right now',
    focusIntents: ['action_choice', 'recommendation', 'howto'],
    color: '#4A7C59',
    icon: '💳',
    isPreset: true,
  },
]

const PERSONA_COLORS = ['#000000', '#B8860B', '#4A7C59', '#4A6FA5', '#B5453A']
const LOCAL_KEY = 'alignment_custom_personas'

// ─── Scoring Engine ───────────────────────────────────

function OLD_TO_NEW(cat: string): string {
  const map: Record<string, string> = {
    recommendation: 'action_choice',
    comparison: 'comparison_decision',
    information: 'info_cognition',
    review: 'comparison_decision',
    howto: 'action_choice',
  }
  return map[cat] || cat
}

function scorePersona(persona: Persona, scan: MonitorScanResult): PersonaScore {
  const mentions = scan.mention_results ?? []
  if (mentions.length === 0) {
    return {
      persona, visibilityScore: 0, mentionRate: 0, sentimentScore: 0,
      qualityScore: 0, positioningScore: 0, relevantPrompts: 0,
      topInsights: [], recommendations: [],
    }
  }

  // Filter to prompts whose intent matches this persona's focusIntents
  const relevant = mentions.filter(m => {
    const intent = OLD_TO_NEW((m as any).intent || (m as any).category || 'info_cognition')
    return persona.focusIntents.some(fi => fi === intent || fi === (m as any).intent || fi === (m as any).category)
  })

  // If no specific intent match, fall back to all mentions (custom personas)
  const pool = relevant.length > 0 ? relevant : mentions

  const mentioned = pool.filter(m => m.mentioned)
  const mentionRate = pool.length > 0 ? (mentioned.length / pool.length) * 100 : 0

  // Sentiment score (% positive among mentioned)
  const positiveMentions = mentioned.filter(m => m.sentiment === 'positive')
  const sentimentScore = mentioned.length > 0 ? (positiveMentions.length / mentioned.length) * 100 : 0

  // Quality score (avg mention quality, 0-100)
    const avgQuality = mentioned.length > 0
    ? (mentioned.reduce((s, m) => s + ((m as any).mention_quality_score || 0), 0) / mentioned.length) * 100
    : 0

  // Positioning score — leader/challenger = strong, niche = medium
  const positioningPoints = mentioned.map(m => {
    const p = ((m as any).brand_positioning || '').toLowerCase()
    if (p === 'leader') return 100
    if (p === 'challenger') return 75
    if (p === 'niche') return 50
    if (p === 'emerging') return 30
    return 20
  })
  const positioningScore = positioningPoints.length > 0
    ? positioningPoints.reduce((s, v) => s + v, 0) / positioningPoints.length
    : 0

  // Weighted visibility for this persona
  const visibilityScore = Math.round(
    0.40 * mentionRate +
    0.25 * sentimentScore +
    0.20 * Math.min(avgQuality, 100) +
    0.15 * positioningScore
  )

  // Generate insights
  const insights: string[] = []
  if (mentioned.length === 0) {
    insights.push(`${scan.brand_name} is not visible to ${persona.name}s in current AI responses`)
  } else {
    insights.push(`Visible in ${mentioned.length} of ${pool.length} ${persona.role} queries`)
    if (sentimentScore >= 70) insights.push(`Strong positive sentiment (${Math.round(sentimentScore)}%) among this persona`)
    else if (sentimentScore < 40) insights.push(`Negative or neutral perception — sentiment needs improvement`)
    if (positioningScore >= 75) insights.push(`Positioned as a leader/top pick for this audience`)
    else if (positioningScore < 40) insights.push(`Weak brand positioning for this persona's decision criteria`)
  }

  // Recommendations
  const recs: string[] = []
  if (mentionRate < 50) recs.push(`Add more prompts targeting ${persona.role} use cases to improve coverage`)
  if (sentimentScore < 60 && mentioned.length > 0) recs.push(`Improve content addressing ${persona.name} pain points to boost sentiment`)
  if (positioningScore < 50 && mentioned.length > 0) recs.push(`Publish case studies and testimonials that resonate with ${persona.role}s`)
  if (recs.length === 0) recs.push(`Maintain current visibility strategy — strong performance for this persona`)

  return {
    persona, visibilityScore, mentionRate, sentimentScore,
    qualityScore: Math.min(avgQuality, 100), positioningScore,
    relevantPrompts: pool.length,
    topInsights: insights,
    recommendations: recs,
  }
}

// ─── Radar chart (SVG, 4 axes) ────────────────────────

function RadarChart({ scores }: { scores: PersonaScore[] }) {
  const metrics = ['Visibility', 'Sentiment', 'Quality', 'Positioning']
  const n = metrics.length
  const R = 90, CX = 110, CY = 110
  const angleStep = (2 * Math.PI) / n
  const toPoint = (angle: number, r: number) => ({
    x: CX + r * Math.sin(angle),
    y: CY - r * Math.cos(angle),
  })

  const rings = [25, 50, 75, 100]
  const firstFour = scores.slice(0, 4)

  return (
    <svg viewBox={`0 0 220 220`} className="w-full max-w-[280px] mx-auto h-auto">
      {/* Grid rings */}
      {rings.map(ring => {
        const pts = Array.from({ length: n }, (_, i) => {
          const p = toPoint(i * angleStep, (ring / 100) * R)
          return `${p.x},${p.y}`
        })
        return <polygon key={ring} points={pts.join(' ')} fill="none" stroke="#f0f0f0" strokeWidth="0.8" />
      })}
      {/* Axes */}
      {metrics.map((label, i) => {
        const angle = i * angleStep
        const tip = toPoint(angle, R)
        const labelPt = toPoint(angle, R + 18)
        return (
          <g key={label}>
            <line x1={CX} y1={CY} x2={tip.x} y2={tip.y} stroke="#C8BFB0" strokeWidth="0.8" />
            <text x={labelPt.x} y={labelPt.y} textAnchor="middle" dominantBaseline="middle"
              fontSize="8" fill="#2D2B27" fontFamily="system-ui, sans-serif">{label}</text>
          </g>
        )
      })}
      {/* Persona polygons */}
      {firstFour.map(ps => {
        const values = [ps.visibilityScore, ps.sentimentScore, ps.qualityScore, ps.positioningScore]
        const pts = values.map((v, i) => {
          const p = toPoint(i * angleStep, (Math.min(v, 100) / 100) * R)
          return `${p.x},${p.y}`
        })
        return (
          <polygon key={ps.persona.id}
            points={pts.join(' ')}
            fill={ps.persona.color}
            fillOpacity="0.12"
            stroke={ps.persona.color}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        )
      })}
      {/* Center dot */}
      <circle cx={CX} cy={CY} r="2" fill="#C8BFB0" />
    </svg>
  )
}

// ─── Persona Score Card ───────────────────────────────

function PersonaCard({ ps, isSelected, onClick }: { ps: PersonaScore; isSelected: boolean; onClick: () => void }) {
  const { persona, visibilityScore, mentionRate, sentimentScore, relevantPrompts } = ps
  const scoreColor = visibilityScore >= 65 ? 'text-sage'
    : visibilityScore >= 35 ? 'text-caution'
    : 'text-red-soft'
  const scoreBg = visibilityScore >= 65 ? 'bg-sage-bg border-sage/30'
    : visibilityScore >= 35 ? 'bg-caution-bg border-caution/30'
    : 'bg-red-soft-bg border-red-soft/30'

  return (
    <button onClick={onClick}
      className={`w-full text-left rounded-xl border p-4 transition-all ${
        isSelected ? 'border-2 shadow-md' : 'border border-divider hover:shadow-sm'
      }`}
      style={isSelected ? { borderColor: persona.color } : {}}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">{persona.icon}</span>
          <div>
            <div className="text-sm font-bold text-ink">{persona.name}</div>
            <div className="text-xs text-ink-3">{persona.role}</div>
          </div>
        </div>
        <div className={`text-right px-2 py-1 rounded-lg ${scoreBg}`}>
          <div className={`text-xl font-bold font-mono ${scoreColor}`}>{visibilityScore}</div>
          <div className="text-[9px] text-ink-3 font-medium">/ 100</div>
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-ink-3">Mention Rate</span>
          <span className="font-mono font-medium text-ink-2">{formatPct(mentionRate)}</span>
        </div>
        <div className="h-1.5 bg-surface-warm rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${Math.min(mentionRate, 100)}%`, backgroundColor: persona.color }} />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-ink-3">Sentiment</span>
          <span className="font-mono font-medium text-ink-2">{formatPct(sentimentScore)}</span>
        </div>
        <div className="h-1.5 bg-surface-warm rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-sage transition-all duration-700"
            style={{ width: `${Math.min(sentimentScore, 100)}%` }} />
        </div>
      </div>
      <div className="mt-3 text-[10px] text-ink-3">
        {relevantPrompts} relevant prompt{relevantPrompts !== 1 ? 's' : ''} analyzed
      </div>
    </button>
  )
}

// ─── Custom Persona Form ──────────────────────────────

interface CustomPersonaForm {
  name: string
  role: string
  goal: string
  focusKeywords: string
}

function CustomPersonaModal({ onSave, onClose, editPersona }: {
  onSave: (p: Persona) => void
  onClose: () => void
  editPersona?: Persona
}) {
  const [form, setForm] = useState<CustomPersonaForm>({
    name: editPersona?.name ?? '',
    role: editPersona?.role ?? '',
    goal: editPersona?.goal ?? '',
    focusKeywords: editPersona?.focusIntents.join(', ') ?? '',
  })

  const handleSave = () => {
    if (!form.name.trim()) return
    const persona: Persona = {
      id: editPersona?.id ?? `custom_${Date.now()}`,
      name: form.name.trim(),
      role: form.role.trim() || form.name.trim(),
      goal: form.goal.trim() || 'Find the best solutions',
      focusIntents: form.focusKeywords.split(',').map(k => k.trim()).filter(Boolean),
      color: PERSONA_COLORS[Math.floor(Math.random() * PERSONA_COLORS.length)],
      icon: '👤',
      isPreset: false,
    }
    onSave(persona)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-ink">
            {editPersona ? 'Edit Persona' : 'Add Custom Persona'}
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-warm rounded-lg transition-colors">
            <X className="w-4 h-4 text-ink-3" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-2 mb-1.5">Persona Name *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Enterprise IT Manager"
              className="w-full px-3 py-2 text-sm border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-2 mb-1.5">Role / Title</label>
            <input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              placeholder="e.g. IT Manager at Fortune 500"
              className="w-full px-3 py-2 text-sm border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-2 mb-1.5">Primary Goal</label>
            <input value={form.goal} onChange={e => setForm(f => ({ ...f, goal: e.target.value }))}
              placeholder="e.g. Evaluate enterprise AI monitoring tools"
              className="w-full px-3 py-2 text-sm border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-2 mb-1.5">Focus Query Types</label>
            <input value={form.focusKeywords} onChange={e => setForm(f => ({ ...f, focusKeywords: e.target.value }))}
              placeholder="e.g. comparison_decision, solution_explore"
              className="w-full px-3 py-2 text-sm border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink" />
            <p className="text-[10px] text-ink-3 mt-1">
              Available: info_cognition, solution_explore, comparison_decision, action_choice
            </p>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose}
            className="flex-1 px-4 py-2 border border-divider text-ink-2 text-sm rounded-xl hover:bg-surface-warm transition-colors">
            Cancel
          </button>
          <button onClick={handleSave}
            disabled={!form.name.trim()}
            className="flex-1 px-4 py-2 bg-ink hover:bg-[#2d2d2c] text-ink-inv text-sm font-medium rounded-xl disabled:bg-surface-muted disabled:text-ink-3 disabled:cursor-not-allowed transition-colors">
            {editPersona ? 'Save Changes' : 'Add Persona'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────

export function PersonasTab() {
  const ctx = useUnified()
  const scan = ctx.scanResult

  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('researcher')
  const [showModal, setShowModal] = useState(false)
  const [editPersona, setEditPersona] = useState<Persona | undefined>()

  // Load/persist custom personas from localStorage
  const [customPersonas, setCustomPersonas] = useState<Persona[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const raw = localStorage.getItem(LOCAL_KEY)
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  })

  const saveCustomPersonas = useCallback((personas: Persona[]) => {
    setCustomPersonas(personas)
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(personas)) } catch {}
  }, [])

  const allPersonas = useMemo(() => [...PRESET_PERSONAS, ...customPersonas], [customPersonas])

  // Compute scores from existing scan data
  const personaScores = useMemo(() => {
    if (!scan) return []
    return allPersonas.map(p => scorePersona(p, scan))
  }, [allPersonas, scan])

  const selectedScore = useMemo(
    () => personaScores.find(ps => ps.persona.id === selectedPersonaId) ?? personaScores[0],
    [personaScores, selectedPersonaId]
  )

  const handleAddPersona = (persona: Persona) => {
    if (editPersona) {
      saveCustomPersonas(customPersonas.map(p => p.id === persona.id ? persona : p))
    } else {
      saveCustomPersonas([...customPersonas, persona])
    }
    setEditPersona(undefined)
    setSelectedPersonaId(persona.id)
  }

  const handleDeletePersona = (id: string) => {
    saveCustomPersonas(customPersonas.filter(p => p.id !== id))
    if (selectedPersonaId === id) setSelectedPersonaId('researcher')
  }

  // No scan state
  if (!scan) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 bg-surface-warm rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Users className="w-8 h-8 text-ink-3" />
        </div>
        <h3 className="text-base font-semibold text-ink-2 mb-2">No scan data yet</h3>
        <p className="text-sm text-ink-3 max-w-sm mx-auto">
          Run a scan first. Personas analyzes your existing scan results through the lens of different user types to show you who can — and who can&apos;t — find your brand in AI.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {showModal && (
        <CustomPersonaModal
          onSave={handleAddPersona}
          onClose={() => { setShowModal(false); setEditPersona(undefined) }}
          editPersona={editPersona}
        />
      )}

      {/* ═══ Header ════════════════════════════════════ */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-ink flex items-center gap-2">
            <Users className="w-5 h-5 text-ink-3" />
            Persona Visibility Analysis
          </h3>
          <p className="text-xs text-ink-3 mt-0.5">
            How different user types experience your brand in AI responses
          </p>
        </div>
        <button onClick={() => { setEditPersona(undefined); setShowModal(true) }}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-ink hover:bg-[#2d2d2c] text-ink-inv rounded-xl text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" />
          Add Persona
        </button>
      </div>

      {/* ═══ Radar + Persona Cards ══════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Radar chart panel */}
        <div className="lg:col-span-1 bg-surface rounded-xl border border-divider p-5">
          <h4 className="text-xs font-semibold text-ink-3 uppercase tracking-wider mb-4">
            Persona Comparison
          </h4>
          <RadarChart scores={personaScores} />
          {/* Legend */}
          <div className="mt-4 flex flex-col gap-1.5">
            {personaScores.slice(0, 4).map(ps => (
              <button key={ps.persona.id}
                onClick={() => setSelectedPersonaId(ps.persona.id)}
                className={`flex items-center gap-2 px-2 py-1 rounded-lg transition-colors text-left ${
                  selectedPersonaId === ps.persona.id ? 'bg-canvas' : 'hover:bg-surface-warm/50'
                }`}
              >
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: ps.persona.color }} />
                <span className="text-xs font-medium text-ink-2">{ps.persona.name}</span>
                <span className="ml-auto text-xs font-mono font-bold" style={{ color: ps.persona.color }}>
                  {ps.visibilityScore}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Persona score cards */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {personaScores.map(ps => (
              <PersonaCard
                key={ps.persona.id}
                ps={ps}
                isSelected={selectedPersonaId === ps.persona.id}
                onClick={() => setSelectedPersonaId(ps.persona.id)}
              />
            ))}
          </div>
          {/* Custom persona management */}
          {customPersonas.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {customPersonas.map(p => (
                <div key={p.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-warm rounded-full text-xs text-ink-2">
                  <span>{p.icon}</span>
                  <span>{p.name}</span>
                  <button onClick={() => { setEditPersona(p); setShowModal(true) }}
                    className="hover:text-ink transition-colors ml-0.5">
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button onClick={() => handleDeletePersona(p.id)}
                    className="hover:text-red-soft transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══ Selected Persona Deep Dive ═════════════════ */}
      {selectedScore && (
        <div className="bg-surface rounded-xl border border-divider p-6">
          <div className="flex items-start gap-4 mb-5">
            <span className="text-3xl">{selectedScore.persona.icon}</span>
            <div className="flex-1">
              <h4 className="text-base font-bold text-ink">{selectedScore.persona.name}</h4>
              <p className="text-xs text-ink-3">{selectedScore.persona.role}</p>
              <p className="text-xs text-ink-3 mt-0.5 italic">&ldquo;{selectedScore.persona.goal}&rdquo;</p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-black font-mono" style={{ color: selectedScore.persona.color }}>
                {selectedScore.visibilityScore}
              </div>
              <div className="text-xs text-ink-3">Persona Score</div>
            </div>
          </div>

          {/* 4-metric breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Mention Rate', value: selectedScore.mentionRate, icon: <Eye className="w-4 h-4 text-ink-2" />, color: '#4A6FA5' },
              { label: 'Sentiment', value: selectedScore.sentimentScore, icon: <TrendingUp className="w-4 h-4 text-sage" />, color: '#4A7C59' },
              { label: 'Quality', value: selectedScore.qualityScore, icon: <Award className="w-4 h-4 text-caution" />, color: '#B8860B' },
              { label: 'Positioning', value: selectedScore.positioningScore, icon: <Target className="w-4 h-4 text-ink-2" />, color: '#7B5E96' },
            ].map(metric => (
              <div key={metric.label} className="bg-canvas rounded-xl p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  {metric.icon}
                  <span className="text-xs font-medium text-ink-2">{metric.label}</span>
                </div>
                <div className="text-2xl font-bold font-mono text-ink mb-1.5">
                  {Math.round(metric.value)}
                </div>
                <div className="h-1.5 bg-surface-warm rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(metric.value, 100)}%`, backgroundColor: metric.color }} />
                </div>
              </div>
            ))}
          </div>

          {/* Insights + Recommendations side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <h5 className="text-xs font-semibold text-ink-2 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-caution" />
                Key Insights
              </h5>
              <div className="space-y-2">
                {selectedScore.topInsights.map((insight, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-ink-2">
                    <ChevronRight className="w-4 h-4 text-caution flex-shrink-0 mt-0.5" />
                    {insight}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h5 className="text-xs font-semibold text-ink-2 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-ink-3" />
                Recommendations
              </h5>
              <div className="space-y-2">
                {selectedScore.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-ink-2">
                    <ChevronRight className="w-4 h-4 text-ink-3 flex-shrink-0 mt-0.5" />
                    {rec}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ All Personas Ranking Table ═════════════════ */}
      <div className="bg-surface rounded-xl border border-divider p-5">
        <h4 className="text-sm font-semibold text-ink-2 mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-ink-3" />
          All Personas — Ranked by Visibility Score
        </h4>
        <div className="space-y-3">
          {[...personaScores].sort((a, b) => b.visibilityScore - a.visibilityScore).map((ps, rank) => (
            <button key={ps.persona.id} onClick={() => setSelectedPersonaId(ps.persona.id)}
              className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all ${
                selectedPersonaId === ps.persona.id ? 'bg-canvas ring-1 ring-divider' : 'hover:bg-surface-warm/50'
              }`}
            >
              <span className="text-sm font-bold text-ink-3 w-6 text-right">#{rank + 1}</span>
              <span className="text-xl">{ps.persona.icon}</span>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium text-ink">{ps.persona.name}</div>
                <div className="text-xs text-ink-3">{ps.persona.role}</div>
              </div>
              <div className="flex-1">
                <div className="h-2 bg-surface-warm rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${ps.visibilityScore}%`, backgroundColor: ps.persona.color }} />
                </div>
              </div>
              <div className="w-12 text-right font-mono font-bold text-sm" style={{ color: ps.persona.color }}>
                {ps.visibilityScore}
              </div>
              <div className="w-16 text-right text-xs text-ink-3 font-mono">
                {formatPct(ps.mentionRate)}
              </div>
              <div className="w-14 text-right text-xs text-ink-3 font-mono">
                {formatPct(ps.sentimentScore)}
              </div>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-6 mt-4 pt-3 border-t border-divider-light text-[10px] text-ink-3">
          <span className="ml-auto flex items-center gap-4">
            <span>Score = weighted visibility metric</span>
            <span>Mention Rate = % relevant prompts visible</span>
            <span>Sentiment = % positive</span>
          </span>
        </div>
      </div>
    </div>
  )
}
