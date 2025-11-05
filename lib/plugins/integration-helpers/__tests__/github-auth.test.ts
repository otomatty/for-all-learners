/**
 * GitHub Authentication Helper Tests
 *
 * Tests for GitHub authentication helper functions.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ plugins/examples/github-commit-stats/src/index.ts (future)
 *
 * Dependencies:
 *   └─ lib/plugins/integration-helpers/github-auth.ts
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/widget-calendar-extensions.md
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IntegrationAPI, StorageAPI } from "../../plugin-api";
import type { GitHubTokenData } from "../github-auth";
import {
	deleteGitHubToken,
	getGitHubToken,
	getOrRefreshGitHubToken,
	isTokenValid,
	registerGitHubAPI,
	saveGitHubToken,
	verifyGitHubToken,
} from "../github-auth";

describe("GitHub Authentication Helper", () => {
	const mockStorage: StorageAPI = {
		get: vi.fn(),
		set: vi.fn(),
		delete: vi.fn(),
		keys: vi.fn(),
		clear: vi.fn(),
	};

	const mockAPI: IntegrationAPI = {
		registerOAuthProvider: vi.fn(),
		unregisterOAuthProvider: vi.fn(),
		registerWebhook: vi.fn(),
		unregisterWebhook: vi.fn(),
		registerExternalAPI: vi.fn(),
		unregisterExternalAPI: vi.fn(),
		callExternalAPI: vi.fn(),
	};

	const mockTokenData: GitHubTokenData = {
		accessToken: "test-token",
		tokenType: "token",
		scope: "repo",
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("getGitHubToken", () => {
		it("should retrieve stored token", async () => {
			vi.mocked(mockStorage.get).mockResolvedValue(mockTokenData);

			const result = await getGitHubToken(mockStorage);

			expect(result).toEqual(mockTokenData);
			expect(mockStorage.get).toHaveBeenCalledWith("github_oauth_token");
		});

		it("should return null when token not found", async () => {
			vi.mocked(mockStorage.get).mockResolvedValue(undefined);

			const result = await getGitHubToken(mockStorage);

			expect(result).toBeNull();
		});

		it("should return null when storage error occurs", async () => {
			vi.mocked(mockStorage.get).mockRejectedValue(new Error("Storage error"));

			const result = await getGitHubToken(mockStorage);

			expect(result).toBeNull();
		});
	});

	describe("saveGitHubToken", () => {
		it("should save token to storage", async () => {
			vi.mocked(mockStorage.set).mockResolvedValue(undefined);

			await saveGitHubToken(mockStorage, mockTokenData);

			expect(mockStorage.set).toHaveBeenCalledWith(
				"github_oauth_token",
				mockTokenData,
			);
		});
	});

	describe("deleteGitHubToken", () => {
		it("should delete token from storage", async () => {
			vi.mocked(mockStorage.delete).mockResolvedValue(undefined);

			await deleteGitHubToken(mockStorage);

			expect(mockStorage.delete).toHaveBeenCalledWith("github_oauth_token");
		});
	});

	describe("isTokenValid", () => {
		it("should return true for token without expiration", () => {
			const tokenWithoutExpiry: GitHubTokenData = {
				accessToken: "test-token",
				tokenType: "token",
			};

			expect(isTokenValid(tokenWithoutExpiry)).toBe(true);
		});

		it("should return true for non-expired token", () => {
			const futureExpiry = Date.now() + 3600000; // 1 hour from now
			const validToken: GitHubTokenData = {
				...mockTokenData,
				expiresAt: futureExpiry,
			};

			expect(isTokenValid(validToken)).toBe(true);
		});

		it("should return false for expired token", () => {
			const pastExpiry = Date.now() - 3600000; // 1 hour ago
			const expiredToken: GitHubTokenData = {
				...mockTokenData,
				expiresAt: pastExpiry,
			};

			expect(isTokenValid(expiredToken)).toBe(false);
		});

		it("should return false for null token", () => {
			expect(isTokenValid(null)).toBe(false);
		});
	});

	describe("verifyGitHubToken", () => {
		it("should return true for valid token", async () => {
			vi.mocked(mockAPI.callExternalAPI).mockResolvedValue({
				status: 200,
				statusText: "OK",
				headers: {},
				data: { id: 123, login: "test-user" },
			});

			const result = await verifyGitHubToken(mockAPI, mockTokenData);

			expect(result).toBe(true);
			expect(mockAPI.callExternalAPI).toHaveBeenCalledWith(undefined, {
				method: "GET",
				url: "https://api.github.com/user",
				headers: {
					Authorization: "token test-token",
					Accept: "application/vnd.github.v3+json",
				},
			});
		});

		it("should return false for invalid token", async () => {
			vi.mocked(mockAPI.callExternalAPI).mockResolvedValue({
				status: 401,
				statusText: "Unauthorized",
				headers: {},
				data: { message: "Bad credentials" },
			});

			const result = await verifyGitHubToken(mockAPI, mockTokenData);

			expect(result).toBe(false);
		});

		it("should return false when API call fails", async () => {
			vi.mocked(mockAPI.callExternalAPI).mockRejectedValue(
				new Error("Network error"),
			);

			const result = await verifyGitHubToken(mockAPI, mockTokenData);

			expect(result).toBe(false);
		});
	});

	describe("getOrRefreshGitHubToken", () => {
		it("should return valid token when token exists and is valid", async () => {
			vi.mocked(mockStorage.get).mockResolvedValue(mockTokenData);
			vi.mocked(mockAPI.callExternalAPI).mockResolvedValue({
				status: 200,
				statusText: "OK",
				headers: {},
				data: { id: 123 },
			});

			const result = await getOrRefreshGitHubToken(mockStorage, mockAPI);

			expect(result).toEqual(mockTokenData);
		});

		it("should return null when token not found", async () => {
			vi.mocked(mockStorage.get).mockResolvedValue(undefined);

			const result = await getOrRefreshGitHubToken(mockStorage, mockAPI);

			expect(result).toBeNull();
		});

		it("should delete and return null for expired token", async () => {
			const expiredToken: GitHubTokenData = {
				...mockTokenData,
				expiresAt: Date.now() - 3600000,
			};
			vi.mocked(mockStorage.get).mockResolvedValue(expiredToken);
			vi.mocked(mockStorage.delete).mockResolvedValue(undefined);

			const result = await getOrRefreshGitHubToken(mockStorage, mockAPI);

			expect(result).toBeNull();
			expect(mockStorage.delete).toHaveBeenCalledWith("github_oauth_token");
		});

		it("should delete and return null for invalid token", async () => {
			vi.mocked(mockStorage.get).mockResolvedValue(mockTokenData);
			vi.mocked(mockAPI.callExternalAPI).mockResolvedValue({
				status: 401,
				statusText: "Unauthorized",
				headers: {},
				data: {},
			});
			vi.mocked(mockStorage.delete).mockResolvedValue(undefined);

			const result = await getOrRefreshGitHubToken(mockStorage, mockAPI);

			expect(result).toBeNull();
			expect(mockStorage.delete).toHaveBeenCalledWith("github_oauth_token");
		});
	});

	describe("registerGitHubAPI", () => {
		it("should register GitHub API with authentication", async () => {
			vi.mocked(mockAPI.registerExternalAPI).mockResolvedValue(undefined);

			const apiId = await registerGitHubAPI(mockAPI, mockTokenData);

			expect(apiId).toBe("github-api");
			expect(mockAPI.registerExternalAPI).toHaveBeenCalledWith({
				id: "github-api",
				name: "GitHub API",
				description: "GitHub REST API",
				baseUrl: "https://api.github.com",
				defaultHeaders: {
					Accept: "application/vnd.github.v3+json",
				},
				auth: {
					type: "bearer",
					token: "test-token",
				},
			});
		});

		it("should re-register if already registered", async () => {
			vi.mocked(mockAPI.registerExternalAPI)
				.mockRejectedValueOnce(new Error("Already registered"))
				.mockResolvedValueOnce(undefined);
			vi.mocked(mockAPI.unregisterExternalAPI).mockResolvedValue(undefined);

			const apiId = await registerGitHubAPI(mockAPI, mockTokenData);

			expect(apiId).toBe("github-api");
			expect(mockAPI.unregisterExternalAPI).toHaveBeenCalledWith("github-api");
			expect(mockAPI.registerExternalAPI).toHaveBeenCalledTimes(2);
		});
	});
});
