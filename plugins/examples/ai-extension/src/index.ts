/**
 * AI Extension Sample Plugin
 *
 * This plugin demonstrates how to use the AI API to:
 * - Register question generators
 * - Register prompt templates
 * - Register content analyzers
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

import type {
	PluginAPI,
	QuestionData,
	QuestionDifficulty,
	QuestionType,
} from "../../../../packages/plugin-types";

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
	api.notifications.success("AI Extension サンプルプラグインが起動しました！");

	// Example: Register a question generator
	await api.ai.registerQuestionGenerator({
		id: "com.fal.examples.ai-extension.sample-generator",
		generator: async (
			front: string,
			back: string,
			type: QuestionType,
			_difficulty?: QuestionDifficulty,
		): Promise<QuestionData> => {
			// Generate questions based on type
			switch (type) {
				case "multiple_choice": {
					return {
						type: "multiple_choice",
						question: `「${front}」について、正しい答えはどれですか？`,
						answer: back,
						options: [
							back,
							`${back}の関連項目1`,
							`${back}の関連項目2`,
							"上記のいずれでもない",
						],
					};
				}
				case "cloze": {
					const words = back.split(/\s+/);
					return {
						type: "cloze",
						question: `「${front}」を完成させてください。空欄に入る単語は何ですか？`,
						answer: back,
						blanks: words.length > 1 ? words.slice(0, -1) : [back],
					};
				}
				default: {
					return {
						type: "flashcard",
						question: front,
						answer: back,
					};
				}
			}
		},
		supportedTypes: ["flashcard", "multiple_choice", "cloze"],
		description: "サンプル問題生成器（フロントとバックから問題を生成）",
	});

	// Example: Register a prompt template
	await api.ai.registerPromptTemplate({
		id: "com.fal.examples.ai-extension.summary-template",
		name: "要約プロンプト",
		description: "テキストを要約するためのプロンプトテンプレート",
		template:
			"以下のテキストを{{length}}文字程度で要約してください。\n\n{{content}}",
		variables: [
			{
				name: "content",
				description: "要約するテキスト",
				required: true,
			},
			{
				name: "length",
				description: "要約の長さ（文字数）",
				required: false,
				default: "200",
			},
		],
	});

	// Example: Register another prompt template
	await api.ai.registerPromptTemplate({
		id: "com.fal.examples.ai-extension.explanation-template",
		name: "説明プロンプト",
		description: "トピックについて説明するためのプロンプトテンプレート",
		template:
			"「{{topic}}」について、{{audience}}向けに{{level}}レベルで説明してください。",
		variables: [
			{
				name: "topic",
				description: "説明するトピック",
				required: true,
			},
			{
				name: "audience",
				description: "対象読者",
				required: false,
				default: "一般",
			},
			{
				name: "level",
				description: "説明のレベル",
				required: false,
				default: "初級",
			},
		],
	});

	// Example: Register a content analyzer
	await api.ai.registerContentAnalyzer({
		id: "com.fal.examples.ai-extension.word-count-analyzer",
		name: "単語数アナライザー",
		description: "テキストの単語数と文字数を分析します",
		analyzer: async (content: string): Promise<Record<string, unknown>> => {
			const words = content.split(/\s+/).filter((word) => word.length > 0);
			const characters = content.length;
			const charactersNoSpaces = content.replace(/\s/g, "").length;
			const paragraphs = content
				.split(/\n\n/)
				.filter((p) => p.trim().length > 0);
			const sentences = content
				.split(/[.!?。！？]/)
				.filter((s) => s.trim().length > 0);

			return {
				wordCount: words.length,
				characterCount: characters,
				characterCountNoSpaces: charactersNoSpaces,
				paragraphCount: paragraphs.length,
				sentenceCount: sentences.length,
				averageWordsPerSentence:
					sentences.length > 0 ? words.length / sentences.length : 0,
			};
		},
	});

	// Example: Register another content analyzer
	await api.ai.registerContentAnalyzer({
		id: "com.fal.examples.ai-extension.keyword-analyzer",
		name: "キーワード抽出アナライザー",
		description: "テキストから重要なキーワードを抽出します",
		analyzer: async (content: string): Promise<Record<string, unknown>> => {
			// Simple keyword extraction (in production, use more sophisticated methods)
			const words = content
				.toLowerCase()
				.split(/\s+/)
				.filter((word) => word.length > 3);
			const wordFreq: Record<string, number> = {};

			for (const word of words) {
				wordFreq[word] = (wordFreq[word] || 0) + 1;
			}

			const sortedWords = Object.entries(wordFreq)
				.sort(([, a], [, b]) => b - a)
				.slice(0, 10)
				.map(([word]) => word);

			return {
				keywords: sortedWords,
				topKeyword: sortedWords[0] || null,
				uniqueWordCount: Object.keys(wordFreq).length,
			};
		},
	});

	// Store activation timestamp
	await api.storage.set("lastActivated", new Date().toISOString());

	return {
		methods: {
			/**
			 * Get registered question generator ID
			 */
			async getQuestionGeneratorId(): Promise<string> {
				return "com.fal.examples.ai-extension.sample-generator";
			},
		},

		/**
		 * Cleanup function
		 */
		async dispose() {
			// Unregister all AI extensions
			await api.ai.unregisterQuestionGenerator(
				"com.fal.examples.ai-extension.sample-generator",
			);
			await api.ai.unregisterPromptTemplate(
				"com.fal.examples.ai-extension.summary-template",
			);
			await api.ai.unregisterPromptTemplate(
				"com.fal.examples.ai-extension.explanation-template",
			);
			await api.ai.unregisterContentAnalyzer(
				"com.fal.examples.ai-extension.word-count-analyzer",
			);
			await api.ai.unregisterContentAnalyzer(
				"com.fal.examples.ai-extension.keyword-analyzer",
			);

			api.notifications.info("AI Extension サンプルプラグインが終了しました");
		},
	};
}

// Export the activation function
export default activate;
