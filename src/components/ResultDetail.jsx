// src/components/ResultDetail.jsx
// Panel detail hasil diagnosa (dipakai di Satu Kampanye, CSV, Tren, Riwayat).
import { METRIC_INFO, RATE, RATE_LABEL, STATUS_STYLE, SEVERITY, fmt, fmtMoney, GLOSSARY } from '../lib/ui.js'
import { HealthRing, Info } from './widgets.jsx'
import WhatIf from './WhatIf.jsx'

export default function ResultDetail({ result }) {
  return (
    <div>
      <div className="flex items-center gap-5 mb-5 pb-5 border-b border-[color:var(--bd)]">
        <HealthRing score={result.healthScore} grade={result.grade} />
        <div className="flex flex-wrap gap-2">
          {Object.entries(METRIC_INFO).map(([k, info]) => {
            const val = result.metrics[k]; const rt = result.ratings[k]
            if (val == null) return null
            const rc = RATE[rt] || {}
            return (
              <div key={k} className="bg-[var(--field)] border border-[color:var(--bd)] rounded-xl px-3 py-2">
                <div className="text-[10px] text-[color:var(--muted)]">{info.label}</div>
                <div className="text-sm font-semibold text-[color:var(--strong)]">{fmt(k, val, result.currency)}</div>
                {rt && (
                  <div className={`text-[10px] font-bold flex items-center gap-1 ${rc.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${rc.dot}`} />{RATE_LABEL[rt]}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {result.profit && (
        <div className={`rounded-xl p-4 mb-5 border ${STATUS_STYLE[result.profit.status] || ''}`}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-lg font-extrabold tracking-wide">{result.profit.label}</span>
            <span className="text-sm">POAS<Info text={GLOSSARY.poas} /> <b>{result.poas}x</b> &middot; ROI<Info text={GLOSSARY.roi} /> <b>{result.roiPct > 0 ? '+' : ''}{result.roiPct}%</b></span>
          </div>
          <p className="text-sm mt-1 opacity-90">{result.profit.note}</p>
        </div>
      )}

      {result.simulation && (
        <div className="bg-indigo-500/5 border border-indigo-500/30 rounded-xl p-4 mb-5">
          <h4 className="font-bold text-[color:var(--accent)] mb-2">Simulasi Target — biar untung</h4>
          <ul className="text-sm text-[color:var(--text)] space-y-1.5">
            <li>ROAS sekarang <b>{result.simulation.roasNow}x</b>. Balik modal di <b>{result.simulation.roasBEP}x</b>, untung sehat di <b className="text-[color:var(--good)]">{result.simulation.roasHealthy}x</b>.</li>
            {result.simulation.priceHealthy != null && (
              <li>Atau di ROAS sekarang, naikin <b>harga jual</b> dari {fmtMoney(result.simulation.priceNow, result.currency)} ke ~<b className="text-[color:var(--good)]">{fmtMoney(result.simulation.priceHealthy, result.currency)}</b> biar untung sehat.</li>
            )}
            {result.simulation.hppMaxBEP != null && (
              <li>Atau tekan <b>modal/HPP</b> di bawah <b className="text-[color:var(--good)]">{fmtMoney(result.simulation.hppMaxBEP, result.currency)}</b> (sekarang {fmtMoney(result.simulation.hppNow, result.currency)}) biar minimal balik modal.</li>
            )}
          </ul>
        </div>
      )}

      <h3 className="font-semibold mb-3 text-sm text-[color:var(--text)]">Diagnosa &amp; rekomendasi</h3>
      {result.diagnoses.map((d) => (
        <div key={d.id} className={`bg-[var(--field)] border-l-4 ${SEVERITY[d.severity] || 'border-indigo-500'} rounded-r-xl p-4 mb-3`}>
          <h4 className="font-bold text-[color:var(--strong)]">{d.title}</h4>
          <p className="text-[color:var(--muted)] text-sm mb-2 mt-0.5">{d.body}</p>
          <ul className="space-y-1">
            {d.actions.map((a, i) => (
              <li key={i} className="text-sm text-[color:var(--text)] flex gap-2">
                <span className="text-[color:var(--accent)] mt-0.5">→</span><span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {result.strengths && result.strengths.length > 0 && (
        <div className="mt-1">
          <h3 className="font-semibold mb-3 text-sm text-[color:var(--good)]">Yang sudah bagus — pertahankan</h3>
          {result.strengths.map((s) => (
            <div key={s.id} className="bg-emerald-500/5 border-l-4 border-emerald-500 rounded-r-xl p-4 mb-3">
              <h4 className="font-bold text-[color:var(--good)]">{s.title}</h4>
              <p className="text-[color:var(--text)] text-sm mb-2 mt-0.5">{s.body}</p>
              <ul className="space-y-1">
                {s.keep.map((a, i) => (
                  <li key={i} className="text-sm text-[color:var(--text)] flex gap-2">
                    <span className="text-[color:var(--good)] mt-0.5">✓</span><span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {result.metrics.roas != null && <WhatIf key={`${result.healthScore}-${result.metrics.roas}-${result.metrics.ctr}`} result={result} />}

      <p className="text-xs text-[color:var(--muted)] italic mt-4">
        Benchmark = patokan kasar lintas industri. Patokan terbaik tetap baseline akunmu sendiri.
      </p>
    </div>
  )
}
