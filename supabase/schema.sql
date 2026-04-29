-- Run this in the Supabase SQL editor to set up the database schema.
-- Navigate to: Project → SQL Editor → New Query → paste → Run

-- User settings (one row per authenticated user)
CREATE TABLE IF NOT EXISTS user_settings (
  user_id             uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  user_name           text,
  disclaimer_seen     boolean NOT NULL DEFAULT false,
  onboarding_complete boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Mood entries
CREATE TABLE IF NOT EXISTS mood_entries (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  score      integer NOT NULL CHECK (score >= 1 AND score <= 10),
  note       text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mood_user_created ON mood_entries(user_id, created_at);

-- Thought records (CBT 6-step exercise)
CREATE TABLE IF NOT EXISTS thought_records (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  situation         text,
  automatic_thought text,
  emotions          text,
  distortion        text,
  balanced_thought  text,
  status            text NOT NULL DEFAULT 'in_progress',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Gratitude journal entries
CREATE TABLE IF NOT EXISTS gratitude_entries (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  items      jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Chat messages
CREATE TABLE IF NOT EXISTS messages (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role       text NOT NULL CHECK (role IN ('user', 'assistant')),
  content    text NOT NULL,
  session_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_user_session ON messages(user_id, session_id, created_at);

-- Enable Row Level Security (users only access their own data)
ALTER TABLE user_settings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_entries      ENABLE ROW LEVEL SECURITY;
ALTER TABLE thought_records   ENABLE ROW LEVEL SECURITY;
ALTER TABLE gratitude_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages          ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_settings: self"    ON user_settings    FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "mood_entries: self"     ON mood_entries     FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "thought_records: self"  ON thought_records  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "gratitude_entries: self" ON gratitude_entries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "messages: self"         ON messages         FOR ALL USING (auth.uid() = user_id);
