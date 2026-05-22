"use client";

/**
 * BrokerNetwork — live network topology for the Agentic Commerce Overview.
 *
 * Replaces the old static 5-step "protocol flow" diagram with a living view of
 * the broker fabric:
 *   left   = Consumer Agents      (logo-mark + name chip)
 *   center = ◆ ALIGNMENT BROKER ◆ — 6 guarantee "light bands", live metrics
 *   right  = Brand Agents         (real logo via BrandLogo + name + trust tier)
 *
 * Nodes are compact chips pinned to the outer edges, so the converging lines
 * between each node and the broker stay visible (the "topology" read). A 1.6 s
 * tick jitters the 6 metrics and re-highlights one active consumer→broker→brand
 * path; each band shimmers continuously. Pure React + CSS — renders reliably.
 */

import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import {
  Radio, BarChart2, RefreshCw, Shield, CreditCard, CheckCircle,
} from "lucide-react";

// ── Design tokens (shared with the Overview page) ────────────────────────────
const ACCENT = "#C84B31";
const SAGE   = "#1a7a4c";
const GOLD   = "#d9a85c";
const STEEL  = "#5F7A8E";
const LINE   = "#E0B6A6"; // warm idle line tone

// ── Nodes ─────────────────────────────────────────────────────────────────────
type ConsumerAgent = { name: string; surface: string; color: string };

const CONSUMER_AGENTS: ConsumerAgent[] = [
  { name: "Rufus",           surface: "WhatsApp", color: SAGE  },
  { name: "Mila Shopping",   surface: "WhatsApp", color: SAGE  },
  { name: "ChatLoop",        surface: "WhatsApp", color: SAGE  },
  { name: "Hayl",            surface: "Voice",    color: GOLD  },
  { name: "Stylr AI",        surface: "Fashion",  color: "#B5453A" },
  { name: "Pixel Concierge", surface: "Phone OS", color: STEEL },
];

type BrandAgent = { id: string; name: string; trust: "verified" | "standard" };

const BRAND_AGENTS: BrandAgent[] = [
  { id: "nike",      name: "Nike",      trust: "verified" },
  { id: "allbirds",  name: "Allbirds",  trust: "verified" },
  { id: "apple",     name: "Apple",     trust: "verified" },
  { id: "patagonia", name: "Patagonia", trust: "verified" },
  { id: "samsung",   name: "Samsung",   trust: "standard" },
  { id: "lululemon", name: "lululemon", trust: "standard" },
];

const V_COUNT = BRAND_AGENTS.filter((b) => b.trust === "verified").length;
const S_COUNT = BRAND_AGENTS.length - V_COUNT;

// ── 6 guarantees (the broker's light bands) ────────────────────────────────────
type Metrics = { fanout: number; latency: number; top: number; fresh: number; receipts: number };

const BANDS: {
  n: number;
  icon: typeof Radio;
  label: string;
  color: string;
  metric: (m: Metrics) => string;
}[] = [
  { n: 1, icon: Radio,       label: "Cross-brand match",  color: ACCENT, metric: (m) => `fan-out ${m.fanout} · ${m.latency}ms` },
  { n: 2, icon: BarChart2,   label: "Transparent rank",   color: GOLD,   metric: (m) => `top ${m.top.toFixed(2)}` },
  { n: 3, icon: RefreshCw,   label: "Live catalog",       color: SAGE,   metric: (m) => `fresh ${m.fresh}s ago` },
  { n: 4, icon: Shield,      label: "Trusted merchants",  color: STEEL,  metric: ()  => `${V_COUNT}✓ / ${S_COUNT}○` },
  { n: 5, icon: CreditCard,  label: "Payment routing",    color: ACCENT, metric: ()  => `via Stripe Connect` },
  { n: 6, icon: CheckCircle, label: "Signed receipts",    color: SAGE,   metric: (m) => `${m.receipts.toLocaleString()} signed` },
];

// y-position (% of svg viewBox) for the i-th of n evenly-spaced nodes
const nodeY = (i: number, n: number) => ((i + 0.5) / n) * 100;

export default function BrokerNetwork() {
  const [m, setM] = useState<Metrics>({ fanout: 12, latency: 340, top: 0.87, fresh: 8, receipts: 3291 });
  const [active, setActive] = useState<{ c: number; b: number }>({ c: 0, b: 0 });

  useEffect(() => {
    const id = setInterval(() => {
      setM((prev) => ({
        fanout:   8 + Math.floor(Math.random() * 7),
        latency:  180 + Math.floor(Math.random() * 340),
        top:      0.78 + Math.random() * 0.17,
        fresh:    1 + Math.floor(Math.random() * 20),
        receipts: prev.receipts + 1 + Math.floor(Math.random() * 4),
      }));
      setActive({
        c: Math.floor(Math.random() * CONSUMER_AGENTS.length),
        b: Math.floor(Math.random() * BRAND_AGENTS.length),
      });
    }, 1600);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="bg-surface border border-divider-light rounded-2xl shadow-elevation-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-ink flex items-center gap-2">
            <Radio className="w-4 h-4" style={{ color: ACCENT }} />
            The Alignment Broker — live network
          </h2>
          <p className="text-xs text-ink-3 mt-0.5">
            Consumer Agents ↔ Broker ↔ Brand Agents · 6 guarantees enforced on every query
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-2 bg-canvas border border-divider-light rounded-full px-2.5 py-1">
          <span className="w-1.5 h-1.5 rounded-full animate-blink" style={{ background: SAGE }} />
          live
        </span>
      </div>

      {/* Column captions */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-2 md:gap-6 mb-2">
        <div className="text-[10px] font-mono text-ink-3 uppercase tracking-wider pl-1">Consumer Agents</div>
        <div className="text-[10px] font-mono text-ink-3 uppercase tracking-wider text-center w-[210px] sm:w-[300px] md:w-[360px]">
          Broker · 6 guarantees
        </div>
        <div className="text-[10px] font-mono text-ink-3 uppercase tracking-wider pr-1 text-right">Brand Agents</div>
      </div>

      {/* Topology */}
      <div className="relative min-h-[330px]">
        {/* Converging line mesh (behind nodes; the broker card covers the center) */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          {CONSUMER_AGENTS.map((_, i) => {
            const on = i === active.c;
            return (
              <line
                key={`l${i}`}
                x1={11} y1={nodeY(i, CONSUMER_AGENTS.length)} x2={50} y2={50}
                stroke={on ? ACCENT : LINE}
                strokeWidth={on ? 1.8 : 1}
                strokeDasharray="3 3"
                vectorEffect="non-scaling-stroke"
                style={{
                  opacity: on ? 1 : 0.6,
                  animation: `dash-flow ${on ? 0.8 : 1.7}s linear infinite`,
                }}
              />
            );
          })}
          {BRAND_AGENTS.map((_, j) => {
            const on = j === active.b;
            return (
              <line
                key={`r${j}`}
                x1={50} y1={50} x2={89} y2={nodeY(j, BRAND_AGENTS.length)}
                stroke={on ? SAGE : LINE}
                strokeWidth={on ? 1.8 : 1}
                strokeDasharray="3 3"
                vectorEffect="non-scaling-stroke"
                style={{
                  opacity: on ? 1 : 0.6,
                  animation: `dash-flow ${on ? 0.8 : 1.7}s linear infinite`,
                }}
              />
            );
          })}
        </svg>

        <div className="relative grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-2 md:gap-6 h-full">
          {/* LEFT — Consumer Agent chips, pinned to the outer (left) edge */}
          <div className="flex flex-col justify-around items-start gap-2">
            {CONSUMER_AGENTS.map((a, i) => {
              const on = i === active.c;
              return (
                <div
                  key={a.name}
                  className={`relative w-[150px] sm:w-[178px] flex items-center gap-2 rounded-full border pl-1.5 pr-3 py-1 transition-all duration-300 ${
                    on ? "bg-canvas shadow-elevation-sm" : "bg-surface border-divider-light"
                  }`}
                  style={on ? { borderColor: ACCENT } : undefined}
                >
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                    style={{ background: a.color }}
                  >
                    {a.name.charAt(0)}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-ink truncate leading-tight">{a.name}</div>
                    <div className="text-[10px] text-ink-3 truncate leading-tight">{a.surface}</div>
                  </div>
                  {/* inner connector dot (toward broker) */}
                  <span
                    className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ring-2 ring-surface transition-colors"
                    style={{ background: on ? ACCENT : "#D8CFC0" }}
                  />
                </div>
              );
            })}
          </div>

          {/* CENTER — Broker with 6 guarantee bands */}
          <div
            className="relative self-center rounded-2xl border-2 p-3 w-[210px] sm:w-[300px] md:w-[360px] shadow-elevation-md"
            style={{ background: "#FFFFFF", borderColor: ACCENT }}
          >
            <div className="text-center mb-2.5">
              <div className="text-[11px] font-bold tracking-wide" style={{ color: "#A33820" }}>
                ◆ ALIGNMENT BROKER ◆
              </div>
            </div>
            <div className="space-y-1.5">
              {BANDS.map((band) => {
                const Icon = band.icon;
                return (
                  <div
                    key={band.n}
                    className="relative overflow-hidden rounded-lg border border-divider-light px-2.5 py-1.5 flex items-center gap-2"
                    style={{ background: `${band.color}0D` }}
                  >
                    {/* shimmering light strip */}
                    <span className="shimmer absolute inset-0 pointer-events-none" aria-hidden />
                    <span
                      className="relative w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                      style={{ background: `${band.color}22` }}
                    >
                      <Icon className="w-3 h-3" style={{ color: band.color }} />
                    </span>
                    <span className="relative text-[11px] font-semibold text-ink whitespace-nowrap">
                      {band.label}
                    </span>
                    <span className="relative ml-auto text-[10px] font-mono text-ink-2 tabular-nums whitespace-nowrap">
                      {band.metric(m)}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="text-center mt-2.5 text-[9px] text-ink-3">
              pay only on cleared transactions
            </div>
          </div>

          {/* RIGHT — Brand Agent chips, pinned to the outer (right) edge */}
          <div className="flex flex-col justify-around items-end gap-2">
            {BRAND_AGENTS.map((b, j) => {
              const on = j === active.b;
              const verified = b.trust === "verified";
              return (
                <div
                  key={b.id}
                  className={`relative w-[150px] sm:w-[178px] flex items-center gap-2 rounded-full border pl-3 pr-1.5 py-1 transition-all duration-300 ${
                    on ? "bg-canvas shadow-elevation-sm" : "bg-surface border-divider-light"
                  }`}
                  style={on ? { borderColor: SAGE } : undefined}
                >
                  {/* inner connector dot (toward broker) */}
                  <span
                    className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ring-2 ring-surface transition-colors"
                    style={{ background: on ? SAGE : "#D8CFC0" }}
                  />
                  <div className="min-w-0 flex-1 text-right">
                    <div className="text-xs font-semibold text-ink truncate leading-tight">{b.name}</div>
                    <div className="text-[10px] truncate leading-tight" style={{ color: verified ? SAGE : GOLD }}>
                      {verified ? "✓ verified" : "○ standard"}
                    </div>
                  </div>
                  <BrandLogo brandId={b.id} name={b.name} size={28} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
