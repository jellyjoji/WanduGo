-- Restrict chat writes to authenticated users only
DO $$ BEGIN
  -- Messages: only authenticated users can send
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Anyone can send messages'
  ) THEN
    DROP POLICY "Anyone can send messages" ON messages;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Authenticated users can send messages'
  ) THEN
    CREATE POLICY "Authenticated users can send messages"
      ON messages FOR INSERT
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;

  -- Chat members: only authenticated users can join
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chat_members' AND policyname = 'Anyone can join chats'
  ) THEN
    DROP POLICY "Anyone can join chats" ON chat_members;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chat_members' AND policyname = 'Authenticated users can join chats'
  ) THEN
    CREATE POLICY "Authenticated users can join chats"
      ON chat_members FOR INSERT
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;

  -- Chats: only authenticated users can create
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chats' AND policyname = 'Anyone can create chats'
  ) THEN
    DROP POLICY "Anyone can create chats" ON chats;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chats' AND policyname = 'Authenticated users can create chats'
  ) THEN
    CREATE POLICY "Authenticated users can create chats"
      ON chats FOR INSERT
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;
