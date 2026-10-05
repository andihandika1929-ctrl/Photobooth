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