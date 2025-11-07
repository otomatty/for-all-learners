-- Plugin Signature Support
-- Migration: 20251105_03_plugin_signatures
-- Description: Add signature-related columns to plugins table and create verification log table

-- Add signature columns to plugins table
ALTER TABLE plugins ADD COLUMN IF NOT EXISTS signature TEXT;
ALTER TABLE plugins ADD COLUMN IF NOT EXISTS public_key TEXT;
ALTER TABLE plugins ADD COLUMN IF NOT EXISTS signature_algorithm TEXT DEFAULT 'ed25519';
ALTER TABLE plugins ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;

-- Add check constraint for signature_algorithm
ALTER TABLE plugins DROP CONSTRAINT IF EXISTS plugins_signature_algorithm_check;
ALTER TABLE plugins ADD CONSTRAINT plugins_signature_algorithm_check 
  CHECK (signature_algorithm IS NULL OR signature_algorithm IN ('ed25519', 'rsa'));

-- Create signature verification log table
CREATE TABLE IF NOT EXISTS plugin_signature_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plugin_id TEXT NOT NULL REFERENCES plugins(plugin_id) ON DELETE CASCADE,
  user_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  verification_result TEXT NOT NULL CHECK (verification_result IN ('valid', 'invalid', 'missing', 'error')),
  error_message TEXT,
  verified_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_psv_plugin_id ON plugin_signature_verifications(plugin_id);
CREATE INDEX IF NOT EXISTS idx_psv_user_id ON plugin_signature_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_psv_verification_result ON plugin_signature_verifications(verification_result);
CREATE INDEX IF NOT EXISTS idx_psv_verified_at ON plugin_signature_verifications(verified_at DESC);

-- Comments
COMMENT ON COLUMN plugins.signature IS 'Base64-encoded signature of the plugin code';
COMMENT ON COLUMN plugins.public_key IS 'Base64-encoded public key for signature verification';
COMMENT ON COLUMN plugins.signature_algorithm IS 'Signature algorithm used (ed25519 or rsa)';
COMMENT ON COLUMN plugins.signed_at IS 'Timestamp when the plugin was signed';
COMMENT ON TABLE plugin_signature_verifications IS 'Logs of plugin signature verification attempts';

-- Enable RLS on plugin_signature_verifications table
ALTER TABLE public.plugin_signature_verifications ENABLE ROW LEVEL SECURITY;

-- Policy: Allow read access only for admins
CREATE POLICY "Admins can view plugin signature verification logs"
  ON public.plugin_signature_verifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
        AND admin_users.role IN ('superadmin', 'admin')
        AND admin_users.is_active = true
    )
  );

-- Policy: Allow insert for system (service role) - no user policy needed
-- System inserts are handled via service role client (createAdminClient)
-- which bypasses RLS

