/**
 * Data Processor Extension Registry Tests
 *
 * Unit tests for the data processor extension registry functions.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as registry from "../data-processor-registry";
import type {
	ExporterOptions,
	ImporterOptions,
	TransformerOptions,
} from "../types";

describe("Data Processor Extension Registry", () => {
	const createMockImporter = (
		id: string,
		supportedFormats: Array<"json" | "markdown" | "csv"> = ["json"],
	): ImporterOptions => ({
		id,
		name: `Importer ${id}`,
		description: `Test importer ${id}`,
		supportedFormats,
		fileExtensions: [".json"],
		mimeTypes: ["application/json"],
		importer: async (_data, _options) => ({
			data: { imported: true },
			format: "json",
			itemCount: 1,
		}),
	});

	const createMockExporter = (
		id: string,
		supportedFormats: Array<"json" | "markdown" | "csv"> = ["json"],
	): ExporterOptions => ({
		id,
		name: `Exporter ${id}`,
		description: `Test exporter ${id}`,
		supportedFormats,
		defaultExtension: ".json",
		defaultMimeType: "application/json",
		exporter: async (_data, _options) => ({
			data: JSON.stringify({ exported: true }),
			format: "json",
			filename: "export.json",
			mimeType: "application/json",
		}),
	});

	const createMockTransformer = (
		id: string,
		sourceFormats: Array<"json" | "markdown" | "html"> = ["json"],
		targetFormats: Array<"json" | "markdown" | "html"> = ["markdown"],
	): TransformerOptions => ({
		id,
		name: `Transformer ${id}`,
		description: `Test transformer ${id}`,
		sourceFormats,
		targetFormats,
		transformer: async (_data, sourceFormat, targetFormat, _options) => ({
			data: { transformed: true },
			sourceFormat,
			targetFormat,
		}),
	});

	beforeEach(() => {
		registry.reset();
	});

	afterEach(() => {
		registry.reset();
	});

	describe("Importer Registration", () => {
		it("should register an importer", () => {
			const options = createMockImporter("imp-1");

			registry.registerImporter("plugin-1", options);

			const importers = registry.getImporters("plugin-1");
			expect(importers).toHaveLength(1);
			expect(importers[0].importerId).toBe("imp-1");
			expect(importers[0].pluginId).toBe("plugin-1");
			expect(importers[0].name).toBe("Importer imp-1");
		});

		it("should throw error when registering duplicate importer ID", () => {
			const options = createMockImporter("imp-1");

			registry.registerImporter("plugin-1", options);

			expect(() => registry.registerImporter("plugin-1", options)).toThrow(
				"Importer imp-1 already registered for plugin plugin-1",
			);
		});

		it("should allow same importer ID for different plugins", () => {
			const options = createMockImporter("imp-1");

			registry.registerImporter("plugin-1", options);
			registry.registerImporter("plugin-2", options);

			expect(registry.getImporters("plugin-1")).toHaveLength(1);
			expect(registry.getImporters("plugin-2")).toHaveLength(1);
		});

		it("should register multiple importers for same plugin", () => {
			const imp1 = createMockImporter("imp-1", ["json"]);
			const imp2 = createMockImporter("imp-2", ["markdown"]);

			registry.registerImporter("plugin-1", imp1);
			registry.registerImporter("plugin-1", imp2);

			expect(registry.getImporters("plugin-1")).toHaveLength(2);
		});

		it("should filter importers by format", () => {
			const imp1 = createMockImporter("imp-1", ["json"]);
			const imp2 = createMockImporter("imp-2", ["markdown"]);

			registry.registerImporter("plugin-1", imp1);
			registry.registerImporter("plugin-1", imp2);

			const jsonImporters = registry.getImporters(undefined, "json");
			expect(jsonImporters).toHaveLength(1);
			expect(jsonImporters[0].importerId).toBe("imp-1");
		});

		it("should find importer by file extension", () => {
			const options = createMockImporter("imp-1");
			options.fileExtensions = [".md", ".markdown"];

			registry.registerImporter("plugin-1", options);

			const found = registry.findImporterByExtension(".md");
			expect(found).toBeDefined();
			expect(found?.importerId).toBe("imp-1");
		});

		it("should find importer by MIME type", () => {
			const options = createMockImporter("imp-1");
			options.mimeTypes = ["text/markdown"];

			registry.registerImporter("plugin-1", options);

			const found = registry.findImporterByMimeType("text/markdown");
			expect(found).toBeDefined();
			expect(found?.importerId).toBe("imp-1");
		});

		it("should unregister an importer", () => {
			const options = createMockImporter("imp-1");

			registry.registerImporter("plugin-1", options);
			expect(registry.getImporters("plugin-1")).toHaveLength(1);

			const result = registry.unregisterImporter("plugin-1", "imp-1");
			expect(result).toBe(true);
			expect(registry.getImporters("plugin-1")).toHaveLength(0);
		});

		it("should return false when unregistering non-existent importer", () => {
			const result = registry.unregisterImporter("plugin-1", "imp-1");
			expect(result).toBe(false);
		});

		it("should unregister all importers for a plugin", () => {
			const imp1 = createMockImporter("imp-1");
			const imp2 = createMockImporter("imp-2");

			registry.registerImporter("plugin-1", imp1);
			registry.registerImporter("plugin-1", imp2);

			const result = registry.unregisterImporter("plugin-1");
			expect(result).toBe(true);
			expect(registry.getImporters("plugin-1")).toHaveLength(0);
		});
	});

	describe("Exporter Registration", () => {
		it("should register an exporter", () => {
			const options = createMockExporter("exp-1");

			registry.registerExporter("plugin-1", options);

			const exporters = registry.getExporters("plugin-1");
			expect(exporters).toHaveLength(1);
			expect(exporters[0].exporterId).toBe("exp-1");
			expect(exporters[0].pluginId).toBe("plugin-1");
			expect(exporters[0].name).toBe("Exporter exp-1");
		});

		it("should throw error when registering duplicate exporter ID", () => {
			const options = createMockExporter("exp-1");

			registry.registerExporter("plugin-1", options);

			expect(() => registry.registerExporter("plugin-1", options)).toThrow(
				"Exporter exp-1 already registered for plugin plugin-1",
			);
		});

		it("should allow same exporter ID for different plugins", () => {
			const options = createMockExporter("exp-1");

			registry.registerExporter("plugin-1", options);
			registry.registerExporter("plugin-2", options);

			expect(registry.getExporters("plugin-1")).toHaveLength(1);
			expect(registry.getExporters("plugin-2")).toHaveLength(1);
		});

		it("should register multiple exporters for same plugin", () => {
			const exp1 = createMockExporter("exp-1", ["json"]);
			const exp2 = createMockExporter("exp-2", ["markdown"]);

			registry.registerExporter("plugin-1", exp1);
			registry.registerExporter("plugin-1", exp2);

			expect(registry.getExporters("plugin-1")).toHaveLength(2);
		});

		it("should filter exporters by format", () => {
			const exp1 = createMockExporter("exp-1", ["json"]);
			const exp2 = createMockExporter("exp-2", ["markdown"]);

			registry.registerExporter("plugin-1", exp1);
			registry.registerExporter("plugin-1", exp2);

			const jsonExporters = registry.getExporters(undefined, "json");
			expect(jsonExporters).toHaveLength(1);
			expect(jsonExporters[0].exporterId).toBe("exp-1");
		});

		it("should unregister an exporter", () => {
			const options = createMockExporter("exp-1");

			registry.registerExporter("plugin-1", options);
			expect(registry.getExporters("plugin-1")).toHaveLength(1);

			const result = registry.unregisterExporter("plugin-1", "exp-1");
			expect(result).toBe(true);
			expect(registry.getExporters("plugin-1")).toHaveLength(0);
		});

		it("should return false when unregistering non-existent exporter", () => {
			const result = registry.unregisterExporter("plugin-1", "exp-1");
			expect(result).toBe(false);
		});

		it("should unregister all exporters for a plugin", () => {
			const exp1 = createMockExporter("exp-1");
			const exp2 = createMockExporter("exp-2");

			registry.registerExporter("plugin-1", exp1);
			registry.registerExporter("plugin-1", exp2);

			const result = registry.unregisterExporter("plugin-1");
			expect(result).toBe(true);
			expect(registry.getExporters("plugin-1")).toHaveLength(0);
		});
	});

	describe("Transformer Registration", () => {
		it("should register a transformer", () => {
			const options = createMockTransformer("trans-1");

			registry.registerTransformer("plugin-1", options);

			const transformers = registry.getTransformers("plugin-1");
			expect(transformers).toHaveLength(1);
			expect(transformers[0].transformerId).toBe("trans-1");
			expect(transformers[0].pluginId).toBe("plugin-1");
			expect(transformers[0].name).toBe("Transformer trans-1");
		});

		it("should throw error when registering duplicate transformer ID", () => {
			const options = createMockTransformer("trans-1");

			registry.registerTransformer("plugin-1", options);

			expect(() => registry.registerTransformer("plugin-1", options)).toThrow(
				"Transformer trans-1 already registered for plugin plugin-1",
			);
		});

		it("should allow same transformer ID for different plugins", () => {
			const options = createMockTransformer("trans-1");

			registry.registerTransformer("plugin-1", options);
			registry.registerTransformer("plugin-2", options);

			expect(registry.getTransformers("plugin-1")).toHaveLength(1);
			expect(registry.getTransformers("plugin-2")).toHaveLength(1);
		});

		it("should register multiple transformers for same plugin", () => {
			const trans1 = createMockTransformer("trans-1", ["json"], ["markdown"]);
			const trans2 = createMockTransformer("trans-2", ["markdown"], ["html"]);

			registry.registerTransformer("plugin-1", trans1);
			registry.registerTransformer("plugin-1", trans2);

			expect(registry.getTransformers("plugin-1")).toHaveLength(2);
		});

		it("should filter transformers by source format", () => {
			const trans1 = createMockTransformer("trans-1", ["json"], ["markdown"]);
			const trans2 = createMockTransformer("trans-2", ["markdown"], ["html"]);

			registry.registerTransformer("plugin-1", trans1);
			registry.registerTransformer("plugin-1", trans2);

			const jsonTransformers = registry.getTransformers(undefined, "json");
			expect(jsonTransformers).toHaveLength(1);
			expect(jsonTransformers[0].transformerId).toBe("trans-1");
		});

		it("should filter transformers by target format", () => {
			const trans1 = createMockTransformer("trans-1", ["json"], ["markdown"]);
			const trans2 = createMockTransformer("trans-2", ["markdown"], ["html"]);

			registry.registerTransformer("plugin-1", trans1);
			registry.registerTransformer("plugin-1", trans2);

			const markdownTransformers = registry.getTransformers(
				undefined,
				undefined,
				"markdown",
			);
			expect(markdownTransformers).toHaveLength(1);
			expect(markdownTransformers[0].transformerId).toBe("trans-1");
		});

		it("should filter transformers by both source and target format", () => {
			const trans1 = createMockTransformer("trans-1", ["json"], ["markdown"]);
			const trans2 = createMockTransformer("trans-2", ["markdown"], ["html"]);

			registry.registerTransformer("plugin-1", trans1);
			registry.registerTransformer("plugin-1", trans2);

			const filtered = registry.getTransformers("plugin-1", "json", "markdown");
			expect(filtered).toHaveLength(1);
			expect(filtered[0].transformerId).toBe("trans-1");
		});

		it("should unregister a transformer", () => {
			const options = createMockTransformer("trans-1");

			registry.registerTransformer("plugin-1", options);
			expect(registry.getTransformers("plugin-1")).toHaveLength(1);

			const result = registry.unregisterTransformer("plugin-1", "trans-1");
			expect(result).toBe(true);
			expect(registry.getTransformers("plugin-1")).toHaveLength(0);
		});

		it("should return false when unregistering non-existent transformer", () => {
			const result = registry.unregisterTransformer("plugin-1", "trans-1");
			expect(result).toBe(false);
		});

		it("should unregister all transformers for a plugin", () => {
			const trans1 = createMockTransformer("trans-1");
			const trans2 = createMockTransformer("trans-2");

			registry.registerTransformer("plugin-1", trans1);
			registry.registerTransformer("plugin-1", trans2);

			const result = registry.unregisterTransformer("plugin-1");
			expect(result).toBe(true);
			expect(registry.getTransformers("plugin-1")).toHaveLength(0);
		});
	});

	describe("Query Operations", () => {
		it("should get all importers when pluginId is not provided", () => {
			const imp1 = createMockImporter("imp-1");
			const imp2 = createMockImporter("imp-2");

			registry.registerImporter("plugin-1", imp1);
			registry.registerImporter("plugin-2", imp2);

			const allImporters = registry.getImporters();
			expect(allImporters).toHaveLength(2);
		});

		it("should get all exporters when pluginId is not provided", () => {
			const exp1 = createMockExporter("exp-1");
			const exp2 = createMockExporter("exp-2");

			registry.registerExporter("plugin-1", exp1);
			registry.registerExporter("plugin-2", exp2);

			const allExporters = registry.getExporters();
			expect(allExporters).toHaveLength(2);
		});

		it("should get all transformers when pluginId is not provided", () => {
			const trans1 = createMockTransformer("trans-1");
			const trans2 = createMockTransformer("trans-2");

			registry.registerTransformer("plugin-1", trans1);
			registry.registerTransformer("plugin-2", trans2);

			const allTransformers = registry.getTransformers();
			expect(allTransformers).toHaveLength(2);
		});
	});

	describe("clearPlugin", () => {
		it("should clear all extensions for a plugin", () => {
			const imp1 = createMockImporter("imp-1");
			const exp1 = createMockExporter("exp-1");
			const trans1 = createMockTransformer("trans-1");

			registry.registerImporter("plugin-1", imp1);
			registry.registerExporter("plugin-1", exp1);
			registry.registerTransformer("plugin-1", trans1);

			registry.clearPlugin("plugin-1");

			expect(registry.getImporters("plugin-1")).toHaveLength(0);
			expect(registry.getExporters("plugin-1")).toHaveLength(0);
			expect(registry.getTransformers("plugin-1")).toHaveLength(0);
		});

		it("should not affect other plugins", () => {
			const imp1 = createMockImporter("imp-1");
			const imp2 = createMockImporter("imp-2");

			registry.registerImporter("plugin-1", imp1);
			registry.registerImporter("plugin-2", imp2);

			registry.clearPlugin("plugin-1");

			expect(registry.getImporters("plugin-1")).toHaveLength(0);
			expect(registry.getImporters("plugin-2")).toHaveLength(1);
		});
	});

	describe("clear", () => {
		it("should clear all extensions", () => {
			const imp1 = createMockImporter("imp-1");
			const exp1 = createMockExporter("exp-1");
			const trans1 = createMockTransformer("trans-1");

			registry.registerImporter("plugin-1", imp1);
			registry.registerExporter("plugin-1", exp1);
			registry.registerTransformer("plugin-1", trans1);

			registry.clear();

			expect(registry.getImporters()).toHaveLength(0);
			expect(registry.getExporters()).toHaveLength(0);
			expect(registry.getTransformers()).toHaveLength(0);
		});
	});

	describe("getStats", () => {
		it("should return correct statistics", () => {
			const imp1 = createMockImporter("imp-1");
			const imp2 = createMockImporter("imp-2");
			const exp1 = createMockExporter("exp-1");
			const trans1 = createMockTransformer("trans-1");

			registry.registerImporter("plugin-1", imp1);
			registry.registerImporter("plugin-2", imp2);
			registry.registerExporter("plugin-1", exp1);
			registry.registerTransformer("plugin-1", trans1);

			const stats = registry.getStats();

			expect(stats.totalPlugins).toBe(2);
			expect(stats.totalImporters).toBe(2);
			expect(stats.totalExporters).toBe(1);
			expect(stats.totalTransformers).toBe(1);
		});

		it("should return zero statistics when empty", () => {
			const stats = registry.getStats();

			expect(stats.totalPlugins).toBe(0);
			expect(stats.totalImporters).toBe(0);
			expect(stats.totalExporters).toBe(0);
			expect(stats.totalTransformers).toBe(0);
		});
	});
});
