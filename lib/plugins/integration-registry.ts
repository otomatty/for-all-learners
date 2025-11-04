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
// Integration Extension Registry Class
// ============================================================================

/**
 * Integration Extension Registry
 *
 * Singleton registry for managing integration extensions registered by plugins.
 * Thread-safe operations with Map-based storage.
 */
export class IntegrationExtensionRegistry {
	private static instance: IntegrationExtensionRegistry | null = null;

	/** Map of plugin ID to array of OAuth providers */
	private oauthProviders: Map<string, OAuthProviderEntry[]>;

	/** Map of plugin ID to array of webhooks */
	private webhooks: Map<string, WebhookEntry[]>;

	/** Map of plugin ID to array of external APIs */
	private externalAPIs: Map<string, ExternalAPIEntry[]>;

	/** Map of webhook path to webhook entry (for quick lookup) */
	private webhookPathMap: Map<string, WebhookEntry>;

	/**
	 * Private constructor (Singleton pattern)
	 */
	private constructor() {
		this.oauthProviders = new Map();
		this.webhooks = new Map();
		this.externalAPIs = new Map();
		this.webhookPathMap = new Map();
	}

	/**
	 * Get singleton instance
	 */
	public static getInstance(): IntegrationExtensionRegistry {
		if (!IntegrationExtensionRegistry.instance) {
			IntegrationExtensionRegistry.instance =
				new IntegrationExtensionRegistry();
		}
		return IntegrationExtensionRegistry.instance;
	}

	/**
	 * Reset registry (for testing)
	 */
	public static reset(): void {
		IntegrationExtensionRegistry.instance = null;
	}

	// ========================================================================
	// OAuth Provider Registration
	// ========================================================================

	/**
	 * Register an OAuth provider
	 *
	 * @param pluginId Plugin ID registering the provider
	 * @param options Provider options
	 * @throws Error if provider ID already exists for this plugin
	 */
	public registerOAuthProvider(
		pluginId: string,
		options: OAuthProviderOptions,
	): void {
		const pluginProviders = this.oauthProviders.get(pluginId) ?? [];

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
		this.oauthProviders.set(pluginId, pluginProviders);

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
	public unregisterOAuthProvider(
		pluginId: string,
		providerId?: string,
	): boolean {
		const pluginProviders = this.oauthProviders.get(pluginId);

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
				this.oauthProviders.delete(pluginId);
			} else {
				this.oauthProviders.set(pluginId, pluginProviders);
			}

			logger.info({ pluginId, providerId }, "OAuth provider unregistered");
			return true;
		}

		// Remove all providers for plugin
		this.oauthProviders.delete(pluginId);
		logger.info(
			{ pluginId, count: pluginProviders.length },
			"All OAuth providers unregistered for plugin",
		);
		return true;
	}

	// ========================================================================
	// Webhook Registration
	// ========================================================================

	/**
	 * Register a webhook
	 *
	 * @param pluginId Plugin ID registering the webhook
	 * @param options Webhook options
	 * @throws Error if webhook ID already exists for this plugin or path is already used
	 */
	public registerWebhook(pluginId: string, options: WebhookOptions): void {
		const pluginWebhooks = this.webhooks.get(pluginId) ?? [];

		// Check if webhook ID already exists
		const existing = pluginWebhooks.find((wh) => wh.webhookId === options.id);

		if (existing) {
			throw new Error(
				`Webhook ${options.id} already registered for plugin ${pluginId}`,
			);
		}

		// Check if webhook path is already used
		if (this.webhookPathMap.has(options.path)) {
			const existingEntry = this.webhookPathMap.get(options.path);
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
		this.webhooks.set(pluginId, pluginWebhooks);
		this.webhookPathMap.set(options.path, entry);

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
	public unregisterWebhook(pluginId: string, webhookId?: string): boolean {
		const pluginWebhooks = this.webhooks.get(pluginId);

		if (!pluginWebhooks) {
			logger.warn({ pluginId }, "No webhooks found for plugin");
			return false;
		}

		if (webhookId) {
			const index = pluginWebhooks.findIndex(
				(wh) => wh.webhookId === webhookId,
			);

			if (index === -1) {
				logger.warn(
					{ pluginId, webhookId },
					"Webhook not found for unregistration",
				);
				return false;
			}

			const entry = pluginWebhooks[index];
			this.webhookPathMap.delete(entry.path);
			pluginWebhooks.splice(index, 1);

			if (pluginWebhooks.length === 0) {
				this.webhooks.delete(pluginId);
			} else {
				this.webhooks.set(pluginId, pluginWebhooks);
			}

			logger.info({ pluginId, webhookId }, "Webhook unregistered");
			return true;
		}

		// Remove all webhooks for plugin
		for (const entry of pluginWebhooks) {
			this.webhookPathMap.delete(entry.path);
		}
		this.webhooks.delete(pluginId);
		logger.info(
			{ pluginId, count: pluginWebhooks.length },
			"All webhooks unregistered for plugin",
		);
		return true;
	}

	// ========================================================================
	// External API Registration
	// ========================================================================

	/**
	 * Register an external API
	 *
	 * @param pluginId Plugin ID registering the API
	 * @param options API options
	 * @throws Error if API ID already exists for this plugin
	 */
	public registerExternalAPI(
		pluginId: string,
		options: ExternalAPIOptions,
	): void {
		const pluginAPIs = this.externalAPIs.get(pluginId) ?? [];

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
		this.externalAPIs.set(pluginId, pluginAPIs);

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
	public unregisterExternalAPI(pluginId: string, apiId?: string): boolean {
		const pluginAPIs = this.externalAPIs.get(pluginId);

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
				this.externalAPIs.delete(pluginId);
			} else {
				this.externalAPIs.set(pluginId, pluginAPIs);
			}

			logger.info({ pluginId, apiId }, "External API unregistered");
			return true;
		}

		// Remove all APIs for plugin
		this.externalAPIs.delete(pluginId);
		logger.info(
			{ pluginId, count: pluginAPIs.length },
			"All external APIs unregistered for plugin",
		);
		return true;
	}

	// ========================================================================
	// Query Operations
	// ========================================================================

	/**
	 * Get OAuth providers
	 *
	 * @param pluginId Plugin ID (optional, if not provided, returns all providers)
	 * @returns Array of OAuth provider entries
	 */
	public getOAuthProviders(pluginId?: string): OAuthProviderEntry[] {
		if (pluginId) {
			return this.oauthProviders.get(pluginId) ?? [];
		}

		const allProviders: OAuthProviderEntry[] = [];
		for (const pluginProviders of this.oauthProviders.values()) {
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
	public getWebhookByPath(path: string): WebhookEntry | undefined {
		return this.webhookPathMap.get(path);
	}

	/**
	 * Get webhooks
	 *
	 * @param pluginId Plugin ID (optional, if not provided, returns all webhooks)
	 * @returns Array of webhook entries
	 */
	public getWebhooks(pluginId?: string): WebhookEntry[] {
		if (pluginId) {
			return this.webhooks.get(pluginId) ?? [];
		}

		const allWebhooks: WebhookEntry[] = [];
		for (const pluginWebhooks of this.webhooks.values()) {
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
	public getExternalAPIs(pluginId?: string): ExternalAPIEntry[] {
		if (pluginId) {
			return this.externalAPIs.get(pluginId) ?? [];
		}

		const allAPIs: ExternalAPIEntry[] = [];
		for (const pluginAPIs of this.externalAPIs.values()) {
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
	public getExternalAPI(
		pluginId: string,
		apiId: string,
	): ExternalAPIEntry | undefined {
		const pluginAPIs = this.externalAPIs.get(pluginId);
		return pluginAPIs?.find((api) => api.apiId === apiId);
	}

	/**
	 * Clear all extensions for a plugin
	 *
	 * @param pluginId Plugin ID
	 */
	public clearPlugin(pluginId: string): void {
		this.unregisterOAuthProvider(pluginId);
		this.unregisterWebhook(pluginId);
		this.unregisterExternalAPI(pluginId);
	}

	/**
	 * Clear all extensions
	 *
	 * @warning This will remove all registered extensions!
	 */
	public clear(): void {
		const providerCount = Array.from(this.oauthProviders.values()).reduce(
			(sum, provs) => sum + provs.length,
			0,
		);
		const webhookCount = Array.from(this.webhooks.values()).reduce(
			(sum, whs) => sum + whs.length,
			0,
		);
		const apiCount = Array.from(this.externalAPIs.values()).reduce(
			(sum, apis) => sum + apis.length,
			0,
		);

		this.oauthProviders.clear();
		this.webhooks.clear();
		this.externalAPIs.clear();
		this.webhookPathMap.clear();

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
	public getStats(): {
		totalPlugins: number;
		totalOAuthProviders: number;
		totalWebhooks: number;
		totalExternalAPIs: number;
	} {
		return {
			totalPlugins: new Set([
				...this.oauthProviders.keys(),
				...this.webhooks.keys(),
				...this.externalAPIs.keys(),
			]).size,
			totalOAuthProviders: Array.from(this.oauthProviders.values()).reduce(
				(sum, provs) => sum + provs.length,
				0,
			),
			totalWebhooks: Array.from(this.webhooks.values()).reduce(
				(sum, whs) => sum + whs.length,
				0,
			),
			totalExternalAPIs: Array.from(this.externalAPIs.values()).reduce(
				(sum, apis) => sum + apis.length,
				0,
			),
		};
	}
}

// ============================================================================
// Singleton Export
// ============================================================================

/**
 * Get integration extension registry instance
 */
export function getIntegrationExtensionRegistry(): IntegrationExtensionRegistry {
	return IntegrationExtensionRegistry.getInstance();
}
