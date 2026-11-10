-- Migration: auto-disable expired subscriptions (task 2)
-- Run in Supabase SQL Editor AFTER schema.sql. Idempotent.

-- ═══════════════════════════════════════════════════════════════
-- 1. Expire function: downgrade plans whose trial/paid period is over
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION expire_subscriptions()
RETURNS INTEGER AS $$
DECLARE
  affected INTEGER;
BEGIN
  UPDATE profiles
  SET subscription = 'free',
      updated_at = NOW()
  WHERE subscription <> 'free'
    AND free_trial_end IS NOT NULL
    AND free_trial_end < NOW();

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
-- 2. pg_cron: run daily at 03:17 UTC
-- ═══════════════════════════════════════════════════════════════
-- Requires the pg_cron extension (Database → Extensions → enable "cron").
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'cron') THEN
    PERFORM cron.schedule(
      'expire-subscriptions-daily',
      '17 3 * * *',
      'SELECT expire_subscriptions()'
    );
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 3. RLS: allow the function to be called by clients (SECURITY DEFINER)
-- ═══════════════════════════════════════════════════════════════
GRANT EXECUTE ON FUNCTION expire_subscriptions() TO authenticated, anon;
