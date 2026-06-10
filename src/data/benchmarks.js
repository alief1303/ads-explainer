// src/data/benchmarks.js
// Tabel benchmark per platform & industri.
// Format tiap metrik: [batas_buruk, batas_bagus]
//  - cpm & cpa: makin RENDAH makin bagus  -> [buruk_tinggi, bagus_rendah]
//  - ctr & roas: makin TINGGI makin bagus  -> [buruk_rendah, bagus_tinggi]
// Angka = median lintas industri 2025/2026 (USD). Sesuaikan dengan data akunmu.

export const PLATFORMS = {
  meta: "Meta (Facebook / Instagram)",
  google: "Google Ads (Search)",
  tiktok: "TikTok",
  marketplace: "Marketplace (Shopee / TikTok Shop)",
};

export const INDUSTRIES = {
  general: "Umum / Lainnya",
  ecommerce: "E-commerce / Retail",
  fashion: "Fashion & Apparel",
  fnb: "Makanan & Minuman",
  beauty: "Kecantikan & Skincare",
  education: "Edukasi / Kursus",
  finance: "Keuangan & Asuransi",
};

// Format iklan per platform (untuk dropdown). 'all' = campuran/umum.
export const FORMATS = {
  meta: { all: "Semua / Campuran", feed: "Feed", reels: "Reels / Stories", advantage: "Advantage+ Shopping" },
  google: { all: "Semua / Campuran", search: "Search", pmax: "Performance Max", demandgen: "Demand Gen", youtube: "YouTube", display: "Display" },
  tiktok: { all: "Semua / Campuran", infeed: "In-Feed", spark: "Spark Ads" },
  marketplace: { all: "Semua" },
};

// Override benchmark per format (hanya metrik yang beda; sisanya warisi general/industri).
const FORMAT_BENCH = {
  meta: {
    feed: { ctr: [1, 3.2] },
    reels: { ctr: [0.8, 2.5], cpm: [10, 5] },
    advantage: { roas: [2.2, 4.5], cpa: [40, 20] },
  },
  google: {
    search: { ctr: [2, 6], cpc: [3.5, 1] },
    pmax: { ctr: [0.8, 3], cpm: [25, 8] },
    demandgen: { ctr: [0.3, 1], cpm: [15, 5], cpc: [1.5, 0.5] },
    youtube: { ctr: [0.3, 1], cpm: [12, 4] },
    display: { ctr: [0.1, 0.7], cpm: [10, 2], cpc: [1, 0.3] },
  },
  tiktok: {
    infeed: { ctr: [0.5, 1.5] },
    spark: { ctr: [0.8, 2] },
  },
  marketplace: {},
};

// benchmark[platform][industri] = { cpm, ctr, cpa, roas }
// Industri yang tidak terdaftar otomatis pakai "general".
export const BENCHMARKS = {
  meta: {
    general:   { cpm: [20, 8],  ctr: [1, 3],   cpa: [50, 25], roas: [1.5, 3], cpc: [2, 0.6], cvr: [1, 3] },
    ecommerce: { cpm: [22, 9],  ctr: [1, 3.2], cpa: [45, 22], roas: [2, 4] },
    fashion:   { cpm: [20, 8],  ctr: [1.2, 3.5], cpa: [40, 20], roas: [2.2, 4.5] },
    fnb:       { cpm: [15, 6],  ctr: [1, 3],   cpa: [35, 18], roas: [1.8, 3.5] },
    beauty:    { cpm: [21, 9],  ctr: [1.1, 3.2], cpa: [42, 21], roas: [2, 4] },
    education: { cpm: [25, 10], ctr: [0.9, 2.5], cpa: [60, 30], roas: [1.5, 3] },
    finance:   { cpm: [30, 12], ctr: [0.8, 2.2], cpa: [80, 40], roas: [1.3, 2.5] },
  },
  google: {
    general:   { cpm: [30, 10], ctr: [2, 5],   cpa: [60, 30], roas: [2, 4], cpc: [3, 1], cvr: [2, 5] },
    ecommerce: { cpm: [28, 9],  ctr: [2.5, 6], cpa: [50, 25], roas: [2.5, 5] },
    finance:   { cpm: [40, 15], ctr: [2, 5],   cpa: [90, 45], roas: [1.8, 3.5] },
  },
  tiktok: {
    general:   { cpm: [15, 6],  ctr: [0.5, 1.5], cpa: [45, 20], roas: [1.3, 2.5], cpc: [1, 0.3], cvr: [1, 2.5] },
    ecommerce: { cpm: [14, 5],  ctr: [0.6, 1.6], cpa: [40, 18], roas: [1.5, 3] },
    fashion:   { cpm: [13, 5],  ctr: [0.7, 1.8], cpa: [38, 17], roas: [1.6, 3.2] },
    beauty:    { cpm: [14, 5],  ctr: [0.6, 1.7], cpa: [40, 18], roas: [1.5, 3] },
  },
  marketplace: {
    general:   { cpm: [25, 8],  ctr: [1, 3],   cpa: [40, 18], roas: [3, 5], cpc: [1.5, 0.4], cvr: [1.5, 4] },
    ecommerce: { cpm: [24, 8],  ctr: [1, 3.2], cpa: [38, 16], roas: [3.5, 6] },
    fashion:   { cpm: [22, 7],  ctr: [1.2, 3.5], cpa: [35, 15], roas: [3.5, 6] },
    fnb:       { cpm: [20, 6],  ctr: [1, 3],   cpa: [30, 14], roas: [3, 5] },
  },
};

// Ambil benchmark: gabung "general" + industri (industri menimpa general,
// tapi mewarisi cpc/cvr dari general kalau industrinya tak mendefinisikan).
export function getBenchmark(platform, industry, format) {
  const p = BENCHMARKS[platform] || BENCHMARKS.meta;
  const fmt = (FORMAT_BENCH[platform] && format && format !== "all") ? (FORMAT_BENCH[platform][format] || {}) : {};
  return { ...p.general, ...(p[industry] || {}), ...fmt };
}
