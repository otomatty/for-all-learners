/**
 * Hello World Plugin
 *
 * This plugin demonstrates the basic structure of a F.A.L plugin.
 * It shows how to:
 * - Use the Plugin API
 * - Register commands
 * - Use storage API
 * - Show notifications
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ Plugin loader system
 *
 * Dependencies:
 *   └─ Plugin API (Storage, Notifications, UI, App)
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
	api.notifications.success("Hello World プラグインが起動しました！");

	// Get application information
	const appName = api.app.getName();
	const appVersion = api.app.getVersion();
	const userId = await api.app.getUserId();

	api.notifications.info(
		`アプリケーション: ${appName} v${appVersion}${
			userId ? ` (ユーザー: ${userId})` : ""
		}`,
	);

	// Register a command
	await api.ui.registerCommand({
		id: "com.fal.examples.hello-world-greet",
		label: "Hello World を実行",
		description: "Hello World メッセージを表示します",
		shortcut: "Ctrl+Shift+H",
		handler: async () => {
			const greetingCount = await api.storage.get<number>("greetingCount");
			const count = (greetingCount ?? 0) + 1;

			await api.storage.set("greetingCount", count);
			await api.storage.set("lastGreeted", new Date().toISOString());

			api.notifications.success(
				`Hello World! これは ${count} 回目の挨拶です 🎉`,
			);
		},
	});

	// Register another command to show stored data
	await api.ui.registerCommand({
		id: "com.fal.examples.hello-world-show-storage",
		label: "ストレージ内容を表示",
		description: "プラグインのストレージに保存されているデータを表示します",
		handler: async () => {
			const greetingCount = await api.storage.get<number>("greetingCount");
			const lastGreeted = await api.storage.get<string>("lastGreeted");
			const lastActivated = await api.storage.get<string>("lastActivated");

			const message = `ストレージ内容:
- 挨拶回数: ${greetingCount ?? 0}
- 最後の挨拶: ${lastGreeted ?? "なし"}
- 最後の起動: ${lastActivated ?? "なし"}`;

			// Show dialog with storage information
			await api.ui.showDialog({
				title: "プラグインストレージ",
				message: message,
				buttons: [
					{
						label: "閉じる",
						variant: "default",
					},
				],
			});
		},
	});

	// Store activation timestamp
	await api.storage.set("lastActivated", new Date().toISOString());

	return {
		methods: {
			/**
			 * Get greeting count
			 */
			async getGreetingCount(): Promise<number> {
				return (await api.storage.get<number>("greetingCount")) ?? 0;
			},

			/**
			 * Reset greeting count
			 */
			async resetGreetingCount(): Promise<void> {
				await api.storage.set("greetingCount", 0);
				await api.storage.set("lastGreeted", null);
				api.notifications.info("挨拶回数をリセットしました");
			},
		},

		/**
		 * Cleanup function
		 */
		async dispose() {
			// Unregister commands
			await api.ui.unregisterCommand("com.fal.examples.hello-world-greet");
			await api.ui.unregisterCommand(
				"com.fal.examples.hello-world-show-storage",
			);

			api.notifications.info("Hello World プラグインが終了しました");
		},
	};
}

// Export the activation function
export default activate;
