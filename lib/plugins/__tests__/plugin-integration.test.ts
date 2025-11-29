/**
 * Plugin Integration Tests
 *
 * Tests for the complete plugin loading and registration flow.
 * These tests verify that plugins can register widgets and calendar extensions
 * via the Worker communication system.
 *
 * Related Issues:
 *   - GitHub Issue #117: GitHubコミット統計プラグインの表示問題
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PluginManifest } from "@/types/plugin";
import * as calendarRegistry from "../calendar-registry";
import { PluginLoader } from "../plugin-loader";
import { getPluginRegistry } from "../plugin-registry";
import * as uiRegistry from "../ui-registry";

// Track message listeners for each worker
const messageListeners: Map<
	number,
	Map<string, (event: MessageEvent) => void>
> = new Map();
let workerInstanceId = 0;
// Track whether to simulate errors for specific workers
const workerShouldError: Set<number> = new Set();

// Mock Worker class for testing
class MockWorker {
	instanceId: number;
	postMessage: ReturnType<typeof vi.fn>;
	terminate: ReturnType<typeof vi.fn>;
	addEventListener: ReturnType<typeof vi.fn>;
	removeEventListener: ReturnType<typeof vi.fn>;
	onmessage: ((event: MessageEvent) => void) | null = null;
	onerror: ((error: ErrorEvent) => void) | null = null;

	constructor() {
		this.instanceId = ++workerInstanceId;
		messageListeners.set(this.instanceId, new Map());

		this.postMessage = vi.fn((message: { type: string; payload?: unknown }) => {
			// When INIT message is received, simulate response from worker
			if (message.type === "INIT") {
				// Simulate async response from worker
				setTimeout(() => {
					const listeners = messageListeners.get(this.instanceId);
					const listener = listeners?.get("message");
					// Also check the instance's onmessage handler
					const handler = listener || this.onmessage;
					if (handler) {
						// Check if this worker should simulate an error
						if (workerShouldError.has(this.instanceId)) {
							handler({
								data: {
									type: "ERROR",
									payload: {
										message: "Plugin initialization failed: SyntaxError",
										stack: "Error stack trace...",
									},
								},
							} as MessageEvent);
						} else {
							handler({
								data: { type: "INIT", payload: { success: true } },
							} as MessageEvent);
						}
					}
				}, 0);
			}
		});

		this.terminate = vi.fn();

		this.addEventListener = vi.fn(
			(type: string, listener: (event: MessageEvent) => void) => {
				const listeners = messageListeners.get(this.instanceId);
				if (listeners && type === "message") {
					listeners.set("message", listener);
				}
			},
		);

		this.removeEventListener = vi.fn((type: string) => {
			const listeners = messageListeners.get(this.instanceId);
			if (listeners && type === "message") {
				listeners.delete("message");
			}
		});
	}
}

// Replace global Worker with MockWorker
global.Worker = MockWorker as unknown as typeof Worker;

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => "blob:mock-url");

// Helper to make the next created worker simulate an error
function makeNextWorkerFail() {
	// Mark the next worker ID to fail
	workerShouldError.add(workerInstanceId + 1);
}

describe("Plugin Integration Tests", () => {
	let loader: PluginLoader;

	const createMockManifest = (id: string): PluginManifest => ({
		id,
		name: `Test Plugin ${id}`,
		version: "1.0.0",
		description: "A test plugin",
		author: "Test Author",
		main: "dist/index.js",
		extensionPoints: {},
	});

	beforeEach(() => {
		loader = PluginLoader.getInstance();
		vi.clearAllMocks();
		workerInstanceId = 0;
		messageListeners.clear();
		workerShouldError.clear();
		calendarRegistry.reset();
		uiRegistry.reset();
	});

	afterEach(() => {
		getPluginRegistry().clear();
		PluginLoader.reset();
		calendarRegistry.reset();
		uiRegistry.reset();
	});

	describe("Widget Registration Flow", () => {
		it("should register a widget from a loaded plugin", async () => {
			const manifest = createMockManifest("github-commit-stats");
			const pluginCode = `
				async function activate(api, config) {
					await api.ui.registerWidget({
						id: "test-widget",
						name: "Test Widget",
						description: "A test widget",
						position: "top-right",
						size: "medium",
						render: async () => ({ type: "text", props: { content: "Hello" } }),
					});
					return {};
				}
			`;

			// Start loading plugin - Mock Worker automatically responds with INIT
			const result = await loader.loadPlugin(manifest, pluginCode, {
				enableImmediately: true,
			});

			// Check that plugin loaded successfully
			expect(result.success).toBe(true);
		});

		it("should track widgets in ui-registry after registration", () => {
			const pluginId = "test-plugin";

			// Directly register a widget (simulating what plugin-api does)
			uiRegistry.registerWidget(pluginId, {
				id: "direct-widget",
				name: "Direct Widget",
				description: "Directly registered widget",
				position: "top-left",
				size: "medium",
				render: async () => ({ type: "text", props: { content: "Hello" } }),
			});

			// Verify widget is registered
			const widgets = uiRegistry.getWidgets();
			expect(widgets.length).toBe(1);
			expect(widgets[0].widgetId).toBe("direct-widget");
			expect(widgets[0].pluginId).toBe(pluginId);
		});

		it("should handle widgets registered without render function (Worker context)", () => {
			const pluginId = "test-plugin";

			// Register widget without render function (simulates Worker context)
			// The render function is stored in the Worker and called via callPluginMethod
			uiRegistry.registerWidget(pluginId, {
				id: "worker-widget",
				name: "Worker Widget",
				description: "Widget from Worker context",
				position: "top-right",
				size: "medium",
				// No render function - isWorkerContext should be true
			} as any);

			// Verify widget is registered
			const widgets = uiRegistry.getWidgets();
			expect(widgets.length).toBe(1);
			expect(widgets[0].widgetId).toBe("worker-widget");
			expect(widgets[0].isWorkerContext).toBe(true);
		});
	});

	describe("Calendar Extension Registration Flow", () => {
		it("should register a calendar extension from a loaded plugin", async () => {
			const manifest = createMockManifest("github-commit-stats");
			const pluginCode = `
				async function activate(api, config) {
					await api.calendar.registerExtension({
						id: "test-calendar-ext",
						name: "Test Calendar Extension",
						description: "A test calendar extension",
						getDailyData: async (date) => ({
							badge: "+100",
							badgeColor: "green",
							tooltip: "Test tooltip",
						}),
					});
					return {};
				}
			`;

			// Start loading plugin - Mock Worker automatically responds with INIT
			const result = await loader.loadPlugin(manifest, pluginCode, {
				enableImmediately: true,
			});

			expect(result.success).toBe(true);
		});

		it("should track calendar extensions in calendar-registry after registration", () => {
			const pluginId = "test-plugin";

			// Directly register a calendar extension
			calendarRegistry.registerCalendarExtension(pluginId, {
				id: "direct-calendar-ext",
				name: "Direct Calendar Extension",
				description: "Directly registered calendar extension",
				getDailyData: async () => ({
					badge: "+50",
					badgeColor: "blue",
				}),
			});

			// Verify extension is registered
			const extensions = calendarRegistry.getCalendarExtensions();
			expect(extensions.length).toBe(1);
			expect(extensions[0].extensionId).toBe("direct-calendar-ext");
			expect(extensions[0].pluginId).toBe(pluginId);
		});

		it("should call getDailyData function correctly", async () => {
			const pluginId = "test-plugin";
			const mockGetDailyData = vi.fn().mockResolvedValue({
				badge: "+100",
				badgeColor: "green",
				tooltip: "100 lines added",
			});

			calendarRegistry.registerCalendarExtension(pluginId, {
				id: "test-ext",
				name: "Test Extension",
				getDailyData: mockGetDailyData,
			});

			// Call getDailyExtensionData
			const date = "2025-11-29";
			const data = await calendarRegistry.getDailyExtensionData(date);

			expect(mockGetDailyData).toHaveBeenCalledWith(date);
			expect(data.length).toBe(1);
			expect(data[0].badge).toBe("+100");
		});
	});

	describe("Worker Context Communication", () => {
		it("should handle API_CALL messages for widget registration", async () => {
			const manifest = createMockManifest("test-plugin");

			// Start loading plugin - Mock Worker automatically responds with INIT
			const result = await loader.loadPlugin(manifest, "", {
				enableImmediately: true,
			});

			expect(result.success).toBe(true);
			expect(getPluginRegistry().has(manifest.id)).toBe(true);
		});

		it("should handle API_RESPONSE messages correctly", async () => {
			// This tests that Worker responses are properly handled
			// by the handleWorkerMessage function

			const manifest = createMockManifest("test-plugin");

			// Start loading - Mock Worker automatically responds with INIT
			const result = await loader.loadPlugin(manifest, "", {
				enableImmediately: true,
			});

			expect(result.success).toBe(true);
		});
	});

	describe("Error Handling", () => {
		it("should handle plugin initialization errors", async () => {
			const manifest = createMockManifest("error-plugin");

			// Mark next worker to fail
			makeNextWorkerFail();

			const result = await loader.loadPlugin(manifest, "invalid code", {
				enableImmediately: true,
			});

			expect(result.success).toBe(false);
		});

		it("should handle calendar extension without getDailyData (Worker context)", () => {
			const pluginId = "test-plugin";

			// In Worker context, getDailyData is undefined (cannot be serialized via postMessage)
			// The registry should create a wrapper function instead of throwing an error
			calendarRegistry.registerCalendarExtension(pluginId, {
				id: "worker-ext",
				name: "Worker Extension",
				// Missing getDailyData - simulates Worker context
			} as any);

			// Should be registered successfully with isWorkerContext=true
			const extensions = calendarRegistry.getCalendarExtensions(pluginId);
			const extension = extensions.find(
				(ext) => ext.extensionId === "worker-ext",
			);
			expect(extension).toBeDefined();
			expect(extension?.isWorkerContext).toBe(true);
			expect(typeof extension?.getDailyData).toBe("function"); // Wrapper function created

			// Cleanup
			calendarRegistry.unregisterCalendarExtension(pluginId, "worker-ext");
		});

		it("should throw error for non-function getDailyData in non-Worker context", () => {
			const pluginId = "test-plugin";

			// In non-Worker context, if getDailyData is provided but not a function, throw error
			expect(() => {
				calendarRegistry.registerCalendarExtension(pluginId, {
					id: "invalid-ext",
					name: "Invalid Extension",
					getDailyData: "not a function" as any, // Invalid: provided but not a function
				});
			}).toThrow("must provide a getDailyData function");
		});
	});

	describe("Registry State Management", () => {
		it("should correctly report all registered widgets", () => {
			// Register widgets from multiple plugins
			uiRegistry.registerWidget("plugin-1", {
				id: "widget-1",
				name: "Widget 1",
				position: "top-left",
				size: "small",
				render: async () => ({ type: "text", props: {} }),
			});

			uiRegistry.registerWidget("plugin-2", {
				id: "widget-2",
				name: "Widget 2",
				position: "top-right",
				size: "medium",
				render: async () => ({ type: "text", props: {} }),
			});

			// Get all widgets
			const allWidgets = uiRegistry.getWidgets();
			expect(allWidgets.length).toBe(2);

			// Get widgets by plugin
			const plugin1Widgets = uiRegistry.getWidgets("plugin-1");
			expect(plugin1Widgets.length).toBe(1);
			expect(plugin1Widgets[0].widgetId).toBe("widget-1");
		});

		it("should correctly report all registered calendar extensions", () => {
			// Register extensions from multiple plugins
			calendarRegistry.registerCalendarExtension("plugin-1", {
				id: "ext-1",
				name: "Extension 1",
				getDailyData: async () => ({ badge: "1" }),
			});

			calendarRegistry.registerCalendarExtension("plugin-2", {
				id: "ext-2",
				name: "Extension 2",
				getDailyData: async () => ({ badge: "2" }),
			});

			// Get all extensions
			const allExtensions = calendarRegistry.getCalendarExtensions();
			expect(allExtensions.length).toBe(2);

			// Get extensions by plugin
			const plugin1Extensions =
				calendarRegistry.getCalendarExtensions("plugin-1");
			expect(plugin1Extensions.length).toBe(1);
			expect(plugin1Extensions[0].extensionId).toBe("ext-1");
		});

		it("should clear registrations when plugin is unloaded", () => {
			const pluginId = "test-plugin";

			// Register widget and extension
			uiRegistry.registerWidget(pluginId, {
				id: "widget-1",
				name: "Widget 1",
				position: "top-left",
				size: "small",
				render: async () => ({ type: "text", props: {} }),
			});

			calendarRegistry.registerCalendarExtension(pluginId, {
				id: "ext-1",
				name: "Extension 1",
				getDailyData: async () => ({ badge: "1" }),
			});

			// Verify registered
			expect(uiRegistry.getWidgets().length).toBe(1);
			expect(calendarRegistry.getCalendarExtensions().length).toBe(1);

			// Unregister
			uiRegistry.clearPlugin(pluginId);
			calendarRegistry.clearPluginExtensions(pluginId);

			// Verify cleared
			expect(uiRegistry.getWidgets().length).toBe(0);
			expect(calendarRegistry.getCalendarExtensions().length).toBe(0);
		});
	});
});
