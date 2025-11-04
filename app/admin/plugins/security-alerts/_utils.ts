/**
 * Parse search params for security alerts page
 */

export interface ParsedSecurityAlertsSearchParams {
	page: number;
	limit: number;
	sortBy: "created_at" | "severity" | "status";
	sortOrder: "asc" | "desc";
	searchQuery?: string;
	pluginId?: string;
	status?: "open" | "acknowledged" | "resolved" | "dismissed";
	severity?: "low" | "medium" | "high" | "critical";
	alertType?: string;
}

export function parseSecurityAlertsSearchParams(searchParams?: {
	[key: string]: string | string[] | undefined;
}): ParsedSecurityAlertsSearchParams {
	const page = searchParams?.page ? Number(searchParams.page) : 1;
	const limit = searchParams?.limit ? Number(searchParams.limit) : 50;
	const sortBy =
		(searchParams?.sortBy as "created_at" | "severity" | "status") ||
		"created_at";
	const sortOrder = (searchParams?.sortOrder as "asc" | "desc") || "desc";
	const searchQuery =
		typeof searchParams?.searchQuery === "string"
			? searchParams.searchQuery
			: undefined;
	const pluginId =
		typeof searchParams?.pluginId === "string"
			? searchParams.pluginId
			: undefined;
	const status =
		typeof searchParams?.status === "string" &&
		["open", "acknowledged", "resolved", "dismissed"].includes(
			searchParams.status,
		)
			? (searchParams.status as
					| "open"
					| "acknowledged"
					| "resolved"
					| "dismissed")
			: undefined;
	const severity =
		typeof searchParams?.severity === "string" &&
		["low", "medium", "high", "critical"].includes(searchParams.severity)
			? (searchParams.severity as "low" | "medium" | "high" | "critical")
			: undefined;
	const alertType =
		typeof searchParams?.alertType === "string"
			? searchParams.alertType
			: undefined;

	return {
		page: Math.max(1, page),
		limit: Math.max(1, Math.min(100, limit)),
		sortBy,
		sortOrder,
		searchQuery,
		pluginId,
		status,
		severity,
		alertType,
	};
}

/**
 * Calculate alert statistics
 */
export function calculateAlertStatistics(alerts: Array<{
	status: string;
	severity: string;
}>): {
	totalAlerts: number;
	openAlerts: number;
	acknowledgedAlerts: number;
	resolvedAlerts: number;
	criticalAlerts: number;
	highAlerts: number;
	mediumAlerts: number;
	lowAlerts: number;
} {
	return {
		totalAlerts: alerts.length,
		openAlerts: alerts.filter((a) => a.status === "open").length,
		acknowledgedAlerts: alerts.filter((a) => a.status === "acknowledged")
			.length,
		resolvedAlerts: alerts.filter((a) => a.status === "resolved").length,
		criticalAlerts: alerts.filter((a) => a.severity === "critical").length,
		highAlerts: alerts.filter((a) => a.severity === "high").length,
		mediumAlerts: alerts.filter((a) => a.severity === "medium").length,
		lowAlerts: alerts.filter((a) => a.severity === "low").length,
	};
}

