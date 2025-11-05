/**
 * {{PLUGIN_NAME}} Plugin
 *
 * {{PLUGIN_DESCRIPTION}}
 *
 * This plugin demonstrates how to register integration extensions (OAuth, webhooks, external APIs).
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

/**
 * Plugin activation function
 *
 * @param api Plugin API instance
 * @param config User configuration
 * @returns Plugin instance with dispose method
 */
async function activate(
	api: any, // PluginAPI - types not available in worker context
	config?: Record<string, unknown>,
): Promise<{
	methods?: Record<string, (...args: unknown[]) => unknown | Promise<unknown>>;
	dispose?: () => void | Promise<void>;
}> {
	// Show notification when plugin activates
	api.notifications.success("{{PLUGIN_NAME}} が起動しました！");

	// Example: Register OAuth provider
	await api.integration.registerOAuthProvider({
		id: "{{PLUGIN_ID}}-oauth",
		name: "Sample OAuth",
		description: "サンプルOAuthプロバイダー",
		authorizationUrl: "https://example.com/oauth/authorize",
		tokenUrl: "https://example.com/oauth/token",
		clientId: (config?.clientId as string) || "",
		scopes: ["read", "write"],
	});

	// Example: Register external API
	await api.integration.registerExternalAPI({
		id: "{{PLUGIN_ID}}-api",
		name: "Sample API",
		description: "サンプル外部API",
		baseUrl: "https://api.example.com",
		defaultHeaders: {
			Accept: "application/json",
		},
	});

	// Example: Register webhook
	await api.integration.registerWebhook({
		id: "{{PLUGIN_ID}}-webhook",
		name: "Sample Webhook",
		description: "サンプルWebhook",
		url: "https://example.com/webhook",
		events: ["event1", "event2"],
		async handler(event, _payload) {
			api.notifications.info(`Webhook received: ${event}`);
		},
	});

	return {
		methods: {
			/**
			 * Example method to call external API
			 */
			async callAPI() {
				try {
					const response = await api.integration.callExternalAPI(
						"{{PLUGIN_ID}}-api",
						{
							method: "GET",
							url: "/endpoint",
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
		},

		/**
		 * Cleanup function
		 */
		async dispose() {
			// Unregister all integration extensions
			await api.integration.unregisterOAuthProvider("{{PLUGIN_ID}}-oauth");
			await api.integration.unregisterExternalAPI("{{PLUGIN_ID}}-api");
			await api.integration.unregisterWebhook("{{PLUGIN_ID}}-webhook");

			api.notifications.info("{{PLUGIN_NAME}} が終了しました");
		},
	};
}

// Export the activation function
export default activate;
