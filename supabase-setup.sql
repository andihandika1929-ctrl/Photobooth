-- ================================================================
-- PHOTOBOOTH — Supabase Database Setup  (Updated)
-- Run this in Supabase Dashboard → SQL Editor
-- ================================================================

-- ─────────────────────────────────────────
-- 1. Create the photos table
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.photos (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url      TEXT NOT NULL,
  storage_path   TEXT NOT NULL,
  template_type  TEXT NOT NULL DEFAULT 'editorial',
  layout         TEXT NOT NULL DEFAULT 'strip3',
  location       TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS photos_created_at_idx ON public.photos (created_at DESC);

-- ─────────────────────────────────────────
-- 2. Enable Row Level Security
-- ─────────────────────────────────────────
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────
-- 3. RLS Policies
-- ─────────────────────────────────────────

-- Public (anon) can INSERT
CREATE POLICY "anon_insert_photos"
  ON public.photos FOR INSERT TO anon WITH CHECK (true);

-- Authenticated admin can SELECT all
CREATE POLICY "admin_select_photos"
  ON public.photos FOR SELECT TO authenticated USING (true);

-- Authenticated admin can DELETE
CREATE POLICY "admin_delete_photos"
  ON public.photos FOR DELETE TO authenticated USING (true);

-- ─────────────────────────────────────────
-- 4. Storage Bucket
-- ─────────────────────────────────────────
-- Create in Dashboard → Storage → New Bucket:
--   Name:    photos
--   Public:  YES
--   MIME:    image/png, image/jpeg
--   MaxSize: 10 MB

-- Storage INSERT policy (anon can upload)
INSERT INTO storage.policies (name, bucket_id, operation, role, definition)
VALUES (
  'anon_upload_photos', 'photos', 'INSERT', 'anon',
  '(bucket_id = ''photos'')'
) ON CONFLICT DO NOTHING;

-- Authenticated admin can delete from storage
INSERT INTO storage.policies (name, bucket_id, operation, role, definition)
VALUES (
  'admin_delete_storage', 'photos', 'DELETE', 'authenticated',
  '(bucket_id = ''photos'')'
) ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────
-- 5. Admin user
-- ─────────────────────────────────────────
-- Create via Dashboard → Authentication → Users → Add user
-- Use email/password — this is your /hq-x9k2-console login

-- ─────────────────────────────────────────
-- 6. Verification queries
-- ─────────────────────────────────────────
SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'photos';

SELECT policyname, cmd, roles FROM pg_policies
  WHERE tablename = 'photos';

-- ─────────────────────────────────────────
-- 7. Frame Presets Table (Persistent Photobooth Presets)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.frame_presets (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  category          TEXT DEFAULT 'Standard',
  layout_type       TEXT NOT NULL DEFAULT 'strip-1x4', -- 'strip-1x3', 'strip-1x4', 'grid-2x2'
  overlay_image_url TEXT,
  bg_color          TEXT NOT NULL DEFAULT '#FDFBF7',
  is_active         BOOLEAN NOT NULL DEFAULT true,
  -- Compatibility & procedural accent columns:
  layout            TEXT NOT NULL DEFAULT 'strip4',
  preset            TEXT NOT NULL DEFAULT 'birthday',
  paper             TEXT NOT NULL DEFAULT '#FDFBF7',
  ink               TEXT NOT NULL DEFAULT '#1A1A1A',
  accent            TEXT NOT NULL DEFAULT '#C4B99A',
  wash              TEXT NOT NULL DEFAULT '#F5F0E8',
  frame_image_url   TEXT,
  tagline           TEXT,
  description       TEXT,
  badge             TEXT,
  text_config       JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.frame_presets ENABLE ROW LEVEL SECURITY;

-- Allow read access to everyone
CREATE POLICY "anon_select_frame_presets"
  ON public.frame_presets FOR SELECT TO anon USING (true);

-- Allow full manage access for admin and authenticated roles
CREATE POLICY "admin_manage_frame_presets"
  ON public.frame_presets FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Fallback policy for studio anon key if service role is not passed
CREATE POLICY "anon_manage_frame_presets"
  ON public.frame_presets FOR ALL TO anon USING (true) WITH CHECK (true);


