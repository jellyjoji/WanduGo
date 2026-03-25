-- Restrict profile INSERT and UPDATE to authenticated users only
DO $$ BEGIN
  -- Drop the permissive "anyone" policies
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Anyone can create profiles'
  ) THEN
    DROP POLICY "Anyone can create profiles" ON profiles;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Anyone can update profiles'
  ) THEN
    DROP POLICY "Anyone can update profiles" ON profiles;
  END IF;

  -- Only authenticated users can create a profile
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Authenticated users can create profile'
  ) THEN
    CREATE POLICY "Authenticated users can create profile"
      ON profiles FOR INSERT
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;

  -- Only authenticated users can update a profile
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Authenticated users can update profile'
  ) THEN
    CREATE POLICY "Authenticated users can update profile"
      ON profiles FOR UPDATE
      USING (auth.uid() IS NOT NULL);
  END IF;
END $$;
