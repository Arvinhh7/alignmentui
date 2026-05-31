"use client";

/**
 * BrandLogo — official logo avatar for Agentic Commerce brand agents.
 *
 * Fallback chain (each level activates only if the previous fails):
 *   1. Clearbit Logo API  — logo.clearbit.com/{domain}          (high-res brand logo)
 *   2. Google s2/favicons — google.com/s2/favicons?domain=…     (same API as Discover tab, very reliable)
 *   3. Letter circle      — brand initial on brand color         (zero-dependency)
 */

import { useState, useEffect } from "react";

// ─── Domain helpers (for the explicit `domain` prop, e.g. customers) ───────────
/** "https://global.redmagic.gg/" → "global.redmagic.gg" */
function toHost(raw?: string | null): string {
  if (!raw) return "";
  return raw.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0].trim().toLowerCase();
}
/** "global.redmagic.gg" → "redmagic.gg" (registrable domain for Clearbit) */
function rootDomain(host: string): string {
  const parts = host.split(".").filter(Boolean);
  return parts.length <= 2 ? host : parts.slice(-2).join(".");
}

// ─── Brand registry ───────────────────────────────────────────────────────────
export const BRAND_META: Record<
  string,
  { domain: string; color: string; initial: string; name: string }
> = {
  // Agentic Commerce demo brands
  allbirds:  { domain: "allbirds.com",  color: "#2D6A4F", initial: "A", name: "Allbirds"  },
  razer:     { domain: "razer.com",     color: "#00D384", initial: "R", name: "Razer"     },
  patagonia: { domain: "patagonia.com", color: "#C1440E", initial: "P", name: "Patagonia" },

  // Extras used in Overview live feed
  nike:      { domain: "nike.com",      color: "#111111", initial: "N", name: "Nike"      },
  apple:     { domain: "apple.com",     color: "#555555", initial: "A", name: "Apple"     },
  samsung:   { domain: "samsung.com",   color: "#1428A0", initial: "S", name: "Samsung"   },
  lululemon: { domain: "lululemon.com", color: "#000000", initial: "L", name: "lululemon" },
  dyson:     { domain: "dyson.com",     color: "#C8102E", initial: "D", name: "Dyson"     },
  theragun:  { domain: "therabody.com", color: "#FF6B35", initial: "T", name: "Theragun"  },
  yeti:      { domain: "yeti.com",      color: "#00558C", initial: "Y", name: "YETI"      },
};

// ─── Logo sources ─────────────────────────────────────────────────────────────
// Mirrors the pattern used in DiscoverTab.tsx (geo-monitor module).
function logoSrcs(host: string): string[] {
  return [
    // 1. Clearbit — high-res brand logos (uses the registrable domain)
    `https://logo.clearbit.com/${rootDomain(host)}`,
    // 2. Google s2/favicons — very reliable; works with the full host.
    //    sz=128 gives a sharp icon at typical 24–40px display sizes.
    `https://www.google.com/s2/favicons?domain=${host}&sz=128`,
  ];
}

// ─── Component ────────────────────────────────────────────────────────────────
interface BrandLogoProps {
  /** Registry lookup (Agentic Commerce demo brands). Optional. */
  brandId?: string;
  /** Explicit domain (customers) — takes precedence over the registry. */
  domain?: string | null;
  /** Display name — used for the letter fallback initial */
  name?: string;
  /** Diameter in pixels (default 32) */
  size?: number;
  className?: string;
}

export function BrandLogo({
  brandId,
  domain,
  name,
  size = 32,
  className = "",
}: BrandLogoProps) {
  const meta   = brandId ? BRAND_META[brandId] : undefined;
  const bg     = meta?.color  ?? "#6D4AE8";
  const letter = (name ?? meta?.name ?? brandId ?? "?").charAt(0).toUpperCase();
  // Explicit domain prop wins (customers); else fall back to the registry domain.
  const host   = toHost(domain) || meta?.domain || "";
  const srcs   = host ? logoSrcs(host) : [];

  // attempt = index into srcs; when >= srcs.length → letter-only fallback
  const [attempt, setAttempt] = useState(0);
  // Reset the source chain when the brand/domain changes (e.g. switching customers)
  useEffect(() => { setAttempt(0); }, [host]);
  const currentSrc = attempt < srcs.length ? srcs[attempt] : null;

  return (
    <span
      className={`relative inline-flex items-center justify-center rounded-full text-white font-bold shrink-0 overflow-hidden select-none ${className}`}
      style={{
        width:      size,
        height:     size,
        background: bg,
        fontSize:   Math.round(size * 0.38),
        lineHeight: 1,
      }}
      title={meta?.name ?? name ?? brandId}
    >
      {letter}
      {currentSrc && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={currentSrc}
          alt=""
          // object-contain + white bg: works for both full-bleed Clearbit logos
          // and small favicon-style images returned by s2/favicons.
          className="absolute inset-0 w-full h-full object-contain bg-white rounded-full p-[1px]"
          onError={() => setAttempt((prev) => prev + 1)}
        />
      )}
    </span>
  );
}
