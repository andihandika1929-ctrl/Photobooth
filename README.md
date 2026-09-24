# 📷 Photobooth — Directed by Andi Handika

A premium full-stack photobooth web application built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, **Lucide Icons**, and **Supabase**.

---

## ✨ Features

### Public Flow `/`
- 🎥 **Live camera** via `navigator.mediaDevices.getUserMedia` (HTTPS-ready) with fallback to local file upload
- 🎨 **Real-time CSS filter toggle** — Natural, B&W High Contrast, Vintage Warm, Retro Cyber
- 📸 **3-second countdown** with beep sounds and screen flash
- 🖼 **Three layout options** — 3-frame strip, 4-frame strip, 2×2 grid
- 🖊 **Four frame presets** rendered on HTML5 Canvas:
  - Thermal Receipt (mock barcode, Now Playing soundwave, editable metadata)
  - Y2K Windows UI (window chrome, folder icons, taskbar)
  - 35mm Cinema Film Strip (sprocket holes, orange film metadata)
  - Clean Minimalist Editorial
- 📍 **Editable metadata** — location, song title, auto timestamp
- 💾 **Instant PNG download** (client-side)
- 📲 **QR share** — uploads to Supabase Storage, generates dynamic QR code pointing to `/result/[uuid]`

### Audio (Web Audio API — no external files)
- Mechanical analog camera shutter click
- 3…2…1 countdown beeps (ascending pitch)
- Screen flash burst on capture
- Thermal paper print / dispense sound on render

### Admin Dashboard `/hq-x9k2-console`
- 🔐 Supabase email/password authentication
- Secret route — unauthenticated access redirects to `/` (404 appearance)
- 📊 Overview stats — total strips, today's count, top-used preset
- 🗂 Masonry grid + list view with bulk/single delete and download
- Server-side delete API using service role key

### Branding
- Web footer: *"Crafted & Directed by Andi Handika"*
- Canvas strips: `DIRECTED BY ANDI HANDIKA • 2026` micro-watermark on every export
- Loading screen: shutter-developing animation with director credit

---

## 🗂 File Structure

```
src/
├── app/
│   ├── layout.tsx                  # Root layout + metadata
│   ├── page.tsx                    # Main photobooth page
│   ├── globals.css                 # Global styles + design tokens
│   ├── result/[uuid]/
│   │   ├── page.tsx                # Public strip viewer (server component)
│   │   └── not-found.tsx           # 404 for invalid UUIDs
│   ├── hq-x9k2-console/
│   │   └── page.tsx                # Admin dashboard (obscured)
│   └── api/
│       ├── upload/route.ts         # Server-side upload + DB insert
│       └── admin/delete/route.ts   # Server-side bulk delete
├── components/
│   ├── CameraViewport.tsx          # Camera + filters + countdown
│   ├── CanvasEditor.tsx            # Frame presets + canvas export
│   ├── AudioEngine.ts              # Web Audio API synthesized sounds
│   ├── LoadingScreen.tsx           # Aperture developing animation
│   └── ShareModal.tsx              # QR code + copy link modal
├── lib/
│   └── supabase.ts                 # Supabase client + DB types
└── middleware.ts                   # Admin route guard
```

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone <repo>
cd photobooth
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Fill in your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Set Up Supabase

**a. Run the SQL setup script** in Supabase Dashboard → SQL Editor:
```
supabase-setup.sql
```

**b. Create the Storage bucket:**
- Go to Supabase Dashboard → Storage
- Create new bucket named `photo-strips`
- Set to **Public**
- Allowed MIME types: `image/png, image/jpeg`
- Max file size: `10 MB`

**c. Create an admin user:**
- Go to Supabase Dashboard → Authentication → Users
- Click "Add user" and create an email/password account
- This is your admin login for `/hq-x9k2-console`

### 4. Run Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🔒 Security Architecture

| Actor | Can INSERT | Can SELECT | Can DELETE |
|-------|-----------|------------|------------|
| Anonymous public user | ✅ (via anon key) | ❌ | ❌ |
| Authenticated admin | ✅ | ✅ | ✅ |

- **RLS (Row Level Security)** enforced at Supabase database level
- **Service role key** only ever used server-side in API routes
- **Admin route** (`/hq-x9k2-console`) protected by middleware cookie check + Supabase auth

---

## 🎨 Design System

| Token | Value | Usage |
|-------|-------|-------|
| `cream` | `#F9F8F6` | Background |
| `charcoal` | `#1E2022` | Text, borders |
| `border` | `#E5E5E5` | Card borders |
| `muted` | `#8A8A8A` | Secondary text |
| `shadow-tactile` | `3px 3px 0px #1E2022` | Neo-brutalist depth |

---

## 📜 License

MIT — **Crafted & Directed by Andi Handika**
