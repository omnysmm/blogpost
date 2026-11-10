-- Migration: move localStorage data to Supabase (source of truth)
-- Run in Supabase SQL Editor AFTER schema.sql + migrate-ads.sql + add-auto-tasks.sql. Idempotent.

-- ═══════════════════════════════════════════════════════════════
-- 1. POSTS: fields that were lost in dual-write
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE posts ADD COLUMN IF NOT EXISTS scheduled_dates TEXT[] DEFAULT '{}';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS scheduled_time TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS moderation_note TEXT;

ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_status_check;
ALTER TABLE posts ADD CONSTRAINT posts_status_check
  CHECK (status IN ('draft', 'generating', 'ready', 'queued', 'scheduled', 'published', 'moderating', 'rejected'));

-- ═══════════════════════════════════════════════════════════════
-- 2. SOCIAL ACCOUNTS: full credential config (was localStorage)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}';

-- ═══════════════════════════════════════════════════════════════
-- 3. BILLING ENTRIES (top-ups + ad charges, was localStorage only)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS billing_entries (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('payment', 'charge', 'refund', 'bonus')),
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'RUB',
  description TEXT DEFAULT '',
  campaign_id TEXT,
  campaign_title TEXT DEFAULT '',
  method TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'succeeded' CHECK (status IN ('succeeded', 'pending', 'failed', 'draft')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_entries_user ON billing_entries(user_id, created_at);

ALTER TABLE billing_entries ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'billing_entries' AND policyname = 'billing_entries_select_own'
  ) THEN
    CREATE POLICY "billing_entries_select_own" ON billing_entries FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'billing_entries' AND policyname = 'billing_entries_insert_own'
  ) THEN
    CREATE POLICY "billing_entries_insert_own" ON billing_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'billing_entries' AND policyname = 'billing_entries_update_own'
  ) THEN
    CREATE POLICY "billing_entries_update_own" ON billing_entries FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'billing_entries' AND policyname = 'billing_entries_delete_own'
  ) THEN
    CREATE POLICY "billing_entries_delete_own" ON billing_entries FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 4. SITE SETTINGS (admin page, was localStorage only)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'site_settings' AND policyname = 'site_settings_select_all'
  ) THEN
    CREATE POLICY "site_settings_select_all" ON site_settings FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'site_settings' AND policyname = 'site_settings_write_admin'
  ) THEN
    -- writes go through service role / admin edge; block client writes by default
    CREATE POLICY "site_settings_write_admin" ON site_settings FOR ALL
      USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 5. PROMO CODES (crud.ts already queries this table + RPC)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS promo_codes (
  code TEXT PRIMARY KEY,
  discount_percent INTEGER NOT NULL DEFAULT 10,
  max_uses INTEGER DEFAULT 0,
  used_count INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'promo_codes' AND policyname = 'promo_codes_select_all'
  ) THEN
    CREATE POLICY "promo_codes_select_all" ON promo_codes FOR SELECT USING (active = true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION use_promo_code(code_text TEXT, user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  row RECORD;
BEGIN
  SELECT * INTO row FROM promo_codes
  WHERE code = code_text AND active = true
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (max_uses = 0 OR used_count < max_uses)
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  UPDATE promo_codes SET used_count = used_count + 1 WHERE code = code_text;
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
