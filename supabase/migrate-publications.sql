-- Add publications column to existing analytics table (run if table already exists)
ALTER TABLE analytics ADD COLUMN IF NOT EXISTS publications INTEGER DEFAULT 0;

-- Allow updating own analytics (needed to increment publication counters)
DROP POLICY IF EXISTS "analytics_update_own" ON analytics;
CREATE POLICY "analytics_update_own" ON analytics FOR UPDATE USING (auth.uid() = user_id);
