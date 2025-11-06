/**
 * {{PLUGIN_NAME}} Plugin
 *
 * {{PLUGIN_DESCRIPTION}}
 *
 * This plugin demonstrates how to register data processor extensions (importers, exporters, transformers).
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

	// Example: Register an importer
	await api.data.registerImporter({
		id: "{{PLUGIN_ID}}-importer",
		name: "Sample Importer",
		description: "サンプルインポーター",
		supportedFormats: ["markdown", "text"],
		async import(
			_data: string | ArrayBuffer | Blob,
			_options?: Record<string, unknown>,
		): Promise<{
			data: unknown;
			format: "json" | "markdown" | "html" | "csv" | "text";
			itemCount?: number;
			metadata?: Record<string, unknown>;
		}> {
			// Example: Import data
			const format =
				(_options?.format as "json" | "markdown" | "html" | "csv" | "text") ??
				"text";
			api.notifications.info(`Importing ${format} data...`);
			return {
				data: { imported: true, format },
				format,
			};
		},
	});

	// Example: Register an exporter
	await api.data.registerExporter({
		id: "{{PLUGIN_ID}}-exporter",
		name: "Sample Exporter",
		description: "サンプルエクスポーター",
		supportedFormats: ["json", "csv"],
		async export(
			data: unknown,
			_options?: Record<string, unknown>,
		): Promise<{
			data: string | ArrayBuffer | Blob;
			format: "json" | "markdown" | "html" | "csv" | "text";
			filename?: string;
			mimeType?: string;
			metadata?: Record<string, unknown>;
		}> {
			// Example: Export data
			const format =
				(_options?.format as "json" | "markdown" | "html" | "csv" | "text") ??
				"json";
			api.notifications.info(`Exporting to ${format}...`);
			return {
				data: JSON.stringify(data),
				format,
			};
		},
	});

	// Example: Register a transformer
	await api.data.registerTransformer({
		id: "{{PLUGIN_ID}}-transformer",
		name: "Sample Transformer",
		description: "サンプルトランスフォーマー",
		sourceFormats: ["json", "markdown"],
		targetFormats: ["json", "markdown"],
		async transformer(
			data: unknown,
			sourceFormat: "json" | "markdown" | "html" | "csv" | "text",
			targetFormat: "json" | "markdown" | "html" | "csv" | "text",
			_options?: Record<string, unknown>,
		): Promise<{
			data: unknown;
			sourceFormat: "json" | "markdown" | "html" | "csv" | "text";
			targetFormat: "json" | "markdown" | "html" | "csv" | "text";
			metadata?: Record<string, unknown>;
		}> {
			// Example: Transform data
			api.notifications.info("Transforming data...");
			return {
				data: {
					...(typeof data === "object" && data !== null ? data : {}),
					transformed: true,
					timestamp: new Date().toISOString(),
				},
				sourceFormat,
				targetFormat,
			};
		},
	});

	return {
		methods: {
			/**
			 * Example method
			 */
			async processData(data: unknown) {
				const transformed = await api.data.transformData(data, {
					transformerId: "{{PLUGIN_ID}}-transformer",
				});
				api.notifications.success("データを処理しました");
				return transformed;
			},
		},

		/**
		 * Cleanup function
		 */
		async dispose() {
			// Unregister all data processor extensions
			await api.data.unregisterImporter("{{PLUGIN_ID}}-importer");
			await api.data.unregisterExporter("{{PLUGIN_ID}}-exporter");
			await api.data.unregisterTransformer("{{PLUGIN_ID}}-transformer");

			api.notifications.info("{{PLUGIN_NAME}} が終了しました");
		},
	};
}

// Export the activation function
export default activate;
