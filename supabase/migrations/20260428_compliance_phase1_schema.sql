-- ============================================
-- PHASE 1: Compliance & Payout Schema
-- Adds organizer verification, agreements, and payout invoice workflow
-- ============================================

-- ============================================
-- 1. ENUM TYPES
-- ============================================

-- Organizer business type
CREATE TYPE vat_id_type AS ENUM ('osek_patur', 'osek_morsheh', 'chevra_baam');

-- Verification status
CREATE TYPE verification_status AS ENUM ('unverified', 'pending_review', 'verified', 'rejected');

-- Payout status (extended workflow with invoice requirement)
CREATE TYPE payout_status AS ENUM (
  'pending',           -- Payout created, waiting for refund window
  'awaiting_invoice',  -- Ready for payout, waiting for organizer invoice
  'invoice_uploaded',  -- Organizer uploaded invoice
  'under_review',      -- Admin reviewing
  'approved',          -- Admin approved, ready for transfer
  'paid',              -- Money transferred
  'rejected'           -- Admin rejected (with notes)
);

-- ============================================
-- 2. EXTEND PROFILES TABLE (Organizer Verification)
-- ============================================

-- Business information
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS vat_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS vat_id_type vat_id_type;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS legal_name TEXT;

-- Bank details
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bank_branch TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bank_account_number TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bank_account_holder_name TEXT;

-- Verification status
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_status verification_status DEFAULT 'unverified';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_notes TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id);

-- Preferred language for communications
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'he';

-- Add comment
COMMENT ON COLUMN profiles.vat_id IS 'Israeli VAT ID (עוסק מורשה/פטור number) or company number (ח.פ.)';
COMMENT ON COLUMN profiles.vat_id_type IS 'Type of business registration';
COMMENT ON COLUMN profiles.legal_name IS 'Legal business name - must match VAT registration';
COMMENT ON COLUMN profiles.bank_account_holder_name IS 'Must match legal_name for verification';
COMMENT ON COLUMN profiles.verification_status IS 'Organizer verification status for paid events';

-- ============================================
-- 3. PLATFORM AGREEMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS platform_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL,
  content_he TEXT NOT NULL,
  content_en TEXT NOT NULL,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_current BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure only one current agreement
  CONSTRAINT only_one_current_agreement EXCLUDE (is_current WITH =) WHERE (is_current = true)
);

COMMENT ON TABLE platform_agreements IS 'Versioned platform agreements that organizers must sign';
COMMENT ON COLUMN platform_agreements.is_current IS 'Only one agreement can be current at a time';

-- ============================================
-- 4. ORGANIZER AGREEMENT SIGNATURES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS organizer_agreement_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  agreement_id UUID NOT NULL REFERENCES platform_agreements(id) ON DELETE RESTRICT,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  signature_data JSONB DEFAULT '{}',

  -- Each organizer can only sign each agreement version once
  CONSTRAINT unique_organizer_agreement UNIQUE (organizer_id, agreement_id)
);

CREATE INDEX idx_signatures_organizer ON organizer_agreement_signatures(organizer_id);
CREATE INDEX idx_signatures_agreement ON organizer_agreement_signatures(agreement_id);

COMMENT ON TABLE organizer_agreement_signatures IS 'Records of organizers signing platform agreements';

-- ============================================
-- 5. EXTEND PAYOUTS TABLE (Invoice Workflow)
-- ============================================

-- First, drop the old status check constraint if it exists
ALTER TABLE payouts DROP CONSTRAINT IF EXISTS payouts_status_check;

-- Add new columns for invoice workflow
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id);
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS gross_amount NUMERIC;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS commission_amount NUMERIC;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS payout_amount NUMERIC;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS organizer_invoice_url TEXT;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS organizer_invoice_number TEXT;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS organizer_invoice_uploaded_at TIMESTAMPTZ;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS payment_reference TEXT;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id);
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS payout_ready_date DATE;

-- Update status column to use new enum (need to handle existing data)
-- First create a temporary column
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS status_new payout_status DEFAULT 'pending';

-- Migrate existing data
UPDATE payouts SET status_new =
  CASE status
    WHEN 'pending' THEN 'pending'::payout_status
    WHEN 'processing' THEN 'under_review'::payout_status
    WHEN 'completed' THEN 'paid'::payout_status
    WHEN 'failed' THEN 'rejected'::payout_status
    ELSE 'pending'::payout_status
  END;

-- Drop old column and rename new one
ALTER TABLE payouts DROP COLUMN IF EXISTS status;
ALTER TABLE payouts RENAME COLUMN status_new TO status;

-- Add constraint: cannot be 'paid' without invoice
ALTER TABLE payouts ADD CONSTRAINT payout_requires_invoice
  CHECK (status != 'paid' OR organizer_invoice_url IS NOT NULL);

COMMENT ON COLUMN payouts.organizer_invoice_url IS 'URL to uploaded חשבונית מס from organizer';
COMMENT ON COLUMN payouts.payout_ready_date IS 'Date when payout becomes available (event date + 14 days)';
COMMENT ON CONSTRAINT payout_requires_invoice ON payouts IS 'Ensures no payout can be marked paid without an uploaded invoice';

-- ============================================
-- 6. ADMIN ACTIONS AUDIT LOG
-- ============================================

CREATE TABLE IF NOT EXISTS admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id),
  action_type TEXT NOT NULL,
  target_table TEXT NOT NULL,
  target_id UUID NOT NULL,
  before_state JSONB,
  after_state JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_actions_admin ON admin_actions(admin_user_id);
CREATE INDEX idx_admin_actions_target ON admin_actions(target_table, target_id);
CREATE INDEX idx_admin_actions_created ON admin_actions(created_at DESC);

COMMENT ON TABLE admin_actions IS 'Audit log of all admin actions for compliance';

-- ============================================
-- 7. UPDATE FEE CONFIGURATION DEFAULTS
-- ============================================

-- Add buyer service fee column to fee_configurations
ALTER TABLE fee_configurations ADD COLUMN IF NOT EXISTS buyer_service_fee_percent NUMERIC DEFAULT 5.00;

-- Update the default platform fee to 5%
ALTER TABLE fee_configurations ALTER COLUMN platform_fee_percent SET DEFAULT 5.00;

-- Update existing global config if it exists
UPDATE fee_configurations
SET platform_fee_percent = 5.00,
    buyer_service_fee_percent = 5.00
WHERE organizer_id IS NULL AND event_id IS NULL;

-- Also update events table default
ALTER TABLE events ALTER COLUMN platform_fee_percent SET DEFAULT 5.00;

COMMENT ON COLUMN fee_configurations.buyer_service_fee_percent IS 'Fee charged to buyer on top of ticket price (default 5%)';
COMMENT ON COLUMN fee_configurations.platform_fee_percent IS 'Fee deducted from organizer revenue (default 5%)';

-- ============================================
-- 8. ROW LEVEL SECURITY POLICIES
-- ============================================

-- Platform agreements: public read, admin write
ALTER TABLE platform_agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view platform agreements" ON platform_agreements
  FOR SELECT USING (true);

-- Note: Admin insert/update handled via service role key

-- Agreement signatures: organizers can view/create their own
ALTER TABLE organizer_agreement_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can view own signatures" ON organizer_agreement_signatures
  FOR SELECT USING (auth.uid() = organizer_id);

CREATE POLICY "Organizers can sign agreements" ON organizer_agreement_signatures
  FOR INSERT WITH CHECK (auth.uid() = organizer_id);

-- Payouts: organizers can view their own, but not modify
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can view own payouts" ON payouts
  FOR SELECT USING (auth.uid() = organizer_id);

-- Note: Organizers cannot INSERT/UPDATE payouts directly - handled by backend

-- Admin actions: only service role
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;
-- No policies = only service role can access

-- Update profiles RLS for new columns
-- Organizers can update their own verification data (except status)
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- Cannot self-modify verification status
    AND (
      verification_status IS NOT DISTINCT FROM (SELECT verification_status FROM profiles WHERE id = auth.uid())
      OR verification_status = 'pending_review'
    )
  );

-- ============================================
-- 9. HELPER FUNCTION: Check if organizer can publish paid events
-- ============================================

CREATE OR REPLACE FUNCTION can_publish_paid_event(organizer_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_status verification_status;
BEGIN
  SELECT verification_status INTO v_status
  FROM profiles
  WHERE id = organizer_uuid;

  RETURN v_status = 'verified';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION can_publish_paid_event IS 'Returns true if organizer is verified and can publish paid events';

-- ============================================
-- 10. HELPER FUNCTION: Check if organizer has signed current agreement
-- ============================================

CREATE OR REPLACE FUNCTION has_signed_current_agreement(organizer_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM organizer_agreement_signatures s
    JOIN platform_agreements a ON s.agreement_id = a.id
    WHERE s.organizer_id = organizer_uuid
    AND a.is_current = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION has_signed_current_agreement IS 'Returns true if organizer has signed the current platform agreement';

-- ============================================
-- 11. SEED: Insert default platform agreement (placeholder)
-- ============================================

INSERT INTO platform_agreements (version, content_he, content_en, is_current)
VALUES (
  'v1.0',
  E'# הסכם פלטפורמת Rendeza\n\n## תנאי שימוש למארגני אירועים\n\nגרסה 1.0 | תאריך תחולה: ' || TO_CHAR(NOW(), 'DD/MM/YYYY') || E'\n\n### 1. הגדרות\n\n**"הפלטפורמה"** - מערכת Rendeza לניהול ומכירת כרטיסים לאירועים.\n\n**"מארגן"** - כל אדם או ישות משפטית המשתמשים בפלטפורמה ליצירת אירועים ומכירת כרטיסים.\n\n**"עמלת פלטפורמה"** - 5% מסכום הכרטיס, המנוכים מהתקבול של המארגן.\n\n**"עמלת שירות"** - 5% המתווספים למחיר הכרטיס ומשולמים על ידי הרוכש.\n\n### 2. תנאי תשלום\n\n2.1 התשלום למארגן יבוצע תוך 14 ימי עסקים מתום האירוע.\n\n2.2 התשלום מותנה בהמצאת חשבונית מס כדין על ידי המארגן.\n\n2.3 ללא חשבונית מס תקינה, לא יבוצע תשלום.\n\n### 3. החזרים וביטולים\n\n3.1 המארגן אחראי לטיפול בבקשות החזר מול רוכשי הכרטיסים.\n\n3.2 הפלטפורמה תסייע בביצוע ההחזר הטכני.\n\n3.3 עמלת השירות אינה מוחזרת לרוכש.\n\n### 4. אחריות המארגן\n\n4.1 המארגן מתחייב כי הוא עוסק מורשה/עוסק פטור/חברה בע"מ רשומה כדין.\n\n4.2 המארגן אחראי לכל היבטי המס הקשורים להכנסותיו.\n\n4.3 המארגן מתחייב לספק את האירוע כפי שפורסם.\n\n### 5. שיפוי\n\nהמארגן ישפה את Rendeza בגין כל תביעה, נזק או הוצאה הנובעים מהאירוע או מהפרת הסכם זה.\n\n### 6. סמכות שיפוט\n\nהסכם זה כפוף לדיני מדינת ישראל. סמכות השיפוט הבלעדית נתונה לבתי המשפט בתל אביב-יפו.\n\n---\n\nבלחיצה על "אני מאשר", הנך מסכים לתנאים אלה.',

  E'# Rendeza Platform Agreement\n\n## Terms of Service for Event Organizers\n\nVersion 1.0 | Effective Date: ' || TO_CHAR(NOW(), 'DD/MM/YYYY') || E'\n\n### 1. Definitions\n\n**"Platform"** - The Rendeza event management and ticketing system.\n\n**"Organizer"** - Any person or legal entity using the Platform to create events and sell tickets.\n\n**"Platform Fee"** - 5% of the ticket price, deducted from the Organizer''s proceeds.\n\n**"Service Fee"** - 5% added to the ticket price, paid by the buyer.\n\n### 2. Payment Terms\n\n2.1 Payment to the Organizer will be made within 14 business days after the event concludes.\n\n2.2 Payment is conditional upon the Organizer providing a valid tax invoice.\n\n2.3 Without a valid tax invoice, no payment will be processed.\n\n### 3. Refunds and Cancellations\n\n3.1 The Organizer is responsible for handling refund requests from ticket purchasers.\n\n3.2 The Platform will assist with technical processing of refunds.\n\n3.3 Service fees are non-refundable to buyers.\n\n### 4. Organizer Responsibilities\n\n4.1 The Organizer warrants they are a legally registered business entity.\n\n4.2 The Organizer is responsible for all tax matters related to their income.\n\n4.3 The Organizer commits to delivering the event as advertised.\n\n### 5. Indemnification\n\nThe Organizer shall indemnify Rendeza against any claims, damages, or expenses arising from the event or breach of this agreement.\n\n### 6. Governing Law\n\nThis agreement is governed by the laws of the State of Israel. Exclusive jurisdiction is granted to the courts of Tel Aviv-Yafo.\n\n---\n\nBy clicking "I Agree", you accept these terms.',

  true
)
ON CONFLICT DO NOTHING;
