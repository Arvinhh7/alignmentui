"use client";

import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

const actors = [
  {
    icon: "🤖",
    title: "Consumer Agent",
    subtitle: "Your AI shopping assistant",
    desc: "Claude / ChatGPT / Gemini — issues shopping intents on behalf of users",
    color: "from-blue-500 to-blue-600",
  },
  {
    icon: "⚡",
    title: "Alignment Broker",
    subtitle: "The recommendation engine",
    desc: "Queries all brand agents in parallel → 5-factor ranking → transparent recommendation",
    color: "from-purple-500 to-purple-700",
  },
  {
    icon: "🏪",
    title: "Enterprise Agent × N",
    subtitle: "Brand AI agents",
    desc: "One LLM agent per brand, hosted on Alignment, responding to live queries in real time",
    color: "from-emerald-500 to-emerald-600",
  },
];

const pages = [
  {
    href: "/dashboard/agentic-commerce/demo",
    icon: "🛒",
    title: "Consumer Demo",
    desc: "Enter a shopping intent and watch the Broker rank all brand agents live",
    color: "bg-emerald-600 hover:bg-emerald-500",
  },
  {
    href: "/dashboard/agentic-commerce/console",
    icon: "📊",
    title: "Brand Console",
    desc: "Live discovery events, agent breakdown, and product catalog per brand",
    color: "bg-purple-600 hover:bg-purple-500",
  },
  {
    href: "/dashboard/agentic-commerce/billing",
    icon: "💰",
    title: "Billing Dashboard",
    desc: "GMV, commission attribution, and per-brand transaction history",
    color: "bg-yellow-600 hover:bg-yellow-500",
  },
  {
    href: "/dashboard/agentic-commerce/platform",
    icon: "🏗️",
    title: "Platform Admin",
    desc: "Register new brand agents, view cross-brand KPIs",
    color: "bg-slate-600 hover:bg-slate-500",
  },
];

export default function AgenticCommercePage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-ink">Agentic Commerce</h1>
        <p className="text-ink-2 mt-1">
          Three-actor transaction platform: Consumer Agent ←{" "}
          <span className="text-purple-600 font-semibold">Alignment Broker</span>{" "}
          ← Enterprise Agent × N
        </p>
      </div>

      {/* Architecture */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-ink-3 uppercase tracking-wider">Architecture</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {actors.map((a, i) => (
            <div key={i} className="bg-surface border border-divider rounded-2xl p-5 space-y-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${a.color} flex items-center justify-center text-xl`}>
                {a.icon}
              </div>
              <div>
                <div className="font-semibold text-ink text-sm">{a.title}</div>
                <div className="text-purple-600 text-xs">{a.subtitle}</div>
              </div>
              <p className="text-ink-2 text-xs leading-relaxed">{a.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Navigation */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-ink-3 uppercase tracking-wider">Modules</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {pages.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className="bg-surface border border-divider rounded-2xl p-5 flex items-start gap-4 hover:border-purple-300 transition-colors group"
            >
              <span className="text-2xl mt-0.5">{p.icon}</span>
              <div>
                <div className="font-semibold text-ink text-sm group-hover:text-purple-700 transition-colors">
                  {p.title}
                </div>
                <p className="text-ink-2 text-xs mt-1 leading-relaxed">{p.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Quick API link */}
      <section className="text-xs text-ink-3">
        Backend health:{" "}
        <a
          href={`${API_BASE}/api/agentic-commerce/enterprise/brands`}
          target="_blank"
          rel="noreferrer"
          className="text-purple-600 hover:underline"
        >
          /api/agentic-commerce/enterprise/brands
        </a>
      </section>
    </div>
  );
}
