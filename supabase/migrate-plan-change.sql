-- Migration: plan upgrade/downgrade flow (task 3)
-- Run in Supabase SQL Editor AFTER schema.sql. Idempotent.

-- ═══════════════════════════════════════════════════════════════
-- 1. Pending plan change (applied at period end by expire_subscriptions)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pending_subscription TEXT
  CHECK (pending_subscription IN ('free', 'basic', 'pro', 'premium'));

-- ═══════════════════════════════════════════════════════════════
-- 2. Extend expire_subscriptions: apply pending change when period ends
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION expire_subscriptions()
RETURNS INTEGER AS $$
DECLARE
  affected INTEGER;
  applied INTEGER;
BEGIN
  -- Apply scheduled plan changes first (downgrade/cancel at period end)
  UPDATE profiles
  SET subscription = pending_subscription,
      pending_subscription = NULL,
      free_trial_end = CASE
        WHEN pending_subscription = 'free' THEN NULL
        ELSE free_trial_end
      END,
      updated_at = NOW()
  WHERE pending_subscription IS NOT NULL
    AND free_trial_end IS NOT NULL
    AND free_trial_end < NOW();
  GET DIAGNOSTICS applied = ROW_COUNT;

  -- Then downgrade anything still expired without a pending change
  UPDATE profiles
  SET subscription = 'free',
      updated_at = NOW()
  WHERE subscription <> 'free'
    AND pending_subscription IS NULL
    AND free_trial_end IS NOT NULL
    AND free_trial_end < NOW();
  GET DIAGNOSTICS affected = ROW_COUNT;

  RETURN applied + affected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
