# 📊 Ads Performance Explainer

Tools diagnosa performa iklan untuk advertiser & pemilik toko online. Masukkan metrik iklan (CPM, CTR, CPC, CVR, CPA, ROAS) → langsung tahu **masalahnya di mana**, **untung atau boncos**, dan **langkah perbaikannya** — tanpa perlu jago angka.

🔗 **Live:** https://ads-explainer.vercel.app

---

## ✨ Fitur

- **Diagnosa per kampanye** — nilai tiap metrik (BAIK / RATA-RATA / BURUK) vs benchmark, plus Health Score 0–100.
- **Vonis untung/boncos** — hitung Break-Even ROAS, POAS, dan ROI dari HPP & harga jual.
- **Simulasi Target & What-If** — tahu ROAS/harga jual yang harus dikejar, dan geser metrik untuk lihat dampaknya ke untung secara live.
- **Benchmark sadar konteks** — beda per platform (Meta, Google, TikTok, Marketplace), industri, dan **format iklan** (Search, Demand Gen, Reels, dll).
- **Deteksi masalah trafik vs landing page** — bedakan CTR/CPC bagus tapi CVR jelek.
- **Upload CSV massal** — diagnosa banyak kampanye sekaligus dari export Ads Manager.
- **Tren Waktu** — analisa performa harian/mingguan + deteksi *ad fatigue*, dengan pilih rentang tanggal.
- **Riwayat & Bandingkan** — simpan tiap periode ke cloud, pantau naik/turun antar waktu.
- **Export PDF** ber-branding & **Salin ke WhatsApp** (teks rapi siap kirim).
- **Login** (Supabase) — data tersimpan per-user & nyambung antar device.
- **Tema terang/gelap**, dukungan **Rupiah & Dollar**, ramah pemula (tooltip istilah + panduan).

---

## 🛠️ Tech Stack

- **Frontend:** React + Vite + Tailwind CSS v4
- **Backend / Auth / DB:** Supabase (Postgres + Auth, Row Level Security)
- **Lain-lain:** PapaParse (CSV), cetak PDF via HTML print
- **Deploy:** Vercel

---

## 📁 Struktur Project

```
src/
├─ App.jsx              # Komponen utama (state & layout)
├─ main.jsx             # Entry point
├─ ErrorBoundary.jsx    # Jaring pengaman runtime
├─ index.css            # Tema (CSS variables) + Tailwind
├─ lib/
│  └─ ui.js             # Konstanta + fungsi format
├─ components/
│  ├─ widgets.jsx       # Info, NumberInput, Sparkline, HealthRing, Logo
│  ├─ WhatIf.jsx        # Simulasi What-If
│  ├─ ResultDetail.jsx  # Panel hasil diagnosa
│  └─ LoginScreen.jsx   # Halaman login
├─ logic/               # "Otak" tools
│  ├─ diagnose.js       # Mesin diagnosa + skor + untung/rugi
│  ├─ rules.js          # Aturan diagnosa & rekomendasi
│  ├─ calc.js           # Hitung metrik turunan
│  ├─ csv.js            # Pemetaan kolom CSV
│  ├─ timeseries.js     # Analisa tren waktu
│  ├─ report.js         # Pembuat laporan PDF
│  └─ supabase.js       # Koneksi Supabase
└─ data/
   └─ benchmarks.js     # Benchmark per platform/industri/format
```

---

## 🚀 Menjalankan di Lokal

**Prasyarat:** Node.js 20+

```bash
# 1. Install dependency
npm install

# 2. Bikin file .env di folder utama (lihat di bawah)

# 3. Jalankan dev server
npm run dev
```

Buka http://localhost:5173

### Environment Variables (`.env`)

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_KEY=sb_publishable_xxxxxxxx
```

> Kunci di atas tipe **publishable** (aman dipakai di browser karena data dilindungi Row Level Security). Setelah ubah `.env`, restart `npm run dev`.

### Build production

```bash
npm run build      # output ke folder dist/
npm run preview    # preview hasil build
```

---

## 🗄️ Setup Database (Supabase)

Buat tabel `history` + Row Level Security lewat SQL Editor:

```sql
create table public.history (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  data jsonb not null
);

alter table public.history enable row level security;

create policy "user can read own rows"   on public.history for select using (auth.uid() = user_id);
create policy "user can insert own rows" on public.history for insert with check (auth.uid() = user_id);
create policy "user can delete own rows" on public.history for delete using (auth.uid() = user_id);
```

---

## ☁️ Deploy (Vercel)

1. Push project ke GitHub.
2. Import repo di [Vercel](https://vercel.com) → Vercel otomatis mengenali Vite.
3. Tambahkan Environment Variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`) di **Settings → Environment Variables**.
4. Setelah GitHub tersambung, tiap `git push` ke `main` = **auto-deploy**.

---

## 📐 Catatan Metrik

- **ROAS** = pendapatan ÷ biaya iklan (belum potong modal).
- **POAS** = ROAS × margin → 1× = balik modal, di atas 1× = untung.
- **ROI** = untung bersih atas biaya iklan, setelah modal (HPP).
- **Break-Even ROAS** = 100 ÷ margin(%).

Benchmark = patokan kasar lintas industri (data publik 2025/2026), bukan target mutlak. Patokan terbaik tetap baseline akun sendiri.

---

## 👤 Author

Dibuat oleh **alief1303**.

> Tools ini untuk membantu pengambilan keputusan, bukan pengganti analisis akun penuh.

