-- ============================================================
-- Migration: Add user_api_keys table for LLM API key management
-- Date: 2025-11-02
-- Issue: #74
-- Related: docs/03_plans/mastra-infrastructure/20251102_01_implementation-plan.md
-- ============================================================

-- Create user_api_keys table
CREATE TABLE IF NOT EXISTS public.user_api_keys (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign key to accounts table
  user_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  
  -- LLM provider name (gemini, openai, claude, etc.)
  provider VARCHAR(50) NOT NULL,
  
  -- Encrypted API key (never store plain text)
  encrypted_api_key TEXT NOT NULL,
  
  -- Active flag
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  
  -- Unique constraint: one API key per user per provider
  CONSTRAINT user_api_keys_user_provider_unique UNIQUE (user_id, provider)
);

-- ============================================================
-- Indexes
-- ============================================================

-- Index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id 
ON public.user_api_keys(user_id);

-- Index on provider for filtering
CREATE INDEX IF NOT EXISTS idx_user_api_keys_provider 
ON public.user_api_keys(provider);

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_provider_active 
ON public.user_api_keys(user_id, provider, is_active);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

-- Enable RLS
ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own API keys
CREATE POLICY "Users can manage their own API keys"
ON public.user_api_keys
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Service role can access all API keys (for admin/migration purposes)
CREATE POLICY "Service role can access all API keys"
ON public.user_api_keys
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================
-- Triggers
-- ============================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_user_api_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at on UPDATE
CREATE TRIGGER trigger_update_user_api_keys_updated_at
BEFORE UPDATE ON public.user_api_keys
FOR EACH ROW
EXECUTE FUNCTION public.update_user_api_keys_updated_at();

-- ============================================================
-- Comments (for documentation)
-- ============================================================

COMMENT ON TABLE public.user_api_keys IS 'Stores encrypted LLM API keys for each user';
COMMENT ON COLUMN public.user_api_keys.id IS 'Unique identifier';
COMMENT ON COLUMN public.user_api_keys.user_id IS 'Reference to accounts table';
COMMENT ON COLUMN public.user_api_keys.provider IS 'LLM provider name (gemini, openai, claude)';
COMMENT ON COLUMN public.user_api_keys.encrypted_api_key IS 'Encrypted API key (AES-256-GCM)';
COMMENT ON COLUMN public.user_api_keys.is_active IS 'Whether this API key is currently active';
COMMENT ON COLUMN public.user_api_keys.created_at IS 'Timestamp when the key was first added';
COMMENT ON COLUMN public.user_api_keys.updated_at IS 'Timestamp when the key was last updated';
COMMENT ON COLUMN public.user_api_keys.last_used_at IS 'Timestamp when the key was last used for an API call';

-- ============================================================
-- Grants (optional, adjust based on your security model)
-- ============================================================

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_api_keys TO authenticated;
GRANT USAGE ON SEQUENCE user_api_keys_id_seq TO authenticated;
