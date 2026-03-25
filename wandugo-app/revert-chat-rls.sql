-- Revert chat/message/chat_member INSERT policies back to permissive.
-- Reasoning: the app's supabase client in use is the anon client (localStorage auth),
-- not the SSR cookie-based client that the auth modal uses. auth.uid() is always NULL
-- for these requests, so requiring it blocks all creates. UI-level auth gates are used instead.
DO $$ BEGIN
  -- chats
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chats' AND policyname = 'Authenticated users can create chats') THEN
    DROP POLICY "Authenticated users can create chats" ON chats;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chats' AND policyname = 'Anyone can create chats') THEN
    CREATE POLICY "Anyone can create chats" ON chats FOR INSERT WITH CHECK (true);
  END IF;

  -- chat_members
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_members' AND policyname = 'Authenticated users can join chats') THEN
    DROP POLICY "Authenticated users can join chats" ON chat_members;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_members' AND policyname = 'Anyone can join chats') THEN
    CREATE POLICY "Anyone can join chats" ON chat_members FOR INSERT WITH CHECK (true);
  END IF;

  -- messages
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Authenticated users can send messages') THEN
    DROP POLICY "Authenticated users can send messages" ON messages;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Anyone can send messages') THEN
    CREATE POLICY "Anyone can send messages" ON messages FOR INSERT WITH CHECK (true);
  END IF;
END $$;
