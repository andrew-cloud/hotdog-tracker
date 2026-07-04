-- Add avatar_url column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create public avatars bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (wrapped in DO block to avoid duplicate policy errors)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'avatars: anon insert'
  ) THEN
    EXECUTE 'CREATE POLICY "avatars: anon insert"
      ON storage.objects FOR INSERT TO anon
      WITH CHECK (bucket_id = ''avatars'')';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'avatars: public select'
  ) THEN
    EXECUTE 'CREATE POLICY "avatars: public select"
      ON storage.objects FOR SELECT TO anon
      USING (bucket_id = ''avatars'')';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'avatars: anon update'
  ) THEN
    EXECUTE 'CREATE POLICY "avatars: anon update"
      ON storage.objects FOR UPDATE TO anon
      USING (bucket_id = ''avatars'')
      WITH CHECK (bucket_id = ''avatars'')';
  END IF;
END $$;
