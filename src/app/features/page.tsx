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
      icon: '📊',
      title: t.features.brandTracking.title,
      description: t.features.brandTracking.desc,
    },
    {
      icon: '🔍',
      title: t.features.promptManagement.title,
      description: t.features.promptManagement.desc,
    },
    {
      icon: '⚡',
      title: t.features.citationAnalysis.title,
      description: t.features.citationAnalysis.desc,
    },
    {
      icon: '📈',
      title: t.features.aigvrMetrics.title,
      description: t.features.aigvrMetrics.desc,
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">W</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Alignment AI</span>
            </Link>
            
            <div className="hidden md:flex items-center gap-8">
              <Link href="/features/" className="text-red-500 font-semibold">
                {t.nav.features}
              </Link>
              <Link href="/pricing/" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
                {t.nav.pricing}
              </Link>
              <Link href="/dashboard/geo-audit/" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
                {t.nav.dashboard}
              </Link>
            </div>

            <div className="flex items-center gap-4">
              <LanguageSwitch />
              <Link href="/login/" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
                {t.nav.signIn}
              </Link>
              <Link
                href="/login/"
                className="bg-red-500 hover:bg-red-600 text-white font-semibold px-6 py-2.5 rounded-xl transition-all"
              >
                {t.nav.getStarted}
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-20 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-100 rounded-full text-red-600 text-sm font-medium mb-8">
            <span className="w-2 h-2 bg-red-500 rounded-full" />
            {t.featuresPage.badge}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            {t.featuresPage.title}<br />
            <span className="text-red-500">{t.featuresPage.titleHighlight}</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {t.featuresPage.subtitle}
          </p>
        </div>
      </section>

      {/* Core Features */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">{t.featuresPage.coreModules}</h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            {t.featuresPage.coreModulesDesc}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {coreFeatures.map((feature, index) => (
              <div
                key={index}
                className="bg-gray-50 rounded-2xl p-8 border border-gray-200 hover:shadow-lg hover:border-red-200 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center text-3xl shadow-sm border border-gray-200">
                    {feature.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">{t.featuresPage.capabilities}</h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            {t.featuresPage.capabilitiesDesc}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {capabilities[lang].map((cap, index) => (
              <div key={index} className="bg-white rounded-2xl p-6 border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 pb-4 border-b border-gray-200">
                  {cap.category}
                </h3>
                <ul className="space-y-3">
                  {cap.items.map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-gray-600">
                      <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">{t.featuresPage.platforms}</h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            {t.featuresPage.platformsDesc}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {platforms.map((platform, index) => (
              <div
                key={index}
                className="bg-gray-50 rounded-xl p-4 text-center border border-gray-200 hover:border-red-200 hover:shadow-md transition-all"
              >
                <div className="text-lg font-semibold text-gray-900 mb-1">{platform.name}</div>
                <div className="text-xs text-gray-500">{platform.description}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            {t.featuresPage.ctaTitle}
          </h2>
          <p className="text-xl text-gray-400 mb-10">
            {t.featuresPage.ctaSubtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login/"
              className="bg-red-500 hover:bg-red-600 text-white font-semibold px-8 py-4 rounded-xl transition-all"
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
      <footer className="bg-white border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-3 mb-6 md:mb-0">
              <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">W</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Alignment AI</span>
            </div>
            <div className="flex items-center gap-8 text-sm text-gray-600">
              <Link href="/features/" className="hover:text-gray-900">{t.nav.features}</Link>
              <Link href="/pricing/" className="hover:text-gray-900">{t.nav.pricing}</Link>
              <Link href="/login/" className="hover:text-gray-900">{t.nav.signIn}</Link>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-200 text-center text-gray-500 text-sm">
            {t.footer.copyright}
          </div>
        </div>
      </footer>
    </div>
  )
}
