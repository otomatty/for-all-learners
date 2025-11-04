/**
 * Integration Extension Registry Tests
 *
 * Unit tests for the integration extension registry functions.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as registry from "../integration-registry";
import type {
	ExternalAPIOptions,
	OAuthProviderOptions,
	WebhookOptions,
} from "../types";

describe("Integration Extension Registry", () => {
	const createMockOAuthProvider = (
		id: string,
		name: string = "Test Provider",
	): OAuthProviderOptions => ({
		id,
		name,
		description: `Test OAuth provider ${id}`,
		config: {
			name: "test-provider",
			authorizationUrl: "https://example.com/oauth/authorize",
			tokenUrl: "https://example.com/oauth/token",
			clientId: "test-client-id",
			scopes: ["read", "write"],
		},
		useDefaultFlow: true,
	});

	const createMockWebhook = (
		id: string,
		path: string = `/webhook/${id}`,
	): WebhookOptions => ({
		id,
		name: `Webhook ${id}`,
		description: `Test webhook ${id}`,
		path,
		methods: ["POST"],
		handler: async (_event) => {
			// Mock handler
		},
	});

	const createMockExternalAPI = (
		id: string,
		baseUrl?: string,
	): ExternalAPIOptions => ({
		id,
		name: `External API ${id}`,
		description: `Test external API ${id}`,
		baseUrl: baseUrl ?? "https://api.example.com",
		defaultHeaders: {
			"Content-Type": "application/json",
		},
		defaultTimeout: 5000,
		auth: {
			type: "bearer",
			token: "test-token",
		},
	});

	beforeEach(() => {
		registry.reset();
	});

	afterEach(() => {
		registry.reset();
	});

	describe("OAuth Provider Registration", () => {
		it("should register an OAuth provider", () => {
			const options = createMockOAuthProvider("oauth-1");

			registry.registerOAuthProvider("plugin-1", options);

			const providers = registry.getOAuthProviders("plugin-1");
			expect(providers).toHaveLength(1);
			expect(providers[0]?.providerId).toBe("oauth-1");
			expect(providers[0]?.name).toBe("Test Provider");
		});

		it("should throw error if provider ID already exists", () => {
			const options = createMockOAuthProvider("oauth-1");

			registry.registerOAuthProvider("plugin-1", options);

			expect(() => {
				registry.registerOAuthProvider("plugin-1", options);
			}).toThrow("OAuth provider oauth-1 already registered");
		});

		it("should register multiple providers for same plugin", () => {
			const options1 = createMockOAuthProvider("oauth-1");
			const options2 = createMockOAuthProvider("oauth-2", "Provider 2");

			registry.registerOAuthProvider("plugin-1", options1);
			registry.registerOAuthProvider("plugin-1", options2);

			const providers = registry.getOAuthProviders("plugin-1");
			expect(providers).toHaveLength(2);
		});

		it("should unregister a specific provider", () => {
			const options1 = createMockOAuthProvider("oauth-1");
			const options2 = createMockOAuthProvider("oauth-2");

			registry.registerOAuthProvider("plugin-1", options1);
			registry.registerOAuthProvider("plugin-1", options2);

			const result = registry.unregisterOAuthProvider("plugin-1", "oauth-1");

			expect(result).toBe(true);
			const providers = registry.getOAuthProviders("plugin-1");
			expect(providers).toHaveLength(1);
			expect(providers[0]?.providerId).toBe("oauth-2");
		});

		it("should unregister all providers for a plugin", () => {
			const options1 = createMockOAuthProvider("oauth-1");
			const options2 = createMockOAuthProvider("oauth-2");

			registry.registerOAuthProvider("plugin-1", options1);
			registry.registerOAuthProvider("plugin-1", options2);

			const result = registry.unregisterOAuthProvider("plugin-1");

			expect(result).toBe(true);
			const providers = registry.getOAuthProviders("plugin-1");
			expect(providers).toHaveLength(0);
		});

		it("should return false when unregistering non-existent provider", () => {
			const result = registry.unregisterOAuthProvider("plugin-1", "oauth-1");

			expect(result).toBe(false);
		});

		it("should get all providers across all plugins", () => {
			const options1 = createMockOAuthProvider("oauth-1");
			const options2 = createMockOAuthProvider("oauth-2");

			registry.registerOAuthProvider("plugin-1", options1);
			registry.registerOAuthProvider("plugin-2", options2);

			const allProviders = registry.getOAuthProviders();
			expect(allProviders).toHaveLength(2);
		});
	});

	describe("Webhook Registration", () => {
		it("should register a webhook", () => {
			const options = createMockWebhook("webhook-1", "/webhook/test");

			registry.registerWebhook("plugin-1", options);

			const webhooks = registry.getWebhooks("plugin-1");
			expect(webhooks).toHaveLength(1);
			expect(webhooks[0]?.webhookId).toBe("webhook-1");
			expect(webhooks[0]?.path).toBe("/webhook/test");
		});

		it("should throw error if webhook ID already exists", () => {
			const options = createMockWebhook("webhook-1", "/webhook/test");

			registry.registerWebhook("plugin-1", options);

			expect(() => {
				registry.registerWebhook("plugin-1", options);
			}).toThrow("Webhook webhook-1 already registered");
		});

		it("should throw error if webhook path already exists", () => {
			const options1 = createMockWebhook("webhook-1", "/webhook/test");
			const options2 = createMockWebhook("webhook-2", "/webhook/test");

			registry.registerWebhook("plugin-1", options1);

			expect(() => {
				registry.registerWebhook("plugin-2", options2);
			}).toThrow('Webhook path "/webhook/test" is already used');
		});

		it("should register multiple webhooks for same plugin", () => {
			const options1 = createMockWebhook("webhook-1", "/webhook/test1");
			const options2 = createMockWebhook("webhook-2", "/webhook/test2");

			registry.registerWebhook("plugin-1", options1);
			registry.registerWebhook("plugin-1", options2);

			const webhooks = registry.getWebhooks("plugin-1");
			expect(webhooks).toHaveLength(2);
		});

		it("should get webhook by path", () => {
			const options = createMockWebhook("webhook-1", "/webhook/test");

			registry.registerWebhook("plugin-1", options);

			const webhook = registry.getWebhookByPath("/webhook/test");
			expect(webhook).toBeDefined();
			expect(webhook?.webhookId).toBe("webhook-1");
		});

		it("should return undefined for non-existent webhook path", () => {
			const webhook = registry.getWebhookByPath("/webhook/nonexistent");

			expect(webhook).toBeUndefined();
		});

		it("should unregister a specific webhook", () => {
			const options1 = createMockWebhook("webhook-1", "/webhook/test1");
			const options2 = createMockWebhook("webhook-2", "/webhook/test2");

			registry.registerWebhook("plugin-1", options1);
			registry.registerWebhook("plugin-1", options2);

			const result = registry.unregisterWebhook("plugin-1", "webhook-1");

			expect(result).toBe(true);
			const webhooks = registry.getWebhooks("plugin-1");
			expect(webhooks).toHaveLength(1);
			expect(webhooks[0]?.webhookId).toBe("webhook-2");

			// Path should be removed from path map
			const webhook = registry.getWebhookByPath("/webhook/test1");
			expect(webhook).toBeUndefined();
		});

		it("should unregister all webhooks for a plugin", () => {
			const options1 = createMockWebhook("webhook-1", "/webhook/test1");
			const options2 = createMockWebhook("webhook-2", "/webhook/test2");

			registry.registerWebhook("plugin-1", options1);
			registry.registerWebhook("plugin-1", options2);

			const result = registry.unregisterWebhook("plugin-1");

			expect(result).toBe(true);
			const webhooks = registry.getWebhooks("plugin-1");
			expect(webhooks).toHaveLength(0);
		});

		it("should return false when unregistering non-existent webhook", () => {
			const result = registry.unregisterWebhook("plugin-1", "webhook-1");

			expect(result).toBe(false);
		});
	});

	describe("External API Registration", () => {
		it("should register an external API", () => {
			const options = createMockExternalAPI("api-1");

			registry.registerExternalAPI("plugin-1", options);

			const apis = registry.getExternalAPIs("plugin-1");
			expect(apis).toHaveLength(1);
			expect(apis[0]?.apiId).toBe("api-1");
			expect(apis[0]?.baseUrl).toBe("https://api.example.com");
		});

		it("should throw error if API ID already exists", () => {
			const options = createMockExternalAPI("api-1");

			registry.registerExternalAPI("plugin-1", options);

			expect(() => {
				registry.registerExternalAPI("plugin-1", options);
			}).toThrow("External API api-1 already registered");
		});

		it("should register multiple APIs for same plugin", () => {
			const options1 = createMockExternalAPI("api-1");
			const options2 = createMockExternalAPI(
				"api-2",
				"https://api2.example.com",
			);

			registry.registerExternalAPI("plugin-1", options1);
			registry.registerExternalAPI("plugin-1", options2);

			const apis = registry.getExternalAPIs("plugin-1");
			expect(apis).toHaveLength(2);
		});

		it("should get external API by ID", () => {
			const options = createMockExternalAPI("api-1");

			registry.registerExternalAPI("plugin-1", options);

			const api = registry.getExternalAPI("plugin-1", "api-1");
			expect(api).toBeDefined();
			expect(api?.apiId).toBe("api-1");
		});

		it("should return undefined for non-existent API", () => {
			const api = registry.getExternalAPI("plugin-1", "api-1");

			expect(api).toBeUndefined();
		});

		it("should unregister a specific API", () => {
			const options1 = createMockExternalAPI("api-1");
			const options2 = createMockExternalAPI("api-2");

			registry.registerExternalAPI("plugin-1", options1);
			registry.registerExternalAPI("plugin-1", options2);

			const result = registry.unregisterExternalAPI("plugin-1", "api-1");

			expect(result).toBe(true);
			const apis = registry.getExternalAPIs("plugin-1");
			expect(apis).toHaveLength(1);
			expect(apis[0]?.apiId).toBe("api-2");
		});

		it("should unregister all APIs for a plugin", () => {
			const options1 = createMockExternalAPI("api-1");
			const options2 = createMockExternalAPI("api-2");

			registry.registerExternalAPI("plugin-1", options1);
			registry.registerExternalAPI("plugin-1", options2);

			const result = registry.unregisterExternalAPI("plugin-1");

			expect(result).toBe(true);
			const apis = registry.getExternalAPIs("plugin-1");
			expect(apis).toHaveLength(0);
		});

		it("should return false when unregistering non-existent API", () => {
			const result = registry.unregisterExternalAPI("plugin-1", "api-1");

			expect(result).toBe(false);
		});
	});

	describe("clearPlugin", () => {
		it("should clear all extensions for a plugin", () => {
			const oauthOptions = createMockOAuthProvider("oauth-1");
			const webhookOptions = createMockWebhook("webhook-1", "/webhook/test");
			const apiOptions = createMockExternalAPI("api-1");

			registry.registerOAuthProvider("plugin-1", oauthOptions);
			registry.registerWebhook("plugin-1", webhookOptions);
			registry.registerExternalAPI("plugin-1", apiOptions);

			registry.clearPlugin("plugin-1");

			expect(registry.getOAuthProviders("plugin-1")).toHaveLength(0);
			expect(registry.getWebhooks("plugin-1")).toHaveLength(0);
			expect(registry.getExternalAPIs("plugin-1")).toHaveLength(0);
		});

		it("should not affect other plugins", () => {
			const oauthOptions1 = createMockOAuthProvider("oauth-1");
			const oauthOptions2 = createMockOAuthProvider("oauth-2");

			registry.registerOAuthProvider("plugin-1", oauthOptions1);
			registry.registerOAuthProvider("plugin-2", oauthOptions2);

			registry.clearPlugin("plugin-1");

			expect(registry.getOAuthProviders("plugin-1")).toHaveLength(0);
			expect(registry.getOAuthProviders("plugin-2")).toHaveLength(1);
		});
	});

	describe("clear", () => {
		it("should clear all extensions from all plugins", () => {
			const oauthOptions = createMockOAuthProvider("oauth-1");
			const webhookOptions = createMockWebhook("webhook-1", "/webhook/test");
			const apiOptions = createMockExternalAPI("api-1");

			registry.registerOAuthProvider("plugin-1", oauthOptions);
			registry.registerWebhook("plugin-1", webhookOptions);
			registry.registerExternalAPI("plugin-1", apiOptions);

			registry.clear();

			expect(registry.getOAuthProviders()).toHaveLength(0);
			expect(registry.getWebhooks()).toHaveLength(0);
			expect(registry.getExternalAPIs()).toHaveLength(0);
		});
	});

	describe("getStats", () => {
		it("should return correct statistics", () => {
			const oauthOptions1 = createMockOAuthProvider("oauth-1");
			const oauthOptions2 = createMockOAuthProvider("oauth-2");
			const webhookOptions = createMockWebhook("webhook-1", "/webhook/test");
			const apiOptions = createMockExternalAPI("api-1");

			registry.registerOAuthProvider("plugin-1", oauthOptions1);
			registry.registerOAuthProvider("plugin-2", oauthOptions2);
			registry.registerWebhook("plugin-1", webhookOptions);
			registry.registerExternalAPI("plugin-1", apiOptions);

			const stats = registry.getStats();

			expect(stats.totalPlugins).toBe(2);
			expect(stats.totalOAuthProviders).toBe(2);
			expect(stats.totalWebhooks).toBe(1);
			expect(stats.totalExternalAPIs).toBe(1);
		});

		it("should return zero statistics for empty registry", () => {
			const stats = registry.getStats();

			expect(stats.totalPlugins).toBe(0);
			expect(stats.totalOAuthProviders).toBe(0);
			expect(stats.totalWebhooks).toBe(0);
			expect(stats.totalExternalAPIs).toBe(0);
		});
	});
});
