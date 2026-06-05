'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Play, Loader2, RefreshCw,
  BarChart2, Link2, Tag, CheckCircle2,
} from 'lucide-react'
import { BrandLogo } from '@/components/BrandLogo'

// ── Brand domain lookup for official logo rendering ───────────────────────────
// Covers all brands expected across the 25 P0 Explore categories.
const EXPLORE_BRAND_DOMAINS: [string, string][] = [
  // Consumer Electronics
  ['apple',           'apple.com'],
  ['sony',            'sony.com'],
  ['bose',            'bose.com'],
  ['samsung',         'samsung.com'],
  ['google',          'google.com'],
  ['beats',           'beatsbydre.com'],
  ['jabra',           'jabra.com'],
  ['sennheiser',      'sennheiser.com'],
  ['anker',           'anker.com'],
  ['soundcore',       'soundcore.com'],
  ['jbl',             'jbl.com'],
  ['skullcandy',      'skullcandy.com'],
  ['nothing',         'nothing.tech'],
  ['shokz',           'shokz.com'],
  ['oura',            'ouraring.com'],
  ['ultrahuman',      'ultrahuman.com'],
  ['ringconn',        'ringconn.com'],
  ['samsung galaxy',  'samsung.com'],
  ['pixel',           'store.google.com'],
  ['fitbit',          'fitbit.com'],
  ['garmin',          'garmin.com'],
  ['polar',           'polar.com'],
  ['suunto',          'suunto.com'],
  ['amazfit',         'amazfit.com'],
  ['fossil',          'fossilgroup.com'],
  ['withings',        'withings.com'],
  ['keychron',        'keychron.com'],
  ['logitech',        'logitech.com'],
  ['corsair',         'corsair.com'],
  ['razer',           'razer.com'],
  ['steelseries',     'steelseries.com'],
  ['ducky',           'duckychannel.com.tw'],
  ['glorious',        'pcgamingrace.com'],
  ['nuphy',           'nuphy.com'],
  ['drop',            'drop.com'],
  ['audio-technica',  'audio-technica.com'],
  ['hifiman',         'hifiman.com'],
  // Smart Home
  ['irobot',          'irobot.com'],
  ['roomba',          'irobot.com'],
  ['roborock',        'roborock.com'],
  ['eufy',            'eufylife.com'],
  ['ecovacs',         'ecovacs.com'],
  ['deebot',          'ecovacs.com'],
  ['shark',           'sharkclean.com'],
  ['dreame',          'dreametech.com'],
  ['narwal',          'narwel.com'],
  ['ring',            'ring.com'],
  ['nest',            'nest.com'],
  ['arlo',            'arlo.com'],
  ['wyze',            'wyze.com'],
  ['blink',           'blinkforhome.com'],
  ['reolink',         'reolink.com'],
  ['lorex',           'lorex.com'],
  // Kitchen & Home
  ['ninja',           'ninjakitchen.com'],
  ['breville',        'breville.com'],
  ['delonghi',        'delonghi.com'],
  ['philips',         'philips.com'],
  ['nespresso',       'nespresso.com'],
  ['jura',            'jura.com'],
  ['gaggia',          'gaggia.com'],
  ['rancilio',        'ranciliogroup.com'],
  ['smeg',            'smeg.com'],
  ['cosori',          'cosori.com'],
  ['instant pot',     'instantpot.com'],
  ['dash',            'bydash.com'],
  ['dyson',           'dyson.com'],
  ['coway',           'coway.com'],
  ['levoit',          'levoit.com'],
  ['blueair',         'blueair.com'],
  ['winix',           'winixamerica.com'],
  ['iqair',           'iqair.com'],
  ['rabbit air',      'rabbitair.com'],
  ['molekule',        'molekule.com'],
  // Power & Energy
  ['ecoflow',         'ecoflow.com'],
  ['jackery',         'jackery.com'],
  ['bluetti',         'bluettipower.com'],
  ['goal zero',       'goalzero.com'],
  ['anker solix',     'anker.com'],
  ['vtoman',          'vtoman.com'],
  ['growatt',         'growatt.com'],
  ['zendure',         'zendure.com'],
  // Beauty & Wellness
  ['skinceuticals',   'skinceuticals.com'],
  ['drunk elephant',  'drunkelephant.com'],
  ["paula's choice",  'paulaschoice.com'],
  ['cerave',          'cerave.com'],
  ['tatcha',          'tatcha.com'],
  ['the ordinary',    'theordinary.com'],
  ['sunday riley',    'sundayriley.com'],
  ['neutrogena',      'neutrogena.com'],
  ['la mer',          'lamer.com'],
  ["l'oreal",         'lorealparisusa.com'],
  ['oral-b',          'oralb.com'],
  ['sonicare',        'philips.com'],
  ['oclean',          'oclean.com'],
  ['quip',            'getquip.com'],
  ['colgate',         'colgate.com'],
  // Health & Fitness
  ['optimum nutrition','on.com'],
  ['dymatize',        'dymatize.com'],
  ['garden of life',  'gardenoflife.com'],
  ['orgain',          'orgain.com'],
  ['myprotein',       'myprotein.com'],
  ['vega',            'myvega.com'],
  ['theragun',        'therabody.com'],
  ['therabody',       'therabody.com'],
  ['hyperice',        'hyperice.com'],
  ['hypervolt',       'hyperice.com'],
  ['ekrin',           'ekrinathletics.com'],
  ['casper',          'casper.com'],
  ['purple',          'purple.com'],
  ['saatva',          'saatva.com'],
  ['tempur-pedic',    'tempurpedic.com'],
  ['nectar',          'nectarsleep.com'],
  ['dreamcloud',      'dreamcloudsleep.com'],
  ['helix',           'helixsleep.com'],
  ['tuft & needle',   'tuftandneedle.com'],
  ['sleep number',    'sleepnumber.com'],
  ['avocado',         'avocadogreenmattress.com'],
  ['bear',            'bearmattress.com'],
  ['leesa',           'leesa.com'],
  // Fitness & Sports
  ['nike',            'nike.com'],
  ['adidas',          'adidas.com'],
  ['hoka',            'hoka.com'],
  ['brooks',          'brooksrunning.com'],
  ['asics',           'asics.com'],
  ['new balance',     'newbalance.com'],
  ['saucony',         'saucony.com'],
  ['on running',      'on-running.com'],
  ['salomon',         'salomon.com'],
  ['altra',           'altrarunning.com'],
  ['mizuno',          'mizunousa.com'],
  ['rad power bikes', 'radpowerbikes.com'],
  ['trek',            'trekbikes.com'],
  ['specialized',     'specialized.com'],
  ['aventon',         'aventon.com'],
  ['giant',           'giant-bicycles.com'],
  ['lectric',         'lectricebikes.com'],
  ['ride1up',         'ride1up.com'],
  ['cowboy',          'cowboy.bike'],
  // Fashion
  ['ray-ban',         'ray-ban.com'],
  ['oakley',          'oakley.com'],
  ['maui jim',        'mauijim.com'],
  ['costa',           'costadelmar.com'],
  ['warby parker',    'warbyparker.com'],
  ['goodr',           'goodr.com'],
  ['smith',           'smithoptics.com'],
  ['pit viper',       'pitviper.com'],
  ['persol',          'persol.com'],
  ['away',            'awaytravel.com'],
  ['samsonite',       'samsonite.com'],
  ['rimowa',          'rimowa.com'],
  ['tumi',            'tumi.com'],
  ['briggs & riley',  'briggs-riley.com'],
  ['monos',           'monos.com'],
  ['calpak',          'calpaktravel.com'],
  ['travelpro',       'travelpro.com'],
  ['peak design',     'peakdesign.com'],
  // Furniture & Office
  ['uplift',          'upliftdesk.com'],
  ['flexispot',       'flexispot.com'],
  ['autonomous',      'autonomous.ai'],
  ['fully jarvis',    'fully.com'],
  ['vari',            'vari.com'],
  ['ergonofis',       'ergonofis.com'],
  ['herman miller',   'hermanmiller.com'],
  ['steelcase',       'steelcase.com'],
  ['humanscale',      'humanscale.com'],
  ['haworth',         'haworth.com'],
  ['branch',          'branchfurniture.com'],
  ['secretlab',       'secretlab.co'],
  // SaaS
  ['salesforce',      'salesforce.com'],
  ['hubspot',         'hubspot.com'],
  ['pipedrive',       'pipedrive.com'],
  ['zoho',            'zoho.com'],
  ['monday',          'monday.com'],
  ['freshsales',      'freshworks.com'],
  ['copper',          'copper.com'],
  ['close',           'close.com'],
  ['keap',            'keap.com'],
  ['streak',          'streak.com'],
]

function guessBrandDomain(brandName: string): string {
  const lower = (brandName || '').toLowerCase().trim()
  for (const [key, domain] of EXPLORE_BRAND_DOMAINS) {
    if (lower === key || lower.startsWith(key + ' ') || lower.startsWith(key)) return domain
  }
  // Fallback: first alpha word + .com
  const first = lower.split(/[\s\-–—]/)[0].replace(/[^a-z0-9]/g, '')
  return first ? `${first}.com` : ''
}

interface CategoryDetail {
  category:    Record<string, unknown>
  brands:      Brand[]
  citations:   Citation[]
  topics:      Topic[]
  latest_scan: ScanRun | null
}

interface Brand {
  brand_name: string
  brand_domain: string | null
  som_pct: number
  mentions: number
  rank: number
}

interface Citation {
  domain: string
  citation_count: number
  answer_count: number
}

interface Topic {
  slot_number: number
  slot_type: string
  name: string
  intent_type: string
  leader_brand: string | null
  ai_traffic_mo: number | null
}

interface ScanRun {
  id: string
  status: string
  prompt_count: number
  completed_count: number
  started_at: string
  completed_at: string | null
  engine: string
}

function fmt(n: number | null): string {
  if (!n) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

const INTENT_COLOR: Record<string, string> = {
  solution_explore:    'bg-sage-bg text-sage',
  comparison_decision: 'bg-caution-bg text-caution',
  action_choice:       'bg-red-soft-bg text-red-soft',
  info_cognition:      'bg-surface-muted text-ink-3',
}
const INTENT_LABEL: Record<string, string> = {
  solution_explore:    'Solution',
  comparison_decision: 'Comparison',
  action_choice:       'Action',
  info_cognition:      'Info',
}

export default function CategoryClient({ slug }: { slug: string }) {
  const [data, setData] = useState<CategoryDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [scanRunId, setScanRunId] = useState<string | null>(null)
  const [scanProgress, setScanProgress] = useState(0)

  const base = process.env.NEXT_PUBLIC_API_URL || ''

  const loadData = useCallback(() => {
    fetch(`${base}/api/explore/categories/${slug}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(d => {
        // Guard: API might return error shape {detail:...} instead of CategoryDetail
        if (!d || !d.category) { setData(null); return }
        setData(d)
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [slug, base])

  useEffect(() => { loadData() }, [loadData])

  // Poll scan progress
  useEffect(() => {
    if (!scanRunId || !scanning) return
    const poll = setInterval(async () => {
      try {
        const r = await fetch(`${base}/api/explore/scan/${scanRunId}`)
        const run = await r.json()
        setScanProgress(run.progress_pct ?? 0)
        if (run.status === 'completed' || run.status === 'failed') {
          setScanning(false)
          setScanRunId(null)
          setScanProgress(0)
          loadData() // refresh with new data
        }
      } catch { /* ignore */ }
    }, 2500)
    return () => clearInterval(poll)
  }, [scanRunId, scanning, base, loadData])

  const handleScan = async () => {
    if (scanning) return
    setScanning(true)
    setScanProgress(0)
    try {
      const r = await fetch(`${base}/api/explore/categories/${slug}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ engine: 'chatgpt' }),
      })
      const res = await r.json()
      if (res.run_id) setScanRunId(res.run_id)
      // If already running, just poll
      if (res.status === 'already_running' && res.run_id) setScanRunId(res.run_id)
    } catch (e) {
      setScanning(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-canvas flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-ink-3" />
    </div>
  )

  if (!data) return (
    <div className="min-h-screen bg-canvas flex items-center justify-center">
      <p className="text-ink-3">Category not found.</p>
    </div>
  )

  const cat        = data.category    || {}
  const brands     = data.brands      || []
  const citations  = data.citations   || []
  const topics     = data.topics      || []
  const latestScan = data.latest_scan || null
  const hasData    = brands.length > 0

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <div className="bg-surface border-b border-divider-light px-8 py-6">
        <Link href="/dashboard/explore" className="flex items-center gap-1.5 text-[12px] text-ink-3 hover:text-ink mb-3 transition-colors w-fit">
          <ArrowLeft className="w-3.5 h-3.5" /> Explore
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="heading-dash">{cat.name as string}</h1>
            <p className="text-sm text-ink-3 mt-0.5">{cat.vertical as string} · {cat.topic_count as number} topics</p>
          </div>
          {/* Scan button */}
          <button
            onClick={handleScan}
            disabled={scanning}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
              scanning
                ? 'bg-caution-bg text-caution border border-caution/20'
                : 'bg-ink text-ink-inv hover:bg-ink/80'
            }`}
          >
            {scanning ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Scanning… {scanProgress}%</>
            ) : hasData ? (
              <><RefreshCw className="w-4 h-4" /> Re-scan</>
            ) : (
              <><Play className="w-4 h-4" /> Scan Now (~$1.35)</>
            )}
          </button>
        </div>

        {/* Scan progress bar */}
        {scanning && (
          <div className="mt-3 h-1.5 bg-surface-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-caution rounded-full transition-all duration-500"
              style={{ width: `${scanProgress}%` }}
            />
          </div>
        )}

        {/* Summary stats */}
        {hasData && (
          <div className="flex items-center gap-6 mt-4 text-[12px] text-ink-3">
            <span><strong className="text-ink">{brands.length}</strong> brands tracked</span>
            <span><strong className="text-ink">{citations.length}</strong> citation sources</span>
            {latestScan?.completed_at && (
              <span>Last scanned {new Date(latestScan.completed_at).toLocaleDateString()}</span>
            )}
          </div>
        )}
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left col: Brand Leaderboard + Citation Sources */}
        <div className="lg:col-span-2 space-y-6">

          {/* ── Brand Leaderboard ─────────────────────────────────────── */}
          <div className="bg-surface rounded-2xl border border-divider-light p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[14px] font-bold text-ink flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-ink-3" />
                Brand Competitive Landscape
              </h2>
              {hasData && <span className="text-[11px] text-ink-3">{brands.length} brands</span>}
            </div>

            {!hasData ? (
              <div className="text-center py-12">
                <BarChart2 className="w-10 h-10 mx-auto mb-3 text-ink-3 opacity-30" />
                <p className="text-[13px] text-ink-3 font-medium mb-1">No scan data yet</p>
                <p className="text-[11px] text-ink-3">Click "Scan Now" to fetch brand rankings for this category.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {brands.slice(0, 20).map((brand, i) => (
                  <div key={brand.brand_name} className="flex items-center gap-3">
                    <span className="text-[11px] text-ink-3 w-5 text-right flex-shrink-0">{i + 1}</span>
                    <BrandLogo domain={brand.brand_domain || guessBrandDomain(brand.brand_name)} name={brand.brand_name} size={20} />
                    <span className="text-[12px] font-semibold text-ink flex-shrink-0 w-28 truncate">{brand.brand_name}</span>
                    <div className="flex-1 h-5 bg-canvas rounded overflow-hidden">
                      <div
                        className="h-full rounded transition-all"
                        style={{
                          width: `${Math.max(2, brand.som_pct)}%`,
                          background: i === 0 ? '#000' : `rgba(0,0,0,${0.35 - i * 0.012})`,
                        }}
                      />
                    </div>
                    <span className={`text-[11px] font-bold w-10 text-right flex-shrink-0 ${
                      brand.som_pct >= 10 ? 'text-ink' : brand.som_pct >= 5 ? 'text-ink-2' : 'text-ink-3'
                    }`}>{brand.som_pct.toFixed(1)}%</span>
                    <span className="text-[10px] text-ink-3 w-14 text-right flex-shrink-0">{brand.mentions} mentions</span>
                  </div>
                ))}
                {brands.length > 20 && (
                  <p className="text-[11px] text-ink-3 text-center pt-2">+{brands.length - 20} more brands tracked</p>
                )}
              </div>
            )}
          </div>

          {/* ── Citation Sources ──────────────────────────────────────── */}
          <div className="bg-surface rounded-2xl border border-divider-light p-6">
            <h2 className="text-[14px] font-bold text-ink flex items-center gap-2 mb-4">
              <Link2 className="w-4 h-4 text-ink-3" />
              Top Citation Sources
            </h2>
            {!hasData ? (
              <div className="text-center py-8 text-ink-3 text-[12px]">Run a scan to see which websites AI cites most in this category.</div>
            ) : (
              <div className="space-y-2">
                {citations.slice(0, 15).map((c, i) => (
                  <div key={c.domain} className="flex items-center gap-3">
                    <span className="text-[11px] text-ink-3 w-5 text-right flex-shrink-0">{i + 1}</span>
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${c.domain}&sz=32`}
                      alt="" className="w-4 h-4 rounded flex-shrink-0"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                    <span className="text-[12px] font-medium text-ink flex-1 truncate">{c.domain}</span>
                    <span className="text-[11px] text-ink-3 flex-shrink-0">{c.citation_count}× · {c.answer_count} answers</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right col: Topics */}
        <div className="space-y-6">
          <div className="bg-surface rounded-2xl border border-divider-light p-5">
            <h2 className="text-[14px] font-bold text-ink flex items-center gap-2 mb-4">
              <Tag className="w-4 h-4 text-ink-3" />
              Topic Ranking
            </h2>
            <div className="space-y-2.5">
              {topics.map(t => (
                <div key={t.slot_number} className="flex items-start gap-2">
                  <span className="text-[10px] text-ink-3 w-4 flex-shrink-0 mt-0.5">{t.slot_number}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium text-ink leading-tight">{t.name}</div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${INTENT_COLOR[t.intent_type] || 'bg-surface-muted text-ink-3'}`}>
                        {INTENT_LABEL[t.intent_type] || t.intent_type}
                      </span>
                      {t.leader_brand && (
                        <span className="text-[10px] text-ink-3">
                          Leader: <strong className="text-ink">{t.leader_brand}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Scan status card */}
          {latestScan && (
            <div className="bg-surface rounded-2xl border border-divider-light p-5">
              <h2 className="text-[13px] font-bold text-ink mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-sage" />
                Last Scan
              </h2>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-ink-3">Status</span>
                  <span className={`font-semibold ${latestScan.status === 'completed' ? 'text-sage' : 'text-caution'}`}>
                    {latestScan.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-3">Prompts</span>
                  <span className="text-ink font-medium">{latestScan.completed_count}/{latestScan.prompt_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-3">Engine</span>
                  <span className="text-ink font-medium capitalize">{latestScan.engine}</span>
                </div>
                {latestScan.completed_at && (
                  <div className="flex justify-between">
                    <span className="text-ink-3">Completed</span>
                    <span className="text-ink font-medium">{new Date(latestScan.completed_at).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
