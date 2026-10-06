# HaloLuna - Product Requirements Document (PRD) v2
**Document Version:** 2.0.0 (SaaS Evolution, Modern Admin & Viral Platform)  
**Target Architecture:** Next.js (App Router, Vercel), Supabase (Database, Storage, RPC), WebRTC, HTML5 Canvas / Fabric.js, Recharts, Shadcn UI  
**Prerequisites:** Phase 0 to Phase 4 from MVP are fully completed and stable.  
**Design Standards:** Zero raw emojis in UI. Gunakan SVG vector icons (Lucide React) dan Tailwind CSS components terstruktur untuk badge, icon buttons, dan pills navigasi.  
**Product Strategy:** Product-Led Growth (100% Free & Highly Addictive). Fokus pada UX stickiness, viral sharing, dan kemandirian operasional tim tanpa koding.

---

## 1. Executive Summary & Architecture Goals
HaloLuna bertransformasi dari prototipe photobooth menjadi platform studio interaktif modern. Roadmap ini mencakup:
1. **Interactive Canvas**: Lapisan teks fleksibel berbasis persentase relatif dan filter visual analog/fisheye.
2. **Modern Homepage Grid**: Tata letak grid 2 kolom mobile-first dengan algoritma trending otomatis.
3. **Full Admin Panel & Analytics Dashboard**: Panel admin profesional berbasis sidebar untuk mengelola frame, koordinat teks, stiker, audio, dan visualisasi grafik pemakaian harian.
4. **Dynamic Seasonal Theming**: Remote config satu klik untuk merubah tema visual global (Halloween, Natal, Lebaran).
5. **LDR Virtual Duo Booth**: Fitur foto studio jarak jauh berdua secara real-time via WebRTC.
6. **High Shareability**: Album digital interaktif via QR code dan ekspor format cetak fisik 300 DPI.

---

## 2. Feature Specifications & Technical Scope

---

### Phase 5: Canvas Evolution & Draggable Text Engine
Mengubah teks statis menjadi lapisan objek dinamis dengan acuan metadata persentase dari desain frame Figma/Canva.

* **Task 5.1: Asset Workflow & Percentage-Based Spawn Mapping**
  - Desain frame dari Figma/Canva diekspor sebagai PNG transparan tanpa teks mati.
  - Setiap preset frame menyimpan metadata `textConfig` berbasis persentase relatif terhadap dimensi kanvas:
    ```typescript
    textConfig?: {
      hasCustomText: boolean;
      defaultText: string;
      fontFamily: string;     // Value dari Curated Font Catalog di kodingan
      color: string;          // Hex code, e.g. '#FF5E7E'
      xPercent: number;       // 0 - 100, e.g. 50 (tengah horizontal)
      yPercent: number;       // 0 - 100, e.g. 88 (area bawah)
      fontSizeRatio: number;  // Rasio terhadap canvas height, e.g. 0.045
    }
    ```
  - Input teks di antarmuka editor hanya dimunculkan jika frame aktif memiliki `hasCustomText: true`.

* **Task 5.2: Curated Font Catalog Integration**
  - Next.js mendaftarkan 10–15 font estetika terpilih via `next/font` atau lokal `/public/fonts` agar ter-cache sempurna di canvas:
    - *Cute Handwriting* (Caveat / Kalam)
    - *Y2K Bubble* (Cherry Bomb One)
    - *Retro Editorial* (Playfair Display)
    - *Chunky Display* (Shrikhand)
    - *Clean Minimalist* (Inter)

* **Task 5.3: Gestures & Draggable Text Object**
  - Teks diinisialisasi pada titik `(xPercent, yPercent)` kanvas, lalu dapat dimanipulasi sebagai objek: `{ id, text, x, y, scale, rotation, font, color }`.
  - Pengguna dapat menggeser posisi (*drag & drop*), mengubah rotasi, dan memperbesar/memperkecil teks (*pinch-to-scale* di layar sentuh mobile).
  - Kontrol utilitas cepat: tombol *Reset Posisi Awal* dan *Hapus Teks*.

* **Task 5.4: Viral Vintage & Y2K Camera Filters**
  - Opsi filter kamera sebelum/sesudah sesi jepret:
    1. *90s Disposable Camera:* Warm tint + simulasi digital film grain.
    2. *Fisheye Lens Simulation:* WebGL / Canvas spherical distortion shader untuk efek cembung lubang intip.
    3. *B&W Classic Noir:* High-contrast monokrom studio.

---

### Phase 6: Homepage Grid Overhaul & Weekly Trending Engine
Meredesain beranda agar mampu memuat banyak koleksi frame tanpa scrolling panjang yang melelahkan.

* **Task 6.1: 2-Column Responsive Card Grid**
  - Tampilan kartu frame di mobile diubah menjadi **Grid 2 Kolom** ringkas.
  - Kartu menampilkan: Thumbnail mockup visual, badge jumlah pose (`4 CUTS` / `6 CUTS`), nama frame, dan rasio aspek.

* **Task 6.2: Horizontal Category Pills (SVG & CSS Components)**
  - Bar navigasi filter yang dapat digeser menyamping menggunakan komponen Tailwind CSS dan Lucide Icons:
    - `All`: Icon `Sparkles` + label "All"
    - `Trending`: Icon `Flame` + label "Trending"
    - `Birthday`: Icon `Cake` + label "Birthday"
    - `Retro`: Icon `CassetteTape` + label "Retro"
    - `LDR Duo`: Icon `Users` + label "Duo"
    - `Seasonal`: Icon `Calendar` + label "Seasonal"

* **Task 6.3: Automated Weekly Trending Ranking**
  - Database RPC function di Supabase untuk mengkalkulasi tren 7 hari terakhir:
    ```sql
    CREATE OR REPLACE FUNCTION get_weekly_trending_frames()
    RETURNS TABLE(preset_id text, usage_count bigint) AS $$
      SELECT preset_id, COUNT(*) AS usage_count
      FROM photos
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY preset_id
      ORDER BY usage_count DESC
      LIMIT 5;
    $$ LANGUAGE sql STABLE;
    ```
  - Frame peringkat 1 sampai 3 secara otomatis disematkan badge amber/gold berlabel `#1 This Week`.
  - Fallback: Jika riwayat sesi seminggu terakhir masih kosong, gunakan urutan prioritas default dari CMS.

* **Task 6.4: Catalog View Transition**
  - Beranda membatasi tampilan utama ke 6 frame rekomendasi teratas, dilengkapi tombol navigasi: *"Lihat Semua Desain Frame (50+ Designs) ->"*.

---

### Phase 7: Full Admin Panel & Analytics Dashboard
Merombak total `/admin` dari tampilan data mentah menjadi Dashboard Panel profesional berbasis sidebar layout.

* **Task 7.1: Supabase Database Schema Expansion**
  - Tabel `frames`:
    - `id` (uuid, PK)
    - `name` (text)
    - `slug` (text, unique)
    - `category` (text)
    - `layout_type` (text: '4_cut' | '6_cut')
    - `frame_image_url` (text - URL PNG transparan di Supabase Storage)
    - `overlay_spec` (jsonb - padding slot foto, border radius, slot coordinates)
    - `text_config` (jsonb - hasCustomText, defaultText, defaultFont, defaultColor, xPercent, yPercent, fontSizeRatio)
    - `is_featured` (boolean, default false)
    - `is_active` (boolean, default true)
    - `created_at` (timestamp)
  - Tabel `stickers`:
    - `id` (uuid, PK)
    - `name` (text)
    - `category` (text)
    - `image_url` (text)
    - `is_animated` (boolean, default false)
  - Tabel `site_settings`:
    - `id` (int, PK)
    - `active_theme` (text, default 'default')
    - `banner_announcement` (text)
    - `bgm_audio_url` (text)
    - `bgm_title` (text)
    - `updated_at` (timestamp)

* **Task 7.2: Modern Sidebar Dashboard Layout (`/admin`)**
  - Antarmuka berbasis Shadcn UI dengan Sidebar navigasi permanen di kiri dan konten utama di kanan:
    - **Dashboard (Overview)**: Kartu metrik ringkas & grafik tren aktivitas harian.
    - **Frames Management**: Tabel katalog frame dengan filter kategori, status aktif, dan tombol edit.
    - **Stickers & Media**: Galeri kelola stiker dan audio pengiring studio.
    - **Theming & Events**: Sakelar tema musiman dan banner pengumuman.
    - **Session Logs & Exports**: Arsip riwayat sesi foto dengan tabel terstruktur, fitur pencarian ID sesi, paginasi halaman, dan filter rentang tanggal (menggantikan tombol download yang menumpuk).
    - **Settings**: Pengaturan otentikasi akun admin dan akses staf.

* **Task 7.3: Activity Chart & Metrics (Recharts Integration)**
  - Tampilan visual analitik di halaman Overview:
    - *Metric Cards*: Total Sesi Foto Minggu Ini, Daily Active Users (DAU), Frame Terpopuler, Estimasi Storage Supabase.
    - *Activity Chart*: Grafik area interaktif jumlah ekspor foto dan video BTS harian (Senin–Minggu).

* **Task 7.4: Frame Upload & Visual Text Positioner**
  - Form modal unggah frame baru untuk staf:
    - Drag-and-drop file PNG transparan.
    - Pilihan layout slot foto (`4_cut` atau `6_cut`).
    - Toggle *Aktifkan Teks Kustom*: Jika aktif, muncul dropdown pemilihan font dari katalog, color picker HEX, serta slider persentase posisi horizontal (X%) dan vertikal (Y%).
    - Toggle *Tampilkan di Beranda Utama*.

---

### Phase 8: Dynamic Seasonal Theming Engine
Mengubah identitas visual dan nuansa aplikasi secara global melalui konfigurasi admin tanpa deploy ulang kode.

* **Task 8.1: Global Theme State & Remote Config**
  - Frontend membaca parameter `active_theme` dari `site_settings`.
  - CSS Variables terpasang dinamis di `:root`:
    - `--theme-bg`, `--theme-surface`, `--theme-accent`, `--theme-text`.
  - Preset tema bawaan: `default`, `halloween`, `christmas`, `lebaran`, `new_year`.

* **Task 8.2: Lightweight Particle Ambient (CSS / SVG Canvas)**
  - Efek partikel ambient vektor murni tanpa membebani performa perangkat pengguna:
    - `halloween`: SVG siluet kelelawar melayang dan bulan sabit.
    - `christmas`: Partikel bulat salju CSS jatuh perlahan.
    - `lebaran`: Ornamen lentera temaram dan bintang sabit halus.

* **Task 8.3: Themed Background Music (BGM)**
  - Pemutar audio latar yang memutar musik instrumen tematik sesuai acara aktif saat pengguna masuk ke bilik foto.

---

### Phase 9: Viral Feature: "LDR Virtual Duo Booth"
Memungkinkan dua pengguna di lokasi fisik berbeda mengambil photostrip bersama secara real-time.

* **Task 9.1: Room Session System**
  - Host membuat ruang foto -> menghasilkan kode kamar atau tautan unik (`/room/LUNA-XYZ`).
  - Tamu mengakses tautan dari perangkat masing-masing.

* **Task 9.2: WebRTC Peer-to-Peer Stream**
  - Aliran video langsung dua arah antar perangkat via WebRTC datachannel/mediastream (tanpa membebani bandwidth server video).
  - Split-screen preview: Kamera Host dan Tamu tampil berdampingan di antarmuka kamera.

* **Task 9.3: Synchronized Countdown & Dual Snapshot**
  - Sinkronisasi pemicu jepret: hitungan mundur 3 detik berjalan serentak di kedua layar saat salah satu pengguna menekan tombol capture.
  - Kanvas merangkai snapshot Host pada slot 1 & 3, dan snapshot Tamu pada slot 2 & 4 secara otomatis.

---

### Phase 10: Shareability, Digital Souvenir & Print-Ready Export
Optimalisasi penyebaran konten ke platform media sosial dan kemudahan cetak fisik.

* **Task 10.1: Digital Souvenir Web Album (`/p/[sessionId]`)**
  - QR Code dinamis dibuat setelah ekspor selesai, mengarah ke laman arsip personal.
  - Memuat: File photostrip resolusi tinggi, pemutar looping video BTS, dan pemutar musik sesi foto.
  - Tombol aksi berbagi langsung ke Instagram Story dan TikTok menggunakan icon SVG merek.

* **Task 10.2: Print-Ready 300 DPI Export**
  - Opsi unduh file resolusi tinggi (300 DPI) sesuai format standar cetak foto 4R atau strip 2x6 inci.
  - Dilengkapi garis pemotong tipis (*cutting marks*) untuk mempermudah pemotongan kertas foto mandiri.

---

## 3. Strict Execution Guidelines for AI / Engineers
1. **No Raw Unicode Emojis in UI:** Wajib menggunakan ikon vektor SVG (Lucide React) dan komponen styling Tailwind CSS untuk badge, pills, dan tombol aksi guna menjaga tampilan konsisten di iOS, Android, dan Desktop.
2. **Never Break MVP Flow:** Modifikasi pada sistem canvas atau tabel database dilarang merusak fungsi unduhan lokal, frame birthday text, maupun audio capture yang sudah berjalan stabil di v1.
3. **Device Performance First:** Animasi partikel dan shader distorsi kanvas wajib dioptimasi ringan agar tidak memicu frame drop pada rekaman video ponsel spesifikasi pemula.
4. **Decoupled Architecture:** Kegagalan sinkronisasi cloud atau jaringan analitik tidak boleh menghambat proses unduhan file lokal di perangkat pengguna.