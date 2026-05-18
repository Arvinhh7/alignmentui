"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
const SANDBOX_KEY      = "ak_sandbox_DEMO_alignment_2026";
const SANDBOX_AGENT_ID = "did:alignment:sandbox:demo-1";
const NPM_PKG          = "@alignment_agents/broker-protocol";

type Role = "brand" | "consumer" | "protocol";

// ─────────────────────────────────────────────────────────────────────────────
//  Page
// ─────────────────────────────────────────────────────────────────────────────

export default function IntegrationPage() {
  const params = useSearchParams();
  const initialRole = (params?.get("role") as Role) || "consumer";
  const [role, setRole] = useState<Role>(initialRole);

  useEffect(() => {
    const r = params?.get("role") as Role;
    if (r) setRole(r);
  }, [params]);

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-ink">Integration</h1>
        <p className="text-ink-2 text-sm mt-1">
          One open MCP-based protocol. Three audiences. Each gets the answer they need first.
        </p>
      </div>

      {/* ── Role tabs ─────────────────────────────────────────── */}
      <div className="inline-flex bg-surface-muted p-1 rounded-xl border border-divider">
        {(
          [
            { id: "consumer", label: "📱 Consumer Agent",  sub: "I build shopping agents"  },
            { id: "brand",    label: "🏪 Brand Agent",     sub: "I'm a merchant"           },
            { id: "protocol", label: "📖 Protocol Spec",   sub: "I'm an LLM / engineer"    },
          ] as { id: Role; label: string; sub: string }[]
        ).map((r) => (
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

      {/* ── Role-specific content ─────────────────────────────── */}
      {role === "consumer" && <ConsumerView />}
      {role === "brand"    && <BrandView />}
      {role === "protocol" && <ProtocolView />}

      {/* ── Shared resources footer ───────────────────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <ResourceCard
          title="SDK · TypeScript"
          line={NPM_PKG}
          sub="npm install · ESM + CJS · 5 KB gzipped"
          href={`https://www.npmjs.com/package/${NPM_PKG}`}
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

// ═════════════════════════════════════════════════════════════════════════════
//  CONSUMER AGENT — Quick Start hero + Reference
// ═════════════════════════════════════════════════════════════════════════════

function ConsumerView() {
  const installCmd = `npm install ${NPM_PKG}`;

  const quickstartCode = `import { AlignmentBroker } from "${NPM_PKG}";

// 1. Initialize with sandbox key (rate-limited, no signup needed)
const broker = new AlignmentBroker({
  apiKey:  "${SANDBOX_KEY}",
  baseUrl: "https://api.alignmenttech.ai",
});

// 2. Send an intent — get ranked quotes from every brand in <600ms
const result = await broker.query({
  consumer_agent_id: "${SANDBOX_AGENT_ID}",
  intent: { raw: "waterproof running shoes under $150" },
  user_context: { region: "US", currency: "USD", ship_to_country: "US" },
});

console.log(result.ranked_quotes);
// → [ { brand: "Allbirds", price: 134, broker_score: 0.91, ... }, ... ]`;

  const commitCode = `// 3. Confirm a quote → atomic transaction + settlement
const top = result.ranked_quotes[0];
const tx  = await broker.commit({
  quote_id:          top.quote_id,
  consumer_agent_id: "${SANDBOX_AGENT_ID}",
  shipping: {
    name:           "Jane Doe",
    address_line_1: "123 Main St",
    city:           "San Francisco",
    region:         "CA",
    postal_code:    "94105",
    country:        "US",
  },
  payment_token: "tok_visa_4242",
  user_consent:  { ts: new Date().toISOString() },
});

console.log(tx.transaction_id, tx.settlement);
// → "allbirds_tx_xxx"  { gross: 134, broker_commission: 10.72, ... }`;

  return (
    <>
      {/* ── Hero: 30-sec Quick Start ──────────────────────────── */}
      <section className="bg-gradient-to-br from-purple-50 to-surface border-2 border-purple-300 rounded-2xl p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className="text-3xl">🚀</div>
          <div>
            <h2 className="text-xl font-bold text-ink">30-Second Quick Start</h2>
            <p className="text-ink-2 text-sm mt-0.5">
              Paste these 3 steps into your Customer Agent and start receiving ranked quotes.
            </p>
          </div>
        </div>

        <Step n={1} title="Install the SDK">
          <CodeBlock code={installCmd} language="bash" />
        </Step>

        <Step n={2} title="Use the sandbox key (no signup required)">
          <div className="bg-purple-100 border border-purple-200 rounded-lg p-3 flex items-center justify-between gap-3">
            <code className="text-xs font-mono text-purple-900 truncate">{SANDBOX_KEY}</code>
            <CopyButton text={SANDBOX_KEY} />
          </div>
          <p className="text-[11px] text-ink-3 mt-1.5">
            Rate-limited to 10 req/s, 1000 req/day. Apply for a production key at{" "}
            <a href="mailto:agents@alignmenttech.ai" className="text-purple-600">agents@alignmenttech.ai</a>.
          </p>
        </Step>

        <Step n={3} title="Send your first query">
          <CodeBlock code={quickstartCode} language="typescript" />
        </Step>

        <Step n={4} title="Commit a transaction" optional>
          <CodeBlock code={commitCode} language="typescript" />
        </Step>

        <div className="flex items-center gap-3 pt-2 border-t border-purple-200">
          <span className="text-xs text-ink-2">✅ Already running it?</span>
          <a href="/dashboard/agentic-commerce/quotes" className="text-xs text-purple-600 font-medium hover:underline">
            See your live queries in Quote Log →
          </a>
        </div>
      </section>

      {/* ── Reference ─────────────────────────────────────────── */}
      <section className="bg-surface border border-divider rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-ink-2 uppercase tracking-wider">Endpoint Reference</h3>
        <EndpointTable
          endpoints={[
            { method: "POST", path: "/v1/agents/consumer/register", purpose: "Register your Consumer Agent · returns api_key" },
            { method: "POST", path: "/v1/broker/query",             purpose: "Send intent → ranked quotes (200–600 ms p95)" },
            { method: "POST", path: "/v1/broker/commit",            purpose: "Confirm a quote → atomic transaction" },
            { method: "GET",  path: "/v1/broker/query/{query_id}",  purpose: "Replay a past query (audit / debug)" },
          ]}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <InfoCard title="Authentication">
            Bearer <code className="text-[11px] bg-surface-muted px-1 rounded">api_key</code> in Authorization header. All payloads JSON.
          </InfoCard>
          <InfoCard title="Compensation">
            Free to call. Optional 1–3% referral fee on every cleared transaction you originate, paid T+7 via Stripe Connect.
          </InfoCard>
        </div>
      </section>
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  BRAND AGENT — Hosted-only (single mode)
// ═════════════════════════════════════════════════════════════════════════════

function BrandView() {
  return (
    <>
      {/* ── Hero: Hosted by Alignment ─────────────────────────── */}
      <section className="bg-gradient-to-br from-emerald-50 to-surface border-2 border-emerald-300 rounded-2xl p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className="text-3xl">🎯</div>
          <div>
            <h2 className="text-xl font-bold text-ink">Hosted by Alignment</h2>
            <p className="text-ink-2 text-sm mt-0.5">
              Upload your catalog. We run your Brand Agent. You start receiving orders.{" "}
              <span className="text-emerald-700 font-medium">Zero engineering required.</span>
            </p>
          </div>
        </div>

        {/* 3-step visual */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { n: "1", t: "Submit your brand",   d: "Brand name, categories, commission rate. ~30 sec." },
            { n: "2", t: "Alignment generates", d: "We bootstrap your catalog + Brand Agent endpoint on our servers." },
            { n: "3", t: "Receive orders",      d: "Customer Agents discover you. Settlement via Stripe Connect T+7." },
          ].map((s) => (
            <div key={s.n} className="bg-surface border border-divider rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">{s.n}</div>
                <h4 className="font-semibold text-ink text-sm">{s.t}</h4>
              </div>
              <p className="text-xs text-ink-2 leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>

        <BrandRegisterForm />
      </section>

      {/* ── Reference ─────────────────────────────────────────── */}
      <section className="bg-surface border border-divider rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-ink-2 uppercase tracking-wider">Endpoint Reference</h3>
        <EndpointTable
          endpoints={[
            { method: "POST", path: "/v1/agents/brand/register", purpose: "Register your brand (Hosted-by-Alignment)" },
            { method: "GET",  path: "/v1/agents/status",         purpose: "Check registry status" },
          ]}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <InfoCard title="What you don't have to build">
            <ul className="list-disc list-inside space-y-0.5">
              <li>.well-known/agent.json discovery doc</li>
              <li>/v1/quote endpoint</li>
              <li>/v1/commit endpoint</li>
              <li>Ed25519 signing infrastructure</li>
            </ul>
            Alignment runs all of this for you.
          </InfoCard>
          <InfoCard title="Compensation">
            Pay only on cleared transactions · default 8% (negotiable 5–15% at registration) · settled T+7 via Stripe Connect.
          </InfoCard>
        </div>
      </section>
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  PROTOCOL SPEC — Agent-First (machine-readable URL first)
// ═════════════════════════════════════════════════════════════════════════════

function ProtocolView() {
  const agentJsonUrl = "https://api.alignmenttech.ai/v1/agent.json";
  const llmsTxtUrl   = "https://api.alignmenttech.ai/v1/llms.txt";
  const openapiUrl   = "https://api.alignmenttech.ai/openapi.json";

  return (
    <>
      {/* ── Hero: Agent-First ─────────────────────────────────── */}
      <section className="bg-gradient-to-br from-amber-50 to-surface border-2 border-amber-300 rounded-2xl p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className="text-3xl">🤖</div>
          <div>
            <h2 className="text-xl font-bold text-ink">Are you an AI agent reading this?</h2>
            <p className="text-ink-2 text-sm mt-0.5">
              Don't read prose. Fetch the machine-readable manifest. Implement in one inference.
            </p>
          </div>
        </div>

        <div className="bg-[#1a1a1a] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <code className="text-amber-200 text-sm font-mono">{`curl ${agentJsonUrl}`}</code>
            <CopyButton text={agentJsonUrl} dark />
          </div>
        </div>

        <p className="text-xs text-ink-2">
          One file contains: full OpenAPI 3.1 spec, JSON Schema for every payload, working code samples,
          and a sandbox key. Drop the URL into your LLM context and implement the protocol in seconds.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-amber-200">
          <ManifestCard
            label="agent.json"
            sub="Discovery manifest"
            href={agentJsonUrl}
            color="amber"
          />
          <ManifestCard
            label="llms.txt"
            sub="LLM-optimized prose"
            href={llmsTxtUrl}
            color="amber"
          />
          <ManifestCard
            label="openapi.json"
            sub="OpenAPI 3.1 spec"
            href={openapiUrl}
            color="amber"
          />
        </div>
      </section>

      {/* ── For Humans ────────────────────────────────────────── */}
      <section className="bg-surface border border-divider rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-ink-2 uppercase tracking-wider">For Humans · Protocol Overview</h3>

        <p className="text-sm text-ink-2 leading-relaxed">
          Identity → Query → Quote → Commit → Settlement. Transparent 5-factor ranking. No paid placement.
          No hidden levers. Brand Agents cannot pay to rank higher — the Broker's only revenue is the per-transaction
          commission declared at registration. This is the protocol&apos;s central trust commitment.
        </p>

        <div>
          <h4 className="text-xs font-mono uppercase tracking-wider text-ink-3 mb-2">5-Factor Ranking</h4>
          <div className="bg-[#1a1a1a] rounded-xl p-3 text-xs text-white/80 font-mono leading-relaxed">
            broker_score = 0.30 × price_match<br />
            {"             "}+ 0.25 × trust<br />
            {"             "}+ 0.20 × semantic_match<br />
            {"             "}+ 0.15 × eta<br />
            {"             "}+ 0.10 × inventory
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <InfoCard title="Authentication">
            DID-style identities. Ed25519 request signing. 30-second nonce window.
          </InfoCard>
          <InfoCard title="Licensing">
            Open spec, public docs. Fork it, implement it. No license fee.
          </InfoCard>
        </div>
      </section>
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  Shared components
// ═════════════════════════════════════════════════════════════════════════════

function Step({ n, title, optional, children }: { n: number; title: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-ink text-ink-inv text-xs font-bold flex items-center justify-center">{n}</div>
        <h3 className="text-sm font-semibold text-ink">
          {title}
          {optional && <span className="text-[10px] text-ink-3 font-normal ml-2">(optional)</span>}
        </h3>
      </div>
      <div className="pl-8">{children}</div>
    </div>
  );
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  return (
    <div className="bg-[#1a1a1a] rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
        <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">{language}</span>
        <CopyButton text={code} dark />
      </div>
      <pre className="p-4 text-[11px] leading-relaxed text-white/85 font-mono overflow-x-auto">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function CopyButton({ text, dark = false }: { text: string; dark?: boolean }) {
  const [copied, setCopied] = useState(false);
  const onClick = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={onClick}
      className={`text-[11px] font-medium px-2 py-1 rounded transition-colors ${
        dark
          ? "bg-white/10 text-white/80 hover:bg-white/20"
          : "bg-purple-100 text-purple-700 hover:bg-purple-200"
      }`}
    >
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

function EndpointTable({ endpoints }: { endpoints: { method: string; path: string; purpose: string }[] }) {
  return (
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
          {endpoints.map((e) => (
            <tr key={e.path} className="border-b border-divider last:border-b-0">
              <td className="px-3 py-2">
                <span className={`font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                  e.method === "GET" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
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
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface-muted border border-divider rounded-xl p-4 space-y-1.5">
      <h3 className="text-xs font-mono uppercase tracking-wider text-ink-3">{title}</h3>
      <div className="text-xs text-ink-2 leading-relaxed">{children}</div>
    </div>
  );
}

function ManifestCard({ label, sub, href, color }: { label: string; sub: string; href: string; color: "amber" }) {
  void color;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="bg-surface border border-divider hover:border-amber-400 rounded-xl p-3 transition-colors block"
    >
      <div className="font-mono text-sm font-semibold text-ink">{label}</div>
      <div className="text-[11px] text-ink-3 mt-0.5">{sub}</div>
      <div className="text-[11px] text-amber-700 mt-1">Fetch →</div>
    </a>
  );
}

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

// ─── Brand Register Form ─────────────────────────────────────────────────────

function BrandRegisterForm() {
  const [form, setForm] = useState({
    brand_id: "",
    name: "",
    tagline: "",
    categories: "",
    commission_rate: "0.08",
    avg_price: "50",
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
          tagline: form.tagline,
          categories: form.categories.split(",").map((s) => s.trim()).filter(Boolean),
          trust_level: "standard",
          commission_rate: parseFloat(form.commission_rate),
          avg_price: parseFloat(form.avg_price),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ ok: true, msg: `✓ Brand "${data.brand_id}" registered. We're bootstrapping your Brand Agent — first queries within 60s.` });
        setForm({ brand_id: "", name: "", tagline: "", categories: "", commission_rate: "0.08", avg_price: "50" });
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
    <form onSubmit={submit} className="bg-surface border border-divider rounded-xl p-4 space-y-3">
      <h4 className="text-sm font-semibold text-ink">Register your Brand</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[
          { key: "brand_id",        label: "Brand ID",        ph: "yourbrand (lowercase, hyphens)" },
          { key: "name",            label: "Display name",    ph: "Your Brand Inc." },
          { key: "tagline",         label: "One-line tagline", ph: "Premium running shoes for women", colspan: true },
          { key: "categories",      label: "Categories",      ph: "footwear, apparel" },
          { key: "avg_price",       label: "Avg product price (USD)", ph: "50" },
          { key: "commission_rate", label: "Commission rate", ph: "0.08 = 8%" },
        ].map((f) => (
          <div key={f.key} className={`space-y-1 ${f.colspan ? "md:col-span-2" : ""}`}>
            <label className="text-xs text-ink-3">{f.label}</label>
            <input
              value={(form as Record<string, string>)[f.key]}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              placeholder={f.ph}
              className="w-full text-sm border border-divider rounded-lg px-3 py-2 bg-surface focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting || !form.brand_id || !form.name}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {submitting ? "Registering…" : "Register Brand Agent"}
        </button>
        {result && (
          <span className={`text-xs ${result.ok ? "text-green-600" : "text-red-600"}`}>{result.msg}</span>
        )}
      </div>
    </form>
  );
}
