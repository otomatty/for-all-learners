/**
 * Plugin Signature Tests - Base Implementation
 *
 * Test suite for plugin signature base implementation (Phase 1).
 *
 * Related Files:
 *   - Implementation: ../plugin-signature/
 *   - Plan: docs/03_plans/plugin-system/plugin-code-signing.md
 */

import { describe, expect, it } from "vitest";
import type { PluginManifest } from "@/types/plugin";
import {
	base64ToPEM,
	generateEd25519KeyPair,
	generateKeyPair,
	generateRSAKeyPair,
} from "../plugin-signature/key-manager";
import {
	buildSignatureData,
	calculateCodeHash,
	serializeSignatureData,
	signPlugin,
	signWithEd25519,
} from "../plugin-signature/signer";

describe("Plugin Signature - Base Implementation", () => {
	describe("Key Management", () => {
		it("should generate Ed25519 key pair", () => {
			const keyPair = generateEd25519KeyPair();

			expect(keyPair).toHaveProperty("publicKey");
			expect(keyPair).toHaveProperty("privateKey");
			expect(typeof keyPair.publicKey).toBe("string");
			expect(typeof keyPair.privateKey).toBe("string");
			expect(keyPair.publicKey.length).toBeGreaterThan(0);
			expect(keyPair.privateKey.length).toBeGreaterThan(0);
		});

		it("should generate RSA key pair", () => {
			const keyPair = generateRSAKeyPair();

			expect(keyPair).toHaveProperty("publicKey");
			expect(keyPair).toHaveProperty("privateKey");
			expect(typeof keyPair.publicKey).toBe("string");
			expect(typeof keyPair.privateKey).toBe("string");
		});

		it("should generate key pair with default algorithm (Ed25519)", () => {
			const keyPair = generateKeyPair();

			expect(keyPair).toHaveProperty("publicKey");
			expect(keyPair).toHaveProperty("privateKey");
		});

		it("should convert base64 to PEM format", () => {
			const keyPair = generateEd25519KeyPair();
			const pem = base64ToPEM(keyPair.publicKey);

			expect(pem).toContain("BEGIN PUBLIC KEY");
			expect(pem).toContain("END PUBLIC KEY");
		});

		it("should generate different key pairs each time", () => {
			const keyPair1 = generateEd25519KeyPair();
			const keyPair2 = generateEd25519KeyPair();

			expect(keyPair1.publicKey).not.toBe(keyPair2.publicKey);
			expect(keyPair1.privateKey).not.toBe(keyPair2.privateKey);
		});
	});

	describe("Code Hashing", () => {
		it("should calculate SHA-256 hash of plugin code", () => {
			const code = "function activate() { return 'test'; }";
			const hash1 = calculateCodeHash(code);
			const hash2 = calculateCodeHash(code);

			expect(hash1).toBe(hash2);
			expect(typeof hash1).toBe("string");
			expect(hash1.length).toBeGreaterThan(0);
		});

		it("should produce different hashes for different code", () => {
			const code1 = "function activate() { return 'test1'; }";
			const code2 = "function activate() { return 'test2'; }";

			const hash1 = calculateCodeHash(code1);
			const hash2 = calculateCodeHash(code2);

			expect(hash1).not.toBe(hash2);
		});
	});

	describe("Signature Data", () => {
		const mockManifest: PluginManifest = {
			id: "test-plugin",
			name: "Test Plugin",
			version: "1.0.0",
			description: "Test description",
			author: "Test Author",
			main: "index.js",
			extensionPoints: {},
		};

		it("should build signature data from manifest and code hash", () => {
			const codeHash = "test-hash";
			const signatureData = buildSignatureData(mockManifest, codeHash);

			expect(signatureData).toHaveProperty("pluginId", "test-plugin");
			expect(signatureData).toHaveProperty("version", "1.0.0");
			expect(signatureData).toHaveProperty("codeHash", "test-hash");
			expect(signatureData).toHaveProperty("author", "Test Author");
			expect(signatureData).toHaveProperty("timestamp");
			expect(typeof signatureData.timestamp).toBe("number");
		});

		it("should serialize signature data deterministically", () => {
			const codeHash = "test-hash";
			const signatureData = buildSignatureData(mockManifest, codeHash);

			const serialized1 = serializeSignatureData(signatureData);
			const serialized2 = serializeSignatureData(signatureData);

			expect(serialized1).toBe(serialized2);
			expect(typeof serialized1).toBe("string");
		});

		it("should include all required fields in serialized data", () => {
			const codeHash = "test-hash";
			const signatureData = buildSignatureData(mockManifest, codeHash);
			const serialized = serializeSignatureData(signatureData);

			expect(serialized).toContain("test-plugin");
			expect(serialized).toContain("1.0.0");
			expect(serialized).toContain("test-hash");
			expect(serialized).toContain("Test Author");
		});
	});

	describe("Signing", () => {
		const mockManifest: PluginManifest = {
			id: "test-plugin",
			name: "Test Plugin",
			version: "1.0.0",
			description: "Test description",
			author: "Test Author",
			main: "index.js",
			extensionPoints: {},
		};

		it("should sign plugin code with Ed25519", () => {
			const keyPair = generateEd25519KeyPair();
			const code = "function activate() { return 'test'; }";
			const codeHash = calculateCodeHash(code);
			const signatureData = buildSignatureData(mockManifest, codeHash);

			const signature = signWithEd25519(signatureData, keyPair.privateKey);

			expect(typeof signature).toBe("string");
			expect(signature.length).toBeGreaterThan(0);
		});

		it("should produce same signature for same data", () => {
			const keyPair = generateEd25519KeyPair();
			const code = "function activate() { return 'test'; }";
			const codeHash = calculateCodeHash(code);
			const signatureData = buildSignatureData(mockManifest, codeHash);

			const signature1 = signWithEd25519(signatureData, keyPair.privateKey);
			const signature2 = signWithEd25519(signatureData, keyPair.privateKey);

			expect(signature1).toBe(signature2);
		});

		it("should produce different signatures for different data", () => {
			const keyPair = generateEd25519KeyPair();
			const code1 = "function activate() { return 'test1'; }";
			const code2 = "function activate() { return 'test2'; }";

			const hash1 = calculateCodeHash(code1);
			const hash2 = calculateCodeHash(code2);
			const data1 = buildSignatureData(mockManifest, hash1);
			const data2 = buildSignatureData(mockManifest, hash2);

			const signature1 = signWithEd25519(data1, keyPair.privateKey);
			const signature2 = signWithEd25519(data2, keyPair.privateKey);

			expect(signature1).not.toBe(signature2);
		});

		it("should sign complete plugin", () => {
			const keyPair = generateEd25519KeyPair();
			const code = "function activate() { return 'test'; }";

			const pluginSignature = signPlugin(mockManifest, code, {
				privateKey: keyPair.privateKey,
				algorithm: "ed25519",
			});

			expect(pluginSignature).toHaveProperty("algorithm", "ed25519");
			expect(pluginSignature).toHaveProperty("signature");
			expect(pluginSignature).toHaveProperty("signatureData");
			expect(pluginSignature).toHaveProperty("signedAt");
			expect(pluginSignature.signatureData.pluginId).toBe("test-plugin");
			expect(pluginSignature.signatureData.version).toBe("1.0.0");
		});

		it("should throw error for invalid manifest", () => {
			const keyPair = generateEd25519KeyPair();
			const code = "function activate() { return 'test'; }";
			const invalidManifest = {
				...mockManifest,
				id: "",
			} as PluginManifest;

			expect(() => {
				signPlugin(invalidManifest, code, {
					privateKey: keyPair.privateKey,
				});
			}).toThrow("Invalid manifest");
		});

		it("should throw error for empty code", () => {
			const keyPair = generateEd25519KeyPair();

			expect(() => {
				signPlugin(mockManifest, "", {
					privateKey: keyPair.privateKey,
				});
			}).toThrow("Invalid code");
		});

		it("should throw error for missing private key", () => {
			const code = "function activate() { return 'test'; }";

			expect(() => {
				signPlugin(mockManifest, code, {
					privateKey: "",
				});
			}).toThrow("Invalid options");
		});
	});
});
