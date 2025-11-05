/**
 * {{PLUGIN_NAME}} Plugin
 *
 * {{PLUGIN_DESCRIPTION}}
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ Plugin loader system
 *
 * Dependencies:
 *   └─ Plugin API (Storage, Notifications, UI)
 *
 * Related Documentation:
 *   └─ Guide: docs/guides/plugin-development.md
 */

import type { PluginAPI } from "./types";

/**
 * Plugin activation function
 *
 * @param api Plugin API instance
 * @param config User configuration
 * @returns Plugin instance with dispose method
 */
async function activate(
	api: PluginAPI,
	_config?: Record<string, unknown>,
): Promise<{
	methods?: Record<string, (...args: unknown[]) => unknown | Promise<unknown>>;
	dispose?: () => void | Promise<void>;
}> {
	// Show notification when plugin activates
	api.notifications.success("{{PLUGIN_NAME}} が起動しました！");

	// Register a command
	await api.ui.registerCommand({
		id: "{{PLUGIN_ID}}-hello",
		label: "Hello World",
		description: "サンプルコマンドです",
		handler: async () => {
			const appName = api.app.getName();
			api.notifications.info(
				`Hello from {{PLUGIN_NAME}}! Running on ${appName}`,
			);
		},
	});

	// Example: Store data
	await api.storage.set("lastActivated", new Date().toISOString());

	// Example: Get stored data
	const lastActivated = await api.storage.get<string>("lastActivated");
	if (lastActivated) {
	}

	return {
		methods: {
			/**
			 * Sample method
			 */
			async doSomething() {
				const appName = api.app.getName();
				api.notifications.show(`${appName} でプラグインが動作中！`);
			},
		},

		/**
		 * Cleanup function
		 */
		async dispose() {
			// Unregister command
			await api.ui.unregisterCommand("{{PLUGIN_ID}}-hello");
			api.notifications.info("{{PLUGIN_NAME}} が終了しました");
		},
	};
}

// Export the activation function
export default activate;
