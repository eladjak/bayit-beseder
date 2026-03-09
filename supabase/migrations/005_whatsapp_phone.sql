-- Add WhatsApp phone number to profiles for webhook user identification
-- Run this in Supabase SQL Editor

-- Add column if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'whatsapp_phone') THEN
    ALTER TABLE profiles ADD COLUMN whatsapp_phone text;
  END IF;
END $$;

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_profiles_whatsapp_phone ON profiles(whatsapp_phone);
