/**
 * Alignment AI — GA4 AI Traffic Attribution Tracker v1.1
 *
 * Drop this script into any client website (before </body>) to:
 *   1. Detect traffic from AI platforms (ChatGPT, Perplexity, Gemini, etc.)
 *   2. Send enriched GA4 custom events with ai_platform + ai_referral dimensions
 *   3. Mark the session so all downstream page_views are tagged as AI-sourced
 *   4. Detect geo_citation signals (UTM params / referrer patterns from AI links)
 *
 * Requirements:
 *   - GA4 gtag.js already loaded on the page (via GTM or direct script tag)
 *   - GA4 property must have custom dimensions:
 *       ai_platform  (scope: session)
 *       ai_referral  (scope: session)
 *       geo_citation (scope: event)
 *
 * Usage:
 *   <script src="https://alignmenttech.ai/alignment-ga4-tracker.js"></script>
 */
(function () {
  'use strict';

  // ── AI platform referrer map ───────────────────────────────────────────────
  var AI_PLATFORMS = [
    { match: 'chatgpt.com',           label: 'ChatGPT' },
    { match: 'chat.openai.com',       label: 'ChatGPT' },
    { match: 'perplexity.ai',         label: 'Perplexity' },
    { match: 'gemini.google.com',     label: 'Gemini' },
    { match: 'bard.google.com',       label: 'Gemini' },
    { match: 'copilot.microsoft.com', label: 'Copilot' },
    { match: 'bing.com/chat',         label: 'Copilot' },
    { match: 'grok.x.ai',            label: 'Grok' },
    { match: 'grok.com',             label: 'Grok' },
    { match: 'claude.ai',            label: 'Claude' },
    { match: 'you.com',              label: 'You.com' },
    { match: 'phind.com',            label: 'Phind' },
    { match: 'kagi.com',             label: 'Kagi' },
    { match: 'meta.ai',              label: 'Meta AI' },
  ];

  // UTM source values that indicate an AI platform citation link
  var AI_UTM_SOURCES = [
    'chatgpt', 'chatgpt.com',
    'perplexity', 'perplexity.ai',
    'gemini', 'gemini.google.com',
    'copilot', 'copilot.microsoft.com',
    'grok', 'grok.com',
    'claude', 'claude.ai',
    'you.com', 'phind', 'kagi', 'meta.ai',
  ];

  var SESSION_KEY          = '_alignment_ai_platform';
  var SESSION_CITATION_KEY = '_alignment_geo_citation';

  // ── Detect AI referrer ────────────────────────────────────────────────────
  function detectAIPlatform() {
    var referrer = document.referrer || '';
    for (var i = 0; i < AI_PLATFORMS.length; i++) {
      if (referrer.indexOf(AI_PLATFORMS[i].match) !== -1) {
        return AI_PLATFORMS[i].label;
      }
    }
    return null;
  }

  // ── Detect geo_citation: did an AI platform explicitly link to this page? ──
  //
  // AI platforms sometimes append UTM parameters or a ?ref= when they insert
  // a clickable citation in a response. We also check the referrer directly.
  // Note: we cannot retrieve the exact prompt text from the browser — that
  // requires server-side compute-attribution logic.
  function detectCitation() {
    try {
      var params  = new URLSearchParams(window.location.search);
      var ref     = (document.referrer || '').toLowerCase();
      var utmSrc  = (params.get('utm_source') || '').toLowerCase();
      var utmMed  = (params.get('utm_medium') || '').toLowerCase();
      var refParam = (params.get('ref') || '').toLowerCase();

      // Direct referrer match
      for (var i = 0; i < AI_PLATFORMS.length; i++) {
        if (ref.indexOf(AI_PLATFORMS[i].match) !== -1) return true;
      }

      // utm_source matches a known AI platform
      for (var j = 0; j < AI_UTM_SOURCES.length; j++) {
        if (utmSrc === AI_UTM_SOURCES[j]) return true;
      }

      // utm_medium === 'ai' or 'ai-citation' (convention some platforms use)
      if (utmMed === 'ai' || utmMed === 'ai-citation' || utmMed === 'chatgpt') return true;

      // ?ref= contains an AI platform name
      for (var k = 0; k < AI_UTM_SOURCES.length; k++) {
        if (refParam.indexOf(AI_UTM_SOURCES[k]) !== -1) return true;
      }
    } catch (e) { /* ignore */ }
    return false;
  }

  // ── Session storage helpers (persist across pages in same session) ─────────
  function getSessionPlatform() {
    try { return sessionStorage.getItem(SESSION_KEY); } catch (e) { return null; }
  }
  function setSessionPlatform(platform) {
    try { sessionStorage.setItem(SESSION_KEY, platform); } catch (e) {}
  }
  function getSessionCitation() {
    try { return sessionStorage.getItem(SESSION_CITATION_KEY) === 'true'; } catch (e) { return false; }
  }
  function setSessionCitation(val) {
    try { sessionStorage.setItem(SESSION_CITATION_KEY, val ? 'true' : 'false'); } catch (e) {}
  }

  // ── GA4 event sender (safe — no-op if gtag not loaded) ────────────────────
  function sendGA4Event(eventName, params) {
    if (typeof window.gtag !== 'function') return;
    window.gtag('event', eventName, params);
  }

  // ── Main tracking logic ────────────────────────────────────────────────────
  function track() {
    var detected        = detectAIPlatform();
    var isCitation      = detectCitation();
    var sessionPlatform = getSessionPlatform();
    var sessionCitation = getSessionCitation();

    // Persist citation flag for the session
    if (isCitation && !sessionCitation) {
      setSessionCitation(true);
      sessionCitation = true;
    }

    // Case 1: First page from AI platform — fire ai_session_start
    if (detected && !sessionPlatform) {
      setSessionPlatform(detected);
      sendGA4Event('ai_session_start', {
        ai_platform:  detected,
        ai_referral:  true,
        geo_citation: isCitation,
        referrer_url: document.referrer,
        landing_page: window.location.pathname,
      });
    }

    // Case 2: Already in an AI session (navigating within site) — tag page_view
    var activePlatform = detected || sessionPlatform;
    if (activePlatform) {
      // Override page_view with ai_platform dimension
      if (typeof window.gtag === 'function') {
        window.gtag('config', window._ga4MeasurementId || '', {
          ai_platform:  activePlatform,
          ai_referral:  true,
          geo_citation: sessionCitation || isCitation,
        });
      }
    }
  }

  // ── Allow host page to pass GA4 Measurement ID for config override ─────────
  // Call: window._ga4MeasurementId = 'G-XXXXXXXXXX'; before loading this script
  // Or it will read from the existing gtag config automatically.

  // ── Run on DOM ready ───────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', track);
  } else {
    track();
  }
})();
