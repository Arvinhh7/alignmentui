import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service — Alignment GEO',
  description: 'Terms of Service for the Alignment GEO Shopify app.',
}

const LAST_UPDATED = 'April 5, 2026'
const SUPPORT_EMAIL = 'contact@alignmenttech.ai'
const APP_NAME = 'Alignment GEO'
const COMPANY = 'Alignment AI'

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-canvas text-ink">
      {/* Header */}
      <div className="border-b border-divider-light bg-surface">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold text-ink hover:text-ink-2 transition-colors">
            ← Alignment AI
          </Link>
          <span className="text-xs text-ink-3">Last updated: {LAST_UPDATED}</span>
        </div>
      </div>

      {/* Content */}
      <article className="max-w-5xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-ink-3 mb-10">
          Please read these Terms of Service (&ldquo;Terms&rdquo;) carefully before using the{' '}
          <strong>{APP_NAME}</strong> Shopify application operated by <strong>{COMPANY}</strong>{' '}
          (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;). By installing or using {APP_NAME},
          you agree to be bound by these Terms.
        </p>

        <Section title="1. Description of Service">
          <p>
            {APP_NAME} is a Shopify embedded application that helps merchants make their online stores
            discoverable by AI-powered search platforms including ChatGPT, Perplexity, Claude, Gemini,
            and others. The app generates machine-readable brand profiles (<code className="bg-black/5 px-1 rounded">llms.txt</code>,{' '}
            <code className="bg-black/5 px-1 rounded">agent.json</code>), injects structured data (JSON-LD schema markup) into
            your storefront, optimizes your <code className="bg-black/5 px-1 rounded">robots.txt</code> for AI crawlers, and
            provides analytics on AI bot visits and AI-driven referral traffic.
          </p>
        </Section>

        <Section title="2. Eligibility and Account">
          <ul>
            <li>You must have an active Shopify store to use {APP_NAME}.</li>
            <li>You must be at least 18 years old and have legal authority to enter into agreements on behalf of your business.</li>
            <li>You are responsible for maintaining the security of your Shopify account credentials.</li>
            <li>One installation per Shopify store. Sharing access credentials is not permitted.</li>
          </ul>
        </Section>

        <Section title="3. Subscription Plans and Billing">
          <Subsection title="3.1 Plans">
            <p>{APP_NAME} offers three subscription tiers:</p>
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-sm border border-divider-light rounded-lg overflow-hidden">
                <thead className="bg-black/5">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Plan</th>
                    <th className="text-left px-4 py-2 font-medium">Price</th>
                    <th className="text-left px-4 py-2 font-medium">Key Limits</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-divider-light">
                    <td className="px-4 py-2">Free</td>
                    <td className="px-4 py-2">$0/month</td>
                    <td className="px-4 py-2">5 FAQ pairs, 10 products, AI Score up to 45/100</td>
                  </tr>
                  <tr className="border-t border-divider-light bg-surface">
                    <td className="px-4 py-2">Growth</td>
                    <td className="px-4 py-2">$49/month</td>
                    <td className="px-4 py-2">50 FAQ pairs, 100 products, 5,000 reviews, full 100/100 Score, llms.txt &amp; agent.json endpoints</td>
                  </tr>
                  <tr className="border-t border-divider-light">
                    <td className="px-4 py-2">Enterprise</td>
                    <td className="px-4 py-2">$99/month</td>
                    <td className="px-4 py-2">200 FAQ pairs, 500 products, 25,000 reviews, priority support</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Subsection>

          <Subsection title="3.2 Billing Cycle">
            <p>Paid subscriptions are billed every 30 days through Shopify&apos;s standard billing system. All charges appear on your Shopify bill.</p>
          </Subsection>

          <Subsection title="3.3 Upgrades and Downgrades">
            <p>You may upgrade or downgrade your plan at any time from the Plans &amp; Pricing page within the app. Changes take effect at the start of your next billing cycle for downgrades, and immediately for upgrades (prorated).</p>
          </Subsection>

          <Subsection title="3.4 Cancellation and Refunds">
            <p>You may cancel your subscription at any time by uninstalling the app or downgrading to the Free plan. We do not offer refunds for partial billing periods unless required by applicable law.</p>
          </Subsection>
        </Section>

        <Section title="4. Acceptable Use">
          <p>You agree not to use {APP_NAME} to:</p>
          <ul>
            <li>Provide false, misleading, or deceptive brand information intended to deceive AI platforms or consumers.</li>
            <li>Violate any applicable laws, Shopify&apos;s Partner Program policies, or the terms of service of any AI platform.</li>
            <li>Attempt to reverse-engineer, decompile, or extract proprietary algorithms or source code from the app.</li>
            <li>Use the app in a manner that places excessive load on our infrastructure or Shopify&apos;s API.</li>
            <li>Resell, sublicense, or make the app available to third parties without our written consent.</li>
          </ul>
        </Section>

        <Section title="5. Intellectual Property">
          <Subsection title="5.1 Your Content">
            <p>You retain all ownership rights to the brand data, product information, FAQ content, and other materials you enter into the app (&ldquo;Your Content&rdquo;). You grant {COMPANY} a limited, non-exclusive license to process and serve Your Content solely for the purpose of providing the app&apos;s services.</p>
          </Subsection>

          <Subsection title="5.2 Our IP">
            <p>The {APP_NAME} application, its code, design, features, and documentation are the intellectual property of {COMPANY}. Nothing in these Terms transfers ownership of our intellectual property to you.</p>
          </Subsection>
        </Section>

        <Section title="6. Analytics and Data">
          <Subsection title="6.1 AI Traffic Analytics">
            <p>The app tracks AI bot visits to your store&apos;s AI profile endpoints and human visitors referred from AI platforms. <strong>Analytics data appears once AI bots start visiting your store.</strong> A fresh install will show zero data — this is expected and normal behavior. Most stores see their first AI bot visits within 24–72 hours of completing setup.</p>
          </Subsection>

          <Subsection title="6.2 Data Accuracy">
            <p>We track AI bot activity based on user-agent signatures. We monitor 20+ major AI platforms including ChatGPT, Perplexity, Claude, Gemini, and others. Bot detection accuracy depends on AI platforms providing identifiable user agents, which is standard industry practice but not guaranteed for all platforms or crawlers.</p>
          </Subsection>
        </Section>

        <Section title="7. Third-Party Services">
          <p>{APP_NAME} integrates with Shopify&apos;s platform and may log visits from AI platforms operated by third parties (OpenAI, Anthropic, Google, Perplexity, and others). We are not affiliated with, endorsed by, or in any way officially connected with these third-party AI platforms. AI platform behavior — including whether and how often they crawl your store — is outside our control.</p>
        </Section>

        <Section title="8. Disclaimers and Limitation of Liability">
          <Subsection title="8.1 No Guarantee of AI Rankings">
            <p>{APP_NAME} provides the technical infrastructure for AI discoverability, but we cannot guarantee that any specific AI platform will crawl your store, cite your brand, or recommend your products in its responses. AI platform behavior is determined solely by those platforms.</p>
          </Subsection>

          <Subsection title="8.2 &quot;As Is&quot; Service">
            <p>The service is provided &ldquo;as is&rdquo; without warranties of any kind. We do not warrant that the service will be uninterrupted, error-free, or that any specific AI platform will discover your store within any particular timeframe.</p>
          </Subsection>

          <Subsection title="8.3 Limitation of Liability">
            <p>To the maximum extent permitted by law, {COMPANY}&apos;s total liability to you for any claims arising from your use of {APP_NAME} shall not exceed the amount you paid for the app in the three (3) months preceding the claim.</p>
          </Subsection>
        </Section>

        <Section title="9. Termination">
          <p>Either party may terminate these Terms at any time. You may terminate by uninstalling the app. We may terminate or suspend access to the app if you violate these Terms, with or without notice.</p>
          <p className="mt-2">Upon termination, your data will be deleted in accordance with our Privacy Policy.</p>
        </Section>

        <Section title="10. Changes to Terms">
          <p>We reserve the right to modify these Terms at any time. We will notify you of material changes by posting a notice in the app at least 14 days before they take effect. Continued use of the app after the effective date constitutes acceptance of the updated Terms.</p>
        </Section>

        <Section title="11. Governing Law">
          <p>These Terms are governed by the laws of the State of California, USA, without regard to conflict of law principles. Any disputes shall be resolved in the state or federal courts located in Santa Clara County, California, and you consent to the personal jurisdiction of such courts.</p>
        </Section>

        <Section title="12. Contact Us">
          <div className="bg-surface border border-divider-light rounded-xl p-5 text-sm space-y-1">
            <p><strong>Alignment AI</strong></p>
            <p>Support: <a href={`mailto:${SUPPORT_EMAIL}`} className="text-ink font-medium hover:underline">{SUPPORT_EMAIL}</a></p>
            <p>Help Center: <a href="https://alignmenttech.ai/help" className="text-ink font-medium hover:underline">alignmenttech.ai/help</a></p>
          </div>
        </Section>
      </article>

      {/* Footer */}
      <footer className="border-t border-divider-light bg-surface py-6 mt-8">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between text-xs text-ink-3">
          <span>© 2026 Alignment AI. All rights reserved.</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-ink transition-colors">Privacy Policy</Link>
            <Link href="/help" className="hover:text-ink transition-colors">Help Center</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-divider-light">{title}</h2>
      <div className="space-y-3 text-[0.93rem] leading-relaxed text-ink">{children}</div>
    </section>
  )
}

function Subsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h3 className="text-base font-medium mb-2 text-ink">{title}</h3>
      <div className="space-y-2 text-[0.93rem] leading-relaxed text-ink">{children}</div>
    </div>
  )
}
