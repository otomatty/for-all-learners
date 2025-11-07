/**
 * Plugin Test Utilities
 *
 * Utility functions for testing plugins, including API mocks and helper functions.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ Plugin test files
 *
 * Dependencies:
 *   └─ lib/plugins/plugin-api.ts (types only)
 *
 * Related Documentation:
 *   ├─ Plan: docs/03_plans/plugin-system/phase4-development-tools.md
 *   └─ Guide: docs/guides/plugin-development/best-practices.md
 */

import type { JSONContent } from "@tiptap/core";
import type {
	AIAPI,
	AppAPI,
	CalendarAPI,
	DataAPI,
	EditorAPI,
	IntegrationAPI,
	NotificationsAPI,
	PluginAPI,
	StorageAPI,
	UIAPI,
} from "../plugin-api";
import type {
	Command,
	ContentAnalyzerOptions,
	DialogOptions,
	EditorExtensionOptions,
	EditorSelection,
	ExporterOptions,
	ExternalAPIRequestOptions,
	ExternalAPIResponse,
	ImporterOptions,
	NotificationType,
	PageOptions,
	PromptTemplateOptions,
	QuestionGeneratorOptions,
	SidebarPanelOptions,
	TransformerOptions,
	WidgetOptions,
} from "../types";

// Type for mock function (compatible with vitest)
// Use a type that can be called directly
type MockFn = (...args: unknown[]) => void;

/**
 * Mock implementation of AppAPI
 */
export function createMockAppAPI(): AppAPI {
	return {
		getVersion: () => "1.0.0",
		getName: () => "F.A.L Test",
		getUserId: async () => "test-user-123",
	};
}

/**
 * Mock implementation of StorageAPI
 */
export function createMockStorageAPI(): StorageAPI {
	const storage = new Map<string, unknown>();

	return {
		get: async <T = unknown>(key: string): Promise<T | undefined> => {
			const value = storage.get(key);
			return value !== undefined ? (value as T) : undefined;
		},
		set: async (key: string, value: unknown): Promise<void> => {
			storage.set(key, value);
		},
		delete: async (key: string): Promise<void> => {
			storage.delete(key);
		},
		keys: async (): Promise<string[]> => {
			return Array.from(storage.keys());
		},
		clear: async (): Promise<void> => {
			storage.clear();
		},
	};
}

/**
 * Mock implementation of NotificationsAPI
 */
export function createMockNotificationsAPI(mockFn?: MockFn): NotificationsAPI {
	const noop: MockFn = () => {};
	const showFn: MockFn = mockFn || noop;
	const infoFn: MockFn = mockFn || noop;
	const successFn: MockFn = mockFn || noop;
	const errorFn: MockFn = mockFn || noop;
	const warningFn: MockFn = mockFn || noop;

	return {
		show: (message: string, type?: NotificationType) => {
			showFn(message, type);
		},
		info: (message: string) => {
			infoFn(message);
		},
		success: (message: string) => {
			successFn(message);
		},
		error: (message: string) => {
			errorFn(message);
		},
		warning: (message: string) => {
			warningFn(message);
		},
	};
}

/**
 * Mock implementation of UIAPI
 */
export function createMockUIAPI(mockFn?: MockFn): UIAPI {
	const commands = new Map<string, Command>();
	const widgets = new Map<string, WidgetOptions>();
	const pages = new Map<string, PageOptions>();
	const panels = new Map<string, SidebarPanelOptions>();

	return {
		registerCommand: async (command: Command): Promise<void> => {
			commands.set(command.id, command);
			if (mockFn) mockFn();
		},
		unregisterCommand: async (commandId: string): Promise<void> => {
			commands.delete(commandId);
			if (mockFn) mockFn();
		},
		showDialog: async (options: DialogOptions): Promise<unknown> => {
			if (mockFn) mockFn(options);
			return "ok";
		},
		registerWidget: async (options: WidgetOptions): Promise<void> => {
			widgets.set(options.id, options);
			if (mockFn) mockFn();
		},
		unregisterWidget: async (widgetId: string): Promise<void> => {
			widgets.delete(widgetId);
			if (mockFn) mockFn();
		},
		registerPage: async (options: PageOptions): Promise<void> => {
			pages.set(options.id, options);
			if (mockFn) mockFn();
		},
		unregisterPage: async (pageId: string): Promise<void> => {
			pages.delete(pageId);
			if (mockFn) mockFn();
		},
		registerSidebarPanel: async (
			options: SidebarPanelOptions,
		): Promise<void> => {
			panels.set(options.id, options);
			if (mockFn) mockFn();
		},
		unregisterSidebarPanel: async (panelId: string): Promise<void> => {
			panels.delete(panelId);
			if (mockFn) mockFn();
		},
	};
}

/**
 * Mock implementation of EditorAPI
 */
export function createMockEditorAPI(mockFn?: MockFn): EditorAPI {
	const extensions = new Map<string, EditorExtensionOptions>();
	let content: JSONContent = { type: "doc", content: [] };
	let selection: EditorSelection | null = null;

	return {
		registerExtension: async (
			options: EditorExtensionOptions,
		): Promise<void> => {
			extensions.set(options.id, options);
			if (mockFn) mockFn();
		},
		unregisterExtension: async (extensionId: string): Promise<void> => {
			extensions.delete(extensionId);
			if (mockFn) mockFn();
		},
		executeCommand: async (
			command: string,
			...args: unknown[]
		): Promise<unknown> => {
			if (mockFn) mockFn(command, ...args);
			return undefined;
		},
		getContent: async (editorId?: string): Promise<JSONContent> => {
			if (mockFn) mockFn(editorId);
			return content;
		},
		setContent: async (
			newContent: JSONContent,
			editorId?: string,
		): Promise<void> => {
			content = newContent;
			if (mockFn) mockFn(newContent, editorId);
		},
		getSelection: async (
			editorId?: string,
		): Promise<EditorSelection | null> => {
			if (mockFn) mockFn(editorId);
			return selection;
		},
		setSelection: async (
			from: number,
			to: number,
			editorId?: string,
		): Promise<void> => {
			selection = { from, to };
			if (mockFn) mockFn(from, to, editorId);
		},
		canExecuteCommand: async (
			command: string,
			editorId?: string,
		): Promise<boolean> => {
			if (mockFn) mockFn(command, editorId);
			return true;
		},
	};
}

/**
 * Mock implementation of AIAPI
 */
export function createMockAIAPI(mockFn?: MockFn): AIAPI {
	const generators = new Map<string, QuestionGeneratorOptions>();
	const templates = new Map<string, PromptTemplateOptions>();
	const analyzers = new Map<string, ContentAnalyzerOptions>();

	return {
		registerQuestionGenerator: async (
			options: QuestionGeneratorOptions,
		): Promise<void> => {
			generators.set(options.id, options);
			if (mockFn) mockFn();
		},
		unregisterQuestionGenerator: async (generatorId: string): Promise<void> => {
			generators.delete(generatorId);
			if (mockFn) mockFn();
		},
		registerPromptTemplate: async (
			options: PromptTemplateOptions,
		): Promise<void> => {
			templates.set(options.id, options);
			if (mockFn) mockFn();
		},
		unregisterPromptTemplate: async (templateId: string): Promise<void> => {
			templates.delete(templateId);
			if (mockFn) mockFn();
		},
		registerContentAnalyzer: async (
			options: ContentAnalyzerOptions,
		): Promise<void> => {
			analyzers.set(options.id, options);
			if (mockFn) mockFn();
		},
		unregisterContentAnalyzer: async (analyzerId: string): Promise<void> => {
			analyzers.delete(analyzerId);
			if (mockFn) mockFn();
		},
	};
}

/**
 * Mock implementation of DataAPI
 */
export function createMockDataAPI(mockFn?: MockFn): DataAPI {
	const importers = new Map<string, ImporterOptions>();
	const exporters = new Map<string, ExporterOptions>();
	const transformers = new Map<string, TransformerOptions>();

	return {
		registerImporter: async (options: ImporterOptions): Promise<void> => {
			importers.set(options.id, options);
			if (mockFn) mockFn();
		},
		unregisterImporter: async (importerId: string): Promise<void> => {
			importers.delete(importerId);
			if (mockFn) mockFn();
		},
		registerExporter: async (options: ExporterOptions): Promise<void> => {
			exporters.set(options.id, options);
			if (mockFn) mockFn();
		},
		unregisterExporter: async (exporterId: string): Promise<void> => {
			exporters.delete(exporterId);
			if (mockFn) mockFn();
		},
		registerTransformer: async (options: TransformerOptions): Promise<void> => {
			transformers.set(options.id, options);
			if (mockFn) mockFn();
		},
		unregisterTransformer: async (transformerId: string): Promise<void> => {
			transformers.delete(transformerId);
			if (mockFn) mockFn();
		},
	};
}

/**
 * Mock implementation of IntegrationAPI
 */
export function createMockIntegrationAPI(mockFn?: MockFn): IntegrationAPI {
	return {
		registerOAuthProvider: async (): Promise<void> => {
			if (mockFn) mockFn();
		},
		unregisterOAuthProvider: async (): Promise<void> => {
			if (mockFn) mockFn();
		},
		registerWebhook: async (): Promise<void> => {
			if (mockFn) mockFn();
		},
		unregisterWebhook: async (): Promise<void> => {
			if (mockFn) mockFn();
		},
		registerExternalAPI: async (): Promise<void> => {
			if (mockFn) mockFn();
		},
		unregisterExternalAPI: async (): Promise<void> => {
			if (mockFn) mockFn();
		},
		callExternalAPI: async (
			apiId: string | undefined,
			options: ExternalAPIRequestOptions,
		): Promise<ExternalAPIResponse> => {
			if (mockFn) mockFn(apiId, options);
			return {
				status: 200,
				statusText: "OK",
				data: {},
			};
		},
	};
}

/**
 * Mock implementation of CalendarAPI
 */
export function createMockCalendarAPI(mockFn?: MockFn): CalendarAPI {
	return {
		registerExtension: async (): Promise<void> => {
			if (mockFn) mockFn();
		},
		unregisterExtension: async (): Promise<void> => {
			if (mockFn) mockFn();
		},
	};
}

/**
 * Create a complete mock PluginAPI
 */
export function createMockPluginAPI(mockFn?: MockFn): PluginAPI {
	return {
		app: createMockAppAPI(),
		storage: createMockStorageAPI(),
		notifications: createMockNotificationsAPI(mockFn),
		ui: createMockUIAPI(mockFn),
		editor: createMockEditorAPI(mockFn),
		ai: createMockAIAPI(mockFn),
		data: createMockDataAPI(mockFn),
		integration: createMockIntegrationAPI(mockFn),
		calendar: createMockCalendarAPI(mockFn),
	};
}

/**
 * Helper function to activate a plugin with mock API
 */
export async function activatePluginWithMockAPI<T = unknown>(
	activateFn: (api: PluginAPI, config?: Record<string, unknown>) => Promise<T>,
	config?: Record<string, unknown>,
	mockFn?: MockFn,
): Promise<T> {
	const api = createMockPluginAPI(mockFn);
	return await activateFn(api, config);
}

/**
 * Helper function to test plugin disposal
 */
export async function testPluginDisposal(
	activateFn: (
		api: PluginAPI,
		config?: Record<string, unknown>,
	) => Promise<{ dispose?: () => void | Promise<void> }>,
	config?: Record<string, unknown>,
): Promise<void> {
	const api = createMockPluginAPI();
	const result = await activateFn(api, config);

	if (result.dispose) {
		await result.dispose();
	}
}

/**
 * Helper function to wait for async operations
 */
export function wait(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Helper function to create test plugin configuration
 */
export function createTestConfig(
	overrides?: Record<string, unknown>,
): Record<string, unknown> {
	return {
		test: true,
		...overrides,
	};
}
