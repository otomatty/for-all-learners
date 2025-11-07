/**
 * UI Extension Sample Plugin
 *
 * This plugin demonstrates how to use the UI API to:
 * - Register widgets
 * - Register custom pages
 * - Register sidebar panels
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ Plugin loader system
 *
 * Dependencies:
 *   └─ Plugin API (UI, Storage, Notifications)
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
	_config?: Record<string, unknown>,
): Promise<{
	methods?: Record<string, (...args: unknown[]) => unknown | Promise<unknown>>;
	dispose?: () => void | Promise<void>;
}> {
	// Show notification when plugin activates
	api.notifications.success("UI Extension サンプルプラグインが起動しました！");

	// Example: Register a widget
	await api.ui.registerWidget({
		id: "com.fal.examples.ui-extension.sample-widget",
		title: "サンプルウィジェット",
		description: "プラグインで作成されたサンプルウィジェットです",
		component: "SampleWidget", // Component name
		location: "dashboard",
		settings: {
			showTitle: true,
			autoRefresh: false,
		},
	});

	// Example: Register another widget for sidebar
	await api.ui.registerWidget({
		id: "com.fal.examples.ui-extension.stat-widget",
		title: "統計ウィジェット",
		description: "プラグインの統計情報を表示します",
		component: "StatWidget",
		location: "sidebar",
		settings: {
			refreshInterval: 60,
		},
	});

	// Example: Register a custom page
	await api.ui.registerPage({
		id: "com.fal.examples.ui-extension.sample-page",
		title: "サンプルページ",
		description: "プラグインで作成されたカスタムページです",
		path: "/plugin/ui-extension-sample",
		component: "SamplePage",
		icon: "📄",
	});

	// Example: Register a sidebar panel
	await api.ui.registerSidebarPanel({
		id: "com.fal.examples.ui-extension.sample-panel",
		title: "サンプルパネル",
		description: "プラグインで作成されたサイドバーパネルです",
		component: "SamplePanel",
		icon: "📊",
		position: "top",
	});

	// Register a command to open the custom page
	await api.ui.registerCommand({
		id: "com.fal.examples.ui-extension.open-page",
		label: "サンプルページを開く",
		description: "カスタムページを開きます",
		handler: async () => {
			// Note: In real implementation, you would navigate to the page
			// This is a placeholder
			api.notifications.info("サンプルページを開きました");
		},
	});

	// Store activation timestamp
	await api.storage.set("lastActivated", new Date().toISOString());
	await api.storage.set("widgetCount", 2);
	await api.storage.set("pageCount", 1);
	await api.storage.set("panelCount", 1);

	return {
		methods: {
			/**
			 * Get widget statistics
			 */
			async getWidgetStats(): Promise<Record<string, unknown>> {
				const widgetCount = (await api.storage.get<number>("widgetCount")) ?? 0;
				const pageCount = (await api.storage.get<number>("pageCount")) ?? 0;
				const panelCount = (await api.storage.get<number>("panelCount")) ?? 0;

				return {
					widgets: widgetCount,
					pages: pageCount,
					panels: panelCount,
				};
			},
		},

		/**
		 * Cleanup function
		 */
		async dispose() {
			// Unregister widgets
			await api.ui.unregisterWidget(
				"com.fal.examples.ui-extension.sample-widget",
			);
			await api.ui.unregisterWidget(
				"com.fal.examples.ui-extension.stat-widget",
			);

			// Unregister page
			await api.ui.unregisterPage("com.fal.examples.ui-extension.sample-page");

			// Unregister sidebar panel
			await api.ui.unregisterSidebarPanel(
				"com.fal.examples.ui-extension.sample-panel",
			);

			// Unregister command
			await api.ui.unregisterCommand("com.fal.examples.ui-extension.open-page");

			api.notifications.info("UI Extension サンプルプラグインが終了しました");
		},
	};
}

// Export the activation function
export default activate;
