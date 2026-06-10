# 📊 Ads Performance Explainer

Ads Performance Explainer adalah asisten diagnostik pintar untuk *digital marketer*. Aplikasi ini menganalisis metrik kampanye iklan (Meta, Google, TikTok) dan memberikan diagnosa instan mengenai apa yang salah, di mana titik kebocorannya (*leaky funnel*), serta rekomendasi praktis untuk optimasi—mengubah tebakan menjadi keputusan berbasis data.

## ✨ Fitur Utama

* **🩺 Diagnosa Metrik Otomatis:** Deteksi masalah kampanye seperti *Creative Fatigue*, *Leaky Funnel*, atau *Targeting Misfire* berdasarkan kombinasi angka CPM, CTR, CPA, CVR, dan ROAS.
* **💰 Kalkulator Profitabilitas:** Hitung batas aman *Break-Even ROAS* (BER) secara otomatis dengan memasukkan Harga Pokok Penjualan (HPP) dan Harga Jual.
* **🎚️ Simulasi Target (What-If):** Fitur interaktif untuk melihat potensi penurunan tingkat kerugian (boncos) atau peningkatan profit jika metrik berhasil dioptimasi ke persentase tertentu.
* **📋 Export Laporan Instan (Siap WA):** Hasilkan rangkuman performa kampanye yang rapi dan siap disalin untuk pelaporan ke manajemen atau tim dalam satu kali klik.
* **🌙 Dark Mode UI:** Antarmuka visual bernuansa gelap yang presisi, nyaman di mata untuk analisis data berjam-jam, lengkap dengan indikator *Health Score* kampanye.

## 🚀 Tech Stack

* **Framework:** [React](https://reactjs.org/) + [Vite](https://vitejs.dev/)
* **Styling:** *[Isi dengan CSS framework yang Anda gunakan, misal: Tailwind CSS / Chakra UI]*
* **Komponen:** *[Isi dengan library UI jika ada, misal: Radix UI / Shadcn]*

## 🛠️ Cara Instalasi & Menjalankan Proyek

Pastikan Anda sudah menginstal [Node.js](https://nodejs.org/) di perangkat Anda.

1. **Clone repository ini:**
   ```bash
   git clone [https://github.com/username-anda/ads-performance-explainer.git](https://github.com/username-anda/ads-performance-explainer.git)
   Masuk ke direktori proyek:

Bash


cd ads-performance-explainer
Instal dependensi:

Bash


npm install
# atau menggunakan yarn: yarn install
Jalankan server pengembangan (Development Server):

Bash


npm run dev
# atau menggunakan yarn: yarn dev
Buka http://localhost:5173 (atau port yang tertera di terminal) di browser Anda untuk mulai menggunakan aplikasi.

📖 Cara Penggunaan
Atur konfigurasi awal dengan memilih Platform Iklan (Meta/Google/TikTok), Format Iklan, dan Objektif.

Masukkan HPP dan Harga Jual untuk mengaktifkan peringatan profitabilitas.

Masukkan metrik iklan dari Ads Manager Anda (CPM, CTR, CPC, CVR, CPA, ROAS).

Klik Diagnosa.

Baca hasil analisis, perhatikan bagian yang masih "Rugi/Boncos" atau "Yang Sudah Bagus", lalu salin rekomendasi tindakan menggunakan tombol Salin (WA) untuk pelaporan harian.

🛣️ Roadmap Pengembangan (Mendatang)
[ ] Integrasi analitik level produk khusus ekosistem e-commerce.

[ ] Kalkulator spesifik metrik corong konversi (Add-to-Cart Rate, Initiate Checkout).

[ ] Fitur riwayat dan Action Log per kampanye untuk melihat tren optimasi.

[ ] Mode A/B Testing Comparator untuk membandingkan dua kampanye sekaligus.

Dibuat untuk mengoptimalkan konversi, menjaga metrik, dan menghentikan boncos.
