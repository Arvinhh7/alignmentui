/**
 * Platform Admin — Agentic Commerce
 * Admin-only view: cross-brand KPIs, brand registration, broker health.
 */
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
const AC = `${API_BASE}/api/agentic-commerce`;

type BrandSummary = {
  brand_id: string;
  name: string;
  transactions: number;
  gmv: number;
  commission_earned: number;
  commission_rate: string;
  total_discoveries: number;
  conversion_rate: number;
  product_count: number;
};
type Overview = {
  summary: {
    total_brands: number;
    total_gmv: number;
    total_commission: number;
    total_transactions: number;
    total_discoveries: number;
    period_days: number;
  };
  brands: BrandSummary[];
};

const BRAND_COLOR: Record<string, string> = {
  "allbirds": "text-emerald-700", "razer": "text-green-600", "patagonia": "text-orange-700",
};

// Brand logo metadata — Clearbit + fallback color
const BRAND_META: Record<string, { domain: string; color: string; initial: string }> = {
  allbirds:  { domain: "allbirds.com",  color: "#2D6A4F", initial: "A" },
  razer:     { domain: "razer.com",     color: "#00D384", initial: "R" },
  patagonia: { domain: "patagonia.com", color: "#C1440E", initial: "P" },
};

function BrandLogo({ brandId, name }: { brandId: string; name: string }) {
  const meta = BRAND_META[brandId];
  const initial = meta?.initial ?? name.charAt(0).toUpperCase();
  const bg = meta?.color ?? "#6D4AE8";
  return (
    <span className="relative inline-flex items-center justify-center w-6 h-6 rounded-full text-white font-bold text-[10px] shrink-0 overflow-hidden" style={{ background: bg }}>
      {initial}
      {meta && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://logo.clearbit.com/${meta.domain}`}
          alt=""
          className="absolute inset-0 w-full h-full object-cover rounded-full"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
      )}
    </span>
  );
}

function fmt(n: number, d = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}

export default function AdminAgenticCommercePage() {
  const { role } = useAuth();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  const [form, setForm] = useState({
    brand_id: "",
    name: "",
    tagline: "",
    persona: "",
    categories: "",
    trust_level: "standard",
    commission_rate: "0.08",
    avg_price: "25",
  });
  const [registering, setRegistering] = useState(false);
  const [registerMsg, setRegisterMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = () => {
    setLoading(true);
    fetch(`${AC}/platform/overview?days=${days}`)
      .then((r) => r.json())
      .then(setOverview)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [days]);

  if (role !== "admin") {
    return (
      <div className="flex items-center justify-center h-full py-24">
        <p className="text-ink-3 text-lg">Admin access required.</p>
      </div>
    );
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegistering(true);
    setRegisterMsg(null);
    try {
      const res = await fetch(`${AC}/brand/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          categories: form.categories.split(",").map((s) => s.trim()).filter(Boolean),
          commission_rate: parseFloat(form.commission_rate),
          avg_price: parseFloat(form.avg_price),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setRegisterMsg({ ok: true, text: `Brand "${data.brand_id}" registered.` });
        setForm({ brand_id: "", name: "", tagline: "", persona: "", categories: "", trust_level: "standard", commission_rate: "0.08", avg_price: "25" });
        load();
      } else {
        setRegisterMsg({ ok: false, text: data.detail ?? "Registration failed" });
      }
    } catch {
      setRegisterMsg({ ok: false, text: "Network error" });
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-xs text-ink-3 mb-1">
            <Link href="/dashboard/admin" className="hover:text-ink">← Admin</Link>
            <span>/</span>
            <span>Agentic Commerce</span>
          </div>
          <h1 className="text-2xl font-bold text-ink">Platform Admin — Agentic Commerce</h1>
          <p className="text-ink-2 text-sm mt-1">
            Cross-brand KPIs, broker health, and Brand Agent registration. Admin-only.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                days === d ? "bg-purple-600 text-white" : "bg-surface-muted text-ink-2 hover:bg-purple-50 border border-divider"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Brand agents",     value: String(overview.summary.total_brands),        color: "text-ink"          },
            { label: "Total GMV",        value: `$${fmt(overview.summary.total_gmv)}`,        color: "text-yellow-600"    },
            { label: "Broker take",      value: `$${fmt(overview.summary.total_commission)}`, color: "text-purple-600"    },
            { label: "Commits",          value: String(overview.summary.total_transactions),  color: "text-blue-600"      },
            { label: "Quotes issued",    value: overview.summary.total_discoveries.toLocaleString(), color: "text-green-600" },
          ].map((c) => (
            <div key={c.label} className="bg-surface border border-divider rounded-xl p-4">
              <div className={`text-xl font-bold ${c.color}`}>{c.value}</div>
              <div className="text-ink-3 text-xs mt-0.5">{c.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Brand grid */}
      {loading ? (
        <div className="text-ink-3 text-sm animate-pulse">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {overview?.brands.map((b) => {
            const maxComm = Math.max(...(overview.brands.map((x) => x.commission_earned)), 1);
            return (
              <div key={b.brand_id} className="bg-surface border border-divider rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BrandLogo brandId={b.brand_id} name={b.name} />
                    <span className={`font-semibold text-sm ${BRAND_COLOR[b.brand_id] ?? "text-ink"}`}>{b.name}</span>
                  </div>
                  <span className="text-xs text-ink-3">{b.product_count} products</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-ink-3">Take rate</span>
                    <span className="text-yellow-600 font-medium">{b.commission_rate}</span>
                  </div>
                  <div className="w-full bg-surface-muted rounded-full h-1.5">
                    <div className="bg-yellow-400 h-1.5 rounded-full" style={{ width: `${maxComm > 0 ? (b.commission_earned / maxComm) * 100 : 0}%` }} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { val: `$${fmt(b.gmv, 0)}`,         label: "GMV"     },
                    { val: `$${fmt(b.commission_earned)}`,label: "Comm." },
                    { val: `${(b.conversion_rate * 100).toFixed(0)}%`, label: "Conv."},
                  ].map((item) => (
                    <div key={item.label} className="bg-surface-muted rounded-lg py-2">
                      <div className="font-semibold text-xs text-ink">{item.val}</div>
                      <div className="text-ink-3 text-xs">{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Register brand */}
      <div className="bg-surface border border-divider rounded-2xl p-5 space-y-4">
        <h2 className="font-semibold text-ink text-sm">Register New Brand Agent</h2>
        <p className="text-ink-3 text-xs">
          Admin-only registration path. Bypasses self-service well-known probe — only use for demo
          accounts or hand-curated launch partners.
        </p>
        <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { key: "brand_id",       label: "Brand ID",       placeholder: "my-brand (lowercase, hyphens)" },
            { key: "name",           label: "Display Name",   placeholder: "My Brand Inc." },
            { key: "tagline",        label: "Tagline",        placeholder: "Short description" },
            { key: "categories",     label: "Categories",     placeholder: "health, wellness, organic" },
            { key: "avg_price",      label: "Avg Price ($)",  placeholder: "25" },
            { key: "commission_rate",label: "Commission Rate",placeholder: "0.08 = 8%" },
          ].map((f) => (
            <div key={f.key} className="space-y-1">
              <label className="text-xs text-ink-3">{f.label}</label>
              <input
                value={(form as Record<string, string>)[f.key]}
                onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full text-sm border border-divider rounded-lg px-3 py-2 bg-surface-muted focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>
          ))}
          <div className="space-y-1">
            <label className="text-xs text-ink-3">Trust Level</label>
            <select
              value={form.trust_level}
              onChange={(e) => setForm((p) => ({ ...p, trust_level: e.target.value }))}
              className="w-full text-sm border border-divider rounded-lg px-3 py-2 bg-surface-muted focus:outline-none"
            >
              <option value="verified">Verified</option>
              <option value="standard">Standard</option>
              <option value="unverified">Unverified</option>
            </select>
          </div>
          <div className="md:col-span-2 space-y-1">
            <label className="text-xs text-ink-3">Brand Persona (optional)</label>
            <textarea
              value={form.persona}
              onChange={(e) => setForm((p) => ({ ...p, persona: e.target.value }))}
              placeholder="You are an AI agent for…"
              rows={2}
              className="w-full text-sm border border-divider rounded-lg px-3 py-2 bg-surface-muted resize-none focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
          </div>
          <div className="md:col-span-2 flex items-center gap-4">
            <button
              type="submit"
              disabled={registering || !form.brand_id || !form.name}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
            >
              {registering ? "Registering…" : "Register Brand"}
            </button>
            {registerMsg && (
              <span className={`text-xs ${registerMsg.ok ? "text-green-600" : "text-red-600"}`}>
                {registerMsg.ok ? "✅ " : "❌ "}{registerMsg.text}
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
