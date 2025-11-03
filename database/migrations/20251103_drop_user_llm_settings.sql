-- Drop user_llm_settings table (unused, replaced by encrypted_api_keys)
-- Phase 1.5: Settings Consolidation
-- Date: 2025-11-03

-- Drop policies first
DROP POLICY IF EXISTS "Users can manage own llm settings" ON user_llm_settings;

-- Drop table
DROP TABLE IF EXISTS user_llm_settings;
