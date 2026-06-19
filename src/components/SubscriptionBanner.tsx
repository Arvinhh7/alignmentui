'use client'

/**
 * SubscriptionBanner
 *
 * Renders ONLY for urgent states (≤7-day trial countdown, payment failed,
 * paused, or scheduled cancellation). Normal active subscriptions are silent.
 *
 * The Cancel retention modal lives here and can be triggered from anywhere in
 * the app by dispatching: window.dispatchEvent(new CustomEvent('openCancelModal'))
 */

import { useState, useEffect, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { api, SubscriptionStatus, UsageData, CreditBalance } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'

const PLAN_DISPLAY: Record<string, string> = {
  starter: 'Starter',
  standard: 'Standard',
  pro: 'Pro',
  growth: 'Standard',
  enterprise: 'Enterprise',
}

const PLAN_COLORS: Record<string, string> = {
  starter: 'bg-surface-muted text-ink-2',
  standard: 'bg-surface-muted text-ink-2',
  pro: 'bg-surface-muted text-ink-2',
  growth: 'bg-surface-muted text-ink-2',
  enterprise: 'bg-surface-muted text-ink-2',
}

type CancelReason =
  | 'too_expensive'
  | 'not_using'
  | 'missing_features'
  | 'switching'
  | 'other'

const CANCEL_REASONS: { value: CancelReason; label: string; label_zh: string }[] = [
  { value: 'too_expensive', label: 'Too expensive', label_zh: '价格太贵' },
  { value: 'not_using', label: "Not using it enough", label_zh: '使用频率不够' },
  { value: 'missing_features', label: 'Missing a feature I need', label_zh: '缺少我需要的功能' },
  { value: 'switching', label: 'Switching to another tool', label_zh: '改用其他工具' },
  { value: 'other', label: 'Other reason', label_zh: '其他原因' },
]

interface CounterOfferProps {
  reason: CancelReason
  plan: string
  lang: string
  onPause: () => void
  onDowngrade: () => void
  onContinueCancel: () => void // leads to data_summary, NOT confirm
}

function CounterOffer({ reason, plan, lang, onPause, onDowngrade, onContinueCancel }: CounterOfferProps) {
  const isZh = lang === 'zh'

  if (reason === 'too_expensive') {
    return (
      <div className="space-y-3">
        {plan !== 'starter' && (
          <div className="p-4 bg-surface-warm border border-divider rounded-xl">
            <p className="font-semibold text-ink text-sm mb-1">
              {isZh ? '💡 降级到 Starter ($99/月)' : '💡 Switch to Starter ($99/mo)'}
            </p>
            <p className="text-ink-2 text-xs mb-3">
              {isZh
                ? '保留核心 AI 可见度追踪功能，费用直接降低 50%，随时可以升回来。'
                : 'Keep core AI visibility tracking at 50% less cost — upgrade anytime.'}
            </p>
            <button
              onClick={onDowngrade}
              className="px-4 py-2 bg-ink hover:bg-[#2d2d2c] text-ink-inv text-sm font-medium rounded-lg transition-colors"
            >
              {isZh ? '切换到 Starter' : 'Switch to Starter'}
            </button>
          </div>
        )}
        <div className="p-4 bg-sage-bg border border-sage/20 rounded-xl">
          <p className="font-semibold text-ink text-sm mb-1">
            {isZh ? '⏸ 免费暂停 1 个月' : '⏸ Pause for 1 month — free'}
          </p>
          <p className="text-ink-2 text-xs mb-3">
            {isZh
              ? '账号和数据完全保留，1 个月后自动恢复。暂停期间不收取任何费用。'
              : 'Your account and all data stay intact. Auto-resumes in 1 month. Zero charge.'}
          </p>
          <button
            onClick={onPause}
            className="px-4 py-2 bg-sage text-ink-inv text-sm font-medium rounded-lg hover:bg-[#3D6B4E] transition-colors"
          >
            {isZh ? '暂停订阅' : 'Pause my subscription'}
          </button>
        </div>
        <button onClick={onContinueCancel} className="text-xs text-ink-3 hover:text-ink-3 underline underline-offset-2 mt-1">
          {isZh ? '以上都不适合我，继续取消' : 'None of these work for me'}
        </button>
      </div>
    )
  }

  if (reason === 'not_using') {
    return (
      <div className="space-y-3">
        <div className="p-4 bg-sage-bg border border-sage/20 rounded-xl">
          <p className="font-semibold text-ink text-sm mb-1">
            {isZh ? '⏸ 先暂停，而不是取消' : '⏸ Pause instead of canceling'}
          </p>
          <p className="text-ink-2 text-xs mb-3">
            {isZh
              ? '现在忙没关系，先免费暂停 1 个月 — 数据全部保留，随时回来继续。'
              : "Too busy right now? Pause free for 1 month — all your data stays, come back anytime."}
          </p>
          <button
            onClick={onPause}
            className="px-4 py-2 bg-sage text-ink-inv text-sm font-medium rounded-lg hover:bg-[#3D6B4E] transition-colors"
          >
            {isZh ? '暂停 1 个月' : 'Pause for 1 month'}
          </button>
        </div>
        <div className="p-4 bg-surface-warm border border-divider rounded-xl">
          <p className="font-semibold text-ink text-sm mb-1">
            {isZh ? '📚 预约 15 分钟使用指导' : '📚 Get a 15-min onboarding call'}
          </p>
          <p className="text-ink-2 text-xs mb-3">
            {isZh
              ? '我们的团队可以帮您快速上手，让每一次使用都更有价值。'
              : "Our team will walk you through best practices to get more value from every session."}
          </p>
          <a
            href="mailto:contact@alignmenttech.ai?subject=Onboarding%20Call%20Request"
            className="inline-block px-4 py-2 bg-ink hover:bg-[#2d2d2c] text-ink-inv text-sm font-medium rounded-lg transition-colors"
          >
            {isZh ? '预约指导' : 'Book a call'}
          </a>
        </div>
        <button onClick={onContinueCancel} className="text-xs text-ink-3 hover:text-ink-3 underline underline-offset-2 mt-1">
          {isZh ? '以上都不适合我，继续取消' : 'None of these work for me'}
        </button>
      </div>
    )
  }

  if (reason === 'missing_features') {
    return (
      <div className="space-y-3">
        <div className="p-4 bg-caution-bg border border-caution/20 rounded-xl">
          <p className="font-semibold text-ink text-sm mb-1">
            {isZh ? '🔧 告诉我们缺少什么' : '🔧 Tell us what you need'}
          </p>
          <p className="text-caution text-xs mb-3">
            {isZh
              ? '我们 24 小时内回复。您需要的功能可能已在开发路线图中，或者我们可以为您优先排期。'
              : "We reply within 24 hours. The feature you need may already be on our roadmap — or we can prioritize it for you."}
          </p>
          <a
            href="mailto:contact@alignmenttech.ai?subject=Feature%20Request%20%E2%80%94%20Cancel%20Intent"
            className="inline-block px-4 py-2 bg-ink text-ink-inv text-sm font-medium rounded-lg hover:bg-[#2d2d2c] transition-colors"
          >
            {isZh ? '发送功能需求' : 'Send feature request'}
          </a>
        </div>
        <div className="p-4 bg-sage-bg border border-sage/20 rounded-xl">
          <p className="font-semibold text-ink text-sm mb-1">
            {isZh ? '⏸ 暂停等待功能上线' : '⏸ Pause while we build it'}
          </p>
          <p className="text-ink-2 text-xs mb-3">
            {isZh
              ? '免费暂停 1 个月，功能上线后再恢复，数据全部保留。'
              : "Pause free for 1 month, resume when the feature ships — your data stays safe."}
          </p>
          <button
            onClick={onPause}
            className="px-4 py-2 bg-sage text-ink-inv text-sm font-medium rounded-lg hover:bg-[#3D6B4E] transition-colors"
          >
            {isZh ? '暂停订阅' : 'Pause my subscription'}
          </button>
        </div>
        <button onClick={onContinueCancel} className="text-xs text-ink-3 hover:text-ink-3 underline underline-offset-2 mt-1">
          {isZh ? '以上都不适合我，继续取消' : 'None of these work for me'}
        </button>
      </div>
    )
  }

  if (reason === 'switching') {
    return (
      <div className="space-y-3">
        <div className="p-4 bg-surface-warm border border-divider rounded-xl">
          <p className="font-semibold text-ink text-sm mb-1">
            {isZh ? '🔍 Alignment AI 做到了竞品做不到的事' : '🔍 What no other tool can do'}
          </p>
          <ul className="text-ink-2 text-xs space-y-1 mb-3">
            <li>• {isZh ? '基于您自定义 Prompt 的真实 AI 可见度追踪' : 'Real AI visibility tracking driven by your own prompts'}</li>
            <li>
              •{' '}
              {isZh
                ? '套餐化监控：Starter 跑 ChatGPT；Standard/Pro 跑 ChatGPT、Perplexity、Gemini，并包含 AI Overview 数据覆盖'
                : 'Plan-aware monitoring: Starter runs ChatGPT; Standard/Pro run ChatGPT, Perplexity, and Gemini, with AI Overview data coverage'}
            </li>
            <li>• {isZh ? '从诊断到内容到分发的完整 GEO 闭环' : 'Full GEO loop: audit → content → distribution → monitor'}</li>
          </ul>
          <a
            href="mailto:contact@alignmenttech.ai?subject=Competitive%20Question"
            className="inline-block px-4 py-2 bg-ink text-ink-inv text-sm font-medium rounded-lg hover:bg-[#2d2d2c] transition-colors"
          >
            {isZh ? '和我们聊聊您的需求' : 'Talk to us about your needs'}
          </a>
        </div>
        <button onClick={onContinueCancel} className="text-xs text-ink-3 hover:text-ink-3 underline underline-offset-2 mt-1">
          {isZh ? '我已决定，继续取消' : "I've decided, continue canceling"}
        </button>
      </div>
    )
  }

  // other
  return (
    <div className="space-y-3">
      <div className="p-4 bg-surface-warm border border-divider-light rounded-xl">
        <p className="font-semibold text-ink text-sm mb-1">
          {isZh ? '💬 能告诉我们原因吗？' : '💬 Can you tell us more?'}
        </p>
        <p className="text-ink-2 text-xs mb-3">
          {isZh
            ? '您的反馈直接影响产品方向。我们会在 24 小时内回复，也许我们能解决您的问题。'
            : "Your feedback directly shapes our product. We'll reply in 24 hours — maybe we can solve the issue."}
        </p>
        <a
          href="mailto:contact@alignmenttech.ai?subject=Cancel%20Feedback"
          className="inline-block px-4 py-2 bg-ink text-ink-inv text-sm font-medium rounded-lg hover:bg-[#2d2d2c] transition-colors"
        >
          {isZh ? '发送反馈' : 'Send feedback'}
        </a>
      </div>
      <div className="p-4 bg-sage-bg border border-sage/20 rounded-xl">
        <p className="font-semibold text-ink text-sm mb-1">
          {isZh ? '⏸ 或者先暂停 1 个月' : '⏸ Or pause for a month'}
        </p>
        <p className="text-ink-2 text-xs mb-3">
          {isZh ? '不着急做决定 — 免费暂停，数据保留，随时恢复。' : "No rush — pause free, keep your data, resume whenever."}
        </p>
        <button onClick={onPause} className="px-4 py-2 bg-sage text-ink-inv text-sm font-medium rounded-lg hover:bg-[#3D6B4E] transition-colors">
          {isZh ? '暂停订阅' : 'Pause my subscription'}
        </button>
      </div>
      <button onClick={onContinueCancel} className="text-xs text-ink-3 hover:text-ink-3 underline underline-offset-2 mt-1">
        {isZh ? '以上都不适合我，继续取消' : 'None of these work for me'}
      </button>
    </div>
  )
}

interface Props {
  lang?: string
}

function SubscriptionBannerInner({ lang = 'en' }: Props) {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const [sub, setSub] = useState<SubscriptionStatus | null>(null)
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [credits, setCredits] = useState<CreditBalance | null>(null)
  const [loading, setLoading] = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)
  const [showSuccessToast, setShowSuccessToast] = useState(false)

  useEffect(() => {
    if (searchParams.get('subscription') === 'success') {
      setShowSuccessToast(true)
      const t = setTimeout(() => setShowSuccessToast(false), 6000)
      return () => clearTimeout(t)
    }
  }, [searchParams])

  // Cancel modal state
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelStep, setCancelStep] = useState<'reason' | 'counteroffer' | 'data_summary' | 'confirm'>('reason')
  const [cancelReason, setCancelReason] = useState<CancelReason | null>(null)

  const isZh = lang === 'zh'

  const refreshCredits = useCallback(async () => {
    if (!user?.id) return
    try {
      const creditRes = await api.getCredits(user.id)
      setCredits(creditRes.data ?? null)
    } catch {}
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) return
    let mounted = true

    const load = async () => {
      const [subRes, usageRes, creditRes] = await Promise.all([
        api.getSubscription(user.id),
        api.getUsage(user.id),
        api.getCredits(user.id),
      ])
      if (!mounted) return
      setSub(subRes.data?.subscription ?? null)
      setUsage(usageRes.data?.usage ?? null)
      setCredits(creditRes.data ?? null)
      setLoading(false)
    }

    load()
    return () => { mounted = false }
  }, [user?.id])

  // Listen for credit-consumption events dispatched by any dashboard operation
  useEffect(() => {
    const handler = () => refreshCredits()
    window.addEventListener('creditsUsed', handler)
    return () => window.removeEventListener('creditsUsed', handler)
  }, [refreshCredits])

  const handleManagePortal = useCallback(async () => {
    if (!user?.id) return
    setPortalLoading(true)
    const result = await api.createPortalSession(user.id)
    if (result.data?.portal_url) {
      window.location.href = result.data.portal_url
    }
    setPortalLoading(false)
  }, [user?.id])

  const handlePause = useCallback(() => {
    // Redirect to Stripe portal for pause — portal handles this natively
    handleManagePortal()
  }, [handleManagePortal])

  const handleDowngrade = useCallback(() => {
    handleManagePortal()
  }, [handleManagePortal])

  const [cancelLoading, setCancelLoading] = useState(false)
  const [cancelDone, setCancelDone] = useState(false)
  const [cancelEndDate, setCancelEndDate] = useState<string | null>(null)
  const [cancelError, setCancelError] = useState<string | null>(null)

  const handleFinalCancel = useCallback(async () => {
    if (!user?.id) {
      setCancelError(isZh ? '登录状态已过期，请刷新页面后重试。' : 'Session expired — please refresh the page and try again.')
      return
    }
    setCancelLoading(true)
    setCancelError(null)
    try {
      const result = await api.cancelSubscription(user.id)
      if (result.data?.success) {
        setCancelDone(true)
        if (result.data.current_period_end) {
          const d = new Date(result.data.current_period_end)
          setCancelEndDate(d.toLocaleDateString(isZh ? 'zh-CN' : 'en-US', {
            month: 'long', day: 'numeric', year: 'numeric'
          }))
        }
        // Refresh subscription info so banner reflects cancellation state
        setSub(prev => prev ? { ...prev, cancel_at_period_end: true } : prev)
      } else {
        setCancelError(
          result.error ||
          (isZh
            ? '取消失败，请稍后重试或联系 contact@alignmenttech.ai'
            : 'Cancellation failed. Please try again or email contact@alignmenttech.ai.')
        )
      }
    } catch {
      setCancelError(isZh ? '网络错误，请稍后重试。' : 'Network error. Please try again.')
    } finally {
      setCancelLoading(false)
    }
  }, [user?.id, isZh])

  // Listen for cancel modal trigger from anywhere in the app (e.g. Settings page)
  useEffect(() => {
    const handler = () => { setShowCancelModal(true); setCancelStep('reason'); setCancelDone(false); setCancelError(null) }
    window.addEventListener('openCancelModal', handler)
    return () => window.removeEventListener('openCancelModal', handler)
  }, [])

  if (loading && !showSuccessToast) return null
  if (!sub && !showSuccessToast) return null

  const daysLeft = sub?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(sub.trial_ends_at).getTime() - Date.now()) / 86400000))
    : null

  const periodEnd = sub?.current_period_end
    ? new Date(sub.current_period_end).toLocaleDateString(isZh ? 'zh-CN' : 'en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
      })
    : null

  // Only show the banner for urgent situations — normal active subscriptions are silent.
  // Credits info lives in the Sidebar popup; cancellation lives in Settings.
  const isUrgentTrial = sub?.status === 'trialing' && daysLeft !== null && daysLeft <= 7
  const isPaymentFailed = sub?.status === 'past_due'
  const isPaused = sub?.status === 'paused'
  const isCancelScheduled = !!sub?.cancel_at_period_end
  const shouldShowBanner = isUrgentTrial || isPaymentFailed || isPaused || isCancelScheduled

  // Banner color
  const bannerClass =
    isPaymentFailed ? 'bg-red-soft-bg border-red-soft/20'
    : isUrgentTrial && daysLeft !== null && daysLeft <= 2 ? 'bg-red-soft-bg border-red-soft/20'
    : isUrgentTrial && daysLeft !== null && daysLeft <= 5 ? 'bg-caution-bg border-caution/20'
    : isPaused ? 'bg-surface-warm border-divider-light'
    : isCancelScheduled ? 'bg-caution-bg border-caution/20'
    : 'bg-surface-warm border-divider'

  return (
    <>
      {/* ── Success Toast ───────────────────────────────────────────────────── */}
      {showSuccessToast && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3 bg-sage text-ink-inv px-5 py-3 rounded-xl shadow-xl">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-semibold text-sm">
                {isZh ? '🎉 订阅成功！' : '🎉 Subscription activated!'}
              </p>
              <p className="text-xs text-ink-inv/70">
                {isZh ? '7 天免费试用已开始，尽情探索所有功能。' : 'Your 7-day trial has started. Explore all features.'}
              </p>
            </div>
            <button onClick={() => setShowSuccessToast(false)} className="text-ink-inv/50 hover:text-ink-inv transition-colors ml-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Urgent-only Alert Banner ────────────────────────────────────────── */}
      {shouldShowBanner && sub && (
        <div className={`border-b px-6 py-2.5 ${bannerClass}`}>
          <div className="max-w-7xl mx-auto flex items-center gap-4 justify-between">

            {/* Alert message */}
            <div className="flex items-center gap-2.5">
              <span className="text-base leading-none">
                {isPaymentFailed ? '⚠️' : isPaused ? '⏸' : isCancelScheduled ? '📅' : '⏰'}
              </span>
              <span className={`text-xs font-medium ${
                isPaymentFailed ? 'text-red-soft'
                : isCancelScheduled ? 'text-caution'
                : isPaused ? 'text-ink-2'
                : daysLeft !== null && daysLeft <= 2 ? 'text-red-soft'
                : daysLeft !== null && daysLeft <= 5 ? 'text-caution'
                : 'text-ink-2'
              }`}>
                {isPaymentFailed
                  ? (isZh ? '付款失败 — 请更新支付方式以保留访问权限' : 'Payment failed — update billing to keep access')
                  : isPaused && sub.pause_resumes_at
                  ? (isZh ? `订阅已暂停 — ${new Date(sub.pause_resumes_at).toLocaleDateString(isZh ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' })} 恢复` : `Subscription paused — resumes ${new Date(sub.pause_resumes_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`)
                  : isCancelScheduled
                  ? periodEnd
                    ? (isZh ? `订阅将于 ${periodEnd} 取消` : `Subscription cancels ${periodEnd}`)
                    : (isZh ? '订阅已安排取消' : 'Subscription cancellation scheduled')
                  : daysLeft !== null
                  ? (isZh ? `免费试用还剩 ${daysLeft} 天 — 订阅后继续使用全部功能` : `Free trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} — subscribe to keep full access`)
                  : ''}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {(isUrgentTrial || isCancelScheduled) && sub.plan !== 'enterprise' && (
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center rounded-xl bg-[#F9D66B] px-7 py-3 text-[15px] font-black text-ink shadow-[0_0_0_1px_rgba(249,214,107,0.45),0_10px_24px_rgba(249,214,107,0.24)] transition-all hover:-translate-y-0.5 hover:bg-[#FFE38A] active:translate-y-0"
                >
                  {isZh ? '立即升级 →' : 'Upgrade now →'}
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Cancel Retention Modal ──────────────────────────────────────────────
           Funnel order: reason → counteroffer → data_summary → confirm
           No shortcuts — user must see every retention step before confirming.
      ── */}
      {showCancelModal && sub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="relative bg-surface rounded-2xl shadow-2xl max-w-md w-full p-8 max-h-[90vh] overflow-y-auto">

            {/* ── X close button — prominent, easy to find ── */}
            <button
              onClick={() => setShowCancelModal(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-surface-muted hover:bg-surface-muted text-ink-3 hover:text-ink transition-all"
              aria-label="Close"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Step indicator */}
            <div className="flex items-center gap-1.5 mb-6">
              {(['reason', 'counteroffer', 'data_summary', 'confirm'] as const).map((s, i) => (
                <div key={s} className={`h-1 rounded-full flex-1 transition-colors ${
                  cancelStep === s ? 'bg-ink'
                  : ['reason', 'counteroffer', 'data_summary', 'confirm'].indexOf(cancelStep) > i ? 'bg-ink-3'
                  : 'bg-surface-muted'
                }`} />
              ))}
            </div>

            {/* ── Step 1: Reason ── */}
            {cancelStep === 'reason' && (
              <>
                <h2 className="text-lg font-bold text-ink mb-1 pr-8">
                  {isZh ? '取消前，请告诉我们原因' : 'Before you go — what happened?'}
                </h2>
                <p className="text-sm text-ink-3 mb-5">
                  {isZh
                    ? '您的反馈帮助我们改进产品。根据原因，我们可能有更好的方案。'
                    : 'Your feedback helps us improve. We may have a better solution depending on your reason.'}
                </p>
                <div className="space-y-2">
                  {CANCEL_REASONS.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => {
                        setCancelReason(r.value)
                        setCancelStep('counteroffer') // → always go to counteroffer first
                      }}
                      className="w-full text-left px-4 py-3 border border-divider-light rounded-xl hover:border-ink hover:bg-surface-warm text-sm text-ink-2 transition-all group"
                    >
                      <span className="flex items-center justify-between">
                        {isZh ? r.label_zh : r.label}
                        <svg className="w-3.5 h-3.5 text-ink-3 group-hover:text-ink-2 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* ── Step 2: Counter-offer (personalised by reason) ── */}
            {cancelStep === 'counteroffer' && cancelReason && (
              <>
                <h2 className="text-lg font-bold text-ink mb-1 pr-8">
                  {isZh ? '我们可以这样帮您' : 'Before you cancel — we have a better option'}
                </h2>
                <p className="text-sm text-ink-3 mb-5">
                  {isZh
                    ? '很多用户遇到同样情况后选择了以下方案，希望对您也有帮助。'
                    : 'Many users in your situation chose one of these options instead.'}
                </p>
                <CounterOffer
                  reason={cancelReason}
                  plan={sub.plan}
                  lang={lang}
                  onPause={handlePause}
                  onDowngrade={handleDowngrade}
                  onContinueCancel={() => setCancelStep('data_summary')} // → data_summary, not confirm
                />
              </>
            )}

            {/* ── Step 3: Data summary / "what you'll lose" ── */}
            {cancelStep === 'data_summary' && (
              <>
                <h2 className="text-lg font-bold text-ink mb-1 pr-8">
                  {isZh ? '取消后，这些将会消失' : "Here's what you'll lose"}
                </h2>
                <p className="text-sm text-ink-3 mb-4">
                  {isZh
                    ? '取消后 30 天数据归档删除，无法恢复。'
                    : 'After cancellation, your data is archived and permanently deleted in 30 days.'}
                </p>

                {/* Show actual usage if non-zero, otherwise show feature value list */}
                {usage && ((usage.answers_analyzed ?? 0) > 0 || (usage.prompts_used ?? 0) > 0 || (usage.brands_count ?? 0) > 0) ? (
                  <div className="bg-surface-warm rounded-xl p-4 mb-5 space-y-2.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-ink-3">{isZh ? '已分析的 AI 回答' : 'AI responses analyzed'}</span>
                      <span className="font-semibold text-ink">{(usage.answers_analyzed ?? 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-ink-3">{isZh ? '已配置的 Prompt' : 'Prompts configured'}</span>
                      <span className="font-semibold text-ink">{usage.prompts_used ?? 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-ink-3">{isZh ? '追踪的品牌' : 'Brands tracked'}</span>
                      <span className="font-semibold text-ink">{usage.brands_count ?? 0}</span>
                    </div>
                    <p className="text-xs text-red-soft mt-2 pt-2 border-t border-divider-light font-medium">
                      {isZh ? '⚠️ 这些数据将在 30 天后永久删除。' : '⚠️ All of this data will be permanently deleted in 30 days.'}
                    </p>
                  </div>
                ) : (
                  <div className="bg-surface-warm rounded-xl p-4 mb-5 space-y-2">
                    <p className="text-xs font-semibold text-ink-3 uppercase tracking-wide mb-3">
                      {isZh ? '您将失去访问权限' : "You'll lose access to"}
                    </p>
                    {[
                      isZh ? '🔍 AI 品牌可见度实时监控（ChatGPT / Perplexity / Grok / Google）' : '🔍 Real-time AI visibility across ChatGPT, Perplexity, Grok & Google',
                      isZh ? '📊 竞品 Share of Voice 追踪与分析' : '📊 Competitor share-of-voice tracking',
                      isZh ? '✍️ AI 优化内容生成（7 种文章类型）' : '✍️ AI-optimized content generation (7 article types)',
                      isZh ? '📡 GEO 内容分发策略（Reddit + 渠道矩阵）' : '📡 GEO distribution strategy (Reddit + channel matrix)',
                      isZh ? '🔧 网站 AI 可读性诊断与优化建议' : '🔧 Website AI-readiness audit & optimization',
                    ].map((item, i) => (
                      <p key={i} className="text-xs text-ink-2 leading-relaxed">{item}</p>
                    ))}
                    <p className="text-xs text-red-soft mt-2 pt-2 border-t border-divider-light font-medium">
                      {isZh ? '⚠️ 取消后，您的配置数据将在 30 天后永久删除。' : '⚠️ Your configuration data will be permanently deleted in 30 days.'}
                    </p>
                  </div>
                )}

                {/* Primary action: keep subscription */}
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="w-full py-3 bg-ink text-ink-inv rounded-xl font-semibold hover:bg-[#2d2d2c] transition-colors"
                >
                  {isZh ? '保留我的订阅' : 'Keep my subscription'}
                </button>
                <button
                  onClick={() => setCancelStep('confirm')}
                  className="w-full mt-2 py-2 text-xs text-ink-3 hover:text-ink-2 underline underline-offset-2 transition-colors"
                >
                  {isZh ? '我了解风险，继续取消' : 'I understand, continue canceling'}
                </button>
              </>
            )}

            {/* ── Step 4: Final confirm — Keep is primary, Cancel is small gray ── */}
            {cancelStep === 'confirm' && (
              <>
                <h2 className="text-lg font-bold text-ink mb-2 pr-8">
                  {cancelDone
                  ? (isZh ? '订阅已安排取消' : 'Cancellation confirmed')
                  : (isZh ? '最后确认' : 'Last step')}
                </h2>

                {cancelDone ? (
                  /* ── Success state ── */
                  <>
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-sage-bg mx-auto mb-4">
                      <svg className="w-6 h-6 text-sage" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-sm text-ink-2 mb-2 leading-relaxed text-center">
                      {isZh
                        ? `您的订阅将在 ${cancelEndDate ?? '账期结束时'} 到期，到期前可正常使用所有功能。`
                        : `Your subscription will end on ${cancelEndDate ?? 'your billing period end date'}. You keep full access until then.`}
                    </p>
                    <p className="text-xs text-ink-3 mb-6 text-center leading-relaxed">
                      {isZh
                        ? '如需退款或重新激活，请发邮件至 contact@alignmenttech.ai。'
                        : 'To request a refund or reactivate, email contact@alignmenttech.ai.'}
                    </p>
                    <button
                      onClick={() => { setShowCancelModal(false); setCancelDone(false) }}
                      className="w-full py-3 bg-ink text-ink-inv rounded-xl font-semibold hover:bg-[#2d2d2c] transition-colors"
                    >
                      {isZh ? '关闭' : 'Close'}
                    </button>
                  </>
                ) : (
                  /* ── Confirm state ── */
                  <>
                    <p className="text-sm text-ink-2 mb-3 leading-relaxed">
                      {isZh
                        ? `您的 ${PLAN_DISPLAY[sub.plan] ?? sub.plan} 计划将在 ${periodEnd ?? '当前账期结束时'} 前保持有效，到期前您仍可正常使用所有功能。`
                        : `Your ${PLAN_DISPLAY[sub.plan] ?? sub.plan} plan stays active until ${periodEnd ?? 'the end of your billing period'} — you keep full access until then.`}
                    </p>
                    <p className="text-xs text-ink-3 mb-6 leading-relaxed">
                      {isZh
                        ? '需要退款？发邮件到 contact@alignmenttech.ai，我们在 24 小时内处理。'
                        : 'Need a refund? Email contact@alignmenttech.ai — we respond within 24 hours.'}
                    </p>

                    {/* Primary: Keep (big, black) */}
                    <button
                      onClick={() => setShowCancelModal(false)}
                      className="w-full py-3 bg-ink text-ink-inv rounded-xl font-semibold hover:bg-[#2d2d2c] transition-colors mb-3"
                    >
                      {isZh ? '保留我的订阅' : 'Keep my subscription'}
                    </button>

                    {/* Secondary: Cancel (small, muted — intentionally de-emphasized) */}
                    <div className="text-center">
                      <button
                        onClick={handleFinalCancel}
                        disabled={cancelLoading}
                        className="text-xs text-ink-3 hover:text-ink-2 underline underline-offset-2 transition-colors disabled:opacity-50"
                      >
                        {cancelLoading
                          ? (isZh ? '处理中…' : 'Processing…')
                          : (isZh ? '确认取消订阅' : 'Confirm cancellation')}
                      </button>
                      {cancelError && (
                        <p className="text-xs text-red-soft mt-2 leading-relaxed">{cancelError}</p>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default function SubscriptionBanner({ lang = 'en' }: Props) {
  return (
    <Suspense fallback={null}>
      <SubscriptionBannerInner lang={lang} />
    </Suspense>
  )
}
