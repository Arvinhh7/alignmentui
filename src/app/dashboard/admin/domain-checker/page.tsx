'use client'

import { useState, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { adminApi, DomainCheckResult } from '@/lib/api'

// ── Verdict config ─────────────────────────────────────────────────────────────
const VERDICT_CONFIG = {
  compatible: {
    emoji:       '✅',
    label:       '确认可接入',
    sublabel:    '域名检测通过，可以正常接入代理',
    bg:          'bg-[#F0FBF4]',
    border:      'border-[#86EFAC]',
    badgeBg:     'bg-[#DCFCE7]',
    badgeText:   'text-[#166534]',
    titleColor:  'text-[#166534]',
    dotColor:    'bg-[#22C55E]',
    iconBg:      'bg-[#DCFCE7]',
  },
  caution: {
    emoji:       '🔧',
    label:       '工程师复核',
    sublabel:    '需要技术团队进一步确认',
    bg:          'bg-[#FFFBEB]',
    border:      'border-[#FCD34D]',
    badgeBg:     'bg-[#FEF3C7]',
    badgeText:   'text-[#92400E]',
    titleColor:  'text-[#92400E]',
    dotColor:    'bg-[#F59E0B]',
    iconBg:      'bg-[#FEF3C7]',
  },
  blocked: {
    emoji:       '📱',
    label:       '查询app开发',
    sublabel:    '不可直接接入，推荐 App 专属方案',
    bg:          'bg-[#FFF5F5]',
    border:      'border-[#FCA5A5]',
    badgeBg:     'bg-[#FEE2E2]',
    badgeText:   'text-[#991B1B]',
    titleColor:  'text-[#991B1B]',
    dotColor:    'bg-[#EF4444]',
    iconBg:      'bg-[#FEE2E2]',
  },
} as const

type Verdict = keyof typeof VERDICT_CONFIG

// ── Example domains ────────────────────────────────────────────────────────────
const EXAMPLES = [
  { domain: 'myteadrop.com',   label: 'Shopify',     color: 'text-red-500' },
  { domain: 'techcrunch.com',  label: 'WordPress',   color: 'text-green-600' },
  { domain: 'alignmenttech.ai', label: 'Custom+CF',  color: 'text-amber-600' },
]

// ── Loading steps ─────────────────────────────────────────────────────────────
const LOADING_STEPS = [
  '正在解析域名 DNS 记录...',
  '正在检测平台指纹...',
  '正在请求 /cart.json、/meta.json...',
  '正在检测 WAF 防火墙...',
  '正在综合分析检测结果...',
]

export default function DomainCheckerPage() {
  const { user, role, isLoading } = useAuth()
  const router = useRouter()

  const [domain, setDomain]         = useState('')
  const [checking, setChecking]     = useState(false)
  const [loadStep, setLoadStep]     = useState(0)
  const [result, setResult]         = useState<DomainCheckResult | null>(null)
  const [error, setError]           = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auth guard
  if (!isLoading && role !== 'admin') {
    router.replace('/dashboard/overview')
    return null
  }

  const handleCheck = async (overrideDomain?: string) => {
    const target = (overrideDomain ?? domain).trim().toLowerCase()
      .replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '')

    if (!target || !target.includes('.')) {
      setError('请输入有效的域名，例如：myteadrop.com')
      return
    }

    setResult(null)
    setError(null)
    setChecking(true)
    setLoadStep(0)

    // Animate loading steps
    const stepInterval = setInterval(() => {
      setLoadStep(prev => Math.min(prev + 1, LOADING_STEPS.length - 1))
    }, 600)

    try {
      const res = await adminApi.checkDomain(target, user!.id)
      setResult(res)
    } catch (e: any) {
      setError(e?.message ?? '检测失败，请稍后重试')
    } finally {
      clearInterval(stepInterval)
      setChecking(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCheck()
  }

  const verdict = result ? (result.verdict as Verdict) : null
  const vc      = verdict ? VERDICT_CONFIG[verdict] : null

  return (
    <div className="min-h-screen bg-canvas p-6 md:p-8">
      <div className="max-w-3xl mx-auto">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-caution-bg flex items-center justify-center flex-shrink-0">
              <span className="text-lg">🔍</span>
            </div>
            <h1 className="text-[22px] font-bold text-ink">Domain Compatibility Checker</h1>
          </div>
          <p className="text-sm text-ink-3 ml-12">
            输入客户域名，自动检测是否可以接入 Visibility Proxy
          </p>
        </div>

        {/* ── Input card ──────────────────────────────────────────────── */}
        <div className="bg-surface rounded-2xl border border-divider-light p-5 shadow-soft mb-5">
          <label className="block text-xs font-semibold text-ink-2 mb-2 uppercase tracking-wider">
            客户域名
          </label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3 text-sm select-none">
                🌐
              </span>
              <input
                ref={inputRef}
                type="text"
                value={domain}
                onChange={e => { setDomain(e.target.value); setError(null) }}
                onKeyDown={handleKeyDown}
                placeholder="myteadrop.com"
                disabled={checking}
                className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm text-ink bg-canvas
                  placeholder-ink-3 focus:outline-none focus:ring-2 transition-all
                  disabled:opacity-50
                  ${error
                    ? 'border-red-300 focus:ring-red-200'
                    : 'border-divider focus:border-ink-2 focus:ring-[rgba(25,25,24,0.08)]'
                  }`}
              />
            </div>
            <button
              onClick={() => handleCheck()}
              disabled={checking || !domain.trim()}
              className="px-5 py-2.5 bg-ink text-ink-inv text-sm font-semibold rounded-xl
                hover:bg-ink/90 disabled:opacity-40 disabled:cursor-not-allowed
                transition-all active:scale-[0.98] flex items-center gap-2 flex-shrink-0"
            >
              {checking ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  检测中
                </>
              ) : (
                <>
                  <span>🚀</span>
                  开始检测
                </>
              )}
            </button>
          </div>

          {error && (
            <p className="mt-2 text-xs text-red-500 flex items-center gap-1.5">
              <span>⚠️</span> {error}
            </p>
          )}

          {/* Example domains */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-[11px] text-ink-3">示例：</span>
            {EXAMPLES.map(ex => (
              <button
                key={ex.domain}
                onClick={() => { setDomain(ex.domain); handleCheck(ex.domain) }}
                disabled={checking}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-surface-warm border border-divider-light
                  text-ink-2 hover:border-ink-3 hover:text-ink transition-all disabled:opacity-40"
              >
                {ex.domain}
                <span className={`ml-1.5 ${ex.color} font-medium`}>{ex.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Loading state ─────────────────────────────────────────────── */}
        {checking && (
          <div className="bg-surface rounded-2xl border border-divider-light p-6 shadow-soft mb-5">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-full bg-surface-warm flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 animate-spin text-ink-2" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">正在检测 {domain}</p>
                <p className="text-xs text-ink-3">5 项并发检测，预计 10–15 秒</p>
              </div>
            </div>
            <div className="space-y-2">
              {LOADING_STEPS.map((step, i) => (
                <div key={i} className={`flex items-center gap-2.5 text-xs transition-all duration-300
                  ${i <= loadStep ? 'text-ink-2' : 'text-ink-3 opacity-40'}`}
                >
                  {i < loadStep ? (
                    <span className="text-green-500">✓</span>
                  ) : i === loadStep ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-caution animate-pulse inline-block" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-divider inline-block" />
                  )}
                  {step}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Result card ───────────────────────────────────────────────── */}
        {result && vc && (
          <div className="space-y-4">

            {/* Main verdict */}
            <div className={`rounded-2xl border-2 p-6 ${vc.bg} ${vc.border}`}>
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-2xl ${vc.iconBg} flex items-center justify-center flex-shrink-0`}>
                  <span className="text-3xl">{vc.emoji}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap mb-1">
                    <h2 className={`text-xl font-bold ${vc.titleColor}`}>{vc.label}</h2>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${vc.badgeBg} ${vc.badgeText}`}>
                      {result.platform.platform !== 'unknown'
                        ? result.platform.platform.toUpperCase()
                        : 'CUSTOM SITE'}
                    </span>
                    {result.platform.confidence > 0 && (
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${vc.badgeBg} ${vc.badgeText} opacity-80`}>
                        置信度 {(result.platform.confidence * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                  <p className={`text-sm font-medium ${vc.titleColor} opacity-80`}>
                    {result.verdict_reason}
                  </p>
                  <p className="text-xs text-ink-3 mt-0.5">{vc.sublabel}</p>
                </div>
              </div>

              {/* Detected signals */}
              {result.platform.signals.length > 0 && (
                <div className="mt-4 pt-4 border-t border-current/10">
                  <p className={`text-[11px] font-bold uppercase tracking-wider ${vc.titleColor} opacity-60 mb-2`}>
                    检测到的信号（{result.platform.signals.length} 个）
                  </p>
                  <div className="space-y-1">
                    {result.platform.signals.map((sig, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <span className={`mt-0.5 flex-shrink-0 ${vc.dotColor} w-1.5 h-1.5 rounded-full`} />
                        <span className={`${vc.titleColor} opacity-80`}>{sig}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Origin URL guess */}
              {result.origin_url_guess && (
                <div className="mt-3 pt-3 border-t border-current/10 flex items-center gap-2">
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${vc.titleColor} opacity-60`}>
                    推测原站 URL：
                  </span>
                  <code className={`text-[12px] font-mono ${vc.titleColor} opacity-90 bg-white/50 px-2 py-0.5 rounded-lg`}>
                    {result.origin_url_guess}
                  </code>
                </div>
              )}
            </div>

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <div className="bg-surface rounded-2xl border border-divider-light p-5 shadow-soft">
                <h3 className="text-xs font-bold text-ink-2 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span>💡</span> 建议操作
                </h3>
                <ol className="space-y-2">
                  {result.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-ink-2">
                      <span className="w-5 h-5 rounded-full bg-surface-warm border border-divider text-[10px] font-bold
                        text-ink-3 flex items-center justify-center flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      {rec}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Technical details grid */}
            <div className="bg-surface rounded-2xl border border-divider-light p-5 shadow-soft">
              <h3 className="text-xs font-bold text-ink-2 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span>🔬</span> 详细检测报告
              </h3>

              {/* Check items */}
              <div className="space-y-2.5 mb-5">
                {result.checks_detail.map((c, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px]
                      ${c.passed ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                      {c.passed ? '✓' : '!'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[12px] font-semibold text-ink">{c.name}</span>
                      <p className="text-[11px] text-ink-3 mt-0.5">{c.detail}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* DNS info */}
              <div className="pt-4 border-t border-divider-light">
                <p className="text-[11px] font-bold text-ink-2 uppercase tracking-wider mb-3">DNS 基础设施</p>
                <div className="grid grid-cols-2 gap-3">
                  <InfoItem label="DNS 提供商" value={result.dns.provider} />
                  <InfoItem label="Cloudflare 代理" value={result.is_behind_cloudflare ? '是（需特殊配置）' : '否'} />
                  <InfoItem
                    label="A 记录"
                    value={result.dns.a_records.length > 0 ? result.dns.a_records.slice(0, 2).join(', ') : '未解析'}
                  />
                  <InfoItem
                    label="CNAME 记录"
                    value={result.dns.cname_records.length > 0 ? result.dns.cname_records[0] : '无'}
                  />
                  <InfoItem
                    label="NS 记录"
                    value={result.dns.ns_records.length > 0 ? result.dns.ns_records[0] : '未知'}
                    fullWidth
                  />
                </div>
              </div>
            </div>

            {/* Re-check button */}
            <div className="flex justify-center pt-2">
              <button
                onClick={() => handleCheck()}
                className="text-sm text-ink-3 hover:text-ink transition-colors flex items-center gap-1.5"
              >
                <span>🔄</span> 重新检测
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}

// ── Small helper component ─────────────────────────────────────────────────────
function InfoItem({
  label,
  value,
  fullWidth,
}: {
  label: string
  value: string
  fullWidth?: boolean
}) {
  return (
    <div className={`${fullWidth ? 'col-span-2' : ''}`}>
      <p className="text-[10px] text-ink-3 font-medium uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-[12px] text-ink font-mono truncate">{value}</p>
    </div>
  )
}
