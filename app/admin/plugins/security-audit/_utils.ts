/**
 * Parse search params for security audit logs page
 */

export interface ParsedSecurityAuditLogsSearchParams {
	page: number;
	limit: number;
	sortBy: "created_at" | "severity" | "event_type" | "plugin_id";
	sortOrder: "asc" | "desc";
	searchQuery?: string;
	pluginId?: string;
	userId?: string;
	eventType?: string;
	severity?: "low" | "medium" | "high" | "critical";
}

export function parseSecurityAuditLogsSearchParams(searchParams?: {
	[key: string]: string | string[] | undefined;
}): ParsedSecurityAuditLogsSearchParams {
	const page = searchParams?.page ? Number(searchParams.page) : 1;
	const limit = searchParams?.limit ? Number(searchParams.limit) : 50;
	const sortBy =
		(searchParams?.sortBy as
			| "created_at"
			| "severity"
			| "event_type"
			| "plugin_id") || "created_at";
	const sortOrder = (searchParams?.sortOrder as "asc" | "desc") || "desc";
	const searchQuery =
		typeof searchParams?.searchQuery === "string"
			? searchParams.searchQuery
			: undefined;
	const pluginId =
		typeof searchParams?.pluginId === "string"
			? searchParams.pluginId
			: undefined;
	const userId =
		typeof searchParams?.userId === "string" ? searchParams.userId : undefined;
	const eventType =
		typeof searchParams?.eventType === "string"
			? searchParams.eventType
			: undefined;
	const severity =
		typeof searchParams?.severity === "string" &&
		["low", "medium", "high", "critical"].includes(searchParams.severity)
			? (searchParams.severity as "low" | "medium" | "high" | "critical")
			: undefined;

	return {
		page: Math.max(1, page),
		limit: Math.max(1, Math.min(100, limit)),
		sortBy,
		sortOrder,
		searchQuery,
		pluginId,
		userId,
		eventType,
		severity,
	};
}
