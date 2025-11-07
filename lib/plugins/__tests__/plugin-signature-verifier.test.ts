/**
 * Plugin Signature Verifier Tests
 *
 * Test suite for plugin signature verification (Phase 2).
 *
 * Related Files:
 *   - Implementation: ../plugin-signature/verifier.ts
 *   - Plan: docs/03_plans/plugin-system/plugin-code-signing.md
 */

import { describe, expect, it } from "vitest";
import type { PluginManifest } from "@/types/plugin";
import {
	generateEd25519KeyPair,
	generateRSAKeyPair,
} from "../plugin-signature/key-manager";
import {
	buildSignatureData,
	calculateCodeHash,
	signPlugin,
	signWithEd25519,
	signWithRSA,
} from "../plugin-signature/signer";
import {
	verifyPluginSignature,
	verifyPluginSignatureFromDB,
	verifyWithEd25519,
	verifyWithRSA,
} from "../plugin-signature/verifier";

const mockManifest: PluginManifest = {
	id: "test-plugin",
	name: "Test Plugin",
	version: "1.0.0",
	author: "Test Author",
	description: "A test plugin",
	main: "index.js",
	extensionPoints: {},
};

describe("Plugin Signature - Verification (Phase 2)", () => {
	describe("verifyWithEd25519", () => {
		it("should verify valid Ed25519 signature", () => {
			const keyPair = generateEd25519KeyPair();
			const code = "function activate() { return 'test'; }";
			const codeHash = calculateCodeHash(code);
			const signatureData = buildSignatureData(mockManifest, codeHash);
			const signature = signWithEd25519(signatureData, keyPair.privateKey);

			const isValid = verifyWithEd25519(
				signatureData,
				signature,
				keyPair.publicKey,
			);

			expect(isValid).toBe(true);
		});

		it("should reject invalid Ed25519 signature", () => {
			const keyPair = generateEd25519KeyPair();
			const code = "function activate() { return 'test'; }";
			const codeHash = calculateCodeHash(code);
			const signatureData = buildSignatureData(mockManifest, codeHash);
			const invalidSignature = "invalid_signature";

			const isValid = verifyWithEd25519(
				signatureData,
				invalidSignature,
				keyPair.publicKey,
			);

			expect(isValid).toBe(false);
		});

		it("should reject signature with wrong public key", () => {
			const keyPair1 = generateEd25519KeyPair();
			const keyPair2 = generateEd25519KeyPair();
			const code = "function activate() { return 'test'; }";
			const codeHash = calculateCodeHash(code);
			const signatureData = buildSignatureData(mockManifest, codeHash);
			const signature = signWithEd25519(signatureData, keyPair1.privateKey);

			// Try to verify with different public key
			const isValid = verifyWithEd25519(
				signatureData,
				signature,
				keyPair2.publicKey,
			);

			expect(isValid).toBe(false);
		});
	});

	describe("verifyWithRSA", () => {
		it("should verify valid RSA signature", () => {
			const keyPair = generateRSAKeyPair();
			const code = "function activate() { return 'test'; }";
			const codeHash = calculateCodeHash(code);
			const signatureData = buildSignatureData(mockManifest, codeHash);
			const signature = signWithRSA(signatureData, keyPair.privateKey);

			const isValid = verifyWithRSA(
				signatureData,
				signature,
				keyPair.publicKey,
			);

			expect(isValid).toBe(true);
		});

		it("should reject invalid RSA signature", () => {
			const keyPair = generateRSAKeyPair();
			const code = "function activate() { return 'test'; }";
			const codeHash = calculateCodeHash(code);
			const signatureData = buildSignatureData(mockManifest, codeHash);
			const invalidSignature = "invalid_signature";

			const isValid = verifyWithRSA(
				signatureData,
				invalidSignature,
				keyPair.publicKey,
			);

			expect(isValid).toBe(false);
		});

		it("should reject signature with wrong public key", () => {
			const keyPair1 = generateRSAKeyPair();
			const keyPair2 = generateRSAKeyPair();
			const code = "function activate() { return 'test'; }";
			const codeHash = calculateCodeHash(code);
			const signatureData = buildSignatureData(mockManifest, codeHash);
			const signature = signWithRSA(signatureData, keyPair1.privateKey);

			// Try to verify with different public key
			const isValid = verifyWithRSA(
				signatureData,
				signature,
				keyPair2.publicKey,
			);

			expect(isValid).toBe(false);
		});
	});

	describe("verifyPluginSignature", () => {
		it("should verify valid plugin signature with Ed25519", () => {
			const keyPair = generateEd25519KeyPair();
			const code = "function activate() { return 'test'; }";
			const pluginSignature = signPlugin(mockManifest, code, {
				privateKey: keyPair.privateKey,
				algorithm: "ed25519",
			});

			const result = verifyPluginSignature(
				mockManifest,
				code,
				pluginSignature,
				{
					publicKey: keyPair.publicKey,
					algorithm: "ed25519",
				},
			);

			expect(result.valid).toBe(true);
			expect(result.error).toBeNull();
			expect(result.details).toBeDefined();
			expect(result.details?.algorithm).toBe("ed25519");
			expect(result.details?.codeHash).toBe(calculateCodeHash(code));
		});

		it("should verify valid plugin signature with RSA", () => {
			const keyPair = generateRSAKeyPair();
			const code = "function activate() { return 'test'; }";
			const pluginSignature = signPlugin(mockManifest, code, {
				privateKey: keyPair.privateKey,
				algorithm: "rsa",
			});

			const result = verifyPluginSignature(
				mockManifest,
				code,
				pluginSignature,
				{
					publicKey: keyPair.publicKey,
					algorithm: "rsa",
				},
			);

			expect(result.valid).toBe(true);
			expect(result.error).toBeNull();
			expect(result.details).toBeDefined();
			expect(result.details?.algorithm).toBe("rsa");
		});

		it("should reject signature when code is modified", () => {
			const keyPair = generateEd25519KeyPair();
			const originalCode = "function activate() { return 'test'; }";
			const modifiedCode = "function activate() { return 'modified'; }";
			const pluginSignature = signPlugin(mockManifest, originalCode, {
				privateKey: keyPair.privateKey,
			});

			const result = verifyPluginSignature(
				mockManifest,
				modifiedCode,
				pluginSignature,
				{
					publicKey: keyPair.publicKey,
				},
			);

			expect(result.valid).toBe(false);
			expect(result.error).toContain("Signature data mismatch");
		});

		it("should reject signature when manifest is modified", () => {
			const keyPair = generateEd25519KeyPair();
			const code = "function activate() { return 'test'; }";
			const pluginSignature = signPlugin(mockManifest, code, {
				privateKey: keyPair.privateKey,
			});

			const modifiedManifest = {
				...mockManifest,
				version: "2.0.0",
			};

			const result = verifyPluginSignature(
				modifiedManifest,
				code,
				pluginSignature,
				{
					publicKey: keyPair.publicKey,
				},
			);

			expect(result.valid).toBe(false);
			expect(result.error).toContain("Signature data mismatch");
		});

		it("should reject invalid signature", () => {
			const keyPair = generateEd25519KeyPair();
			const code = "function activate() { return 'test'; }";
			const pluginSignature = signPlugin(mockManifest, code, {
				privateKey: keyPair.privateKey,
			});

			// Modify signature to make it invalid
			const invalidSignature = {
				...pluginSignature,
				signature: "invalid_signature",
			};

			const result = verifyPluginSignature(
				mockManifest,
				code,
				invalidSignature,
				{
					publicKey: keyPair.publicKey,
				},
			);

			expect(result.valid).toBe(false);
			expect(result.error).toContain("Invalid signature");
		});

		it("should reject signature with wrong public key", () => {
			const keyPair1 = generateEd25519KeyPair();
			const keyPair2 = generateEd25519KeyPair();
			const code = "function activate() { return 'test'; }";
			const pluginSignature = signPlugin(mockManifest, code, {
				privateKey: keyPair1.privateKey,
			});

			const result = verifyPluginSignature(
				mockManifest,
				code,
				pluginSignature,
				{
					publicKey: keyPair2.publicKey, // Wrong public key
				},
			);

			expect(result.valid).toBe(false);
			expect(result.error).toContain("Invalid signature");
		});

		it("should return error for invalid manifest", () => {
			const keyPair = generateEd25519KeyPair();
			const code = "function activate() { return 'test'; }";
			const pluginSignature = signPlugin(mockManifest, code, {
				privateKey: keyPair.privateKey,
			});

			const invalidManifest = {
				...mockManifest,
				id: "",
			} as PluginManifest;

			const result = verifyPluginSignature(
				invalidManifest,
				code,
				pluginSignature,
				{
					publicKey: keyPair.publicKey,
				},
			);

			expect(result.valid).toBe(false);
			expect(result.error).toContain("Invalid manifest");
		});

		it("should return error for empty code", () => {
			const keyPair = generateEd25519KeyPair();
			const code = "function activate() { return 'test'; }";
			const pluginSignature = signPlugin(mockManifest, code, {
				privateKey: keyPair.privateKey,
			});

			const result = verifyPluginSignature(mockManifest, "", pluginSignature, {
				publicKey: keyPair.publicKey,
			});

			expect(result.valid).toBe(false);
			expect(result.error).toContain("Invalid code");
		});

		it("should return error for missing public key", () => {
			const keyPair = generateEd25519KeyPair();
			const code = "function activate() { return 'test'; }";
			const pluginSignature = signPlugin(mockManifest, code, {
				privateKey: keyPair.privateKey,
			});

			const result = verifyPluginSignature(
				mockManifest,
				code,
				pluginSignature,
				{
					publicKey: "",
				},
			);

			expect(result.valid).toBe(false);
			expect(result.error).toContain("Invalid options");
		});

		it("should return error for unsupported algorithm", () => {
			const keyPair = generateEd25519KeyPair();
			const code = "function activate() { return 'test'; }";
			const pluginSignature = signPlugin(mockManifest, code, {
				privateKey: keyPair.privateKey,
			});

			const result = verifyPluginSignature(
				mockManifest,
				code,
				pluginSignature,
				{
					publicKey: keyPair.publicKey,
					algorithm: "unsupported" as "ed25519",
				},
			);

			expect(result.valid).toBe(false);
			expect(result.error).toContain("Unsupported algorithm");
		});
	});

	describe("verifyPluginSignatureFromDB", () => {
		it("should verify valid signature from database format", () => {
			const keyPair = generateEd25519KeyPair();
			const code = "function activate() { return 'test'; }";
			const pluginSignature = signPlugin(mockManifest, code, {
				privateKey: keyPair.privateKey,
				algorithm: "ed25519",
			});

			// Use the original signedAt timestamp from the signature
			const result = verifyPluginSignatureFromDB(
				mockManifest,
				code,
				pluginSignature.signature,
				keyPair.publicKey,
				"ed25519",
				pluginSignature.signatureData.timestamp, // Pass original timestamp
			);

			expect(result.valid).toBe(true);
			expect(result.error).toBeNull();
		});

		it("should verify valid RSA signature from database format", () => {
			const keyPair = generateRSAKeyPair();
			const code = "function activate() { return 'test'; }";
			const pluginSignature = signPlugin(mockManifest, code, {
				privateKey: keyPair.privateKey,
				algorithm: "rsa",
			});

			// Use the original signedAt timestamp from the signature
			const result = verifyPluginSignatureFromDB(
				mockManifest,
				code,
				pluginSignature.signature,
				keyPair.publicKey,
				"rsa",
				pluginSignature.signatureData.timestamp, // Pass original timestamp
			);

			expect(result.valid).toBe(true);
			expect(result.error).toBeNull();
		});

		it("should use default algorithm (ed25519) when not provided", () => {
			const keyPair = generateEd25519KeyPair();
			const code = "function activate() { return 'test'; }";
			const pluginSignature = signPlugin(mockManifest, code, {
				privateKey: keyPair.privateKey,
				algorithm: "ed25519",
			});

			// Use the original signedAt timestamp from the signature
			const result = verifyPluginSignatureFromDB(
				mockManifest,
				code,
				pluginSignature.signature,
				keyPair.publicKey,
				null, // Algorithm not provided
				pluginSignature.signatureData.timestamp, // Pass original timestamp
			);

			expect(result.valid).toBe(true);
			expect(result.error).toBeNull();
		});

		it("should return error when signature is missing", () => {
			const keyPair = generateEd25519KeyPair();

			const result = verifyPluginSignatureFromDB(
				mockManifest,
				"function activate() { return 'test'; }",
				null,
				keyPair.publicKey,
				"ed25519",
			);

			expect(result.valid).toBe(false);
			expect(result.error).toContain("Signature or public key is missing");
		});

		it("should return error when public key is missing", () => {
			const keyPair = generateEd25519KeyPair();
			const code = "function activate() { return 'test'; }";
			const pluginSignature = signPlugin(mockManifest, code, {
				privateKey: keyPair.privateKey,
			});

			const result = verifyPluginSignatureFromDB(
				mockManifest,
				code,
				pluginSignature.signature,
				null,
				"ed25519",
			);

			expect(result.valid).toBe(false);
			expect(result.error).toContain("Signature or public key is missing");
		});

		it("should reject invalid signature from database format", () => {
			const keyPair = generateEd25519KeyPair();

			const result = verifyPluginSignatureFromDB(
				mockManifest,
				"function activate() { return 'test'; }",
				"invalid_signature",
				keyPair.publicKey,
				"ed25519",
			);

			expect(result.valid).toBe(false);
			expect(result.error).toBeDefined();
		});
	});
});
