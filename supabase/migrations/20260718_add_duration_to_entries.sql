-- Add optional video duration to entries, used to compute average
-- consumption time on the Profile page. Captured client-side from the
-- uploaded video's metadata at selection time.
ALTER TABLE entries ADD COLUMN IF NOT EXISTS duration_seconds NUMERIC;
