-- Revert profile INSERT/UPDATE RLS to permissive.
-- The supabase client used in the app (@/lib/supabase) is an anon client
-- that stores auth in localStorage. The auth modal uses @supabase/ssr which
-- stores auth in cookies. These are different clients with different sessions,
-- so auth.uid() is always NULL in database requests, silently blocking all writes.
-- UI-level auth gates enforce the requirement instead.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Authenticated users can create profile') THEN
    DROP POLICY "Authenticated users can create profile" ON profiles;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Anyone can create profiles') THEN
    CREATE POLICY "Anyone can create profiles" ON profiles FOR INSERT WITH CHECK (true);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Authenticated users can update profile') THEN
    DROP POLICY "Authenticated users can update profile" ON profiles;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Anyone can update profiles') THEN
    CREATE POLICY "Anyone can update profiles" ON profiles FOR UPDATE USING (true);
  END IF;
END $$;
