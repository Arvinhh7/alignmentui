"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Old route — redirects to new Revenue page.
export default function BillingRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/agentic-commerce/revenue");
  }, [router]);
  return (
    <div className="flex items-center justify-center min-h-64 text-ink-3 text-sm animate-pulse">
      Redirecting to Revenue…
    </div>
  );
}
