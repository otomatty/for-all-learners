/**
 * Debug Tools Tests
 *
 * Unit tests for the plugin debug tools.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ (test runner)
 *
 * Dependencies:
 *   ├─ lib/plugins/debug-tools.ts
 *   └─ lib/plugins/plugin-registry.ts
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/phase4-development-tools.md
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LoadedPlugin, PluginManifest } from "@/types/plugin";
import {
	clearPluginErrors,
	clearPluginLogs,
	getAllPluginsDebugInfo,
	getPluginDebugInfo,
	getPluginErrors,
	getPluginLogs,
	logPluginError,
	logPluginMessage,
} from "../debug-tools";
import { PluginRegistry } from "../plugin-registry";

// Mock logger
vi.mock("@/lib/logger", () => ({
	default: {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn(),
	},
}));

// Mock plugin execution monitor
vi.mock("../plugin-execution-monitor", () => ({
	getPluginExecutionMonitor: vi.fn(() => ({
		startMonitoring: vi.fn(),
		stopMonitoring: vi.fn(),
		updateActivity: vi.fn(),
	})),
}));

describe("Debug Tools", () => {
	let registry: PluginRegistry;

	const createMockManifest = (id: string): PluginManifest => ({
		id,
		name: `Test Plugin ${id}`,
		version: "1.0.0",
		description: "A test plugin",
		author: "Test Author",
		main: "dist/index.js",
		extensionPoints: {
			editor: true,
		},
	});

	const createMockPlugin = (id: string, enabled = true): LoadedPlugin => ({
		manifest: createMockManifest(id),
		enabled,
		loadedAt: new Date(),
	});

	beforeEach(() => {
		registry = PluginRegistry.getInstance();
		// Clear all logs and errors
		clearPluginLogs();
		clearPluginErrors();
	});

	afterEach(() => {
		registry.clear();
		PluginRegistry.reset();
		clearPluginLogs();
		clearPluginErrors();
	});

	describe("logPluginMessage", () => {
		it("should log info message", () => {
			logPluginMessage("test-plugin", "info", "Test message");

			const logs = getPluginLogs("test-plugin");
			expect(logs).toHaveLength(1);
			expect(logs[0]).toMatchObject({
				level: "info",
				message: "Test message",
			});
		});

		it("should log error message", () => {
			logPluginMessage("test-plugin", "error", "Error message");

			const logs = getPluginLogs("test-plugin");
			expect(logs).toHaveLength(1);
			expect(logs[0]).toMatchObject({
				level: "error",
				message: "Error message",
			});
		});

		it("should log warn message", () => {
			logPluginMessage("test-plugin", "warn", "Warning message");

			const logs = getPluginLogs("test-plugin");
			expect(logs).toHaveLength(1);
			expect(logs[0]).toMatchObject({
				level: "warn",
				message: "Warning message",
			});
		});

		it("should log debug message", () => {
			logPluginMessage("test-plugin", "debug", "Debug message");

			const logs = getPluginLogs("test-plugin");
			expect(logs).toHaveLength(1);
			expect(logs[0]).toMatchObject({
				level: "debug",
				message: "Debug message",
			});
		});

		it("should include data in log entry", () => {
			const data = { key: "value", count: 42 };
			logPluginMessage("test-plugin", "info", "Test message", data);

			const logs = getPluginLogs("test-plugin");
			expect(logs[0].data).toEqual(data);
		});

		it("should limit logs per plugin", () => {
			// Log more than maxLogsPerPlugin (1000)
			for (let i = 0; i < 1001; i++) {
				logPluginMessage("test-plugin", "info", `Message ${i}`);
			}

			const logs = getPluginLogs("test-plugin");
			expect(logs.length).toBeLessThanOrEqual(1000);
			// Should keep the most recent logs
			expect(logs[logs.length - 1].message).toBe("Message 1000");
		});
	});

	describe("logPluginError", () => {
		it("should log error with message", () => {
			logPluginError("test-plugin", "Test error", undefined, "Test Plugin");

			const errors = getPluginErrors("test-plugin");
			expect(errors).toHaveLength(1);
			expect(errors[0]).toMatchObject({
				pluginId: "test-plugin",
				pluginName: "Test Plugin",
				message: "Test error",
			});
		});

		it("should log error with stack trace", () => {
			const stack = "Error: Test error\n    at test.ts:1:1";
			logPluginError("test-plugin", "Test error", stack, "Test Plugin");

			const errors = getPluginErrors("test-plugin");
			expect(errors[0].stack).toBe(stack);
		});

		it("should limit errors per plugin", () => {
			// Log more than maxErrorsPerPlugin (100)
			for (let i = 0; i < 101; i++) {
				logPluginError("test-plugin", `Error ${i}`);
			}

			const errors = getPluginErrors("test-plugin");
			expect(errors.length).toBeLessThanOrEqual(100);
			// Should keep the most recent errors
			expect(errors[errors.length - 1].message).toBe("Error 100");
		});
	});

	describe("getPluginLogs", () => {
		it("should return logs for plugin", () => {
			logPluginMessage("test-plugin", "info", "Message 1");
			logPluginMessage("test-plugin", "warn", "Message 2");
			logPluginMessage("test-plugin", "error", "Message 3");

			const logs = getPluginLogs("test-plugin");
			expect(logs).toHaveLength(3);
		});

		it("should return empty array for non-existent plugin", () => {
			const logs = getPluginLogs("non-existent-plugin");
			expect(logs).toEqual([]);
		});

		it("should respect limit parameter", () => {
			for (let i = 0; i < 10; i++) {
				logPluginMessage("test-plugin", "info", `Message ${i}`);
			}

			const logs = getPluginLogs("test-plugin", 5);
			expect(logs).toHaveLength(5);
			// Should return the most recent 5 logs
			expect(logs[0].message).toBe("Message 5");
			expect(logs[4].message).toBe("Message 9");
		});
	});

	describe("getPluginErrors", () => {
		it("should return errors for plugin", () => {
			logPluginError("test-plugin", "Error 1");
			logPluginError("test-plugin", "Error 2");

			const errors = getPluginErrors("test-plugin");
			expect(errors).toHaveLength(2);
		});

		it("should return empty array for non-existent plugin", () => {
			const errors = getPluginErrors("non-existent-plugin");
			expect(errors).toEqual([]);
		});

		it("should respect limit parameter", () => {
			for (let i = 0; i < 10; i++) {
				logPluginError("test-plugin", `Error ${i}`);
			}

			const errors = getPluginErrors("test-plugin", 5);
			expect(errors).toHaveLength(5);
			// Should return the most recent 5 errors
			expect(errors[0].message).toBe("Error 5");
			expect(errors[4].message).toBe("Error 9");
		});
	});

	describe("clearPluginLogs", () => {
		it("should clear logs for specific plugin", () => {
			logPluginMessage("plugin-1", "info", "Message 1");
			logPluginMessage("plugin-2", "info", "Message 2");

			clearPluginLogs("plugin-1");

			expect(getPluginLogs("plugin-1")).toEqual([]);
			expect(getPluginLogs("plugin-2")).toHaveLength(1);
		});

		it("should clear all logs when no pluginId provided", () => {
			logPluginMessage("plugin-1", "info", "Message 1");
			logPluginMessage("plugin-2", "info", "Message 2");

			clearPluginLogs();

			expect(getPluginLogs("plugin-1")).toEqual([]);
			expect(getPluginLogs("plugin-2")).toEqual([]);
		});
	});

	describe("clearPluginErrors", () => {
		it("should clear errors for specific plugin", () => {
			logPluginError("plugin-1", "Error 1");
			logPluginError("plugin-2", "Error 2");

			clearPluginErrors("plugin-1");

			expect(getPluginErrors("plugin-1")).toEqual([]);
			expect(getPluginErrors("plugin-2")).toHaveLength(1);
		});

		it("should clear all errors when no pluginId provided", () => {
			logPluginError("plugin-1", "Error 1");
			logPluginError("plugin-2", "Error 2");

			clearPluginErrors();

			expect(getPluginErrors("plugin-1")).toEqual([]);
			expect(getPluginErrors("plugin-2")).toEqual([]);
		});
	});

	describe("getPluginDebugInfo", () => {
		it("should return debug info for loaded plugin", () => {
			const plugin = createMockPlugin("test-plugin");
			registry.register(plugin);

			logPluginMessage("test-plugin", "info", "Test log");
			logPluginError("test-plugin", "Test error");

			const debugInfo = getPluginDebugInfo("test-plugin");
			expect(debugInfo).not.toBeNull();
			expect(debugInfo?.plugin).toEqual(plugin);
			expect(debugInfo?.logs).toHaveLength(1);
			expect(debugInfo?.errors).toHaveLength(1);
			expect(debugInfo?.metrics.pluginId).toBe("test-plugin");
			expect(debugInfo?.metrics.errorCount).toBe(1);
		});

		it("should return null for non-loaded plugin", () => {
			const debugInfo = getPluginDebugInfo("non-existent-plugin");
			expect(debugInfo).toBeNull();
		});

		it("should include performance metrics in debug info", () => {
			const plugin = createMockPlugin("test-plugin");
			registry.register(plugin);

			const debugInfo = getPluginDebugInfo("test-plugin");
			expect(debugInfo?.metrics).toMatchObject({
				pluginId: "test-plugin",
				pluginName: "Test Plugin test-plugin",
				apiCallCount: 0,
				errorCount: 0,
			});
			expect(debugInfo?.metrics.loadTime).toBeGreaterThanOrEqual(0);
			expect(debugInfo?.metrics.totalExecutionTime).toBeGreaterThanOrEqual(0);
		});
	});

	describe("getAllPluginsDebugInfo", () => {
		it("should return debug info for all loaded plugins", () => {
			const plugin1 = createMockPlugin("plugin-1");
			const plugin2 = createMockPlugin("plugin-2");
			registry.register(plugin1);
			registry.register(plugin2);

			const debugInfos = getAllPluginsDebugInfo();
			expect(debugInfos).toHaveLength(2);
			expect(debugInfos.map((info) => info.plugin.manifest.id)).toEqual([
				"plugin-1",
				"plugin-2",
			]);
		});

		it("should return empty array when no plugins loaded", () => {
			const debugInfos = getAllPluginsDebugInfo();
			expect(debugInfos).toEqual([]);
		});

		it("should filter out null debug info", () => {
			const plugin = createMockPlugin("plugin-1");
			registry.register(plugin);
			// Unregister without clearing registry state
			registry.unregister("plugin-1");

			const debugInfos = getAllPluginsDebugInfo();
			// Should filter out null entries
			expect(debugInfos.every((info) => info !== null)).toBe(true);
		});
	});
});
