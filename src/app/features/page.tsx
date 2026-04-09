'use client'

import Link from 'next/link'
import { useLanguage } from '@/lib/LanguageContext'
import LanguageSwitch from '@/components/LanguageSwitch'

const platforms = [
  { name: 'ChatGPT', description: 'OpenAI\'s conversational AI' },
  { name: 'Perplexity', description: 'AI-powered search engine' },
  { name: 'Gemini', description: 'Google\'s multimodal AI' },
  { name: 'Claude', description: 'Anthropic\'s AI assistant' },
  { name: 'AI Overview', description: 'Google Search AI snippets' },
  { name: 'Copilot', description: 'Microsoft\'s AI companion' },
]

const capabilities = {
  en: [
    {
      category: 'GEO Audit',
      items: [
        'AI Accessibility Check',
        'Semantic Structure Analysis',
        'Content Citability Evaluation',
        'Risk Boundary Detection',
        'Reusability / Memory Assessment',
      ],
    },
    {
      category: 'GEO Optimization',
      items: [
        'One-Click Dimension Optimization',
        'Before/After Score Comparison',
        'Quick Wins Prioritization',
        'Code Change Preview',
      ],
    },
    {
      category: 'GEO Content & Distribution',
      items: [
        'AI-Citable Content Generation',
        'FAQ / Definition / Comparison Formats',
        'Multi-Channel Distribution',
        'AI Ingestion Rate Tracking',
      ],
    },
    {
      category: 'GEO Performance Monitor',
      items: [
        'AIGVR Score Tracking',
        'Brand Mention Analysis',
        'Competitor Comparison',
        'Sentiment Monitoring',
      ],
    },
  ],
  zh: [
    {
      category: 'GEO 诊断',
      items: [
        'AI 可访问性检查',
        '语义结构分析',
        '内容可引用性评估',
        '风险边界检测',
        '可复用性 / 记忆度评估',
      ],
    },
    {
      category: 'GEO 优化',
      items: [
        '一键维度优化',
        '优化前后评分对比',
        '快速优化优先排序',
        '代码变更预览',
      ],
    },
    {
      category: 'GEO 内容 & 投放',
      items: [
        'AI 可引用内容生成',
        'FAQ / 定义 / 对比格式',
        '多渠道投放',
        'AI 抓取率追踪',
      ],
    },
    {
      category: 'GEO 效果监控',
      items: [
        'AIGVR 评分追踪',
        '品牌提及分析',
        '竞品对比',
        '情感监控',
      ],
    },
  ],
}

export default function FeaturesPage() {
  const { t, lang } = useLanguage()

  const coreFeatures = [
    {
      title: t.features.brandTracking.title,
      description: t.features.brandTracking.desc,
    },
    {
      title: t.features.promptManagement.title,
      description: t.features.promptManagement.desc,
    },
    {
      title: t.features.citationAnalysis.title,
      description: t.features.citationAnalysis.desc,
    },
    {
      title: t.features.aigvrMetrics.title,
      description: t.features.aigvrMetrics.desc,
    },
  ]

  return (
    <div className="min-h-screen bg-canvas">
      {/* Navigation */}
      <nav className="bg-surface border-b border-divider-light sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-ink rounded-xl flex items-center justify-center">
                <span className="text-ink-inv font-bold text-lg">W</span>
              </div>
              <span className="text-xl font-bold text-ink">Alignment AI</span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              <Link href="/features/" className="text-ink-2 font-semibold">
                {t.nav.features}
              </Link>
              <Link href="/pricing/" className="text-ink-2 hover:text-ink font-medium transition-colors">
                {t.nav.pricing}
              </Link>
              <Link href="/dashboard/geo-audit/" className="text-ink-2 hover:text-ink font-medium transition-colors">
                {t.nav.dashboard}
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
      <section className="py-20 bg-canvas">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-surface-muted border border-divider rounded-full text-ink-2 text-sm font-medium mb-8">
            <span className="w-2 h-2 bg-ink rounded-full" />
            {t.featuresPage.badge}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-ink mb-6">
            {t.featuresPage.title}<br />
            <span className="text-ink">{t.featuresPage.titleHighlight}</span>
          </h1>
          <p className="text-xl text-ink-2 max-w-2xl mx-auto">
            {t.featuresPage.subtitle}
          </p>
        </div>
      </section>

      {/* Core Features */}
      <section className="py-20 bg-canvas">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-ink text-center mb-4">{t.featuresPage.coreModules}</h2>
          <p className="text-ink-2 text-center mb-12 max-w-2xl mx-auto">
            {t.featuresPage.coreModulesDesc}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {coreFeatures.map((feature, index) => (
              <div
                key={index}
                className="bg-surface rounded-2xl p-8 border border-divider-light hover:shadow-lg hover:border-divider transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-surface-warm rounded-xl flex items-center justify-center text-ink-2 shadow-sm border border-divider-light">
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-ink mb-2">{feature.title}</h3>
                    <p className="text-ink-2 leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="py-20 bg-canvas">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-ink text-center mb-4">{t.featuresPage.capabilities}</h2>
          <p className="text-ink-2 text-center mb-12 max-w-2xl mx-auto">
            {t.featuresPage.capabilitiesDesc}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {capabilities[lang].map((cap, index) => (
              <div key={index} className="bg-surface rounded-2xl p-6 border border-divider-light">
                <h3 className="text-lg font-bold text-ink mb-4 pb-4 border-b border-divider-light">
                  {cap.category}
                </h3>
                <ul className="space-y-3">
                  {cap.items.map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-ink-2">
                      <span className="w-5 h-5 bg-sage-bg rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-sage" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Supported Platforms */}
      <section className="py-20 bg-canvas">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-ink text-center mb-4">{t.featuresPage.platforms}</h2>
          <p className="text-ink-2 text-center mb-12 max-w-2xl mx-auto">
            {t.featuresPage.platformsDesc}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {platforms.map((platform, index) => (
              <div
                key={index}
                className="bg-surface-warm rounded-xl p-4 text-center border border-divider-light hover:border-divider hover:shadow-md transition-all"
              >
                <div className="text-lg font-semibold text-ink mb-1">{platform.name}</div>
                <div className="text-xs text-ink-3">{platform.description}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-ink text-ink-inv">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-ink-inv mb-6">
            {t.featuresPage.ctaTitle}
          </h2>
          <p className="text-xl text-ink-3 mb-10">
            {t.featuresPage.ctaSubtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login/"
              className="bg-ink hover:bg-[#2d2d2c] text-ink-inv font-semibold px-8 py-4 rounded-xl transition-all"
            >
              {t.nav.startFreeTrial}
            </Link>
            <Link
              href="/pricing/"
              className="bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-4 rounded-xl transition-all border border-white/20"
            >
              {t.nav.pricing}
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
                <span className="text-ink-inv font-bold text-lg">W</span>
              </div>
              <span className="text-xl font-bold text-ink">Alignment AI</span>
            </div>
            <div className="flex items-center gap-8 text-sm text-ink-2">
              <Link href="/features/" className="hover:text-ink">{t.nav.features}</Link>
              <Link href="/pricing/" className="hover:text-ink">{t.nav.pricing}</Link>
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
