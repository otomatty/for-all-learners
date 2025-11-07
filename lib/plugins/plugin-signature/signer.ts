/**
 * Plugin Signature Signer
 *
 * Generates cryptographic signatures for plugin code.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ scripts/plugin-sign.ts (future)
 *
 * Dependencies:
 *   ├─ lib/plugins/plugin-signature/types.ts
 *   ├─ lib/plugins/plugin-signature/key-manager.ts
 *   ├─ types/plugin.ts
 *   └─ crypto (Node.js built-in)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/plugin-code-signing.md
 */

import { createHash, createSign, sign } from "node:crypto";
import type { PluginManifest } from "@/types/plugin";
import { base64ToPEM } from "./key-manager";
import type { PluginSignature, SignatureData, SigningOptions } from "./types";

/**
 * Calculate SHA-256 hash of plugin code
 *
 * @param code Plugin code as string
 * @returns Base64-encoded hash
 */
export function calculateCodeHash(code: string): string {
	const hash = createHash("sha256");
	hash.update(code, "utf8");
	return hash.digest("base64");
}

/**
 * Build signature data from manifest and code hash
 *
 * @param manifest Plugin manifest
 * @param codeHash SHA-256 hash of plugin code
 * @returns Signature data
 */
export function buildSignatureData(
	manifest: PluginManifest,
	codeHash: string,
): SignatureData {
	return {
		pluginId: manifest.id,
		version: manifest.version,
		codeHash,
		timestamp: Date.now(),
		author: manifest.author,
	};
}

/**
 * Serialize signature data to string for signing
 *
 * @param data Signature data
 * @returns Serialized string
 */
export function serializeSignatureData(data: SignatureData): string {
	// Use deterministic JSON serialization (sorted keys)
	return JSON.stringify({
		pluginId: data.pluginId,
		version: data.version,
		codeHash: data.codeHash,
		timestamp: data.timestamp,
		author: data.author,
	});
}

/**
 * Sign plugin code with Ed25519
 *
 * @param signatureData Signature data to sign
 * @param privateKey Base64-encoded PEM private key
 * @returns Base64-encoded signature
 */
export function signWithEd25519(
	signatureData: SignatureData,
	privateKey: string,
): string {
	try {
		const privateKeyPEM = base64ToPEM(privateKey);
		const serializedData = serializeSignatureData(signatureData);
		const dataBuffer = Buffer.from(serializedData, "utf8");

		// Node.js crypto.sign() with Ed25519
		// Ed25519 doesn't use a hash algorithm, so we pass null
		// This requires Node.js 12.0.0 or later
		const signature = sign(null, dataBuffer, privateKeyPEM);
		return signature.toString("base64");
	} catch (error) {
		// Fallback: try with createSign if direct sign() fails
		if (
			error instanceof Error &&
			(error.message.includes("Invalid digest") ||
				error.message.includes("not supported"))
		) {
			try {
				const signObj = createSign("Ed25519");
				const serializedData = serializeSignatureData(signatureData);
				signObj.update(serializedData, "utf8");
				signObj.end();
				const signature = signObj.sign(base64ToPEM(privateKey), "base64");
				return signature;
			} catch (fallbackError) {
				throw new Error(
					`Failed to sign with Ed25519: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
				);
			}
		}
		throw new Error(
			`Failed to sign with Ed25519: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Sign plugin code with RSA
 *
 * @param signatureData Signature data to sign
 * @param privateKey Base64-encoded PEM private key
 * @returns Base64-encoded signature
 */
export function signWithRSA(
	signatureData: SignatureData,
	privateKey: string,
): string {
	try {
		const privateKeyPEM = base64ToPEM(privateKey);
		const serializedData = serializeSignatureData(signatureData);

		const sign = createSign("RSA-SHA256");
		sign.update(serializedData, "utf8");
		sign.end();

		const signature = sign.sign(privateKeyPEM);
		return signature.toString("base64");
	} catch (error) {
		throw new Error(
			`Failed to sign with RSA: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Sign plugin code
 *
 * @param manifest Plugin manifest
 * @param code Plugin code as string
 * @param options Signing options
 * @returns Plugin signature
 */
export function signPlugin(
	manifest: PluginManifest,
	code: string,
	options: SigningOptions,
): PluginSignature {
	// Validate inputs
	if (!manifest.id || !manifest.version || !manifest.author) {
		throw new Error("Invalid manifest: missing required fields");
	}

	if (!code || code.trim().length === 0) {
		throw new Error("Invalid code: code cannot be empty");
	}

	if (!options.privateKey) {
		throw new Error("Invalid options: privateKey is required");
	}

	// Calculate code hash
	const codeHash = calculateCodeHash(code);

	// Build signature data
	const signatureData = buildSignatureData(manifest, codeHash);

	// Sign with selected algorithm
	const algorithm = options.algorithm || "ed25519";
	let signature: string;

	switch (algorithm) {
		case "ed25519":
			signature = signWithEd25519(signatureData, options.privateKey);
			break;
		case "rsa":
			signature = signWithRSA(signatureData, options.privateKey);
			break;
		default:
			throw new Error(`Unsupported algorithm: ${algorithm}`);
	}

	return {
		algorithm,
		signature,
		signatureData,
		signedAt: Date.now(),
		publicKey: options.publicKey,
	};
}
