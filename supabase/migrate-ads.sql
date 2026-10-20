-- Migration: advertising platform (events + moderation fields)
-- Run in Supabase SQL Editor. Idempotent.

-- 1) ad_campaigns extras
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS moderation_note TEXT DEFAULT '';
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS spend_today DECIMAL(12,2) DEFAULT 0;
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS views_today INTEGER DEFAULT 0;
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS last_billing_at TIMESTAMPTZ;

ALTER TABLE ad_campaigns DROP CONSTRAINT IF EXISTS ad_campaigns_status_check;
ALTER TABLE ad_campaigns ADD CONSTRAINT ad_campaigns_status_check
  CHECK (status IN ('draft', 'pending', 'moderating', 'active', 'paused', 'rejected', 'finished'));

-- 2) impression/click event log
CREATE TABLE IF NOT EXISTS ad_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN ('impression', 'click')),
  position TEXT DEFAULT '',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  cost DECIMAL(12,4) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_events_campaign_date ON ad_events(campaign_id, date);
CREATE INDEX IF NOT EXISTS idx_ad_events_kind ON ad_events(kind, date);

ALTER TABLE ad_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ad_events' AND policyname = 'ad_events_insert_all'
  ) THEN
    CREATE POLICY "ad_events_insert_all" ON ad_events FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ad_events' AND policyname = 'ad_events_select_all'
  ) THEN
    CREATE POLICY "ad_events_select_all" ON ad_events FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ad_campaigns' AND policyname = 'ad_campaigns_select_all'
  ) THEN
    CREATE POLICY "ad_campaigns_select_all" ON ad_campaigns FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ad_campaigns' AND policyname = 'ad_campaigns_update_all'
  ) THEN
    CREATE POLICY "ad_campaigns_update_all" ON ad_campaigns FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ad_campaigns' AND policyname = 'ad_campaigns_insert_all'
  ) THEN
    CREATE POLICY "ad_campaigns_insert_all" ON ad_campaigns FOR INSERT WITH CHECK (true);
  END IF;
END $$;
