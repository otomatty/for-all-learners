/**
 * Data Processor Extension Registry
 *
 * Manages data processor extensions registered by plugins.
 * Provides registration, unregistration, and query capabilities for data processor extensions.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   ├─ lib/plugins/plugin-api.ts
 *   └─ lib/plugins/data-processor-manager.ts (future)
 *
 * Dependencies:
 *   ├─ lib/plugins/types.ts (Data processor extension types)
 *   └─ lib/logger
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/phase2-extension-points.md
 */

import logger from "@/lib/logger";
import type {
	ExporterOptions,
	ImporterOptions,
	TransformerOptions,
} from "./types";

// ============================================================================
// Data Processor Extension Entry Types
// ============================================================================

/**
 * Importer entry
 */
export interface ImporterEntry {
	pluginId: string;
	importerId: string;
	name: string;
	description?: string;
	supportedFormats: ImporterOptions["supportedFormats"];
	fileExtensions?: string[];
	mimeTypes?: string[];
	importer: ImporterOptions["importer"];
	options?: ImporterOptions["options"];
}

/**
 * Exporter entry
 */
export interface ExporterEntry {
	pluginId: string;
	exporterId: string;
	name: string;
	description?: string;
	supportedFormats: ExporterOptions["supportedFormats"];
	defaultExtension?: string;
	defaultMimeType?: string;
	exporter: ExporterOptions["exporter"];
	options?: ExporterOptions["options"];
}

/**
 * Transformer entry
 */
export interface TransformerEntry {
	pluginId: string;
	transformerId: string;
	name: string;
	description?: string;
	sourceFormats: TransformerOptions["sourceFormats"];
	targetFormats: TransformerOptions["targetFormats"];
	transformer: TransformerOptions["transformer"];
	options?: TransformerOptions["options"];
}

// ============================================================================
// Data Processor Extension Registry Class
// ============================================================================

/**
 * Data Processor Extension Registry
 *
 * Singleton registry for managing data processor extensions registered by plugins.
 * Thread-safe operations with Map-based storage.
 */
export class DataProcessorExtensionRegistry {
	private static instance: DataProcessorExtensionRegistry | null = null;

	/** Map of plugin ID to array of importers */
	private importers: Map<string, ImporterEntry[]>;

	/** Map of plugin ID to array of exporters */
	private exporters: Map<string, ExporterEntry[]>;

	/** Map of plugin ID to array of transformers */
	private transformers: Map<string, TransformerEntry[]>;

	/**
	 * Private constructor (Singleton pattern)
	 */
	private constructor() {
		this.importers = new Map();
		this.exporters = new Map();
		this.transformers = new Map();
	}

	/**
	 * Get singleton instance
	 */
	public static getInstance(): DataProcessorExtensionRegistry {
		if (!DataProcessorExtensionRegistry.instance) {
			DataProcessorExtensionRegistry.instance =
				new DataProcessorExtensionRegistry();
		}
		return DataProcessorExtensionRegistry.instance;
	}

	/**
	 * Reset registry (for testing)
	 */
	public static reset(): void {
		DataProcessorExtensionRegistry.instance = null;
	}

	// ========================================================================
	// Importer Registration
	// ========================================================================

	/**
	 * Register an importer
	 *
	 * @param pluginId Plugin ID registering the importer
	 * @param options Importer options
	 * @throws Error if importer ID already exists for this plugin
	 */
	public registerImporter(pluginId: string, options: ImporterOptions): void {
		const pluginImporters = this.importers.get(pluginId) ?? [];

		// Check if importer ID already exists
		const existing = pluginImporters.find(
			(imp) => imp.importerId === options.id,
		);

		if (existing) {
			throw new Error(
				`Importer ${options.id} already registered for plugin ${pluginId}`,
			);
		}

		const entry: ImporterEntry = {
			pluginId,
			importerId: options.id,
			name: options.name,
			description: options.description,
			supportedFormats: options.supportedFormats,
			fileExtensions: options.fileExtensions,
			mimeTypes: options.mimeTypes,
			importer: options.importer,
			options: options.options,
		};

		pluginImporters.push(entry);
		this.importers.set(pluginId, pluginImporters);

		logger.info(
			{
				pluginId,
				importerId: options.id,
				name: options.name,
				supportedFormats: options.supportedFormats,
			},
			"Importer registered",
		);
	}

	/**
	 * Unregister an importer
	 *
	 * @param pluginId Plugin ID
	 * @param importerId Importer ID (optional, if not provided, all importers for plugin are removed)
	 * @returns True if importer was unregistered, false if not found
	 */
	public unregisterImporter(pluginId: string, importerId?: string): boolean {
		const pluginImporters = this.importers.get(pluginId);

		if (!pluginImporters) {
			logger.warn({ pluginId }, "No importers found for plugin");
			return false;
		}

		if (importerId) {
			const index = pluginImporters.findIndex(
				(imp) => imp.importerId === importerId,
			);

			if (index === -1) {
				logger.warn(
					{ pluginId, importerId },
					"Importer not found for unregistration",
				);
				return false;
			}

			pluginImporters.splice(index, 1);

			if (pluginImporters.length === 0) {
				this.importers.delete(pluginId);
			} else {
				this.importers.set(pluginId, pluginImporters);
			}

			logger.info({ pluginId, importerId }, "Importer unregistered");
			return true;
		}

		// Remove all importers for plugin
		this.importers.delete(pluginId);
		logger.info(
			{ pluginId, count: pluginImporters.length },
			"All importers unregistered for plugin",
		);
		return true;
	}

	// ========================================================================
	// Exporter Registration
	// ========================================================================

	/**
	 * Register an exporter
	 *
	 * @param pluginId Plugin ID registering the exporter
	 * @param options Exporter options
	 * @throws Error if exporter ID already exists for this plugin
	 */
	public registerExporter(pluginId: string, options: ExporterOptions): void {
		const pluginExporters = this.exporters.get(pluginId) ?? [];

		// Check if exporter ID already exists
		const existing = pluginExporters.find(
			(exp) => exp.exporterId === options.id,
		);

		if (existing) {
			throw new Error(
				`Exporter ${options.id} already registered for plugin ${pluginId}`,
			);
		}

		const entry: ExporterEntry = {
			pluginId,
			exporterId: options.id,
			name: options.name,
			description: options.description,
			supportedFormats: options.supportedFormats,
			defaultExtension: options.defaultExtension,
			defaultMimeType: options.defaultMimeType,
			exporter: options.exporter,
			options: options.options,
		};

		pluginExporters.push(entry);
		this.exporters.set(pluginId, pluginExporters);

		logger.info(
			{
				pluginId,
				exporterId: options.id,
				name: options.name,
				supportedFormats: options.supportedFormats,
			},
			"Exporter registered",
		);
	}

	/**
	 * Unregister an exporter
	 *
	 * @param pluginId Plugin ID
	 * @param exporterId Exporter ID (optional, if not provided, all exporters for plugin are removed)
	 * @returns True if exporter was unregistered, false if not found
	 */
	public unregisterExporter(pluginId: string, exporterId?: string): boolean {
		const pluginExporters = this.exporters.get(pluginId);

		if (!pluginExporters) {
			logger.warn({ pluginId }, "No exporters found for plugin");
			return false;
		}

		if (exporterId) {
			const index = pluginExporters.findIndex(
				(exp) => exp.exporterId === exporterId,
			);

			if (index === -1) {
				logger.warn(
					{ pluginId, exporterId },
					"Exporter not found for unregistration",
				);
				return false;
			}

			pluginExporters.splice(index, 1);

			if (pluginExporters.length === 0) {
				this.exporters.delete(pluginId);
			} else {
				this.exporters.set(pluginId, pluginExporters);
			}

			logger.info({ pluginId, exporterId }, "Exporter unregistered");
			return true;
		}

		// Remove all exporters for plugin
		this.exporters.delete(pluginId);
		logger.info(
			{ pluginId, count: pluginExporters.length },
			"All exporters unregistered for plugin",
		);
		return true;
	}

	// ========================================================================
	// Transformer Registration
	// ========================================================================

	/**
	 * Register a transformer
	 *
	 * @param pluginId Plugin ID registering the transformer
	 * @param options Transformer options
	 * @throws Error if transformer ID already exists for this plugin
	 */
	public registerTransformer(
		pluginId: string,
		options: TransformerOptions,
	): void {
		const pluginTransformers = this.transformers.get(pluginId) ?? [];

		// Check if transformer ID already exists
		const existing = pluginTransformers.find(
			(trans) => trans.transformerId === options.id,
		);

		if (existing) {
			throw new Error(
				`Transformer ${options.id} already registered for plugin ${pluginId}`,
			);
		}

		const entry: TransformerEntry = {
			pluginId,
			transformerId: options.id,
			name: options.name,
			description: options.description,
			sourceFormats: options.sourceFormats,
			targetFormats: options.targetFormats,
			transformer: options.transformer,
			options: options.options,
		};

		pluginTransformers.push(entry);
		this.transformers.set(pluginId, pluginTransformers);

		logger.info(
			{
				pluginId,
				transformerId: options.id,
				name: options.name,
				sourceFormats: options.sourceFormats,
				targetFormats: options.targetFormats,
			},
			"Transformer registered",
		);
	}

	/**
	 * Unregister a transformer
	 *
	 * @param pluginId Plugin ID
	 * @param transformerId Transformer ID (optional, if not provided, all transformers for plugin are removed)
	 * @returns True if transformer was unregistered, false if not found
	 */
	public unregisterTransformer(
		pluginId: string,
		transformerId?: string,
	): boolean {
		const pluginTransformers = this.transformers.get(pluginId);

		if (!pluginTransformers) {
			logger.warn({ pluginId }, "No transformers found for plugin");
			return false;
		}

		if (transformerId) {
			const index = pluginTransformers.findIndex(
				(trans) => trans.transformerId === transformerId,
			);

			if (index === -1) {
				logger.warn(
					{ pluginId, transformerId },
					"Transformer not found for unregistration",
				);
				return false;
			}

			pluginTransformers.splice(index, 1);

			if (pluginTransformers.length === 0) {
				this.transformers.delete(pluginId);
			} else {
				this.transformers.set(pluginId, pluginTransformers);
			}

			logger.info({ pluginId, transformerId }, "Transformer unregistered");
			return true;
		}

		// Remove all transformers for plugin
		this.transformers.delete(pluginId);
		logger.info(
			{ pluginId, count: pluginTransformers.length },
			"All transformers unregistered for plugin",
		);
		return true;
	}

	// ========================================================================
	// Query Operations
	// ========================================================================

	/**
	 * Get importers
	 *
	 * @param pluginId Plugin ID (optional, if not provided, returns all importers)
	 * @param format Data format filter (optional)
	 * @returns Array of importer entries
	 */
	public getImporters(pluginId?: string, format?: string): ImporterEntry[] {
		let importers: ImporterEntry[] = [];

		if (pluginId) {
			importers = this.importers.get(pluginId) ?? [];
		} else {
			for (const pluginImporters of this.importers.values()) {
				importers.push(...pluginImporters);
			}
		}

		// Filter by format if provided
		if (format) {
			importers = importers.filter((imp) =>
				imp.supportedFormats.includes(format as never),
			);
		}

		return importers;
	}

	/**
	 * Get exporters
	 *
	 * @param pluginId Plugin ID (optional, if not provided, returns all exporters)
	 * @param format Data format filter (optional)
	 * @returns Array of exporter entries
	 */
	public getExporters(pluginId?: string, format?: string): ExporterEntry[] {
		let exporters: ExporterEntry[] = [];

		if (pluginId) {
			exporters = this.exporters.get(pluginId) ?? [];
		} else {
			for (const pluginExporters of this.exporters.values()) {
				exporters.push(...pluginExporters);
			}
		}

		// Filter by format if provided
		if (format) {
			exporters = exporters.filter((exp) =>
				exp.supportedFormats.includes(format as never),
			);
		}

		return exporters;
	}

	/**
	 * Get transformers
	 *
	 * @param pluginId Plugin ID (optional, if not provided, returns all transformers)
	 * @param sourceFormat Source format filter (optional)
	 * @param targetFormat Target format filter (optional)
	 * @returns Array of transformer entries
	 */
	public getTransformers(
		pluginId?: string,
		sourceFormat?: string,
		targetFormat?: string,
	): TransformerEntry[] {
		let transformers: TransformerEntry[] = [];

		if (pluginId) {
			transformers = this.transformers.get(pluginId) ?? [];
		} else {
			for (const pluginTransformers of this.transformers.values()) {
				transformers.push(...pluginTransformers);
			}
		}

		// Filter by source format if provided
		if (sourceFormat) {
			transformers = transformers.filter((trans) =>
				trans.sourceFormats.includes(sourceFormat as never),
			);
		}

		// Filter by target format if provided
		if (targetFormat) {
			transformers = transformers.filter((trans) =>
				trans.targetFormats.includes(targetFormat as never),
			);
		}

		return transformers;
	}

	/**
	 * Find importer by file extension
	 *
	 * @param extension File extension (e.g., ".md")
	 * @returns Importer entry or undefined if not found
	 */
	public findImporterByExtension(extension: string): ImporterEntry | undefined {
		for (const pluginImporters of this.importers.values()) {
			for (const importer of pluginImporters) {
				if (
					importer.fileExtensions?.some(
						(ext) => ext.toLowerCase() === extension.toLowerCase(),
					)
				) {
					return importer;
				}
			}
		}
		return undefined;
	}

	/**
	 * Find importer by MIME type
	 *
	 * @param mimeType MIME type (e.g., "text/markdown")
	 * @returns Importer entry or undefined if not found
	 */
	public findImporterByMimeType(mimeType: string): ImporterEntry | undefined {
		for (const pluginImporters of this.importers.values()) {
			for (const importer of pluginImporters) {
				if (
					importer.mimeTypes?.some(
						(mt) => mt.toLowerCase() === mimeType.toLowerCase(),
					)
				) {
					return importer;
				}
			}
		}
		return undefined;
	}

	/**
	 * Clear all extensions for a plugin
	 *
	 * @param pluginId Plugin ID
	 */
	public clearPlugin(pluginId: string): void {
		this.unregisterImporter(pluginId);
		this.unregisterExporter(pluginId);
		this.unregisterTransformer(pluginId);
	}

	/**
	 * Clear all extensions
	 *
	 * @warning This will remove all registered extensions!
	 */
	public clear(): void {
		const importerCount = Array.from(this.importers.values()).reduce(
			(sum, imps) => sum + imps.length,
			0,
		);
		const exporterCount = Array.from(this.exporters.values()).reduce(
			(sum, exps) => sum + exps.length,
			0,
		);
		const transformerCount = Array.from(this.transformers.values()).reduce(
			(sum, trans) => sum + trans.length,
			0,
		);

		this.importers.clear();
		this.exporters.clear();
		this.transformers.clear();

		logger.info(
			{
				clearedImporters: importerCount,
				clearedExporters: exporterCount,
				clearedTransformers: transformerCount,
			},
			"All data processor extensions cleared",
		);
	}

	/**
	 * Get statistics
	 *
	 * @returns Statistics about registered extensions
	 */
	public getStats(): {
		totalPlugins: number;
		totalImporters: number;
		totalExporters: number;
		totalTransformers: number;
	} {
		return {
			totalPlugins: new Set([
				...this.importers.keys(),
				...this.exporters.keys(),
				...this.transformers.keys(),
			]).size,
			totalImporters: Array.from(this.importers.values()).reduce(
				(sum, imps) => sum + imps.length,
				0,
			),
			totalExporters: Array.from(this.exporters.values()).reduce(
				(sum, exps) => sum + exps.length,
				0,
			),
			totalTransformers: Array.from(this.transformers.values()).reduce(
				(sum, trans) => sum + trans.length,
				0,
			),
		};
	}
}

// ============================================================================
// Singleton Export
// ============================================================================

/**
 * Get data processor extension registry instance
 */
export function getDataProcessorExtensionRegistry(): DataProcessorExtensionRegistry {
	return DataProcessorExtensionRegistry.getInstance();
}
