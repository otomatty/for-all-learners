-- Plugin Security Alerts
-- Migration: 20251105_04_plugin_security_alerts
-- Description: Create table for plugin security alerts (Issue #96)
--
-- Related Documentation:
--   - Issue: #96 - Plugin System Security Enhancement
--   - Plan: docs/03_plans/plugin-system/implementation-status.md
--
-- Table created:
--   1. plugin_security_alerts - Security alerts generated from anomaly detection

-- ============================================================================
-- 1. Plugin Security Alerts Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS plugin_security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Alert Information
  alert_type TEXT NOT NULL,                     -- Alert type (rate_limit_spike, signature_failure_spike, etc.)
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,                          -- Alert title
  description TEXT NOT NULL,                     -- Alert description
  
  -- Related Information
  plugin_id TEXT,                               -- Plugin ID (if applicable, nullable for system-wide alerts)
  user_id UUID REFERENCES accounts(id) ON DELETE SET NULL,  -- User ID (if applicable)
  
  -- Alert Data (JSONB for flexibility)
  alert_data JSONB NOT NULL DEFAULT '{}',       -- Alert-specific data (count, threshold, timeWindow, etc.)
  context JSONB DEFAULT '{}',                   -- Additional context
  
  -- Status
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'dismissed')),
  acknowledged_by UUID REFERENCES accounts(id) ON DELETE SET NULL,  -- Admin who acknowledged
  acknowledged_at TIMESTAMPTZ,                  -- When acknowledged
  resolved_at TIMESTAMPTZ,                       -- When resolved
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_alert_type CHECK (
    alert_type IN (
      'rate_limit_spike',
      'signature_failure_spike',
      'execution_timeout_spike',
      'storage_quota_spike',
      'unauthorized_access_spike',
      'api_call_anomaly',
      'plugin_error_spike',
      'critical_severity_event'
    )
  )
);

-- Indexes for plugin_security_alerts table
CREATE INDEX IF NOT EXISTS idx_plugin_security_alerts_plugin_id ON plugin_security_alerts(plugin_id);
CREATE INDEX IF NOT EXISTS idx_plugin_security_alerts_user_id ON plugin_security_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_plugin_security_alerts_alert_type ON plugin_security_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_plugin_security_alerts_severity ON plugin_security_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_plugin_security_alerts_status ON plugin_security_alerts(status);
CREATE INDEX IF NOT EXISTS idx_plugin_security_alerts_created_at ON plugin_security_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plugin_security_alerts_status_created ON plugin_security_alerts(status, created_at DESC) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_plugin_security_alerts_severity_created ON plugin_security_alerts(severity, created_at DESC) WHERE severity IN ('high', 'critical');

-- GIN index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_plugin_security_alerts_alert_data_gin ON plugin_security_alerts USING gin (alert_data jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_plugin_security_alerts_context_gin ON plugin_security_alerts USING gin (context jsonb_path_ops);

-- RLS Policy
ALTER TABLE plugin_security_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view plugin security alerts"
  ON plugin_security_alerts
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

CREATE POLICY "Admins can update plugin security alerts"
  ON plugin_security_alerts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
        AND admin_users.role IN ('superadmin', 'admin')
        AND admin_users.is_active = true
    )
  );

-- Comments
COMMENT ON TABLE plugin_security_alerts IS 'Security alerts generated from anomaly detection in plugin system';
COMMENT ON COLUMN plugin_security_alerts.alert_type IS 'Type of security alert';
COMMENT ON COLUMN plugin_security_alerts.severity IS 'Severity level (low, medium, high, critical)';
COMMENT ON COLUMN plugin_security_alerts.status IS 'Alert status (open, acknowledged, resolved, dismissed)';
COMMENT ON COLUMN plugin_security_alerts.alert_data IS 'Alert-specific data as JSONB (e.g., count, threshold, timeWindow, etc.)';

