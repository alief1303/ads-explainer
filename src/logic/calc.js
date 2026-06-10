// src/logic/calc.js
// Hitung metrik turunan dari data mentah.
// User boleh isi metrik langsung (cpm/ctr/cpa/roas) ATAU data mentah
// (spend, impressions, clicks, conversions, revenue). Fungsi ini
// melengkapi metrik yang bisa dihitung.

function num(v) {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

// input bisa berisi sebagian field saja.
export function deriveMetrics(input) {
  const spend = num(input.spend);
  const impressions = num(input.impressions);
  const clicks = num(input.clicks);
  const conversions = num(input.conversions);
  const revenue = num(input.revenue);

  // Mulai dari metrik yang diisi langsung.
  const m = {
    cpm: num(input.cpm),
    ctr: num(input.ctr),
    cpc: num(input.cpc),
    cvr: num(input.cvr),
    cpa: num(input.cpa),
    roas: num(input.roas),
    aov: num(input.aov),
  };

  // Hitung dari data mentah kalau tersedia (tidak menimpa input langsung).
  if (m.cpm == null && spend != null && impressions)
    m.cpm = (spend / impressions) * 1000;

  if (m.ctr == null && clicks != null && impressions)
    m.ctr = (clicks / impressions) * 100;

  if (m.cpc == null && spend != null && clicks)
    m.cpc = spend / clicks;

  if (m.cvr == null && conversions != null && clicks)
    m.cvr = (conversions / clicks) * 100;

  if (m.cpa == null && spend != null && conversions)
    m.cpa = spend / conversions;

  if (m.roas == null && revenue != null && spend)
    m.roas = revenue / spend;

  if (m.aov == null && revenue != null && conversions)
    m.aov = revenue / conversions;

  // Turunan tambahan dari metrik (kalau memungkinkan).
  if (m.cpc == null && m.cpm != null && m.ctr)
    m.cpc = m.cpm / (m.ctr * 10); // CPC = CPM / (CTR% * 10)

  // Bulatkan rapi.
  Object.keys(m).forEach((k) => {
    if (m[k] != null) m[k] = Math.round(m[k] * 100) / 100;
  });

  return m;
}
