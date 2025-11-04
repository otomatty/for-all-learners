-- Plugin Security Audit Logs
-- Migration: 20251105_01_plugin_security_audit_logs
-- Description: Create table for plugin security audit logs (Issue #96)
--
-- Related Documentation:
--   - Issue: #96 - Plugin System Security Enhancement
--   - Plan: docs/03_plans/plugin-system/implementation-status.md
--
-- Table created:
--   1. plugin_security_audit_logs - Security audit logs for plugin system

-- ============================================================================
-- 1. Plugin Security Audit Logs Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS plugin_security_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Plugin and User Identification
  plugin_id TEXT NOT NULL,                  -- Plugin ID (not FK for flexibility)
  user_id UUID REFERENCES accounts(id) ON DELETE SET NULL,  -- User ID (optional)
  
  -- Event Information
  event_type TEXT NOT NULL,                 -- Event type (api_call, rate_limit_violation, etc.)
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  
  -- Event Data (JSONB for flexibility)
  event_data JSONB NOT NULL DEFAULT '{}',   -- Event-specific data (namespace, method, reason, etc.)
  context JSONB DEFAULT '{}',                -- Additional context
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_event_type CHECK (
    event_type IN (
      'api_call',
      'api_call_failed',
      'rate_limit_violation',
      'execution_timeout',
      'storage_access',
      'storage_quota_exceeded',
      'plugin_error',
      'plugin_terminated',
      'unauthorized_access_attempt'
    )
  )
);

-- Indexes for plugin_security_audit_logs table
CREATE INDEX IF NOT EXISTS idx_plugin_security_audit_logs_plugin_id ON plugin_security_audit_logs(plugin_id);
CREATE INDEX IF NOT EXISTS idx_plugin_security_audit_logs_user_id ON plugin_security_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_plugin_security_audit_logs_event_type ON plugin_security_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_plugin_security_audit_logs_severity ON plugin_security_audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_plugin_security_audit_logs_created_at ON plugin_security_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plugin_security_audit_logs_plugin_created ON plugin_security_audit_logs(plugin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plugin_security_audit_logs_severity_created ON plugin_security_audit_logs(severity, created_at DESC) WHERE severity IN ('high', 'critical');

-- GIN index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_plugin_security_audit_logs_event_data_gin ON plugin_security_audit_logs USING gin (event_data jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_plugin_security_audit_logs_context_gin ON plugin_security_audit_logs USING gin (context jsonb_path_ops);

-- Comments
COMMENT ON TABLE plugin_security_audit_logs IS 'Security audit logs for plugin system events';
COMMENT ON COLUMN plugin_security_audit_logs.plugin_id IS 'Plugin ID that triggered the event';
COMMENT ON COLUMN plugin_security_audit_logs.user_id IS 'User ID associated with the event (optional)';
COMMENT ON COLUMN plugin_security_audit_logs.event_type IS 'Type of security event';
COMMENT ON COLUMN plugin_security_audit_logs.severity IS 'Severity level (low, medium, high, critical)';
COMMENT ON COLUMN plugin_security_audit_logs.event_data IS 'Event-specific data as JSONB (e.g., namespace, method, reason, etc.)';
COMMENT ON COLUMN plugin_security_audit_logs.context IS 'Additional context as JSONB';

