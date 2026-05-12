"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

type Role = "brand" | "consumer" | "protocol";

// ── Code blocks ───────────────────────────────────────────────────────────────
const BRAND_WELLKNOWN = `// Hosted at https://your-domain.com/.well-known/agent.json
{
  "schema_version": "v0.1",
  "agent_id":       "did:alignment:yourbrand:prod-1",
  "operator":       "Your Brand Inc.",
  "public_key":     "-----BEGIN PUBLIC KEY-----\\n…",
  "endpoints": {
    "quote":     "https://agents.yourbrand.com/v1/quote",
    "commit":    "https://agents.yourbrand.com/v1/commit",
    "cancel":    "https://agents.yourbrand.com/v1/cancel",
    "inventory": "https://agents.yourbrand.com/v1/inventory",
    "catalog":   "https://agents.yourbrand.com/v1/catalog"
  },
  "capabilities": {
    "currencies":     ["USD", "EUR"],
    "ship_to":        ["US", "EU"],
    "max_qty_per_tx": 50
  },
  "sla": {
    "quote_p95_ms":  800,
    "commit_p95_ms": 3000,
    "uptime_target": 0.995
  },
  "protocol_versions": ["v0.1"]
}`;

const BRAND_QUOTE_HANDLER = `// POST /v1/quote — your Brand Agent handler
import { Hono } from 'hono';
import { assertBrokerKey } from '@alignment-ai/broker-protocol';

const app = new Hono();
const REGISTERED_BROKER_KEY = process.env.ALIGNMENT_BROKER_KEY!;

app.post('/v1/quote', async (c) => {
  const { broker_query_id, broker_key, intent, user_context } = await c.req.json();

  // 1. Verify the call is from Alignment Broker
  assertBrokerKey(broker_key, REGISTERED_BROKER_KEY);

  // 2. Match intent to your catalog
  const product = await matchProduct(intent);
  if (!product) {
    return c.json({
      broker_query_id,
      brand_id: 'yourbrand',
      error: { code: 'NO_MATCH', message: 'No matching product' }
    });
  }

  // 3. Build the quote (valid_until = 10 min from now)
  return c.json({
    quote_id:        \`yourbrand_q_\${broker_query_id}_\${product.sku}\`,
    broker_query_id,
    brand_id:        'yourbrand',
    issued_at:       new Date().toISOString(),
    valid_until:     new Date(Date.now() + 10 * 60_000).toISOString(),
    product:         { ...product, currency: 'USD' },
    match_score:     0.91,
    match_reason:    \`exact match for "\${intent.raw}"\`,
    trust_signals:   { verified_brand: true, rating: 4.8 }
  });
});

export default app;`;

const CONSUMER_QUERY_EXAMPLE = `// Consumer Agent — sending a query to the Broker
// (e.g. inside your WhatsApp shopping bot or phone-OS agent)
import { AlignmentBroker } from '@alignment-ai/broker-protocol';

const CONSUMER_AGENT_ID = 'did:alignment:yourstartup:whatsapp-bot-1';

const broker = new AlignmentBroker({
  apiKey:  process.env.ALIGNMENT_API_KEY,           // from registerConsumerAgent()
  baseUrl: 'https://api.alignmenttech.ai',          // default
});

// User says (in your WhatsApp UI): "I need waterproof running shoes under $150"
const result = await broker.query({
  consumer_agent_id: CONSUMER_AGENT_ID,
  intent: {
    raw: 'waterproof running shoes under $150',
    structured: {
      category:    'athletic_footwear',
      constraints: { price_max: 150, features: ['waterproof'] },
      qty:         1,
    },
  },
  user_context: {
    region:           'US',
    currency:         'USD',
    ship_to_country:  'US',
    urgency:          'standard',
  },
  preferences: { max_brands: 5 },
});

console.log(\`Broker fanned out to \${result.stats.brands_queried} Brand Agents\`);
console.log(\`Top: \${result.ranked_quotes[0].brand_id} @ \$\${result.ranked_quotes[0].product.price}\`);

// User confirms (taps the result in WhatsApp) — commit
const tx = await broker.commit({
  quote_id:          result.ranked_quotes[0].quote_id,
  consumer_agent_id: CONSUMER_AGENT_ID,
  shipping:          userShipping,
  payment_token:     stripeToken,
  user_consent:      { ts: new Date().toISOString() },
});

console.log(\`Transaction confirmed: \${tx.transaction_id} · settled T+7\`);`;

const CONSUMER_REGISTER = `# Register your Consumer Agent
# (e.g. your WhatsApp shopping bot, phone-OS agent, voice app, etc.)
curl -X POST https://api.alignmenttech.ai/v1/agents/consumer/register \\
  -H "Content-Type: application/json" \\
  -d '{
    "agent_id":     "did:alignment:yourstartup:whatsapp-bot-1",
    "operator":     "Your Startup",
    "operator_url": "https://yourstartup.com",
    "capabilities": ["product_search", "price_compare", "checkout"],
    "public_key":   "-----BEGIN PUBLIC KEY-----\\n…",
    "contact":      "agents@yourstartup.com"
  }'

# Response:
# {
#   "agent_id":   "did:alignment:yourstartup:whatsapp-bot-1",
#   "status":     "active",
#   "rate_limit": { "rps": 50, "rpd": 1000000 },
#   "api_key":    "ak_live_xxxxxxxxxxxxxxxxxxxx"
# }`;

const PROTOCOL_FLOW = `// The full 8-step lifecycle
// (see PROTOCOL_v0.1.md §4 for the wire details)

// Step 1 ─ Consumer Agent (CA, Outer Ring: WhatsApp bot / phone OS /
//          voice / vertical app) → Alignment Broker (BR)
POST /v1/broker/query
  { query_id, consumer_agent_id, intent, user_context, preferences }

// Step 2 ─ BR fans out in parallel to N Brand Agents (BA)
//          (MCP-based: each BA exposes /v1/quote as an MCP tool)
POST {brand.endpoints.quote}
  { broker_query_id, broker_key, intent, user_context, expires_in_ms: 2000 }

// Step 3 ─ Each BA returns a Quote (signed, time-boxed, no charge)
  { quote_id, valid_until, product, match_score, trust_signals }

// Step 4 ─ BR ranks via transparent 5-factor formula → CA
  broker_score = 0.30·price_match + 0.25·trust + 0.20·semantic
               + 0.15·eta + 0.10·inventory

// Step 5 ─ CA picks one, commits
POST /v1/broker/commit
  { quote_id, shipping, payment_token, user_consent }

// Step 6 ─ BR routes commit to the winning BA
POST {brand.endpoints.commit}
  { quote_id, shipping, payment_token }

// Step 7 ─ BA confirms transaction
  { transaction_id, status, tracking_url, settlement: { gross, commission, net } }

// Step 8 ─ BR settles T+7 via Stripe Connect to BA's account
//          BR's commission deducted, optional referral fee paid to CA operator`;

// ── Component ─────────────────────────────────────────────────────────────────
function CodeBlock({ code, lang }: { code: string; lang: string }) {
  return (
    <div className="bg-[#1a1a1a] rounded-xl overflow-hidden">
      <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between">
        <span className="text-white/40 text-xs font-mono uppercase tracking-wider">{lang}</span>
        <button
          onClick={() => navigator.clipboard.writeText(code)}
          className="text-white/40 hover:text-white text-xs font-mono"
        >
          copy
        </button>
      </div>
      <pre className="p-4 text-xs text-white/80 overflow-x-auto leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function StepCard({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center shrink-0">
        <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-sm">
          {n}
        </div>
        <div className="flex-1 w-px bg-divider mt-2" />
      </div>
      <div className="flex-1 pb-6 space-y-2">
        <div className="font-semibold text-ink text-sm">{title}</div>
        <div className="text-ink-2 text-xs leading-relaxed space-y-2">{children}</div>
      </div>
    </div>
  );
}

export default function IntegrationPage() {
  const params = useSearchParams();
  const initialRole = (params?.get("role") as Role) || "brand";
  const [role, setRole] = useState<Role>(initialRole);

  useEffect(() => {
    const r = params?.get("role") as Role;
    if (r) setRole(r);
  }, [params]);

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-ink">Integration</h1>
        <p className="text-ink-2 text-sm mt-1">
          Connect to the Alignment Broker over the open MCP-based Commerce protocol.
          Pick your role below — the rest of this page adapts.
        </p>
      </div>

      {/* ── Role Toggle ───────────────────────────────────────────── */}
      <div className="inline-flex bg-surface-muted p-1 rounded-xl border border-divider">
        {([
          { id: "brand",    label: "🏪 Brand Agent",    sub: "I'm a merchant"           },
          { id: "consumer", label: "📱 Consumer Agent", sub: "I build Consumer Agents"  },
          { id: "protocol", label: "📖 Protocol",        sub: "Open spec, built on MCP"  },
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

      {/* ── BRAND AGENT VIEW ──────────────────────────────────────── */}
      {role === "brand" && (
        <>
          <section className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
            <h2 className="font-semibold text-emerald-900">Brand Agent — 4-step onboarding</h2>
            <p className="text-emerald-800 text-sm mt-1">
              Expose your catalog as a Brand Agent. <strong>Consumer Agents</strong> — shopping
              bots embedded in WhatsApp, phone operating systems, voice apps, and vertical
              shopping startups — query you for live quotes through Alignment. You only
              pay when a transaction clears (default 8%).
            </p>
          </section>

          <section>
            <StepCard n={1} title="Publish a .well-known/agent.json discovery doc">
              <p>Host this at <code className="font-mono bg-surface-muted px-1 rounded">https://yourbrand.com/.well-known/agent.json</code>. The Broker fetches it during registration to discover your endpoints, public key, and SLA declarations.</p>
              <CodeBlock code={BRAND_WELLKNOWN} lang="json · .well-known/agent.json" />
            </StepCard>

            <StepCard n={2} title="Implement /v1/quote — the hot path">
              <p>The Broker calls this endpoint with intent + user_context. You return a signed, time-boxed quote or a refusal. P95 latency must be under 800 ms.</p>
              <CodeBlock code={BRAND_QUOTE_HANDLER} lang="typescript · agents.yourbrand.com" />
            </StepCard>

            <StepCard n={3} title="Implement /v1/commit + /v1/cancel">
              <p>When a consumer agent commits a quote, the Broker forwards to <code className="font-mono bg-surface-muted px-1 rounded">/v1/commit</code>. You confirm fulfillment and return tracking. <code className="font-mono bg-surface-muted px-1 rounded">/v1/cancel</code> handles refunds.</p>
              <p className="text-ink-3">Full request/response in <Link href="#" className="text-purple-600 hover:underline">PROTOCOL_v0.1.md §4.6</Link></p>
            </StepCard>

            <StepCard n={4} title="Register with the Broker">
              <p>Submit your agent for verification. The Broker probes your endpoints, validates schema, and assigns a trust level.</p>
              <BrandRegisterForm />
            </StepCard>
          </section>
        </>
      )}

      {/* ── CONSUMER AGENT VIEW ───────────────────────────────────── */}
      {role === "consumer" && (
        <>
          <section className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
            <h2 className="font-semibold text-blue-900">Consumer Agent — 3-step quickstart</h2>
            <p className="text-blue-800 text-sm mt-1">
              Building a shopping bot for WhatsApp / phone OS / voice / a vertical
              shopping app? One API call returns ranked quotes from thousands of Brand
              Agents. Optional 1–3% referral fee on cleared transactions you originate.
            </p>
          </section>

          <section>
            <StepCard n={1} title="Register your Consumer Agent">
              <p>Provide your agent identity, public key, and capability declaration. You get back an <code className="font-mono bg-surface-muted px-1 rounded">api_key</code> and rate limits.</p>
              <CodeBlock code={CONSUMER_REGISTER} lang="bash · curl" />
            </StepCard>

            <StepCard n={2} title="Query the Broker">
              <p>One call → ranked quotes from all eligible Brand Agents in parallel. Typical Broker round-trip: 400–600 ms (the slow leg is the slowest BA).</p>
              <CodeBlock code={CONSUMER_QUERY_EXAMPLE} lang="typescript · your-agent.ts" />
            </StepCard>

            <StepCard n={3} title="Commit the user's choice">
              <p>When the user picks one, call <code className="font-mono bg-surface-muted px-1 rounded">broker.commit()</code> with a tokenized payment method (Stripe / Apple Pay). The Broker handles the rest.</p>
              <div className="bg-surface-muted rounded-xl p-3 text-xs">
                <div className="font-mono text-ink-3 mb-1">Referral fee config (optional):</div>
                Set <code>referral_fee_pct</code> in your operator profile to earn 1–3% of every cleared
                transaction you originate. Settled T+7 via Stripe Connect.
              </div>
            </StepCard>
          </section>

          <section className="bg-surface border border-divider rounded-2xl p-5 space-y-2">
            <h3 className="font-semibold text-ink text-sm">Need an API key?</h3>
            <p className="text-ink-2 text-xs">
              Consumer Agent registration is currently invite-only during the v0.1 protocol period.
              Email <a href="mailto:agents@alignmenttech.ai" className="text-purple-600">agents@alignmenttech.ai</a> with
              your operator info and intended use case (which surface — WhatsApp / phone OS / voice / vertical app — is great context).
            </p>
          </section>
        </>
      )}

      {/* ── PROTOCOL VIEW ──────────────────────────────────────────── */}
      {role === "protocol" && (
        <>
          <section className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
            <h2 className="font-semibold text-ink">Alignment Broker Protocol v0.1</h2>
            <p className="text-ink-2 text-sm mt-1">
              An open <strong>MCP-based Commerce Extension</strong> for connecting Consumer Agents
              and Brand Agents. No proprietary client required — implement the spec, you're connected.
            </p>
            <div className="flex flex-wrap gap-2 mt-3 text-xs">
              <span className="px-2 py-1 rounded bg-white border border-divider font-mono">Status: Draft</span>
              <span className="px-2 py-1 rounded bg-white border border-divider font-mono">Version: v0.1</span>
              <span className="px-2 py-1 rounded bg-white border border-divider font-mono">Built on: MCP</span>
              <span className="px-2 py-1 rounded bg-white border border-divider font-mono">Last updated: 2026-05-12</span>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="font-semibold text-ink text-sm">The 8-step transaction lifecycle</h3>
            <CodeBlock code={PROTOCOL_FLOW} lang="protocol flow" />
          </section>

          <section className="bg-surface border border-divider rounded-2xl p-5 space-y-3">
            <h3 className="font-semibold text-ink text-sm">Ranking — transparent by design</h3>
            <p className="text-ink-2 text-xs leading-relaxed">
              The Broker's <code className="font-mono bg-surface-muted px-1 rounded">broker_score</code> is a
              weighted sum of 5 normalized factors. <strong>Brand Agents cannot pay to rank higher.</strong>{" "}
              The Broker's only revenue is the commission declared at registration. No "boost fees", no
              "promoted listings". This is the protocol's central trust commitment.
            </p>
            <div className="bg-[#1a1a1a] rounded-xl p-3 text-xs text-white/80 font-mono">
              broker_score = 0.30 × price_match<br />
              {"             "}+ 0.25 × trust<br />
              {"             "}+ 0.20 × semantic_match<br />
              {"             "}+ 0.15 × eta<br />
              {"             "}+ 0.10 × inventory
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-surface border border-divider rounded-2xl p-5 space-y-2">
              <h3 className="font-semibold text-ink text-sm">Reference implementations</h3>
              <ul className="text-xs text-ink-2 space-y-1">
                <li>· Python — <code className="font-mono">alignment-ai/broker-protocol-py</code> <span className="text-ink-3">(v0.1 alpha)</span></li>
                <li>· TypeScript — <code className="font-mono">alignment-ai/broker-protocol-ts</code> <span className="text-ink-3">(v0.1 alpha)</span></li>
                <li>· Go — <span className="text-ink-3">planned</span></li>
                <li>· Shopify App — <code className="font-mono">alignment-geo</code> <span className="text-ink-3">(in App Store review)</span></li>
              </ul>
            </div>
            <div className="bg-surface border border-divider rounded-2xl p-5 space-y-2">
              <h3 className="font-semibold text-ink text-sm">Spec sections</h3>
              <ul className="text-xs text-ink-2 space-y-1">
                <li>§1. Roles · §2. Identity &amp; Auth · §3. Registration</li>
                <li>§4. Transaction Flow · §5. Error Codes</li>
                <li>§6. Ranking Algorithm · §7. SLA &amp; Health</li>
                <li>§8. Settlement · §9. Trust &amp; Safety</li>
                <li>§10. Versioning · §13. RFC for v0.2</li>
              </ul>
              <a
                href={`${API_BASE}/api/agentic-commerce/brand/brands`}
                target="_blank"
                rel="noreferrer"
                className="inline-block text-purple-600 hover:underline text-xs mt-2"
              >
                Read full spec: PROTOCOL_v0.1.md →
              </a>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

// ── Brand Register Form (lightweight inline) ────────────────────────────────
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
    <form onSubmit={submit} className="bg-surface border border-divider rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-ink-3">Brand ID</label>
          <input
            value={form.brand_id}
            onChange={(e) => setForm({ ...form, brand_id: e.target.value })}
            placeholder="yourbrand (lowercase, hyphens)"
            className="w-full text-sm border border-divider rounded-lg px-3 py-2 bg-surface-muted focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-ink-3">Display name</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Your Brand Inc."
            className="w-full text-sm border border-divider rounded-lg px-3 py-2 bg-surface-muted focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
        </div>
        <div className="md:col-span-2 space-y-1">
          <label className="text-xs text-ink-3">.well-known URL</label>
          <input
            value={form.well_known}
            onChange={(e) => setForm({ ...form, well_known: e.target.value })}
            placeholder="https://yourbrand.com/.well-known/agent.json"
            className="w-full text-sm border border-divider rounded-lg px-3 py-2 bg-surface-muted focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-ink-3">Categories (comma-separated)</label>
          <input
            value={form.categories}
            onChange={(e) => setForm({ ...form, categories: e.target.value })}
            placeholder="footwear, apparel"
            className="w-full text-sm border border-divider rounded-lg px-3 py-2 bg-surface-muted focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-ink-3">Commission rate</label>
          <input
            value={form.commission_rate}
            onChange={(e) => setForm({ ...form, commission_rate: e.target.value })}
            placeholder="0.08 = 8%"
            className="w-full text-sm border border-divider rounded-lg px-3 py-2 bg-surface-muted focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
        </div>
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
