/**
 * {{PLUGIN_NAME}} Plugin
 *
 * {{PLUGIN_DESCRIPTION}}
 *
 * This plugin demonstrates how to register custom editor extensions (marks, nodes, plugins).
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ Plugin loader system
 *
 * Dependencies:
 *   └─ Plugin API (Editor, Storage, Notifications)
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

	// Note: Registering Tiptap extensions from Web Worker context is complex.
	// In a real implementation, you would need to:
	// 1. Define the extension object structure
	// 2. Register it using api.editor.registerExtension()
	//
	// Example: Register a custom mark
	// await api.editor.registerExtension({
	//   id: 'custom-highlight',
	//   extension: {
	//     name: 'customHighlight',
	//     addAttributes() {
	//       return {
	//         color: {
	//           default: '#ffeb3b',
	//         },
	//       };
	//     },
	//     parseHTML() {
	//       return [{ tag: 'span[data-custom-highlight]' }];
	//     },
	//     renderHTML({ HTMLAttributes }) {
	//       return [
	//         'span',
	//         {
	//           'data-custom-highlight': '',
	//           style: `background-color: ${HTMLAttributes.color}`,
	//         },
	//         0,
	//       ];
	//     },
	//   },
	//   type: 'mark',
	// });

	// Example: Register a command to insert text
	await api.ui.registerCommand({
		id: "{{PLUGIN_ID}}-insert-text",
		name: "Insert Sample Text",
		description: "エディタにサンプルテキストを挿入",
		async execute() {
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
					type: "text",
					text: "Hello from {{PLUGIN_NAME}}!",
				});

				api.notifications.success("テキストを挿入しました");
			} catch (error) {
				api.notifications.error(
					`エラー: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		},
	});

	// Example: Register a command to get editor content
	await api.ui.registerCommand({
		id: "{{PLUGIN_ID}}-get-content",
		name: "Get Editor Content",
		description: "エディタの内容を取得",
		async execute() {
			try {
				const _content = await api.editor.getContent();
				api.notifications.info("エディタの内容をコンソールに出力しました");
			} catch (error) {
				api.notifications.error(
					`エラー: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		},
	});

	return {
		methods: {
			/**
			 * Example method to toggle bold
			 */
			async toggleBold() {
				const canExecute = await api.editor.canExecuteCommand("toggleBold");
				if (canExecute) {
					await api.editor.executeCommand("toggleBold");
					api.notifications.success("Boldを切り替えました");
				} else {
					api.notifications.warning("Boldコマンドが実行できません");
				}
			},
		},

		/**
		 * Cleanup function
		 */
		async dispose() {
			// Unregister extensions (if registered)
			// await api.editor.unregisterExtension('custom-highlight');

			// Unregister commands
			await api.ui.unregisterCommand("{{PLUGIN_ID}}-insert-text");
			await api.ui.unregisterCommand("{{PLUGIN_ID}}-get-content");

			api.notifications.info("{{PLUGIN_NAME}} が終了しました");
		},
	};
}

// Export the activation function
export default activate;
