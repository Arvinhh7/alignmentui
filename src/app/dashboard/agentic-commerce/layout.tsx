/**
 * Agentic Commerce layout — subscription gated.
 * Requires an active paid plan (starter / growth / enterprise).
 * Admin role always has access.
 */
"use client";

import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard/agentic-commerce",          label: "Overview" },
  { href: "/dashboard/agentic-commerce/demo",     label: "Consumer Demo" },
  { href: "/dashboard/agentic-commerce/console",  label: "Brand Console" },
  { href: "/dashboard/agentic-commerce/billing",  label: "Billing" },
  { href: "/dashboard/agentic-commerce/platform", label: "Platform Admin" },
];

export default function AgenticCommerceLayout({ children }: { children: React.ReactNode }) {
  const { user, role } = useAuth();
  const { hasAccess, isLoading, plan } = useSubscription(user?.id, role);
  const pathname = usePathname() ?? "";

  // Admin always has access
  if (role === "admin" || role === "demo") {
    return <AgenticCommerceShell pathname={pathname}>{children}</AgenticCommerceShell>;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-ink-3 text-sm animate-pulse">Checking access…</div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-64 p-6">
        <div className="max-w-sm w-full bg-surface border border-divider rounded-2xl p-8 text-center space-y-4">
          <div className="text-3xl">🛒</div>
          <h2 className="text-lg font-bold text-ink">Agentic Commerce</h2>
          <p className="text-sm text-ink-2 leading-relaxed">
            Access requires an active subscription. Upgrade to unlock the three-actor commerce platform.
          </p>
          <Link href="/dashboard/settings"
            className="inline-block px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-xl transition-colors">
            Upgrade Plan →
          </Link>
        </div>
      </div>
    );
  }

  return <AgenticCommerceShell pathname={pathname}>{children}</AgenticCommerceShell>;
}

function AgenticCommerceShell({ children, pathname }: { children: React.ReactNode; pathname: string }) {
  return (
    <div className="space-y-6">
      {/* Sub-nav */}
      <nav className="flex items-center gap-1 border-b border-divider pb-0 overflow-x-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === "/dashboard/agentic-commerce"
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}
              className={`px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                isActive
                  ? "border-purple-600 text-purple-700"
                  : "border-transparent text-ink-2 hover:text-ink hover:border-divider"
              }`}>
              {item.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
