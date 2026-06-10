// src/logic/diagnose.js
// Mesin utama: gabungkan benchmark + metrik -> rating, Health Score, diagnosa.

import { getBenchmark } from "../data/benchmarks.js";
import { deriveMetrics } from "./calc.js";
import { RULES, FALLBACK, STRENGTHS } from "./rules.js";

// Arah metrik: true = makin rendah makin bagus.
const LOWER_BETTER = { cpm: true, cpa: true, cpc: true, ctr: false, roas: false, cvr: false };

// Bobot tiap metrik untuk Health Score, per objective.
const WEIGHTS = {
  conversion: { cpm: 1, ctr: 2, cpc: 1, cvr: 2, cpa: 3, roas: 4 },
  traffic:    { cpm: 2, ctr: 4, cpc: 3, cvr: 0, cpa: 1, roas: 1 },
  awareness:  { cpm: 4, ctr: 3, cpc: 1, cvr: 0, cpa: 0, roas: 0 },
};

const SCORE = { good: 100, avg: 60, bad: 20 };

// Beri rating satu metrik vs benchmark [buruk, bagus].
export function rateMetric(metric, value, bm) {
  if (value == null || !bm[metric]) return null;
  const [bad, good] = bm[metric];
  if (LOWER_BETTER[metric]) {
    if (value <= good) return "good";
    if (value >= bad) return "bad";
    return "avg";
  } else {
    if (value >= good) return "good";
    if (value <= bad) return "bad";
    return "avg";
  }
}

// Fungsi utama. input = { platform, industry, objective, margin?, + metrik/data mentah }
export function diagnose(input) {
  const platform = input.platform || "meta";
  const industry = input.industry || "general";
  const objective = input.objective || "conversion";

  const bm = getBenchmark(platform, industry, input.format);

  // Metrik dihitung dalam mata uang ASLI (biar tampil persis seperti input).
  // Konversi ke USD HANYA saat membandingkan ke benchmark (benchmark berbasis USD).
  const currency = input.currency || "usd";
  const rate = parseFloat(input.rate) || 18000;
  const metrics = deriveMetrics(input);
  const toUsd = (k, v) =>
    (v != null && currency === "idr" && (k === "cpm" || k === "cpa" || k === "cpc")) ? v / rate : v;

  // --- Logika margin: nilai ROAS relatif ke titik impas, bukan angka tetap ---
  // Break-even ROAS = 100 / margin(%). Target untung sehat = 1.5x BEP.
  // Margin bisa diisi langsung, ATAU dihitung dari HPP & harga jual:
  // margin = (harga jual - HPP) / harga jual * 100.
  let margin = parseFloat(input.margin);
  const hpp = parseFloat(input.hpp);     // modal per produk (Rp/$)
  const price = parseFloat(input.price); // harga jual per produk (Rp/$)
  if (!isNaN(hpp) && !isNaN(price) && price > 0 && hpp >= 0 && hpp < price) {
    margin = ((price - hpp) / price) * 100;
  }
  let breakEvenRoas = null,
    targetRoas = null;
  if (!isNaN(margin) && margin > 0 && margin < 100) {
    breakEvenRoas = Math.round((100 / margin) * 100) / 100;
    targetRoas = Math.round(breakEvenRoas * 1.2 * 100) / 100; // untung sehat = POAS 1.2 (ROI ~20%)
  }

  // Rating tiap metrik inti (konversi metrik uang ke USD dulu utk benchmark).
  const ratings = {};
  ["cpm", "ctr", "cpc", "cpa", "cvr"].forEach((k) => {
    ratings[k] = rateMetric(k, toUsd(k, metrics[k]), bm);
  });

  // ROAS: kalau margin diisi, nilai vs break-even. Kalau tidak, pakai benchmark.
  if (breakEvenRoas != null && metrics.roas != null) {
    const v = metrics.roas;
    ratings.roas = v >= targetRoas ? "good" : v >= breakEvenRoas ? "avg" : "bad";
  } else {
    ratings.roas = rateMetric("roas", metrics.roas, bm);
  }

  // Health Score: rata-rata berbobot dari metrik yang terisi.
  const w = WEIGHTS[objective] || WEIGHTS.conversion;
  let totalW = 0,
    totalScore = 0;
  Object.keys(w).forEach((k) => {
    if (ratings[k] != null && w[k] > 0) {
      totalW += w[k];
      totalScore += w[k] * SCORE[ratings[k]];
    }
  });
  const healthScore = totalW ? Math.round(totalScore / totalW) : null;
  const grade =
    healthScore == null ? "-" :
    healthScore >= 85 ? "A" :
    healthScore >= 70 ? "B" :
    healthScore >= 55 ? "C" :
    healthScore >= 40 ? "D" : "E";

  // Jalankan aturan diagnosa.
  const diagnoses = RULES.filter((rule) => rule.when(ratings)).map((rule) => ({
    id: rule.id,
    severity: rule.severity,
    title: rule.title,
    body: rule.body,
    actions: rule.actions,
  }));

  // Diagnosa khusus: ROAS di bawah titik impas = rugi nyata. Taruh paling atas.
  if (breakEvenRoas != null && metrics.roas != null && metrics.roas < breakEvenRoas) {
    diagnoses.unshift({
      id: "roas_below_bep",
      severity: "high",
      title: "ROAS-mu masih nombok — kampanye rugi",
      body: `Dengan margin ${Math.round(margin)}%, kamu baru balik modal di ROAS ${breakEvenRoas}x. Sekarang ROAS-nya ${metrics.roas}x, jadi tiap penjualan masih rugi (bukan cuma kurang optimal). Target untung sehatnya: ${targetRoas}x.`,
      actions: [
        "Prioritasin: stop/iterasi dulu kampanye yang paling rugi",
        "Naikin nilai order (bundling/upsell) atau margin produk",
        "Telusurin bocornya dari atas, beresin dari hulu",
      ],
    });
  }

  // POAS & ROI (untung setelah modal) — butuh margin & ROAS.
  let poas = null, roiPct = null, profit = null;
  if (!isNaN(margin) && margin > 0 && metrics.roas != null) {
    poas = Math.round(metrics.roas * (margin / 100) * 100) / 100;
    roiPct = Math.round((poas - 1) * 1000) / 10;
    let status, label;
    if (roiPct >= 20) { status = "untung"; label = "UNTUNG"; }
    else if (roiPct > 2) { status = "tipis"; label = "UNTUNG TIPIS"; }
    else if (roiPct >= -2) { status = "bep"; label = "BALIK MODAL"; }
    else { status = "boncos"; label = "RUGI / BONCOS"; }
    // tiap 100rb/100 iklan balik berapa
    const back = Math.round(poas * 100000);
    const note =
      status === "boncos"
        ? `Tiap Rp100.000 belanja iklan baru balik Rp${back.toLocaleString("id-ID")} setelah modal — nombok Rp${(100000 - back).toLocaleString("id-ID")}.`
        : `Tiap Rp100.000 belanja iklan balik Rp${back.toLocaleString("id-ID")} setelah modal${roiPct > 2 ? ` — untung Rp${(back - 100000).toLocaleString("id-ID")}` : ""}.`;
    profit = { status, label, poas, roiPct, note };
  }

  // Simulasi target: angka yang harus dikejar biar untung sehat.
  let simulation = null;
  if (metrics.roas != null && !isNaN(margin) && margin > 0) {
    const m = margin / 100;
    const roas = metrics.roas;
    const sim = {
      roasNow: roas,
      roasBEP: breakEvenRoas ?? Math.round((1 / m) * 100) / 100,
      roasHealthy: targetRoas ?? Math.round((1.2 / m) * 100) / 100,
    };
    const hppIn = parseFloat(input.hpp), priceIn = parseFloat(input.price);
    if (!isNaN(hppIn) && !isNaN(priceIn) && priceIn > 0) {
      sim.hppNow = hppIn;
      sim.priceNow = priceIn;
      // Saran turunkan HPP hanya kalau modal sekarang terlalu tinggi (di bawah BEP)
      const hppMax = priceIn * (1 - 1 / roas);
      if (hppMax > 0 && hppIn > hppMax) sim.hppMaxBEP = Math.round(hppMax);
      // Saran naikkan harga jual hanya kalau belum cukup buat untung sehat
      if (1.2 / roas < 1) {
        const ph = Math.round(hppIn / (1 - 1.2 / roas));
        if (ph > priceIn) sim.priceHealthy = ph;
      }
    }
    simulation = sim;
  }

  // Kekuatan: metrik yang sudah BAIK + alasan & cara pertahankan.
  const strengths = ["cpm", "ctr", "cpa", "roas"]
    .filter((k) => ratings[k] === "good")
    .map((k) => ({ id: "good_" + k, metric: k, ...STRENGTHS[k] }));

  if (diagnoses.length === 0) diagnoses.push(FALLBACK);

  // --- Ambang data minimum: cegah diagnosa ngawur saat sampel kecil ---
  // Kalau user isi jumlah konversi dan terlalu sedikit, datanya belum signifikan.
  const MIN_CONV = 25;
  const conv = parseFloat(input.conversions);
  let lowData = false;
  if (!isNaN(conv) && conv < MIN_CONV) {
    lowData = true;
    diagnoses.unshift({
      id: "low_data",
      severity: "warning",
      title: "Datanya masih kurang buat narik kesimpulan",
      body: `Baru ${conv} konversi (idealnya minimal ${MIN_CONV}). Penilaian CPA/ROAS di bawah bisa meleset karena datanya masih dikit. Anggap ancang-ancang aja, belum vonis.`,
      actions: [
        "Kumpulin data dulu sebelum ambil keputusan gede",
        "Jangan buru-buru matiin kampanye cuma dari beberapa hari awal",
        "Fokus dulu ke CTR & CPM yang lebih cepet kebaca",
      ],
    });
  }

  return {
    platform,
    industry,
    objective,
    benchmark: bm,
    metrics, // semua metrik (termasuk turunan)
    ratings, // good/avg/bad per metrik
    healthScore,
    grade,
    breakEvenRoas, // null kalau margin tidak diisi
    targetRoas,
    lowData, // true kalau konversi < ambang
    currency, // 'usd' | 'idr'
    rate,     // kurs IDR per 1 USD
    poas,     // ROAS x margin (1.0 = balik modal)
    roiPct,   // ROI bersih % atas biaya iklan
    profit,   // vonis untung/boncos + catatan
    simulation, // target ROAS/harga jual/HPP biar untung
    strengths, // metrik yang sudah bagus + alasan
    diagnoses,
  };
}
