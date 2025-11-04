/**
 * AI Extension Registry Tests
 *
 * Unit tests for the AIExtensionRegistry class.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AIExtensionRegistry } from "../ai-registry";
import type {
	ContentAnalyzerOptions,
	PromptTemplateOptions,
	QuestionGeneratorOptions,
} from "../types";

describe("AIExtensionRegistry", () => {
	let registry: AIExtensionRegistry;

	const createMockQuestionGenerator = (
		id: string,
		supportedTypes: Array<"flashcard" | "multiple_choice" | "cloze"> = [
			"flashcard",
		],
	): QuestionGeneratorOptions => ({
		id,
		generator: async (
			_front: string,
			_back: string,
			type: "flashcard" | "multiple_choice" | "cloze",
		) => ({
			type,
			question: `Question from ${id}`,
			answer: `Answer from ${id}`,
		}),
		supportedTypes,
		description: `Test generator ${id}`,
	});

	const createMockPromptTemplate = (
		id: string,
		key: string,
	): PromptTemplateOptions => ({
		id,
		key,
		template: "Template {{variable1}} and {{variable2}}",
		variables: [
			{ name: "variable1", description: "First variable", required: true },
			{
				name: "variable2",
				description: "Second variable",
				required: false,
				default: "default",
			},
		],
		description: `Test template ${id}`,
	});

	const createMockContentAnalyzer = (id: string): ContentAnalyzerOptions => ({
		id,
		analyzer: async (_content, _optionss) => ({
			keywords: ["test", "keywords"],
			summary: `Summary from ${id}`,
			confidence: 0.9,
		}),
		description: `Test analyzer ${id}`,
		options: [
			{
				name: "option1",
				type: "string",
				description: "Test option",
				default: "default",
			},
		],
	});

	beforeEach(() => {
		registry = AIExtensionRegistry.getInstance();
	});

	afterEach(() => {
		registry.clear();
		AIExtensionRegistry.reset();
	});

	describe("Singleton Pattern", () => {
		it("should return the same instance", () => {
			const instance1 = AIExtensionRegistry.getInstance();
			const instance2 = AIExtensionRegistry.getInstance();

			expect(instance1).toBe(instance2);
		});

		it("should reset instance correctly", () => {
			const instance1 = AIExtensionRegistry.getInstance();
			AIExtensionRegistry.reset();
			const instance2 = AIExtensionRegistry.getInstance();

			expect(instance1).not.toBe(instance2);
		});
	});

	describe("Question Generator Registration", () => {
		it("should register a question generator", () => {
			const options = createMockQuestionGenerator("gen-1");

			registry.registerQuestionGenerator("plugin-1", options);

			const generators = registry.getQuestionGenerators("plugin-1");
			expect(generators).toHaveLength(1);
			expect(generators[0].generatorId).toBe("gen-1");
			expect(generators[0].pluginId).toBe("plugin-1");
			expect(generators[0].supportedTypes).toEqual(["flashcard"]);
		});

		it("should throw error when registering duplicate generator ID", () => {
			const options = createMockQuestionGenerator("gen-1");

			registry.registerQuestionGenerator("plugin-1", options);

			expect(() =>
				registry.registerQuestionGenerator("plugin-1", options),
			).toThrow(
				"Question generator gen-1 already registered for plugin plugin-1",
			);
		});

		it("should allow same generator ID for different plugins", () => {
			const options = createMockQuestionGenerator("gen-1");

			registry.registerQuestionGenerator("plugin-1", options);
			registry.registerQuestionGenerator("plugin-2", options);

			expect(registry.getQuestionGenerators("plugin-1")).toHaveLength(1);
			expect(registry.getQuestionGenerators("plugin-2")).toHaveLength(1);
		});

		it("should register multiple generators for same plugin", () => {
			const gen1 = createMockQuestionGenerator("gen-1");
			const gen2 = createMockQuestionGenerator("gen-2", ["multiple_choice"]);

			registry.registerQuestionGenerator("plugin-1", gen1);
			registry.registerQuestionGenerator("plugin-1", gen2);

			expect(registry.getQuestionGenerators("plugin-1")).toHaveLength(2);
		});

		it("should filter generators by question type", () => {
			const gen1 = createMockQuestionGenerator("gen-1", ["flashcard"]);
			const gen2 = createMockQuestionGenerator("gen-2", ["multiple_choice"]);

			registry.registerQuestionGenerator("plugin-1", gen1);
			registry.registerQuestionGenerator("plugin-1", gen2);

			const flashcardGens = registry.getQuestionGenerators(
				"plugin-1",
				"flashcard",
			);
			expect(flashcardGens).toHaveLength(1);
			expect(flashcardGens[0].generatorId).toBe("gen-1");

			const mcGens = registry.getQuestionGenerators(
				"plugin-1",
				"multiple_choice",
			);
			expect(mcGens).toHaveLength(1);
			expect(mcGens[0].generatorId).toBe("gen-2");
		});

		it("should unregister a specific generator", () => {
			const gen1 = createMockQuestionGenerator("gen-1");
			const gen2 = createMockQuestionGenerator("gen-2");

			registry.registerQuestionGenerator("plugin-1", gen1);
			registry.registerQuestionGenerator("plugin-1", gen2);

			const result = registry.unregisterQuestionGenerator("plugin-1", "gen-1");

			expect(result).toBe(true);
			const generators = registry.getQuestionGenerators("plugin-1");
			expect(generators).toHaveLength(1);
			expect(generators[0].generatorId).toBe("gen-2");
		});

		it("should unregister all generators for a plugin", () => {
			const gen1 = createMockQuestionGenerator("gen-1");
			const gen2 = createMockQuestionGenerator("gen-2");

			registry.registerQuestionGenerator("plugin-1", gen1);
			registry.registerQuestionGenerator("plugin-1", gen2);

			const result = registry.unregisterQuestionGenerator("plugin-1");

			expect(result).toBe(true);
			expect(registry.getQuestionGenerators("plugin-1")).toHaveLength(0);
		});

		it("should return false when unregistering non-existent generator", () => {
			const result = registry.unregisterQuestionGenerator(
				"plugin-1",
				"non-existent",
			);

			expect(result).toBe(false);
		});
	});

	describe("Prompt Template Registration", () => {
		it("should register a prompt template", () => {
			const options = createMockPromptTemplate("tpl-1", "template-key-1");

			registry.registerPromptTemplate("plugin-1", options);

			const templates = registry.getPromptTemplates("plugin-1");
			expect(templates).toHaveLength(1);
			expect(templates[0].templateId).toBe("tpl-1");
			expect(templates[0].key).toBe("template-key-1");
			expect(templates[0].pluginId).toBe("plugin-1");
		});

		it("should throw error when registering duplicate template ID", () => {
			const options = createMockPromptTemplate("tpl-1", "template-key-1");

			registry.registerPromptTemplate("plugin-1", options);

			expect(() =>
				registry.registerPromptTemplate("plugin-1", options),
			).toThrow("Prompt template tpl-1 already registered for plugin plugin-1");
		});

		it("should throw error when template key is already used", () => {
			const tpl1 = createMockPromptTemplate("tpl-1", "shared-key");
			const tpl2 = createMockPromptTemplate("tpl-2", "shared-key");

			registry.registerPromptTemplate("plugin-1", tpl1);

			expect(() => registry.registerPromptTemplate("plugin-2", tpl2)).toThrow(
				'Prompt template key "shared-key" is already used by plugin plugin-1',
			);
		});

		it("should retrieve template by key", () => {
			const options = createMockPromptTemplate("tpl-1", "template-key-1");

			registry.registerPromptTemplate("plugin-1", options);

			const template = registry.getPromptTemplate("template-key-1");
			expect(template).toBeDefined();
			expect(template?.templateId).toBe("tpl-1");
			expect(template?.key).toBe("template-key-1");
		});

		it("should return undefined for non-existent template key", () => {
			const template = registry.getPromptTemplate("non-existent");

			expect(template).toBeUndefined();
		});

		it("should unregister a specific template", () => {
			const tpl1 = createMockPromptTemplate("tpl-1", "key-1");
			const tpl2 = createMockPromptTemplate("tpl-2", "key-2");

			registry.registerPromptTemplate("plugin-1", tpl1);
			registry.registerPromptTemplate("plugin-1", tpl2);

			const result = registry.unregisterPromptTemplate("plugin-1", "tpl-1");

			expect(result).toBe(true);
			expect(registry.getPromptTemplate("key-1")).toBeUndefined();
			expect(registry.getPromptTemplate("key-2")).toBeDefined();
		});

		it("should unregister all templates for a plugin", () => {
			const tpl1 = createMockPromptTemplate("tpl-1", "key-1");
			const tpl2 = createMockPromptTemplate("tpl-2", "key-2");

			registry.registerPromptTemplate("plugin-1", tpl1);
			registry.registerPromptTemplate("plugin-1", tpl2);

			const result = registry.unregisterPromptTemplate("plugin-1");

			expect(result).toBe(true);
			expect(registry.getPromptTemplates("plugin-1")).toHaveLength(0);
			expect(registry.getPromptTemplate("key-1")).toBeUndefined();
			expect(registry.getPromptTemplate("key-2")).toBeUndefined();
		});
	});

	describe("Content Analyzer Registration", () => {
		it("should register a content analyzer", () => {
			const options = createMockContentAnalyzer("analyzer-1");

			registry.registerContentAnalyzer("plugin-1", options);

			const analyzers = registry.getContentAnalyzers("plugin-1");
			expect(analyzers).toHaveLength(1);
			expect(analyzers[0].analyzerId).toBe("analyzer-1");
			expect(analyzers[0].pluginId).toBe("plugin-1");
		});

		it("should throw error when registering duplicate analyzer ID", () => {
			const options = createMockContentAnalyzer("analyzer-1");

			registry.registerContentAnalyzer("plugin-1", options);

			expect(() =>
				registry.registerContentAnalyzer("plugin-1", options),
			).toThrow(
				"Content analyzer analyzer-1 already registered for plugin plugin-1",
			);
		});

		it("should allow same analyzer ID for different plugins", () => {
			const options = createMockContentAnalyzer("analyzer-1");

			registry.registerContentAnalyzer("plugin-1", options);
			registry.registerContentAnalyzer("plugin-2", options);

			expect(registry.getContentAnalyzers("plugin-1")).toHaveLength(1);
			expect(registry.getContentAnalyzers("plugin-2")).toHaveLength(1);
		});

		it("should unregister a specific analyzer", () => {
			const ana1 = createMockContentAnalyzer("analyzer-1");
			const ana2 = createMockContentAnalyzer("analyzer-2");

			registry.registerContentAnalyzer("plugin-1", ana1);
			registry.registerContentAnalyzer("plugin-1", ana2);

			const result = registry.unregisterContentAnalyzer(
				"plugin-1",
				"analyzer-1",
			);

			expect(result).toBe(true);
			const analyzers = registry.getContentAnalyzers("plugin-1");
			expect(analyzers).toHaveLength(1);
			expect(analyzers[0].analyzerId).toBe("analyzer-2");
		});

		it("should unregister all analyzers for a plugin", () => {
			const ana1 = createMockContentAnalyzer("analyzer-1");
			const ana2 = createMockContentAnalyzer("analyzer-2");

			registry.registerContentAnalyzer("plugin-1", ana1);
			registry.registerContentAnalyzer("plugin-1", ana2);

			const result = registry.unregisterContentAnalyzer("plugin-1");

			expect(result).toBe(true);
			expect(registry.getContentAnalyzers("plugin-1")).toHaveLength(0);
		});
	});

	describe("Plugin Clearing", () => {
		it("should clear all extensions for a plugin", () => {
			const gen = createMockQuestionGenerator("gen-1");
			const tpl = createMockPromptTemplate("tpl-1", "key-1");
			const ana = createMockContentAnalyzer("analyzer-1");

			registry.registerQuestionGenerator("plugin-1", gen);
			registry.registerPromptTemplate("plugin-1", tpl);
			registry.registerContentAnalyzer("plugin-1", ana);

			registry.clearPlugin("plugin-1");

			expect(registry.getQuestionGenerators("plugin-1")).toHaveLength(0);
			expect(registry.getPromptTemplates("plugin-1")).toHaveLength(0);
			expect(registry.getContentAnalyzers("plugin-1")).toHaveLength(0);
			expect(registry.getPromptTemplate("key-1")).toBeUndefined();
		});

		it("should clear all extensions for all plugins", () => {
			const gen1 = createMockQuestionGenerator("gen-1");
			const gen2 = createMockQuestionGenerator("gen-2");
			const tpl1 = createMockPromptTemplate("tpl-1", "key-1");
			const tpl2 = createMockPromptTemplate("tpl-2", "key-2");

			registry.registerQuestionGenerator("plugin-1", gen1);
			registry.registerQuestionGenerator("plugin-2", gen2);
			registry.registerPromptTemplate("plugin-1", tpl1);
			registry.registerPromptTemplate("plugin-2", tpl2);

			registry.clear();

			expect(registry.getQuestionGenerators()).toHaveLength(0);
			expect(registry.getPromptTemplates()).toHaveLength(0);
			expect(registry.getContentAnalyzers()).toHaveLength(0);
		});
	});

	describe("Statistics", () => {
		it("should return correct statistics", () => {
			const gen1 = createMockQuestionGenerator("gen-1");
			const gen2 = createMockQuestionGenerator("gen-2");
			const tpl1 = createMockPromptTemplate("tpl-1", "key-1");
			const tpl2 = createMockPromptTemplate("tpl-2", "key-2");
			const ana1 = createMockContentAnalyzer("analyzer-1");

			registry.registerQuestionGenerator("plugin-1", gen1);
			registry.registerQuestionGenerator("plugin-2", gen2);
			registry.registerPromptTemplate("plugin-1", tpl1);
			registry.registerPromptTemplate("plugin-2", tpl2);
			registry.registerContentAnalyzer("plugin-1", ana1);

			const stats = registry.getStats();

			expect(stats.totalPlugins).toBe(2);
			expect(stats.totalGenerators).toBe(2);
			expect(stats.totalTemplates).toBe(2);
			expect(stats.totalAnalyzers).toBe(1);
		});

		it("should return zero statistics for empty registry", () => {
			const stats = registry.getStats();

			expect(stats.totalPlugins).toBe(0);
			expect(stats.totalGenerators).toBe(0);
			expect(stats.totalTemplates).toBe(0);
			expect(stats.totalAnalyzers).toBe(0);
		});
	});

	describe("Query Operations", () => {
		it("should get all generators when pluginId is not provided", () => {
			const gen1 = createMockQuestionGenerator("gen-1");
			const gen2 = createMockQuestionGenerator("gen-2");

			registry.registerQuestionGenerator("plugin-1", gen1);
			registry.registerQuestionGenerator("plugin-2", gen2);

			const allGenerators = registry.getQuestionGenerators();

			expect(allGenerators).toHaveLength(2);
		});

		it("should get all templates when pluginId is not provided", () => {
			const tpl1 = createMockPromptTemplate("tpl-1", "key-1");
			const tpl2 = createMockPromptTemplate("tpl-2", "key-2");

			registry.registerPromptTemplate("plugin-1", tpl1);
			registry.registerPromptTemplate("plugin-2", tpl2);

			const allTemplates = registry.getPromptTemplates();

			expect(allTemplates).toHaveLength(2);
		});

		it("should get all analyzers when pluginId is not provided", () => {
			const ana1 = createMockContentAnalyzer("analyzer-1");
			const ana2 = createMockContentAnalyzer("analyzer-2");

			registry.registerContentAnalyzer("plugin-1", ana1);
			registry.registerContentAnalyzer("plugin-2", ana2);

			const allAnalyzers = registry.getContentAnalyzers();

			expect(allAnalyzers).toHaveLength(2);
		});
	});
});
