-- ============================================
-- ORGANIZER TIERS: Free vs Branded
-- Free: 5% platform fee, "Powered by" shown
-- Branded: 8% platform fee, full branding access
-- ============================================

-- Create tier enum
CREATE TYPE organizer_tier AS ENUM ('free', 'branded');

-- Add tier column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tier organizer_tier DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tier_updated_at TIMESTAMPTZ;

-- Comment for clarity
COMMENT ON COLUMN profiles.tier IS 'Organizer pricing tier: free (5%) or branded (8%)';
COMMENT ON COLUMN profiles.tier_updated_at IS 'When the tier was last changed';

-- ============================================
-- FEE CONFIGURATION BY TIER
-- ============================================

-- Update fee_configurations to support tier-based defaults
-- We'll handle this in application code, but add a helper function

CREATE OR REPLACE FUNCTION get_organizer_fee_percent(organizer_uuid UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_tier organizer_tier;
BEGIN
  SELECT tier INTO v_tier
  FROM profiles
  WHERE id = organizer_uuid;

  -- Return fee based on tier
  CASE v_tier
    WHEN 'branded' THEN RETURN 8.0;
    ELSE RETURN 5.0;  -- free tier default
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_organizer_fee_percent IS 'Returns platform fee percentage based on organizer tier';

-- ============================================
-- AUTO-CREATE WHITE-LABEL THEME ON UPGRADE
-- ============================================

-- Function to create a default white-label theme for branded organizers
CREATE OR REPLACE FUNCTION create_branded_theme_for_organizer(
  organizer_uuid UUID,
  organizer_email TEXT
)
RETURNS UUID AS $$
DECLARE
  v_theme_id UUID;
  v_slug TEXT;
BEGIN
  -- Generate a slug from email (before @)
  v_slug := LOWER(REGEXP_REPLACE(SPLIT_PART(organizer_email, '@', 1), '[^a-z0-9]', '-', 'g'));

  -- Ensure slug is unique by appending random suffix if needed
  WHILE EXISTS (SELECT 1 FROM white_label_themes WHERE slug = v_slug) LOOP
    v_slug := v_slug || '-' || SUBSTRING(gen_random_uuid()::text, 1, 4);
  END LOOP;

  -- Create the theme
  INSERT INTO white_label_themes (
    slug,
    name,
    allowed_emails,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    v_slug,
    'My Brand',
    ARRAY[organizer_email],
    true,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_theme_id;

  RETURN v_theme_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_branded_theme_for_organizer IS 'Creates a default white-label theme when organizer upgrades to branded tier';
