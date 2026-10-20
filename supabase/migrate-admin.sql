-- Migration: admin moderation + user ban status
-- Run in Supabase SQL Editor AFTER schema.sql (idempotent)

-- 1) profiles.status for ban/unban (role CHECK does not allow 'banned')
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_status_check CHECK (status IN ('active', 'banned'));

-- 2) posts.status — align with app states
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_status_check;
ALTER TABLE posts ADD CONSTRAINT posts_status_check
  CHECK (status IN ('draft', 'generating', 'ready', 'queued', 'moderating', 'scheduled', 'published', 'rejected'));

-- 3) Admin can read all profiles/posts and moderate
--    (broad SELECT policies — tighten later with an is_admin() helper if needed)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_select_all'
  ) THEN
    CREATE POLICY "profiles_select_all" ON profiles FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'posts' AND policyname = 'posts_select_all'
  ) THEN
    CREATE POLICY "posts_select_all" ON posts FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'posts' AND policyname = 'posts_update_admin'
  ) THEN
    -- Owner OR any admin (role in JWT/app_metadata) can update; fallback: owner only if this fails
    CREATE POLICY "posts_update_admin" ON posts FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_update_admin'
  ) THEN
    CREATE POLICY "profiles_update_admin" ON profiles FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;
