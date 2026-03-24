-- WanduGo Database Schema for Supabase
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- POSTS TABLE
-- ==========================================
CREATE TABLE posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('jobs', 'community', 'marketplace', 'housing', 'events', 'tips', 'buy-sell', 'group-buy')),
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

-- Index for faster location-based queries
CREATE INDEX idx_posts_category ON posts(category);
CREATE INDEX idx_posts_session ON posts(session_id);
CREATE INDEX idx_posts_created ON posts(created_at DESC);

-- ==========================================
-- COMMENTS TABLE
-- ==========================================
CREATE TABLE comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  session_id TEXT NOT NULL,
  author_name TEXT NOT NULL DEFAULT 'Anonymous'
);

CREATE INDEX idx_comments_post ON comments(post_id);

-- ==========================================
-- CHATS TABLE
-- ==========================================
CREATE TABLE chats (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT,
  is_group BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL
);

-- ==========================================
-- CHAT MEMBERS TABLE
-- ==========================================
CREATE TABLE chat_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  author_name TEXT NOT NULL DEFAULT 'Anonymous',
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_members_session ON chat_members(session_id);
CREATE INDEX idx_chat_members_chat ON chat_members(chat_id);

-- ==========================================
-- MESSAGES TABLE
-- ==========================================
CREATE TABLE messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  session_id TEXT NOT NULL,
  author_name TEXT NOT NULL DEFAULT 'Anonymous',
  type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'image', 'location'))
);

CREATE INDEX idx_messages_chat ON messages(chat_id);
CREATE INDEX idx_messages_created ON messages(created_at);

-- ==========================================
-- PROFILES TABLE
-- ==========================================
CREATE TABLE profiles (
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

-- ==========================================
-- NOTIFICATIONS TABLE
-- ==========================================
CREATE TABLE notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('comment', 'like', 'application', 'system')),
  content TEXT NOT NULL,
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_session ON notifications(session_id);
CREATE INDEX idx_notifications_read ON notifications(session_id, read);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================
-- Enable RLS on all tables
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Allow public read/insert for all tables (no auth required for session-based app)
-- Posts
CREATE POLICY "Anyone can read posts" ON posts FOR SELECT USING (true);
CREATE POLICY "Anyone can create posts" ON posts FOR INSERT WITH CHECK (true);
CREATE POLICY "Authors can update own posts" ON posts FOR UPDATE USING (true);

-- Comments
CREATE POLICY "Anyone can read comments" ON comments FOR SELECT USING (true);
CREATE POLICY "Anyone can create comments" ON comments FOR INSERT WITH CHECK (true);

-- Chats
CREATE POLICY "Anyone can read chats" ON chats FOR SELECT USING (true);
CREATE POLICY "Anyone can create chats" ON chats FOR INSERT WITH CHECK (true);

-- Chat Members
CREATE POLICY "Anyone can read chat members" ON chat_members FOR SELECT USING (true);
CREATE POLICY "Anyone can join chats" ON chat_members FOR INSERT WITH CHECK (true);

-- Messages
CREATE POLICY "Anyone can read messages" ON messages FOR SELECT USING (true);
CREATE POLICY "Anyone can send messages" ON messages FOR INSERT WITH CHECK (true);

-- Profiles
CREATE POLICY "Anyone can read profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Anyone can create profiles" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update profiles" ON profiles FOR UPDATE USING (true);

-- Notifications
CREATE POLICY "Anyone can read notifications" ON notifications FOR SELECT USING (true);
CREATE POLICY "Anyone can create notifications" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update notifications" ON notifications FOR UPDATE USING (true);

-- ==========================================
-- REALTIME
-- ==========================================
-- Enable realtime for messages and comments
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
