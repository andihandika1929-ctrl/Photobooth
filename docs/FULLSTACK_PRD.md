# 📘 PRODUCT REQUIREMENT DOCUMENT (PRD) & ARCHITECTURAL BLUEPRINT
**Project:** HaloLuna Studio (gethaloluna.com)  
**Type:** Brownfield Web Application Refactor & Feature Expansion  
**Tech Stack:** React (TypeScript), Tailwind CSS, HTML5 Canvas API, Supabase (PostgreSQL, Storage, RLS)  
**Status:** In Active Development (Emergency Hotfix -> Modular Expansion)  

---

## 1. EXECUTIVE SUMMARY & PROBLEM STATEMENT

### 1.1 Background
HaloLuna Studio adalah aplikasi web photobooth bergaya estetik Korea (Korean Photo Strip). Aplikasi saat ini telah beroperasi secara parsial di lingkungan produksi/semi-produksi. Namun, arsitektur frontend dan backend yang terlalu terikat (*tightly coupled*) menyebabkan sejumlah *bug* fatal dan membatasi ekspansi fitur di masa mendatang.

### 1.2 Core Critical Issues (AS-IS Analysis)
1. **P0 (Emergency Bug - Download Failure):** Pengguna gagal mendownload hasil foto photostrip lokal. Fungsi *export* lokal macet karena *unhandled exception* atau ketergantungan *asynchronous* yang tidak tuntas.
2. **P1 (Architecture Flaw - Coupled Pipeline & Race Condition):** Logika render canvas lokal dan *auto-upload* ke Supabase dieksekusi dalam satu jalur yang sama. Jika koneksi Supabase terhambat atau *error*, tombol download lokal ikut lumpuh dan memunculkan notifikasi merah *"Cloud sync issue"*.
3. **P2 (Visual Bug - Static Canvas Resolution Discrepancy):** Nilai ukuran *font* dan koordinat ditaruh secara statis (`50px`, `30px`). Pada kanvas resolusi tinggi (*high-resolution export canvas*), teks Nama & Umur tampak sekecil semut (*tiny ant text*).
4. **P3 (Logic Leak - Global Text Rendering):** Teks edisi ulang tahun (*Birthday Edition*) dirender secara global ke seluruh frame, mengotori template frame non-birthday.
5. **P4 (Sync Bug - Broken Multi-frame Upload):** Unggah data ke admin Supabase hanya terpicu 1 kali per sesi. Pergantian frame berikutnya tidak memicu *re-upload* dengan benar.

---

## 2. HIGH-LEVEL SYSTEM ARCHITECTURE (DECOUPLED PIPELINE)

Untuk menjamin keandalan 100%, pipeline dibagi menjadi **dua jalur independen (Decoupled Architecture)**:

```text
[User Capture / Edit Action]
           │
           ▼
┌────────────────────────────────────────────────────────┐
│             DETERMINISTIC CANVAS ENGINE                │
│ 1. Clear Canvas                                        │
│ 2. Draw Frame Background Asset                         │
│ 3. Render Captured Photo Grid                          │
│ 4. Render User Stickers                                │
│ 5. IF (FrameConfig.hasCustomText) -> Draw Dynamic Text │
└──────────────────────────┬─────────────────────────────┘
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
┌─────────────────────────┐ ┌──────────────────────────────────────┐
│  LOCAL DOWNLOAD ENGINE  │ │       BACKGROUND SYNC ENGINE         │
│  (Priority: P0 - Pure)  │ │   (Priority: P1 - Non-Blocking)      │
│                         │ │                                      │
│ • toDataURL() / toBlob()│ │ • Debounce 400ms                     │
│ • Trigger Native <a> tag│ │ • Extract Blob                       │
│ • 100% Offline Capable  │ │ • Upload to Supabase Bucket          │
│ • NO Supabase Await     │ │ • Insert Record to Supabase DB       │
│ • Zero Blocking UI      │ │ • Silent Retry / Background Toast    │
└─────────────────────────┘ └──────────────────────────────────────┘

---

## 3. PHASE 3 SPECIFICATION: BEHIND-THE-SCENES (BTS) VIDEO ENGINE

### 3.1 Architecture Overview
Photobooth estetik Korea (seperti Haru Film, Photoism, Life4Cuts) memberikan rekaman video Behind-The-Scenes (BTS) dari sesi pemotretan.
Fitur ini diimplementasikan menggunakan native browser `MediaRecorder` API secara non-blocking dan mandiri dari render canvas photostrip.

### 3.2 Key Objectives & Implementation Details
1. **Task 3.1 (Stream Hook & Format Negotiation):**
   - Mengaitkan native `MediaRecorder` langsung ke active camera `MediaStream` (`streamRef.current`) tanpa overhead canvas re-rendering.
   - Deteksi format adaptif lintas platform (`getOptimalVideoMimeType`):
     - Safari (iOS / macOS): Prioritas `video/mp4;codecs=avc1` / `video/mp4`.
     - Chrome / Firefox / Android: Prioritas `video/webm;codecs=vp9` / `video/webm;codecs=vp8` / `video/webm`.
     - Fallback ke default format peramban jika tipe spesifik tidak tersedia.

2. **Task 3.2 (Session Recording & Non-Corrupted Compilation):**
   - Perekaman video chunk dimulai otomatis saat countdown foto pertama dimulai (`startCountdown`).
   - Perekaman berjalan dalam satu sesi berkelanjutan (`recorder.start(1000)`).
   - Menghindari *pitfall* penggabungan Blob terpisah (`new Blob([blob1, blob2])`) yang dapat merusak container header dan timestamp video. Seluruh sesi pemotretan multi-shot (6 frame) tersimpan dalam satu stream yang mulus (*seamless & non-corrupted*).
   - Saat pemotretan shot terakhir tuntas, recorder berhenti dengan jeda 300ms untuk menangkap senyuman setelah flash, lalu mengompilasi video menjadi satu `Blob` final dan meneruskannya via `onBtsVideoReady`.

3. **Task 3.3 (Local BTS Video Download in CanvasEditor):**
   - Menambahkan tombol dedicated **"Download BTS Video"** pada panel aksi export di `CanvasEditor.tsx`.
   - Tombol aktif jika BTS video berhasil direkam (dan disabled dengan penjelasan jika sesi tanpa kamera/upload file).
   - Memicu direct native download browser menggunakan `URL.createObjectURL(blob)` dengan nama file format `HaloLuna-BTS-[timestamp].[mp4|webm]`.
   - Menjamin 100% isolasi: tidak mengganggu tombol download photostrip lokal (Phase 0) maupun tata letak teks frame (Phase 1).