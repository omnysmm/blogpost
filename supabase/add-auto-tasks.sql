-- Migration: add auto_tasks table + analytics upsert support
-- Run this in Supabase SQL Editor AFTER schema.sql

-- ═══════════════════════════════════════════
-- AUTO TASKS
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS auto_tasks (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  content_type TEXT NOT NULL DEFAULT 'post',
  frequency TEXT NOT NULL DEFAULT 'daily',
  schedule JSONB DEFAULT '{"time":"10:00","days":[]}',
  scheduled_dates TEXT[] DEFAULT '{}',
  networks TEXT[] DEFAULT '{}',
  topics TEXT[] DEFAULT '{}',
  active BOOLEAN DEFAULT TRUE,
  last_run TIMESTAMPTZ,
  generated_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auto_tasks_user ON auto_tasks(user_id);

ALTER TABLE auto_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auto_tasks_select_own" ON auto_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "auto_tasks_insert_own" ON auto_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "auto_tasks_update_own" ON auto_tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "auto_tasks_delete_own" ON auto_tasks FOR DELETE USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════
-- ANALYTICS: unique constraint for upsert
-- ═══════════════════════════════════════════
CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_user_date_network
  ON analytics(user_id, date, network);
