// src/logic/timeseries.js
// Analisa data time-series iklan (baris = tanggal). Agregasi harian/mingguan,
// hitung metrik per periode, tren naik/turun, deteksi fatigue, dan diagnosa total.
import { diagnose } from "./diagnose.js";

const COL_SYN = {
  date: ["date", "day", "tanggal", "reporting starts", "hari"],
  spend: ["amount spent", "spend", "cost", "biaya", "amount spent (usd)"],
  impressions: ["impressions", "impr.", "impr", "impression"],
  clicks: ["clicks", "link clicks", "klik", "clicks (all)"],
  conversions: ["results", "conversions", "purchases", "konversi"],
  revenue: ["purchases conversion value", "conversion value", "revenue", "nilai konversi", "conv. value"],
  cpm: ["cpm"],
  ctr: ["ctr", "ctr (all)", "ctr (link click-through rate)"],
  cpa: ["cpa", "cost per result", "cost per purchase"],
  roas: ["roas", "purchase roas", "website purchase roas"],
};

const norm = (s) => String(s || "").trim().toLowerCase();
function toNum(v) {
  if (v == null) return null;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? null : n;
}

export function detectCols(headers) {
  const map = {};
  const H = headers.map((h) => ({ raw: h, n: norm(h) }));
  for (const field of Object.keys(COL_SYN)) {
    const syns = COL_SYN[field];
    let hit = H.find((h) => syns.includes(h.n)) || H.find((h) => syns.some((s) => h.n.includes(s)));
    if (hit) map[field] = hit.raw;
  }
  return map;
}

function parseDate(s) {
  if (!s) return null;
  const d = new Date(String(s).replace(/^[A-Za-z]{3},\s*/, "")); // buang "Mon, "
  if (!isNaN(d)) return d;
  // coba dd/mm/yyyy atau dd-mm-yyyy
  const m = String(s).match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (m) return new Date(+m[3] < 100 ? 2000 + +m[3] : +m[3], +m[2] - 1, +m[1]);
  return null;
}

// kunci minggu ISO (tahun-Www)
function weekKey(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = (t.getUTCDay() + 6) % 7; // Senin=0
  t.setUTCDate(t.getUTCDate() - day + 3);
  const firstThu = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((t - firstThu) / 86400000 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

// hitung metrik turunan dari jumlah mentah satu periode
function metricsFromSums(s) {
  const m = {};
  if (s.impressions) m.cpm = s.spend != null ? (s.spend / s.impressions) * 1000 : null;
  if (s.impressions) m.ctr = s.clicks != null ? (s.clicks / s.impressions) * 100 : null;
  if (s.clicks) m.cvr = s.conversions != null ? (s.conversions / s.clicks) * 100 : null;
  if (s.conversions) m.cpa = s.spend != null ? s.spend / s.conversions : null;
  if (s.spend) m.roas = s.revenue != null ? s.revenue / s.spend : null;
  if (s.conversions) m.aov = s.revenue != null ? s.revenue / s.conversions : null;
  // fallback: metrik langsung kalau jumlah mentah tak ada
  ["cpm", "ctr", "cpa", "roas"].forEach((k) => { if (m[k] == null && s[k] != null) m[k] = s[k]; });
  Object.keys(m).forEach((k) => { if (m[k] != null) m[k] = Math.round(m[k] * 100) / 100; });
  return m;
}

const UP_GOOD = { ctr: true, roas: true, clicks: true, impressions: true, conversions: true, revenue: true, cvr: true, aov: true, cpm: false, cpa: false, cpc: false };

// tren: rata-rata paruh pertama vs paruh kedua
function trendOf(periods, key) {
  const vals = periods.map((p) => p.metrics[key] ?? p.raw[key]).filter((v) => v != null);
  if (vals.length < 2) return null;
  const mid = Math.floor(vals.length / 2);
  const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const first = avg(vals.slice(0, mid || 1));
  const second = avg(vals.slice(mid));
  const changePct = first ? Math.round(((second - first) / Math.abs(first)) * 1000) / 10 : 0;
  const dir = changePct > 2 ? "up" : changePct < -2 ? "down" : "flat";
  const good = dir === "flat" ? null : UP_GOOD[key] === (dir === "up");
  return { first: Math.round(first * 100) / 100, second: Math.round(second * 100) / 100, changePct, dir, good, series: vals };
}

const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

// filter baris sesuai preset ATAU rentang tanggal custom
function filterRange(parsed, range, customFrom, customTo) {
  if (range === "custom") {
    const f = customFrom ? new Date(customFrom + "T00:00:00") : null;
    const t = customTo ? new Date(customTo + "T23:59:59") : null;
    return parsed.filter((p) => (!f || p.date >= f) && (!t || p.date <= t));
  }
  if (!range || range === "all") return parsed;
  const max = parsed[parsed.length - 1].date;
  let from;
  if (range === "last7") from = addDays(max, -6);
  else if (range === "last14") from = addDays(max, -13);
  else if (range === "last30") from = addDays(max, -29);
  else if (range === "month") from = new Date(max.getFullYear(), max.getMonth(), 1);
  else return parsed;
  return parsed.filter((p) => p.date >= from);
}

const RANGE_LABEL = {
  all: "Semua data", last7: "7 hari terakhir", last14: "14 hari terakhir",
  last30: "30 hari terakhir", month: "Bulan ini", custom: "Periode pilihan",
};

export function analyzeTimeSeries({ rows, ctx, granularity = "daily", range = "all", from = "", to = "" }) {
  if (!rows || rows.length === 0) return { error: "Data kosong." };
  const headers = Object.keys(rows[0]);
  const map = detectCols(headers);
  if (!map.date) return { error: "Kolom tanggal tidak ketemu. Pastikan ada kolom Date/Tanggal." };

  // ambil & urutkan baris valid
  const all = rows
    .map((r) => {
      const d = parseDate(r[map.date]);
      if (!d) return null;
      const get = (f) => (map[f] ? toNum(r[map[f]]) : null);
      return { date: d, spend: get("spend"), impressions: get("impressions"), clicks: get("clicks"), conversions: get("conversions"), revenue: get("revenue"), cpm: get("cpm"), ctr: get("ctr"), cpa: get("cpa"), roas: get("roas") };
    })
    .filter(Boolean)
    .sort((a, b) => a.date - b.date);

  if (all.length === 0) return { error: "Tidak ada tanggal valid terbaca." };
  const iso = (d) => d.toISOString().slice(0, 10);
  const bounds = { min: iso(all[0].date), max: iso(all[all.length - 1].date) };
  const parsed = filterRange(all, range, from, to);
  if (parsed.length === 0) return { error: "Tidak ada data di periode ini.", bounds };

  // grup ke periode
  const buckets = new Map();
  const FIELDS = ["spend", "impressions", "clicks", "conversions", "revenue", "cpm", "ctr", "cpa", "roas"];
  for (const row of parsed) {
    const key = granularity === "weekly" ? weekKey(row.date) : row.date.toISOString().slice(0, 10);
    if (!buckets.has(key)) buckets.set(key, { _dates: [], _count: 0 });
    const b = buckets.get(key);
    b._dates.push(row.date); b._count++;
    for (const f of FIELDS) if (row[f] != null) b[f] = (b[f] || 0) + row[f];
  }

  // untuk metrik rate (cpm/ctr/cpa/roas) yang diisi langsung: pakai rata-rata, bukan jumlah
  const periods = [...buckets.entries()].map(([key, b]) => {
    const raw = { spend: b.spend ?? null, impressions: b.impressions ?? null, clicks: b.clicks ?? null, conversions: b.conversions ?? null, revenue: b.revenue ?? null };
    ["cpm", "ctr", "cpa", "roas"].forEach((k) => { if (b[k] != null) raw[k] = b[k] / b._count; });
    const metrics = metricsFromSums(raw);
    const start = b._dates[0];
    const label = granularity === "weekly" ? key.replace("-W", " Minggu ") : start.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
    return { key, label, date: start, raw, metrics };
  });

  // total seluruh periode -> diagnosa
  const totalRaw = {};
  for (const f of ["spend", "impressions", "clicks", "conversions", "revenue"]) {
    const sum = parsed.reduce((acc, r) => (r[f] != null ? acc + r[f] : acc), null);
    if (sum != null) totalRaw[f] = sum;
  }
  const result = diagnose({ ...ctx, ...totalRaw });

  // kartu ringkasan (dalam mata uang input, tanpa normalisasi)
  const rnd = (v) => (v == null ? null : Math.round(v * 100) / 100);
  const s = totalRaw;
  const summary = {
    impressions: s.impressions ?? null,
    spend: s.spend ?? null,
    clicks: s.clicks ?? null,
    conversions: s.conversions ?? null,
    revenue: s.revenue ?? null,
    ctr: s.clicks != null && s.impressions ? rnd((s.clicks / s.impressions) * 100) : null,
    cpm: s.spend != null && s.impressions ? Math.round((s.spend / s.impressions) * 1000) : null,
    cpc: s.spend != null && s.clicks ? Math.round(s.spend / s.clicks) : null,
    cpa: s.spend != null && s.conversions ? Math.round(s.spend / s.conversions) : null,
    roas: s.revenue != null && s.spend ? rnd(s.revenue / s.spend) : null,
  };
  const pStart = parsed[0].date, pEnd = parsed[parsed.length - 1].date;
  const dateRange = {
    label: RANGE_LABEL[range] || "Semua data",
    from: pStart.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }),
    to: pEnd.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }),
    days: parsed.length,
  };

  // tren tiap metrik
  const trendKeys = ["spend", "impressions", "ctr", "cpm", "cpa", "roas", "conversions"];
  const trends = {};
  for (const k of trendKeys) {
    const t = trendOf(periods, k);
    if (t) trends[k] = t;
  }

  // deteksi fatigue: CTR turun sementara impression naik (frequency proxy)
  const fatigue = !!(trends.ctr && trends.ctr.dir === "down" && trends.impressions && trends.impressions.dir === "up");

  // catatan ringkas
  const notes = [];
  if (fatigue) notes.push("Indikasi fatigue: CTR menurun padahal impression naik — kreatif mulai jenuh, saatnya refresh.");
  if (trends.roas) {
    if (trends.roas.dir === "down") notes.push(`ROAS cenderung turun (${trends.roas.changePct}%) sepanjang periode.`);
    else if (trends.roas.dir === "up") notes.push(`ROAS cenderung naik (${trends.roas.changePct}%) — momentum bagus.`);
  }
  if (trends.cpa && trends.cpa.dir === "up") notes.push(`CPA makin mahal (${trends.cpa.changePct}%) — biaya per hasil naik.`);

  return { map, granularity, range, bounds, dateRange, summary, periods, totalRaw, result, trends, fatigue, notes };
}
