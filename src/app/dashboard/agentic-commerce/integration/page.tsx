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
      <section className="bg-gradient-to-br from-[#FAF0EC] to-surface border-2 border-[#E5B5A4] rounded-2xl p-6 space-y-5">
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
          <div className="bg-[#F5DDD3] border border-[#E5B5A4] rounded-lg p-3 flex items-center justify-between gap-3">
            <code className="text-xs font-mono text-[#702614] truncate">{SANDBOX_KEY}</code>
            <CopyButton text={SANDBOX_KEY} />
          </div>
          <p className="text-[11px] text-ink-3 mt-1.5">
            Rate-limited to 10 req/s, 1000 req/day. Apply for a production key at{" "}
            <a href="mailto:agents@alignmenttech.ai" className="text-[#C84B31]">agents@alignmenttech.ai</a>.
          </p>
        </Step>

        <Step n={3} title="Send your first query">
          <CodeBlock code={quickstartCode} language="typescript" />
        </Step>

        <Step n={4} title="Commit a transaction" optional>
          <CodeBlock code={commitCode} language="typescript" />
        </Step>

        <div className="flex items-center gap-3 pt-2 border-t border-[#E5B5A4]">
          <span className="text-xs text-ink-2">✅ Already running it?</span>
          <a href="/dashboard/agentic-commerce/quotes" className="text-xs text-[#C84B31] font-medium hover:underline">
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
//  BRAND AGENT — 3-step wizard (Hosted-only)
// ═════════════════════════════════════════════════════════════════════════════

type CatalogMethod = "shopify" | "csv" | "feed" | "crawl";

interface BrandWizardState {
  step: 1 | 2 | 3;
  domain: string;
  commissionRate: number;
  catalogMethod: CatalogMethod | null;
  enrichmentJobId: string | null;
  detectedMeta: { name: string; logo: string; categories: string[] } | null;
}

function BrandView() {
  const [w, setW] = useState<BrandWizardState>({
    step: 1,
    domain: "",
    commissionRate: 8,
    catalogMethod: null,
    enrichmentJobId: null,
    detectedMeta: null,
  });

  return (
    <>
      {/* ── Wizard progress bar ───────────────────────────────── */}
      <div className="flex items-center gap-2 mb-1">
        {[
          { n: 1, label: "Brand Identity" },
          { n: 2, label: "Catalog Source" },
          { n: 3, label: "Enrichment" },
        ].map((s, i) => (
          <div key={s.n} className="flex items-center gap-2">
            {i > 0 && (
              <div className={`h-px w-8 ${w.step > i ? "bg-[#FAF0EC]0" : "bg-divider"}`} />
            )}
            <div className="flex items-center gap-1.5">
              <div className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center transition-colors ${
                w.step === s.n
                  ? "bg-[#A33820] text-white"
                  : w.step > s.n
                  ? "bg-[#F5DDD3] text-[#A33820]"
                  : "bg-surface-muted text-ink-3 border border-divider"
              }`}>
                {w.step > s.n ? "✓" : s.n}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${w.step === s.n ? "text-ink" : "text-ink-3"}`}>
                {s.label}
              </span>
            </div>
          </div>
        ))}
      </div>

      {w.step === 1 && <BrandStep1 w={w} setW={setW} />}
      {w.step === 2 && <BrandStep2 w={w} setW={setW} />}
      {w.step === 3 && <BrandStep3 w={w} />}

      {/* ── Reference footer ──────────────────────────────────── */}
      <section className="bg-surface border border-divider rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-ink-2 uppercase tracking-wider">What Alignment Runs For You</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: "📡", t: "agent.json",          d: "Discovery manifest auto-published" },
            { icon: "💬", t: "/v1/quote",            d: "Quote endpoint + inventory check" },
            { icon: "✅", t: "/v1/commit",           d: "Order confirm + fulfillment relay" },
            { icon: "🔐", t: "Ed25519 signing",      d: "Broker auth infrastructure" },
          ].map((x) => (
            <div key={x.t} className="bg-surface-muted border border-divider rounded-xl p-3 space-y-1">
              <div className="text-lg">{x.icon}</div>
              <div className="text-xs font-mono font-semibold text-ink">{x.t}</div>
              <div className="text-[11px] text-ink-3 leading-snug">{x.d}</div>
            </div>
          ))}
        </div>
        <InfoCard title="Compensation">
          Pay only on cleared transactions · default 8% (negotiable 5–15%) · settled T+7 via Stripe Connect.
        </InfoCard>
      </section>
    </>
  );
}

// ── Step 1: Domain + Commission ──────────────────────────────────────────────

function BrandStep1({
  w, setW,
}: {
  w: BrandWizardState;
  setW: React.Dispatch<React.SetStateAction<BrandWizardState>>;
}) {
  const [detecting, setDetecting] = useState(false);
  const [detected, setDetected] = useState<{ name: string; logo: string; categories: string[] } | null>(null);
  const [domain, setDomain] = useState(w.domain || "");
  const [rate, setRate] = useState(w.commissionRate);

  const detect = async () => {
    if (!domain) return;
    setDetecting(true);
    setDetected(null);
    // Simulate auto-detection (real impl calls /api/agentic-commerce/brand/detect-domain)
    await new Promise((r) => setTimeout(r, 1200));
    const clean = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
    const name = clean.split(".")[0];
    setDetected({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      logo: `https://logo.clearbit.com/${clean}`,
      categories: ["footwear", "apparel"],
    });
    setDetecting(false);
  };

  const proceed = () => {
    setW((prev) => ({
      ...prev,
      domain,
      commissionRate: rate,
      detectedMeta: detected,
      step: 2,
    }));
  };

  return (
    <section className="bg-gradient-to-br from-[#FAF0EC] to-surface border-2 border-[#E5B5A4] rounded-2xl p-6 space-y-6">
      <div className="flex items-start gap-3">
        <div className="text-3xl">🏪</div>
        <div>
          <h2 className="text-xl font-bold text-ink">Tell us your domain</h2>
          <p className="text-ink-2 text-sm mt-0.5">
            We auto-detect your brand name, logo, categories, and GEO Authority Score. No forms to fill.
          </p>
        </div>
      </div>

      {/* Domain input */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-ink-3 uppercase tracking-wider">Brand Domain</label>
        <div className="flex gap-2">
          <input
            value={domain}
            onChange={(e) => { setDomain(e.target.value); setDetected(null); }}
            onKeyDown={(e) => e.key === "Enter" && detect()}
            placeholder="allbirds.com"
            className="flex-1 text-sm border border-divider rounded-lg px-3 py-2.5 bg-surface focus:outline-none focus:ring-2 focus:ring-[#E5B5A4] font-mono"
          />
          <button
            onClick={detect}
            disabled={!domain || detecting}
            className="px-4 py-2.5 bg-[#A33820] hover:bg-[#FAF0EC]0 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            {detecting ? "Detecting…" : "Auto-detect →"}
          </button>
        </div>
      </div>

      {/* Detected preview */}
      {detecting && (
        <div className="bg-surface border border-dashed border-[#E5B5A4] rounded-xl p-4 flex items-center gap-3 animate-pulse">
          <div className="w-10 h-10 rounded-lg bg-[#F5DDD3]" />
          <div className="space-y-1.5">
            <div className="h-3 w-24 bg-[#F5DDD3] rounded" />
            <div className="h-2.5 w-40 bg-[#FAF0EC] rounded" />
          </div>
        </div>
      )}
      {detected && !detecting && (
        <div className="bg-[#FAF0EC] border border-[#E5B5A4] rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={detected.logo}
              alt={detected.name}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              className="w-10 h-10 rounded-lg border border-divider object-contain bg-white p-1"
            />
            <div>
              <div className="font-semibold text-ink">{detected.name}</div>
              <div className="text-xs text-ink-2">{domain}</div>
            </div>
            <div className="ml-auto text-xs text-[#A33820] font-medium bg-[#F5DDD3] px-2 py-0.5 rounded-full">
              ✓ Detected
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-[11px]">
            <DetectedField label="Categories" value={detected.categories.join(", ")} />
            <DetectedField label="GEO Authority" value="Pulling from Monitor…" dim />
            <DetectedField label="Trust Level" value="standard" />
          </div>
        </div>
      )}

      {/* Commission slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-ink-3 uppercase tracking-wider">Commission Rate</label>
          <span className="text-sm font-bold text-[#A33820]">{rate}%</span>
        </div>
        <input
          type="range"
          min={5} max={15} step={1}
          value={rate}
          onChange={(e) => setRate(Number(e.target.value))}
          className="w-full accent-[#C84B31]"
        />
        <div className="flex justify-between text-[10px] text-ink-3">
          <span>5% (volume tier)</span>
          <span>8% (default)</span>
          <span>15% (premium placement)</span>
        </div>
        <p className="text-[11px] text-ink-3">
          Paid only on completed transactions. Higher rate = higher weight in broker ranking.
        </p>
      </div>

      <button
        onClick={proceed}
        disabled={!domain || !detected}
        className="w-full py-2.5 bg-[#A33820] hover:bg-[#FAF0EC]0 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-colors"
      >
        Continue — Connect your catalog →
      </button>
    </section>
  );
}

function DetectedField({ label, value, dim }: { label: string; value: string; dim?: boolean }) {
  return (
    <div className="bg-white border border-[#F5DDD3] rounded-lg p-2 space-y-0.5">
      <div className="text-[10px] uppercase tracking-wider text-ink-3">{label}</div>
      <div className={`font-medium ${dim ? "text-ink-3 italic" : "text-ink"}`}>{value}</div>
    </div>
  );
}

// ── Step 2: Catalog connection ───────────────────────────────────────────────

const CATALOG_OPTIONS: {
  id: CatalogMethod;
  icon: string;
  title: string;
  sub: string;
  badge?: string;
  fields?: { key: string; label: string; ph: string; type?: string }[];
}[] = [
  {
    id: "shopify",
    icon: "🛍️",
    title: "Shopify OAuth",
    sub: "Connect your Shopify store. We sync products, inventory, and pricing automatically.",
    badge: "Recommended",
    fields: [{ key: "shop_url", label: "Shopify Store URL", ph: "your-store.myshopify.com" }],
  },
  {
    id: "csv",
    icon: "📄",
    title: "CSV / JSON Upload",
    sub: "Upload a product file. Re-upload anytime to refresh the catalog.",
    fields: [{ key: "file_note", label: "File ready to upload?", ph: "We accept CSV, JSON, JSONL · max 50 MB" }],
  },
  {
    id: "feed",
    icon: "🔗",
    title: "Product Feed URL",
    sub: "Provide a Google Shopping, Meta Catalog, or custom JSON feed URL. We poll it hourly.",
    fields: [{ key: "feed_url", label: "Feed URL", ph: "https://yourstore.com/feed.xml" }],
  },
  {
    id: "crawl",
    icon: "🕷️",
    title: "Website Crawl",
    sub: "We crawl your product pages and extract catalog data. Works with any site.",
  },
];

function BrandStep2({
  w, setW,
}: {
  w: BrandWizardState;
  setW: React.Dispatch<React.SetStateAction<BrandWizardState>>;
}) {
  const [selected, setSelected] = useState<CatalogMethod | null>(w.catalogMethod);
  const [submitting, setSubmitting] = useState(false);
  const [fieldVal, setFieldVal] = useState<Record<string, string>>({});
  const opt = CATALOG_OPTIONS.find((o) => o.id === selected);

  const submit = async () => {
    if (!selected) return;
    setSubmitting(true);
    // POST to backend (real) or simulate
    await new Promise((r) => setTimeout(r, 1400));
    const jobId = `enrich_${Date.now()}`;
    setW((prev) => ({
      ...prev,
      catalogMethod: selected,
      enrichmentJobId: jobId,
      step: 3,
    }));
    setSubmitting(false);
  };

  return (
    <section className="bg-gradient-to-br from-[#FAF0EC] to-surface border-2 border-[#E5B5A4] rounded-2xl p-6 space-y-5">
      <div className="flex items-start gap-3">
        <div className="text-3xl">📦</div>
        <div>
          <h2 className="text-xl font-bold text-ink">Connect your catalog</h2>
          <p className="text-ink-2 text-sm mt-0.5">
            Choose how Alignment should ingest your products. You can change this later.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {CATALOG_OPTIONS.map((o) => (
          <button
            key={o.id}
            onClick={() => setSelected(o.id)}
            className={`text-left p-4 rounded-xl border-2 transition-all space-y-1 ${
              selected === o.id
                ? "border-[#C84B31] bg-[#FAF0EC]"
                : "border-divider bg-surface hover:border-[#E5B5A4]"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{o.icon}</span>
                <span className="text-sm font-semibold text-ink">{o.title}</span>
              </div>
              {o.badge && (
                <span className="text-[10px] bg-[#F5DDD3] text-[#A33820] px-2 py-0.5 rounded-full font-medium">
                  {o.badge}
                </span>
              )}
            </div>
            <p className="text-xs text-ink-2 leading-snug pl-7">{o.sub}</p>
          </button>
        ))}
      </div>

      {/* Extra fields for selected method */}
      {opt?.fields && (
        <div className="space-y-3 pt-2 border-t border-[#E5B5A4]">
          {opt.fields.map((f) => (
            <div key={f.key} className="space-y-1">
              <label className="text-xs font-medium text-ink-3">{f.label}</label>
              <input
                value={fieldVal[f.key] || ""}
                onChange={(e) => setFieldVal({ ...fieldVal, [f.key]: e.target.value })}
                placeholder={f.ph}
                className="w-full text-sm border border-divider rounded-lg px-3 py-2 bg-surface focus:outline-none focus:ring-2 focus:ring-[#E5B5A4]"
              />
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => setW((p) => ({ ...p, step: 1 }))}
          className="px-4 py-2.5 text-sm text-ink-2 border border-divider rounded-xl hover:bg-surface-muted"
        >
          ← Back
        </button>
        <button
          onClick={submit}
          disabled={!selected || submitting}
          className="flex-1 py-2.5 bg-[#A33820] hover:bg-[#FAF0EC]0 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          {submitting ? "Submitting…" : "Start Enrichment →"}
        </button>
      </div>
    </section>
  );
}

// ── Step 3: Enrichment in progress ───────────────────────────────────────────

const ENRICH_STEPS: { key: string; label: string; detail: string; delayMs: number }[] = [
  { key: "domain",     label: "Domain verified",              detail: "SSL, robots.txt, sitemap checked",       delayMs: 800  },
  { key: "catalog",    label: "Catalog ingested",             detail: "Products, SKUs, pricing indexed",         delayMs: 2200 },
  { key: "trust",      label: "Trust signals collected",      detail: "Reviews, return policy, certifications",  delayMs: 3600 },
  { key: "geo",        label: "AI Authority Score",           detail: "Pulled from GEO Monitor module",          delayMs: 5000 },
  { key: "semantic",   label: "Semantic profile built",       detail: "Intent vectors indexed for matching",     delayMs: 6500 },
  { key: "agent",      label: "Brand Agent endpoint live",    detail: "Your /v1/quote endpoint is registered",  delayMs: 8000 },
];

function BrandStep3({ w }: { w: BrandWizardState }) {
  const [done, setDone] = useState<Set<string>>(new Set());
  const [current, setCurrent] = useState<string | null>("domain");

  useEffect(() => {
    ENRICH_STEPS.forEach(({ key, delayMs }) => {
      setTimeout(() => {
        setDone((prev) => new Set(Array.from(prev).concat(key)));
        const idx = ENRICH_STEPS.findIndex((s) => s.key === key);
        const next = ENRICH_STEPS[idx + 1];
        if (next) setCurrent(next.key);
        else setCurrent(null);
      }, delayMs);
    });
  }, []);

  const allDone = done.size === ENRICH_STEPS.length;
  const methodLabel = {
    shopify: "Shopify OAuth",
    csv:     "CSV / JSON Upload",
    feed:    "Product Feed URL",
    crawl:   "Website Crawl",
  }[w.catalogMethod || "crawl"];

  return (
    <section className="bg-gradient-to-br from-[#FAF0EC] to-surface border-2 border-[#E5B5A4] rounded-2xl p-6 space-y-5">
      <div className="flex items-start gap-3">
        <div className="text-3xl">{allDone ? "🎉" : "⚙️"}</div>
        <div>
          <h2 className="text-xl font-bold text-ink">
            {allDone ? "Your Brand Agent is live!" : "Enrichment in progress…"}
          </h2>
          <p className="text-ink-2 text-sm mt-0.5">
            {allDone
              ? "Customer Agents can now discover and purchase from you."
              : `Analyzing ${w.domain || "your domain"} via ${methodLabel}. ~2 minutes total.`}
          </p>
        </div>
      </div>

      {/* Progress list */}
      <div className="space-y-2">
        {ENRICH_STEPS.map((s) => {
          const isDone    = done.has(s.key);
          const isCurrent = current === s.key;
          return (
            <div key={s.key} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
              isDone    ? "bg-[#FAF0EC] border-[#E5B5A4]"
              : isCurrent ? "bg-[#FBE5DA] border-[#DC8A6E]"
              : "bg-surface border-divider opacity-50"
            }`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                isDone    ? "bg-[#FAF0EC]0 text-white"
                : isCurrent ? "bg-[#C84B31] text-white animate-pulse"
                : "bg-surface-muted text-ink-3"
              }`}>
                {isDone ? "✓" : isCurrent ? "…" : "·"}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${isDone ? "text-[#702614]" : isCurrent ? "text-[#702614]" : "text-ink-3"}`}>
                  {s.label}
                  {s.key === "geo" && isDone && (
                    <span className="ml-2 text-xs font-normal bg-[#F5DDD3] text-[#A33820] px-1.5 py-0.5 rounded-full">
                      GEO Monitor ↗
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-ink-3">{s.detail}</div>
              </div>
              {isCurrent && !isDone && (
                <div className="w-4 h-4 border-2 border-[#C84B31] border-t-transparent rounded-full animate-spin" />
              )}
            </div>
          );
        })}
      </div>

      {/* Live metrics (appear after catalog is done) */}
      {done.has("catalog") && (
        <div className="grid grid-cols-3 gap-3">
          <MetricChip icon="📦" val="2,340" label="Products indexed" />
          <MetricChip icon="⭐" val={done.has("geo") ? "74" : "—"} label="AI Authority Score" />
          <MetricChip icon="🔗" val={methodLabel} label="Catalog source" />
        </div>
      )}

      {allDone && (
        <div className="bg-[#A33820] text-white rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="font-semibold text-sm">Brand Agent is live</div>
            <div className="text-[#F5DDD3] text-xs mt-0.5">
              Job ID: {w.enrichmentJobId} · Settlement T+7 via Stripe Connect
            </div>
          </div>
          <a
            href="/dashboard/agentic-commerce/quotes"
            className="bg-white text-[#A33820] text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-[#FAF0EC] transition-colors"
          >
            View incoming quotes →
          </a>
        </div>
      )}
    </section>
  );
}

function MetricChip({ icon, val, label }: { icon: string; val: string; label: string }) {
  return (
    <div className="bg-surface border border-divider rounded-xl p-3 text-center space-y-0.5">
      <div className="text-lg">{icon}</div>
      <div className="text-sm font-bold text-ink">{val}</div>
      <div className="text-[10px] text-ink-3">{label}</div>
    </div>
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
      <section className="bg-gradient-to-br from-[#FAF0EC] to-surface border-2 border-[#E5B5A4] rounded-2xl p-6 space-y-5">
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
            <code className="text-[#F5DDD3] text-sm font-mono">{`curl ${agentJsonUrl}`}</code>
            <CopyButton text={agentJsonUrl} dark />
          </div>
        </div>

        <p className="text-xs text-ink-2">
          One file contains: full OpenAPI 3.1 spec, JSON Schema for every payload, working code samples,
          and a sandbox key. Drop the URL into your LLM context and implement the protocol in seconds.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-[#DC8A6E]">
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
          : "bg-[#F5DDD3] text-[#A33820] hover:bg-[#E5B5A4]"
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
                  e.method === "GET" ? "bg-blue-100 text-blue-700" : "bg-[#F5DDD3] text-[#A33820]"
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
      className="bg-surface border border-divider hover:border-[#C84B31] rounded-xl p-3 transition-colors block"
    >
      <div className="font-mono text-sm font-semibold text-ink">{label}</div>
      <div className="text-[11px] text-ink-3 mt-0.5">{sub}</div>
      <div className="text-[11px] text-[#A33820] mt-1">Fetch →</div>
    </a>
  );
}

function ResourceCard({ title, line, sub, href }: { title: string; line: string; sub: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="bg-surface border border-divider hover:border-[#E5B5A4] rounded-xl p-4 space-y-1 transition-colors block"
    >
      <div className="font-mono uppercase tracking-wider text-[10px] text-ink-3">{title}</div>
      <div className="font-semibold text-ink text-sm font-mono">{line}</div>
      <div className="text-ink-3 text-[11px]">{sub}</div>
      <div className="text-[#C84B31] text-xs mt-1">Open →</div>
    </a>
  );
}

