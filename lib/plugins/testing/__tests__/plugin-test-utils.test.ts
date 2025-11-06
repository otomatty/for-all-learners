/**
 * Plugin Test Utils Tests
 *
 * Unit tests for the plugin test utilities.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ (test runner)
 *
 * Dependencies:
 *   ├─ lib/plugins/testing/plugin-test-utils.ts
 *   └─ vitest (runtime dependency)
 *
 * Related Documentation:
 *   ├─ Plan: docs/03_plans/plugin-system/phase4-development-tools.md
 *   └─ Guide: docs/guides/plugin-development/best-practices.md
 */

import { describe, expect, it } from "vitest";
import {
	activatePluginWithMockAPI,
	createMockAppAPI,
	createMockCalendarAPI,
	createMockDataAPI,
	createMockEditorAPI,
	createMockIntegrationAPI,
	createMockNotificationsAPI,
	createMockPluginAPI,
	createMockStorageAPI,
	createMockUIAPI,
	createTestConfig,
	testPluginDisposal,
	wait,
} from "../plugin-test-utils";

describe("plugin-test-utils", () => {
	describe("createMockAppAPI", () => {
		it("should create AppAPI with correct methods", () => {
			const api = createMockAppAPI();

			expect(api.getVersion()).toBe("1.0.0");
			expect(api.getName()).toBe("F.A.L Test");
		});

		it("should return user ID asynchronously", async () => {
			const api = createMockAppAPI();
			const userId = await api.getUserId();

			expect(userId).toBe("test-user-123");
		});
	});

	describe("createMockStorageAPI", () => {
		it("should store and retrieve values", async () => {
			const api = createMockStorageAPI();

			await api.set("test-key", "test-value");
			const value = await api.get<string>("test-key");

			expect(value).toBe("test-value");
		});

		it("should return undefined for non-existent keys", async () => {
			const api = createMockStorageAPI();
			const value = await api.get("non-existent");

			expect(value).toBeUndefined();
		});

		it("should delete values", async () => {
			const api = createMockStorageAPI();

			await api.set("test-key", "test-value");
			await api.delete("test-key");
			const value = await api.get("test-key");

			expect(value).toBeUndefined();
		});

		it("should return all keys", async () => {
			const api = createMockStorageAPI();

			await api.set("key1", "value1");
			await api.set("key2", "value2");
			const keys = await api.keys();

			expect(keys).toContain("key1");
			expect(keys).toContain("key2");
		});

		it("should clear all values", async () => {
			const api = createMockStorageAPI();

			await api.set("key1", "value1");
			await api.set("key2", "value2");
			await api.clear();
			const keys = await api.keys();

			expect(keys).toHaveLength(0);
		});
	});

	describe("createMockNotificationsAPI", () => {
		it("should create NotificationsAPI with all methods", () => {
			const api = createMockNotificationsAPI();

			expect(api.show).toBeDefined();
			expect(api.info).toBeDefined();
			expect(api.success).toBeDefined();
			expect(api.error).toBeDefined();
			expect(api.warning).toBeDefined();
		});

		it("should call methods without error", () => {
			const api = createMockNotificationsAPI();

			api.show("Test message", "info");
			api.info("Info message");
			api.success("Success message");
			api.error("Error message");
			api.warning("Warning message");
		});
	});

	describe("createMockUIAPI", () => {
		it("should register and unregister commands", async () => {
			const api = createMockUIAPI();

			const command = {
				id: "test-command",
				label: "Test Command",
				handler: async () => {},
			};

			await api.registerCommand(command);
			await api.unregisterCommand("test-command");
		});

		it("should show dialog", async () => {
			const api = createMockUIAPI();

			const result = await api.showDialog({
				title: "Test",
				message: "Test message",
			});

			expect(result).toBe("ok");
		});
	});

	describe("createMockEditorAPI", () => {
		it("should get and set content", async () => {
			const api = createMockEditorAPI();

			const content = { type: "doc", content: [] };
			await api.setContent(content);
			const retrieved = await api.getContent();

			expect(retrieved).toEqual(content);
		});

		it("should get and set selection", async () => {
			const api = createMockEditorAPI();

			await api.setSelection(5, 10);
			const selection = await api.getSelection();

			expect(selection).toEqual({ from: 5, to: 10, text: "" });
		});

		it("should execute commands", async () => {
			const api = createMockEditorAPI();

			const result = await api.executeCommand("toggleBold");

			expect(result).toBeUndefined();
		});
	});

	describe("createMockPluginAPI", () => {
		it("should create complete PluginAPI", () => {
			const api = createMockPluginAPI();

			expect(api.app).toBeDefined();
			expect(api.storage).toBeDefined();
			expect(api.notifications).toBeDefined();
			expect(api.ui).toBeDefined();
			expect(api.editor).toBeDefined();
			expect(api.ai).toBeDefined();
			expect(api.data).toBeDefined();
			expect(api.integration).toBeDefined();
			expect(api.calendar).toBeDefined();
		});
	});

	describe("activatePluginWithMockAPI", () => {
		it("should activate plugin with mock API", async () => {
			const activateFn = async (api: typeof createMockPluginAPI extends () => infer T ? T : never) => {
				await api.storage.set("test", "value");
				return { success: true };
			};

			const result = await activatePluginWithMockAPI(activateFn);

			expect(result).toEqual({ success: true });
		});
	});

	describe("testPluginDisposal", () => {
		it("should call dispose function", async () => {
			let disposed = false;
			const activateFn = async () => ({
				dispose: async () => {
					disposed = true;
				},
			});

			await testPluginDisposal(activateFn);

			expect(disposed).toBe(true);
		});

		it("should handle plugin without dispose", async () => {
			const activateFn = async () => ({});

			await expect(testPluginDisposal(activateFn)).resolves.not.toThrow();
		});
	});

	describe("wait", () => {
		it("should wait for specified time", async () => {
			const start = Date.now();
			await wait(100);
			const end = Date.now();

			expect(end - start).toBeGreaterThanOrEqual(90); // Allow some margin
		});
	});

	describe("createTestConfig", () => {
		it("should create test config", () => {
			const config = createTestConfig();

			expect(config.test).toBe(true);
		});

		it("should merge with overrides", () => {
			const config = createTestConfig({ custom: "value" });

			expect(config.test).toBe(true);
			expect(config.custom).toBe("value");
		});
	});
});

