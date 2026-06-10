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
  // Buang simbol mata uang, spasi, persen — tapi SIMPAN titik & koma dulu
  let s = String(v).trim().replace(/[^0-9.,\-]/g, "");
  if (!s || s === "-") return null;

  const dots = (s.match(/\./g) || []).length;
  const commas = (s.match(/,/g) || []).length;

  if (dots > 1) {
    // "1.234.567" (IDR: titik = ribuan) → hapus semua titik
    s = s.replace(/\./g, "");
    if (commas === 1) s = s.replace(",", "."); // "1.234,56" → "1234.56"
  } else if (commas > 1) {
    // "1,234,567" (US: koma = ribuan) → hapus semua koma
    s = s.replace(/,/g, "");
  } else if (dots === 1 && commas === 1) {
    const dotIdx = s.indexOf(".");
    const commaIdx = s.indexOf(",");
    if (dotIdx < commaIdx) {
      // "1.234,56" → titik ribuan, koma desimal
      s = s.replace(".", "").replace(",", ".");
    } else {
      // "1,234.56" → koma ribuan, titik desimal
      s = s.replace(",", "");
    }
  } else if (commas === 1) {
    // "1234,56" atau "1,234" — cek apakah koma = desimal atau ribuan
    const afterComma = s.split(",")[1];
    if (afterComma && afterComma.length === 3) {
      s = s.replace(",", ""); // "1,234" → ribuan
    } else {
      s = s.replace(",", "."); // "1234,56" → desimal
    }
  }
  // dots === 1, commas === 0: "1234.56" atau "2.5" — biarkan apa adanya

  const n = parseFloat(s);
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
