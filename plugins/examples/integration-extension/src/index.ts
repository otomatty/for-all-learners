/**
 * Integration Extension Sample Plugin
 *
 * This plugin demonstrates how to use the Integration API to:
 * - Register OAuth providers
 * - Register webhooks
 * - Register external APIs
 * - Call external APIs
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ Plugin loader system
 *
 * Dependencies:
 *   └─ Plugin API (Integration, Storage, Notifications)
 *
 * Related Documentation:
 *   └─ Guide: docs/guides/plugin-development.md
 */

import type { PluginAPI } from "../../../../packages/plugin-types";

/**
 * Plugin activation function
 *
 * @param api Plugin API instance
 * @param config User configuration
 * @returns Plugin instance with dispose method
 */
async function activate(
	api: PluginAPI,
	config?: Record<string, unknown>,
): Promise<{
	methods?: Record<string, (...args: unknown[]) => unknown | Promise<unknown>>;
	dispose?: () => void | Promise<void>;
}> {
	// Show notification when plugin activates
	api.notifications.success(
		"Integration Extension サンプルプラグインが起動しました！",
	);

	// Example: Register OAuth provider
	await api.integration.registerOAuthProvider({
		id: "com.fal.examples.integration-extension.sample-oauth",
		name: "サンプル OAuth",
		description: "サンプルOAuthプロバイダー（デモ用）",
		authorizationUrl: "https://example.com/oauth/authorize",
		tokenUrl: "https://example.com/oauth/token",
		clientId: (config?.clientId as string) || "sample-client-id",
		scopes: ["read", "write"],
	});

	// Example: Register external API
	await api.integration.registerExternalAPI({
		id: "com.fal.examples.integration-extension.sample-api",
		name: "サンプル API",
		description: "サンプル外部API（デモ用）",
		baseUrl: "https://api.example.com",
		defaultHeaders: {
			Accept: "application/json",
			"User-Agent": "F.A.L Plugin",
		},
	});

	// Example: Register webhook
	await api.integration.registerWebhook({
		id: "com.fal.examples.integration-extension.sample-webhook",
		name: "サンプル Webhook",
		description: "サンプルWebhook（デモ用）",
		path: "/webhook/integration-extension-sample",
		methods: ["POST", "GET"],
		handler: async (event) => {
			api.notifications.info(`Webhook受信: ${event.type}`);

			// Store webhook event
			const events =
				(await api.storage.get<Array<unknown>>("webhookEvents")) || [];
			events.push({
				type: event.type,
				timestamp: event.timestamp || new Date().toISOString(),
				payload: event.payload,
			});
			await api.storage.set("webhookEvents", events);

			// Keep only last 10 events
			if (events.length > 10) {
				await api.storage.set("webhookEvents", events.slice(-10));
			}
		},
	});

	// Store activation timestamp
	await api.storage.set("lastActivated", new Date().toISOString());

	return {
		methods: {
			/**
			 * Call external API
			 */
			async callSampleAPI(): Promise<unknown> {
				try {
					const response = await api.integration.callExternalAPI(
						"com.fal.examples.integration-extension.sample-api",
						{
							method: "GET",
							url: "/status",
						},
					);

					api.notifications.success("API呼び出し成功");
					return response;
				} catch (error) {
					api.notifications.error(
						`API呼び出し失敗: ${error instanceof Error ? error.message : String(error)}`,
					);
					throw error;
				}
			},

			/**
			 * Get webhook events
			 */
			async getWebhookEvents(): Promise<Array<unknown>> {
				return (await api.storage.get<Array<unknown>>("webhookEvents")) || [];
			},

			/**
			 * Clear webhook events
			 */
			async clearWebhookEvents(): Promise<void> {
				await api.storage.set("webhookEvents", []);
				api.notifications.info("Webhookイベントをクリアしました");
			},
		},

		/**
		 * Cleanup function
		 */
		async dispose() {
			// Unregister all integration extensions
			await api.integration.unregisterOAuthProvider(
				"com.fal.examples.integration-extension.sample-oauth",
			);
			await api.integration.unregisterExternalAPI(
				"com.fal.examples.integration-extension.sample-api",
			);
			await api.integration.unregisterWebhook(
				"com.fal.examples.integration-extension.sample-webhook",
			);

			api.notifications.info(
				"Integration Extension サンプルプラグインが終了しました",
			);
		},
	};
}

// Export the activation function
export default activate;
