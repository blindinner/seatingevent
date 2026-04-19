-- Add external_id column to events table for embed matching
-- This allows venues to map their CMS IDs (e.g., WordPress post IDs) to Seated event IDs
ALTER TABLE events
ADD COLUMN IF NOT EXISTS external_id TEXT DEFAULT NULL;

-- Create an index for efficient lookups by white_label_theme_id + external_id
CREATE INDEX IF NOT EXISTS idx_events_theme_external_id
ON events (white_label_theme_id, external_id)
WHERE external_id IS NOT NULL;
