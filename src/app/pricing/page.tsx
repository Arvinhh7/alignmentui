'use client'

import Link from 'next/link'
import { useState, useCallback, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useLanguage } from '@/lib/LanguageContext'
import LanguageSwitch from '@/components/LanguageSwitch'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import { gaEvent } from '@/lib/gtag'

const faqs = {
  en: [
    {
      question: 'What is the difference between Platform and Managed Service?',
      answer: 'Platform is a self-serve tool — you configure prompts, run scans, and analyze results yourself. Managed Service is a done-for-you solution where our veteran GEO experts handle strategy, content creation, distribution, and ongoing optimization on your behalf — powered by our proprietary GEO vertical model and a 100M+ citation database.',
    },
    {
      question: 'What is Generative Engine Optimization (GEO)?',
      answer: 'GEO is the practice of analyzing and improving how your brand is surfaced, weighted, and cited within AI-generated answers across platforms like ChatGPT, Perplexity, and Gemini. It requires deep expertise in how AI models evaluate source credibility, content structure, and citation probability — which is exactly what our team specializes in.',
    },
    {
      question: 'Does Managed Service include Platform access?',
      answer: 'Yes. Every Managed Service plan includes full Enterprise-level Platform access. You get the monitoring tool plus the expert team — and all content our team produces is validated against our proprietary GEO vertical model trained on 100M+ data points to ensure maximum citation probability.',
    },
    {
      question: 'Why is Managed Service content higher quality than self-generated content?',
      answer: 'Our GEO experts have spent years studying how AI platforms select and cite sources. Every piece of content we produce is structured using our proprietary GEO vertical model — a purpose-built framework trained on 100M+ real-world AI citation patterns. This is fundamentally different from generic content writing or AI generation.',
    },
    {
      question: 'What are credits and how are they consumed?',
      answer: 'Credits are the universal unit for all Platform operations. Each AI-powered action costs a specific number of credits — for example, running a GEO Audit costs 10 credits, a Monitor Scan costs 1 credit per prompt, and generating an Intel Report costs 25 credits. Your plan includes a monthly credit allowance (Starter: 300, Growth: 1,000, Enterprise: 5,000). Credits reset each billing month. The 14-day free trial includes 50 credits.',
    },
    {
      question: 'Can I switch from Platform to Managed Service?',
      answer: 'Absolutely. Many customers start with the Platform to understand their AI visibility baseline, then upgrade to Managed Service when they want our expert team to take over execution. Your data and configuration transfer seamlessly.',
    },
  ],
  zh: [
    {
      question: 'Platform（平台）和 Managed Service（托管服务）有什么区别？',
      answer: 'Platform 是自助工具 — 您自己配置 Prompt、运行扫描、分析结果。Managed Service 是全托管方案，我们的资深 GEO 专家团队全程负责策略制定、内容产出、渠道分发和持续优化 — 并以我们独有的 GEO 垂直模型和千万级引用数据库为底层支撑。',
    },
    {
      question: '什么是生成式引擎优化(GEO)？',
      answer: 'GEO 是一种分析和提升您的品牌在 AI 平台（ChatGPT、Perplexity、Gemini 等）生成的答案中被引用和推荐的实践。它需要深度理解 AI 模型的信源评估逻辑、内容结构要求和引用概率模型 — 这正是我们团队的核心专长。',
    },
    {
      question: 'Managed Service 是否包含平台使用权限？',
      answer: '是的。每个 Managed Service 方案都包含企业版平台的完整使用权限。您既获得监控工具，也获得专业团队 — 且我们产出的所有内容均经过我们专有 GEO 垂直模型验证，基于千万级数据训练确保最高引用概率。',
    },
    {
      question: '为什么 Managed Service 内容质量高于自主生产？',
      answer: '我们的 GEO 专家深耕 AI 平台信源选择规律多年。每篇内容均基于我们的专有 GEO 垂直模型进行结构化 — 这是一个专门针对 AI 引用场景训练的框架，底层数据超过 1 亿条真实 AI 引用样本。这与普通内容写作或 AI 生成有本质区别。',
    },
    {
      question: 'Credits（积分）是什么？怎么消耗？',
      answer: 'Credits 是平台所有操作的统一计量单位。每个 AI 驱动的操作消耗不同的积分 — 例如 GEO 审计消耗 10 积分，Monitor 扫描每个 Prompt 消耗 1 积分，生成情报报告消耗 25 积分。您的计划包含月度积分额度（入门版：300，增长版：1,000，企业版：5,000）。积分每个计费月重置。14 天免费试用包含 50 积分。',
    },
    {
      question: '我可以从 Platform 升级到 Managed Service 吗？',
      answer: '当然可以。很多客户先用 Platform 了解自己的 AI 可见度基线，再升级到 Managed Service 让我们的专家团队接管执行。您的数据和配置会无缝迁移。',
    },
  ],
}

type PricingTab = 'platform' | 'service'

// Plan name → plan key mapping (for Stripe)
const PLAN_KEY_MAP: Record<string, string> = {
  'Starter': 'starter',
  'Growth': 'growth',
  'Enterprise': 'enterprise',
  '入门版': 'starter',
  '增长版': 'growth',
  '企业版': 'enterprise',
}

// Plan key → USD price (monthly / yearly) — used for GA4 begin_checkout & purchase events
const PLAN_PRICE: Record<string, { monthly: number; yearly: number }> = {
  starter:    { monthly: 299, yearly: 249 },
  growth:     { monthly: 599, yearly: 499 },
  enterprise: { monthly: 999, yearly: 833 },
}

export default function PricingPage() {
  return (
    <Suspense fallback={null}>
      <PricingPageInner />
    </Suspense>
  )
}

function PricingPageInner() {
  const { t, lang } = useLanguage()
  const { user, isAuthenticated } = useAuth()
  const searchParams = useSearchParams()
  const [isYearly, setIsYearly] = useState(false)
  const [activeTab, setActiveTab] = useState<PricingTab>('platform')
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  // Show error toast if redirected back from failed checkout attempt
  useEffect(() => {
    if (searchParams.get('checkout_error')) {
      setCheckoutError('Unable to start checkout. Please try again or contact support.')
    }
  }, [searchParams])

  const handleStartTrial = useCallback(async (planName: string) => {
    const planKey = PLAN_KEY_MAP[planName]
    if (!planKey) return

    // Fire begin_checkout before any redirect
    const planPrice = PLAN_PRICE[planKey]
    if (planPrice) {
      gaEvent('begin_checkout', {
        currency: 'USD',
        value: isYearly ? planPrice.yearly : planPrice.monthly,
        items: [{ item_name: `Alignment ${planKey}`, price: isYearly ? planPrice.yearly : planPrice.monthly }],
        billing_interval: isYearly ? 'year' : 'month',
      })
    }

    // Enterprise → contact sales
    if (planKey === 'enterprise') {
      window.location.href = '/contact/?subject=enterprise-platform'
      return
    }

    // Not logged in → go to signup with redirect param
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
        // Store plan for purchase event after Stripe redirect
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

  const platformPlans = [
    {
      name: lang === 'zh' ? '入门版' : 'Starter',
      description: lang === 'zh' ? '适合初创团队了解 AI 可见度' : 'For teams getting started with AI visibility',
      price: { monthly: 299, yearly: 249 },
      features: lang === 'zh' ? [
        '14 天免费试用',
        'ChatGPT / Perplexity / AI Overviews',
        '300 Credits/月',
        '每日可见度追踪',
        '2 个团队席位',
        '基础报告导出',
        '邮件支持',
      ] : [
        '14-day free trial',
        'ChatGPT / Perplexity / AI Overviews',
        '300 credits/month',
        'Daily visibility tracking',
        '2 team seats',
        'Basic report export',
        'Email support',
      ],
      cta: lang === 'zh' ? '开始免费试用' : 'Start Free Trial',
      popular: false,
    },
    {
      name: lang === 'zh' ? '增长版' : 'Growth',
      description: lang === 'zh' ? '适合需要完整平台功能的企业' : 'For businesses needing full platform capabilities',
      price: { monthly: 599, yearly: 499 },
      features: lang === 'zh' ? [
        '14 天免费试用',
        '所有入门版功能',
        '1,000 Credits/月',
        '实时可见度追踪',
        '5 个团队席位',
        'GEO 内容生成工具',
        '竞品分析',
        '自定义报告',
        '优先支持',
      ] : [
        '14-day free trial',
        'All Starter features',
        '1,000 credits/month',
        'Real-time visibility tracking',
        '5 team seats',
        'GEO content generation tools',
        'Competitor analysis',
        'Custom reports',
        'Priority support',
      ],
      cta: lang === 'zh' ? '开始免费试用' : 'Start Free Trial',
      popular: true,
    },
    {
      name: lang === 'zh' ? '企业版' : 'Enterprise',
      description: lang === 'zh' ? '适合大型组织和多品牌管理' : 'For large organizations and multi-brand management',
      price: { monthly: 999, yearly: 832 },
      features: lang === 'zh' ? [
        '所有增长版功能',
        '5,000 Credits/月',
        '无限团队席位',
        '多品牌管理',
        'API 访问',
        '自定义集成',
        'SLA 保障',
        '专属客户成功经理',
      ] : [
        'All Growth features',
        '5,000 credits/month',
        'Unlimited team seats',
        'Multi-brand management',
        'API access',
        'Custom integrations',
        'SLA guarantee',
        'Dedicated customer success manager',
      ],
      cta: lang === 'zh' ? '联系销售' : 'Contact Sales',
      popular: false,
    },
  ]

  const servicePlans = [
    {
      name: lang === 'zh' ? 'Seller GEO / 卖家版' : 'Seller GEO',
      description: lang === 'zh' ? '适合跨境卖家 / 独立站，高性价比流量增长' : 'For cross-border sellers & DTC brands seeking AI traffic growth',
      price: { monthly: 1999, yearly: 1666 },
      minMonths: 6,
      features: lang === 'zh' ? [
        '包含企业版平台订阅',
        '专有 GEO 垂直模型支持',
        '30 个 GEO Prompt 专家定制',
        '每月 40 篇专家撰写 GEO 语料内容',
        '10 个 Reddit 曝光帖（专家选题）',
        'SEO 结构化调整（基础排名优化）',
        '专属 GEO 策略顾问',
        '月度策略评审会',
        '竞品 AI 可见度月报',
      ] : [
        'Enterprise Platform included',
        'Powered by proprietary GEO vertical model',
        '30 expert-crafted GEO prompts',
        '40 expert-written GEO content pieces/mo',
        '10 Reddit posts (expert topic selection)',
        'SEO structural adjustment (basic ranking)',
        'Dedicated GEO strategist',
        'Monthly strategy review session',
        'Competitor visibility monthly report',
      ],
      cta: lang === 'zh' ? '预约咨询' : 'Book a Consultation',
      popular: false,
    },
    {
      name: lang === 'zh' ? 'Growth GEO / 成长版' : 'Growth GEO',
      description: lang === 'zh' ? '适合中型企业 / 创投，高效突破 AI 流量红利' : 'For mid-size businesses & startups capturing the AI traffic wave',
      price: { monthly: 3999, yearly: 3332 },
      minMonths: 6,
      features: lang === 'zh' ? [
        '包含企业版平台订阅',
        '专有 GEO 垂直模型 + 千万级数据库',
        '60 个 GEO Prompt 专家定制',
        '每月 80 篇专家撰写 GEO 语料内容',
        '20 个 Reddit 曝光帖（专家选题）',
        'SEO 结构化优化（进阶服务）',
        '高级 GEO 策略总监',
        '每周策略沟通',
        '深度竞品情报分析',
        'ROI 追踪与季度复盘',
        '24/7 优先响应',
      ] : [
        'Enterprise Platform included',
        'Proprietary GEO vertical model + 100M+ citation database',
        '60 expert-crafted GEO prompts',
        '80 expert-written GEO content pieces/mo',
        '20 Reddit posts (expert topic selection)',
        'SEO structural optimization (advanced)',
        'Senior GEO strategy director',
        'Weekly strategy calls',
        'Deep competitor intelligence',
        'ROI tracking & quarterly review',
        '24/7 priority response',
      ],
      cta: lang === 'zh' ? '预约咨询' : 'Book a Consultation',
      popular: true,
    },
    {
      name: lang === 'zh' ? 'Enterprise GEO / 企业版' : 'Enterprise GEO',
      description: lang === 'zh' ? '适合品牌大客户 / 顶级大卖，定制化产品 AI 战略增长' : 'For enterprise brands & top sellers needing custom AI strategy',
      price: { monthly: 5999, yearly: 4999 },
      minMonths: 6,
      features: lang === 'zh' ? [
        '包含企业版平台订阅',
        '专有 GEO 垂直模型（独家授权使用）',
        '千万级 GEO 引用数据库支持',
        '自定义 Prompt 数量（无上限）',
        '多语言内容开发（选配）',
        '专家深度内容逻辑架构',
        'Reddit 深度内容营销（专家运营）',
        'SEO / 品牌 长期战略服务',
        '专属项目团队',
        '季度线下策略评审',
        '专属 Slack / 微信群',
        '自定义 SLA',
      ] : [
        'Enterprise Platform included',
        'Proprietary GEO vertical model (exclusive access)',
        '100M+ GEO citation database',
        'Custom prompt volume (unlimited)',
        'Multi-language content development (add-on)',
        'Expert-led content logic architecture',
        'Reddit deep content marketing (expert-managed)',
        'SEO / brand long-term strategy',
        'Dedicated project team',
        'Quarterly on-site strategy review',
        'Dedicated Slack / WeChat group',
        'Custom SLA',
      ],
      cta: lang === 'zh' ? '联系我们' : 'Contact Us',
      popular: false,
    },
  ]

  return (
    <div className="min-h-screen bg-canvas">
      {/* Navigation */}
      <nav className="bg-surface border-b border-divider-light sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-ink rounded-lg flex items-center justify-center">
                <span className="text-ink-inv font-bold text-sm">A</span>
              </div>
              <span className="text-lg font-bold text-ink">Alignment AI</span>
            </Link>

            <div className="hidden md:flex items-center gap-6">
              <Link href="/" className="text-ink-2 hover:text-ink text-sm font-medium transition-colors">
                {t.nav.system}
              </Link>
              <Link href="/" className="text-ink-2 hover:text-ink text-sm font-medium transition-colors">
                {t.nav.solutions}
              </Link>
              <Link href="/" className="text-ink-2 hover:text-ink text-sm font-medium transition-colors">
                {t.nav.technology}
              </Link>
              <Link href="/pricing/" className="text-ink font-semibold text-sm">
                {t.nav.pricing}
              </Link>
              <Link href="/" className="text-ink-2 hover:text-ink text-sm font-medium transition-colors">
                {t.nav.docs}
              </Link>
              <Link href="/" className="text-ink-2 hover:text-ink text-sm font-medium transition-colors">
                {t.nav.insights}
              </Link>
              <Link href="/" className="text-ink-2 hover:text-ink text-sm font-medium transition-colors">
                {t.nav.contact}
              </Link>
              <Link href="/roi-simulator" className="px-3 py-1.5 text-ink-2 hover:text-ink text-sm font-semibold transition-colors rounded-lg bg-surface-warm hover:bg-surface-muted flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                {(t as unknown as Record<string, string>).nav_roi || 'ROI Calculator'}
              </Link>
            </div>

            <div className="flex items-center gap-4">
              <LanguageSwitch />
              <Link href="/login/" className="text-ink-2 hover:text-ink font-medium transition-colors">
                {t.nav.signIn}
              </Link>
              <Link
                href="/login/"
                className="bg-ink hover:bg-[#2d2d2c] text-ink-inv font-semibold px-6 py-2.5 rounded-xl transition-all"
              >
                {t.nav.getStarted}
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-16 bg-canvas">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-ink mb-4">
            {lang === 'zh' ? '选择适合您的方案' : 'Choose Your Path to AI Visibility'}
          </h1>
          <p className="text-lg text-ink-2 max-w-2xl mx-auto mb-10">
            {lang === 'zh'
              ? '自助使用平台工具，或让我们的 GEO 专家团队全程代劳 — 两种方式，同一个目标。'
              : 'Use the platform yourself, or let our GEO experts do it for you — two paths, one goal.'}
          </p>

          {/* Tab Toggle: Platform vs Service */}
          <div className="inline-flex items-center bg-surface rounded-2xl p-1.5 border border-divider-light shadow-sm mb-6">
            <button
              onClick={() => setActiveTab('platform')}
              className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
                activeTab === 'platform'
                  ? 'bg-ink text-ink-inv shadow-md'
                  : 'text-ink-2 hover:text-ink hover:bg-surface-warm'
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                {lang === 'zh' ? 'Platform 自助平台' : 'Platform'}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('service')}
              className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
                activeTab === 'service'
                  ? 'bg-ink text-ink-inv shadow-md'
                  : 'text-ink-2 hover:text-ink hover:bg-surface-warm'
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                {lang === 'zh' ? 'Managed Service 托管服务' : 'Managed Service'}
              </span>
            </button>
          </div>

          {/* Subtitle for each tab */}
          <div className="mb-2">
            {activeTab === 'platform' ? (
              <p className="text-sm text-ink-3">
                {lang === 'zh'
                  ? '自助工具 — 您的团队自己配置 Prompt、跑扫描、看报告、用 AI 生成内容'
                  : 'Self-serve tools — your team configures prompts, runs scans, views reports, and generates content'}
              </p>
            ) : (
              <p className="text-sm text-ink-3">
                {lang === 'zh'
                  ? '全托管方案 — 我们的 GEO 专家团队为您制定策略、创作内容、分发执行'
                  : 'Done-for-you — our GEO experts handle strategy, content creation, and distribution'}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Platform Pricing */}
      {activeTab === 'platform' && (
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-6">
            {/* Billing Toggle */}
            <div className="flex justify-center mb-10">
              <div className="inline-flex items-center gap-4 bg-surface rounded-full p-1 border border-divider-light">
                <button
                  onClick={() => setIsYearly(false)}
                  className={`px-6 py-2 rounded-full font-medium transition-all ${
                    !isYearly ? 'bg-ink text-ink-inv' : 'text-ink-2 hover:text-ink'
                  }`}
                >
                  {lang === 'zh' ? '月付' : 'Monthly'}
                </button>
                <button
                  onClick={() => setIsYearly(true)}
                  className={`px-6 py-2 rounded-full font-medium transition-all ${
                    isYearly ? 'bg-ink text-ink-inv' : 'text-ink-2 hover:text-ink'
                  }`}
                >
                  {lang === 'zh' ? '年付' : 'Yearly'}
                  <span className="ml-2 text-xs text-sage font-semibold">{lang === 'zh' ? '赠2个月' : '2 months free'}</span>
                </button>
              </div>
            </div>

            {checkoutError && (
              <div className="mb-6 max-w-xl mx-auto p-4 bg-red-soft-bg border border-divider rounded-xl text-red-soft text-sm text-center">
                {checkoutError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {platformPlans.map((plan, index) => {
                const planKey = PLAN_KEY_MAP[plan.name] ?? 'starter'
                const isThisLoading = checkoutLoading === planKey
                return (
                <div
                  key={index}
                  className={`rounded-2xl border-2 p-8 relative ${
                    plan.popular ? 'bg-ink border-ink shadow-xl' : 'bg-surface border-divider-light'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-sage-bg text-sage text-sm font-semibold px-4 py-1 rounded-full">
                      {lang === 'zh' ? '最受欢迎' : 'Most Popular'}
                    </div>
                  )}

                  <div className="text-center mb-8">
                    <h3 className={`text-lg font-semibold mb-1 ${plan.popular ? 'text-ink-inv' : 'text-ink'}`}>{plan.name}</h3>
                    <p className={`text-sm mb-4 ${plan.popular ? 'text-ink-inv/70' : 'text-ink-3'}`}>{plan.description}</p>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className={`text-4xl font-bold ${plan.popular ? 'text-ink-inv' : 'text-ink'}`}>
                        ${isYearly ? plan.price.yearly : plan.price.monthly}
                      </span>
                      <span className={plan.popular ? 'text-ink-inv/70' : 'text-ink-3'}>/{lang === 'zh' ? '月' : 'mo'}</span>
                    </div>
                    {isYearly && (
                      <p className="text-sm mt-2 text-sage">
                        {lang === 'zh'
                          ? `年付 ($${plan.price.yearly * 12}/年)`
                          : `Billed annually ($${plan.price.yearly * 12}/year)`}
                      </p>
                    )}
                    {!isYearly && (
                      <p className={`text-xs mt-2 ${plan.popular ? 'text-ink-inv/50' : 'text-ink-3'}`}>
                        {lang === 'zh' ? '14 天免费试用，随时取消' : '14-day free trial, cancel anytime'}
                      </p>
                    )}
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, i) => (
                      <li key={i} className={`flex items-start gap-3 text-sm ${plan.popular ? 'text-ink-inv/80' : 'text-ink-2'}`}>
                        <span className="w-5 h-5 bg-sage-bg rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg className="w-3 h-3 text-sage" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleStartTrial(plan.name)}
                    disabled={isThisLoading || checkoutLoading !== null}
                    className={`w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${
                      plan.popular
                        ? 'bg-surface text-ink hover:bg-surface-muted'
                        : 'bg-ink hover:bg-[#2d2d2c] text-ink-inv'
                    }`}
                  >
                    {isThisLoading ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        {lang === 'zh' ? '跳转中...' : 'Redirecting...'}
                      </>
                    ) : plan.cta}
                  </button>
                </div>
                )
              })}
            </div>

            {/* Platform → Service upsell */}
            <div className="mt-12 text-center">
              <div className="inline-flex items-center gap-3 bg-ink rounded-2xl px-8 py-5 shadow-lg">
                <div className="w-10 h-10 bg-surface-muted rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-ink" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                </div>
                <div className="text-left">
                  <p className="text-ink-inv font-semibold text-sm">
                    {lang === 'zh' ? '需要专业团队帮您做？' : 'Need experts to do it for you?'}
                  </p>
                  <p className="text-ink-inv/60 text-xs">
                    {lang === 'zh'
                      ? '查看我们的 Managed Service 托管服务，包含完整平台 + 专业团队执行'
                      : 'Check out our Managed Service — includes full platform + expert team execution'}
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('service')}
                  className="flex-shrink-0 px-5 py-2.5 bg-surface hover:bg-surface-muted text-ink text-sm font-semibold rounded-xl transition-all"
                >
                  {lang === 'zh' ? '查看托管服务' : 'View Services'}
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Managed Service Pricing */}
      {activeTab === 'service' && (
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-6">
            {/* What's included banner */}
            <div className="flex justify-center mb-10">
              <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-sage-bg border border-divider-light rounded-full">
                <svg className="w-4 h-4 text-sage" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                <span className="text-sm font-medium text-sage">
                  {lang === 'zh'
                    ? '所有方案均包含：企业版平台 + 专有 GEO 垂直模型 + 千万级引用数据库'
                    : 'All plans include: Enterprise Platform + Proprietary GEO Vertical Model + 100M+ Citation Database'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {servicePlans.map((plan, index) => (
                <div
                  key={index}
                  className={`rounded-2xl border-2 p-8 relative ${
                    plan.popular ? 'bg-ink border-ink shadow-xl' : 'bg-surface border-divider-light'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-sage-bg text-sage text-sm font-semibold px-4 py-1 rounded-full">
                      {lang === 'zh' ? '最受出海企业欢迎' : 'Most Popular'}
                    </div>
                  )}

                  <div className="text-center mb-8">
                    <h3 className={`text-lg font-semibold mb-1 ${plan.popular ? 'text-ink-inv' : 'text-ink'}`}>{plan.name}</h3>
                    <p className={`text-sm mb-4 ${plan.popular ? 'text-ink-inv/70' : 'text-ink-3'}`}>{plan.description}</p>
                    {plan.price ? (
                      <>
                        <div className="flex items-baseline justify-center gap-1">
                          <span className={`text-4xl font-bold ${plan.popular ? 'text-ink-inv' : 'text-ink'}`}>
                            ${plan.price.monthly.toLocaleString()}
                          </span>
                          <span className={plan.popular ? 'text-ink-inv/70' : 'text-ink-3'}>/{lang === 'zh' ? '月' : 'mo'}</span>
                        </div>
                        <p className={`text-xs mt-2 ${plan.popular ? 'text-ink-inv/50' : 'text-ink-3'}`}>
                          {lang === 'zh'
                            ? `最短 ${plan.minMonths} 个月起签`
                            : `${plan.minMonths}-month minimum commitment`}
                        </p>
                      </>
                    ) : (
                      <div className="flex items-baseline justify-center gap-1">
                        <span className={`text-3xl font-bold ${plan.popular ? 'text-ink-inv' : 'text-ink'}`}>
                          {lang === 'zh' ? '定制报价' : 'Custom'}
                        </span>
                      </div>
                    )}
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, i) => (
                      <li key={i} className={`flex items-start gap-3 text-sm ${plan.popular ? 'text-ink-inv/80' : 'text-ink-2'}`}>
                        <span className="w-5 h-5 bg-sage-bg rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg className="w-3 h-3 text-sage" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/contact/?subject=managed-service"
                    className={`w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center ${
                      plan.popular
                        ? 'bg-surface text-ink hover:bg-surface-muted'
                        : 'bg-ink hover:bg-[#2d2d2c] text-ink-inv'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>

            {/* ROI Calculator CTA */}
            <div className="mt-12">
              <div className="max-w-4xl mx-auto bg-ink rounded-2xl p-8 md:p-10 flex flex-col md:flex-row items-center gap-6 shadow-xl">
                <div className="flex-shrink-0 w-16 h-16 bg-surface-muted rounded-2xl flex items-center justify-center">
                  <svg className="w-8 h-8 text-ink" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-xl font-bold text-ink-inv mb-1">
                    {lang === 'zh' ? '想看看 GEO 服务的投资回报？' : 'Want to see your GEO service ROI?'}
                  </h3>
                  <p className="text-ink-inv/60">
                    {lang === 'zh'
                      ? '使用我们的 ROI 计算器，输入客单价和行业，即可预估 6 个月投资回报'
                      : 'Use our ROI Calculator — enter your AOV and industry to see projected 6-month returns'}
                  </p>
                </div>
                <Link href="/roi-simulator" className="flex-shrink-0 inline-flex items-center gap-2 px-6 py-3 bg-surface hover:bg-surface-muted text-ink font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl whitespace-nowrap">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                  {lang === 'zh' ? '计算我的ROI' : 'Calculate My ROI'}
                </Link>
              </div>
            </div>

            {/* Reverse upsell: just need the tool? */}
            <div className="mt-12 text-center">
              <div className="inline-flex items-center gap-3 bg-surface border border-divider-light rounded-2xl px-8 py-5 shadow-sm">
                <div className="w-10 h-10 bg-surface-muted rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-ink-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                <div className="text-left">
                  <p className="text-ink font-semibold text-sm">
                    {lang === 'zh' ? '有内部团队，想自己来？' : 'Have an in-house team and prefer self-serve?'}
                  </p>
                  <p className="text-ink-2 text-xs">
                    {lang === 'zh'
                      ? '试试我们的 Platform 自助平台，$299/月起，14 天免费'
                      : 'Try our Platform — starts at $299/mo with a 14-day free trial'}
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('platform')}
                  className="flex-shrink-0 px-5 py-2.5 bg-ink hover:bg-[#2d2d2c] text-ink-inv text-sm font-semibold rounded-xl transition-all"
                >
                  {lang === 'zh' ? '查看 Platform' : 'View Platform'}
                </button>
              </div>
            </div>

            {/* Comparison: Platform vs Service */}
            <div className="mt-16 max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold text-ink text-center mb-8">
                {lang === 'zh' ? 'Platform vs. Managed Service 对比' : 'Platform vs. Managed Service'}
              </h2>
              <div className="bg-surface rounded-2xl border border-divider-light overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-divider-light">
                      <th className="text-left py-4 px-6 text-sm font-medium text-ink-3"></th>
                      <th className="text-center py-4 px-6 text-sm font-semibold text-ink">
                        <div className="flex items-center justify-center gap-1.5">
                          <svg className="w-4 h-4 text-ink-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                          Platform
                        </div>
                      </th>
                      <th className="text-center py-4 px-6 text-sm font-semibold text-ink-2">
                        <div className="flex items-center justify-center gap-1.5">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          Managed Service
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(lang === 'zh' ? [
                      ['类比', '买了健身房会员卡', '聘请私教 + 营养师 + 康复师'],
                      ['谁干活', '您的团队', 'Alignment 资深 GEO 专家团队'],
                      ['GEO 监控与分析', '✅ 自助使用', '✅ 包含 + 专家解读'],
                      ['内容产出', '✅ 平台工具辅助', '✅ 专家撰写 · 垂直模型验证'],
                      ['专有 GEO 模型', '❌', '✅ 千万级数据训练的专有模型'],
                      ['渠道分发', '✅ 工具辅助', '✅ 专家团队执行'],
                      ['策略咨询', '❌', '✅ 定期评审'],
                      ['价格范围', '$299 – $999/月', '$1,999 – $5,999/月'],
                      ['适合谁', '有内部市场团队的企业', '需要专家全托管的出海企业'],
                    ] : [
                      ['Analogy', 'Gym membership', 'Personal trainer + nutritionist + physio'],
                      ['Who does the work', 'Your team', 'Alignment veteran GEO experts'],
                      ['GEO monitoring', '✅ Self-serve', '✅ Included + expert analysis'],
                      ['Content output', '✅ Platform tools', '✅ Expert-written · model-validated'],
                      ['Proprietary GEO model', '❌', '✅ 100M+ data-trained vertical model'],
                      ['Distribution', '✅ Tool-assisted', '✅ Expert team execution'],
                      ['Strategy consulting', '❌', '✅ Regular expert reviews'],
                      ['Price range', '$299 – $999/mo', '$1,999 – $5,999/mo'],
                      ['Best for', 'Teams with in-house marketing', 'Businesses needing full-service GEO'],
                    ]).map((row, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-surface-warm' : 'bg-surface'}>
                        <td className="py-3 px-6 text-sm font-medium text-ink">{row[0]}</td>
                        <td className="py-3 px-6 text-sm text-ink-2 text-center">{row[1]}</td>
                        <td className="py-3 px-6 text-sm text-ink-2 text-center">{row[2]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="py-20 bg-surface">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-ink text-center mb-12">
            {lang === 'zh' ? '常见问题' : 'Frequently Asked Questions'}
          </h2>
          <div className="space-y-4">
            {faqs[lang].map((faq, index) => (
              <div key={index} className="bg-surface-warm rounded-xl p-6 border border-divider-light">
                <h3 className="font-semibold text-ink mb-2">{faq.question}</h3>
                <p className="text-ink-2">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-ink">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-ink-inv mb-6">
            {lang === 'zh' ? '准备好提升品牌的 AI 可见度了吗？' : 'Ready to Boost Your AI Visibility?'}
          </h2>
          <p className="text-xl text-ink-inv/60 mb-10">
            {lang === 'zh'
              ? '无论您选择自助平台还是托管服务，我们都能帮您实现目标。'
              : 'Whether you choose Platform or Managed Service, we\'ll help you get there.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login/"
              className="bg-surface hover:bg-surface-muted text-ink font-semibold px-8 py-4 rounded-xl transition-all"
            >
              {lang === 'zh' ? '免费试用 Platform' : 'Try Platform Free'}
            </Link>
            <Link
              href="/contact/?subject=managed-service"
              className="bg-white/10 hover:bg-white/20 text-ink-inv font-semibold px-8 py-4 rounded-xl transition-all border border-white/20"
            >
              {lang === 'zh' ? '咨询 Managed Service' : 'Contact for Managed Service'}
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface border-t border-divider-light py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-3 mb-6 md:mb-0">
              <div className="w-10 h-10 bg-ink rounded-xl flex items-center justify-center">
                <span className="text-ink-inv font-bold text-lg">A</span>
              </div>
              <span className="text-xl font-bold text-ink">Alignment AI</span>
            </div>
            <div className="flex items-center gap-8 text-sm text-ink-2">
              <Link href="/features/" className="hover:text-ink">{t.nav.features}</Link>
              <Link href="/pricing/" className="hover:text-ink">{t.nav.pricing}</Link>
              <Link href="/roi-simulator" className="hover:text-ink text-sage font-medium">
                {(t as unknown as Record<string, string>).nav_roi || 'ROI Calculator'}
              </Link>
              <Link href="/login/" className="hover:text-ink">{t.nav.signIn}</Link>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-divider-light text-center text-ink-3 text-sm">
            {t.footer.copyright}
          </div>
        </div>
      </footer>
    </div>
  )
}
