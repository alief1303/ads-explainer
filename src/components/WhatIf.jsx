// src/components/WhatIf.jsx
// Simulasi What-If: geser CTR/CVR (atau ROAS) -> lihat dampak ke untung.
import { useState } from 'react'

export default function WhatIf({ result }) {
  const baseRoas = result.metrics.roas
  const margin = result.breakEvenRoas ? 100 / result.breakEvenRoas : null
  const baseCtr = result.metrics.ctr
  const baseCvr = result.metrics.cvr
  const useCtr = baseCtr != null
  const useCvr = baseCvr != null
  const noLever = !useCtr && !useCvr
  const [ctrM, setCtrM] = useState(100)
  const [cvrM, setCvrM] = useState(100)
  const [roasM, setRoasM] = useState(100)
  if (baseRoas == null) return null

  const factor = noLever ? roasM / 100 : (useCtr ? ctrM / 100 : 1) * (useCvr ? cvrM / 100 : 1)
  const newRoas = Math.round(baseRoas * factor * 100) / 100
  const newPoas = margin != null ? Math.round(newRoas * (margin / 100) * 100) / 100 : null
  const newRoi = newPoas != null ? Math.round((newPoas - 1) * 1000) / 10 : null
  const good = newPoas == null ? null : newPoas >= 1

  const slider = (label, val, set, baseVal, suffix) => (
    <div className="mb-3">
      <div className="flex justify-between text-xs text-[color:var(--muted)] mb-1">
        <span>{label}</span>
        <span className="text-[color:var(--strong)] font-medium">
          {baseVal}{suffix} → {Math.round(baseVal * (val / 100) * 100) / 100}{suffix} <span className={val >= 100 ? 'text-[color:var(--good)]' : 'text-[color:var(--bad)]'}>({val - 100 >= 0 ? '+' : ''}{val - 100}%)</span>
        </span>
      </div>
      <input type="range" min="50" max="200" step="5" value={val} onChange={(e) => set(+e.target.value)} className="w-full accent-indigo-600" />
    </div>
  )

  return (
    <div className="bg-[var(--field)] border border-[color:var(--bd)] rounded-xl p-4 mb-3">
      <h4 className="font-bold text-[color:var(--strong)] mb-1">Simulasi What-If</h4>
      <p className="text-xs text-[color:var(--muted)] mb-3">Geser untuk lihat dampak ke untung kalau metrik membaik/memburuk.</p>
      {noLever
        ? slider('ROAS', roasM, setRoasM, baseRoas, 'x')
        : (<>{useCtr && slider('CTR', ctrM, setCtrM, baseCtr, '%')}{useCvr && slider('CVR', cvrM, setCvrM, baseCvr, '%')}</>)}
      <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-[color:var(--bd)] text-sm">
        <div><span className="text-[color:var(--muted)]">ROAS: </span><b>{baseRoas}x → {newRoas}x</b></div>
        {newPoas != null && <div><span className="text-[color:var(--muted)]">POAS: </span><b style={{ color: good ? 'var(--good)' : 'var(--bad)' }}>{newPoas}x</b></div>}
        {newRoi != null && <div><span className="text-[color:var(--muted)]">ROI: </span><b style={{ color: newRoi >= 0 ? 'var(--good)' : 'var(--bad)' }}>{newRoi > 0 ? '+' : ''}{newRoi}%</b></div>}
        {newPoas != null && <div className="font-bold" style={{ color: good ? 'var(--good)' : 'var(--bad)' }}>{good ? 'UNTUNG' : 'BONCOS'}</div>}
      </div>
    </div>
  )
}
