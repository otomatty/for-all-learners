/**
 * GitHub API Client Tests
 *
 * Tests for GitHub API client functions and type guards.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ (test runner)
 *
 * Dependencies:
 *   ├─ plugins/examples/github-commit-stats/src/github-api.ts
 *   ├─ plugins/examples/github-commit-stats/src/concurrency.ts
 *   └─ vitest (runtime dependency)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/widget-calendar-extensions.md
 */

import type { MockedFunction } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createConcurrencyLimiter } from "./concurrency";
import {
	createGitHubAPIClient,
	isPlainObject,
	isStringRecord,
	normalizeGitHubResponse,
} from "./github-api";

type IntegrationAPI = Parameters<typeof createGitHubAPIClient>[1];

type MockIntegration = IntegrationAPI & {
	callExternalAPI: MockedFunction<IntegrationAPI["callExternalAPI"]>;
};

describe("GitHub API Client", () => {
	describe("isPlainObject", () => {
		it("should return true for plain objects", () => {
			expect(isPlainObject({})).toBe(true);
			expect(isPlainObject({ key: "value" })).toBe(true);
			expect(isPlainObject({ nested: { key: "value" } })).toBe(true);
		});

		it("should return false for non-objects", () => {
			expect(isPlainObject(null)).toBe(false);
			expect(isPlainObject(undefined)).toBe(false);
			expect(isPlainObject("string")).toBe(false);
			expect(isPlainObject(123)).toBe(false);
			expect(isPlainObject(true)).toBe(false);
			// Note: Arrays are objects in JavaScript, so isPlainObject returns true
			// This is expected behavior - use Array.isArray() to check for arrays
		});

		it("should return true for arrays (arrays are objects in JavaScript)", () => {
			// In JavaScript, typeof [] === "object", so isPlainObject returns true
			// This is expected behavior - use Array.isArray() to distinguish arrays
			expect(isPlainObject([])).toBe(true);
			expect(isPlainObject([1, 2, 3])).toBe(true);
		});
	});

	describe("isStringRecord", () => {
		it("should return true for records with string values", () => {
			expect(isStringRecord({})).toBe(true);
			expect(isStringRecord({ key: "value" })).toBe(true);
			expect(isStringRecord({ a: "1", b: "2" })).toBe(true);
		});

		it("should return false for records with non-string values", () => {
			expect(isStringRecord({ key: 123 })).toBe(false);
			expect(isStringRecord({ key: true })).toBe(false);
			expect(isStringRecord({ key: null })).toBe(false);
			expect(isStringRecord({ key: {} })).toBe(false);
		});

		it("should return false for non-objects", () => {
			expect(isStringRecord(null)).toBe(false);
			expect(isStringRecord(undefined)).toBe(false);
			expect(isStringRecord("string")).toBe(false);
			expect(isStringRecord(123)).toBe(false);
		});
	});

	describe("normalizeGitHubResponse", () => {
		it("should normalize valid response with data", () => {
			const response = {
				status: 200,
				data: { key: "value" },
				headers: { "content-type": "application/json" },
			};
			const normalized = normalizeGitHubResponse(response);
			expect(normalized).toEqual({
				status: 200,
				data: { key: "value" },
				headers: { "content-type": "application/json" },
			});
		});

		it("should normalize valid response with body instead of data", () => {
			const response = {
				status: 200,
				body: { key: "value" },
			};
			const normalized = normalizeGitHubResponse(response);
			expect(normalized).toEqual({
				status: 200,
				data: { key: "value" },
				headers: undefined,
			});
		});

		it("should return null for invalid response", () => {
			expect(normalizeGitHubResponse(null)).toBeNull();
			expect(normalizeGitHubResponse(undefined)).toBeNull();
			expect(normalizeGitHubResponse("string")).toBeNull();
			expect(normalizeGitHubResponse(123)).toBeNull();
			expect(normalizeGitHubResponse({})).toBeNull();
			expect(normalizeGitHubResponse({ status: "200" })).toBeNull();
		});

		it("should handle response without headers", () => {
			const response = {
				status: 200,
				data: { key: "value" },
			};
			const normalized = normalizeGitHubResponse(response);
			expect(normalized).toEqual({
				status: 200,
				data: { key: "value" },
				headers: undefined,
			});
		});

		it("should handle response with non-string header values", () => {
			const response = {
				status: 200,
				data: { key: "value" },
				headers: { "content-type": 123 },
			};
			const normalized = normalizeGitHubResponse(response);
			expect(normalized).toEqual({
				status: 200,
				data: { key: "value" },
				headers: undefined,
			});
		});
	});

	describe("createGitHubAPIClient", () => {
		let mockIntegration: MockIntegration;
		let limiter: ReturnType<typeof createConcurrencyLimiter>;

		beforeEach(() => {
			mockIntegration = {
				callExternalAPI: vi.fn() as MockedFunction<
					IntegrationAPI["callExternalAPI"]
				>,
			} as MockIntegration;
			limiter = createConcurrencyLimiter(1);
		});

		it("should create a client that calls integration API", async () => {
			mockIntegration.callExternalAPI.mockResolvedValue({
				status: 200,
				data: { result: "success" },
			});

			const callGitHubAPI = createGitHubAPIClient(limiter, mockIntegration);
			const result = await callGitHubAPI({
				method: "GET",
				url: "/test",
			});

			expect(mockIntegration.callExternalAPI).toHaveBeenCalledWith(
				"github-api",
				{
					method: "GET",
					url: "/test",
				},
			);
			expect(result).toEqual({
				status: 200,
				data: { result: "success" },
				headers: undefined,
			});
		});

		it("should normalize response through limiter", async () => {
			mockIntegration.callExternalAPI.mockResolvedValue({
				status: 200,
				body: { result: "success" },
			});

			const callGitHubAPI = createGitHubAPIClient(limiter, mockIntegration);
			const result = await callGitHubAPI({
				method: "GET",
				url: "/test",
			});

			expect(result).toEqual({
				status: 200,
				data: { result: "success" },
				headers: undefined,
			});
		});

		it("should handle errors gracefully", async () => {
			mockIntegration.callExternalAPI.mockResolvedValue(null);

			const callGitHubAPI = createGitHubAPIClient(limiter, mockIntegration);
			const result = await callGitHubAPI({
				method: "GET",
				url: "/test",
			});

			expect(result).toBeNull();
		});

		it("should respect concurrency limiter", async () => {
			let activeCalls = 0;
			let maxConcurrent = 0;

			mockIntegration.callExternalAPI.mockImplementation(async () => {
				activeCalls += 1;
				maxConcurrent = Math.max(maxConcurrent, activeCalls);
				await new Promise((resolve) => setTimeout(resolve, 10));
				activeCalls -= 1;
				return { status: 200, data: {} };
			});

			const callGitHubAPI = createGitHubAPIClient(limiter, mockIntegration);

			// Make multiple concurrent calls
			await Promise.all([
				callGitHubAPI({ url: "/test1" }),
				callGitHubAPI({ url: "/test2" }),
				callGitHubAPI({ url: "/test3" }),
			]);

			// With limiter set to 1, maxConcurrent should be 1
			expect(maxConcurrent).toBe(1);
		});
	});
});
