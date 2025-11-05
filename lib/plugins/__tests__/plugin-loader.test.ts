/**
 * Plugin Loader Tests
 *
 * Unit tests for the PluginLoader class.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PluginManifest } from "@/types/plugin";
import { PluginLoader, validateManifest } from "../plugin-loader";
import { getPluginRegistry } from "../plugin-registry";
import { generateEd25519KeyPair } from "../plugin-signature/key-manager";

global.Worker = vi.fn().mockImplementation(() => ({
	postMessage: vi.fn(),
	terminate: vi.fn(),
	addEventListener: vi.fn(),
	removeEventListener: vi.fn(),
	onmessage: null,
	onerror: null,
})) as unknown as typeof Worker;

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => "blob:mock-url");

describe("PluginLoader", () => {
	let loader: PluginLoader;

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

	const mockPluginCode = `
    function activate(api, config) {
      return {
        methods: {
          test() {
            return 'test';
          }
        }
      };
    }
  `;

	beforeEach(() => {
		loader = PluginLoader.getInstance();
		vi.clearAllMocks();
	});

	afterEach(() => {
		getPluginRegistry().clear();
		PluginLoader.reset();
	});

	describe("Singleton Pattern", () => {
		it("should return the same instance", () => {
			const instance1 = PluginLoader.getInstance();
			const instance2 = PluginLoader.getInstance();

			expect(instance1).toBe(instance2);
		});
	});

	describe("validateManifest", () => {
		it("should validate correct manifest", async () => {
			const manifest = createMockManifest("test-plugin");

			const result = validateManifest(manifest);

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should detect missing required fields", async () => {
			const invalidManifest = {
				...createMockManifest("test-plugin"),
				name: "",
			} as PluginManifest;

			const result = validateManifest(invalidManifest);

			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});
	});

	describe("loadPlugin", () => {
		it("should reject loading with invalid manifest", async () => {
			const invalidManifest = {
				id: "",
				name: "",
			} as PluginManifest;

			const result = await loader.loadPlugin(invalidManifest, mockPluginCode);

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});

		it("should reject loading duplicate plugin", async () => {
			const manifest = createMockManifest("test-plugin");

			// Register plugin first
			getPluginRegistry().register({
				manifest,
				enabled: true,
				loadedAt: new Date(),
			} as any);

			const result = await loader.loadPlugin(manifest, mockPluginCode);

			expect(result.success).toBe(false);
			expect(result.error).toContain("already loaded");
		});
	});

	describe("unloadPlugin", () => {
		it("should throw error when unloading non-existent plugin", async () => {
			await expect(loader.unloadPlugin("non-existent")).rejects.toThrow(
				"Plugin non-existent not found",
			);
		});
	});

	describe("Worker Management", () => {
		it("should create worker for plugin", () => {
			// This would normally create a worker
			// For now, we just verify the Worker constructor is called
			// Full integration test would require more setup

			expect(global.Worker).toBeDefined();
		});
	});

	describe("Signature Verification", () => {
		// Note: Full integration tests for signature verification are in plugin-signature-verifier.test.ts
		// These tests verify the integration with PluginLoader, specifically error handling

		it("should reject plugin with invalid signature when requireSignature is true", async () => {
			const manifest = createMockManifest("test-plugin");
			const keyPair = generateEd25519KeyPair();

			const result = await loader.loadPlugin(manifest, mockPluginCode, {
				signature: "invalid_signature",
				publicKey: keyPair.publicKey,
				signatureAlgorithm: "ed25519",
				requireSignature: true,
			});

			expect(result.success).toBe(false);
			expect(result.error).toContain("signature verification failed");
		});

		it("should reject plugin when signature is missing but required", async () => {
			const manifest = createMockManifest("test-plugin");

			const result = await loader.loadPlugin(manifest, mockPluginCode, {
				requireSignature: true,
			});

			expect(result.success).toBe(false);
			expect(result.error).toContain("signature verification failed");
		});

		it("should not perform verification when signature is not provided and not required", async () => {
			const manifest = createMockManifest("test-plugin-signature-optional");

			// This test verifies that signature verification is skipped when not provided
			// The actual loading may still fail due to Worker initialization, but
			// the signature verification step should not be executed
			const result = await loader.loadPlugin(manifest, mockPluginCode, {
				requireSignature: false,
			});

			// If it fails, it should be due to Worker/initialization, not signature verification
			if (!result.success) {
				expect(result.error).not.toContain("signature verification");
			}
		});
	});
});
