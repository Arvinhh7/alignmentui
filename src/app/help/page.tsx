'use client'

import Link from 'next/link'
import { useState } from 'react'

const SUPPORT_EMAIL = 'support@alignmenttech.ai'

interface FAQItem {
  q: string
  a: string | React.ReactNode
}

const sections: { title: string; items: FAQItem[] }[] = [
  {
    title: '🚀 Getting Started',
    items: [
      {
        q: 'How do I install Alignment GEO?',
        a: 'Install the app from the Shopify App Store. After installation, you will be redirected to a 3-step onboarding wizard. Complete all three steps (Brand Story → Products → FAQ) and click "Complete Setup." The wizard takes about 5 minutes.',
      },
      {
        q: 'What happens right after I install?',
        a: 'The app creates your AI profile immediately: your brand data is saved as Shopify metafields, structured data (JSON-LD) is injected into your storefront via our Theme Extension, and your robots.txt is updated to allow AI crawlers. Analytics data will appear once AI bots start visiting your store — this is normal for new installs.',
      },
      {
        q: 'How long until AI bots visit my store?',
        a: 'Most stores see their first AI bot visit within 24–72 hours of completing setup. Some stores may take up to a week, depending on how frequently AI platforms crawl their category. There is nothing wrong with seeing zero data on a fresh install — it simply means no AI bots have visited yet.',
      },
      {
        q: 'Do I need any technical knowledge to use this app?',
        a: 'No. Everything is handled through guided forms in your Shopify admin. No coding is required.',
      },
    ],
  },
  {
    title: '📊 Analytics & Data',
    items: [
      {
        q: 'Why is my analytics showing zero data?',
        a: 'Zero data is completely normal for a new install. Analytics data is tracked in real time from actual AI bot visits — it is not pre-populated or simulated. Data appears once AI bots start visiting your store\'s AI profile endpoints (llms.txt, agent.json). Most stores see first visits within 24–72 hours.',
      },
      {
        q: 'Which AI platforms does Alignment GEO track?',
        a: 'We track 20+ AI platforms including GPTBot (ChatGPT), ClaudeBot (Anthropic), PerplexityBot, Gemini (Google), Bingbot (Microsoft Copilot), Meta AI, Cohere, MistralBot, YouBot, Applebot, Amazonbot, DuckAssistBot, and more. Any AI platform that uses a recognizable user-agent string will be logged.',
      },
      {
        q: 'What is "AI Referral Traffic"?',
        a: 'When a human shopper visits your store after being recommended by an AI platform (e.g., they asked ChatGPT for a product recommendation and clicked a link), our Theme Extension logs that referral. You can see which AI platforms are driving the most shoppers to your store in the Analytics tab.',
      },
      {
        q: 'How accurate is the bot detection?',
        a: 'Bot detection is based on user-agent signatures that AI platforms publicly disclose. We track every major AI platform. Accuracy depends on AI platforms using identifiable user agents, which is standard practice but not guaranteed for all crawlers.',
      },
      {
        q: 'Can I export my analytics data?',
        a: 'Export functionality is coming soon. In the meantime, contact us at support@alignmenttech.ai if you need a data export.',
      },
    ],
  },
  {
    title: '🤖 AI Profile & llms.txt',
    items: [
      {
        q: 'What is llms.txt?',
        a: 'llms.txt is a plain-text file that AI platforms read to learn about your brand. It is the AI equivalent of a press kit — your brand story, products, FAQs, and competitive positioning in a format that AI assistants can quote directly. It is served at https://yourdomain.myshopify.com/apps/alignment/llms.txt (Pro plan required).',
      },
      {
        q: 'What is agent.json?',
        a: 'agent.json is a structured JSON file that describes your brand to AI agents and automation tools. It is served at https://yourdomain.myshopify.com/apps/alignment/agent.json (Pro plan required).',
      },
      {
        q: 'What structured data (JSON-LD) does the app inject?',
        a: 'The app injects Organization schema (on all pages), Product and ItemList schema (from your Products module), FAQPage schema (from your FAQ module), and AggregateRating schema (from your Trust & Authority module, Pro plan). All schemas conform to Schema.org standards.',
      },
      {
        q: 'What is the AI Readiness Score?',
        a: 'The AI Readiness Score (0–100) measures how prepared your store is for AI discovery. Each completed module contributes points: Brand Story (+15), Products (+15), FAQ (+10), robots.txt (+5). Pro plan modules add: Trust & Authority (+15), Competitive Edge (+15), and llms.txt/agent.json endpoints (+25). The Free plan caps at 45/100.',
      },
    ],
  },
  {
    title: '💳 Plans & Billing',
    items: [
      {
        q: 'What is included in the Free plan?',
        a: 'The Free plan includes: Brand Story, Products (up to 10), FAQ (up to 5 pairs), robots.txt optimization, Organization + FAQPage + Product JSON-LD schema, and the AI Readiness Score dashboard. Your AI Score can reach up to 45/100 on the Free plan.',
      },
      {
        q: 'What do I get with Growth ($49/month)?',
        a: 'Growth unlocks: llms.txt and agent.json endpoints, Trust & Authority module, Competitive Edge module, up to 50 FAQ pairs, 100 products, 5,000 imported reviews, full AI Readiness Score (100/100), and advanced analytics with platform breakdown.',
      },
      {
        q: 'How do I upgrade my plan?',
        a: 'Go to Plans & Pricing in the app menu. Click "Upgrade to Growth" or "Upgrade to Enterprise." You will be redirected to Shopify\'s standard billing approval page. After approving, you are returned to the app with your new plan active.',
      },
      {
        q: 'How do I cancel my subscription?',
        a: 'Go to Plans & Pricing → click "Cancel Plan." Your plan will revert to Free at the end of your current billing cycle. You will not be charged again.',
      },
      {
        q: 'Do you offer refunds?',
        a: 'We do not offer refunds for partial billing periods. If you experience a technical issue that prevented you from using the app, contact us and we will review your case.',
      },
    ],
  },
  {
    title: '⚙️ Troubleshooting',
    items: [
      {
        q: 'My robots.txt score is 40/45 instead of 45/45 — what does this mean?',
        a: 'The robots.txt injection (templates/robots.txt.liquid) requires a Shopify platform exemption for App Store apps. On development stores without this exemption, the injection will not succeed and the score will show 40/45. This is a known Shopify limitation. The app will continue to work correctly — only the robots.txt optimization point is affected. Contact us for the current status of this exemption.',
      },
      {
        q: 'I saved my data but the score did not update.',
        a: 'Scores are calculated when the dashboard loads. Refresh the page after saving to see your updated score.',
      },
      {
        q: 'The "Competitive Edge" and "Trust & Authority" modules are locked.',
        a: 'These modules require the Growth plan or higher. Click "Upgrade to Growth" on the Plans & Pricing page to unlock them.',
      },
      {
        q: 'I uninstalled and reinstalled the app. Where is my data?',
        a: 'Your brand data is stored as Shopify metafields and will persist as long as the metafields are not deleted. Analytics logs (bot visits, referrals) are cleared on uninstall. If you reinstall within a short period, contact us and we may be able to restore logs.',
      },
    ],
  },
  {
    title: '🔒 Privacy & Data',
    items: [
      {
        q: 'What data does Alignment GEO store?',
        a: 'We store the brand data you enter (metafields), AI bot visit logs (bot name, endpoint, timestamp), AI referral logs (referring domain, landing page), and optionally imported reviews (name, email, rating, text). See our Privacy Policy for full details.',
      },
      {
        q: 'What happens to my data if I uninstall?',
        a: 'Session tokens and operational data are deleted immediately on uninstall. Full data purge (all logs, reviews, and configuration) occurs within 48 hours via Shopify\'s GDPR shop/redact webhook. Your brand data metafields remain in your Shopify store (they are your data) until you delete them from Shopify.',
      },
      {
        q: 'Is my data sold to third parties?',
        a: 'No. We do not sell, rent, or share your data with third parties for any marketing purpose. See our Privacy Policy for full details.',
      },
    ],
  },
]

export default function HelpPage() {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({})

  const toggleItem = (key: string) => {
    setOpenItems(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <main className="min-h-screen bg-[#fafafa] text-[#0a0a0a]">
      {/* Header */}
      <div className="border-b border-black/8 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold text-[#ef4444] hover:opacity-80 transition-opacity">
            ← Alignment AI
          </Link>
          <Link
            href={`mailto:${SUPPORT_EMAIL}`}
            className="text-sm text-[#64748b] hover:text-[#ef4444] transition-colors"
          >
            Contact Support →
          </Link>
        </div>
      </div>

      {/* Hero */}
      <div className="bg-white border-b border-black/8 py-12 text-center">
        <h1 className="text-3xl font-bold mb-3">Help Center</h1>
        <p className="text-[#64748b] max-w-md mx-auto">
          Everything you need to know about Alignment GEO — the AI visibility app for Shopify.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 bg-[#fef9e7] border border-[#f59e0b]/30 rounded-full px-4 py-2 text-sm text-[#92400e]">
          <span>💡</span>
          <span>Analytics data appears once AI bots start visiting your store — zero data on a fresh install is normal.</span>
        </div>
      </div>

      {/* FAQ Sections */}
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-10">
        {sections.map((section) => (
          <div key={section.title}>
            <h2 className="text-lg font-semibold mb-4">{section.title}</h2>
            <div className="space-y-2">
              {section.items.map((item, idx) => {
                const key = `${section.title}-${idx}`
                const isOpen = openItems[key]
                return (
                  <div
                    key={key}
                    className="bg-white border border-black/8 rounded-xl overflow-hidden"
                  >
                    <button
                      className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 hover:bg-black/[0.02] transition-colors"
                      onClick={() => toggleItem(key)}
                    >
                      <span className="font-medium text-sm">{item.q}</span>
                      <span className={`text-[#64748b] text-lg flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                        ↓
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-4 text-sm text-[#1e293b] leading-relaxed border-t border-black/5 pt-3">
                        {item.a}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {/* Still need help */}
        <div className="bg-white border border-black/8 rounded-2xl p-8 text-center">
          <h2 className="text-lg font-semibold mb-2">Still need help?</h2>
          <p className="text-[#64748b] text-sm mb-5">
            Our support team typically responds within 24 business hours.
          </p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="inline-block bg-[#ef4444] text-white text-sm font-medium px-6 py-3 rounded-lg hover:bg-[#dc2626] transition-colors"
          >
            Email Support: {SUPPORT_EMAIL}
          </a>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-black/8 bg-white py-6 mt-4">
        <div className="max-w-3xl mx-auto px-6 flex items-center justify-between text-xs text-[#64748b]">
          <span>© 2026 Alignment AI. All rights reserved.</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-[#0a0a0a] transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-[#0a0a0a] transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
