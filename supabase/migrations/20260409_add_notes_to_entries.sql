-- Add optional notes field to entries
-- Notes are stored as plain text and displayed as a caption on the GIF.
ALTER TABLE entries ADD COLUMN IF NOT EXISTS notes TEXT;
