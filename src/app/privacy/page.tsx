import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy — Alignment GEO',
  description: 'Privacy Policy for the Alignment GEO Shopify app.',
}

const LAST_UPDATED = 'April 5, 2026'
const CONTACT_EMAIL = 'contact@alignmenttech.ai'
const APP_NAME = 'Alignment GEO'
const COMPANY = 'Alignment AI'

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#fafafa] text-[#0a0a0a]">
      {/* Header */}
      <div className="border-b border-black/8 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold text-[#ef4444] hover:opacity-80 transition-opacity">
            ← Alignment AI
          </Link>
          <span className="text-xs text-[#64748b]">Last updated: {LAST_UPDATED}</span>
        </div>
      </div>

      {/* Content */}
      <article className="max-w-5xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-[#64748b] mb-10">
          This Privacy Policy describes how <strong>{COMPANY}</strong> (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) collects,
          uses, and protects information when you use the <strong>{APP_NAME}</strong> Shopify application.
        </p>

        <Section title="1. Information We Collect">
          <Subsection title="1.1 Merchant Data (provided by you)">
            <p>When you use {APP_NAME}, you provide us with brand and store information that we store to power the app&apos;s features:</p>
            <ul>
              <li><strong>Brand identity data</strong> — brand name, tagline, description, logo URL, contact email, phone number, address, and social media handles.</li>
              <li><strong>Product and service data</strong> — product names, descriptions, prices, URLs, and category information.</li>
              <li><strong>FAQ knowledge</strong> — question and answer pairs you write to educate AI platforms about your brand.</li>
              <li><strong>Trust &amp; Authority data</strong> — founding year, employee count, certifications, awards, and media mentions.</li>
              <li><strong>Competitive positioning</strong> — your unique value proposition and competitive advantages.</li>
              <li><strong>Imported reviews</strong> — if you use the Review Import feature, we store reviewer names, emails (optional), ratings, review text, and review dates from your uploaded CSV file.</li>
            </ul>
            <p className="mt-2 text-[#64748b] text-sm">All merchant-provided data is stored as Shopify metafields in your store (namespace: <code className="bg-black/5 px-1 rounded">alignment_geo</code>) and in our secure database.</p>
          </Subsection>

          <Subsection title="1.2 Automatically Collected Data">
            <p>The app automatically collects the following operational data:</p>
            <ul>
              <li><strong>AI bot visit logs</strong> — when an AI platform (such as GPTBot, ClaudeBot, or PerplexityBot) visits your store&apos;s <code className="bg-black/5 px-1 rounded">llms.txt</code> or <code className="bg-black/5 px-1 rounded">agent.json</code> endpoint, we log: the bot name, user-agent string (truncated to 512 characters), the endpoint accessed, and the timestamp. No visitor personal data is collected.</li>
              <li><strong>AI referral logs</strong> — when a human visitor arrives at your store from an AI platform (e.g., via a ChatGPT recommendation), our Theme Extension logs: the referring domain, the full referrer URL (truncated to 512 characters), and the landing page URL.</li>
            </ul>
          </Subsection>

          <Subsection title="1.3 Shopify Account Data">
            <p>During installation and authentication, Shopify provides us with:</p>
            <ul>
              <li>Your shop domain (e.g., <code className="bg-black/5 px-1 rounded">yourstore.myshopify.com</code>)</li>
              <li>Your shop&apos;s public information (store name, URL, email address)</li>
              <li>An access token to make authorized API calls on your behalf</li>
            </ul>
          </Subsection>
        </Section>

        <Section title="2. How We Use Your Information">
          <ul>
            <li><strong>Power app features</strong> — We use merchant-provided data to generate your <code className="bg-black/5 px-1 rounded">llms.txt</code> brand profile, <code className="bg-black/5 px-1 rounded">agent.json</code> discovery file, and structured data (JSON-LD schema markup) that AI platforms read.</li>
            <li><strong>AI Traffic Analytics</strong> — We use bot visit logs and referral logs to display analytics in your dashboard. Data appears once AI bots start visiting your store — new installs show zero data, which is expected and normal.</li>
            <li><strong>App functionality</strong> — Access tokens are used solely to read and write Shopify metafields, manage your store&apos;s theme files (for robots.txt optimization), and read product data on your behalf.</li>
            <li><strong>Service improvement</strong> — Aggregated, anonymized data may be used to improve the app. We never identify individual merchants in aggregate analysis.</li>
          </ul>
        </Section>

        <Section title="3. Data Sharing and Disclosure">
          <p>We do <strong>not</strong> sell, rent, or share your personal data or your customers&apos; data with third parties for marketing purposes.</p>
          <p className="mt-2">We may share data only in the following limited circumstances:</p>
          <ul>
            <li><strong>Service providers</strong> — We use Railway (hosting), PostgreSQL database providers, and Cloudflare for infrastructure. These providers access data only as necessary to provide their services and are bound by confidentiality obligations.</li>
            <li><strong>Legal requirements</strong> — We may disclose data if required by law, court order, or to protect the rights and safety of our users.</li>
            <li><strong>Business transfer</strong> — In the event of a merger or acquisition, data may be transferred as a business asset. We will notify affected merchants before any such transfer.</li>
          </ul>
        </Section>

        <Section title="4. Data Retention and Deletion">
          <ul>
            <li><strong>Active install</strong> — Data is retained for the duration of your app subscription to power the app&apos;s features.</li>
            <li><strong>On uninstall</strong> — When you uninstall {APP_NAME}, we immediately delete your session tokens, AI visit logs, AI referral logs, and shop configuration data.</li>
            <li><strong>48-hour purge</strong> — Shopify sends us a <code className="bg-black/5 px-1 rounded">shop/redact</code> webhook 48 hours after uninstall. At that point we permanently delete all remaining data associated with your shop, including any imported reviews.</li>
            <li><strong>Customer data requests</strong> — If one of your customers submits a GDPR data request via Shopify, we respond by identifying any imported reviews associated with their email address.</li>
            <li><strong>Customer data erasure</strong> — If one of your customers requests erasure of their data, we anonymize their name and email in any imported reviews (review text and ratings are retained as aggregate data to preserve review statistics).</li>
          </ul>
        </Section>

        <Section title="5. Your Rights (GDPR / CCPA)">
          <p>Depending on your location, you may have the following rights regarding your personal data:</p>
          <ul>
            <li><strong>Right to access</strong> — Request a copy of the data we hold about your store.</li>
            <li><strong>Right to rectification</strong> — Correct inaccurate data (edit directly in the app or contact us).</li>
            <li><strong>Right to erasure</strong> — Uninstalling the app triggers full data deletion within 48 hours.</li>
            <li><strong>Right to portability</strong> — All your brand data is available as JSON within the app.</li>
            <li><strong>Right to object</strong> — You can stop data collection at any time by uninstalling the app.</li>
          </ul>
          <p className="mt-2">To exercise these rights, contact us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#ef4444] hover:underline">{CONTACT_EMAIL}</a>.</p>
        </Section>

        <Section title="6. Cookies and Tracking">
          <p>{APP_NAME} is a Shopify embedded app that runs inside your Shopify admin. We do not use third-party cookies or tracking pixels. The Theme Extension script we inject into your storefront tracks AI referral sessions using the <code className="bg-black/5 px-1 rounded">document.referrer</code> browser API — no cookies are set.</p>
        </Section>

        <Section title="7. Security">
          <p>We implement industry-standard security measures including:</p>
          <ul>
            <li>All data transmitted over HTTPS / TLS 1.2+</li>
            <li>Shopify webhook HMAC signature verification on all incoming webhooks</li>
            <li>Database access restricted to our application servers</li>
            <li>Access tokens stored encrypted and never logged</li>
          </ul>
        </Section>

        <Section title="8. Children's Privacy">
          <p>{APP_NAME} is a business tool designed for Shopify merchants. We do not knowingly collect personal information from individuals under the age of 18.</p>
        </Section>

        <Section title="9. Changes to This Policy">
          <p>We may update this Privacy Policy from time to time. We will notify merchants of material changes by posting a notice in the app at least 14 days before changes take effect. Continued use of the app after the effective date constitutes acceptance of the updated policy.</p>
        </Section>

        <Section title="10. Contact Us">
          <p>For privacy questions, data requests, or concerns, contact us:</p>
          <div className="mt-3 bg-white border border-black/8 rounded-xl p-5 text-sm space-y-1">
            <p><strong>Alignment AI</strong></p>
            <p>Email: <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#ef4444] hover:underline">{CONTACT_EMAIL}</a></p>
            <p>App Support: <a href="https://alignmenttech.ai/help" className="text-[#ef4444] hover:underline">alignmenttech.ai/help</a></p>
          </div>
        </Section>
      </article>

      {/* Footer */}
      <footer className="border-t border-black/8 bg-white py-6 mt-8">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between text-xs text-[#64748b]">
          <span>© 2026 Alignment AI. All rights reserved.</span>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-[#0a0a0a] transition-colors">Terms of Service</Link>
            <Link href="/help" className="hover:text-[#0a0a0a] transition-colors">Help Center</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-black/8">{title}</h2>
      <div className="space-y-3 text-[0.93rem] leading-relaxed text-[#1e293b]">{children}</div>
    </section>
  )
}

function Subsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h3 className="text-base font-medium mb-2 text-[#0a0a0a]">{title}</h3>
      <div className="space-y-2 text-[0.93rem] leading-relaxed text-[#1e293b]">
        {children}
      </div>
    </div>
  )
}
