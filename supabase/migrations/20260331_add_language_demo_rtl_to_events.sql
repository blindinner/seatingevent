-- Add language, is_demo, and description_rtl columns to events table
ALTER TABLE events
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en',
ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS description_rtl BOOLEAN DEFAULT false;
