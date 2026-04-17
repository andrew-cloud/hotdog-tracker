-- Stores the winner of each completed monthly battle.
-- Created once at month end by the Trigger.dev monthly-battle-close task.

CREATE TABLE IF NOT EXISTS monthly_champions (
  month        TEXT PRIMARY KEY,   -- "YYYY-MM"  e.g. "2026-04"
  winner_name  TEXT NOT NULL,
  dog_count    INTEGER NOT NULL,
  crowned_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE monthly_champions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'monthly_champions' AND policyname = 'Allow anon read'
  ) THEN
    CREATE POLICY "Allow anon read" ON monthly_champions FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'monthly_champions' AND policyname = 'Allow service insert'
  ) THEN
    CREATE POLICY "Allow service insert" ON monthly_champions FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'monthly_champions' AND policyname = 'Allow service update'
  ) THEN
    CREATE POLICY "Allow service update" ON monthly_champions FOR UPDATE USING (true);
  END IF;
END $$;

-- ── Retroactive seeding ───────────────────────────────────────────────────────
-- Awards champions for every completed month that has entries in the entries table.
-- Tie-break: most dogs in the month; if equal, whoever reached that total first
-- (i.e. whose last entry for the month has the earliest timestamp).

WITH monthly_totals AS (
  SELECT
    to_char(
      to_timestamp(timestamp / 1000.0) AT TIME ZONE 'UTC',
      'YYYY-MM'
    ) AS month,
    name,
    SUM(count)     AS dog_count,
    MAX(timestamp) AS last_entry_ts   -- when they "completed" their total
  FROM entries
  WHERE
    -- only fully completed months (not the current one)
    to_timestamp(timestamp / 1000.0) AT TIME ZONE 'UTC'
      < date_trunc('month', now() AT TIME ZONE 'UTC')
  GROUP BY month, name
),
ranked AS (
  SELECT *,
    ROW_NUMBER() OVER (
      PARTITION BY month
      ORDER BY dog_count DESC, last_entry_ts ASC
    ) AS rn
  FROM monthly_totals
)
INSERT INTO monthly_champions (month, winner_name, dog_count, crowned_at)
SELECT month, name, dog_count, now()
FROM ranked
WHERE rn = 1
ON CONFLICT (month) DO NOTHING;
