'use client'

import Link from 'next/link'
import { useState, useCallback, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useLanguage } from '@/lib/LanguageContext'
import Footer from '@/components/Footer'
import PublicNavbar from '@/components/PublicNavbar'
import { useAuth } from '@/hooks/useAuth'
import { api, SubscriptionStatus } from '@/lib/api'
import { gaEvent } from '@/lib/gtag'

const PLAN_KEY_MAP: Record<string, string> = {
  Starter: 'starter',
  Standard: 'standard',
  Pro: 'pro',
  Enterprise: 'enterprise',
  '入门版': 'starter',
  '标准版': 'standard',
  '专业版': 'pro',
  '企业版': 'enterprise',
}

const PLAN_PRICE: Record<string, { monthly: number; yearly: number }> = {
  starter: { monthly: 99, yearly: 82.5 },
  standard: { monthly: 199, yearly: 165.83 },
  pro: { monthly: 399, yearly: 332.5 },
}

export default function PricingPage() {
  return (
    <Suspense fallback={null}>
      <PricingPageInner />
    </Suspense>
  )
}

const PLAN_ORDER = ['starter', 'standard', 'pro']

function PricingPageInner() {
  const { lang } = useLanguage()
  const { user, isAuthenticated } = useAuth()
  const searchParams = useSearchParams()
  const [isYearly, setIsYearly] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [sub, setSub] = useState<SubscriptionStatus | null>(null)
  const [portalLoading, setPortalLoading] = useState<string | null>(null)
  const [reactivateLoading, setReactivateLoading] = useState(false)
  const [upgradeConfirm, setUpgradeConfirm] = useState<{ planKey: string; planName: string } | null>(null)
  const [upgradeLoading, setUpgradeLoading] = useState(false)

  useEffect(() => {
    if (!user?.id) { setSub(null); return }
    api.getSubscription(user.id).then(r => setSub(r.data?.subscription ?? null))
  }, [user?.id])

  useEffect(() => {
    if (searchParams.get('checkout_error')) {
      setCheckoutError('Unable to start checkout. Please try again or contact support.')
    }
  }, [searchParams])

  // Determine what action a plan button should take for the current user
  const getPlanState = useCallback((planKey: string): 'subscribe' | 'current' | 'upgrade' | 'downgrade' => {
    if (planKey === 'enterprise') return 'subscribe'
    if (!sub || sub.status === 'canceled' || sub.status === 'past_due') return 'subscribe'
    // Normalize 'growth' (legacy) to 'standard' for comparison
    const currentPlan = sub.plan === 'growth' ? 'standard' : sub.plan
    if (currentPlan === planKey) return 'current'
    const currentIdx = PLAN_ORDER.indexOf(currentPlan)
    const targetIdx = PLAN_ORDER.indexOf(planKey)
    if (currentIdx === -1 || targetIdx === -1) return 'subscribe'
    return targetIdx > currentIdx ? 'upgrade' : 'downgrade'
  }, [sub])

  const handlePortalRedirect = useCallback(async (planKey?: string) => {
    if (!user?.id) return
    const loadingKey = planKey ?? 'manage'
    setPortalLoading(loadingKey)
    try {
      const interval = isYearly ? 'year' : 'month'
      const result = await api.createPortalSession(user.id, user.email ?? null, planKey, interval)
      if (result.data?.portal_url) window.location.href = result.data.portal_url
      else setCheckoutError(result.error ?? 'Unable to open billing portal. Please try again.')
    } finally {
      setPortalLoading(null)
    }
  }, [user?.id, user?.email, isYearly])

  const handleConfirmUpgrade = useCallback(async () => {
    if (!user?.id || !upgradeConfirm) return
    setUpgradeLoading(true)
    setCheckoutError(null)
    try {
      const interval = isYearly ? 'year' : 'month'
      const result = await api.upgradeSubscription(user.id, upgradeConfirm.planKey, interval)
      if (result.data?.success) {
        setUpgradeConfirm(null)
        const updated = await api.getSubscription(user.id)
        setSub(updated.data?.subscription ?? null)
      } else {
        setCheckoutError(result.error ?? (lang === 'zh' ? '升级失败，请稍后重试' : 'Upgrade failed. Please try again.'))
        setUpgradeConfirm(null)
      }
    } catch {
      setCheckoutError(lang === 'zh' ? '网络错误，请稍后重试' : 'Network error. Please try again.')
      setUpgradeConfirm(null)
    } finally {
      setUpgradeLoading(false)
    }
  }, [user?.id, upgradeConfirm, isYearly, lang])

  const handleReactivate = useCallback(async () => {
    if (!user?.id) return
    setReactivateLoading(true)
    setCheckoutError(null)
    try {
      const result = await api.reactivateSubscription(user.id)
      if (result.data?.success) {
        // Refresh subscription state so button updates immediately
        const updated = await api.getSubscription(user.id)
        setSub(updated.data?.subscription ?? null)
      } else {
        setCheckoutError(result.error ?? (lang === 'zh' ? '恢复订阅失败，请稍后再试' : 'Failed to reactivate subscription. Please try again.'))
      }
    } catch {
      setCheckoutError(lang === 'zh' ? '网络错误，请稍后再试' : 'Network error. Please try again.')
    } finally {
      setReactivateLoading(false)
    }
  }, [user?.id, lang])

  const handleStartTrial = useCallback(async (planName: string) => {
    const planKey = PLAN_KEY_MAP[planName]
    if (!planKey) return

    const planPrice = PLAN_PRICE[planKey]
    if (planPrice) {
      gaEvent('begin_checkout', {
        currency: 'USD',
        value: isYearly ? planPrice.yearly : planPrice.monthly,
        items: [{ item_name: `Alignment ${planKey}`, price: isYearly ? planPrice.yearly : planPrice.monthly }],
        billing_interval: isYearly ? 'year' : 'month',
      })
    }

    if (planKey === 'enterprise') {
      window.location.href = '/contact/?subject=enterprise-platform'
      return
    }

    if (!isAuthenticated || !user) {
      window.location.href = `/login?redirect=/pricing&plan=${planKey}&interval=${isYearly ? 'year' : 'month'}`
      return
    }

    setCheckoutLoading(planKey)
    setCheckoutError(null)

    try {
      const result = await api.createCheckoutSession({
        user_id: user.id,
        user_email: user.email ?? '',
        plan: planKey,
        billing_interval: isYearly ? 'year' : 'month',
      })

      if (result.data?.checkout_url) {
        localStorage.setItem('alignment_checkout_plan', JSON.stringify({
          plan: planKey,
          value: isYearly ? planPrice?.yearly ?? 0 : planPrice?.monthly ?? 0,
          billing_interval: isYearly ? 'year' : 'month',
        }))
        window.location.href = result.data.checkout_url
      } else {
        setCheckoutError(result.error ?? 'Failed to start checkout. Please try again.')
      }
    } catch {
      setCheckoutError('Something went wrong. Please try again.')
    } finally {
      setCheckoutLoading(null)
    }
  }, [isAuthenticated, user, isYearly])

  const plans = [
    {
      name: lang === 'zh' ? '入门版' : 'Starter',
      description: lang === 'zh' ? '适合刚开始做 AI 可见度的单品牌团队' : 'For single-brand teams starting AI visibility monitoring',
      originalPrice: 149,
      price: { monthly: 99, yearly: 82.5 },
      credits: lang === 'zh' ? '5,000 credits/月' : '5,000 credits / month',
      platforms: [
        { name: 'ChatGPT', logo: '/logos/openai.png' },
      ],
      features: lang === 'zh' ? [
        '7 天免费试用',
        '1 个品牌 / 项目',
        '50 条 prompts 每日追踪',
        'Explore / Shopping 数据库访问',
        '2 个团队席位',
        '基础报告导出',
        '邮件支持',
      ] : [
        '7-day free trial',
        '1 project / brand',
        '50 prompts tracked daily',
        'Explore / Shopping database access',
        '2 team seats',
        'Basic report export',
        'Email support',
      ],
      cta: lang === 'zh' ? '开始免费试用' : 'Start Free Trial',
      popular: false,
    },
    {
      name: lang === 'zh' ? '标准版' : 'Standard',
      description: lang === 'zh' ? '适合需要稳定多平台监控的增长团队' : 'For teams that need steady multi-platform visibility',
      originalPrice: 299,
      price: { monthly: 199, yearly: 165.83 },
      credits: lang === 'zh' ? '12,000 credits/月' : '12,000 credits / month',
      platforms: [
        { name: 'ChatGPT', logo: '/logos/openai.png' },
        { name: 'Perplexity', logo: '/logos/perplexity.png' },
        { name: 'AI Overview Data', logo: '/logos/google.png' },
        { name: 'Gemini', logo: '/logos/gemini.png' },
      ],
      features: lang === 'zh' ? [
        '7 天免费试用',
        '包含所有 Starter 功能',
        '100 条 prompts 每日追踪',
        'Shopping 标准刷新',
        'Visibility Proxy / GA4 Attribution',
        '竞品分析',
        '自定义报告',
        '5 个团队席位',
      ] : [
        '7-day free trial',
        'All Starter features',
        '100 prompts tracked daily',
        'Standard Shopping refresh',
        'Visibility Proxy / GA4 Attribution',
        'Competitor analysis',
        'Custom reports',
        '5 team seats',
      ],
      cta: lang === 'zh' ? '开始免费试用' : 'Start Free Trial',
      popular: false,
    },
    {
      name: lang === 'zh' ? '专业版' : 'Pro',
      description: lang === 'zh' ? '适合高频监控、多品牌和自动化工作流' : 'For high-volume teams scaling across brands and workflows',
      originalPrice: 599,
      price: { monthly: 399, yearly: 332.5 },
      credits: lang === 'zh' ? '30,000 credits/月' : '30,000 credits / month',
      platforms: [
        { name: 'ChatGPT', logo: '/logos/openai.png' },
        { name: 'Perplexity', logo: '/logos/perplexity.png' },
        { name: 'AI Overview Data', logo: '/logos/google.png' },
        { name: 'Gemini', logo: '/logos/gemini.png' },
      ],
      features: lang === 'zh' ? [
        '7 天免费试用',
        '包含所有 Standard 功能',
        '300 条 prompts 每日追踪',
        '多品牌 / 多项目',
        '高级 AI Research',
        'MCP Integration',
        'API access',
        '优先支持',
      ] : [
        '7-day free trial',
        'All Standard features',
        '300 prompts tracked daily',
        'Multi projects / brands',
        'Advanced AI Research',
        'MCP Integration',
        'API access',
        'Priority support',
      ],
      cta: lang === 'zh' ? '开始免费试用' : 'Start Free Trial',
      popular: true,
    },
    {
      name: lang === 'zh' ? '企业版' : 'Enterprise',
      description: lang === 'zh' ? '适合企业级私有化、SLA 和定制数据需求' : 'For enterprise-scale GEO operations, SLAs, and custom data needs',
      price: null,
      credits: lang === 'zh' ? 'Custom credits' : 'Custom credits',
      platforms: [
        { name: 'ChatGPT', logo: '/logos/openai.png' },
        { name: 'Perplexity', logo: '/logos/perplexity.png' },
        { name: 'AI Overview Data', logo: '/logos/google.png' },
        { name: 'Gemini', logo: '/logos/gemini.png' },
      ],
      features: lang === 'zh' ? [
        '自定义 brands、seats 和 prompt volume',
        '新平台优先接入',
        'Custom responses、AI Credits 和 retention',
        '完整 GEO Agent 和 MCP capability',
        'Enterprise reports 和 custom dimensions',
        'API access、Webhooks 和可选私有部署',
        'Dedicated CSM、Chat support 和 4-hour SLA',
      ] : [
        'Custom brands, seats, and prompt volume',
        'Priority access to new platforms',
        'Custom responses, AI Credits, and retention',
        'Full GEO Agent and MCP capability',
        'Enterprise reports and custom dimensions',
        'API access, Webhooks, and optional private deployment',
        'Dedicated CSM, Chat support, and 4-hour SLA',
      ],
      cta: lang === 'zh' ? '联系销售' : 'Contact Sales',
      popular: false,
    },
  ]

  return (
    <div className="min-h-screen bg-canvas">
      <PublicNavbar activeHref="/pricing/" />

      <section className="bg-canvas px-6 pb-8 pt-28">
        <div className="mx-auto max-w-7xl text-center">
          <div className="mb-10 inline-flex items-center gap-4 rounded-full border border-divider-light bg-surface p-1">
            <button
              onClick={() => setIsYearly(false)}
              className={`cursor-pointer rounded-full px-6 py-2 font-medium transition-all ${!isYearly ? 'bg-ink text-ink-inv' : 'text-ink-2 hover:text-ink'}`}
            >
              {lang === 'zh' ? '月付' : 'Monthly'}
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`cursor-pointer rounded-full px-6 py-2 font-medium transition-all ${isYearly ? 'bg-ink text-ink-inv' : 'text-ink-2 hover:text-ink'}`}
            >
              {lang === 'zh' ? '年付' : 'Yearly'}
              <span className="ml-2 text-xs font-semibold text-sage">{lang === 'zh' ? '赠2个月' : '2 months free'}</span>
            </button>
          </div>

          {checkoutError && (
            <div className="mx-auto mb-6 max-w-xl rounded-xl border border-divider bg-red-soft-bg p-4 text-center text-sm text-red-soft">
              {checkoutError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
            {plans.map((plan) => {
              const planKey = PLAN_KEY_MAP[plan.name] ?? 'starter'
              const isThisLoading = checkoutLoading === planKey
              const price = plan.price

              return (
                <div
                  key={plan.name}
                  className={`relative rounded-2xl border-2 p-8 text-left ${
                    plan.popular ? 'border-ink bg-ink text-ink-inv shadow-xl' : 'border-divider bg-surface'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-sage px-4 py-1.5 text-xs font-semibold text-ink-inv shadow-sm">
                      {lang === 'zh' ? '最受欢迎' : 'Most Popular'}
                    </div>
                  )}

                  <div className="mb-8 text-center">
                    <h3 className={`text-xl font-semibold ${plan.popular ? 'text-ink-inv' : 'text-ink'}`}>{plan.name}</h3>
                    <p className={`mt-3 min-h-[44px] text-sm leading-relaxed ${plan.popular ? 'text-ink-inv/70' : 'text-ink-2'}`}>
                      {plan.description}
                    </p>
                    {plan.originalPrice && (
                      <p className="mt-6 text-sm font-semibold text-red-soft line-through">${plan.originalPrice}</p>
                    )}
                    {price ? (
                      <>
                        <div className="mt-2 flex items-baseline justify-center gap-1">
                          <span className={`text-5xl font-bold ${plan.popular ? 'text-ink-inv' : 'text-ink'}`}>
                            ${isYearly ? Math.round(price.yearly) : price.monthly}
                          </span>
                          <span className={plan.popular ? 'text-ink-inv/70' : 'text-ink-3'}>/{lang === 'zh' ? '月' : 'month'}</span>
                        </div>
                        <p className={`mt-3 text-sm font-semibold ${plan.popular ? 'text-ink-inv/80' : 'text-ink'}`}>
                          {lang === 'zh' ? '节省约 33%' : 'Save 33%'}
                        </p>
                      </>
                    ) : (
                      <div className={`mt-10 text-5xl font-bold ${plan.popular ? 'text-ink-inv' : 'text-ink'}`}>
                        {lang === 'zh' ? '定制' : 'Custom'}
                      </div>
                    )}
                    <div className={`mt-7 rounded-xl border p-4 text-left ${plan.popular ? 'border-white/15 bg-white/10' : 'border-divider bg-surface'}`}>
                      <p className={`text-sm font-semibold ${plan.popular ? 'text-ink-inv' : 'text-ink'}`}>{plan.credits}</p>
                      <p className={`mt-1 text-xs ${plan.popular ? 'text-ink-inv/55' : 'text-ink-3'}`}>
                        {lang === 'zh' ? 'Credits roll over · never expire' : 'Credits roll over · never expire'}
                      </p>
                    </div>
                    <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                      {plan.platforms.map((platform) => (
                        <span key={platform.name} className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold ${plan.popular ? 'bg-white/15 text-white/85' : 'bg-surface-warm text-ink-2'}`}>
                          <img src={platform.logo} alt={platform.name} width={12} height={12} className="h-3 w-3 flex-shrink-0 object-contain" />
                          {platform.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <ul className="mb-8 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className={`flex items-start gap-3 text-sm ${plan.popular ? 'text-ink-inv/78' : 'text-ink-2'}`}>
                        <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-sage-bg">
                          <svg className="h-3 w-3 text-sage" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {(() => {
                    const state = getPlanState(planKey)
                    const spinnerSvg = (
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    )
                    const redirectingLabel = lang === 'zh' ? '跳转中...' : 'Redirecting...'
                    const btnBase = `flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold transition-all`
                    const btnColors = plan.popular
                      ? 'bg-surface text-ink hover:bg-surface-muted'
                      : 'bg-ink text-ink-inv hover:bg-[#2d2d2c]'

                    if (state === 'current') {
                      const isCanceling = sub?.cancel_at_period_end === true
                      return (
                        <div className="space-y-2">
                          {isCanceling ? (
                            <button
                              onClick={handleReactivate}
                              disabled={reactivateLoading}
                              className={`${btnBase} cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${btnColors}`}
                            >
                              {reactivateLoading
                                ? <>{spinnerSvg}{redirectingLabel}</>
                                : (lang === 'zh' ? '恢复订阅' : 'Reactivate Plan')}
                            </button>
                          ) : (
                            <button disabled className={`${btnBase} cursor-not-allowed opacity-40 ${btnColors}`}>
                              {lang === 'zh' ? '当前套餐' : 'Current Plan'}
                            </button>
                          )}
                          <button
                            onClick={() => handlePortalRedirect()}
                            disabled={!!portalLoading}
                            className={`w-full text-xs underline underline-offset-2 transition-colors disabled:opacity-50 ${
                              plan.popular ? 'text-ink-inv/60 hover:text-ink-inv/90' : 'text-ink-3 hover:text-ink-2'
                            }`}
                          >
                            {portalLoading === 'manage'
                              ? redirectingLabel
                              : (lang === 'zh' ? '管理订阅' : 'Manage subscription')}
                          </button>
                        </div>
                      )
                    }

                    if (state === 'upgrade' || state === 'downgrade') {
                      const isThisUpgrading = upgradeLoading && upgradeConfirm?.planKey === planKey
                      return (
                        <button
                          onClick={() => setUpgradeConfirm({ planKey, planName: plan.name })}
                          disabled={upgradeLoading}
                          className={`${btnBase} cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${btnColors}`}
                        >
                          {isThisUpgrading ? <>{spinnerSvg}{redirectingLabel}</> : (
                            state === 'upgrade'
                              ? (lang === 'zh' ? '升级套餐 →' : 'Upgrade →')
                              : (lang === 'zh' ? '降级套餐' : 'Downgrade')
                          )}
                        </button>
                      )
                    }

                    // 'subscribe' — normal checkout flow
                    return (
                      <button
                        onClick={() => handleStartTrial(plan.name)}
                        disabled={isThisLoading || checkoutLoading !== null}
                        className={`${btnBase} cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${btnColors}`}
                      >
                        {isThisLoading ? <>{spinnerSvg}{redirectingLabel}</> : plan.cta}
                      </button>
                    )
                  })()}
                </div>
              )
            })}
          </div>

          <div className="mx-auto mt-12 max-w-3xl rounded-2xl bg-ink px-8 py-5 text-left shadow-lg">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold text-ink-inv">{lang === 'zh' ? '需要专业团队帮您做？' : 'Need experts to do it for you?'}</p>
                <p className="mt-1 text-xs text-ink-inv/60">
                  {lang === 'zh'
                    ? 'Managed Service 包含完整平台 + 专家团队执行'
                    : 'Managed Service includes full platform + expert team execution'}
                </p>
              </div>
              <Link href="/contact/?subject=managed-service" className="inline-flex justify-center rounded-xl bg-surface px-5 py-2.5 text-sm font-semibold text-ink transition-all hover:bg-surface-muted">
                {lang === 'zh' ? '查看托管服务' : 'View Services'}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />

      {/* Upgrade / downgrade confirmation modal */}
      {upgradeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-surface p-8 shadow-2xl">
            <h3 className="text-lg font-semibold text-ink">
              {lang === 'zh'
                ? `确认切换到 ${upgradeConfirm.planName}？`
                : `Switch to ${upgradeConfirm.planName}?`}
            </h3>
            <p className="mt-3 text-sm text-ink-2">
              {lang === 'zh'
                ? '切换立即生效。当前周期剩余金额将按比例计入下次账单（差价补退）。'
                : 'Change takes effect immediately. A prorated amount will be charged or credited on your next invoice.'}
            </p>
            <div className="mt-4 rounded-xl border border-divider bg-surface-warm p-4 text-sm">
              <div className="flex items-baseline justify-between">
                <span className="text-ink-2">{lang === 'zh' ? '新套餐' : 'New plan'}</span>
                <span className="font-semibold text-ink">
                  {upgradeConfirm.planName} — $
                  {isYearly
                    ? Math.round(PLAN_PRICE[upgradeConfirm.planKey]?.yearly ?? 0)
                    : (PLAN_PRICE[upgradeConfirm.planKey]?.monthly ?? 0)}
                  /{lang === 'zh' ? '月' : 'mo'}
                  {isYearly ? (lang === 'zh' ? '（年付）' : ' (billed yearly)') : ''}
                </span>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setUpgradeConfirm(null)}
                disabled={upgradeLoading}
                className="flex-1 rounded-xl border border-divider py-2.5 text-sm font-medium text-ink-2 transition-colors hover:bg-surface-warm disabled:opacity-50"
              >
                {lang === 'zh' ? '取消' : 'Cancel'}
              </button>
              <button
                onClick={handleConfirmUpgrade}
                disabled={upgradeLoading}
                className="flex-1 rounded-xl bg-ink py-2.5 text-sm font-semibold text-ink-inv transition-colors hover:bg-[#2d2d2c] disabled:opacity-60"
              >
                {upgradeLoading
                  ? (lang === 'zh' ? '处理中...' : 'Processing...')
                  : (lang === 'zh' ? '确认切换' : 'Confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
