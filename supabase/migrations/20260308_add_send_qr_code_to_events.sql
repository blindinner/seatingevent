-- Add send_qr_code column to events table
-- Default to true for backwards compatibility (existing events will send QR codes)
ALTER TABLE events ADD COLUMN IF NOT EXISTS send_qr_code BOOLEAN DEFAULT true;

-- Add a comment for documentation
COMMENT ON COLUMN events.send_qr_code IS 'Whether to include QR code in ticket confirmation emails (only applies to free events)';
