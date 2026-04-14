'use client'

import Link from 'next/link'
import { useState, useEffect, Suspense } from 'react'
import { useLanguage } from '@/lib/LanguageContext'
import LanguageSwitch from '@/components/LanguageSwitch'
import { LogoFull } from '@/components/Logo'
import Footer from '@/components/Footer'
import { useSearchParams } from 'next/navigation'

const faqs = [
  {
    q: 'How quickly will you respond?',
    a: 'We aim to respond to all inquiries within 24 business hours. For urgent matters, please indicate so in your subject line and we\'ll prioritize your request.',
  },
  {
    q: 'Do you offer enterprise plans?',
    a: 'Yes, we offer fully customizable enterprise plans tailored to your organization\'s needs. Select "Enterprise Plan" in the subject dropdown and our team will reach out with custom pricing.',
  },
  {
    q: 'Can I schedule a demo?',
    a: 'Absolutely! Select "General Inquiry" as the subject and mention that you\'d like to schedule a demo in your message. We\'ll coordinate a time that works for you.',
  },
  {
    q: 'Where is your team based?',
    a: 'Our headquarters are in San Francisco, CA, with a distributed team across multiple time zones to ensure we can support clients globally.',
  },
]

const subjectOptions = [
  'General Inquiry',
  'Managed Service Consultation',
  'Enterprise Platform',
  'Partnership',
  'Technical Support',
  'Media & Press',
]

const SUBJECT_PARAM_MAP: Record<string, string> = {
  'managed-service': 'Managed Service Consultation',
  'enterprise-platform': 'Enterprise Platform',
  'partnership': 'Partnership',
  'support': 'Technical Support',
}

function ContactPageInner() {
  const { t } = useLanguage()
  const searchParams = useSearchParams()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState<Record<string, boolean>>({})
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  useEffect(() => {
    const subjectParam = searchParams.get('subject')
    if (subjectParam && SUBJECT_PARAM_MAP[subjectParam]) {
      setSubject(SUBJECT_PARAM_MAP[subjectParam])
    }
  }, [searchParams])

  const navLinks = [
    { label: t.nav.system, href: '/system/' },
    { label: t.nav.technology, href: '/technology/' },
    { label: t.nav.pricing, href: '/pricing/' },
    { label: t.nav.docs, href: '/docs/' },
    { label: t.nav.insights, href: '/insights/' },
    { label: t.nav.contact, href: '/contact/' },
  ]

  const [isSending, setIsSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const newErrors: Record<string, boolean> = {}
    if (!name.trim()) newErrors.name = true
    if (!email.trim()) newErrors.email = true
    if (!message.trim()) newErrors.message = true

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setErrors({})
    setSendError(null)
    setIsSending(true)

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://alignment-backend-production.up.railway.app'
      const resp = await fetch(`${API_BASE}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, company, subject, message }),
      })

      if (!resp.ok) {
        throw new Error('Failed to send')
      }

      setSubmitted(true)
      setName('')
      setEmail('')
      setCompany('')
      setSubject('')
      setMessage('')
      setTimeout(() => setSubmitted(false), 6000)
    } catch {
      setSendError('Failed to send your message. Please try again or email us directly at contact@alignmenttech.ai')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-canvas">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-surface/80 border-b border-divider-light/50">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center group hover:opacity-90 transition-opacity">
              <LogoFull width={140} height={45} />
            </Link>

            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((item, i) => (
                <Link
                  key={i}
                  href={item.href}
                  className={`px-3 py-2 text-sm font-medium transition-colors rounded-lg ${
                    item.href === '/contact/'
                      ? 'text-red-soft bg-red-soft-bg'
                      : 'text-ink-2 hover:text-ink hover:bg-surface-warm'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <LanguageSwitch />
              <Link
                href="/login/"
                className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-ink-inv bg-ink hover:bg-[#2d2d2c] rounded-lg transition-all shadow-sm hover:shadow-md"
              >
                {t.nav.getStarted}
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-canvas" />
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-[#C84B31]/[0.05] rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#C84B31]/[0.05] rounded-full blur-3xl" />

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-surface/80 backdrop-blur border border-divider-light/50 rounded-full shadow-sm mb-8">
            <svg className="w-4 h-4 text-red-soft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="text-sm text-ink-2 font-medium">Contact</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-ink leading-[1.1] mb-6">
            Get in <span className="text-ink underline underline-offset-4 decoration-2">Touch</span>
          </h1>
          <p className="text-lg md:text-xl text-ink-2 max-w-2xl mx-auto leading-relaxed">
            Have questions about GEO? Want to partner with us? We&apos;d love to hear from you.
          </p>
        </div>
      </section>

      {/* Contact Form + Info Cards */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
            {/* Form */}
            <div className="lg:col-span-3">
              <div className="bg-surface rounded-2xl border border-divider-light p-8 shadow-sm">
                <h2 className="text-2xl font-bold text-ink mb-6">Send us a message</h2>

                {subject === 'Managed Service Consultation' && (
                  <div className="mb-6 p-4 bg-red-soft-bg border border-divider-light rounded-xl flex items-start gap-3">
                    <svg className="w-5 h-5 text-red-soft flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    <div>
                      <p className="text-ink font-semibold text-sm">Managed Service Consultation</p>
                      <p className="text-red-soft text-xs mt-0.5">Our GEO experts will reach out within 24 hours to discuss your plan.</p>
                    </div>
                  </div>
                )}

                {subject === 'Enterprise Platform' && (
                  <div className="mb-6 p-4 bg-surface-warm border border-divider rounded-xl flex items-start gap-3">
                    <svg className="w-5 h-5 text-ink-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    <div>
                      <p className="text-ink-2 font-semibold text-sm">Enterprise Platform Inquiry</p>
                      <p className="text-ink-2 text-xs mt-0.5">We&apos;ll follow up with custom pricing and a personalized demo.</p>
                    </div>
                  </div>
                )}

                {submitted && (
                  <div className="mb-6 p-4 bg-sage-bg border border-sage/20 rounded-xl flex items-center gap-3">
                    <svg className="w-5 h-5 text-sage flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sage font-medium">Thank you! We&apos;ll get back to you within 24 hours.</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-ink-2 mb-1.5">
                      Name <span className="text-red-soft">*</span>
                    </label>
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => { setName(e.target.value); setErrors(prev => ({ ...prev, name: false })) }}
                      className={`w-full px-4 py-3 rounded-xl border ${errors.name ? 'border-divider ring-2 ring-ink/10' : 'border-divider'} focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-transparent transition-all`}
                      placeholder="Your full name"
                    />
                    {errors.name && <p className="text-red-soft text-sm mt-1">Name is required</p>}
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-ink-2 mb-1.5">
                      Email <span className="text-red-soft">*</span>
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setErrors(prev => ({ ...prev, email: false })) }}
                      className={`w-full px-4 py-3 rounded-xl border ${errors.email ? 'border-divider ring-2 ring-ink/10' : 'border-divider'} focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-transparent transition-all`}
                      placeholder="you@company.com"
                    />
                    {errors.email && <p className="text-red-soft text-sm mt-1">Email is required</p>}
                  </div>

                  <div>
                    <label htmlFor="company" className="block text-sm font-medium text-ink-2 mb-1.5">
                      Company <span className="text-ink-3 text-xs">(optional)</span>
                    </label>
                    <input
                      id="company"
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-divider focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-transparent transition-all"
                      placeholder="Your company name"
                    />
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-ink-2 mb-1.5">
                      Subject
                    </label>
                    <select
                      id="subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-divider focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-transparent transition-all bg-surface"
                    >
                      <option value="">Select a topic</option>
                      {subjectOptions.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-ink-2 mb-1.5">
                      Message <span className="text-red-soft">*</span>
                    </label>
                    <textarea
                      id="message"
                      rows={4}
                      value={message}
                      onChange={(e) => { setMessage(e.target.value); setErrors(prev => ({ ...prev, message: false })) }}
                      className={`w-full px-4 py-3 rounded-xl border ${errors.message ? 'border-divider ring-2 ring-ink/10' : 'border-divider'} focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-transparent transition-all resize-none`}
                      placeholder="Tell us how we can help..."
                    />
                    {errors.message && <p className="text-red-soft text-sm mt-1">Message is required</p>}
                  </div>

                  {sendError && (
                    <div className="p-3 bg-red-soft-bg border border-divider-light rounded-lg text-sm text-red-soft">
                      {sendError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSending}
                    className="w-full py-3.5 bg-ink hover:bg-[#2d2d2c] disabled:opacity-60 disabled:cursor-not-allowed text-ink-inv font-semibold rounded-xl transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                  >
                    {isSending ? (
                      <>
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        Sending...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        Send Message
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Info Cards */}
            <div className="lg:col-span-2 space-y-5">
              {/* Email */}
              <div className="bg-surface rounded-2xl border border-divider-light p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-red-soft-bg rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-red-soft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-ink mb-1">Email Us</h3>
                    <a href="mailto:contact@alignmenttech.ai" className="text-red-soft hover:text-red-soft transition-colors text-sm font-medium">
                      contact@alignmenttech.ai
                    </a>
                    <p className="text-ink-3 text-sm mt-1">We&apos;ll respond within 24 hours</p>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="bg-surface rounded-2xl border border-divider-light p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-surface-warm rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-ink-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-ink mb-1">Visit Us</h3>
                    <p className="text-ink-2 text-sm font-medium">San Francisco, CA</p>
                    <p className="text-ink-3 text-sm mt-1">United States</p>
                  </div>
                </div>
              </div>

              {/* Social */}
              <div className="bg-surface rounded-2xl border border-divider-light p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-surface-warm rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-ink-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-ink mb-2">Follow Us</h3>
                    <div className="flex items-center gap-3">
                      <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-surface-muted hover:bg-surface-muted rounded-lg flex items-center justify-center transition-colors">
                        <svg className="w-4 h-4 text-ink-2" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                      </a>
                      <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-surface-muted hover:bg-surface-muted rounded-lg flex items-center justify-center transition-colors">
                        <svg className="w-4 h-4 text-ink-2" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                        </svg>
                      </a>
                      <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-surface-muted hover:bg-surface-muted rounded-lg flex items-center justify-center transition-colors">
                        <svg className="w-4 h-4 text-ink-2" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Office Hours */}
              <div className="bg-surface rounded-2xl border border-divider-light p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-sage-bg rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-sage" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-ink mb-1">Office Hours</h3>
                    <p className="text-ink-2 text-sm font-medium">Mon – Fri, 9 AM – 6 PM PST</p>
                    <p className="text-ink-3 text-sm mt-1">Excluding public holidays</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-surface-warm">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-surface border border-divider-light rounded-full text-ink-2 text-sm font-medium mb-6 shadow-sm">
              <svg className="w-4 h-4 text-red-soft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              FAQ
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-ink">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-surface rounded-xl border border-divider-light overflow-hidden transition-shadow hover:shadow-sm">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left"
                >
                  <span className="font-semibold text-ink pr-4">{faq.q}</span>
                  <svg
                    className={`w-5 h-5 text-ink-3 flex-shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-200 ${openFaq === i ? 'max-h-40 pb-5' : 'max-h-0'}`}
                >
                  <p className="px-5 text-ink-2 leading-relaxed">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Map Placeholder */}
      <section className="py-20 bg-canvas">
        <div className="max-w-5xl mx-auto px-6">
          <div className="relative bg-surface-muted rounded-2xl border border-divider-light overflow-hidden h-72 flex items-center justify-center">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: `
                  linear-gradient(rgba(156,163,175,0.3) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(156,163,175,0.3) 1px, transparent 1px)
                `,
                backgroundSize: '40px 40px',
              }} />
            </div>

            <div className="relative text-center">
              <div className="w-16 h-16 bg-red-soft-bg rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-ink mb-1">San Francisco, CA</h3>
              <p className="text-ink-3">United States</p>
            </div>

            <div className="absolute top-6 left-8 w-3 h-3 bg-surface-muted rounded-full" />
            <div className="absolute top-16 right-16 w-2 h-2 bg-surface-muted rounded-full" />
            <div className="absolute bottom-12 left-20 w-2.5 h-2.5 bg-surface-muted rounded-full" />
            <div className="absolute bottom-20 right-32 w-2 h-2 bg-surface-muted rounded-full" />
            <div className="absolute top-24 left-1/3 w-1.5 h-1.5 bg-surface-muted rounded-full" />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-ink">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to get started?
          </h2>
          <p className="text-xl text-ink-3 mb-10 max-w-2xl mx-auto">
            Explore our plans or dive into the documentation to see how Alignment AI can transform your GEO strategy.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/pricing/"
              className="inline-flex items-center justify-center gap-2 bg-ink hover:bg-[#2d2d2c] text-ink-inv font-semibold px-8 py-4 rounded-xl transition-all shadow-sm hover:shadow-md"
            >
              View Pricing
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link
              href="/docs/"
              className="inline-flex items-center justify-center gap-2 bg-ink-inv/10 hover:bg-ink-inv/20 text-white font-semibold px-8 py-4 rounded-xl transition-all border border-white/20"
            >
              Read the Docs
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  )
}

export default function ContactPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-canvas flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-ink border-t-transparent rounded-full" /></div>}>
      <ContactPageInner />
    </Suspense>
  )
}
