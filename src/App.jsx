import { useState, useEffect } from 'react'
import Papa from 'papaparse'
import { supabase } from './logic/supabase.js'
import { diagnose } from './logic/diagnose.js'
import { mapRows } from './logic/csv.js'
import { analyzeTimeSeries } from './logic/timeseries.js'
import { generateReport, generateSingleReport, generateTrendReport, generateHistoryReport } from './logic/report.js'
import { PLATFORMS, INDUSTRIES, FORMATS } from './data/benchmarks.js'
import {
  TREND_METRICS, OBJECTIVES, GRADE_BG, METRIC_INFO, scoreHex,
  inputCls, labelCls, card, fmt, curSym, unitOf, GLOSSARY,
  buildChatText, presetDates, fmtPeriodLabel,
} from './lib/ui.js'
import { Info, NumberInput, Sparkline, Logo } from './components/widgets.jsx'
import LoginScreen from './components/LoginScreen.jsx'
import ResultDetail from './components/ResultDetail.jsx'

export default function App() {
  const [tab, setTab] = useState('manual')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [ctx, setCtx] = useState({ platform: 'meta', format: 'all', industry: 'ecommerce', objective: 'conversion', margin: '', hpp: '', price: '', currency: 'idr', rate: '18000' })
  const hppMargin = (() => {
    const h = parseFloat(ctx.hpp), p = parseFloat(ctx.price)
    if (!isNaN(h) && !isNaN(p) && p > 0 && h >= 0 && h < p) return Math.round(((p - h) / p) * 100)
    return null
  })()
  const setC = (k, v) => setCtx((c) => ({ ...c, [k]: v }))

  const [form, setForm] = useState({
    cpm: '', ctr: '', cpc: '', cvr: '', cpa: '', roas: '',
    spend: '', impressions: '', clicks: '', conversions: '', revenue: '',
  })
  const [inputMode, setInputMode] = useState('metric') // 'metric' | 'raw'
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  // Indikator untung/rugi live (sebelum klik Diagnosa)
  const liveMargin = hppMargin != null ? hppMargin : parseFloat(ctx.margin)
  const liveRoas = parseFloat(form.roas)
  const liveBEP = (!isNaN(liveMargin) && liveMargin > 0) ? Math.round((100 / liveMargin) * 100) / 100 : null
  const livePoas = (liveBEP != null && !isNaN(liveRoas)) ? Math.round(liveRoas * (liveMargin / 100) * 100) / 100 : null

  // periode (label) untuk tab Satu Kampanye — gaya Google Ads
  const [manRange, setManRange] = useState('last7')
  const [manFrom, setManFrom] = useState('')
  const [manTo, setManTo] = useState('')
  const [mFrom, mTo] = manRange === 'custom' ? [manFrom, manTo] : presetDates(manRange)
  const manPeriodLabel = fmtPeriodLabel(mFrom, mTo)
  const [campaignName, setCampaignName] = useState('')
  const pdfCtx = () => ({ ...ctx, platformLabel: PLATFORMS[ctx.platform], industryLabel: INDUSTRIES[ctx.industry] })

  // Tema (terang/gelap)
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem('ape_theme') || 'dark' } catch { return 'dark' } })
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem('ape_theme', theme) } catch { /* noop */ }
  }, [theme])

  // Auth
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthReady(true) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  // Riwayat (cloud)
  const [history, setHistory] = useState([])
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    if (!result) return
    const text = buildChatText(result, {
      campaignName, periodLabel: manPeriodLabel,
      platformLabel: PLATFORMS[ctx.platform], industryLabel: INDUSTRIES[ctx.industry],
    })
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true); setTimeout(() => setCopied(false), 1500)
    } catch {
      window.prompt('Salin teks ini:', text)
    }
  }
  const loadHistory = async () => {
    const { data, error } = await supabase.from('history').select('id, data').order('created_at', { ascending: true })
    if (!error && data) setHistory(data.map((r) => ({ ...r.data, dbId: r.id })))
  }
  useEffect(() => { if (session) loadHistory(); else setHistory([]) }, [session])

  const saveToHistory = async () => {
    if (!result || !session) return
    const entry = {
      id: Date.now(),
      savedAt: new Date().toISOString(),
      campaignName: campaignName.trim() || '(tanpa nama)',
      periodFrom: mFrom, periodTo: mTo, periodLabel: manPeriodLabel,
      platformLabel: PLATFORMS[ctx.platform], objective: ctx.objective,
      currency: result.currency, rate: result.rate,
      cpm: result.metrics.cpm, ctr: result.metrics.ctr, cpa: result.metrics.cpa, roas: result.metrics.roas,
      healthScore: result.healthScore, grade: result.grade, poas: result.poas, roiPct: result.roiPct,
      topIssue: result.diagnoses[0]?.title || '-',
      result,
    }
    const { error } = await supabase.from('history').insert({ user_id: session.user.id, data: entry })
    if (!error) { setSaved(true); setTimeout(() => setSaved(false), 1500); loadHistory() }
  }
  const deleteEntry = async (dbId) => { await supabase.from('history').delete().eq('id', dbId); loadHistory() }
  const clearHistory = async () => {
    if (!session || !confirm('Hapus semua riwayat?')) return
    await supabase.from('history').delete().eq('user_id', session.user.id)
    setHistory([])
  }
  const sortedHistory = [...history].sort((a, b) => (a.periodFrom || a.savedAt).localeCompare(b.periodFrom || b.savedAt))
  const [selHist, setSelHist] = useState(null)

  const handleDiagnose = () => {
    let keys = inputMode === 'metric'
      ? ['cpm', 'ctr', 'cpc', 'cvr', 'cpa', 'roas']
      : ['spend', 'impressions', 'clicks', 'conversions', 'revenue']
    if (ctx.objective !== 'conversion') keys = keys.filter((k) => k !== 'roas' && k !== 'cvr' && k !== 'revenue')
    if (!keys.some((k) => form[k] !== '' && form[k] != null)) {
      setError('Isi minimal satu kolom dulu.'); setResult(null); return
    }
    const active = {}
    keys.forEach((k) => { active[k] = form[k] })
    setError(''); setResult(diagnose({ ...ctx, ...active }))
  }

  const [rows, setRows] = useState(null)
  const [mapping, setMapping] = useState(null)
  const [csvError, setCsvError] = useState('')
  const [selected, setSelected] = useState(null)
  const [brand, setBrand] = useState('')
  const [fileName, setFileName] = useState('')

  // mode tren waktu
  const [tsRows, setTsRows] = useState(null)
  const [tsName, setTsName] = useState('')
  const [tsError, setTsError] = useState('')
  const [gran, setGran] = useState('daily')
  const [tsRange, setTsRange] = useState('all')
  const [tsFrom, setTsFrom] = useState('')
  const [tsTo, setTsTo] = useState('')
  const tsAnalysis = tsRows ? analyzeTimeSeries({ rows: tsRows, ctx, granularity: gran, range: tsRange, from: tsFrom, to: tsTo }) : null
  const pickPreset = (k) => { setTsRange(k); setTsFrom(''); setTsTo('') }

  const handleTsFile = (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // reset supaya upload file berikutnya selalu ke-trigger
    if (!file) return
    setTsName(file.name); setTsError(''); setTsRows(null)
    setTsRange('all'); setTsFrom(''); setTsTo(''); setGran('daily') // reset periode utk file baru
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (res) => setTsRows(res.data),
      error: () => setTsError('Gagal membaca file. Pastikan formatnya .csv'),
    })
  }
  // format nilai tren (sudah dalam mata uang input, tanpa konversi)
  const fmtTrend = (k, v) => {
    if (v == null) return '-'
    if (k === 'ctr') return `${v}%`
    if (k === 'roas') return `${v}x`
    if (k === 'cpm' || k === 'cpa' || k === 'spend')
      return ctx.currency === 'idr' ? `Rp${Math.round(v).toLocaleString('id-ID')}` : `$${v}`
    return Math.round(v).toLocaleString('id-ID')
  }
  const money = (v) => (v == null ? '-' : ctx.currency === 'idr' ? `Rp${Math.round(v).toLocaleString('id-ID')}` : `$${v}`)
  const count = (v) => (v == null ? '-' : Number.isInteger(v) ? v.toLocaleString('id-ID') : v.toLocaleString('id-ID', { maximumFractionDigits: 2 }))
  const SUMMARY_TILES = [
    ['impressions', 'Impr', count], ['spend', 'Cost', money], ['clicks', 'Clicks', count], ['ctr', 'CTR', (v) => (v == null ? '-' : `${v}%`)],
    ['cpm', 'CPM', money], ['conversions', 'Konversi', count], ['cpa', 'CPA', money], ['roas', 'ROAS', (v) => (v == null ? '-' : `${v}x`)],
  ]

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // reset supaya upload file berikutnya selalu ke-trigger
    if (!file) return
    setFileName(file.name); setCsvError(''); setRows(null); setSelected(null)
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (res) => {
        const { mapping, items } = mapRows(res.data, ctx)
        if (items.length === 0) {
          setCsvError('Tidak ada baris kampanye terbaca. Pastikan CSV punya kolom seperti Campaign name, Spend/Impressions, dll.')
          return
        }
        const diagnosed = items.map((it) => ({ name: it.name, result: diagnose(it.input) }))
        diagnosed.sort((a, b) => (a.result.healthScore ?? 999) - (b.result.healthScore ?? 999))
        setMapping(mapping); setRows(diagnosed)
      },
      error: () => setCsvError('Gagal membaca file. Pastikan formatnya .csv'),
    })
  }

  const handleExport = () => {
    generateReport({
      brand,
      context: { ...ctx, platformLabel: PLATFORMS[ctx.platform], industryLabel: INDUSTRIES[ctx.industry] },
      rows,
    })
  }

  if (!authReady) return <div className="min-h-screen flex items-center justify-center text-[color:var(--muted)]">Memuat…</div>
  if (!session) return <LoginScreen theme={theme} setTheme={setTheme} />

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="bg-[var(--surface)] border-b border-[color:var(--bd)] sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-5 py-3 flex items-center gap-3">
          <Logo size={38} />
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-[color:var(--strong)] leading-tight">Ads Performance Explainer</h1>
            <p className="text-[color:var(--muted)] text-xs">Diagnosa hasil iklan &amp; untung-rugi</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[color:var(--muted)] text-[11px] max-w-[140px] truncate">{session.user.email}</p>
            <button onClick={() => supabase.auth.signOut()} className="text-[color:var(--accent)] text-xs underline hover:text-[color:var(--accent)]">Keluar</button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-5 py-6">
        {/* Pengaturan */}
        <div className={`${card} p-5 mb-4`}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className={labelCls}>Platform</label>
              <select className={inputCls} value={ctx.platform} onChange={(e) => setCtx((c) => ({ ...c, platform: e.target.value, format: 'all' }))}>
                {Object.entries(PLATFORMS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Industri</label>
              <select className={inputCls} value={ctx.industry} onChange={(e) => setC('industry', e.target.value)}>
                {Object.entries(INDUSTRIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Objective</label>
              <select className={inputCls} value={ctx.objective} onChange={(e) => setC('objective', e.target.value)}>
                {Object.entries(OBJECTIVES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Mata uang</label>
              <select className={inputCls} value={ctx.currency} onChange={(e) => setC('currency', e.target.value)}>
                <option value="idr">Rupiah (Rp)</option>
                <option value="usd">Dollar ($)</option>
              </select>
            </div>
          </div>

          <button
            onClick={() => setShowAdvanced((v) => !v)}
            className="mt-3 text-xs text-[color:var(--muted)] hover:text-[color:var(--strong)] flex items-center gap-1 transition">
            <span>{showAdvanced ? '▲' : '▼'}</span>
            <span>{showAdvanced ? 'Sembunyikan' : 'Pengaturan lanjutan'} (format iklan, kurs, nama brand)</span>
          </button>

          {showAdvanced && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3 pt-3 border-t border-[color:var(--bd)]">
              <div>
                <label className={labelCls}>Format Iklan<Info text="Benchmark beda per format. Cth CTR rendah di Demand Gen/YouTube itu wajar, beda dengan Search." /></label>
                <select className={inputCls} value={ctx.format} onChange={(e) => setC('format', e.target.value)}>
                  {Object.entries(FORMATS[ctx.platform] || { all: 'Semua' }).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              {ctx.currency === 'idr' && (
                <div>
                  <label className={labelCls}>Kurs (Rp per $1)<Info text="Dipakai mengubah angka Rupiah ke USD agar bisa dibandingkan ke benchmark global. Biarkan default kalau ragu." /></label>
                  <NumberInput className={inputCls} placeholder="cth: 18.000" currency="idr" value={ctx.rate} onChange={(v) => setC('rate', v)} />
                </div>
              )}
              <div>
                <label className={labelCls}>Nama brand (untuk PDF)</label>
                <input type="text" className={inputCls} placeholder="cth: Sunflower Ads" value={brand} onChange={(e) => setBrand(e.target.value)} />
              </div>
            </div>
          )}
        </div>

        {/* Kalkulator Profitabilitas */}
        {ctx.objective === 'conversion' && (
          <div className={`${card} p-5 mb-4`}>
            <h2 className="font-semibold text-[color:var(--strong)] flex items-center gap-1.5">
              💰 Kalkulator Profitabilitas <span className="text-[color:var(--faint)] font-normal text-sm">(opsional)</span>
            </h2>
            <p className="text-xs text-[color:var(--muted)] mt-1 mb-3">Isi HPP &amp; harga jual → tools otomatis hitung <b>Break-Even ROAS</b> + vonis untung/boncos.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>HPP / modal ({curSym(ctx.currency)})<Info text={GLOSSARY.hpp} /></label>
                <NumberInput className={inputCls} placeholder="cth: 30.000" currency={ctx.currency} value={ctx.hpp} onChange={(v) => setC('hpp', v)} />
              </div>
              <div>
                <label className={labelCls}>Harga jual ({curSym(ctx.currency)})<Info text={GLOSSARY.price} /></label>
                <NumberInput className={inputCls} placeholder="cth: 75.000" currency={ctx.currency} value={ctx.price} onChange={(v) => setC('price', v)} />
              </div>
              <div>
                <label className={labelCls}>Margin (%)<Info text={GLOSSARY.margin} /></label>
                <NumberInput className={inputCls + (hppMargin != null ? ' text-[color:var(--good)] font-semibold' : '')}
                  placeholder="cth: 60" grouped={false}
                  value={hppMargin != null ? hppMargin : ctx.margin}
                  onChange={(v) => setC('margin', v)}
                  disabled={hppMargin != null} />
                <p className="text-[10px] text-[color:var(--muted)] mt-1">
                  {hppMargin != null ? 'otomatis dari HPP & harga jual' : 'isi langsung, atau pakai HPP + harga jual'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="inline-flex p-1 bg-[var(--surface)] rounded-xl mb-4">
          {[['manual', 'Satu Kampanye'], ['csv', 'Upload CSV'], ['trend', 'Tren Waktu'], ['riwayat', `Riwayat${history.length ? ` (${history.length})` : ''}`]].map(([k, lbl]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${tab === k ? 'bg-indigo-600 text-white' : 'text-[color:var(--muted)] hover:text-[color:var(--strong)]'}`}>
              {lbl}
            </button>
          ))}
        </div>

        {/* MANUAL */}
        {tab === 'manual' && (
          <>
            {/* Nama campaign + Periode */}
            <div className={`${card} p-4 mb-4`}>
              <div className="mb-3">
                <label className={labelCls}>Nama campaign</label>
                <input type="text" className={inputCls + ' sm:w-2/3'} placeholder="cth: Kerupuk Ikan Tenggiri - Prospecting"
                  value={campaignName} onChange={(e) => setCampaignName(e.target.value)} />
              </div>
              <label className={labelCls}>Periode data</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {[['today', 'Hari ini'], ['yesterday', 'Kemarin'], ['last7', '7 hari'], ['last14', '14 hari'], ['last30', '30 hari'], ['thisMonth', 'Bulan ini'], ['lastMonth', 'Bulan lalu']].map(([k, lbl]) => (
                  <button key={k} onClick={() => { setManRange(k); setManFrom(''); setManTo('') }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${manRange === k ? 'bg-indigo-600 text-white' : 'bg-[var(--surface)] text-[color:var(--muted)] hover:text-[color:var(--strong)]'}`}>
                    {lbl}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <div>
                  <label className={labelCls}>Dari tanggal</label>
                  <input type="date" className={inputCls} value={mFrom}
                    onChange={(e) => { setManFrom(e.target.value); setManTo(mTo); setManRange('custom') }} />
                </div>
                <div>
                  <label className={labelCls}>Sampai tanggal</label>
                  <input type="date" className={inputCls} value={mTo}
                    onChange={(e) => { setManTo(e.target.value); setManFrom(mFrom); setManRange('custom') }} />
                </div>
                <p className="text-xs text-[color:var(--muted)] pb-2">Periode: <span className="text-[color:var(--strong)] font-medium">{manPeriodLabel}</span></p>
              </div>
            </div>

            <div className={`${card} p-5 mb-4`}>
              {/* Pilih cara input */}
              <div className="inline-flex p-1 bg-[var(--surface)] rounded-lg mb-4">
                {[['metric', 'Metrik siap'], ['raw', 'Data mentah']].map(([k, lbl]) => (
                  <button key={k} onClick={() => setInputMode(k)}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${inputMode === k ? 'bg-indigo-600 text-white' : 'text-[color:var(--muted)] hover:text-[color:var(--strong)]'}`}>
                    {lbl}
                  </button>
                ))}
              </div>

              {inputMode === 'metric' ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Object.entries(METRIC_INFO).filter(([k]) => (k !== 'roas' && k !== 'cvr') || ctx.objective === 'conversion').map(([k, info]) => (
                    <div key={k}>
                      <label className={labelCls}>{info.label} ({unitOf(k, ctx.currency)})<Info text={GLOSSARY[k]} /></label>
                      <NumberInput className={inputCls} placeholder={info.hint} currency={ctx.currency}
                        grouped={k === 'cpm' || k === 'cpa' || k === 'cpc'}
                        value={form[k]} onChange={(v) => setF(k, v)} />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {[['spend', `Spend (${curSym(ctx.currency)})`], ['impressions', 'Impression'], ['clicks', 'Klik'], ['conversions', 'Konversi'], ['revenue', `Revenue (${curSym(ctx.currency)})`]].filter(([k]) => k !== 'revenue' || ctx.objective === 'conversion').map(([k, lbl]) => (
                      <div key={k}>
                        <label className={labelCls}>{lbl}</label>
                        <NumberInput className={inputCls} currency={ctx.currency} grouped={k !== 'conversions'} value={form[k]} onChange={(v) => setF(k, v)} />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-[color:var(--muted)] mt-2">CPM, CTR, CPA, ROAS, CVR &amp; AOV dihitung otomatis dari data ini — lebih akurat &amp; lengkap.</p>
                </>
              )}
              {inputMode === 'metric' && livePoas != null && (
                <div className={`mt-3 text-sm rounded-lg px-3 py-2 flex items-center gap-2 ${livePoas >= 1 ? 'bg-emerald-500/10 text-[color:var(--good)]' : 'bg-rose-500/10 text-[color:var(--bad)]'}`}>
                  <span className="font-bold">{livePoas >= 1 ? '✓ Untung' : '✕ Boncos'}</span>
                  <span className="text-[color:var(--muted)]">ROAS {liveRoas}x vs titik impas {liveBEP}x · POAS {livePoas}x</span>
                </div>
              )}
              {error && <p className="text-[color:var(--bad)] text-sm mt-3">{error}</p>}
              <button onClick={handleDiagnose} className="w-full mt-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition">Diagnosa</button>
            </div>
            {result && ctx.objective === 'conversion' && !result.profit && (
              <div className="text-xs text-[color:var(--muted)] bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-2.5 mb-3">
                Vonis <b>untung/boncos</b> belum muncul — isi <b>HPP &amp; harga jual</b> di Kalkulator Profitabilitas untuk dapat analisis lengkap.
              </div>
            )}
            {result && (
              <div className={`${card} p-5`}>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="font-semibold text-[color:var(--strong)]">Hasil Diagnosa</h2>
                    <p className="text-xs text-[color:var(--muted)]">Periode: {manPeriodLabel}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-end">
                    <button onClick={handleCopy}
                      className="py-1.5 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-semibold transition">
                      {copied ? '✓ Tersalin' : '📋 Salin (WA)'}
                    </button>
                    <button onClick={saveToHistory}
                      className="py-1.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition">
                      {saved ? '✓ Tersimpan' : '+ Simpan ke Riwayat'}
                    </button>
                    <button onClick={() => generateSingleReport({ brand, campaignName, periodLabel: manPeriodLabel, context: pdfCtx(), result })}
                      className="py-1.5 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-semibold transition">
                      Simpan PDF
                    </button>
                    <button onClick={handleDiagnose}
                      className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition">
                      ↻ Perbarui
                    </button>
                  </div>
                </div>
                <ResultDetail result={result} />
              </div>
            )}
            {!result && (
              <p className="text-center text-sm text-[color:var(--muted)] mt-2">
                Isi data di atas lalu klik <b>Diagnosa</b>. Baru pertama kali?{' '}
                <button onClick={() => setTab('panduan')} className="text-[color:var(--accent)] hover:underline font-medium">Buka Cara Pakai</button>
              </p>
            )}
          </>
        )}

        {/* CSV */}
        {tab === 'csv' && (
          <>
            <div className={`${card} p-5 mb-4`}>
              <label className={labelCls}>Upload CSV export dari Ads Manager (Meta / Google / TikTok)</label>
              <label className="flex items-center gap-3 px-4 py-6 border-2 border-dashed border-[color:var(--bd)] rounded-xl cursor-pointer hover:border-indigo-500 transition">
                <input type="file" accept=".csv" onChange={handleFile} className="hidden" />
                <span className="text-2xl">📁</span>
                <span className="text-sm text-[color:var(--muted)]">{fileName || 'Klik untuk pilih file CSV'}</span>
              </label>
              <p className="text-xs text-[color:var(--muted)] mt-2">Platform, industri &amp; margin di atas dipakai untuk semua kampanye dalam file.</p>
              {csvError && <p className="text-[color:var(--bad)] text-sm mt-3">{csvError}</p>}
            </div>

            {rows && (
              <div className={`${card} p-5`}>
                <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
                  <h2 className="font-semibold text-[color:var(--strong)]">{rows.length} kampanye <span className="text-[color:var(--muted)] font-normal text-sm">— terburuk dulu</span></h2>
                  <div className="flex items-end gap-2">
                    <div>
                      <label className={labelCls}>Nama brand (untuk PDF)</label>
                      <input className={inputCls + ' w-44'} placeholder="cth: Sunflower Ads" value={brand} onChange={(e) => setBrand(e.target.value)} />
                    </div>
                    <button onClick={handleExport} className="py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold whitespace-nowrap transition">
                      Simpan PDF
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[color:var(--muted)] text-xs uppercase tracking-wide border-b border-[color:var(--bd)]">
                        <th className="py-2 px-2 font-medium">Kampanye</th>
                        <th className="py-2 px-2 font-medium text-center">Skor</th>
                        <th className="py-2 px-2 font-medium text-center">Grade</th>
                        <th className="py-2 px-2 font-medium">Masalah utama</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => {
                        const r = row.result
                        const active = selected === i
                        return (
                          <tr key={i} onClick={() => setSelected(active ? null : i)}
                            className={`border-b border-[color:var(--bd)] cursor-pointer transition ${active ? 'bg-indigo-500/10' : 'hover:bg-[var(--field)]'}`}>
                            <td className="py-2.5 px-2 text-[color:var(--strong)]">{row.name}</td>
                            <td className="py-2.5 px-2 text-center font-bold" style={{ color: scoreHex(r.healthScore) }}>{r.healthScore ?? '-'}</td>
                            <td className="py-2.5 px-2 text-center">
                              <span className={`inline-block w-6 h-6 leading-6 rounded-full text-white text-xs font-bold ${GRADE_BG[r.grade] || GRADE_BG['-']}`}>{r.grade}</span>
                            </td>
                            <td className="py-2.5 px-2 text-[color:var(--text)]">{r.diagnoses[0].title}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {selected != null && (
                  <div className="mt-5 pt-5 border-t border-[color:var(--bd)]">
                    <h3 className="font-semibold text-[color:var(--accent)] mb-3">Detail: {rows[selected].name}</h3>
                    <ResultDetail result={rows[selected].result} />
                  </div>
                )}
                {mapping && (
                  <p className="text-xs text-[color:var(--faint)] mt-4">
                    Kolom terbaca: {Object.entries(mapping).map(([f, h]) => `${f}=${h}`).join(' · ') || '—'}
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {/* TREN WAKTU */}
        {tab === 'trend' && (
          <>
            <div className={`${card} p-5 mb-4`}>
              <label className={labelCls}>Upload CSV time-series (baris = tanggal). Idealnya kolom: Date, Spend, Impressions, Clicks, Conversions, Revenue.</label>
              <label className="flex items-center gap-3 px-4 py-6 border-2 border-dashed border-[color:var(--bd)] rounded-xl cursor-pointer hover:border-indigo-500 transition">
                <input type="file" accept=".csv" onChange={handleTsFile} className="hidden" />
                <span className="text-2xl">📈</span>
                <span className="text-sm text-[color:var(--muted)]">{tsName || 'Klik untuk pilih file CSV'}</span>
              </label>
              <p className="text-xs text-[color:var(--muted)] mt-2">Mata uang &amp; konteks di atas dipakai untuk diagnosa total periode.</p>
              {tsError && <p className="text-[color:var(--bad)] text-sm mt-3">{tsError}</p>}
              {tsAnalysis?.error && <p className="text-[color:var(--bad)] text-sm mt-3">{tsAnalysis.error}</p>}
            </div>

            {tsAnalysis && !tsAnalysis.error && (
              <div className={`${card} p-5`}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-[color:var(--strong)]">Tren Waktu</h2>
                  <button onClick={() => generateTrendReport({ brand, context: pdfCtx(), analysis: tsAnalysis })}
                    className="py-1.5 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-semibold transition">Simpan PDF</button>
                </div>
                {/* Preset periode */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {[['all', 'Semua'], ['last7', '7 hari'], ['last14', '14 hari'], ['last30', '30 hari'], ['month', 'Bulan ini']].map(([k, lbl]) => (
                    <button key={k} onClick={() => pickPreset(k)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${tsRange === k ? 'bg-indigo-600 text-white' : 'bg-[var(--surface)] text-[color:var(--muted)] hover:text-[color:var(--strong)]'}`}>
                      {lbl}
                    </button>
                  ))}
                </div>
                {/* Rentang tanggal custom */}
                <div className="flex flex-wrap items-end gap-2 mb-3">
                  <div>
                    <label className={labelCls}>Dari tanggal</label>
                    <input type="date" className={inputCls} min={tsAnalysis.bounds?.min} max={tsAnalysis.bounds?.max}
                      value={tsFrom} onChange={(e) => { setTsFrom(e.target.value); setTsRange('custom') }} />
                  </div>
                  <div>
                    <label className={labelCls}>Sampai tanggal</label>
                    <input type="date" className={inputCls} min={tsAnalysis.bounds?.min} max={tsAnalysis.bounds?.max}
                      value={tsTo} onChange={(e) => { setTsTo(e.target.value); setTsRange('custom') }} />
                  </div>
                  {tsRange === 'custom' && (
                    <button onClick={() => pickPreset('all')} className="py-2 px-3 text-sm text-[color:var(--muted)] hover:text-[color:var(--strong)]">Reset</button>
                  )}
                </div>
                <p className="text-xs text-[color:var(--muted)] mb-4">
                  {tsAnalysis.dateRange.label}: {tsAnalysis.dateRange.from} – {tsAnalysis.dateRange.to} ({tsAnalysis.dateRange.days} hari)
                </p>

                {/* Kartu ringkasan metrik */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                  {SUMMARY_TILES.map(([k, lbl, f]) => (
                    <div key={k} className="bg-[var(--field)] border border-[color:var(--bd)] rounded-xl px-3 py-2.5">
                      <div className="text-[11px] text-[color:var(--muted)]">{lbl}</div>
                      <div className="text-base font-bold text-[color:var(--strong)]">{f(tsAnalysis.summary[k])}</div>
                    </div>
                  ))}
                </div>

                {/* Toggle agregasi tren */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-[color:var(--text)] text-sm">Tren per {gran === 'weekly' ? 'minggu' : 'hari'}</h3>
                  <div className="inline-flex p-1 bg-[var(--surface)] rounded-lg">
                    {[['daily', 'Harian'], ['weekly', 'Mingguan']].map(([k, lbl]) => (
                      <button key={k} onClick={() => setGran(k)}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition ${gran === k ? 'bg-indigo-600 text-white' : 'text-[color:var(--muted)] hover:text-[color:var(--strong)]'}`}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>

                {tsAnalysis.notes.length > 0 && (
                  <div className="space-y-2 mb-5">
                    {tsAnalysis.notes.map((n, i) => (
                      <div key={i} className={`text-sm rounded-lg px-3 py-2 ${tsAnalysis.fatigue && i === 0 ? 'bg-rose-500/10 text-[color:var(--bad)] border border-rose-500/30' : 'bg-[var(--field)] text-[color:var(--text)] border border-[color:var(--bd)]'}`}>
                        {n}
                      </div>
                    ))}
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[color:var(--muted)] text-xs uppercase tracking-wide border-b border-[color:var(--bd)]">
                        <th className="py-2 px-2 font-medium">Metrik</th>
                        <th className="py-2 px-2 font-medium">Tren</th>
                        <th className="py-2 px-2 font-medium text-right">Awal → Akhir</th>
                        <th className="py-2 px-2 font-medium text-right">Perubahan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(TREND_METRICS).filter((k) => tsAnalysis.trends[k]).map((k) => {
                        const t = tsAnalysis.trends[k]
                        const col = t.good == null ? 'var(--muted)' : t.good ? 'var(--good)' : 'var(--bad)'
                        const arrow = t.dir === 'up' ? '▲' : t.dir === 'down' ? '▼' : '▬'
                        return (
                          <tr key={k} className="border-b border-[color:var(--bd)]">
                            <td className="py-2.5 px-2 text-[color:var(--strong)] font-medium">{TREND_METRICS[k]}</td>
                            <td className="py-2.5 px-2"><Sparkline series={t.series} color={col} /></td>
                            <td className="py-2.5 px-2 text-right text-[color:var(--muted)]">{fmtTrend(k, t.first)} → <span className="text-[color:var(--strong)]">{fmtTrend(k, t.second)}</span></td>
                            <td className="py-2.5 px-2 text-right font-semibold" style={{ color: col }}>
                              {arrow} {t.changePct > 0 ? '+' : ''}{t.changePct}%
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-5 pt-5 border-t border-[color:var(--bd)]">
                  <h3 className="font-semibold text-[color:var(--accent)] mb-3">Diagnosa total periode</h3>
                  <ResultDetail result={tsAnalysis.result} />
                </div>
              </div>
            )}
          </>
        )}

        {/* RIWAYAT */}
        {tab === 'riwayat' && (
          <div className={`${card} p-5`}>
            {sortedHistory.length === 0 ? (
              <div className="text-center py-12 text-[color:var(--muted)]">
                <p className="mb-1">Belum ada data tersimpan.</p>
                <p className="text-sm">Diagnosa di tab <b>Satu Kampanye</b>, lalu klik <b>+ Simpan ke Riwayat</b>. Tiap periode yang kamu simpan bisa dibandingkan di sini.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-[color:var(--strong)]">Riwayat ({sortedHistory.length})</h2>
                  <div className="flex items-center gap-3">
                    <button onClick={() => generateHistoryReport({ brand, history: sortedHistory })}
                      className="py-1.5 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-semibold transition">Simpan PDF</button>
                    <button onClick={clearHistory} className="text-xs text-[color:var(--bad)] hover:underline">Hapus semua</button>
                  </div>
                </div>
                <div className="flex items-center gap-4 mb-5 bg-[var(--field)] rounded-xl p-4 border border-[color:var(--bd)]">
                  <div>
                    <div className="text-[11px] text-[color:var(--muted)] mb-1">Tren Health Score (lama → baru)</div>
                    <Sparkline series={sortedHistory.map((h) => h.healthScore ?? 0)} color="#818cf8" />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[color:var(--muted)] text-xs uppercase tracking-wide border-b border-[color:var(--bd)]">
                        <th className="py-2 px-2 font-medium">Kampanye / Periode</th>
                        <th className="px-2 font-medium text-right">CTR</th>
                        <th className="px-2 font-medium text-right">CPA</th>
                        <th className="px-2 font-medium text-right">ROAS</th>
                        <th className="px-2 font-medium text-right">POAS</th>
                        <th className="px-2 font-medium text-center">Skor</th>
                        <th className="px-2 font-medium text-right">Δ vs lalu</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedHistory.map((h, i) => {
                        const prev = sortedHistory[i - 1]
                        const d = prev && h.healthScore != null && prev.healthScore != null ? h.healthScore - prev.healthScore : null
                        const active = selHist === h.id
                        return (
                          <tr key={h.id} onClick={() => setSelHist(active ? null : h.id)}
                            className={`border-b border-[color:var(--bd)] cursor-pointer transition ${active ? 'bg-indigo-500/10' : 'hover:bg-[var(--field)]'}`}>
                            <td className="py-2.5 px-2 text-[color:var(--strong)]">{h.campaignName || '-'}<div className="text-[10px] text-[color:var(--faint)]">{h.periodLabel} · {h.platformLabel}</div></td>
                            <td className="px-2 text-right text-[color:var(--text)]">{h.ctr != null ? `${h.ctr}%` : '-'}</td>
                            <td className="px-2 text-right text-[color:var(--text)]">{h.cpa != null ? fmt('cpa', h.cpa, h.currency) : '-'}</td>
                            <td className="px-2 text-right text-[color:var(--text)]">{h.roas != null ? `${h.roas}x` : '-'}</td>
                            <td className="px-2 text-right font-medium" style={{ color: h.poas == null ? 'var(--muted)' : h.poas >= 1 ? 'var(--good)' : 'var(--bad)' }}>{h.poas != null ? `${h.poas}x` : '-'}</td>
                            <td className="px-2 text-center font-bold" style={{ color: scoreHex(h.healthScore) }}>{h.healthScore ?? '-'}</td>
                            <td className="px-2 text-right font-semibold" style={{ color: d == null ? 'var(--muted)' : d >= 0 ? 'var(--good)' : 'var(--bad)' }}>{d == null ? '-' : `${d > 0 ? '+' : ''}${d}`}</td>
                            <td className="px-2 text-right"><button onClick={(e) => { e.stopPropagation(); deleteEntry(h.dbId) }} className="text-[color:var(--faint)] hover:text-[color:var(--bad)]" title="Hapus">✕</button></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-[color:var(--muted)] mt-4">Δ = selisih Health Score dibanding entri sebelumnya (urut periode). Hijau = membaik, merah = memburuk. Klik baris untuk lihat diagnosa lengkap.</p>

                {selHist != null && (() => {
                  const e = sortedHistory.find((h) => h.id === selHist)
                  if (!e) return null
                  return (
                    <div className="mt-5 pt-5 border-t border-[color:var(--bd)]">
                      <h3 className="font-semibold text-[color:var(--accent)] mb-3">Detail: {e.periodLabel}</h3>
                      {e.result
                        ? <ResultDetail result={e.result} />
                        : <p className="text-[color:var(--muted)] text-sm">Detail lengkap tidak tersedia untuk entri lama. Simpan ulang dari tab Satu Kampanye untuk dapat diagnosa penuh.</p>}
                    </div>
                  )
                })()}
              </>
            )}
          </div>
        )}

        {/* CARA PAKAI */}
        {tab === 'panduan' && (
          <div className="space-y-4">
            <button onClick={() => setTab('manual')} className="text-sm text-[color:var(--accent)] hover:underline font-medium">← Kembali ke tools</button>
            <div className={`${card} p-5`}>
              <h2 className="font-bold text-lg text-[color:var(--strong)] mb-1">Cara Pakai</h2>
              <p className="text-sm text-[color:var(--muted)]">Tools ini bantu kamu baca hasil iklan & tahu harus benerin apa — tanpa perlu jago angka.</p>
            </div>

            <div className={`${card} p-5`}>
              <h3 className="font-semibold text-[color:var(--strong)] mb-3">3 langkah cepat</h3>
              <ol className="space-y-2 text-sm text-[color:var(--text)] list-decimal pl-5">
                <li>Atur <b>Platform, Industri, Objective, Mata uang</b> di bar atas.</li>
                <li>Kalau objective <b>Conversion</b>, isi <b>HPP &amp; Harga jual</b> biar ketahuan untung atau boncos.</li>
                <li>Isi metrik (CPM/CTR/CPA/ROAS) atau pakai mode <b>Data mentah</b> → klik <b>Diagnosa</b>.</li>
              </ol>
            </div>

            <div className={`${card} p-5`}>
              <h3 className="font-semibold text-[color:var(--strong)] mb-3">Fungsi tiap tab</h3>
              <ul className="space-y-2 text-sm text-[color:var(--text)]">
                <li><b>Satu Kampanye</b> — cek 1 kampanye dari angka yang kamu masukkan manual.</li>
                <li><b>Upload CSV</b> — diagnosa banyak kampanye sekaligus dari file export Ads Manager.</li>
                <li><b>Tren Waktu</b> — lihat performa per periode (harian/mingguan) dari data harian + deteksi fatigue.</li>
                <li><b>Riwayat</b> — simpan hasil & bandingkan antar periode (naik/turun).</li>
              </ul>
            </div>

            <div className={`${card} p-5`}>
              <h3 className="font-semibold text-[color:var(--strong)] mb-3">Kamus istilah</h3>
              <div>
                {[['CPM', 'cpm'], ['CTR', 'ctr'], ['CPA', 'cpa'], ['ROAS', 'roas'], ['POAS', 'poas'], ['ROI', 'roi'], ['HPP', 'hpp'], ['Harga jual', 'price'], ['Margin', 'margin'], ['Health Score', 'health']].map(([lbl, k]) => (
                  <div key={k} className="py-2.5 border-b border-[color:var(--bd)] last:border-0">
                    <span className="font-semibold text-[color:var(--strong)]">{lbl}</span>
                    <p className="text-sm text-[color:var(--muted)] mt-0.5">{GLOSSARY[k]}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className={`${card} p-5`}>
              <h3 className="font-semibold text-[color:var(--strong)] mb-2">Tips</h3>
              <ul className="space-y-1.5 text-sm text-[color:var(--text)] list-disc pl-5">
                <li>Vonis <b>UNTUNG/BONCOS</b> cuma muncul kalau HPP &amp; harga jual diisi (objective Conversion).</li>
                <li>Lihat kartu <b>Simulasi Target</b> buat tahu ROAS/harga jual yang harus dikejar.</li>
                <li>Simpan tiap periode ke <b>Riwayat</b> biar bisa pantau naik/turun dari waktu ke waktu.</li>
                <li>Tiap hasil bisa di-<b>Simpan PDF</b> buat dikirim ke klien atau atasan.</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      <button onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        className="fixed bottom-5 right-5 w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg flex items-center justify-center text-xl z-50"
        title="Ganti tema (terang/gelap)">
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
    </div>
  )
}
