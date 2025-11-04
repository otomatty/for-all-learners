-- Plugin System Database Schema
-- Migration: 20251104_01_plugin_system
-- Description: Create tables for plugin system (Phase 1)
--
-- Related Documentation:
--   - Plan: docs/03_plans/plugin-system/phase1-core-system.md
--   - Types: types/plugin.ts
--
-- Tables created:
--   1. plugins - Plugin metadata and marketplace info
--   2. user_plugins - User's installed plugins
--   3. plugin_storage - Plugin-specific key-value storage

-- ============================================================================
-- 1. Plugins Table (Marketplace)
-- ============================================================================

CREATE TABLE IF NOT EXISTS plugins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Plugin Identification
  plugin_id TEXT UNIQUE NOT NULL,           -- Manifest ID (e.g., "com.example.my-plugin")
  
  -- Basic Information
  name TEXT NOT NULL,                       -- Display name
  version TEXT NOT NULL,                    -- Semantic version (e.g., "1.0.0")
  description TEXT,                         -- Short description
  author TEXT NOT NULL,                     -- Author name or organization
  homepage TEXT,                            -- Homepage URL
  repository TEXT,                          -- Repository URL
  license TEXT,                             -- License identifier (e.g., "MIT")
  
  -- Manifest
  manifest JSONB NOT NULL,                  -- Complete manifest as JSONB
  
  -- Code Storage
  code_url TEXT NOT NULL,                   -- URL to plugin code in Supabase Storage
  
  -- Marketplace Metadata
  is_official BOOLEAN DEFAULT FALSE,        -- Official F.A.L plugin
  is_reviewed BOOLEAN DEFAULT FALSE,        -- Code reviewed and approved
  downloads_count INTEGER DEFAULT 0,        -- Total download count
  rating_average DECIMAL(3,2),              -- Average rating (0.00-5.00)
  rating_count INTEGER DEFAULT 0,           -- Number of ratings
  
  -- Extension Points (for quick filtering)
  has_editor_extension BOOLEAN DEFAULT FALSE,
  has_ai_extension BOOLEAN DEFAULT FALSE,
  has_ui_extension BOOLEAN DEFAULT FALSE,
  has_data_processor_extension BOOLEAN DEFAULT FALSE,
  has_integration_extension BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,                 -- When made public
  
  -- Constraints
  CONSTRAINT valid_version CHECK (version ~ '^\d+\.\d+\.\d+'),
  CONSTRAINT valid_rating CHECK (rating_average IS NULL OR (rating_average >= 0 AND rating_average <= 5))
);

-- Indexes for plugins table
CREATE INDEX IF NOT EXISTS idx_plugins_plugin_id ON plugins(plugin_id);
CREATE INDEX IF NOT EXISTS idx_plugins_author ON plugins(author);
CREATE INDEX IF NOT EXISTS idx_plugins_is_official ON plugins(is_official) WHERE is_official = TRUE;
CREATE INDEX IF NOT EXISTS idx_plugins_is_reviewed ON plugins(is_reviewed) WHERE is_reviewed = TRUE;
CREATE INDEX IF NOT EXISTS idx_plugins_downloads ON plugins(downloads_count DESC);
CREATE INDEX IF NOT EXISTS idx_plugins_rating ON plugins(rating_average DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_plugins_manifest_gin ON plugins USING gin (manifest jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_plugins_extension_points ON plugins(has_editor_extension, has_ai_extension, has_ui_extension, has_data_processor_extension, has_integration_extension);

-- Comments
COMMENT ON TABLE plugins IS 'Plugin marketplace metadata and information';
COMMENT ON COLUMN plugins.plugin_id IS 'Unique plugin identifier from manifest (e.g., com.example.my-plugin)';
COMMENT ON COLUMN plugins.manifest IS 'Complete plugin manifest as JSONB';
COMMENT ON COLUMN plugins.code_url IS 'URL to plugin code bundle in Supabase Storage';
COMMENT ON COLUMN plugins.is_official IS 'Whether this is an official F.A.L plugin';
COMMENT ON COLUMN plugins.is_reviewed IS 'Whether code has been reviewed and approved';

-- ============================================================================
-- 2. User Plugins Table (Installed Plugins)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_plugins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User and Plugin
  user_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  plugin_id TEXT NOT NULL REFERENCES plugins(plugin_id) ON DELETE CASCADE,
  
  -- Installation Info
  installed_version TEXT NOT NULL,          -- Version that was installed
  enabled BOOLEAN DEFAULT TRUE,             -- Whether plugin is active
  
  -- Configuration
  config JSONB,                             -- User-specific plugin configuration
  
  -- Timestamps
  installed_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,                 -- Last time plugin was active
  
  -- Constraints
  UNIQUE(user_id, plugin_id)
);

-- Indexes for user_plugins table
CREATE INDEX IF NOT EXISTS idx_user_plugins_user_id ON user_plugins(user_id);
CREATE INDEX IF NOT EXISTS idx_user_plugins_plugin_id ON user_plugins(plugin_id);
CREATE INDEX IF NOT EXISTS idx_user_plugins_enabled ON user_plugins(enabled) WHERE enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_plugins_user_enabled ON user_plugins(user_id, enabled) WHERE enabled = TRUE;

-- Comments
COMMENT ON TABLE user_plugins IS 'User installed plugins and their configurations';
COMMENT ON COLUMN user_plugins.config IS 'User-specific configuration overriding plugin defaults';
COMMENT ON COLUMN user_plugins.enabled IS 'Whether the plugin is currently active for this user';

-- ============================================================================
-- 3. Plugin Storage Table (Key-Value Store)
-- ============================================================================

CREATE TABLE IF NOT EXISTS plugin_storage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ownership
  user_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  plugin_id TEXT NOT NULL,                  -- Plugin ID (not FK for flexibility)
  
  -- Key-Value
  key TEXT NOT NULL,                        -- Storage key
  value JSONB NOT NULL,                     -- Storage value (JSON serializable)
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, plugin_id, key),
  CONSTRAINT valid_key CHECK (key != '' AND length(key) <= 255)
);

-- Indexes for plugin_storage table
CREATE INDEX IF NOT EXISTS idx_plugin_storage_user_plugin ON plugin_storage(user_id, plugin_id);
CREATE INDEX IF NOT EXISTS idx_plugin_storage_user_plugin_key ON plugin_storage(user_id, plugin_id, key);
CREATE INDEX IF NOT EXISTS idx_plugin_storage_value_gin ON plugin_storage USING gin (value jsonb_path_ops);

-- Comments
COMMENT ON TABLE plugin_storage IS 'Plugin-specific key-value storage for each user';
COMMENT ON COLUMN plugin_storage.key IS 'Storage key (max 255 characters)';
COMMENT ON COLUMN plugin_storage.value IS 'Storage value as JSONB';

-- ============================================================================
-- Trigger Functions
-- ============================================================================

-- Update updated_at timestamp for plugins
CREATE OR REPLACE FUNCTION update_plugins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_plugins_updated_at
BEFORE UPDATE ON plugins
FOR EACH ROW
EXECUTE FUNCTION update_plugins_updated_at();

-- Update last_updated_at timestamp for user_plugins
CREATE OR REPLACE FUNCTION update_user_plugins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_plugins_updated_at
BEFORE UPDATE ON user_plugins
FOR EACH ROW
EXECUTE FUNCTION update_user_plugins_updated_at();

-- Update updated_at timestamp for plugin_storage
CREATE OR REPLACE FUNCTION update_plugin_storage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_plugin_storage_updated_at
BEFORE UPDATE ON plugin_storage
FOR EACH ROW
EXECUTE FUNCTION update_plugin_storage_updated_at();

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE plugins ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_plugins ENABLE ROW LEVEL SECURITY;
ALTER TABLE plugin_storage ENABLE ROW LEVEL SECURITY;

-- Plugins: Public read, admin write
CREATE POLICY "Plugins are viewable by everyone"
  ON plugins FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert plugins"
  ON plugins FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = true
    )
  );

CREATE POLICY "Only admins can update plugins"
  ON plugins FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = true
    )
  );

CREATE POLICY "Only admins can delete plugins"
  ON plugins FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = true
    )
  );

-- User Plugins: Users can manage their own installations
CREATE POLICY "Users can view their own plugins"
  ON user_plugins FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can install plugins"
  ON user_plugins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own plugins"
  ON user_plugins FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can uninstall their own plugins"
  ON user_plugins FOR DELETE
  USING (auth.uid() = user_id);

-- Plugin Storage: Users can access only their own plugin data
CREATE POLICY "Users can view their own plugin storage"
  ON plugin_storage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into their own plugin storage"
  ON plugin_storage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own plugin storage"
  ON plugin_storage FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own plugin storage"
  ON plugin_storage FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- Helper Functions
-- ============================================================================

/**
 * Increment plugin download count
 */
CREATE OR REPLACE FUNCTION increment_plugin_downloads(p_plugin_id TEXT)
RETURNS void AS $$
BEGIN
  UPDATE plugins
  SET downloads_count = downloads_count + 1
  WHERE plugin_id = p_plugin_id;
END;
$$ LANGUAGE plpgsql;

/**
 * Update plugin rating
 */
CREATE OR REPLACE FUNCTION update_plugin_rating(
  p_plugin_id TEXT,
  p_new_rating DECIMAL
)
RETURNS void AS $$
DECLARE
  v_current_avg DECIMAL;
  v_current_count INTEGER;
  v_new_avg DECIMAL;
BEGIN
  SELECT rating_average, rating_count
  INTO v_current_avg, v_current_count
  FROM plugins
  WHERE plugin_id = p_plugin_id;
  
  -- Calculate new average
  IF v_current_avg IS NULL THEN
    v_new_avg := p_new_rating;
    v_current_count := 1;
  ELSE
    v_current_count := v_current_count + 1;
    v_new_avg := ((v_current_avg * (v_current_count - 1)) + p_new_rating) / v_current_count;
  END IF;
  
  -- Update plugin
  UPDATE plugins
  SET 
    rating_average = v_new_avg,
    rating_count = v_current_count
  WHERE plugin_id = p_plugin_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Sample Data (for development/testing)
-- ============================================================================

-- Note: Sample data should be inserted via separate seed script in development
-- This is just a template showing the structure

/*
INSERT INTO plugins (
  plugin_id,
  name,
  version,
  description,
  author,
  manifest,
  code_url,
  is_official,
  is_reviewed,
  has_editor_extension
) VALUES (
  'com.fal.example-plugin',
  'Example Plugin',
  '1.0.0',
  'An example plugin for testing',
  'F.A.L Team',
  '{"id": "com.fal.example-plugin", "name": "Example Plugin", ...}'::jsonb,
  'https://storage.supabase.co/plugins/example-plugin-1.0.0.js',
  true,
  true,
  true
);
*/

