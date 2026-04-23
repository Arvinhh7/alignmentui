'use client'

import { useState } from 'react'
import { Shield, Target, TrendingUp, CheckCircle, AlertTriangle, XCircle, Search } from 'lucide-react'

/* ─────────────────────────────────────────────────────────────
   Three brightness variants, each with isolated CSS tokens.
   User compares visually and picks the preferred one.
   ───────────────────────────────────────────────────────────── */

type Variant = {
  id: string
  label: string
  description: string
  tokens: {
    canvas: string
    surface: string
    surfaceWarm: string
    ink: string
    ink2: string
    ink3: string
    divider: string
    dividerLight: string
    shadowCard: string
    shadowCardStrong: string
    sageBg: string
    cautionBg: string
    redBg: string
  }
}

const VARIANTS: Variant[] = [
  {
    id: 'current',
    label: 'Current',
    description: '当前生产环境',
    tokens: {
      canvas:       '#FAF7F2',
      surface:      '#FFFFFF',
      surfaceWarm:  '#F3EDE4',
      ink:          '#191918',
      ink2:         '#6B6860',
      ink3:         '#9C978E',
      divider:      '#E0DBD2',
      dividerLight: '#EDE8E0',
      shadowCard:        '0 1px 3px rgba(25,25,24,0.04)',
      shadowCardStrong:  '0 4px 16px rgba(25,25,24,0.06)',
      sageBg:       'rgba(74,124,89,0.08)',
      cautionBg:    'rgba(184,134,11,0.08)',
      redBg:        'rgba(181,69,58,0.08)',
    },
  },
  {
    id: 'option-a',
    label: 'Option A — Cleaner Cream',
    description: '提亮画布 + 加强文字对比（保持暖色调）',
    tokens: {
      canvas:       '#FDFBF7',   // ↑ brighter cream
      surface:      '#FFFFFF',
      surfaceWarm:  '#F6F1E8',   // ↑ slightly brighter
      ink:          '#141413',   // ↑ slightly darker primary
      ink2:         '#4A4844',   // ↑ much darker body text (was #6B6860)
      ink3:         '#7A7670',   // ↑ darker captions (was #9C978E)
      divider:      '#D6D0C4',   // ↑ stronger borders
      dividerLight: '#E8E3DA',
      shadowCard:        '0 1px 4px rgba(25,25,24,0.06)',
      shadowCardStrong:  '0 6px 20px rgba(25,25,24,0.10)',
      sageBg:       'rgba(74,124,89,0.10)',
      cautionBg:    'rgba(184,134,11,0.10)',
      redBg:        'rgba(181,69,58,0.10)',
    },
  },
  {
    id: 'option-b',
    label: 'Option B — Bright Whitespace',
    description: '接近白色画布 + 强阴影（最亮版本）',
    tokens: {
      canvas:       '#FEFCF8',   // ↑↑ near-white with warm hint
      surface:      '#FFFFFF',
      surfaceWarm:  '#F9F5ED',
      ink:          '#0F0F0E',   // ↑↑ deeper black
      ink2:         '#3F3D38',   // ↑↑ strong body text
      ink3:         '#6B6860',   // ↑↑ darker captions
      divider:      '#CFC8BB',   // ↑↑ much stronger definition
      dividerLight: '#E8E3DA',
      shadowCard:        '0 2px 6px rgba(25,25,24,0.08)',
      shadowCardStrong:  '0 10px 28px rgba(25,25,24,0.14)',
      sageBg:       'rgba(74,124,89,0.12)',
      cautionBg:    'rgba(184,134,11,0.12)',
      redBg:        'rgba(181,69,58,0.12)',
    },
  },
  {
    id: 'option-c',
    label: 'Option C — Max Contrast',
    description: '纯白画布 + 极限对比度（WCAG AAA 级）',
    tokens: {
      canvas:       '#FFFFFF',   // pure white
      surface:      '#FFFFFF',
      surfaceWarm:  '#EDE3D0',   // warm accent — deeper tint for structure
      ink:          '#000000',   // pure black headlines
      ink2:         '#0A0A0A',   // near-pure-black body (21:1 contrast ratio)
      ink3:         '#2D2B27',   // strong captions (14:1 contrast ratio)
      divider:      '#9E9484',   // deep taupe borders — max card definition
      dividerLight: '#C8BFB0',
      shadowCard:        '0 4px 14px rgba(0,0,0,0.16)',
      shadowCardStrong:  '0 20px 50px rgba(0,0,0,0.24)',
      sageBg:       'rgba(74,124,89,0.18)',
      cautionBg:    'rgba(184,134,11,0.18)',
      redBg:        'rgba(181,69,58,0.18)',
    },
  },
  {
    id: 'option-d',
    label: 'Option D — Warm + Max Contrast',
    description: '暖米画布 × 纯白卡片 × 极限对比度（两者兼得）',
    tokens: {
      canvas:       '#FAF5EC',   // warm cream — brighter than current, keeps Anthropic warmth
      surface:      '#FFFFFF',   // pure white cards pop against warm canvas
      surfaceWarm:  '#EDE3D0',   // deep warm accent for nested items
      ink:          '#000000',   // pure black headlines
      ink2:         '#0A0A0A',   // near-pure-black body (21:1 contrast on white card)
      ink3:         '#2D2B27',   // strong captions
      divider:      '#9E9484',   // deep taupe — max card definition
      dividerLight: '#C8BFB0',
      shadowCard:        '0 4px 14px rgba(0,0,0,0.12)',
      shadowCardStrong:  '0 20px 50px rgba(0,0,0,0.18)',
      sageBg:       'rgba(74,124,89,0.14)',
      cautionBg:    'rgba(184,134,11,0.14)',
      redBg:        'rgba(181,69,58,0.14)',
    },
  },
]

export default function DemoBrightnessPage() {
  const [active, setActive] = useState<string>('current')
  const variant = VARIANTS.find(v => v.id === active)!
  const t = variant.tokens

  return (
    <div className="min-h-screen" style={{ background: '#ECE8E1', padding: '24px' }}>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2" style={{ color: '#191918' }}>
          Brightness Optimization Demo
        </h1>
        <p className="mb-6" style={{ color: '#6B6860' }}>
          三个亮度方案对比。点击切换查看效果，选一个最亮但仍保持 Alignment 品牌暖色调。
        </p>

        {/* Variant switcher */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {VARIANTS.map(v => (
            <button
              key={v.id}
              onClick={() => setActive(v.id)}
              className="px-4 py-2 text-sm rounded-lg transition-all"
              style={{
                background: active === v.id ? '#191918' : '#FFFFFF',
                color:      active === v.id ? '#FAF7F2' : '#191918',
                border:     active === v.id ? '1px solid #191918' : '1px solid #E0DBD2',
                fontWeight: active === v.id ? 600 : 500,
              }}
            >
              {v.label}
            </button>
          ))}
        </div>
        <p className="text-sm mb-6" style={{ color: '#6B6860' }}>
          <strong>当前方案：</strong>{variant.description}
          <span className="ml-3 font-mono text-xs" style={{ color: '#9C978E' }}>
            canvas {t.canvas} · body {t.ink2} · divider {t.divider}
          </span>
        </p>

        {/* ─── Mock GEO Audit dashboard with variant tokens ─── */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: t.canvas, padding: '32px', border: `1px solid ${t.divider}` }}
        >
          {/* Header card */}
          <div
            className="rounded-2xl p-6 mb-6"
            style={{
              background: t.surface,
              border: `1px solid ${t.dividerLight}`,
              boxShadow: t.shadowCardStrong,
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: t.surfaceWarm }}
              >
                <Search size={20} style={{ color: t.ink }} />
              </div>
              <div>
                <h2 className="text-xl font-bold" style={{ color: t.ink }}>
                  GEO Audit: AI Readiness Check
                </h2>
                <p className="text-sm" style={{ color: t.ink2 }}>
                  Enter your website URL to analyze how well it's optimized for AI platform visibility
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="https://www.example.com"
                className="flex-1 px-4 py-3 rounded-lg text-sm outline-none"
                style={{
                  background: t.surface,
                  border: `1px solid ${t.divider}`,
                  color: t.ink,
                }}
                defaultValue="https://www.myteadrop.com/"
              />
              <button
                className="px-5 py-3 rounded-lg text-sm font-semibold flex items-center gap-2"
                style={{ background: t.ink, color: '#FAF7F2' }}
              >
                <Search size={14} />
                Run GEO Audit
              </button>
            </div>
          </div>

          {/* Strongest / Priority cards */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div
              className="rounded-2xl p-5"
              style={{
                background: t.sageBg,
                border: `1px solid ${t.dividerLight}`,
                boxShadow: t.shadowCard,
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={14} style={{ color: '#4A7C59' }} />
                <span
                  className="text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: '#4A7C59' }}
                >
                  Strongest Dimension
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Shield size={16} style={{ color: t.ink }} />
                    <span className="font-semibold" style={{ color: t.ink }}>Risk Boundary</span>
                  </div>
                  <p className="text-xs" style={{ color: t.ink2 }}>
                    This is your best-performing area for AI visibility.
                  </p>
                </div>
                <div className="text-3xl font-bold" style={{ color: '#4A7C59' }}>80</div>
              </div>
            </div>

            <div
              className="rounded-2xl p-5"
              style={{
                background: t.redBg,
                border: `1px solid ${t.dividerLight}`,
                boxShadow: t.shadowCard,
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Target size={14} style={{ color: '#B5453A' }} />
                <span
                  className="text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: '#B5453A' }}
                >
                  Priority to Fix
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Shield size={16} style={{ color: t.ink }} />
                    <span className="font-semibold" style={{ color: t.ink }}>AI Discovery</span>
                  </div>
                  <p className="text-xs" style={{ color: t.ink2 }}>
                    Improving this dimension will have the biggest impact on your score.
                  </p>
                </div>
                <div className="text-3xl font-bold" style={{ color: '#B5453A' }}>5</div>
              </div>
            </div>
          </div>

          {/* Score + Summary row */}
          <div className="grid grid-cols-3 gap-4">
            {/* Score card */}
            <div
              className="rounded-2xl p-6 flex flex-col items-center justify-center"
              style={{
                background: t.surface,
                border: `1px solid ${t.dividerLight}`,
                boxShadow: t.shadowCard,
              }}
            >
              <div className="relative w-32 h-32 mb-3">
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                  <circle cx="60" cy="60" r="50" stroke={t.dividerLight} strokeWidth="8" fill="none" />
                  <circle
                    cx="60" cy="60" r="50"
                    stroke="#B8860B" strokeWidth="8" fill="none"
                    strokeDasharray={`${47 * 3.14} ${53 * 3.14}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-4xl font-bold" style={{ color: '#B8860B' }}>47</div>
                  <div className="text-xs" style={{ color: t.ink3 }}>/ 100</div>
                </div>
              </div>
              <p className="text-xs mb-1" style={{ color: t.ink3 }}>Top 65% of websites</p>
              <h3 className="text-sm font-bold mb-1" style={{ color: t.ink }}>Overall Score</h3>
              <div
                className="px-2 py-0.5 rounded text-[10px] font-semibold"
                style={{ background: t.cautionBg, color: '#B8860B' }}
              >
                Grade F
              </div>
            </div>

            {/* Radar placeholder */}
            <div
              className="rounded-2xl p-5"
              style={{
                background: t.surface,
                border: `1px solid ${t.dividerLight}`,
                boxShadow: t.shadowCard,
              }}
            >
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: t.ink3 }}>
                5 Dimension Overview
              </h3>
              <div className="flex items-center justify-center h-32">
                <svg viewBox="0 0 200 160" className="w-full h-full">
                  <polygon
                    points="100,20 180,70 150,140 50,140 20,70"
                    fill="none" stroke={t.divider} strokeWidth="1"
                  />
                  <polygon
                    points="100,50 145,80 135,120 65,120 55,80"
                    fill="rgba(184,134,11,0.2)" stroke="#B8860B" strokeWidth="1.5"
                  />
                  <text x="100" y="15" textAnchor="middle" fontSize="10" fill={t.ink2}>Accessibility</text>
                  <text x="190" y="72" textAnchor="middle" fontSize="10" fill={t.ink2}>Struct</text>
                  <text x="155" y="155" textAnchor="middle" fontSize="10" fill={t.ink2}>Citability</text>
                  <text x="45" y="155" textAnchor="middle" fontSize="10" fill={t.ink2}>Risk</text>
                  <text x="10" y="72" textAnchor="middle" fontSize="10" fill={t.ink2}>Usability</text>
                </svg>
              </div>
            </div>

            {/* Audit Summary */}
            <div
              className="rounded-2xl p-5"
              style={{
                background: t.surface,
                border: `1px solid ${t.dividerLight}`,
                boxShadow: t.shadowCard,
              }}
            >
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: t.ink3 }}>
                Audit Summary
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <SummaryBox icon={<CheckCircle size={14} />} value={10} label="Passed" color="#4A7C59" bg={t.sageBg} tokens={t} />
                <SummaryBox icon={<AlertTriangle size={14} />} value={6} label="Warnings" color="#B8860B" bg={t.cautionBg} tokens={t} />
                <SummaryBox icon={<XCircle size={14} />} value={12} label="Critical Issues" color="#B5453A" bg={t.redBg} tokens={t} />
                <SummaryBox icon={<Search size={14} />} value={28} label="Checks Performed" color={t.ink} bg={t.surfaceWarm} tokens={t} />
              </div>
            </div>
          </div>
        </div>

        {/* Side-by-side token diff */}
        <div className="mt-8 rounded-xl p-5" style={{ background: '#FFFFFF', border: '1px solid #E0DBD2' }}>
          <h3 className="text-sm font-bold mb-3" style={{ color: '#191918' }}>Token Comparison</h3>
          <table className="w-full text-xs font-mono">
            <thead>
              <tr style={{ borderBottom: '1px solid #E0DBD2' }}>
                <th className="text-left py-2 pr-4" style={{ color: '#6B6860' }}>Token</th>
                {VARIANTS.map(v => (
                  <th key={v.id} className="text-left py-2 px-3" style={{ color: '#6B6860' }}>{v.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(['canvas','ink2','ink3','divider','surfaceWarm'] as const).map(key => (
                <tr key={key} style={{ borderBottom: '1px solid #EDE8E0' }}>
                  <td className="py-2 pr-4 font-semibold" style={{ color: '#191918' }}>{key}</td>
                  {VARIANTS.map(v => (
                    <td key={v.id} className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ background: v.tokens[key], border: '1px solid #E0DBD2' }}
                        />
                        <span style={{ color: '#191918' }}>{v.tokens[key]}</span>
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function SummaryBox({
  icon, value, label, color, bg, tokens,
}: {
  icon: React.ReactNode
  value: number
  label: string
  color: string
  bg: string
  tokens: Variant['tokens']
}) {
  return (
    <div
      className="rounded-lg p-3"
      style={{ background: tokens.surface, border: `1px solid ${tokens.dividerLight}` }}
    >
      <div className="flex items-center gap-2 mb-1">
        <div
          className="w-6 h-6 rounded flex items-center justify-center"
          style={{ background: bg, color }}
        >
          {icon}
        </div>
      </div>
      <div className="text-lg font-bold" style={{ color: tokens.ink }}>{value}</div>
      <div className="text-[10px]" style={{ color: tokens.ink3 }}>{label}</div>
    </div>
  )
}
