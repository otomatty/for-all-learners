/**
 * Data Processor Extension Sample Plugin
 *
 * This plugin demonstrates how to use the Data API to:
 * - Register importers (Markdown, Text)
 * - Register exporters (JSON, Markdown)
 * - Register transformers (content transformation)
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ Plugin loader system
 *
 * Dependencies:
 *   └─ Plugin API (Data, Storage, Notifications)
 *
 * Related Documentation:
 *   └─ Guide: docs/guides/plugin-development.md
 */

import type { JSONContent, PluginAPI } from "../../../../packages/plugin-types";

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
		"Data Processor Extension サンプルプラグインが起動しました！",
	);

	// Example: Register a Markdown importer
	await api.data.registerImporter({
		id: "com.fal.examples.data-processor-extension.markdown-importer",
		name: "Markdown インポーター",
		description: "Markdownファイルをインポートします",
		extensions: ["md", "markdown"],
		importer: async (file: File | Blob): Promise<JSONContent> => {
			const text = await file.text();

			// Simple Markdown to JSONContent conversion
			// In production, use a proper Markdown parser
			const lines = text.split("\n");
			const content: JSONContent[] = [];

			for (const line of lines) {
				if (line.trim() === "") {
					continue;
				}

				if (line.startsWith("# ")) {
					content.push({
						type: "heading",
						attrs: { level: 1 },
						content: [{ type: "text", text: line.slice(2) }],
					});
				} else if (line.startsWith("## ")) {
					content.push({
						type: "heading",
						attrs: { level: 2 },
						content: [{ type: "text", text: line.slice(3) }],
					});
				} else if (line.startsWith("### ")) {
					content.push({
						type: "heading",
						attrs: { level: 3 },
						content: [{ type: "text", text: line.slice(4) }],
					});
				} else {
					content.push({
						type: "paragraph",
						content: [{ type: "text", text: line }],
					});
				}
			}

			return {
				type: "doc",
				content,
			};
		},
	});

	// Example: Register a Text importer
	await api.data.registerImporter({
		id: "com.fal.examples.data-processor-extension.text-importer",
		name: "テキスト インポーター",
		description: "テキストファイルをインポートします",
		extensions: ["txt", "text"],
		importer: async (file: File | Blob): Promise<JSONContent> => {
			const text = await file.text();
			const lines = text.split("\n").filter((line) => line.trim() !== "");

			return {
				type: "doc",
				content: lines.map((line) => ({
					type: "paragraph",
					content: [{ type: "text", text: line }],
				})),
			};
		},
	});

	// Example: Register a JSON exporter
	await api.data.registerExporter({
		id: "com.fal.examples.data-processor-extension.json-exporter",
		name: "JSON エクスポーター",
		description: "コンテンツをJSON形式でエクスポートします",
		extension: "json",
		mimeType: "application/json",
		exporter: async (content: JSONContent): Promise<Blob> => {
			const jsonString = JSON.stringify(content, null, 2);
			return new Blob([jsonString], { type: "application/json" });
		},
	});

	// Example: Register a Markdown exporter
	await api.data.registerExporter({
		id: "com.fal.examples.data-processor-extension.markdown-exporter",
		name: "Markdown エクスポーター",
		description: "コンテンツをMarkdown形式でエクスポートします",
		extension: "md",
		mimeType: "text/markdown",
		exporter: async (content: JSONContent): Promise<Blob> => {
			// Simple JSONContent to Markdown conversion
			// In production, use a proper converter
			const markdown = convertToMarkdown(content);
			return new Blob([markdown], { type: "text/markdown" });
		},
	});

	// Example: Register a transformer (uppercase all text)
	await api.data.registerTransformer({
		id: "com.fal.examples.data-processor-extension.uppercase-transformer",
		name: "大文字変換",
		description: "すべてのテキストを大文字に変換します",
		transformer: async (content: JSONContent): Promise<JSONContent> => {
			return transformText(content, (text) => text.toUpperCase());
		},
	});

	// Example: Register another transformer (add prefix to paragraphs)
	await api.data.registerTransformer({
		id: "com.fal.examples.data-processor-extension.prefix-transformer",
		name: "プレフィックス追加",
		description: "すべての段落にプレフィックスを追加します",
		transformer: async (content: JSONContent): Promise<JSONContent> => {
			return transformContent(content, (node) => {
				if (node.type === "paragraph") {
					const existingContent = node.content;
					const contentArray = Array.isArray(existingContent)
						? existingContent
						: [];
					return {
						...node,
						content: [{ type: "text", text: "[追加] " }, ...contentArray],
					};
				}
				return node;
			});
		},
	});

	// Store activation timestamp
	await api.storage.set("lastActivated", new Date().toISOString());

	return {
		methods: {
			/**
			 * Get registered processors count
			 */
			async getProcessorCount(): Promise<number> {
				return 6; // 2 importers + 2 exporters + 2 transformers
			},
		},

		/**
		 * Cleanup function
		 */
		async dispose() {
			// Unregister all data processors
			await api.data.unregisterImporter(
				"com.fal.examples.data-processor-extension.markdown-importer",
			);
			await api.data.unregisterImporter(
				"com.fal.examples.data-processor-extension.text-importer",
			);
			await api.data.unregisterExporter(
				"com.fal.examples.data-processor-extension.json-exporter",
			);
			await api.data.unregisterExporter(
				"com.fal.examples.data-processor-extension.markdown-exporter",
			);
			await api.data.unregisterTransformer(
				"com.fal.examples.data-processor-extension.uppercase-transformer",
			);
			await api.data.unregisterTransformer(
				"com.fal.examples.data-processor-extension.prefix-transformer",
			);

			api.notifications.info(
				"Data Processor Extension サンプルプラグインが終了しました",
			);
		},
	};
}

/**
 * Convert JSONContent to Markdown (simplified)
 */
function convertToMarkdown(content: unknown): string {
	if (!content || typeof content !== "object") {
		return "";
	}

	const obj = content as Record<string, unknown>;
	if (obj.type === "doc" && Array.isArray(obj.content)) {
		return obj.content.map(convertNodeToMarkdown).join("\n\n");
	}

	return "";
}

/**
 * Convert a node to Markdown
 */
function convertNodeToMarkdown(node: unknown): string {
	if (!node || typeof node !== "object") {
		return "";
	}

	const obj = node as Record<string, unknown>;

	switch (obj.type) {
		case "heading": {
			const level = (obj.attrs as { level?: number })?.level ?? 1;
			const text = extractText(obj.content);
			return `${"#".repeat(level)} ${text}`;
		}
		case "paragraph": {
			const text = extractText(obj.content);
			return text;
		}
		case "bulletList":
		case "orderedList": {
			if (Array.isArray(obj.content)) {
				return obj.content.map(convertNodeToMarkdown).join("\n");
			}
			return "";
		}
		default:
			return extractText(obj.content);
	}
}

/**
 * Extract text from content array
 */
function extractText(content: unknown): string {
	if (typeof content === "string") {
		return content;
	}

	if (Array.isArray(content)) {
		return content.map(extractText).join("");
	}

	if (content && typeof content === "object") {
		const obj = content as Record<string, unknown>;
		if (obj.text) {
			return String(obj.text);
		}
		if (obj.content) {
			return extractText(obj.content);
		}
	}

	return "";
}

/**
 * Transform text in content
 */
function transformText(
	content: unknown,
	transformFn: (text: string) => string,
): JSONContent {
	if (!content || typeof content !== "object") {
		return content as JSONContent;
	}

	const obj = content as Record<string, unknown>;
	const result: Record<string, unknown> = { ...obj };

	if (obj.content) {
		if (Array.isArray(obj.content)) {
			result.content = obj.content.map((item) =>
				transformText(item, transformFn),
			);
		} else {
			result.content = transformText(obj.content, transformFn);
		}
	}

	if (obj.text && typeof obj.text === "string") {
		result.text = transformFn(obj.text);
	}

	return result as JSONContent;
}

/**
 * Transform content with custom function
 */
function transformContent(
	content: unknown,
	transformFn: (node: JSONContent) => JSONContent,
): JSONContent {
	if (!content || typeof content !== "object") {
		return content as JSONContent;
	}

	const obj = content as JSONContent;
	const transformed = transformFn(obj);

	if (transformed && typeof transformed === "object") {
		const result = transformed as JSONContent;
		if (result.content && Array.isArray(result.content)) {
			result.content = result.content.map((item) =>
				transformContent(item, transformFn),
			);
		}
		return result;
	}

	return transformed;
}

// Export the activation function
export default activate;
