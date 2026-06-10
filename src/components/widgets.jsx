// src/components/widgets.jsx
// Komponen UI kecil yang dipakai berulang.
import { scoreHex } from '../lib/ui.js'

// Input angka dengan pemisah ribuan (ikut mata uang). Simpan nilai mentah
// (digit + '.' desimal) di state; tampilkan terformat.
// grouped=true: angka uang/jumlah pakai pemisah ribuan ikut mata uang.
// grouped=false: rasio (CTR/ROAS/margin) -> desimal titik biasa, tanpa ribuan.
export function NumberInput({ value, onChange, currency = 'idr', grouped = true, ...props }) {
  const groupSep = grouped ? (currency === 'idr' ? '.' : ',') : ''
  const decSep = grouped ? (currency === 'idr' ? ',' : '.') : '.'
  const format = (raw) => {
    if (raw === '' || raw == null) return ''
    const [int, dec] = String(raw).split('.')
    const g = grouped ? String(int).replace(/\B(?=(\d{3})+(?!\d))/g, groupSep) : String(int)
    return dec != null ? g + decSep + dec : g
  }
  const parse = (str) => {
    let s = str
    if (grouped && groupSep) s = s.split(groupSep).join('')
    if (decSep !== '.') s = s.split(decSep).join('.')
    s = s.replace(/[^0-9.]/g, '')
    const i = s.indexOf('.')
    if (i !== -1) s = s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, '') // satu titik desimal
    return s
  }
  return <input {...props} type="text" inputMode="decimal" value={format(value)} onChange={(e) => onChange(parse(e.target.value))} />
}

// Sparkline kecil dari deret angka
export function Sparkline({ series, color = '#818cf8' }) {
  if (!series || series.length < 2) return null
  const w = 80, h = 24, min = Math.min(...series), max = Math.max(...series)
  const rng = max - min || 1
  const pts = series.map((v, i) => `${(i / (series.length - 1)) * w},${h - ((v - min) / rng) * h}`).join(' ')
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

// Ikon "?" dengan tooltip penjelasan
export function Info({ text }) {
  return (
    <span className="relative inline-flex group align-middle ml-1">
      <span className="w-3.5 h-3.5 inline-flex items-center justify-center rounded-full bg-[var(--bd)] text-[color:var(--muted)] text-[9px] font-bold cursor-help select-none">?</span>
      <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:block w-48 bg-[var(--surface)] border border-[color:var(--bd)] text-[color:var(--text)] text-[11px] font-normal normal-case rounded-lg p-2 shadow-xl z-50 leading-snug">
        {text}
      </span>
    </span>
  )
}

// Ring skor (SVG)
export function HealthRing({ score, grade }) {
  const r = 38, c = 2 * Math.PI * r
  const pct = score == null ? 0 : Math.max(0, Math.min(100, score)) / 100
  const col = scoreHex(score)
  return (
    <div className="relative" style={{ width: 96, height: 96 }}>
      <svg width="96" height="96" className="-rotate-90">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#374151" strokeWidth="8" />
        <circle cx="48" cy="48" r={r} fill="none" stroke={col} strokeWidth="8"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color: col }}>{score ?? '-'}</span>
        <span className="text-[10px] text-[color:var(--muted)] -mt-0.5">Grade {grade}</span>
      </div>
    </div>
  )
}

// Logo aplikasi (SVG, gak butuh file gambar)
export function Logo({ size = 36 }) {
  return (
    <div className="rounded-xl flex items-center justify-center shadow-sm shrink-0"
      style={{ width: size, height: size, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
      <svg width={Math.round(size * 0.56)} height={Math.round(size * 0.56)} viewBox="0 0 24 24" fill="none">
        <rect x="3" y="12" width="4.5" height="9" rx="1.2" fill="#fff" fillOpacity="0.85" />
        <rect x="9.75" y="8" width="4.5" height="13" rx="1.2" fill="#fff" fillOpacity="0.9" />
        <rect x="16.5" y="4" width="4.5" height="17" rx="1.2" fill="#fff" />
        <path d="M4 8.5 L11 5 L16 7 L21 3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.65" />
      </svg>
    </div>
  )
}
