/**
 * Integration Extension Registry
 *
 * Manages integration extensions registered by plugins.
 * Provides registration, unregistration, and query capabilities for integration extensions.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   ├─ lib/plugins/plugin-api.ts
 *   └─ lib/plugins/integration-manager.ts (future)
 *
 * Dependencies:
 *   ├─ lib/plugins/types.ts (Integration extension types)
 *   └─ lib/logger
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/phase2-extension-points.md
 */

import logger from "@/lib/logger";
import type {
	ExternalAPIOptions,
	OAuthProviderOptions,
	WebhookOptions,
} from "./types";

// ============================================================================
// Integration Extension Entry Types
// ============================================================================

/**
 * OAuth provider entry
 */
export interface OAuthProviderEntry {
	pluginId: string;
	providerId: string;
	name: string;
	description?: string;
	config: OAuthProviderOptions["config"];
	handler?: OAuthProviderOptions["handler"];
	useDefaultFlow: boolean;
}

/**
 * Webhook entry
 */
export interface WebhookEntry {
	pluginId: string;
	webhookId: string;
	name: string;
	description?: string;
	path: string;
	methods: WebhookOptions["methods"];
	handler: WebhookOptions["handler"];
	secret?: string;
	requiredHeaders?: string[];
}

/**
 * External API entry
 */
export interface ExternalAPIEntry {
	pluginId: string;
	apiId: string;
	name: string;
	description?: string;
	baseUrl?: string;
	defaultHeaders?: Record<string, string>;
	defaultTimeout?: number;
	auth?: ExternalAPIOptions["auth"];
	caller?: ExternalAPIOptions["caller"];
}

// ============================================================================
// State (Private)
// ============================================================================

/** Map of plugin ID to array of OAuth providers */
const oauthProviders = new Map<string, OAuthProviderEntry[]>();

/** Map of plugin ID to array of webhooks */
const webhooks = new Map<string, WebhookEntry[]>();

/** Map of plugin ID to array of external APIs */
const externalAPIs = new Map<string, ExternalAPIEntry[]>();

/** Map of webhook path to webhook entry (for quick lookup) */
const webhookPathMap = new Map<string, WebhookEntry>();

// ============================================================================
// OAuth Provider Registration
// ============================================================================

/**
 * Register an OAuth provider
 *
 * @param pluginId Plugin ID registering the provider
 * @param options Provider options
 * @throws Error if provider ID already exists for this plugin
 */
export function registerOAuthProvider(
	pluginId: string,
	options: OAuthProviderOptions,
): void {
	const pluginProviders = oauthProviders.get(pluginId) ?? [];

	// Check if provider ID already exists
	const existing = pluginProviders.find(
		(prov) => prov.providerId === options.id,
	);

	if (existing) {
		throw new Error(
			`OAuth provider ${options.id} already registered for plugin ${pluginId}`,
		);
	}

	const entry: OAuthProviderEntry = {
		pluginId,
		providerId: options.id,
		name: options.name,
		description: options.description,
		config: options.config,
		handler: options.handler,
		useDefaultFlow: options.useDefaultFlow ?? true,
	};

	pluginProviders.push(entry);
	oauthProviders.set(pluginId, pluginProviders);

	logger.info(
		{
			pluginId,
			providerId: options.id,
			name: options.name,
		},
		"OAuth provider registered",
	);
}

/**
 * Unregister an OAuth provider
 *
 * @param pluginId Plugin ID
 * @param providerId Provider ID (optional, if not provided, all providers for plugin are removed)
 * @returns True if provider was unregistered, false if not found
 */
export function unregisterOAuthProvider(
	pluginId: string,
	providerId?: string,
): boolean {
	const pluginProviders = oauthProviders.get(pluginId);

	if (!pluginProviders) {
		logger.warn({ pluginId }, "No OAuth providers found for plugin");
		return false;
	}

	if (providerId) {
		const index = pluginProviders.findIndex(
			(prov) => prov.providerId === providerId,
		);

		if (index === -1) {
			logger.warn(
				{ pluginId, providerId },
				"OAuth provider not found for unregistration",
			);
			return false;
		}

		pluginProviders.splice(index, 1);

		if (pluginProviders.length === 0) {
			oauthProviders.delete(pluginId);
		} else {
			oauthProviders.set(pluginId, pluginProviders);
		}

		logger.info({ pluginId, providerId }, "OAuth provider unregistered");
		return true;
	}

	// Remove all providers for plugin
	oauthProviders.delete(pluginId);
	logger.info(
		{ pluginId, count: pluginProviders.length },
		"All OAuth providers unregistered for plugin",
	);
	return true;
}

// ============================================================================
// Webhook Registration
// ============================================================================

/**
 * Register a webhook
 *
 * @param pluginId Plugin ID registering the webhook
 * @param options Webhook options
 * @throws Error if webhook ID already exists for this plugin or path is already used
 */
export function registerWebhook(
	pluginId: string,
	options: WebhookOptions,
): void {
	const pluginWebhooks = webhooks.get(pluginId) ?? [];

	// Check if webhook ID already exists
	const existing = pluginWebhooks.find((wh) => wh.webhookId === options.id);

	if (existing) {
		throw new Error(
			`Webhook ${options.id} already registered for plugin ${pluginId}`,
		);
	}

	// Check if webhook path is already used
	if (webhookPathMap.has(options.path)) {
		const existingEntry = webhookPathMap.get(options.path);
		throw new Error(
			`Webhook path "${options.path}" is already used by plugin ${existingEntry?.pluginId}`,
		);
	}

	const entry: WebhookEntry = {
		pluginId,
		webhookId: options.id,
		name: options.name,
		description: options.description,
		path: options.path,
		methods: options.methods ?? ["POST"],
		handler: options.handler,
		secret: options.secret,
		requiredHeaders: options.requiredHeaders,
	};

	pluginWebhooks.push(entry);
	webhooks.set(pluginId, pluginWebhooks);
	webhookPathMap.set(options.path, entry);

	logger.info(
		{
			pluginId,
			webhookId: options.id,
			path: options.path,
			methods: entry.methods,
		},
		"Webhook registered",
	);
}

/**
 * Unregister a webhook
 *
 * @param pluginId Plugin ID
 * @param webhookId Webhook ID (optional, if not provided, all webhooks for plugin are removed)
 * @returns True if webhook was unregistered, false if not found
 */
export function unregisterWebhook(
	pluginId: string,
	webhookId?: string,
): boolean {
	const pluginWebhooks = webhooks.get(pluginId);

	if (!pluginWebhooks) {
		logger.warn({ pluginId }, "No webhooks found for plugin");
		return false;
	}

	if (webhookId) {
		const index = pluginWebhooks.findIndex((wh) => wh.webhookId === webhookId);

		if (index === -1) {
			logger.warn(
				{ pluginId, webhookId },
				"Webhook not found for unregistration",
			);
			return false;
		}

		const entry = pluginWebhooks[index];
		webhookPathMap.delete(entry.path);
		pluginWebhooks.splice(index, 1);

		if (pluginWebhooks.length === 0) {
			webhooks.delete(pluginId);
		} else {
			webhooks.set(pluginId, pluginWebhooks);
		}

		logger.info({ pluginId, webhookId }, "Webhook unregistered");
		return true;
	}

	// Remove all webhooks for plugin
	for (const entry of pluginWebhooks) {
		webhookPathMap.delete(entry.path);
	}
	webhooks.delete(pluginId);
	logger.info(
		{ pluginId, count: pluginWebhooks.length },
		"All webhooks unregistered for plugin",
	);
	return true;
}

// ============================================================================
// External API Registration
// ============================================================================

/**
 * Register an external API
 *
 * @param pluginId Plugin ID registering the API
 * @param options API options
 * @throws Error if API ID already exists for this plugin
 */
export function registerExternalAPI(
	pluginId: string,
	options: ExternalAPIOptions,
): void {
	const pluginAPIs = externalAPIs.get(pluginId) ?? [];

	// Check if API ID already exists
	const existing = pluginAPIs.find((api) => api.apiId === options.id);

	if (existing) {
		throw new Error(
			`External API ${options.id} already registered for plugin ${pluginId}`,
		);
	}

	const entry: ExternalAPIEntry = {
		pluginId,
		apiId: options.id,
		name: options.name,
		description: options.description,
		baseUrl: options.baseUrl,
		defaultHeaders: options.defaultHeaders,
		defaultTimeout: options.defaultTimeout,
		auth: options.auth,
		caller: options.caller,
	};

	pluginAPIs.push(entry);
	externalAPIs.set(pluginId, pluginAPIs);

	logger.info(
		{
			pluginId,
			apiId: options.id,
			name: options.name,
			baseUrl: options.baseUrl,
		},
		"External API registered",
	);
}

/**
 * Unregister an external API
 *
 * @param pluginId Plugin ID
 * @param apiId API ID (optional, if not provided, all APIs for plugin are removed)
 * @returns True if API was unregistered, false if not found
 */
export function unregisterExternalAPI(
	pluginId: string,
	apiId?: string,
): boolean {
	const pluginAPIs = externalAPIs.get(pluginId);

	if (!pluginAPIs) {
		logger.warn({ pluginId }, "No external APIs found for plugin");
		return false;
	}

	if (apiId) {
		const index = pluginAPIs.findIndex((api) => api.apiId === apiId);

		if (index === -1) {
			logger.warn(
				{ pluginId, apiId },
				"External API not found for unregistration",
			);
			return false;
		}

		pluginAPIs.splice(index, 1);

		if (pluginAPIs.length === 0) {
			externalAPIs.delete(pluginId);
		} else {
			externalAPIs.set(pluginId, pluginAPIs);
		}

		logger.info({ pluginId, apiId }, "External API unregistered");
		return true;
	}

	// Remove all APIs for plugin
	externalAPIs.delete(pluginId);
	logger.info(
		{ pluginId, count: pluginAPIs.length },
		"All external APIs unregistered for plugin",
	);
	return true;
}

// ============================================================================
// Query Operations
// ============================================================================

/**
 * Get OAuth providers
 *
 * @param pluginId Plugin ID (optional, if not provided, returns all providers)
 * @returns Array of OAuth provider entries
 */
export function getOAuthProviders(pluginId?: string): OAuthProviderEntry[] {
	if (pluginId) {
		return oauthProviders.get(pluginId) ?? [];
	}

	const allProviders: OAuthProviderEntry[] = [];
	for (const pluginProviders of oauthProviders.values()) {
		allProviders.push(...pluginProviders);
	}
	return allProviders;
}

/**
 * Get webhook by path
 *
 * @param path Webhook path
 * @returns Webhook entry or undefined if not found
 */
export function getWebhookByPath(path: string): WebhookEntry | undefined {
	return webhookPathMap.get(path);
}

/**
 * Get webhooks
 *
 * @param pluginId Plugin ID (optional, if not provided, returns all webhooks)
 * @returns Array of webhook entries
 */
export function getWebhooks(pluginId?: string): WebhookEntry[] {
	if (pluginId) {
		return webhooks.get(pluginId) ?? [];
	}

	const allWebhooks: WebhookEntry[] = [];
	for (const pluginWebhooks of webhooks.values()) {
		allWebhooks.push(...pluginWebhooks);
	}
	return allWebhooks;
}

/**
 * Get external APIs
 *
 * @param pluginId Plugin ID (optional, if not provided, returns all APIs)
 * @returns Array of external API entries
 */
export function getExternalAPIs(pluginId?: string): ExternalAPIEntry[] {
	if (pluginId) {
		return externalAPIs.get(pluginId) ?? [];
	}

	const allAPIs: ExternalAPIEntry[] = [];
	for (const pluginAPIs of externalAPIs.values()) {
		allAPIs.push(...pluginAPIs);
	}
	return allAPIs;
}

/**
 * Get external API by ID
 *
 * @param pluginId Plugin ID
 * @param apiId API ID
 * @returns External API entry or undefined if not found
 */
export function getExternalAPI(
	pluginId: string,
	apiId: string,
): ExternalAPIEntry | undefined {
	const pluginAPIs = externalAPIs.get(pluginId);
	return pluginAPIs?.find((api) => api.apiId === apiId);
}

/**
 * Clear all extensions for a plugin
 *
 * @param pluginId Plugin ID
 */
export function clearPlugin(pluginId: string): void {
	unregisterOAuthProvider(pluginId);
	unregisterWebhook(pluginId);
	unregisterExternalAPI(pluginId);
}

/**
 * Clear all extensions
 *
 * @warning This will remove all registered extensions!
 */
export function clear(): void {
	const providerCount = Array.from(oauthProviders.values()).reduce(
		(sum, provs) => sum + provs.length,
		0,
	);
	const webhookCount = Array.from(webhooks.values()).reduce(
		(sum, whs) => sum + whs.length,
		0,
	);
	const apiCount = Array.from(externalAPIs.values()).reduce(
		(sum, apis) => sum + apis.length,
		0,
	);

	oauthProviders.clear();
	webhooks.clear();
	externalAPIs.clear();
	webhookPathMap.clear();

	logger.info(
		{
			clearedProviders: providerCount,
			clearedWebhooks: webhookCount,
			clearedAPIs: apiCount,
		},
		"All integration extensions cleared",
	);
}

/**
 * Get statistics
 *
 * @returns Statistics about registered extensions
 */
export function getStats(): {
	totalPlugins: number;
	totalOAuthProviders: number;
	totalWebhooks: number;
	totalExternalAPIs: number;
} {
	return {
		totalPlugins: new Set([
			...oauthProviders.keys(),
			...webhooks.keys(),
			...externalAPIs.keys(),
		]).size,
		totalOAuthProviders: Array.from(oauthProviders.values()).reduce(
			(sum, provs) => sum + provs.length,
			0,
		),
		totalWebhooks: Array.from(webhooks.values()).reduce(
			(sum, whs) => sum + whs.length,
			0,
		),
		totalExternalAPIs: Array.from(externalAPIs.values()).reduce(
			(sum, apis) => sum + apis.length,
			0,
		),
	};
}

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Reset registry (for testing)
 */
export function reset(): void {
	oauthProviders.clear();
	webhooks.clear();
	externalAPIs.clear();
	webhookPathMap.clear();
}
