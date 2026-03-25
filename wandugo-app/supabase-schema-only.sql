-- WanduGo – Schema Only (no seed data)
-- Paste this into Supabase SQL Editor → Run ONCE to create all tables + RLS
-- After this runs, execute: node seed.js  (from the wandugo-app directory)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- TABLES
CREATE TABLE IF NOT EXISTS posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('jobs','community','marketplace','housing','events','tips','buy-sell','group-buy')),
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  location_text TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  author_name TEXT NOT NULL DEFAULT 'Anonymous',
  session_id TEXT NOT NULL,
  price DOUBLE PRECISION,
  image_url TEXT,
  likes INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_session   ON posts(session_id);
CREATE INDEX IF NOT EXISTS idx_posts_created   ON posts(created_at DESC);

CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  session_id TEXT NOT NULL,
  author_name TEXT NOT NULL DEFAULT 'Anonymous'
);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);

CREATE TABLE IF NOT EXISTS chats (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT,
  is_group BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS chat_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  author_name TEXT NOT NULL DEFAULT 'Anonymous',
  joined_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_members_session ON chat_members(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_chat    ON chat_members(chat_id);

CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  session_id TEXT NOT NULL,
  author_name TEXT NOT NULL DEFAULT 'Anonymous',
  type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text','image','location'))
);
CREATE INDEX IF NOT EXISTS idx_messages_chat    ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);

CREATE TABLE IF NOT EXISTS profiles (
  session_id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Anonymous',
  bio TEXT DEFAULT '',
  photo_url TEXT,
  location_text TEXT DEFAULT '',
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  rating DOUBLE PRECISION DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('comment','like','application','system')),
  content TEXT NOT NULL,
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_session ON notifications(session_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read    ON notifications(session_id, read);

-- ROW LEVEL SECURITY
ALTER TABLE posts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats          ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications  ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='posts' AND policyname='Anyone can read posts') THEN
    CREATE POLICY "Anyone can read posts"         ON posts        FOR SELECT USING (true);
    CREATE POLICY "Anyone can create posts"       ON posts        FOR INSERT WITH CHECK (true);
    CREATE POLICY "Authors can update own posts"  ON posts        FOR UPDATE USING (true);
    CREATE POLICY "Authors can delete own posts"  ON posts        FOR DELETE USING (true);
    CREATE POLICY "Anyone can read comments"      ON comments     FOR SELECT USING (true);
    CREATE POLICY "Anyone can create comments"    ON comments     FOR INSERT WITH CHECK (true);
    CREATE POLICY "Anyone can read chats"                  ON chats        FOR SELECT USING (true);
    CREATE POLICY "Anyone can create chats"               ON chats        FOR INSERT WITH CHECK (true);
    CREATE POLICY "Anyone can read chat members"          ON chat_members FOR SELECT USING (true);
    CREATE POLICY "Anyone can join chats"                 ON chat_members FOR INSERT WITH CHECK (true);
    CREATE POLICY "Anyone can read messages"              ON messages     FOR SELECT USING (true);
    CREATE POLICY "Anyone can send messages"              ON messages     FOR INSERT WITH CHECK (true);
    CREATE POLICY "Anyone can read profiles"      ON profiles     FOR SELECT USING (true);
    CREATE POLICY "Anyone can create profiles"    ON profiles     FOR INSERT WITH CHECK (true);
    CREATE POLICY "Anyone can update profiles"    ON profiles     FOR UPDATE USING (true);
    CREATE POLICY "Anyone can read notifications" ON notifications FOR SELECT USING (true);
    CREATE POLICY "Anyone can create notifications" ON notifications FOR INSERT WITH CHECK (true);
    CREATE POLICY "Anyone can update notifications" ON notifications FOR UPDATE USING (true);
  END IF;
END $$;

-- REALTIME (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='comments') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE comments;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;

-- ==========================================
-- STORAGE: post-images bucket
-- ==========================================
-- Creates a public bucket for post images and sets permissive policies.
-- Run this block once in the Supabase SQL Editor.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-images',
  'post-images',
  true,
  5242880,   -- 5 MB per file
  ARRAY['image/jpeg','image/png','image/webp','image/gif','image/heic']
)
ON CONFLICT (id) DO UPDATE SET
  public            = true,
  file_size_limit   = 5242880,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif','image/heic'];

-- Allow anyone to upload (INSERT) into the bucket
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'post-images: public upload'
  ) THEN
    CREATE POLICY "post-images: public upload"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'post-images');
  END IF;
END $$;

-- Allow anyone to read (SELECT) from the bucket
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'post-images: public read'
  ) THEN
    CREATE POLICY "post-images: public read"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'post-images');
  END IF;
END $$;
