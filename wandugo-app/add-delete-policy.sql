-- Add missing DELETE policy for posts table
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'posts' AND policyname = 'Authors can delete own posts'
  ) THEN
    CREATE POLICY "Authors can delete own posts" ON posts FOR DELETE USING (true);
  END IF;
END $$;
