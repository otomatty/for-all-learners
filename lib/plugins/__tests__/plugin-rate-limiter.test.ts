/**
 * Plugin Rate Limiter Tests
 *
 * Unit tests for plugin rate limiting functionality.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getPluginRateLimiter } from "../plugin-rate-limiter";

describe("PluginRateLimiter", () => {
	let rateLimiter: ReturnType<typeof getPluginRateLimiter>;

	beforeEach(() => {
		rateLimiter = getPluginRateLimiter();
		rateLimiter.reset("test-plugin", "test-user");
	});

	afterEach(() => {
		rateLimiter.reset("test-plugin", "test-user");
	});

	describe("checkAPICall", () => {
		it("should allow API calls within limits", () => {
			const result = rateLimiter.checkAPICall("test-plugin", "test-user");
			expect(result.allowed).toBe(true);
		});

		it("should reject calls exceeding per-minute limit", () => {
			const pluginId = "test-plugin";
			const userId = "test-user";

			// Make maxCallsPerMinute + 1 calls rapidly
			const maxCalls = 60; // Default maxCallsPerMinute
			for (let i = 0; i < maxCalls; i++) {
				const result = rateLimiter.checkAPICall(pluginId, userId);
				expect(result.allowed).toBe(true);
				rateLimiter.recordAPICallComplete(pluginId, userId);
			}

			// Next call should be rejected
			const result = rateLimiter.checkAPICall(pluginId, userId);
			expect(result.allowed).toBe(false);
			expect(result.reason).toContain("Per-minute API call limit exceeded");
		});

		it("should reject calls exceeding concurrent limit", () => {
			const pluginId = "test-plugin";
			const userId = "test-user";

			// Make maxConcurrentCalls calls without completing
			const maxConcurrent = 10; // Default maxConcurrentCalls
			for (let i = 0; i < maxConcurrent; i++) {
				const result = rateLimiter.checkAPICall(pluginId, userId);
				expect(result.allowed).toBe(true);
				// Don't call recordAPICallComplete to simulate concurrent calls
			}

			// Next call should be rejected
			const result = rateLimiter.checkAPICall(pluginId, userId);
			expect(result.allowed).toBe(false);
			expect(result.reason).toContain("Too many concurrent API calls");
		});

		it("should allow calls after completing previous ones", () => {
			const pluginId = "test-plugin";
			const userId = "test-user";

			// Make concurrent calls
			for (let i = 0; i < 5; i++) {
				rateLimiter.checkAPICall(pluginId, userId);
			}

			// Complete some calls
			for (let i = 0; i < 3; i++) {
				rateLimiter.recordAPICallComplete(pluginId, userId);
			}

			// Should be able to make more calls now
			const result = rateLimiter.checkAPICall(pluginId, userId);
			expect(result.allowed).toBe(true);
		});

		it("should track calls per plugin separately", () => {
			const result1 = rateLimiter.checkAPICall("plugin-1", "user-1");
			const result2 = rateLimiter.checkAPICall("plugin-2", "user-1");

			expect(result1.allowed).toBe(true);
			expect(result2.allowed).toBe(true);
		});

		it("should use default userId when not provided", () => {
			const result = rateLimiter.checkAPICall("test-plugin");
			expect(result.allowed).toBe(true);
		});
	});

	describe("checkStorageQuota", () => {
		it("should allow storage within quota", () => {
			const result = rateLimiter.checkStorageQuota(
				"test-plugin",
				"test-user",
				1024,
			);
			expect(result.allowed).toBe(true);
		});

		it("should reject storage exceeding quota", () => {
			const pluginId = "test-plugin";
			const userId = "test-user";
			const maxBytes = 10 * 1024 * 1024; // 10MB default

			// Set storage to max
			rateLimiter.recordStorageUsage(pluginId, userId, maxBytes);

			// Try to add more
			const result = rateLimiter.checkStorageQuota(pluginId, userId, 1);
			expect(result.allowed).toBe(false);
			expect(result.reason).toContain("Storage quota exceeded");
		});

		it("should allow storage after clearing", () => {
			const pluginId = "test-plugin";
			const userId = "test-user";

			// Set storage to max
			rateLimiter.recordStorageUsage(pluginId, userId, 10 * 1024 * 1024);

			// Clear storage
			rateLimiter.recordStorageUsage(pluginId, userId, 0);

			// Should be able to store again
			const result = rateLimiter.checkStorageQuota(pluginId, userId, 1024);
			expect(result.allowed).toBe(true);
		});
	});

	describe("reset", () => {
		it("should reset rate limit state", () => {
			const pluginId = "test-plugin";
			const userId = "test-user";

			// Make some calls
			rateLimiter.checkAPICall(pluginId, userId);
			rateLimiter.recordStorageUsage(pluginId, userId, 1024);

			// Reset
			rateLimiter.reset(pluginId, userId);

			// State should be cleared
			const state = rateLimiter.getState(pluginId, userId);
			expect(state).toBeNull();
		});
	});
});
