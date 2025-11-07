/**
 * Editor Extension Sample Plugin
 *
 * This plugin demonstrates how to use the Editor API to:
 * - Register custom editor extensions
 * - Execute editor commands
 * - Get and set editor content
 * - Work with editor selection
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ Plugin loader system
 *
 * Dependencies:
 *   └─ Plugin API (Editor, Storage, Notifications, UI)
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
	api.notifications.success(
		"Editor Extension サンプルプラグインが起動しました！",
	);

	// Register a command to insert text
	await api.ui.registerCommand({
		id: "com.fal.examples.editor-extension.insert-text",
		label: "サンプルテキストを挿入",
		description: "エディタにサンプルテキストを挿入します",
		handler: async () => {
			try {
				// Get current selection
				const selection = await api.editor.getSelection();
				if (selection) {
					api.notifications.info(
						`選択範囲: ${selection.from} - ${selection.to}`,
					);
				}

				// Insert content
				await api.editor.executeCommand("insertContent", {
					type: "paragraph",
					content: [
						{
							type: "text",
							text: "Hello from Editor Extension Plugin! ",
						},
						{
							type: "text",
							marks: [{ type: "bold" }],
							text: "This text was inserted by a plugin.",
						},
					],
				});

				api.notifications.success("テキストを挿入しました");
			} catch (error) {
				api.notifications.error(
					`エラー: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		},
	});

	// Register a command to get editor content
	await api.ui.registerCommand({
		id: "com.fal.examples.editor-extension.get-content",
		label: "エディタの内容を取得",
		description: "エディタの内容を取得して表示します",
		handler: async () => {
			try {
				const content = await api.editor.getContent();
				const contentStr = JSON.stringify(content, null, 2);

				// Show content in dialog
				await api.ui.showDialog({
					title: "エディタの内容",
					message: "エディタの内容（JSON形式）:",
					content: `<pre style="max-height: 400px; overflow: auto; background: #f5f5f5; padding: 1rem; border-radius: 4px;"><code>${contentStr}</code></pre>`,
					width: 600,
					height: 500,
					buttons: [
						{
							label: "閉じる",
							variant: "default",
						},
					],
				});

				api.notifications.info("エディタの内容を表示しました");
			} catch (error) {
				api.notifications.error(
					`エラー: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		},
	});

	// Register a command to set editor content
	await api.ui.registerCommand({
		id: "com.fal.examples.editor-extension.set-content",
		label: "サンプルコンテンツを設定",
		description: "エディタにサンプルコンテンツを設定します",
		handler: async () => {
			try {
				const sampleContent = {
					type: "doc",
					content: [
						{
							type: "heading",
							attrs: { level: 1 },
							content: [{ type: "text", text: "サンプルコンテンツ" }],
						},
						{
							type: "paragraph",
							content: [
								{
									type: "text",
									text: "これは Editor Extension プラグインによって設定されたサンプルコンテンツです。",
								},
							],
						},
						{
							type: "paragraph",
							content: [
								{
									type: "text",
									marks: [{ type: "bold" }],
									text: "太字",
								},
								{ type: "text", text: " と " },
								{
									type: "text",
									marks: [{ type: "italic" }],
									text: "斜体",
								},
								{ type: "text", text: " の例です。" },
							],
						},
					],
				};

				await api.editor.setContent(sampleContent);
				api.notifications.success("サンプルコンテンツを設定しました");
			} catch (error) {
				api.notifications.error(
					`エラー: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		},
	});

	// Store activation timestamp
	await api.storage.set("lastActivated", new Date().toISOString());

	return {
		methods: {
			/**
			 * Toggle bold formatting
			 */
			async toggleBold(): Promise<void> {
				const canExecute = await api.editor.canExecuteCommand("toggleBold");
				if (canExecute) {
					await api.editor.executeCommand("toggleBold");
					api.notifications.success("Boldを切り替えました");
				} else {
					api.notifications.warning("Boldコマンドが実行できません");
				}
			},

			/**
			 * Get word count from editor content
			 */
			async getWordCount(): Promise<number> {
				const content = await api.editor.getContent();
				const text = extractTextFromContent(content);
				const words = text.split(/\s+/).filter((word) => word.length > 0);
				return words.length;
			},

			/**
			 * Insert timestamp at cursor position
			 */
			async insertTimestamp(): Promise<void> {
				const timestamp = new Date().toLocaleString("ja-JP");
				await api.editor.executeCommand("insertContent", {
					type: "text",
					text: timestamp,
				});
				api.notifications.info(`タイムスタンプを挿入: ${timestamp}`);
			},
		},

		/**
		 * Cleanup function
		 */
		async dispose() {
			// Unregister commands
			await api.ui.unregisterCommand(
				"com.fal.examples.editor-extension.insert-text",
			);
			await api.ui.unregisterCommand(
				"com.fal.examples.editor-extension.get-content",
			);
			await api.ui.unregisterCommand(
				"com.fal.examples.editor-extension.set-content",
			);

			api.notifications.info(
				"Editor Extension サンプルプラグインが終了しました",
			);
		},
	};
}

/**
 * Extract text from JSONContent recursively
 */
function extractTextFromContent(content: unknown): string {
	if (typeof content === "string") {
		return content;
	}

	if (Array.isArray(content)) {
		return content.map(extractTextFromContent).join(" ");
	}

	if (content && typeof content === "object") {
		const obj = content as Record<string, unknown>;
		if (obj.content) {
			return extractTextFromContent(obj.content);
		}
		if (obj.text) {
			return String(obj.text);
		}
	}

	return "";
}

// Export the activation function
export default activate;
