// src/lib/ui.js
// Konstanta UI + fungsi format (dipakai bersama oleh App & komponen).

export const TREND_METRICS = {
  spend: 'Spend', impressions: 'Impression', ctr: 'CTR',
  cpm: 'CPM', cpa: 'CPA', roas: 'ROAS', conversions: 'Konversi',
}

export const OBJECTIVES = {
  conversion: 'Conversion / Penjualan',
  traffic: 'Traffic',
  awareness: 'Awareness',
}

export const RATE = {
  good: { badge: 'bg-emerald-500/15 text-[color:var(--good)]', dot: 'bg-emerald-400', text: 'text-[color:var(--good)]' },
  avg: { badge: 'bg-amber-500/15 text-[color:var(--warn)]', dot: 'bg-amber-400', text: 'text-[color:var(--warn)]' },
  bad: { badge: 'bg-rose-500/15 text-[color:var(--bad)]', dot: 'bg-rose-400', text: 'text-[color:var(--bad)]' },
}
export const RATE_LABEL = { good: 'BAIK', avg: 'RATA-RATA', bad: 'BURUK' }

export const STATUS_STYLE = {
  untung: 'bg-emerald-500/10 border-emerald-500/40 text-[color:var(--good)]',
  tipis: 'bg-lime-500/10 border-lime-500/40 text-[color:var(--good)]',
  bep: 'bg-amber-500/10 border-amber-500/40 text-[color:var(--warn)]',
  boncos: 'bg-rose-500/10 border-rose-500/40 text-[color:var(--bad)]',
}

export const SEVERITY = {
  good: 'border-emerald-500', warning: 'border-amber-500',
  high: 'border-rose-500', neutral: 'border-indigo-500',
}

export const GRADE_BG = {
  A: 'bg-emerald-500', B: 'bg-lime-500', C: 'bg-amber-500',
  D: 'bg-orange-500', E: 'bg-rose-500', '-': 'bg-gray-500',
}

export const METRIC_INFO = {
  cpm: { label: 'CPM', hint: 'biaya / 1.000 tayang' },
  ctr: { label: 'CTR', hint: 'click-through rate' },
  cpc: { label: 'CPC', hint: 'biaya / klik' },
  cvr: { label: 'CVR', hint: 'konversi / klik' },
  cpa: { label: 'CPA', hint: 'biaya / konversi' },
  roas: { label: 'ROAS', hint: 'return on ad spend' },
}

export function scoreHex(s) {
  if (s == null) return 'var(--muted)'
  if (s >= 70) return 'var(--good)'
  if (s >= 55) return 'var(--warn)'
  if (s >= 40) return 'var(--orange)'
  return 'var(--bad)'
}

export const inputCls = 'w-full px-3 py-2 bg-[var(--field)] border border-[color:var(--bd)] rounded-lg text-[color:var(--strong)] text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
export const labelCls = 'block text-xs font-medium text-[color:var(--muted)] mb-1.5'
export const card = 'bg-[var(--surface)] border border-[color:var(--bd)] rounded-2xl'

export function fmt(k, v, currency = 'usd') {
  if (k === 'ctr' || k === 'cvr') return `${v}%`
  if (k === 'roas') return `${v}x`
  if (currency === 'idr') return `Rp${Math.round(v).toLocaleString('id-ID')}`
  return `$${v}`
}
export const curSym = (cur) => (cur === 'idr' ? 'Rp' : '$')
export const unitOf = (k, cur) => (k === 'ctr' || k === 'cvr' ? '%' : k === 'roas' ? 'x' : curSym(cur))
export const fmtMoney = (v, cur) => (v == null ? '-' : cur === 'idr' ? `Rp${Math.round(v).toLocaleString('id-ID')}` : `$${v}`)

// Penjelasan istilah untuk pemula
export const GLOSSARY = {
  cpm: 'CPM = biaya tiap 1.000 kali iklan tampil. Makin kecil makin murah menjangkau orang.',
  ctr: 'CTR = persen orang yang klik dari yang melihat iklan. Makin tinggi = iklan makin menarik.',
  cpc: 'CPC = biaya rata-rata per klik ke website. Makin kecil makin efisien menarik trafik.',
  cvr: 'CVR = persen pengunjung yang jadi beli setelah masuk website. Menilai landing page/penawaran.',
  cpa: 'CPA = biaya rata-rata untuk dapat 1 hasil/penjualan. Makin kecil makin efisien.',
  roas: 'ROAS = pendapatan ÷ biaya iklan. ROAS 3x = tiap Rp1 iklan balik Rp3 (belum potong modal).',
  poas: 'POAS = ROAS dikali margin. 1x = balik modal, di atas 1 = untung setelah modal.',
  roi: 'ROI = untung bersih atas biaya iklan, setelah modal (HPP). +20% = dari Rp100rb iklan balik Rp120rb.',
  hpp: 'HPP = modal/biaya pokok per produk (beli atau produksi), belum termasuk iklan.',
  price: 'Harga jual = harga produk ke pembeli. Margin = (harga jual − HPP) ÷ harga jual.',
  margin: 'Margin = persen untung dari harga jual sebelum biaya iklan. Dipakai cari titik impas ROAS.',
  health: 'Health Score = nilai keseluruhan 0–100 dari semua metrik. Makin tinggi makin sehat.',
}

// Teks laporan rapi untuk disalin ke WhatsApp/email
export function buildChatText(r, meta) {
  const L = { good: 'BAIK', avg: 'RATA-RATA', bad: 'BURUK' }
  const labels = { cpm: 'CPM', ctr: 'CTR', cpc: 'CPC', cvr: 'CVR', cpa: 'CPA', roas: 'ROAS' }
  const out = []
  out.push(`📊 LAPORAN IKLAN — ${meta.campaignName || 'Kampanye'}`)
  out.push(`Periode: ${meta.periodLabel || '-'}`)
  out.push(`Platform: ${meta.platformLabel}${meta.industryLabel ? ' · ' + meta.industryLabel : ''}`)
  out.push('')
  if (r.profit) {
    out.push(`${r.profit.label} — POAS ${r.poas}x · ROI ${r.roiPct > 0 ? '+' : ''}${r.roiPct}%`)
    out.push(r.profit.note)
    out.push('')
  }
  out.push(`Health Score: ${r.healthScore ?? '-'}/100 (Grade ${r.grade})`)
  out.push('')
  out.push('METRIK:')
  for (const k of ['cpm', 'ctr', 'cpc', 'cvr', 'cpa', 'roas']) {
    if (r.metrics[k] == null) continue
    const rt = r.ratings[k] ? ` [${L[r.ratings[k]]}]` : ''
    out.push(`• ${labels[k]}: ${fmt(k, r.metrics[k], r.currency)}${rt}`)
  }
  out.push('')
  out.push('DIAGNOSA & REKOMENDASI:')
  r.diagnoses.forEach((d, i) => {
    out.push(`${i + 1}. ${d.title}`)
    d.actions.forEach((a) => out.push(`   - ${a}`))
  })
  if (r.simulation) {
    out.push('')
    out.push(`TARGET: balik modal di ROAS ${r.simulation.roasBEP}x, untung sehat di ${r.simulation.roasHealthy}x.`)
  }
  out.push('')
  out.push('— dibuat dengan Ads Performance Explainer')
  return out.join('\n')
}

// Preset tanggal ala Google Ads (relatif ke hari ini). Kembali [from, to] 'YYYY-MM-DD'.
export function presetDates(preset) {
  const t = new Date()
  const iso = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
  const add = (base, n) => { const x = new Date(base); x.setDate(x.getDate() + n); return x }
  switch (preset) {
    case 'today': return [iso(t), iso(t)]
    case 'yesterday': { const y = add(t, -1); return [iso(y), iso(y)] }
    case 'last7': return [iso(add(t, -6)), iso(t)]
    case 'last14': return [iso(add(t, -13)), iso(t)]
    case 'last30': return [iso(add(t, -29)), iso(t)]
    case 'thisMonth': return [iso(new Date(t.getFullYear(), t.getMonth(), 1)), iso(t)]
    case 'lastMonth': return [iso(new Date(t.getFullYear(), t.getMonth() - 1, 1)), iso(new Date(t.getFullYear(), t.getMonth(), 0))]
    default: return ['', '']
  }
}
export function fmtPeriodLabel(from, to) {
  if (!from && !to) return '—'
  const opt = { day: 'numeric', month: 'short', year: 'numeric' }
  const f = from ? new Date(from + 'T00:00:00').toLocaleDateString('id-ID', opt) : null
  const tt = to ? new Date(to + 'T00:00:00').toLocaleDateString('id-ID', opt) : null
  if (f && tt) return f === tt ? f : `${f} – ${tt}`
  return f || tt
}
