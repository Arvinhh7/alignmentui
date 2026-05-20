/**
 * Alignment GEO SDK Loader v1.0.0
 * Self-Built SDK Mode — for enterprise clients (e.g. RedMagic)
 *
 * Usage (add to theme.liquid <head>):
 *   <script src="https://cdn.alignmenttech.ai/sdk/v1/loader.js"
 *           data-shop-id="your-shop-id"
 *           data-api-key="ageo_sk_..."
 *           data-api-base="https://api.alignmenttech.ai"
 *           async></script>
 *
 * What it does:
 *  1. Detects page type (home / product / collection / article / other)
 *  2. Fetches schema bundle from /v1/sdk/bundle (static schemas, 1hr cache)
 *  3. On product pages: fetches /v1/sdk/product/{handle} (dynamic, 15min cache)
 *  4. Injects <script type="application/ld+json"> tags (with deduplication)
 *  5. Reports telemetry to /v1/sdk/telemetry
 *  6. Detects AI referrals from referrer domain
 *
 * Zero-change guarantee: reads only, never modifies existing page content.
 * Dedup guarantee: checks for existing JSON-LD before injecting.
 */
(function (window, document) {
  'use strict';

  // ── Config ────────────────────────────────────────────────────────────────
  const SCRIPT = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  const SHOP_ID = SCRIPT.getAttribute('data-shop-id') || '';
  const API_KEY = SCRIPT.getAttribute('data-api-key') || '';
  const API_BASE = (SCRIPT.getAttribute('data-api-base') || 'https://api.alignmenttech.ai').replace(/\/$/, '');
  const DEBUG = SCRIPT.getAttribute('data-debug') === 'true';

  if (!SHOP_ID || !API_KEY) {
    console.warn('[AlignmentGEO] Missing data-shop-id or data-api-key. SDK disabled.');
    return;
  }

  // ── Logging ───────────────────────────────────────────────────────────────
  function log() { if (DEBUG) console.log('[AlignmentGEO]', ...arguments); }
  function warn() { console.warn('[AlignmentGEO]', ...arguments); }

  // ── Page type detection ───────────────────────────────────────────────────
  function detectPageType() {
    var path = window.location.pathname;
    if (path === '/' || path === '') return 'home';
    if (path.match(/\/products\/[^/]+/)) return 'product';
    if (path.match(/\/collections\/[^/]+/)) return 'collection';
    if (path.match(/\/blogs\/[^/]+\/[^/]+/)) return 'article';
    if (path.match(/\/pages\//)) return 'page';
    return 'other';
  }

  function extractProductHandle() {
    var match = window.location.pathname.match(/\/products\/([^/?#]+)/);
    return match ? match[1] : null;
  }

  // ── AI referral detection ─────────────────────────────────────────────────
  // Mirrors the AI_REFERRER_SOURCES map in the Cloudflare Worker (index.ts)
  var AI_REFERRER_SOURCES = {
    // USA
    'chatgpt.com': 'ChatGPT', 'chat.openai.com': 'ChatGPT',
    'claude.ai': 'Claude',
    'perplexity.ai': 'Perplexity',
    'gemini.google.com': 'Gemini', 'bard.google.com': 'Gemini', 'ai.google.com': 'Gemini',
    'copilot.microsoft.com': 'Copilot', 'bing.com': 'Bing AI',
    'grok.com': 'Grok', 'x.ai': 'Grok',
    'meta.ai': 'Meta AI',
    'you.com': 'You.com',
    'cohere.com': 'Cohere',
    'kagi.com': 'Kagi',
    'phind.com': 'Phind',
    'pi.ai': 'Pi',
    'writer.com': 'Writer',
    'search.brave.com': 'Brave',
    // China
    'chat.deepseek.com': 'DeepSeek', 'deepseek.com': 'DeepSeek',
    'doubao.com': 'Doubao',
    'kimi.moonshot.cn': 'Kimi', 'kimi.ai': 'Kimi',
    'tongyi.aliyun.com': 'Tongyi', 'qwen.aliyun.com': 'Tongyi',
    'yiyan.baidu.com': 'Baidu AI',
    'xinghuo.xfyun.cn': 'Xinghuo',
    'chatglm.cn': 'Zhipu AI',
    'hunyuan.tencent.com': 'Hunyuan',
    'baichuan-ai.com': 'Baichuan',
    'minimax.chat': 'MiniMax',
    // Europe
    'chat.mistral.ai': 'Le Chat', 'mistral.ai': 'Mistral AI',
    'deepl.com': 'DeepL',
    // Korea
    'clova.ai': 'Clova X', 'naver.com': 'Clova X', 'kakao.com': 'Kakao i',
    // Russia
    'ya.ru': 'Yandex AI', 'yandex.ru': 'Yandex AI',
    'sber.ru': 'GigaChat', 'gigachat.sber.ru': 'GigaChat',
    // Browser
    'arc.net': 'Arc Browser',
  };

  function detectAiReferral() {
    try {
      var ref = document.referrer;
      if (!ref) return null;
      var refHost = new URL(ref).hostname.replace(/^www\./, '');
      var domains = Object.keys(AI_REFERRER_SOURCES);
      for (var i = 0; i < domains.length; i++) {
        if (refHost === domains[i] || refHost.endsWith('.' + domains[i])) {
          return { domain: domains[i], source: AI_REFERRER_SOURCES[domains[i]] };
        }
      }
    } catch (e) { /* ignore */ }
    return null;
  }

  // ── Cache helpers (sessionStorage) ────────────────────────────────────────
  function cacheGet(key) {
    try {
      var raw = sessionStorage.getItem('ageo_' + key);
      if (!raw) return null;
      var item = JSON.parse(raw);
      if (Date.now() > item.expires) { sessionStorage.removeItem('ageo_' + key); return null; }
      return item.value;
    } catch (e) { return null; }
  }

  function cacheSet(key, value, ttlSeconds) {
    try {
      sessionStorage.setItem('ageo_' + key, JSON.stringify({
        value: value,
        expires: Date.now() + ttlSeconds * 1000,
      }));
    } catch (e) { /* quota exceeded — ignore */ }
  }

  // ── Schema injection ──────────────────────────────────────────────────────

  function getExistingSchemaTypes() {
    var existing = [];
    var scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (var i = 0; i < scripts.length; i++) {
      try {
        var parsed = JSON.parse(scripts[i].textContent);
        var items = Array.isArray(parsed) ? parsed : [parsed];
        for (var j = 0; j < items.length; j++) {
          if (items[j]['@type']) existing.push(items[j]['@type']);
        }
      } catch (e) { /* malformed JSON-LD — skip */ }
    }
    return existing;
  }

  function injectSchema(schema, source) {
    if (!schema) return false;
    var schemas = Array.isArray(schema) ? schema : [schema];
    if (schemas.length === 0) return false;

    var tag = document.createElement('script');
    tag.type = 'application/ld+json';
    tag.setAttribute('data-ageo-source', source || 'sdk');
    tag.textContent = JSON.stringify(schemas.length === 1 ? schemas[0] : schemas, null, 0);
    document.head.appendChild(tag);
    log('Injected', source, schemas.length, 'schema(s)');
    return true;
  }

  // ── API fetch helper ──────────────────────────────────────────────────────
  function apiFetch(path, method, body) {
    var options = {
      method: method || 'GET',
      headers: {
        'Authorization': 'Bearer ' + API_KEY,
        'Content-Type': 'application/json',
        'X-Shop-Domain': SHOP_ID,
      },
    };
    if (body) options.body = JSON.stringify(body);
    return fetch(API_BASE + path, options).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    });
  }

  // ── Telemetry (fire-and-forget) ───────────────────────────────────────────
  function reportTelemetry(eventType, extra) {
    var payload = Object.assign({
      event_type: eventType,
      page_url: window.location.href,
      timestamp_ms: Date.now(),
    }, extra || {});
    // Use sendBeacon for unload events, fetch otherwise
    var url = API_BASE + '/v1/sdk/telemetry';
    if (navigator.sendBeacon && eventType === 'page_view') {
      navigator.sendBeacon(url, JSON.stringify(payload));
    } else {
      apiFetch('/v1/sdk/telemetry', 'POST', payload).catch(function () { /* silent */ });
    }
  }

  // ── Main bootstrap ────────────────────────────────────────────────────────
  function bootstrap() {
    var pageType = detectPageType();
    var productHandle = extractProductHandle();
    var aiReferrer = detectAiReferral();

    log('Bootstrap', { pageType: pageType, productHandle: productHandle, aiReferrer: aiReferrer });

    // 1. Report AI referral immediately (once per session)
    if (aiReferrer && !sessionStorage.getItem('ageo_ref_reported')) {
      reportTelemetry('ai_referral', {
        referrer_domain: aiReferrer.domain,
        referrer_source: aiReferrer.source,
      });
      try { sessionStorage.setItem('ageo_ref_reported', '1'); } catch (e) { /* ignore */ }
    }

    // 2. Load static bundle (1hr cache)
    var bundlePromise = (function () {
      var cached = cacheGet('bundle');
      if (cached) { log('Bundle from cache'); return Promise.resolve(cached); }
      return apiFetch('/v1/sdk/bundle').then(function (data) {
        cacheSet('bundle', data, data.ttl_seconds || 3600);
        return data;
      }).catch(function (err) { warn('Bundle fetch failed:', err); return null; });
    })();

    bundlePromise.then(function (bundle) {
      if (!bundle) return;
      var schemas = bundle.schemas || {};
      var injected = [];

      var existingTypes = getExistingSchemaTypes();
      log('Existing schema types on page:', existingTypes);

      // Inject organization (skip if already present)
      if (schemas.organization && !existingTypes.includes('Organization')) {
        injectSchema(schemas.organization, 'bundle/organization');
        injected.push('Organization');
      }
      // Inject website on home page
      if (pageType === 'home' && schemas.website && !existingTypes.includes('WebSite')) {
        injectSchema(schemas.website, 'bundle/website');
        injected.push('WebSite');
      }
      // Inject FAQ on non-product pages (or always)
      if (schemas.faq && !existingTypes.includes('FAQPage')) {
        injectSchema(schemas.faq, 'bundle/faq');
        injected.push('FAQPage');
      }

      if (injected.length > 0) {
        reportTelemetry('schema_render', { schema_types: injected, product_handle: productHandle });
      }
    });

    // 3. On product pages: load dynamic product schema (15min cache)
    if (pageType === 'product' && productHandle) {
      var cacheKey = 'product_' + productHandle;
      var cached = cacheGet(cacheKey);
      var productPromise = cached
        ? Promise.resolve(cached)
        : apiFetch('/v1/sdk/product/' + productHandle)
            .then(function (data) {
              cacheSet(cacheKey, data, data.ttl_seconds || 900);
              return data;
            })
            .catch(function (err) { warn('Product schema fetch failed:', err); return null; });

      productPromise.then(function (data) {
        if (!data) return;
        var existingTypes = getExistingSchemaTypes();
        var injected = [];

        if (data.product && !existingTypes.includes('Product')) {
          // Merge AggregateRating into Product schema if available
          var productSchema = Object.assign({}, data.product);
          if (data.aggregate_rating) {
            productSchema.aggregateRating = data.aggregate_rating;
          }
          if (data.reviews && data.reviews.length > 0) {
            productSchema.review = data.reviews;
          }
          injectSchema(productSchema, 'product/full');
          injected.push('Product');
        }
        if (data.video_object && !existingTypes.includes('VideoObject')) {
          injectSchema(data.video_object, 'product/video');
          injected.push('VideoObject');
        }

        if (injected.length > 0) {
          reportTelemetry('schema_render', {
            schema_types: injected,
            product_handle: productHandle,
          });
        }
      });
    }

    // 4. Report page view
    reportTelemetry('page_view', {
      product_handle: productHandle,
    });
  }

  // Bootstrap after DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }

})(window, document);
