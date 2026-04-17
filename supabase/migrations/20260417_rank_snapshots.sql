-- Stores each contestant's most recent standings rank.
-- Used to show position-change arrows (▲/▼) between sessions
-- without relying on localStorage (survives cache clears, works across devices).

CREATE TABLE IF NOT EXISTS rank_snapshots (
  display_name TEXT PRIMARY KEY,
  rank         INTEGER NOT NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE rank_snapshots ENABLE ROW LEVEL SECURITY;

-- Anyone can read (standings are public)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'rank_snapshots' AND policyname = 'Allow anon read'
  ) THEN
    CREATE POLICY "Allow anon read" ON rank_snapshots FOR SELECT USING (true);
  END IF;
END $$;

-- Anyone can insert (upsert on page load)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'rank_snapshots' AND policyname = 'Allow anon insert'
  ) THEN
    CREATE POLICY "Allow anon insert" ON rank_snapshots FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- Anyone can update (upsert on page load)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'rank_snapshots' AND policyname = 'Allow anon update'
  ) THEN
    CREATE POLICY "Allow anon update" ON rank_snapshots FOR UPDATE USING (true);
  END IF;
END $$;
