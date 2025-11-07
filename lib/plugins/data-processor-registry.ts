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
// State (Private)
// ============================================================================

/** Map of plugin ID to array of importers */
const importers = new Map<string, ImporterEntry[]>();

/** Map of plugin ID to array of exporters */
const exporters = new Map<string, ExporterEntry[]>();

/** Map of plugin ID to array of transformers */
const transformers = new Map<string, TransformerEntry[]>();

// ============================================================================
// Importer Registration
// ============================================================================

/**
 * Register an importer
 *
 * @param pluginId Plugin ID registering the importer
 * @param options Importer options
 * @throws Error if importer ID already exists for this plugin
 */
export function registerImporter(
	pluginId: string,
	options: ImporterOptions,
): void {
	const pluginImporters = importers.get(pluginId) ?? [];

	// Check if importer ID already exists
	const existing = pluginImporters.find((imp) => imp.importerId === options.id);

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
	importers.set(pluginId, pluginImporters);

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
export function unregisterImporter(
	pluginId: string,
	importerId?: string,
): boolean {
	const pluginImporters = importers.get(pluginId);

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
			importers.delete(pluginId);
		} else {
			importers.set(pluginId, pluginImporters);
		}

		logger.info({ pluginId, importerId }, "Importer unregistered");
		return true;
	}

	// Remove all importers for plugin
	importers.delete(pluginId);
	logger.info(
		{ pluginId, count: pluginImporters.length },
		"All importers unregistered for plugin",
	);
	return true;
}

// ============================================================================
// Exporter Registration
// ============================================================================

/**
 * Register an exporter
 *
 * @param pluginId Plugin ID registering the exporter
 * @param options Exporter options
 * @throws Error if exporter ID already exists for this plugin
 */
export function registerExporter(
	pluginId: string,
	options: ExporterOptions,
): void {
	const pluginExporters = exporters.get(pluginId) ?? [];

	// Check if exporter ID already exists
	const existing = pluginExporters.find((exp) => exp.exporterId === options.id);

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
	exporters.set(pluginId, pluginExporters);

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
export function unregisterExporter(
	pluginId: string,
	exporterId?: string,
): boolean {
	const pluginExporters = exporters.get(pluginId);

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
			exporters.delete(pluginId);
		} else {
			exporters.set(pluginId, pluginExporters);
		}

		logger.info({ pluginId, exporterId }, "Exporter unregistered");
		return true;
	}

	// Remove all exporters for plugin
	exporters.delete(pluginId);
	logger.info(
		{ pluginId, count: pluginExporters.length },
		"All exporters unregistered for plugin",
	);
	return true;
}

// ============================================================================
// Transformer Registration
// ============================================================================

/**
 * Register a transformer
 *
 * @param pluginId Plugin ID registering the transformer
 * @param options Transformer options
 * @throws Error if transformer ID already exists for this plugin
 */
export function registerTransformer(
	pluginId: string,
	options: TransformerOptions,
): void {
	const pluginTransformers = transformers.get(pluginId) ?? [];

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
	transformers.set(pluginId, pluginTransformers);

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
export function unregisterTransformer(
	pluginId: string,
	transformerId?: string,
): boolean {
	const pluginTransformers = transformers.get(pluginId);

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
			transformers.delete(pluginId);
		} else {
			transformers.set(pluginId, pluginTransformers);
		}

		logger.info({ pluginId, transformerId }, "Transformer unregistered");
		return true;
	}

	// Remove all transformers for plugin
	transformers.delete(pluginId);
	logger.info(
		{ pluginId, count: pluginTransformers.length },
		"All transformers unregistered for plugin",
	);
	return true;
}

// ============================================================================
// Query Operations
// ============================================================================

/**
 * Get importers
 *
 * @param pluginId Plugin ID (optional, if not provided, returns all importers)
 * @param format Data format filter (optional)
 * @returns Array of importer entries
 */
export function getImporters(
	pluginId?: string,
	format?: string,
): ImporterEntry[] {
	let result: ImporterEntry[] = [];

	if (pluginId) {
		result = importers.get(pluginId) ?? [];
	} else {
		for (const pluginImporters of importers.values()) {
			result.push(...pluginImporters);
		}
	}

	// Filter by format if provided
	if (format) {
		result = result.filter((imp) =>
			imp.supportedFormats.includes(format as never),
		);
	}

	return result;
}

/**
 * Get exporters
 *
 * @param pluginId Plugin ID (optional, if not provided, returns all exporters)
 * @param format Data format filter (optional)
 * @returns Array of exporter entries
 */
export function getExporters(
	pluginId?: string,
	format?: string,
): ExporterEntry[] {
	let result: ExporterEntry[] = [];

	if (pluginId) {
		result = exporters.get(pluginId) ?? [];
	} else {
		for (const pluginExporters of exporters.values()) {
			result.push(...pluginExporters);
		}
	}

	// Filter by format if provided
	if (format) {
		result = result.filter((exp) =>
			exp.supportedFormats.includes(format as never),
		);
	}

	return result;
}

/**
 * Get transformers
 *
 * @param pluginId Plugin ID (optional, if not provided, returns all transformers)
 * @param sourceFormat Source format filter (optional)
 * @param targetFormat Target format filter (optional)
 * @returns Array of transformer entries
 */
export function getTransformers(
	pluginId?: string,
	sourceFormat?: string,
	targetFormat?: string,
): TransformerEntry[] {
	let result: TransformerEntry[] = [];

	if (pluginId) {
		result = transformers.get(pluginId) ?? [];
	} else {
		for (const pluginTransformers of transformers.values()) {
			result.push(...pluginTransformers);
		}
	}

	// Filter by source format if provided
	if (sourceFormat) {
		result = result.filter((trans) =>
			trans.sourceFormats.includes(sourceFormat as never),
		);
	}

	// Filter by target format if provided
	if (targetFormat) {
		result = result.filter((trans) =>
			trans.targetFormats.includes(targetFormat as never),
		);
	}

	return result;
}

/**
 * Find importer by file extension
 *
 * @param extension File extension (e.g., ".md")
 * @returns Importer entry or undefined if not found
 */
export function findImporterByExtension(
	extension: string,
): ImporterEntry | undefined {
	for (const pluginImporters of importers.values()) {
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
export function findImporterByMimeType(
	mimeType: string,
): ImporterEntry | undefined {
	for (const pluginImporters of importers.values()) {
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
export function clearPlugin(pluginId: string): void {
	unregisterImporter(pluginId);
	unregisterExporter(pluginId);
	unregisterTransformer(pluginId);
}

/**
 * Clear all extensions
 *
 * @warning This will remove all registered extensions!
 */
export function clear(): void {
	const importerCount = Array.from(importers.values()).reduce(
		(sum, imps) => sum + imps.length,
		0,
	);
	const exporterCount = Array.from(exporters.values()).reduce(
		(sum, exps) => sum + exps.length,
		0,
	);
	const transformerCount = Array.from(transformers.values()).reduce(
		(sum, trans) => sum + trans.length,
		0,
	);

	importers.clear();
	exporters.clear();
	transformers.clear();

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
export function getStats(): {
	totalPlugins: number;
	totalImporters: number;
	totalExporters: number;
	totalTransformers: number;
} {
	return {
		totalPlugins: new Set([
			...importers.keys(),
			...exporters.keys(),
			...transformers.keys(),
		]).size,
		totalImporters: Array.from(importers.values()).reduce(
			(sum, imps) => sum + imps.length,
			0,
		),
		totalExporters: Array.from(exporters.values()).reduce(
			(sum, exps) => sum + exps.length,
			0,
		),
		totalTransformers: Array.from(transformers.values()).reduce(
			(sum, trans) => sum + trans.length,
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
	importers.clear();
	exporters.clear();
	transformers.clear();
}
