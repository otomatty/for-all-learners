/**
 * AI Extension Registry
 *
 * Manages AI extensions registered by plugins.
 * Provides registration, unregistration, and query capabilities for AI extensions.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   ├─ lib/plugins/plugin-api.ts
 *   └─ lib/plugins/ai-manager.ts (future)
 *
 * Dependencies:
 *   ├─ lib/plugins/types.ts (AI extension types)
 *   └─ lib/logger
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/phase2-extension-points.md
 */

import logger from "@/lib/logger";
import type {
	ContentAnalyzerOptions,
	PromptTemplateOptions,
	QuestionGeneratorOptions,
} from "./types";

// ============================================================================
// AI Extension Entry Types
// ============================================================================

/**
 * Question generator entry
 */
export interface QuestionGeneratorEntry {
	pluginId: string;
	generatorId: string;
	generator: QuestionGeneratorOptions["generator"];
	supportedTypes: QuestionGeneratorOptions["supportedTypes"];
	description?: string;
}

/**
 * Prompt template entry
 */
export interface PromptTemplateEntry {
	pluginId: string;
	templateId: string;
	key: string;
	template: string;
	variables?: PromptTemplateOptions["variables"];
	description?: string;
}

/**
 * Content analyzer entry
 */
export interface ContentAnalyzerEntry {
	pluginId: string;
	analyzerId: string;
	analyzer: ContentAnalyzerOptions["analyzer"];
	description?: string;
	options?: ContentAnalyzerOptions["options"];
}

// ============================================================================
// State (Private)
// ============================================================================

/** Map of plugin ID to array of question generators */
const questionGenerators = new Map<string, QuestionGeneratorEntry[]>();

/** Map of plugin ID to array of prompt templates */
const promptTemplates = new Map<string, PromptTemplateEntry[]>();

/** Map of plugin ID to array of content analyzers */
const contentAnalyzers = new Map<string, ContentAnalyzerEntry[]>();

/** Map of template key to template entry (for quick lookup) */
const templateKeyMap = new Map<string, PromptTemplateEntry>();

// ============================================================================
// Question Generator Registration
// ============================================================================

/**
 * Register a question generator
 *
 * @param pluginId Plugin ID registering the generator
 * @param options Generator options
 * @throws Error if generator ID already exists for this plugin
 */
export function registerQuestionGenerator(
	pluginId: string,
	options: QuestionGeneratorOptions,
): void {
	const pluginGenerators = questionGenerators.get(pluginId) ?? [];

	// Check if generator ID already exists
	const existing = pluginGenerators.find(
		(gen) => gen.generatorId === options.id,
	);

	if (existing) {
		throw new Error(
			`Question generator ${options.id} already registered for plugin ${pluginId}`,
		);
	}

	const entry: QuestionGeneratorEntry = {
		pluginId,
		generatorId: options.id,
		generator: options.generator,
		supportedTypes: options.supportedTypes,
		description: options.description,
	};

	pluginGenerators.push(entry);
	questionGenerators.set(pluginId, pluginGenerators);

	logger.info(
		{
			pluginId,
			generatorId: options.id,
			supportedTypes: options.supportedTypes,
		},
		"Question generator registered",
	);
}

/**
 * Unregister a question generator
 *
 * @param pluginId Plugin ID
 * @param generatorId Generator ID (optional, if not provided, all generators for plugin are removed)
 * @returns True if generator was unregistered, false if not found
 */
export function unregisterQuestionGenerator(
	pluginId: string,
	generatorId?: string,
): boolean {
	const pluginGenerators = questionGenerators.get(pluginId);

	if (!pluginGenerators) {
		logger.warn({ pluginId }, "No question generators found for plugin");
		return false;
	}

	if (generatorId) {
		const index = pluginGenerators.findIndex(
			(gen) => gen.generatorId === generatorId,
		);

		if (index === -1) {
			logger.warn(
				{ pluginId, generatorId },
				"Question generator not found for unregistration",
			);
			return false;
		}

		pluginGenerators.splice(index, 1);

		if (pluginGenerators.length === 0) {
			questionGenerators.delete(pluginId);
		} else {
			questionGenerators.set(pluginId, pluginGenerators);
		}

		logger.info({ pluginId, generatorId }, "Question generator unregistered");
		return true;
	}

	// Remove all generators for plugin
	questionGenerators.delete(pluginId);
	logger.info(
		{ pluginId, count: pluginGenerators.length },
		"All question generators unregistered for plugin",
	);
	return true;
}

// ============================================================================
// Prompt Template Registration
// ============================================================================

/**
 * Register a prompt template
 *
 * @param pluginId Plugin ID registering the template
 * @param options Template options
 * @throws Error if template ID already exists for this plugin or key is already used
 */
export function registerPromptTemplate(
	pluginId: string,
	options: PromptTemplateOptions,
): void {
	const pluginTemplates = promptTemplates.get(pluginId) ?? [];

	// Check if template ID already exists
	const existing = pluginTemplates.find((tpl) => tpl.templateId === options.id);

	if (existing) {
		throw new Error(
			`Prompt template ${options.id} already registered for plugin ${pluginId}`,
		);
	}

	// Check if template key is already used
	if (templateKeyMap.has(options.key)) {
		const existingEntry = templateKeyMap.get(options.key);
		throw new Error(
			`Prompt template key "${options.key}" is already used by plugin ${existingEntry?.pluginId}`,
		);
	}

	const entry: PromptTemplateEntry = {
		pluginId,
		templateId: options.id,
		key: options.key,
		template: options.template,
		variables: options.variables,
		description: options.description,
	};

	pluginTemplates.push(entry);
	promptTemplates.set(pluginId, pluginTemplates);
	templateKeyMap.set(options.key, entry);

	logger.info(
		{
			pluginId,
			templateId: options.id,
			key: options.key,
		},
		"Prompt template registered",
	);
}

/**
 * Unregister a prompt template
 *
 * @param pluginId Plugin ID
 * @param templateId Template ID (optional, if not provided, all templates for plugin are removed)
 * @returns True if template was unregistered, false if not found
 */
export function unregisterPromptTemplate(
	pluginId: string,
	templateId?: string,
): boolean {
	const pluginTemplates = promptTemplates.get(pluginId);

	if (!pluginTemplates) {
		logger.warn({ pluginId }, "No prompt templates found for plugin");
		return false;
	}

	if (templateId) {
		const index = pluginTemplates.findIndex(
			(tpl) => tpl.templateId === templateId,
		);

		if (index === -1) {
			logger.warn(
				{ pluginId, templateId },
				"Prompt template not found for unregistration",
			);
			return false;
		}

		const entry = pluginTemplates[index];
		templateKeyMap.delete(entry.key);
		pluginTemplates.splice(index, 1);

		if (pluginTemplates.length === 0) {
			promptTemplates.delete(pluginId);
		} else {
			promptTemplates.set(pluginId, pluginTemplates);
		}

		logger.info({ pluginId, templateId }, "Prompt template unregistered");
		return true;
	}

	// Remove all templates for plugin
	for (const entry of pluginTemplates) {
		templateKeyMap.delete(entry.key);
	}
	promptTemplates.delete(pluginId);
	logger.info(
		{ pluginId, count: pluginTemplates.length },
		"All prompt templates unregistered for plugin",
	);
	return true;
}

// ============================================================================
// Content Analyzer Registration
// ============================================================================

/**
 * Register a content analyzer
 *
 * @param pluginId Plugin ID registering the analyzer
 * @param options Analyzer options
 * @throws Error if analyzer ID already exists for this plugin
 */
export function registerContentAnalyzer(
	pluginId: string,
	options: ContentAnalyzerOptions,
): void {
	const pluginAnalyzers = contentAnalyzers.get(pluginId) ?? [];

	// Check if analyzer ID already exists
	const existing = pluginAnalyzers.find((ana) => ana.analyzerId === options.id);

	if (existing) {
		throw new Error(
			`Content analyzer ${options.id} already registered for plugin ${pluginId}`,
		);
	}

	const entry: ContentAnalyzerEntry = {
		pluginId,
		analyzerId: options.id,
		analyzer: options.analyzer,
		description: options.description,
		options: options.options,
	};

	pluginAnalyzers.push(entry);
	contentAnalyzers.set(pluginId, pluginAnalyzers);

	logger.info(
		{ pluginId, analyzerId: options.id },
		"Content analyzer registered",
	);
}

/**
 * Unregister a content analyzer
 *
 * @param pluginId Plugin ID
 * @param analyzerId Analyzer ID (optional, if not provided, all analyzers for plugin are removed)
 * @returns True if analyzer was unregistered, false if not found
 */
export function unregisterContentAnalyzer(
	pluginId: string,
	analyzerId?: string,
): boolean {
	const pluginAnalyzers = contentAnalyzers.get(pluginId);

	if (!pluginAnalyzers) {
		logger.warn({ pluginId }, "No content analyzers found for plugin");
		return false;
	}

	if (analyzerId) {
		const index = pluginAnalyzers.findIndex(
			(ana) => ana.analyzerId === analyzerId,
		);

		if (index === -1) {
			logger.warn(
				{ pluginId, analyzerId },
				"Content analyzer not found for unregistration",
			);
			return false;
		}

		pluginAnalyzers.splice(index, 1);

		if (pluginAnalyzers.length === 0) {
			contentAnalyzers.delete(pluginId);
		} else {
			contentAnalyzers.set(pluginId, pluginAnalyzers);
		}

		logger.info({ pluginId, analyzerId }, "Content analyzer unregistered");
		return true;
	}

	// Remove all analyzers for plugin
	contentAnalyzers.delete(pluginId);
	logger.info(
		{ pluginId, count: pluginAnalyzers.length },
		"All content analyzers unregistered for plugin",
	);
	return true;
}

// ============================================================================
// Query Operations
// ============================================================================

/**
 * Get question generators
 *
 * @param pluginId Plugin ID (optional, if not provided, returns all generators)
 * @param type Question type filter (optional)
 * @returns Array of question generator entries
 */
export function getQuestionGenerators(
	pluginId?: string,
	type?: string,
): QuestionGeneratorEntry[] {
	let generators: QuestionGeneratorEntry[] = [];

	if (pluginId) {
		generators = questionGenerators.get(pluginId) ?? [];
	} else {
		for (const pluginGenerators of questionGenerators.values()) {
			generators.push(...pluginGenerators);
		}
	}

	// Filter by type if provided
	if (type) {
		generators = generators.filter((gen) =>
			gen.supportedTypes.includes(type as never),
		);
	}

	return generators;
}

/**
 * Get prompt template by key
 *
 * @param key Template key
 * @returns Template entry or undefined if not found
 */
export function getPromptTemplate(
	key: string,
): PromptTemplateEntry | undefined {
	return templateKeyMap.get(key);
}

/**
 * Get prompt templates
 *
 * @param pluginId Plugin ID (optional, if not provided, returns all templates)
 * @returns Array of prompt template entries
 */
export function getPromptTemplates(pluginId?: string): PromptTemplateEntry[] {
	if (pluginId) {
		return promptTemplates.get(pluginId) ?? [];
	}

	const allTemplates: PromptTemplateEntry[] = [];
	for (const pluginTemplates of promptTemplates.values()) {
		allTemplates.push(...pluginTemplates);
	}
	return allTemplates;
}

/**
 * Get content analyzers
 *
 * @param pluginId Plugin ID (optional, if not provided, returns all analyzers)
 * @returns Array of content analyzer entries
 */
export function getContentAnalyzers(pluginId?: string): ContentAnalyzerEntry[] {
	if (pluginId) {
		return contentAnalyzers.get(pluginId) ?? [];
	}

	const allAnalyzers: ContentAnalyzerEntry[] = [];
	for (const pluginAnalyzers of contentAnalyzers.values()) {
		allAnalyzers.push(...pluginAnalyzers);
	}
	return allAnalyzers;
}

/**
 * Clear all extensions for a plugin
 *
 * @param pluginId Plugin ID
 */
export function clearPlugin(pluginId: string): void {
	unregisterQuestionGenerator(pluginId);
	unregisterPromptTemplate(pluginId);
	unregisterContentAnalyzer(pluginId);
}

/**
 * Clear all extensions
 *
 * @warning This will remove all registered extensions!
 */
export function clear(): void {
	const generatorCount = Array.from(questionGenerators.values()).reduce(
		(sum, gens) => sum + gens.length,
		0,
	);
	const templateCount = Array.from(promptTemplates.values()).reduce(
		(sum, tpls) => sum + tpls.length,
		0,
	);
	const analyzerCount = Array.from(contentAnalyzers.values()).reduce(
		(sum, anas) => sum + anas.length,
		0,
	);

	questionGenerators.clear();
	promptTemplates.clear();
	contentAnalyzers.clear();
	templateKeyMap.clear();

	logger.info(
		{
			clearedGenerators: generatorCount,
			clearedTemplates: templateCount,
			clearedAnalyzers: analyzerCount,
		},
		"All AI extensions cleared",
	);
}

/**
 * Get statistics
 *
 * @returns Statistics about registered extensions
 */
export function getStats(): {
	totalPlugins: number;
	totalGenerators: number;
	totalTemplates: number;
	totalAnalyzers: number;
} {
	return {
		totalPlugins: new Set([
			...questionGenerators.keys(),
			...promptTemplates.keys(),
			...contentAnalyzers.keys(),
		]).size,
		totalGenerators: Array.from(questionGenerators.values()).reduce(
			(sum, gens) => sum + gens.length,
			0,
		),
		totalTemplates: Array.from(promptTemplates.values()).reduce(
			(sum, tpls) => sum + tpls.length,
			0,
		),
		totalAnalyzers: Array.from(contentAnalyzers.values()).reduce(
			(sum, anas) => sum + anas.length,
			0,
		),
	};
}

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Reset registry (for testing)
 */
export function reset(): void {
	questionGenerators.clear();
	promptTemplates.clear();
	contentAnalyzers.clear();
	templateKeyMap.clear();
}
