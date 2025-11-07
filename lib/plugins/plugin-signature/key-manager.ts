/**
 * Plugin Signature Key Manager
 *
 * Manages cryptographic key pairs for plugin signing and verification.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ lib/plugins/plugin-signature/signer.ts
 *
 * Dependencies:
 *   ├─ lib/plugins/plugin-signature/types.ts
 *   └─ crypto (Node.js built-in)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/plugin-code-signing.md
 */

import { generateKeyPairSync } from "node:crypto";
import type { KeyPair, KeyPairOptions } from "./types";

/**
 * Generate Ed25519 key pair
 *
 * @param options Key pair generation options
 * @returns Key pair with base64-encoded PEM keys
 */
export function generateEd25519KeyPair(_options: KeyPairOptions = {}): KeyPair {
	try {
		const { publicKey, privateKey } = generateKeyPairSync("ed25519", {
			publicKeyEncoding: {
				type: "spki",
				format: "pem",
			},
			privateKeyEncoding: {
				type: "pkcs8",
				format: "pem",
			},
		});

		// Store PEM keys as base64 for easier storage/transmission
		return {
			publicKey: Buffer.from(publicKey).toString("base64"),
			privateKey: Buffer.from(privateKey).toString("base64"),
		};
	} catch (error) {
		throw new Error(
			`Failed to generate Ed25519 key pair: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Generate RSA key pair (2048-bit)
 *
 * @param options Key pair generation options
 * @returns Key pair with base64-encoded keys
 */
export function generateRSAKeyPair(_options: KeyPairOptions = {}): KeyPair {
	try {
		const { publicKey, privateKey } = generateKeyPairSync("rsa", {
			modulusLength: 2048,
			publicKeyEncoding: {
				type: "spki",
				format: "pem",
			},
			privateKeyEncoding: {
				type: "pkcs8",
				format: "pem",
			},
		});

		return {
			publicKey: Buffer.from(publicKey).toString("base64"),
			privateKey: Buffer.from(privateKey).toString("base64"),
		};
	} catch (error) {
		throw new Error(
			`Failed to generate RSA key pair: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Generate key pair based on algorithm
 *
 * @param options Key pair generation options
 * @returns Key pair with base64-encoded keys
 */
export function generateKeyPair(options: KeyPairOptions = {}): KeyPair {
	const algorithm = options.algorithm || "ed25519";

	switch (algorithm) {
		case "ed25519":
			return generateEd25519KeyPair(options);
		case "rsa":
			return generateRSAKeyPair(options);
		default:
			throw new Error(`Unsupported algorithm: ${algorithm}`);
	}
}

/**
 * Convert base64-encoded PEM key to PEM format string
 *
 * @param base64Key Base64-encoded PEM key (stored as base64)
 * @returns PEM-encoded key string
 */
export function base64ToPEM(base64Key: string): string {
	// Decode base64 to get the original PEM string
	const pemString = Buffer.from(base64Key, "base64").toString("utf8");
	return pemString;
}
