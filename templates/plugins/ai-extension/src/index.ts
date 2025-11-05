/**
 * {{PLUGIN_NAME}} Plugin
 *
 * {{PLUGIN_DESCRIPTION}}
 *
 * This plugin demonstrates how to register AI extensions (question generators, prompt templates, content analyzers).
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ Plugin loader system
 *
 * Dependencies:
 *   └─ Plugin API (AI, Storage, Notifications)
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

	// Example: Register a question generator
	await api.ai.registerQuestionGenerator({
		id: "{{PLUGIN_ID}}-sample-generator",
		name: "Sample Question Generator",
		description: "サンプル問題生成器",
		supportedTypes: ["multiple-choice", "short-answer"],
		async generator(_content, _optionss) {
			// Example: Generate questions from content
			return [
				{
					type: "multiple-choice",
					question: "サンプル問題です",
					choices: ["選択肢1", "選択肢2", "選択肢3", "選択肢4"],
					correctAnswer: 0,
				},
			];
		},
	});

	// Example: Register a prompt template
	await api.ai.registerPromptTemplate({
		id: "{{PLUGIN_ID}}-sample-template",
		key: "sample-template",
		name: "Sample Prompt Template",
		description: "サンプルプロンプトテンプレート",
		variables: ["topic", "length"],
		template:
			"以下のトピックについて{{length}}文字で説明してください: {{topic}}",
	});

	// Example: Register a content analyzer
	await api.ai.registerContentAnalyzer({
		id: "{{PLUGIN_ID}}-sample-analyzer",
		name: "Sample Content Analyzer",
		description: "サンプルコンテンツアナライザー",
		async analyzer(content) {
			// Example: Analyze content
			return {
				wordCount: content.split(/\s+/).length,
				characterCount: content.length,
			};
		},
	});

	return {
		methods: {
			/**
			 * Example method
			 */
			async analyzeContent(content: string) {
				const result = await api.ai.analyzeContent(content, {
					analyzerId: "{{PLUGIN_ID}}-sample-analyzer",
				});
				api.notifications.info(`分析結果: ${JSON.stringify(result)}`);
				return result;
			},
		},

		/**
		 * Cleanup function
		 */
		async dispose() {
			// Unregister all AI extensions
			await api.ai.unregisterQuestionGenerator(
				"{{PLUGIN_ID}}-sample-generator",
			);
			await api.ai.unregisterPromptTemplate("{{PLUGIN_ID}}-sample-template");
			await api.ai.unregisterContentAnalyzer("{{PLUGIN_ID}}-sample-analyzer");

			api.notifications.info("{{PLUGIN_NAME}} が終了しました");
		},
	};
}

// Export the activation function
export default activate;
