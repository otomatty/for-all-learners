/**
 * {{PLUGIN_NAME}} Plugin
 *
 * {{PLUGIN_DESCRIPTION}}
 *
 * This plugin demonstrates how to register UI extensions (widgets, pages, sidebar panels).
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

/**
 * Plugin activation function
 *
 * @param api Plugin API instance
 * @param config User configuration
 * @returns Plugin instance with dispose method
 */
async function activate(
	api: any, // PluginAPI - types not available in worker context
	_config?: Record<string, unknown>,
): Promise<{
	methods?: Record<string, (...args: unknown[]) => unknown | Promise<unknown>>;
	dispose?: () => void | Promise<void>;
}> {
	// Show notification when plugin activates
	api.notifications.success("{{PLUGIN_NAME}} が起動しました！");

	// Example: Register a widget
	await api.ui.registerWidget({
		id: "{{PLUGIN_ID}}-widget",
		name: "Sample Widget",
		description: "サンプルウィジェット",
		position: "top-right",
		size: "medium",
		icon: "📊",
		async render() {
			// Get data from storage
			const data = await api.storage.get("widget-data");
			const count = (data as { count?: number })?.count || 0;

			return {
				type: "stat-card",
				props: {
					title: "サンプルウィジェット",
					value: count.toString(),
					description: `カウント: ${count}`,
					trend: "up",
					icon: "📊",
				},
			};
		},
	});

	// Example: Register a custom page
	await api.ui.registerPage({
		id: "{{PLUGIN_ID}}-page",
		name: "Sample Page",
		description: "サンプルページ",
		route: {
			path: "/plugin/{{PLUGIN_ID}}",
			title: "Sample Page",
		},
		async render() {
			return {
				type: "html",
				props: {
					content:
						"<h1>Sample Page</h1><p>This is a sample page registered by {{PLUGIN_NAME}}.</p>",
				},
			};
		},
	});

	// Example: Register a sidebar panel
	await api.ui.registerSidebarPanel({
		id: "{{PLUGIN_ID}}-panel",
		name: "Sample Panel",
		description: "サンプルサイドバーパネル",
		position: "right",
		icon: "📋",
		defaultOpen: false,
		async render() {
			return {
				type: "html",
				props: {
					content: "<p>This is a sample sidebar panel.</p>",
				},
			};
		},
	});

	return {
		methods: {
			/**
			 * Example method to update widget data
			 */
			async updateWidgetData() {
				const data = await api.storage.get("widget-data");
				const count = ((data as { count?: number })?.count || 0) + 1;
				await api.storage.set("widget-data", { count });
				api.notifications.success(`ウィジェットデータを更新: ${count}`);
			},
		},

		/**
		 * Cleanup function
		 */
		async dispose() {
			// Unregister all UI extensions
			await api.ui.unregisterWidget("{{PLUGIN_ID}}-widget");
			await api.ui.unregisterPage("{{PLUGIN_ID}}-page");
			await api.ui.unregisterSidebarPanel("{{PLUGIN_ID}}-panel");

			api.notifications.info("{{PLUGIN_NAME}} が終了しました");
		},
	};
}

// Export the activation function
export default activate;
