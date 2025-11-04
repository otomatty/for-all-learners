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
// AI Extension Registry Class
// ============================================================================

/**
 * AI Extension Registry
 *
 * Singleton registry for managing AI extensions registered by plugins.
 * Thread-safe operations with Map-based storage.
 */
export class AIExtensionRegistry {
	private static instance: AIExtensionRegistry | null = null;

	/** Map of plugin ID to array of question generators */
	private questionGenerators: Map<string, QuestionGeneratorEntry[]>;

	/** Map of plugin ID to array of prompt templates */
	private promptTemplates: Map<string, PromptTemplateEntry[]>;

	/** Map of plugin ID to array of content analyzers */
	private contentAnalyzers: Map<string, ContentAnalyzerEntry[]>;

	/** Map of template key to template entry (for quick lookup) */
	private templateKeyMap: Map<string, PromptTemplateEntry>;

	/**
	 * Private constructor (Singleton pattern)
	 */
	private constructor() {
		this.questionGenerators = new Map();
		this.promptTemplates = new Map();
		this.contentAnalyzers = new Map();
		this.templateKeyMap = new Map();
	}

	/**
	 * Get singleton instance
	 */
	public static getInstance(): AIExtensionRegistry {
		if (!AIExtensionRegistry.instance) {
			AIExtensionRegistry.instance = new AIExtensionRegistry();
		}
		return AIExtensionRegistry.instance;
	}

	/**
	 * Reset registry (for testing)
	 */
	public static reset(): void {
		AIExtensionRegistry.instance = null;
	}

	// ========================================================================
	// Question Generator Registration
	// ========================================================================

	/**
	 * Register a question generator
	 *
	 * @param pluginId Plugin ID registering the generator
	 * @param options Generator options
	 * @throws Error if generator ID already exists for this plugin
	 */
	public registerQuestionGenerator(
		pluginId: string,
		options: QuestionGeneratorOptions,
	): void {
		const pluginGenerators = this.questionGenerators.get(pluginId) ?? [];

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
		this.questionGenerators.set(pluginId, pluginGenerators);

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
	public unregisterQuestionGenerator(
		pluginId: string,
		generatorId?: string,
	): boolean {
		const pluginGenerators = this.questionGenerators.get(pluginId);

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
				this.questionGenerators.delete(pluginId);
			} else {
				this.questionGenerators.set(pluginId, pluginGenerators);
			}

			logger.info({ pluginId, generatorId }, "Question generator unregistered");
			return true;
		}

		// Remove all generators for plugin
		this.questionGenerators.delete(pluginId);
		logger.info(
			{ pluginId, count: pluginGenerators.length },
			"All question generators unregistered for plugin",
		);
		return true;
	}

	// ========================================================================
	// Prompt Template Registration
	// ========================================================================

	/**
	 * Register a prompt template
	 *
	 * @param pluginId Plugin ID registering the template
	 * @param options Template options
	 * @throws Error if template ID already exists for this plugin or key is already used
	 */
	public registerPromptTemplate(
		pluginId: string,
		options: PromptTemplateOptions,
	): void {
		const pluginTemplates = this.promptTemplates.get(pluginId) ?? [];

		// Check if template ID already exists
		const existing = pluginTemplates.find(
			(tpl) => tpl.templateId === options.id,
		);

		if (existing) {
			throw new Error(
				`Prompt template ${options.id} already registered for plugin ${pluginId}`,
			);
		}

		// Check if template key is already used
		if (this.templateKeyMap.has(options.key)) {
			const existingEntry = this.templateKeyMap.get(options.key);
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
		this.promptTemplates.set(pluginId, pluginTemplates);
		this.templateKeyMap.set(options.key, entry);

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
	public unregisterPromptTemplate(
		pluginId: string,
		templateId?: string,
	): boolean {
		const pluginTemplates = this.promptTemplates.get(pluginId);

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
			this.templateKeyMap.delete(entry.key);
			pluginTemplates.splice(index, 1);

			if (pluginTemplates.length === 0) {
				this.promptTemplates.delete(pluginId);
			} else {
				this.promptTemplates.set(pluginId, pluginTemplates);
			}

			logger.info({ pluginId, templateId }, "Prompt template unregistered");
			return true;
		}

		// Remove all templates for plugin
		for (const entry of pluginTemplates) {
			this.templateKeyMap.delete(entry.key);
		}
		this.promptTemplates.delete(pluginId);
		logger.info(
			{ pluginId, count: pluginTemplates.length },
			"All prompt templates unregistered for plugin",
		);
		return true;
	}

	// ========================================================================
	// Content Analyzer Registration
	// ========================================================================

	/**
	 * Register a content analyzer
	 *
	 * @param pluginId Plugin ID registering the analyzer
	 * @param options Analyzer options
	 * @throws Error if analyzer ID already exists for this plugin
	 */
	public registerContentAnalyzer(
		pluginId: string,
		options: ContentAnalyzerOptions,
	): void {
		const pluginAnalyzers = this.contentAnalyzers.get(pluginId) ?? [];

		// Check if analyzer ID already exists
		const existing = pluginAnalyzers.find(
			(ana) => ana.analyzerId === options.id,
		);

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
		this.contentAnalyzers.set(pluginId, pluginAnalyzers);

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
	public unregisterContentAnalyzer(
		pluginId: string,
		analyzerId?: string,
	): boolean {
		const pluginAnalyzers = this.contentAnalyzers.get(pluginId);

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
				this.contentAnalyzers.delete(pluginId);
			} else {
				this.contentAnalyzers.set(pluginId, pluginAnalyzers);
			}

			logger.info({ pluginId, analyzerId }, "Content analyzer unregistered");
			return true;
		}

		// Remove all analyzers for plugin
		this.contentAnalyzers.delete(pluginId);
		logger.info(
			{ pluginId, count: pluginAnalyzers.length },
			"All content analyzers unregistered for plugin",
		);
		return true;
	}

	// ========================================================================
	// Query Operations
	// ========================================================================

	/**
	 * Get question generators
	 *
	 * @param pluginId Plugin ID (optional, if not provided, returns all generators)
	 * @param type Question type filter (optional)
	 * @returns Array of question generator entries
	 */
	public getQuestionGenerators(
		pluginId?: string,
		type?: string,
	): QuestionGeneratorEntry[] {
		let generators: QuestionGeneratorEntry[] = [];

		if (pluginId) {
			generators = this.questionGenerators.get(pluginId) ?? [];
		} else {
			for (const pluginGenerators of this.questionGenerators.values()) {
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
	public getPromptTemplate(key: string): PromptTemplateEntry | undefined {
		return this.templateKeyMap.get(key);
	}

	/**
	 * Get prompt templates
	 *
	 * @param pluginId Plugin ID (optional, if not provided, returns all templates)
	 * @returns Array of prompt template entries
	 */
	public getPromptTemplates(pluginId?: string): PromptTemplateEntry[] {
		if (pluginId) {
			return this.promptTemplates.get(pluginId) ?? [];
		}

		const allTemplates: PromptTemplateEntry[] = [];
		for (const pluginTemplates of this.promptTemplates.values()) {
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
	public getContentAnalyzers(pluginId?: string): ContentAnalyzerEntry[] {
		if (pluginId) {
			return this.contentAnalyzers.get(pluginId) ?? [];
		}

		const allAnalyzers: ContentAnalyzerEntry[] = [];
		for (const pluginAnalyzers of this.contentAnalyzers.values()) {
			allAnalyzers.push(...pluginAnalyzers);
		}
		return allAnalyzers;
	}

	/**
	 * Clear all extensions for a plugin
	 *
	 * @param pluginId Plugin ID
	 */
	public clearPlugin(pluginId: string): void {
		this.unregisterQuestionGenerator(pluginId);
		this.unregisterPromptTemplate(pluginId);
		this.unregisterContentAnalyzer(pluginId);
	}

	/**
	 * Clear all extensions
	 *
	 * @warning This will remove all registered extensions!
	 */
	public clear(): void {
		const generatorCount = Array.from(this.questionGenerators.values()).reduce(
			(sum, gens) => sum + gens.length,
			0,
		);
		const templateCount = Array.from(this.promptTemplates.values()).reduce(
			(sum, tpls) => sum + tpls.length,
			0,
		);
		const analyzerCount = Array.from(this.contentAnalyzers.values()).reduce(
			(sum, anas) => sum + anas.length,
			0,
		);

		this.questionGenerators.clear();
		this.promptTemplates.clear();
		this.contentAnalyzers.clear();
		this.templateKeyMap.clear();

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
	public getStats(): {
		totalPlugins: number;
		totalGenerators: number;
		totalTemplates: number;
		totalAnalyzers: number;
	} {
		return {
			totalPlugins: new Set([
				...this.questionGenerators.keys(),
				...this.promptTemplates.keys(),
				...this.contentAnalyzers.keys(),
			]).size,
			totalGenerators: Array.from(this.questionGenerators.values()).reduce(
				(sum, gens) => sum + gens.length,
				0,
			),
			totalTemplates: Array.from(this.promptTemplates.values()).reduce(
				(sum, tpls) => sum + tpls.length,
				0,
			),
			totalAnalyzers: Array.from(this.contentAnalyzers.values()).reduce(
				(sum, anas) => sum + anas.length,
				0,
			),
		};
	}
}

// ============================================================================
// Singleton Export
// ============================================================================

/**
 * Get AI extension registry instance
 */
export function getAIExtensionRegistry(): AIExtensionRegistry {
	return AIExtensionRegistry.getInstance();
}
