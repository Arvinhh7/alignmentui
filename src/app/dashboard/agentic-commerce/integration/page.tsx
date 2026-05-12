"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

type Role = "brand" | "consumer" | "protocol";

// ─────────────────────────────────────────────────────────────────────────────
// API skill data — small, declarative. Each role is presented as ONE coherent
// API surface (the "skill"), not a multi-step tutorial with code dumps.
// ─────────────────────────────────────────────────────────────────────────────

type Endpoint = { method: string; path: string; purpose: string };

const BRAND_SKILL = {
  emoji:    "🏪",
  title:    "Brand Agent API",
  oneLine:  "Expose your catalog once. Every Consumer Agent finds you.",
  body:     "Two endpoints + one discovery file. The Alignment Broker fans out incoming Consumer Agent queries to your /v1/quote, ranks the responses, and routes the winner to /v1/commit. Built on MCP — your handlers run as standard MCP tools.",
  endpoints: [
    { method: "GET",  path: "/.well-known/agent.json", purpose: "Discovery doc — Broker auto-fetches at registration" },
    { method: "POST", path: "/v1/quote",                purpose: "Live price + inventory · p95 ≤ 800 ms" },
    { method: "POST", path: "/v1/commit",               purpose: "Atomic order confirmation · p95 ≤ 3 s" },
    { method: "POST", path: "/v1/cancel",               purpose: "Refund / void (optional)" },
  ] as Endpoint[],
  auth:     "Broker→Brand calls signed with `broker_key` (assigned at registration). Brand→Broker uses an Ed25519 key declared in `.well-known/agent.json`.",
  pricing:  "Pay only on cleared transactions · default 8% (negotiable 5–15% at registration) · settled T+7 via Stripe Connect.",
};

const CONSUMER_SKILL = {
  emoji:    "📱",
  title:    "Consumer Agent API",
  oneLine:  "One API call → ranked quotes from every brand on the network.",
  body:     "From your WhatsApp bot, phone-OS agent, voice app, or vertical shopper, query the Broker with a structured intent. The Broker fans out to all eligible Brand Agents in parallel and returns ranked, signed, time-boxed quotes. Pick one, commit, done.",
  endpoints: [
    { method: "POST", path: "/v1/agents/consumer/register", purpose: "Register your Consumer Agent · returns api_key" },
    { method: "POST", path: "/v1/broker/query",             purpose: "Send intent → ranked quotes (200–600 ms p95)" },
    { method: "POST", path: "/v1/broker/commit",            purpose: "Confirm a quote → atomic transaction" },
    { method: "GET",  path: "/v1/broker/query/{query_id}",  purpose: "Replay a past query (audit / debug)" },
  ] as Endpoint[],
  auth:     "Bearer `api_key` (from register endpoint) in `Authorization` header. All payloads JSON.",
  pricing:  "Free to call. Optional 1–3% referral fee on every cleared transaction you originate, paid T+7 via Stripe Connect.",
};

const PROTOCOL_SKILL = {
  emoji:    "📖",
  title:    "Alignment Broker Protocol v0.1",
  oneLine:  "Open MCP-based Commerce Extension. Implement the spec, you're connected.",
  body:     "Identity → Query → Quote → Commit → Settlement. Transparent 5-factor ranking. No paid placement. No hidden levers. Brand Agents cannot pay to rank higher — the Broker's only revenue is the per-transaction commission declared at registration. This is the protocol's central trust commitment.",
  endpoints: [],
  auth:     "DID-style identities. Ed25519 request signing. 30-second nonce window.",
  pricing:  "Open spec, public docs. Fork it, implement it. No license fee.",
};

const SKILLS: Record<Role, typeof BRAND_SKILL> = {
  brand:    BRAND_SKILL,
  consumer: CONSUMER_SKILL,
  protocol: PROTOCOL_SKILL,
};

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function IntegrationPage() {
  const params = useSearchParams();
  const initialRole = (params?.get("role") as Role) || "brand";
  const [role, setRole] = useState<Role>(initialRole);

  useEffect(() => {
    const r = params?.get("role") as Role;
    if (r) setRole(r);
  }, [params]);

  const skill = SKILLS[role];

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-ink">Integration</h1>
        <p className="text-ink-2 text-sm mt-1">
          One open MCP-based protocol. Three API surfaces. Pick yours.
        </p>
      </div>

      {/* ── Role tabs ─────────────────────────────────────────────── */}
      <div className="inline-flex bg-surface-muted p-1 rounded-xl border border-divider">
        {([
          { id: "brand",    label: "🏪 Brand Agent API",    sub: "I'm a merchant"           },
          { id: "consumer", label: "📱 Consumer Agent API", sub: "I build shopping agents"  },
          { id: "protocol", label: "📖 Protocol Spec",      sub: "I'm reading the standard" },
        ] as { id: Role; label: string; sub: string }[]).map((r) => (
          <button
            key={r.id}
            onClick={() => setRole(r.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all text-left ${
              role === r.id ? "bg-ink text-ink-inv shadow-sm" : "text-ink-2 hover:text-ink"
            }`}
          >
            <div>{r.label}</div>
            <div className={`text-[10px] ${role === r.id ? "text-white/60" : "text-ink-3"}`}>{r.sub}</div>
          </button>
        ))}
      </div>

      {/* ── Skill card ────────────────────────────────────────────── */}
      <section className="bg-surface border border-divider rounded-2xl p-6 space-y-5">
        {/* Skill header */}
        <div className="flex items-start gap-4">
          <div className="text-4xl leading-none">{skill.emoji}</div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-ink">{skill.title}</h2>
            <p className="text-purple-700 text-sm font-medium mt-0.5">{skill.oneLine}</p>
            <p className="text-ink-2 text-sm mt-3 leading-relaxed max-w-3xl">{skill.body}</p>
          </div>
        </div>

        {/* Endpoints table (skipped for Protocol view since it's all in spec doc) */}
        {skill.endpoints.length > 0 && (
          <div>
            <h3 className="text-xs font-mono uppercase tracking-wider text-ink-3 mb-2">Endpoints</h3>
            <div className="border border-divider rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-surface-muted text-ink-3 border-b border-divider">
                    <th className="px-3 py-2 text-left font-medium w-16">Method</th>
                    <th className="px-3 py-2 text-left font-medium">Path</th>
                    <th className="px-3 py-2 text-left font-medium">Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  {skill.endpoints.map((e) => (
                    <tr key={e.path} className="border-b border-divider last:border-b-0">
                      <td className="px-3 py-2">
                        <span className={`font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          e.method === "GET"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}>
                          {e.method}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-ink">{e.path}</td>
                      <td className="px-3 py-2 text-ink-2">{e.purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Auth + Pricing two-up */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-surface-muted border border-divider rounded-xl p-4 space-y-1.5">
            <h3 className="text-xs font-mono uppercase tracking-wider text-ink-3">Authentication</h3>
            <p className="text-xs text-ink-2 leading-relaxed">{skill.auth}</p>
          </div>
          <div className="bg-surface-muted border border-divider rounded-xl p-4 space-y-1.5">
            <h3 className="text-xs font-mono uppercase tracking-wider text-ink-3">
              {role === "protocol" ? "Licensing" : "Compensation"}
            </h3>
            <p className="text-xs text-ink-2 leading-relaxed">{skill.pricing}</p>
          </div>
        </div>

        {/* Role-specific footer (form / contact / spec links) */}
        {role === "brand"    && <BrandFooter />}
        {role === "consumer" && <ConsumerFooter />}
        {role === "protocol" && <ProtocolFooter />}
      </section>

      {/* ── SDK / Resources ───────────────────────────────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <ResourceCard
          title="SDK · TypeScript"
          line="@alignment-ai/broker-protocol"
          sub="npm install · ESM + CJS · 5 KB gzipped"
          href="https://www.npmjs.com/package/@alignment-ai/broker-protocol"
        />
        <ResourceCard
          title="Protocol Spec"
          line="PROTOCOL_v0.1.md"
          sub="Full wire format · §1–§13 + RFC v0.2"
          href="https://github.com/Alignment-GEOAI/alignment-workspace/blob/main/01-Alignment-Product/docs/agentic-commerce/PROTOCOL_v0.1.md"
        />
        <ResourceCard
          title="Concept doc"
          line="LAYER_3_AGENTIC_COMMERCE_CONCEPT_v1.md"
          sub="Inner / Outer Ring · canonical terminology"
          href="https://github.com/Alignment-GEOAI/alignment-workspace/blob/main/08-Alignment-Agentic%20Commerce/LAYER_3_AGENTIC_COMMERCE_CONCEPT_v1.md"
        />
      </section>
    </div>
  );
}

// ─── Role-specific footer sub-components ─────────────────────────────────────

function BrandFooter() {
  return (
    <div className="space-y-3 pt-1">
      <h3 className="text-xs font-mono uppercase tracking-wider text-ink-3">Register your Brand Agent</h3>
      <p className="text-xs text-ink-2">
        Submit your agent_id + well-known URL. The Broker probes your endpoints, validates the
        schema, and assigns a trust level within ~60 seconds.
      </p>
      <BrandRegisterForm />
    </div>
  );
}

function ConsumerFooter() {
  return (
    <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-xs text-ink-2 space-y-1.5">
      <h3 className="font-semibold text-ink">Need an API key?</h3>
      <p>
        Consumer Agent registration is currently invite-only during the v0.1 protocol period.
        Email{" "}
        <a href="mailto:agents@alignmenttech.ai" className="text-purple-600 font-medium">
          agents@alignmenttech.ai
        </a>{" "}
        with your operator info and the surface you build on (WhatsApp / phone OS / voice / vertical app).
      </p>
    </div>
  );
}

function ProtocolFooter() {
  return (
    <div className="space-y-3 pt-1">
      <h3 className="text-xs font-mono uppercase tracking-wider text-ink-3">5-factor ranking — transparent</h3>
      <div className="bg-[#1a1a1a] rounded-xl p-3 text-xs text-white/80 font-mono leading-relaxed">
        broker_score = 0.30 × price_match<br />
        {"             "}+ 0.25 × trust<br />
        {"             "}+ 0.20 × semantic_match<br />
        {"             "}+ 0.15 × eta<br />
        {"             "}+ 0.10 × inventory
      </div>
      <p className="text-xs text-ink-3">
        Brand Agents cannot pay to rank higher. The Broker's only revenue is the per-transaction
        commission declared at registration.
      </p>
    </div>
  );
}

// ─── Shared sub-components ───────────────────────────────────────────────────

function ResourceCard({ title, line, sub, href }: { title: string; line: string; sub: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="bg-surface border border-divider hover:border-purple-300 rounded-xl p-4 space-y-1 transition-colors block"
    >
      <div className="font-mono uppercase tracking-wider text-[10px] text-ink-3">{title}</div>
      <div className="font-semibold text-ink text-sm font-mono">{line}</div>
      <div className="text-ink-3 text-[11px]">{sub}</div>
      <div className="text-purple-600 text-xs mt-1">Open →</div>
    </a>
  );
}

// ─── Brand Register Form (carried over, unchanged behaviour, /brand URL) ─────

function BrandRegisterForm() {
  const [form, setForm] = useState({
    brand_id: "",
    name: "",
    well_known: "",
    categories: "",
    commission_rate: "0.08",
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/agentic-commerce/brand/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_id: form.brand_id,
          name: form.name,
          tagline: form.well_known,
          categories: form.categories.split(",").map((s) => s.trim()).filter(Boolean),
          trust_level: "standard",
          commission_rate: parseFloat(form.commission_rate),
          avg_price: 25,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ ok: true, msg: `Brand "${data.brand_id}" registered. Broker will probe your endpoints within 60s.` });
        setForm({ brand_id: "", name: "", well_known: "", categories: "", commission_rate: "0.08" });
      } else {
        setResult({ ok: false, msg: data.detail || "Registration failed" });
      }
    } catch {
      setResult({ ok: false, msg: "Network error — is the Broker reachable?" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-surface-muted border border-divider rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[
          { key: "brand_id",        label: "Brand ID",        ph: "yourbrand (lowercase, hyphens)" },
          { key: "name",            label: "Display name",    ph: "Your Brand Inc." },
          { key: "well_known",      label: ".well-known URL", ph: "https://yourbrand.com/.well-known/agent.json", colspan: true },
          { key: "categories",      label: "Categories",      ph: "footwear, apparel" },
          { key: "commission_rate", label: "Commission rate", ph: "0.08 = 8%" },
        ].map((f) => (
          <div key={f.key} className={`space-y-1 ${f.colspan ? "md:col-span-2" : ""}`}>
            <label className="text-xs text-ink-3">{f.label}</label>
            <input
              value={(form as Record<string, string>)[f.key]}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              placeholder={f.ph}
              className="w-full text-sm border border-divider rounded-lg px-3 py-2 bg-surface focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting || !form.brand_id || !form.name}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {submitting ? "Submitting…" : "Register Brand Agent"}
        </button>
        {result && (
          <span className={`text-xs ${result.ok ? "text-green-600" : "text-red-600"}`}>
            {result.ok ? "✓ " : "✗ "}{result.msg}
          </span>
        )}
      </div>
    </form>
  );
}

// Suppress lint: API_BASE is used inside form
void API_BASE;
