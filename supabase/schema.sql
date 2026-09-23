-- BlogPost Database Schema for Supabase (FIXED)
-- Run this in Supabase SQL Editor

-- Drop existing tables if they exist (to re-apply cleanly)
DROP TABLE IF EXISTS user_blocks CASCADE;
DROP TABLE IF EXISTS analytics CASCADE;
DROP TABLE IF EXISTS ticket_messages CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS ad_campaigns CASCADE;
DROP TABLE IF EXISTS social_accounts CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- ═══════════════════════════════════════════
-- 1. PROFILES
-- ═══════════════════════════════════════════
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'advertiser', 'admin')),
  subscription TEXT NOT NULL DEFAULT 'free' CHECK (subscription IN ('free', 'basic', 'pro', 'premium')),
  avatar_url TEXT,
  language TEXT NOT NULL DEFAULT 'ru',
  currency TEXT NOT NULL DEFAULT 'RUB',
  free_trial_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, email, free_trial_end)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''), NEW.email, NOW() + INTERVAL '48 hours');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ═══════════════════════════════════════════
-- 2. POSTS
-- ═══════════════════════════════════════════
CREATE TABLE posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  content TEXT DEFAULT '',
  topic TEXT DEFAULT '',
  type TEXT NOT NULL DEFAULT 'post' CHECK (type IN ('post', 'article', 'video', 'music')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'ready', 'published', 'moderating')),
  ai_model TEXT,
  social_networks TEXT[] DEFAULT '{}',
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  has_audio BOOLEAN DEFAULT FALSE,
  has_video BOOLEAN DEFAULT FALSE,
  has_image BOOLEAN DEFAULT FALSE,
  image_url TEXT,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- 3. SOCIAL ACCOUNTS
-- ═══════════════════════════════════════════
CREATE TABLE social_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  network TEXT NOT NULL,
  account_name TEXT DEFAULT '',
  account_id TEXT DEFAULT '',
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  connected BOOLEAN DEFAULT TRUE,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_social_accounts_user_network ON social_accounts(user_id, network);

-- ═══════════════════════════════════════════
-- 4. AD CAMPAIGNS
-- ═══════════════════════════════════════════
CREATE TABLE ad_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  format TEXT,
  placement TEXT,
  site_position TEXT,
  video_position TEXT,
  payment_model TEXT,
  bid DECIMAL(10,2) DEFAULT 0,
  budget_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  budget_daily DECIMAL(10,2) DEFAULT 0,
  budget_spent DECIMAL(10,2) DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  media_url TEXT,
  media_type TEXT,
  link TEXT,
  description TEXT,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- 5. PAYMENTS
-- ═══════════════════════════════════════════
CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'RUB',
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  yookassa_payment_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- 6. TICKETS
-- ═══════════════════════════════════════════
CREATE TABLE tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ticket_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
  sender TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- 7. ANALYTICS
-- ═══════════════════════════════════════════
CREATE TABLE analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  network TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  publications INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_analytics_user_date ON analytics(user_id, date);

-- ═══════════════════════════════════════════
-- 8. USER BLOCKS (constructor)
-- ═══════════════════════════════════════════
CREATE TABLE user_blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  block_type TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_user_blocks_type ON user_blocks(user_id, block_type);

-- ═══════════════════════════════════════════
-- RLS Policies (no recursion)
-- ═══════════════════════════════════════════
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

-- Profiles: own profile only
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Posts: own posts
CREATE POLICY "posts_select_own" ON posts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "posts_insert_own" ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "posts_update_own" ON posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "posts_delete_own" ON posts FOR DELETE USING (auth.uid() = user_id);

-- Social accounts: own
CREATE POLICY "social_all_own" ON social_accounts FOR ALL USING (auth.uid() = user_id);

-- Ad campaigns: own
CREATE POLICY "campaigns_all_own" ON ad_campaigns FOR ALL USING (auth.uid() = user_id);

-- Payments: own (read only)
CREATE POLICY "payments_select_own" ON payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "payments_insert_own" ON payments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Tickets: own
CREATE POLICY "tickets_all_own" ON tickets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "ticket_messages_all_own" ON ticket_messages FOR ALL USING (
  EXISTS (SELECT 1 FROM tickets WHERE tickets.id = ticket_messages.ticket_id AND tickets.user_id = auth.uid())
);

-- Analytics: own
CREATE POLICY "analytics_select_own" ON analytics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "analytics_insert_own" ON analytics FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User blocks: own
CREATE POLICY "blocks_all_own" ON user_blocks FOR ALL USING (auth.uid() = user_id);