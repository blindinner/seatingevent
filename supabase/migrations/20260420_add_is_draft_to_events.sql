-- Add is_draft column to events table for draft/published status
ALTER TABLE events
ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT false;
