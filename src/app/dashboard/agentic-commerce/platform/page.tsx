"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Old route — Platform Admin moved to /dashboard/admin/agentic-commerce (admin-only)
export default function PlatformRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/admin/agentic-commerce");
  }, [router]);
  return (
    <div className="flex items-center justify-center min-h-64 text-ink-3 text-sm animate-pulse">
      Redirecting to Admin Console…
    </div>
  );
}
