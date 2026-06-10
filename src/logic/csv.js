// src/logic/csv.js
// Petakan baris CSV export (Meta / Google / TikTok) ke input engine.
// Header tiap platform beda-beda, jadi kita cocokkan pakai daftar sinonim.

// Daftar sinonim header -> field internal. Semua dicocokkan lowercase.
const SYNONYMS = {
  name: ["campaign name", "campaign", "ad set name", "adset name", "ad name", "nama kampanye"],
  spend: ["amount spent", "amount spent (usd)", "spend", "cost", "total spent", "biaya"],
  impressions: ["impressions", "impr.", "impr", "impression"],
  clicks: ["clicks", "link clicks", "clicks (all)", "clicks (link)", "klik"],
  conversions: ["results", "conversions", "purchases", "conversions (all)", "konversi", "total conversions"],
  revenue: ["purchases conversion value", "conversion value", "website purchase roas conversion value", "revenue", "total conversion value", "conv. value", "nilai konversi"],
  cpm: ["cpm", "cpm (cost per 1,000 impressions)", "cpm (usd)"],
  ctr: ["ctr", "ctr (all)", "ctr (link click-through rate)", "ctr (%)"],
  cpa: ["cpa", "cost per result", "cost per purchase", "cost per conversion", "cost / conv."],
  roas: ["roas", "purchase roas", "website purchase roas", "return on ad spend", "purchase roas (return on ad spend)"],
};

function norm(s) {
  return String(s || "").trim().toLowerCase();
}

// Bangun peta: { field -> namaHeaderAsli }. Cocokkan persis dulu, lalu sebagian.
export function detectMapping(headers) {
  const map = {};
  const normHeaders = headers.map((h) => ({ raw: h, n: norm(h) }));

  for (const field of Object.keys(SYNONYMS)) {
    const syns = SYNONYMS[field];
    // 1) cocok persis
    let hit = normHeaders.find((h) => syns.includes(h.n));
    // 2) cocok sebagian (header mengandung sinonim)
    if (!hit) hit = normHeaders.find((h) => syns.some((s) => h.n.includes(s)));
    if (hit) map[field] = hit.raw;
  }
  return map;
}

function toNum(v) {
  if (v == null) return null;
  // buang simbol mata uang, koma ribuan, persen, spasi
  const cleaned = String(v).replace(/[^0-9.\-]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

// rows = array objek hasil PapaParse (header:true).
// Kembalikan { mapping, items:[{ name, input }] }
export function mapRows(rows, baseContext = {}) {
  if (!rows || rows.length === 0) return { mapping: {}, items: [] };
  const headers = Object.keys(rows[0]);
  const mapping = detectMapping(headers);

  const items = rows
    .map((row, i) => {
      const get = (field) => (mapping[field] ? row[mapping[field]] : undefined);
      const input = {
        ...baseContext, // platform, industry, objective, margin dari pilihan user
        spend: toNum(get("spend")),
        impressions: toNum(get("impressions")),
        clicks: toNum(get("clicks")),
        conversions: toNum(get("conversions")),
        revenue: toNum(get("revenue")),
        cpm: toNum(get("cpm")),
        ctr: toNum(get("ctr")),
        cpa: toNum(get("cpa")),
        roas: toNum(get("roas")),
      };
      const name = (mapping.name ? row[mapping.name] : null) || `Baris ${i + 1}`;
      return { name, input };
    })
    // buang baris kosong / total
    .filter((it) => {
      const v = it.input;
      const hasData = [v.spend, v.impressions, v.clicks, v.cpm, v.ctr, v.cpa, v.roas].some((x) => x != null);
      const isTotal = /total|grand total|jumlah/i.test(it.name);
      return hasData && !isTotal;
    });

  return { mapping, items };
}
