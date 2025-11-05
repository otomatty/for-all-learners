/**
 * Plugin API Tests
 *
 * Unit tests for the Plugin API implementation.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import * as aiRegistry from "../ai-registry";
import * as calendarRegistry from "../calendar-registry";
import * as dataProcessorRegistry from "../data-processor-registry";
import {
	clearPluginCommands,
	createPluginAPI,
	executeCommand,
	getRegisteredCommands,
} from "../plugin-api";
import type {
	CalendarExtensionOptions,
	Command,
	ContentAnalyzerOptions,
	ExporterOptions,
	ImporterOptions,
	PageOptions,
	QuestionGeneratorOptions,
	QuestionType,
	SidebarPanelOptions,
	TransformerOptions,
	WidgetOptions,
} from "../types";
import * as uiRegistry from "../ui-registry";

describe("PluginAPI", () => {
	const pluginId = "test-plugin";

	beforeEach(() => {
		clearPluginCommands(pluginId);
		aiRegistry.clearPlugin(pluginId);
		uiRegistry.clearPlugin(pluginId);
		dataProcessorRegistry.clearPlugin(pluginId);
		calendarRegistry.clearPluginExtensions(pluginId);
		vi.clearAllMocks();
	});

	describe("createPluginAPI", () => {
		it("should create API instance with all namespaces", () => {
			const api = createPluginAPI(pluginId);

			expect(api).toBeDefined();
			expect(api.app).toBeDefined();
			expect(api.storage).toBeDefined();
			expect(api.notifications).toBeDefined();
			expect(api.ui).toBeDefined();
			expect(api.editor).toBeDefined();
			expect(api.ai).toBeDefined();
			expect(api.data).toBeDefined();
			expect(api.calendar).toBeDefined();
		});
	});

	describe("AppAPI", () => {
		it("should return application version", () => {
			const api = createPluginAPI(pluginId);

			const version = api.app.getVersion();

			expect(typeof version).toBe("string");
			expect(version.length).toBeGreaterThan(0);
		});

		it("should return application name", () => {
			const api = createPluginAPI(pluginId);

			const name = api.app.getName();

			expect(name).toBe("F.A.L (For All Learners)");
		});

		it("should return user ID (currently null)", async () => {
			const api = createPluginAPI(pluginId);

			const userId = await api.app.getUserId();

			expect(userId).toBeNull();
		});
	});

	describe("StorageAPI", () => {
		it("should have storage methods defined", () => {
			const api = createPluginAPI(pluginId);

			expect(typeof api.storage.get).toBe("function");
			expect(typeof api.storage.set).toBe("function");
			expect(typeof api.storage.delete).toBe("function");
			expect(typeof api.storage.keys).toBe("function");
			expect(typeof api.storage.clear).toBe("function");
		});

		it("should return undefined when storage get fails", async () => {
			const api = createPluginAPI(pluginId);

			// Storage will fail in test environment (no DB), should return undefined
			const result = await api.storage.get("test-key");

			// Should handle error gracefully and return undefined
			expect(result).toBeUndefined();
		});

		it("should handle storage set errors gracefully", async () => {
			const api = createPluginAPI(pluginId);

			// Storage will fail in test environment, should throw error
			await expect(api.storage.set("test-key", "value")).rejects.toThrow();
		});

		it("should handle storage delete errors gracefully", async () => {
			const api = createPluginAPI(pluginId);

			// Storage will fail in test environment, should throw error
			await expect(api.storage.delete("test-key")).rejects.toThrow();
		});

		it("should return empty array when storage keys fails", async () => {
			const api = createPluginAPI(pluginId);

			// Storage will fail in test environment, should return empty array
			const keys = await api.storage.keys();

			expect(Array.isArray(keys)).toBe(true);
		});

		it("should handle storage clear errors gracefully", async () => {
			const api = createPluginAPI(pluginId);

			// Storage will fail in test environment, should throw error
			await expect(api.storage.clear()).rejects.toThrow();
		});
	});

	describe("NotificationsAPI", () => {
		it("should have notification methods defined", () => {
			const api = createPluginAPI(pluginId);

			expect(typeof api.notifications.show).toBe("function");
			expect(typeof api.notifications.info).toBe("function");
			expect(typeof api.notifications.success).toBe("function");
			expect(typeof api.notifications.error).toBe("function");
			expect(typeof api.notifications.warning).toBe("function");
		});

		it("should call show method when info is called", () => {
			const api = createPluginAPI(pluginId);
			const showSpy = vi.spyOn(api.notifications, "show");

			api.notifications.info("Test message");

			expect(showSpy).toHaveBeenCalledWith("Test message", "info");
		});

		it("should call show method when success is called", () => {
			const api = createPluginAPI(pluginId);
			const showSpy = vi.spyOn(api.notifications, "show");

			api.notifications.success("Success message");

			expect(showSpy).toHaveBeenCalledWith("Success message", "success");
		});

		it("should call show method when error is called", () => {
			const api = createPluginAPI(pluginId);
			const showSpy = vi.spyOn(api.notifications, "show");

			api.notifications.error("Error message");

			expect(showSpy).toHaveBeenCalledWith("Error message", "error");
		});

		it("should call show method when warning is called", () => {
			const api = createPluginAPI(pluginId);
			const showSpy = vi.spyOn(api.notifications, "show");

			api.notifications.warning("Warning message");

			expect(showSpy).toHaveBeenCalledWith("Warning message", "warning");
		});

		it("should show notification with default type", () => {
			const api = createPluginAPI(pluginId);

			// show method should accept optional type parameter
			expect(() => api.notifications.show("Custom message")).not.toThrow();
		});
	});

	describe("UIAPI", () => {
		it("should register a command", async () => {
			const api = createPluginAPI(pluginId);

			const command: Command = {
				id: "test-command",
				label: "Test Command",
				description: "A test command",
				handler: vi.fn(),
			};

			await api.ui.registerCommand(command);

			const commands = getRegisteredCommands();
			expect(commands.has(`${pluginId}.test-command`)).toBe(true);
		});

		it("should throw error when registering duplicate command", async () => {
			const api = createPluginAPI(pluginId);

			const command: Command = {
				id: "test-command",
				label: "Test Command",
				handler: vi.fn(),
			};

			await api.ui.registerCommand(command);

			await expect(api.ui.registerCommand(command)).rejects.toThrow(
				"Command test-plugin.test-command is already registered",
			);
		});

		it("should unregister a command", async () => {
			const api = createPluginAPI(pluginId);

			const command: Command = {
				id: "test-command",
				label: "Test Command",
				handler: vi.fn(),
			};

			await api.ui.registerCommand(command);
			await api.ui.unregisterCommand("test-command");

			const commands = getRegisteredCommands();
			expect(commands.has(`${pluginId}.test-command`)).toBe(false);
		});

		it("should show dialog with alert fallback", async () => {
			// Skip test in Node.js environment (no window object)
			if (typeof window === "undefined") {
				return;
			}

			// Mock window.alert
			const originalAlert = window.alert;
			window.alert = vi.fn();

			const api = createPluginAPI(pluginId);

			await api.ui.showDialog({
				title: "Test Dialog",
				message: "Test message",
			});

			expect(window.alert).toHaveBeenCalledWith(
				expect.stringContaining("Test Dialog"),
			);

			window.alert = originalAlert;
		});

		it("should show dialog with confirm fallback", async () => {
			// Skip test in Node.js environment (no window object)
			if (typeof window === "undefined") {
				return;
			}

			// Mock window.confirm
			const originalConfirm = window.confirm;
			window.confirm = vi.fn(() => true);

			const api = createPluginAPI(pluginId);

			await api.ui.showDialog({
				title: "Test Dialog",
				message: "Test message",
				buttons: [
					{ label: "OK", variant: "primary" },
					{ label: "Cancel", variant: "default" },
				],
			});

			expect(window.confirm).toHaveBeenCalled();

			window.confirm = originalConfirm;
		});
	});

	describe("Command Management", () => {
		it("should get all registered commands", async () => {
			const api = createPluginAPI(pluginId);

			const command1: Command = {
				id: "command-1",
				label: "Command 1",
				handler: vi.fn(),
			};

			const command2: Command = {
				id: "command-2",
				label: "Command 2",
				handler: vi.fn(),
			};

			await api.ui.registerCommand(command1);
			await api.ui.registerCommand(command2);

			const commands = getRegisteredCommands();

			expect(commands.size).toBeGreaterThanOrEqual(2);
			expect(commands.has(`${pluginId}.command-1`)).toBe(true);
			expect(commands.has(`${pluginId}.command-2`)).toBe(true);
		});

		it("should execute a registered command", async () => {
			const api = createPluginAPI(pluginId);

			const handler = vi.fn().mockResolvedValue(undefined);

			const command: Command = {
				id: "test-command",
				label: "Test Command",
				handler,
			};

			await api.ui.registerCommand(command);
			await executeCommand(`${pluginId}.test-command`);

			expect(handler).toHaveBeenCalledTimes(1);
		});

		it("should throw error when executing non-existent command", async () => {
			await expect(executeCommand("non-existent.command")).rejects.toThrow(
				"Command non-existent.command is not registered",
			);
		});

		it("should clear all commands for a plugin", async () => {
			const api = createPluginAPI(pluginId);

			const command1: Command = {
				id: "command-1",
				label: "Command 1",
				handler: vi.fn(),
			};

			const command2: Command = {
				id: "command-2",
				label: "Command 2",
				handler: vi.fn(),
			};

			await api.ui.registerCommand(command1);
			await api.ui.registerCommand(command2);

			clearPluginCommands(pluginId);

			const commands = getRegisteredCommands();
			expect(commands.has(`${pluginId}.command-1`)).toBe(false);
			expect(commands.has(`${pluginId}.command-2`)).toBe(false);
		});
	});

	describe("AIAPI", () => {
		it("should have AI API methods defined", () => {
			const api = createPluginAPI(pluginId);

			expect(api.ai).toBeDefined();
			expect(typeof api.ai.registerQuestionGenerator).toBe("function");
			expect(typeof api.ai.unregisterQuestionGenerator).toBe("function");
			expect(typeof api.ai.registerPromptTemplate).toBe("function");
			expect(typeof api.ai.unregisterPromptTemplate).toBe("function");
			expect(typeof api.ai.registerContentAnalyzer).toBe("function");
			expect(typeof api.ai.unregisterContentAnalyzer).toBe("function");
		});

		describe("Question Generator", () => {
			it("should register a question generator", async () => {
				const api = createPluginAPI(pluginId);

				const options: QuestionGeneratorOptions = {
					id: "test-generator",
					generator: async (
						_front: string,
						_back: string,
						type: QuestionType,
					) => ({
						type,
						question: "Test question",
						answer: "Test answer",
					}),
					supportedTypes: ["flashcard"],
					description: "Test generator",
				};

				await api.ai.registerQuestionGenerator(options);

				const generators = aiRegistry.getQuestionGenerators(pluginId);
				expect(generators).toHaveLength(1);
				expect(generators[0].generatorId).toBe("test-generator");
			});

			it("should throw error when registering duplicate generator", async () => {
				const api = createPluginAPI(pluginId);

				const options: QuestionGeneratorOptions = {
					id: "test-generator",
					generator: async (
						_front: string,
						_back: string,
						type: QuestionType,
					) => ({
						type,
						question: "Test question",
						answer: "Test answer",
					}),
					supportedTypes: ["flashcard"],
				};

				await api.ai.registerQuestionGenerator(options);

				await expect(
					api.ai.registerQuestionGenerator(options),
				).rejects.toThrow();
			});

			it("should unregister a question generator", async () => {
				const api = createPluginAPI(pluginId);

				const options: QuestionGeneratorOptions = {
					id: "test-generator",
					generator: async (
						_front: string,
						_back: string,
						type: QuestionType,
					) => ({
						type,
						question: "Test question",
						answer: "Test answer",
					}),
					supportedTypes: ["flashcard"],
				};

				await api.ai.registerQuestionGenerator(options);
				await api.ai.unregisterQuestionGenerator("test-generator");

				const generators = aiRegistry.getQuestionGenerators(pluginId);
				expect(generators).toHaveLength(0);
			});
		});

		describe("Prompt Template", () => {
			it("should register a prompt template", async () => {
				const api = createPluginAPI(pluginId);

				const options = {
					id: "test-template",
					key: "test-key",
					template: "Template {{var1}}",
					variables: [
						{
							name: "var1",
							description: "Variable 1",
							required: true,
						},
					],
					description: "Test template",
				};

				await api.ai.registerPromptTemplate(options);

				const template = aiRegistry.getPromptTemplate("test-key");
				expect(template).toBeDefined();
				expect(template?.templateId).toBe("test-template");
			});

			it("should throw error when registering duplicate template key", async () => {
				const api = createPluginAPI(pluginId);

				const options1 = {
					id: "template-1",
					key: "shared-key",
					template: "Template 1",
				};

				const options2 = {
					id: "template-2",
					key: "shared-key",
					template: "Template 2",
				};

				await api.ai.registerPromptTemplate(options1);

				await expect(api.ai.registerPromptTemplate(options2)).rejects.toThrow();
			});

			it("should unregister a prompt template", async () => {
				const api = createPluginAPI(pluginId);

				const options = {
					id: "test-template",
					key: "test-key",
					template: "Template",
				};

				await api.ai.registerPromptTemplate(options);
				await api.ai.unregisterPromptTemplate("test-template");

				const template = aiRegistry.getPromptTemplate("test-key");
				expect(template).toBeUndefined();
			});
		});

		describe("Content Analyzer", () => {
			it("should register a content analyzer", async () => {
				const api = createPluginAPI(pluginId);

				const options: ContentAnalyzerOptions = {
					id: "test-analyzer",
					analyzer: async (
						_content: string,
						_options?: Record<string, unknown>,
					) => ({
						keywords: ["test"],
						summary: "Test summary",
						confidence: 0.9,
					}),
					description: "Test analyzer",
				};

				await api.ai.registerContentAnalyzer(options);

				const analyzers = aiRegistry.getContentAnalyzers(pluginId);
				expect(analyzers).toHaveLength(1);
				expect(analyzers[0].analyzerId).toBe("test-analyzer");
			});

			it("should throw error when registering duplicate analyzer", async () => {
				const api = createPluginAPI(pluginId);

				const options: ContentAnalyzerOptions = {
					id: "test-analyzer",
					analyzer: async (
						_content: string,
						_options?: Record<string, unknown>,
					) => ({
						keywords: ["test"],
						summary: "Test summary",
					}),
				};

				await api.ai.registerContentAnalyzer(options);

				await expect(api.ai.registerContentAnalyzer(options)).rejects.toThrow();
			});

			it("should unregister a content analyzer", async () => {
				const api = createPluginAPI(pluginId);

				const options: ContentAnalyzerOptions = {
					id: "test-analyzer",
					analyzer: async (
						_content: string,
						_options?: Record<string, unknown>,
					) => ({
						keywords: ["test"],
						summary: "Test summary",
					}),
				};

				await api.ai.registerContentAnalyzer(options);
				await api.ai.unregisterContentAnalyzer("test-analyzer");

				const analyzers = aiRegistry.getContentAnalyzers(pluginId);
				expect(analyzers).toHaveLength(0);
			});
		});
	});

	describe("DataAPI", () => {
		it("should have Data API methods defined", () => {
			const api = createPluginAPI(pluginId);

			expect(api.data).toBeDefined();
			expect(typeof api.data.registerImporter).toBe("function");
			expect(typeof api.data.unregisterImporter).toBe("function");
			expect(typeof api.data.registerExporter).toBe("function");
			expect(typeof api.data.unregisterExporter).toBe("function");
			expect(typeof api.data.registerTransformer).toBe("function");
			expect(typeof api.data.unregisterTransformer).toBe("function");
		});

		describe("Importer", () => {
			it("should register an importer", async () => {
				const api = createPluginAPI(pluginId);

				const options: ImporterOptions = {
					id: "test-importer",
					name: "Test Importer",
					description: "Test importer description",
					supportedFormats: ["json"],
					fileExtensions: [".json"],
					mimeTypes: ["application/json"],
					importer: async (_data, _options) => ({
						data: { imported: true },
						format: "json",
						itemCount: 1,
					}),
				};

				await api.data.registerImporter(options);

				const importers = dataProcessorRegistry.getImporters(pluginId);
				expect(importers).toHaveLength(1);
				expect(importers[0].importerId).toBe("test-importer");
			});

			it("should throw error when registering duplicate importer", async () => {
				const api = createPluginAPI(pluginId);

				const options: ImporterOptions = {
					id: "test-importer",
					name: "Test Importer",
					supportedFormats: ["json"],
					importer: async (_data, _options) => ({
						data: { imported: true },
						format: "json",
					}),
				};

				await api.data.registerImporter(options);

				await expect(api.data.registerImporter(options)).rejects.toThrow();
			});

			it("should unregister an importer", async () => {
				const api = createPluginAPI(pluginId);

				const options: ImporterOptions = {
					id: "test-importer",
					name: "Test Importer",
					supportedFormats: ["json"],
					importer: async (_data, _options) => ({
						data: { imported: true },
						format: "json",
					}),
				};

				await api.data.registerImporter(options);
				await api.data.unregisterImporter("test-importer");

				const importers = dataProcessorRegistry.getImporters(pluginId);
				expect(importers).toHaveLength(0);
			});
		});

		describe("Exporter", () => {
			it("should register an exporter", async () => {
				const api = createPluginAPI(pluginId);

				const options: ExporterOptions = {
					id: "test-exporter",
					name: "Test Exporter",
					description: "Test exporter description",
					supportedFormats: ["json"],
					defaultExtension: ".json",
					defaultMimeType: "application/json",
					exporter: async (_data, _options) => ({
						data: JSON.stringify({ exported: true }),
						format: "json",
						filename: "export.json",
						mimeType: "application/json",
					}),
				};

				await api.data.registerExporter(options);

				const exporters = dataProcessorRegistry.getExporters(pluginId);
				expect(exporters).toHaveLength(1);
				expect(exporters[0].exporterId).toBe("test-exporter");
			});

			it("should throw error when registering duplicate exporter", async () => {
				const api = createPluginAPI(pluginId);

				const options: ExporterOptions = {
					id: "test-exporter",
					name: "Test Exporter",
					supportedFormats: ["json"],
					exporter: async (_data, _options) => ({
						data: JSON.stringify({ exported: true }),
						format: "json",
					}),
				};

				await api.data.registerExporter(options);

				await expect(api.data.registerExporter(options)).rejects.toThrow();
			});

			it("should unregister an exporter", async () => {
				const api = createPluginAPI(pluginId);

				const options: ExporterOptions = {
					id: "test-exporter",
					name: "Test Exporter",
					supportedFormats: ["json"],
					exporter: async (_data, _options) => ({
						data: JSON.stringify({ exported: true }),
						format: "json",
					}),
				};

				await api.data.registerExporter(options);
				await api.data.unregisterExporter("test-exporter");

				const exporters = dataProcessorRegistry.getExporters(pluginId);
				expect(exporters).toHaveLength(0);
			});
		});

		describe("Transformer", () => {
			it("should register a transformer", async () => {
				const api = createPluginAPI(pluginId);

				const options: TransformerOptions = {
					id: "test-transformer",
					name: "Test Transformer",
					description: "Test transformer description",
					sourceFormats: ["json"],
					targetFormats: ["markdown"],
					transformer: async (_data, sourceFormat, targetFormat, _options) => ({
						data: { transformed: true },
						sourceFormat,
						targetFormat,
					}),
				};

				await api.data.registerTransformer(options);

				const transformers = dataProcessorRegistry.getTransformers(pluginId);
				expect(transformers).toHaveLength(1);
				expect(transformers[0].transformerId).toBe("test-transformer");
			});

			it("should throw error when registering duplicate transformer", async () => {
				const api = createPluginAPI(pluginId);

				const options: TransformerOptions = {
					id: "test-transformer",
					name: "Test Transformer",
					sourceFormats: ["json"],
					targetFormats: ["markdown"],
					transformer: async (_data, sourceFormat, targetFormat, _options) => ({
						data: { transformed: true },
						sourceFormat,
						targetFormat,
					}),
				};

				await api.data.registerTransformer(options);

				await expect(api.data.registerTransformer(options)).rejects.toThrow();
			});

			it("should unregister a transformer", async () => {
				const api = createPluginAPI(pluginId);

				const options: TransformerOptions = {
					id: "test-transformer",
					name: "Test Transformer",
					sourceFormats: ["json"],
					targetFormats: ["markdown"],
					transformer: async (_data, sourceFormat, targetFormat, _options) => ({
						data: { transformed: true },
						sourceFormat,
						targetFormat,
					}),
				};

				await api.data.registerTransformer(options);
				await api.data.unregisterTransformer("test-transformer");

				const transformers = dataProcessorRegistry.getTransformers(pluginId);
				expect(transformers).toHaveLength(0);
			});
		});
	});

	describe("UI Extensions API", () => {
		describe("Widget", () => {
			it("should register a widget", async () => {
				const api = createPluginAPI(pluginId);

				const options: WidgetOptions = {
					id: "test-widget",
					name: "Test Widget",
					description: "Test widget description",
					position: "top-left",
					size: "medium",
					render: async (_context) => ({
						type: "test-widget",
						props: {},
					}),
				};

				await api.ui.registerWidget(options);

				const widgets = uiRegistry.getWidgets(pluginId);
				expect(widgets).toHaveLength(1);
				expect(widgets[0].widgetId).toBe("test-widget");
			});

			it("should throw error when registering duplicate widget", async () => {
				const api = createPluginAPI(pluginId);

				const options: WidgetOptions = {
					id: "test-widget",
					name: "Test Widget",
					position: "top-left",
					size: "medium",
					render: async (_context) => ({
						type: "test-widget",
						props: {},
					}),
				};

				await api.ui.registerWidget(options);

				await expect(api.ui.registerWidget(options)).rejects.toThrow();
			});

			it("should unregister a widget", async () => {
				const api = createPluginAPI(pluginId);

				const options: WidgetOptions = {
					id: "test-widget",
					name: "Test Widget",
					position: "top-left",
					size: "medium",
					render: async (_context) => ({
						type: "test-widget",
						props: {},
					}),
				};

				await api.ui.registerWidget(options);
				await api.ui.unregisterWidget("test-widget");

				const widgets = uiRegistry.getWidgets(pluginId);
				expect(widgets).toHaveLength(0);
			});
		});

		describe("Page", () => {
			it("should register a page", async () => {
				const api = createPluginAPI(pluginId);

				const options: PageOptions = {
					id: "test-page",
					route: {
						path: "/test/page",
						name: "Test Page",
						title: "Test Page Title",
					},
					render: async (_context) => ({
						type: "test-page",
						props: {},
					}),
				};

				await api.ui.registerPage(options);

				const pages = uiRegistry.getPages(pluginId);
				expect(pages).toHaveLength(1);
				expect(pages[0].pageId).toBe("test-page");
			});

			it("should throw error when registering duplicate page", async () => {
				const api = createPluginAPI(pluginId);

				const options: PageOptions = {
					id: "test-page",
					route: {
						path: "/test/page",
						name: "Test Page",
						title: "Test Page Title",
					},
					render: async (_context) => ({
						type: "test-page",
						props: {},
					}),
				};

				await api.ui.registerPage(options);

				await expect(api.ui.registerPage(options)).rejects.toThrow();
			});

			it("should unregister a page", async () => {
				const api = createPluginAPI(pluginId);

				const options: PageOptions = {
					id: "test-page",
					route: {
						path: "/test/page",
						name: "Test Page",
						title: "Test Page Title",
					},
					render: async (_context) => ({
						type: "test-page",
						props: {},
					}),
				};

				await api.ui.registerPage(options);
				await api.ui.unregisterPage("test-page");

				const pages = uiRegistry.getPages(pluginId);
				expect(pages).toHaveLength(0);
			});
		});

		describe("Sidebar Panel", () => {
			it("should register a sidebar panel", async () => {
				const api = createPluginAPI(pluginId);

				const options: SidebarPanelOptions = {
					id: "test-panel",
					name: "Test Panel",
					description: "Test panel description",
					position: "left",
					render: async (_context) => ({
						type: "test-panel",
						props: {},
					}),
				};

				await api.ui.registerSidebarPanel(options);

				const panels = uiRegistry.getSidebarPanels(pluginId);
				expect(panels).toHaveLength(1);
				expect(panels[0].panelId).toBe("test-panel");
			});

			it("should throw error when registering duplicate panel", async () => {
				const api = createPluginAPI(pluginId);

				const options: SidebarPanelOptions = {
					id: "test-panel",
					name: "Test Panel",
					position: "left",
					render: async (_context) => ({
						type: "test-panel",
						props: {},
					}),
				};

				await api.ui.registerSidebarPanel(options);

				await expect(api.ui.registerSidebarPanel(options)).rejects.toThrow();
			});

			it("should unregister a sidebar panel", async () => {
				const api = createPluginAPI(pluginId);

				const options: SidebarPanelOptions = {
					id: "test-panel",
					name: "Test Panel",
					position: "left",
					render: async (_context) => ({
						type: "test-panel",
						props: {},
					}),
				};

				await api.ui.registerSidebarPanel(options);
				await api.ui.unregisterSidebarPanel("test-panel");

				const panels = uiRegistry.getSidebarPanels(pluginId);
				expect(panels).toHaveLength(0);
			});
		});
	});

	describe("CalendarAPI", () => {
		it("should register a calendar extension", async () => {
			const api = createPluginAPI(pluginId);
			const options: CalendarExtensionOptions = {
				id: "test-extension",
				name: "Test Extension",
				description: "Test extension description",
				getDailyData: vi.fn().mockResolvedValue({
					badge: "Test Badge",
					tooltip: "Test tooltip",
				}),
			};

			await api.calendar.registerExtension(options);

			const extensions = calendarRegistry.getCalendarExtensions(pluginId);
			expect(extensions).toHaveLength(1);
			expect(extensions[0].extensionId).toBe("test-extension");
			expect(extensions[0].name).toBe("Test Extension");
		});

		it("should throw error when registering duplicate extension ID", async () => {
			const api = createPluginAPI(pluginId);
			const options: CalendarExtensionOptions = {
				id: "test-extension",
				name: "Test Extension",
				getDailyData: vi.fn().mockResolvedValue(null),
			};

			await api.calendar.registerExtension(options);

			await expect(api.calendar.registerExtension(options)).rejects.toThrow(
				"Calendar extension test-extension already registered",
			);
		});

		it("should unregister a calendar extension", async () => {
			const api = createPluginAPI(pluginId);
			const options: CalendarExtensionOptions = {
				id: "test-extension",
				name: "Test Extension",
				getDailyData: vi.fn().mockResolvedValue(null),
			};

			await api.calendar.registerExtension(options);
			await api.calendar.unregisterExtension("test-extension");

			const extensions = calendarRegistry.getCalendarExtensions(pluginId);
			expect(extensions).toHaveLength(0);
		});

		it("should handle errors when registering extension", async () => {
			const api = createPluginAPI(pluginId);
			const options: CalendarExtensionOptions = {
				id: "test-extension",
				name: "Test Extension",
				getDailyData: vi.fn().mockResolvedValue(null),
			};

			// Register first time
			await api.calendar.registerExtension(options);

			// Try to register again (should fail)
			await expect(api.calendar.registerExtension(options)).rejects.toThrow();
		});

		it("should handle errors when unregistering extension", async () => {
			const api = createPluginAPI(pluginId);

			// Unregistering non-existent extension should not throw
			await expect(
				api.calendar.unregisterExtension("non-existent"),
			).resolves.not.toThrow();
		});
	});
});
