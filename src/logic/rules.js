// src/logic/rules.js
// Aturan diagnosa. Tiap aturan cek pola rating metrik (good/avg/bad/null)
// lalu kembalikan diagnosa + aksi. Aturan dirancang agar TIDAK saling
// bertabrakan: tiap akar masalah punya kondisi yang eksklusif.
//
// r = { cpm, ctr, cpa, roas, cvr } berisi "good" | "avg" | "bad" | null

const isBad = (x) => x === "bad";
const isOk = (x) => x === "good" || x === "avg";
const notBad = (x) => x === "good" || x === "avg"; // terisi & tidak buruk

export const RULES = [
  {
    id: "cpm_high",
    when: (r) => isBad(r.cpm) && isOk(r.ctr),
    severity: "warning",
    title: "CPM mahal, tapi kreatifnya masih oke",
    body: "Jangkauan ke audiens lagi mahal. Biasanya gara-gara audiens kesempitan, lelang lagi rame, skor relevansi rendah, atau iklanmu udah keseringan muncul (jenuh).",
    actions: [
      "Lebarin audiens / longgarin targeting",
      "Naikin relevansi: bikin kreatif yang lebih nyatu sama audiens",
      "Cek frequency (>3 udah jenuh), ganti-ganti placement",
    ],
  },
  {
    id: "ctr_low",
    when: (r) => isBad(r.ctr),
    severity: "high",
    title: "CTR kecil — kreatifnya belum nendang",
    body: "Iklanmu belum bikin orang berhenti scroll, atau kurang pas sama audiensnya. Ini masalah paling depan, beresin ini dulu sebelum yang lain.",
    actions: [
      "Perkuat 3 detik pertama (hook-nya)",
      "Coba 3-5 versi kreatif baru",
      "Pertajam targeting biar lebih nyambung",
    ],
  },
  {
    // Konversi bocor: HANYA kalau CPA buruk ATAU CVR buruk (konversi mahal/jelek).
    // Tidak dipicu oleh ROAS rendah saja — itu urusan AOV (rule di bawah).
    id: "leak_conversion",
    when: (r) => isOk(r.ctr) && (isBad(r.cpa) || isBad(r.cvr)),
    severity: "high",
    title: "Kliknya bagus, tapi bocor pas mau closing",
    body: "Banyak yang klik tapi sedikit yang jadi beli. Masalahnya ada di landing page / penawaran / harga, bukan di iklannya.",
    actions: [
      "Cek landing page: kecepatan, tombol CTA, kesan terpercaya",
      "Samain janji di iklan sama isi landing page",
      "Coba ubah penawaran / harga / kasih bukti (review, testimoni)",
    ],
  },
  {
    // AOV kecil: konversi SEHAT (CPA tidak buruk) tapi ROAS tetap rendah.
    // Eksklusif dari leak_conversion karena syarat CPA berlawanan.
    // !isBad (bukan notBad) supaya null CPA tidak memblokir rule — null = tidak diketahui, bukan buruk.
    id: "low_aov",
    when: (r) => !isBad(r.cpa) && isBad(r.roas) && !isBad(r.cvr),
    severity: "warning",
    title: "Konversi udah efisien, tapi ROAS kecil — nilai order-nya kekecilan",
    body: "Biaya buat dapetin order udah murah, tapi nilai per order-nya kekecilan dibanding biaya iklan.",
    actions: [
      "Naikin nilai order: bundling & upsell",
      "Pasang syarat gratis ongkir (min. belanja tertentu)",
      "Dorong produk yang marginnya lebih gede",
    ],
  },
  {
    id: "scale",
    when: (r) => r.roas === "good" && notBad(r.cpa) && notBad(r.ctr),
    severity: "good",
    title: "Sehat — tinggal gas scale",
    body: "Gak ada bocor yang berarti. Sekarang tinggal urusan volume, bukan masalah.",
    actions: [
      "Naikin budget pelan-pelan 20-30% tiap 3 hari",
      "Lebarin ke audiens mirip (lookalike)",
      "Siapin kreatif cadangan biar gak cepet jenuh",
    ],
  },
];

// Kekuatan: penjelasan tiap metrik yang sudah BAIK + cara mempertahankan.
export const STRENGTHS = {
  cpm: {
    title: "CPM murah — jangkauan efisien",
    body: "Biaya nampilin iklan ke 1.000 orang rendah. Artinya audiens & relevansi kreatif kamu pas, jadi modal kebuang lebih sedikit di tahap tayang.",
    keep: ["Pertahankan audiens & placement yang sekarang", "Pakai efisiensi ini buat nambah volume/budget"],
  },
  ctr: {
    title: "CTR tinggi — kreatif & targeting nyambung",
    body: "Banyak yang tertarik klik. Ini hulu funnel yang sehat: klik jadi lebih murah dan trafik yang masuk lebih relevan.",
    keep: ["Catat hook/angle yang menang, pakai ulang", "Jadikan patokan saat bikin kreatif baru"],
  },
  cpa: {
    title: "CPA efisien — biaya per hasil rendah",
    body: "Biaya buat dapetin 1 konversi murah. Kombinasi iklan + landing page + penawaran kamu bekerja baik.",
    keep: ["Jadikan acuan saat scaling", "Jaga landing page tetap cepat & penawaran tetap kuat"],
  },
  roas: {
    title: "ROAS sehat — iklan menghasilkan",
    body: "Pendapatan dari iklan di atas target. Kampanye ini layak diprioritaskan.",
    keep: ["Kandidat utama buat dinaikkan budget-nya", "Pantau biar tetap di atas titik impas"],
  },
};

// Diagnosa default kalau tidak ada aturan yang cocok.
export const FALLBACK = {
  id: "average",
  severity: "neutral",
  title: "Performanya standar-standar aja",
  body: "Gak ada bocor yang nyolok. Masih bisa dioptimasi pelan-pelan.",
  actions: [
    "Bandingin sama data akunmu sendiri pas lagi bagus",
    "Tes 1-2 hal aja (kreatif / audiens / landing page)",
    "Pantau tren 7-14 hari",
  ],
};
