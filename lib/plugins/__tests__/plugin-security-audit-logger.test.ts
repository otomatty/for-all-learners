/**
 * Plugin Security Audit Logger Tests
 *
 * Unit tests for plugin security audit logging functionality.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as loggerModule from "@/lib/logger";
import * as adminClientModule from "@/lib/supabase/adminClient";
import { getPluginSecurityAuditLogger } from "../plugin-security-audit-logger";

// Mock admin client
vi.mock("@/lib/supabase/adminClient", () => {
	const mockInsert = vi.fn().mockResolvedValue({
		error: null,
	});

	const mockFrom = vi.fn().mockReturnValue({
		insert: mockInsert,
	});

	return {
		createAdminClient: vi.fn(() => ({
			from: mockFrom,
		})),
		__mockInsert: mockInsert,
		__mockFrom: mockFrom,
	};
});

describe("PluginSecurityAuditLogger", () => {
	const auditLogger = getPluginSecurityAuditLogger();
	let infoSpy: ReturnType<typeof vi.spyOn>;
	let warnSpy: ReturnType<typeof vi.spyOn>;
	let errorSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		infoSpy = vi.spyOn(loggerModule.default, "info") as unknown as ReturnType<
			typeof vi.spyOn
		>;
		warnSpy = vi.spyOn(loggerModule.default, "warn") as unknown as ReturnType<
			typeof vi.spyOn
		>;
		errorSpy = vi.spyOn(loggerModule.default, "error") as unknown as ReturnType<
			typeof vi.spyOn
		>;
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("logAPICall", () => {
		it("should log successful API call", () => {
			auditLogger.logAPICall(
				"test-plugin",
				"storage",
				"get",
				["key1"],
				"req-1",
				true,
			);

			expect(infoSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					audit: true,
					eventType: "api_call",
					severity: "low",
					pluginId: "test-plugin",
					namespace: "storage",
					method: "get",
					requestId: "req-1",
					success: true,
				}),
				expect.stringContaining("Plugin API call"),
			);
		});

		it("should log failed API call", () => {
			auditLogger.logAPICall(
				"test-plugin",
				"storage",
				"set",
				["key1", "value1"],
				"req-2",
				false,
				undefined,
				"Storage quota exceeded",
			);

			expect(warnSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					audit: true,
					eventType: "api_call_failed",
					severity: "medium",
					pluginId: "test-plugin",
					namespace: "storage",
					method: "set",
					success: false,
					error: "Storage quota exceeded",
				}),
				expect.stringContaining("Plugin API call failed"),
			);
		});

		it("should sanitize arguments", () => {
			const longString = "a".repeat(200);
			auditLogger.logAPICall(
				"test-plugin",
				"storage",
				"set",
				[longString],
				"req-3",
				true,
			);

			const call = infoSpy.mock.calls[0][0] as Record<string, unknown>;
			expect(call.argsSummary).toContain("...");
			expect(String(call.argsSummary).length).toBeLessThan(300);
		});
	});

	describe("logRateLimitViolation", () => {
		it("should log rate limit violation", () => {
			auditLogger.logRateLimitViolation(
				"test-plugin",
				"Per-minute API call limit exceeded",
				"user-1",
				5000,
				61,
				60,
			);

			expect(errorSpy).toHaveBeenCalled();
			const calls = errorSpy.mock.calls;
			const violationCall = calls.find(
				(call) =>
					(call[0] as Record<string, unknown>)?.eventType ===
					"rate_limit_violation",
			);
			expect(violationCall).toBeDefined();
			if (violationCall) {
				expect(violationCall[0]).toMatchObject({
					audit: true,
					eventType: "rate_limit_violation",
					severity: "high",
					pluginId: "test-plugin",
					userId: "user-1",
					reason: "Per-minute API call limit exceeded",
					retryAfter: 5000,
					currentCallCount: 61,
					limit: 60,
				});
				expect(violationCall[1]).toContain("Plugin rate limit violated");
			}
		});
	});

	describe("logExecutionTimeout", () => {
		it("should log execution timeout", () => {
			auditLogger.logExecutionTimeout(
				"test-plugin",
				300000,
				300000,
				"Maximum execution time exceeded",
			);

			expect(errorSpy).toHaveBeenCalled();
			const calls = errorSpy.mock.calls;
			const timeoutCall = calls.find(
				(call) =>
					(call[0] as Record<string, unknown>)?.eventType ===
					"execution_timeout",
			);
			expect(timeoutCall).toBeDefined();
			if (timeoutCall) {
				expect(timeoutCall[0]).toMatchObject({
					audit: true,
					eventType: "execution_timeout",
					severity: "high",
					pluginId: "test-plugin",
					executionTime: 300000,
					maxExecutionTime: 300000,
					reason: "Maximum execution time exceeded",
				});
				expect(timeoutCall[1]).toContain("Plugin execution timeout");
			}
		});
	});

	describe("logStorageAccess", () => {
		it("should log storage access", () => {
			auditLogger.logStorageAccess("test-plugin", "get", "user-1", "key1");

			expect(infoSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					audit: true,
					eventType: "storage_access",
					severity: "low",
					pluginId: "test-plugin",
					userId: "user-1",
					operation: "get",
					storageKey: "key1",
				}),
				expect.stringContaining("Plugin storage access"),
			);
		});

		it("should log storage quota exceeded", () => {
			auditLogger.logStorageAccess(
				"test-plugin",
				"set",
				"user-1",
				"key1",
				11 * 1024 * 1024,
				10 * 1024 * 1024,
			);

			expect(errorSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					audit: true,
					eventType: "storage_quota_exceeded",
					severity: "high",
					pluginId: "test-plugin",
					operation: "set",
					storageSize: 11 * 1024 * 1024,
					maxStorageQuota: 10 * 1024 * 1024,
				}),
				expect.stringContaining("Plugin storage quota exceeded"),
			);
		});
	});

	describe("logPluginError", () => {
		it("should log plugin error", () => {
			const errorStack = "Error: Test error\n    at test.js:1:1";
			auditLogger.logPluginError(
				"test-plugin",
				"Test error",
				"user-1",
				errorStack,
			);

			expect(warnSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					audit: true,
					eventType: "plugin_error",
					severity: "medium",
					pluginId: "test-plugin",
					userId: "user-1",
					errorMessage: "Test error",
					errorStack,
				}),
				expect.stringContaining("Plugin error"),
			);
		});
	});

	describe("logPluginTerminated", () => {
		it("should log plugin termination", () => {
			auditLogger.logPluginTerminated(
				"test-plugin",
				"Maximum execution time exceeded",
				300000,
				"user-1",
			);

			expect(errorSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					audit: true,
					eventType: "plugin_terminated",
					severity: "high",
					pluginId: "test-plugin",
					userId: "user-1",
					reason: "Maximum execution time exceeded",
					executionTime: 300000,
				}),
				expect.stringContaining("Plugin terminated"),
			);
		});
	});

	describe("Database persistence", () => {
		it("should save audit event to database", async () => {
			const mockInsert = (
				adminClientModule as unknown as {
					__mockInsert: ReturnType<typeof vi.fn>;
				}
			).__mockInsert;

			auditLogger.logAPICall(
				"test-plugin",
				"storage",
				"get",
				["key1"],
				"req-1",
				true,
			);

			// Wait for async database save
			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(mockInsert).toHaveBeenCalled();
			const insertCall = mockInsert.mock.calls[0][0];
			expect(insertCall).toMatchObject({
				plugin_id: "test-plugin",
				event_type: "api_call",
				severity: "low",
			});
		});

		it("should handle database save errors gracefully", async () => {
			const mockInsert = (
				adminClientModule as unknown as {
					__mockInsert: ReturnType<typeof vi.fn>;
				}
			).__mockInsert;

			// Mock database error
			mockInsert.mockResolvedValueOnce({
				error: { message: "Database connection failed" },
			});

			auditLogger.logAPICall(
				"test-plugin",
				"storage",
				"get",
				["key1"],
				"req-1",
				true,
			);

			// Wait for async database save and error handling
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Logger should still be called even if database save fails
			expect(infoSpy).toHaveBeenCalled();
			// Error should be logged
			expect(errorSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					pluginId: "test-plugin",
					eventType: "api_call",
				}),
				expect.stringContaining("Failed to save security audit log"),
			);
		});

		it("should save event data correctly", async () => {
			const mockInsert = (
				adminClientModule as unknown as {
					__mockInsert: ReturnType<typeof vi.fn>;
				}
			).__mockInsert;

			auditLogger.logRateLimitViolation(
				"test-plugin",
				"Rate limit exceeded",
				"user-1",
				5000,
				61,
				60,
			);

			// Wait for async database save
			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(mockInsert).toHaveBeenCalled();
			const insertCall = mockInsert.mock.calls[0][0];
			expect(insertCall.event_data).toMatchObject({
				reason: "Rate limit exceeded",
				retryAfter: 5000,
				currentCallCount: 61,
				limit: 60,
			});
		});

		it("should save context data correctly", async () => {
			const mockInsert = (
				adminClientModule as unknown as {
					__mockInsert: ReturnType<typeof vi.fn>;
				}
			).__mockInsert;

			auditLogger.logAPICall(
				"test-plugin",
				"storage",
				"get",
				["key1"],
				"req-1",
				true,
				"user-1",
			);

			// Wait for async database save
			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(mockInsert).toHaveBeenCalled();
			const insertCall = mockInsert.mock.calls[0][0];
			expect(insertCall.user_id).toBe("user-1");
			expect(insertCall.context).toEqual({});
		});
	});
});
