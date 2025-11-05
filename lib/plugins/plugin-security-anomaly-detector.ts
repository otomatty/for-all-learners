/**
 * Plugin Security Anomaly Detector
 *
 * Detects security anomalies from audit logs and generates alerts.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ (Scheduled job or manual trigger)
 *
 * Dependencies:
 *   ├─ lib/supabase/adminClient.ts
 *   ├─ lib/plugins/plugin-security-audit-logger.ts
 *   └─ lib/logger.ts
 *
 * Related Documentation:
 *   └─ Issue #96: Plugin System Security Enhancement
 */

import logger from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/adminClient";
import type { Json } from "@/types/database.types";
import type { SecurityAuditSeverity } from "./plugin-security-audit-logger";

/**
 * Alert type definitions
 */
export type AlertType =
	| "rate_limit_spike"
	| "signature_failure_spike"
	| "execution_timeout_spike"
	| "storage_quota_spike"
	| "unauthorized_access_spike"
	| "api_call_anomaly"
	| "plugin_error_spike"
	| "critical_severity_event";

/**
 * Alert configuration
 */
export interface AlertConfig {
	/** Time window in milliseconds */
	timeWindow: number;
	/** Threshold count */
	threshold: number;
	/** Minimum severity to trigger alert */
	minSeverity?: SecurityAuditSeverity;
	/** Alert severity */
	alertSeverity: SecurityAuditSeverity;
}

/**
 * Default alert configurations
 */
const DEFAULT_ALERT_CONFIGS: Record<AlertType, AlertConfig> = {
	rate_limit_spike: {
		timeWindow: 5 * 60 * 1000, // 5 minutes
		threshold: 10, // 10 violations in 5 minutes
		minSeverity: "medium",
		alertSeverity: "high",
	},
	signature_failure_spike: {
		timeWindow: 10 * 60 * 1000, // 10 minutes
		threshold: 5, // 5 failures in 10 minutes
		minSeverity: "high",
		alertSeverity: "critical",
	},
	execution_timeout_spike: {
		timeWindow: 15 * 60 * 1000, // 15 minutes
		threshold: 5, // 5 timeouts in 15 minutes
		minSeverity: "high",
		alertSeverity: "high",
	},
	storage_quota_spike: {
		timeWindow: 10 * 60 * 1000, // 10 minutes
		threshold: 3, // 3 quota exceeded in 10 minutes
		minSeverity: "medium",
		alertSeverity: "medium",
	},
	unauthorized_access_spike: {
		timeWindow: 5 * 60 * 1000, // 5 minutes
		threshold: 3, // 3 attempts in 5 minutes
		minSeverity: "high",
		alertSeverity: "critical",
	},
	api_call_anomaly: {
		timeWindow: 1 * 60 * 1000, // 1 minute
		threshold: 100, // 100 API calls in 1 minute (per plugin)
		minSeverity: "low",
		alertSeverity: "medium",
	},
	plugin_error_spike: {
		timeWindow: 10 * 60 * 1000, // 10 minutes
		threshold: 10, // 10 errors in 10 minutes
		minSeverity: "medium",
		alertSeverity: "high",
	},
	critical_severity_event: {
		timeWindow: 0, // Immediate
		threshold: 1, // Any critical event
		minSeverity: "critical",
		alertSeverity: "critical",
	},
};

/**
 * Alert data structure
 */
export interface AlertData {
	alertType: AlertType;
	severity: SecurityAuditSeverity;
	title: string;
	description: string;
	pluginId?: string;
	userId?: string;
	alertData: Record<string, unknown>;
	context?: Record<string, unknown>;
}

/**
 * Plugin Security Anomaly Detector
 */
export class PluginSecurityAnomalyDetector {
	private adminClient = createAdminClient();

	/**
	 * Detect anomalies and generate alerts
	 */
	async detectAnomalies(): Promise<AlertData[]> {
		const alerts: AlertData[] = [];

		try {
			// Detect various anomaly patterns
			const [
				rateLimitSpikes,
				signatureFailures,
				executionTimeouts,
				storageQuotaSpikes,
				unauthorizedAccess,
				apiCallAnomalies,
				pluginErrors,
				criticalEvents,
			] = await Promise.all([
				this.detectRateLimitSpikes(),
				this.detectSignatureFailureSpikes(),
				this.detectExecutionTimeoutSpikes(),
				this.detectStorageQuotaSpikes(),
				this.detectUnauthorizedAccessSpikes(),
				this.detectAPICallAnomalies(),
				this.detectPluginErrorSpikes(),
				this.detectCriticalSeverityEvents(),
			]);

			alerts.push(
				...rateLimitSpikes,
				...signatureFailures,
				...executionTimeouts,
				...storageQuotaSpikes,
				...unauthorizedAccess,
				...apiCallAnomalies,
				...pluginErrors,
				...criticalEvents,
			);

			logger.info({ alertCount: alerts.length }, "Anomaly detection completed");
		} catch (error) {
			logger.error({ error }, "Failed to detect security anomalies");
		}

		return alerts;
	}

	/**
	 * Detect rate limit violation spikes
	 */
	private async detectRateLimitSpikes(): Promise<AlertData[]> {
		const config = DEFAULT_ALERT_CONFIGS.rate_limit_spike;
		const timeWindow = Date.now() - config.timeWindow;

		const { data, error } = await this.adminClient
			.from("plugin_security_audit_logs")
			.select("plugin_id, user_id, created_at, event_data")
			.eq("event_type", "rate_limit_violation")
			.gte("created_at", new Date(timeWindow).toISOString())
			.gte("severity", config.minSeverity || "low")
			.order("created_at", { ascending: false });

		if (error || !data) {
			logger.error({ error }, "Failed to query rate limit violations");
			return [];
		}

		// Group by plugin_id
		const pluginCounts = new Map<string, number>();
		for (const log of data) {
			const count = pluginCounts.get(log.plugin_id) || 0;
			pluginCounts.set(log.plugin_id, count + 1);
		}

		const alerts: AlertData[] = [];
		for (const [pluginId, count] of pluginCounts.entries()) {
			if (count >= config.threshold) {
				alerts.push({
					alertType: "rate_limit_spike",
					severity: config.alertSeverity,
					title: `Rate Limit Spike Detected: ${pluginId}`,
					description: `${count} rate limit violations detected in the last ${config.timeWindow / 1000 / 60} minutes for plugin ${pluginId}`,
					pluginId,
					alertData: {
						count,
						threshold: config.threshold,
						timeWindow: config.timeWindow,
						timeWindowMinutes: config.timeWindow / 1000 / 60,
					},
				});
			}
		}

		return alerts;
	}

	/**
	 * Detect signature verification failure spikes
	 */
	private async detectSignatureFailureSpikes(): Promise<AlertData[]> {
		const config = DEFAULT_ALERT_CONFIGS.signature_failure_spike;
		const timeWindow = Date.now() - config.timeWindow;

		const { data, error } = await this.adminClient
			.from("plugin_security_audit_logs")
			.select("plugin_id, created_at, event_data")
			.eq("event_type", "signature_verification")
			.gte("created_at", new Date(timeWindow).toISOString())
			.order("created_at", { ascending: false });

		if (error || !data) {
			logger.error(
				{ error },
				"Failed to query signature verification failures",
			);
			return [];
		}

		// Filter failed verifications
		const failures = data.filter((log) => {
			const eventData = log.event_data as Record<string, unknown>;
			return eventData.signatureVerificationSuccess === false;
		});

		// Group by plugin_id
		const pluginCounts = new Map<string, number>();
		for (const log of failures) {
			const count = pluginCounts.get(log.plugin_id) || 0;
			pluginCounts.set(log.plugin_id, count + 1);
		}

		const alerts: AlertData[] = [];
		for (const [pluginId, count] of pluginCounts.entries()) {
			if (count >= config.threshold) {
				alerts.push({
					alertType: "signature_failure_spike",
					severity: config.alertSeverity,
					title: `Signature Verification Failure Spike: ${pluginId}`,
					description: `${count} signature verification failures detected in the last ${config.timeWindow / 1000 / 60} minutes for plugin ${pluginId}. Possible code tampering detected.`,
					pluginId,
					alertData: {
						count,
						threshold: config.threshold,
						timeWindow: config.timeWindow,
						timeWindowMinutes: config.timeWindow / 1000 / 60,
					},
				});
			}
		}

		return alerts;
	}

	/**
	 * Detect execution timeout spikes
	 */
	private async detectExecutionTimeoutSpikes(): Promise<AlertData[]> {
		const config = DEFAULT_ALERT_CONFIGS.execution_timeout_spike;
		const timeWindow = Date.now() - config.timeWindow;

		const { data, error } = await this.adminClient
			.from("plugin_security_audit_logs")
			.select("plugin_id, created_at")
			.eq("event_type", "execution_timeout")
			.gte("created_at", new Date(timeWindow).toISOString())
			.gte("severity", config.minSeverity || "low")
			.order("created_at", { ascending: false });

		if (error || !data) {
			logger.error({ error }, "Failed to query execution timeouts");
			return [];
		}

		// Group by plugin_id
		const pluginCounts = new Map<string, number>();
		for (const log of data) {
			const count = pluginCounts.get(log.plugin_id) || 0;
			pluginCounts.set(log.plugin_id, count + 1);
		}

		const alerts: AlertData[] = [];
		for (const [pluginId, count] of pluginCounts.entries()) {
			if (count >= config.threshold) {
				alerts.push({
					alertType: "execution_timeout_spike",
					severity: config.alertSeverity,
					title: `Execution Timeout Spike: ${pluginId}`,
					description: `${count} execution timeouts detected in the last ${config.timeWindow / 1000 / 60} minutes for plugin ${pluginId}. Possible performance issue or malicious code.`,
					pluginId,
					alertData: {
						count,
						threshold: config.threshold,
						timeWindow: config.timeWindow,
						timeWindowMinutes: config.timeWindow / 1000 / 60,
					},
				});
			}
		}

		return alerts;
	}

	/**
	 * Detect storage quota exceeded spikes
	 */
	private async detectStorageQuotaSpikes(): Promise<AlertData[]> {
		const config = DEFAULT_ALERT_CONFIGS.storage_quota_spike;
		const timeWindow = Date.now() - config.timeWindow;

		const { data, error } = await this.adminClient
			.from("plugin_security_audit_logs")
			.select("plugin_id, user_id, created_at")
			.eq("event_type", "storage_quota_exceeded")
			.gte("created_at", new Date(timeWindow).toISOString())
			.gte("severity", config.minSeverity || "low")
			.order("created_at", { ascending: false });

		if (error || !data) {
			logger.error({ error }, "Failed to query storage quota exceeded");
			return [];
		}

		// Group by plugin_id
		const pluginCounts = new Map<string, number>();
		for (const log of data) {
			const count = pluginCounts.get(log.plugin_id) || 0;
			pluginCounts.set(log.plugin_id, count + 1);
		}

		const alerts: AlertData[] = [];
		for (const [pluginId, count] of pluginCounts.entries()) {
			if (count >= config.threshold) {
				alerts.push({
					alertType: "storage_quota_spike",
					severity: config.alertSeverity,
					title: `Storage Quota Exceeded Spike: ${pluginId}`,
					description: `${count} storage quota exceeded events detected in the last ${config.timeWindow / 1000 / 60} minutes for plugin ${pluginId}`,
					pluginId,
					alertData: {
						count,
						threshold: config.threshold,
						timeWindow: config.timeWindow,
						timeWindowMinutes: config.timeWindow / 1000 / 60,
					},
				});
			}
		}

		return alerts;
	}

	/**
	 * Detect unauthorized access attempt spikes
	 */
	private async detectUnauthorizedAccessSpikes(): Promise<AlertData[]> {
		const config = DEFAULT_ALERT_CONFIGS.unauthorized_access_spike;
		const timeWindow = Date.now() - config.timeWindow;

		const { data, error } = await this.adminClient
			.from("plugin_security_audit_logs")
			.select("plugin_id, user_id, created_at")
			.eq("event_type", "unauthorized_access_attempt")
			.gte("created_at", new Date(timeWindow).toISOString())
			.gte("severity", config.minSeverity || "low")
			.order("created_at", { ascending: false });

		if (error || !data) {
			logger.error({ error }, "Failed to query unauthorized access attempts");
			return [];
		}

		// Group by plugin_id
		const pluginCounts = new Map<string, number>();
		for (const log of data) {
			const count = pluginCounts.get(log.plugin_id) || 0;
			pluginCounts.set(log.plugin_id, count + 1);
		}

		const alerts: AlertData[] = [];
		for (const [pluginId, count] of pluginCounts.entries()) {
			if (count >= config.threshold) {
				alerts.push({
					alertType: "unauthorized_access_spike",
					severity: config.alertSeverity,
					title: `Unauthorized Access Attempt Spike: ${pluginId}`,
					description: `${count} unauthorized access attempts detected in the last ${config.timeWindow / 1000 / 60} minutes for plugin ${pluginId}. Possible security breach attempt.`,
					pluginId,
					alertData: {
						count,
						threshold: config.threshold,
						timeWindow: config.timeWindow,
						timeWindowMinutes: config.timeWindow / 1000 / 60,
					},
				});
			}
		}

		return alerts;
	}

	/**
	 * Detect API call anomalies (unusually high volume)
	 */
	private async detectAPICallAnomalies(): Promise<AlertData[]> {
		const config = DEFAULT_ALERT_CONFIGS.api_call_anomaly;
		const timeWindow = Date.now() - config.timeWindow;

		const { data, error } = await this.adminClient
			.from("plugin_security_audit_logs")
			.select("plugin_id, created_at")
			.in("event_type", ["api_call", "api_call_failed"])
			.gte("created_at", new Date(timeWindow).toISOString())
			.order("created_at", { ascending: false });

		if (error || !data) {
			logger.error({ error }, "Failed to query API calls");
			return [];
		}

		// Group by plugin_id
		const pluginCounts = new Map<string, number>();
		for (const log of data) {
			const count = pluginCounts.get(log.plugin_id) || 0;
			pluginCounts.set(log.plugin_id, count + 1);
		}

		const alerts: AlertData[] = [];
		for (const [pluginId, count] of pluginCounts.entries()) {
			if (count >= config.threshold) {
				alerts.push({
					alertType: "api_call_anomaly",
					severity: config.alertSeverity,
					title: `API Call Anomaly Detected: ${pluginId}`,
					description: `${count} API calls detected in the last ${config.timeWindow / 1000 / 60} minutes for plugin ${pluginId}. Unusually high volume.`,
					pluginId,
					alertData: {
						count,
						threshold: config.threshold,
						timeWindow: config.timeWindow,
						timeWindowMinutes: config.timeWindow / 1000 / 60,
					},
				});
			}
		}

		return alerts;
	}

	/**
	 * Detect plugin error spikes
	 */
	private async detectPluginErrorSpikes(): Promise<AlertData[]> {
		const config = DEFAULT_ALERT_CONFIGS.plugin_error_spike;
		const timeWindow = Date.now() - config.timeWindow;

		const { data, error } = await this.adminClient
			.from("plugin_security_audit_logs")
			.select("plugin_id, created_at")
			.eq("event_type", "plugin_error")
			.gte("created_at", new Date(timeWindow).toISOString())
			.gte("severity", config.minSeverity || "low")
			.order("created_at", { ascending: false });

		if (error || !data) {
			logger.error({ error }, "Failed to query plugin errors");
			return [];
		}

		// Group by plugin_id
		const pluginCounts = new Map<string, number>();
		for (const log of data) {
			const count = pluginCounts.get(log.plugin_id) || 0;
			pluginCounts.set(log.plugin_id, count + 1);
		}

		const alerts: AlertData[] = [];
		for (const [pluginId, count] of pluginCounts.entries()) {
			if (count >= config.threshold) {
				alerts.push({
					alertType: "plugin_error_spike",
					severity: config.alertSeverity,
					title: `Plugin Error Spike: ${pluginId}`,
					description: `${count} plugin errors detected in the last ${config.timeWindow / 1000 / 60} minutes for plugin ${pluginId}`,
					pluginId,
					alertData: {
						count,
						threshold: config.threshold,
						timeWindow: config.timeWindow,
						timeWindowMinutes: config.timeWindow / 1000 / 60,
					},
				});
			}
		}

		return alerts;
	}

	/**
	 * Detect critical severity events
	 */
	private async detectCriticalSeverityEvents(): Promise<AlertData[]> {
		const config = DEFAULT_ALERT_CONFIGS.critical_severity_event;
		const timeWindow = Date.now() - 24 * 60 * 60 * 1000; // Last 24 hours

		const { data, error } = await this.adminClient
			.from("plugin_security_audit_logs")
			.select("plugin_id, user_id, event_type, created_at, event_data")
			.eq("severity", "critical")
			.gte("created_at", new Date(timeWindow).toISOString())
			.order("created_at", { ascending: false });

		if (error || !data) {
			logger.error({ error }, "Failed to query critical events");
			return [];
		}

		const alerts: AlertData[] = [];
		for (const log of data) {
			alerts.push({
				alertType: "critical_severity_event",
				severity: config.alertSeverity,
				title: `Critical Security Event: ${log.plugin_id}`,
				description: `Critical severity event detected: ${log.event_type} for plugin ${log.plugin_id}`,
				pluginId: log.plugin_id,
				userId: log.user_id || undefined,
				alertData: {
					eventType: log.event_type,
					timestamp: log.created_at,
				},
				context: log.event_data as Record<string, unknown>,
			});
		}

		return alerts;
	}

	/**
	 * Save alerts to database
	 */
	async saveAlerts(alerts: AlertData[]): Promise<void> {
		if (alerts.length === 0) {
			return;
		}

		try {
			// Check for existing open alerts with same type and plugin_id
			const existingAlerts = await this.adminClient
				.from("plugin_security_alerts")
				.select("id, alert_type, plugin_id")
				.eq("status", "open")
				.in(
					"alert_type",
					alerts.map((a) => a.alertType),
				);

			const existingKeys = new Set(
				(existingAlerts.data || []).map(
					(a) => `${a.alert_type}:${a.plugin_id || "system"}`,
				),
			);

			// Filter out alerts that already exist
			const newAlerts = alerts.filter(
				(alert) =>
					!existingKeys.has(`${alert.alertType}:${alert.pluginId || "system"}`),
			);

			if (newAlerts.length === 0) {
				logger.info("All alerts already exist, skipping");
				return;
			}

			// Insert new alerts
			const alertRows = newAlerts.map((alert) => ({
				alert_type: alert.alertType,
				severity: alert.severity,
				title: alert.title,
				description: alert.description,
				plugin_id: alert.pluginId || null,
				user_id: alert.userId || null,
				alert_data: alert.alertData as Json,
				context: (alert.context || {}) as Json,
				status: "open",
			}));

			const { error: insertError } = await this.adminClient
				.from("plugin_security_alerts")
				.insert(alertRows);

			if (insertError) {
				logger.error(
					{ error: insertError },
					"Failed to save alerts to database",
				);
			} else {
				logger.info(
					{ count: newAlerts.length },
					"Security alerts saved to database",
				);
			}
		} catch (error) {
			logger.error({ error }, "Failed to save alerts");
		}
	}

	/**
	 * Run anomaly detection and save alerts
	 */
	async runDetection(): Promise<number> {
		const alerts = await this.detectAnomalies();
		await this.saveAlerts(alerts);
		return alerts.length;
	}
}

/**
 * Singleton instance
 */
let detectorInstance: PluginSecurityAnomalyDetector | null = null;

/**
 * Get the anomaly detector instance
 */
export function getAnomalyDetector(): PluginSecurityAnomalyDetector {
	if (!detectorInstance) {
		detectorInstance = new PluginSecurityAnomalyDetector();
	}
	return detectorInstance;
}
