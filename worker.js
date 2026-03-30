/**
 * Cloudflare Worker — alignmenttech static site router
 *
 * Next.js `output: export` only pre-builds [id]='_' placeholder pages.
 * This worker rewrites real UUIDs in visibility-proxy routes to '_'
 * so the client-side React router can take over.
 *
 * Key: pass only the rewritten URL to env.ASSETS.fetch() — no original
 * request as init, which avoids header/redirect conflicts.
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

    // /dashboard/visibility-proxy/<uuid>/assets[/] → serve /placeholder/assets/
    if (new RegExp(`^/dashboard/visibility-proxy/${UUID}/assets/?$`, 'i').test(path)) {
      const target = new URL('/dashboard/visibility-proxy/placeholder/assets/', url).toString();
      return env.ASSETS.fetch(new Request(target));
    }

    // /dashboard/visibility-proxy/<uuid>[/] → serve /placeholder/
    if (new RegExp(`^/dashboard/visibility-proxy/${UUID}/?$`, 'i').test(path)) {
      const target = new URL('/dashboard/visibility-proxy/placeholder/', url).toString();
      return env.ASSETS.fetch(new Request(target));
    }

    return env.ASSETS.fetch(request);
  },
};
