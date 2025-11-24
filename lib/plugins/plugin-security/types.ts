/**
 * Plugin Security Types
 *
 * Type definitions for plugin security alerts and audit logs.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   ├─ hooks/plugins/useSecurityAlerts.ts
 *   └─ hooks/plugins/useSecurityAuditLogs.ts
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */

/**
 * Plugin security alert
 */
export interface PluginSecurityAlert {
	id: string;
	alertType: string;
	severity: "low" | "medium" | "high" | "critical";
	title: string;
	description: string;
	pluginId: string | null;
	userId: string | null;
	alertData: Record<string, unknown>;
	context: Record<string, unknown>;
	status: "open" | "acknowledged" | "resolved" | "dismissed";
	acknowledgedBy: string | null;
	acknowledgedAt: Date | null;
	resolvedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * Security audit log entry
 */
export interface SecurityAuditLogEntry {
	id: string;
	pluginId: string;
	userId: string | null;
	eventType: string;
	severity: "low" | "medium" | "high" | "critical";
	eventData: Record<string, unknown>;
	context: Record<string, unknown>;
	createdAt: string;
}

