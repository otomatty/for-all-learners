/**
 * Plugin Signature Verifier
 *
 * Verifies cryptographic signatures for plugin code.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ lib/plugins/plugin-loader/plugin-loader.ts
 *
 * Dependencies:
 *   ├─ lib/plugins/plugin-signature/types.ts
 *   ├─ lib/plugins/plugin-signature/key-manager.ts
 *   ├─ lib/plugins/plugin-signature/signer.ts
 *   ├─ types/plugin.ts
 *   └─ node:crypto (Node.js built-in)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/plugin-code-signing.md
 */

import { createVerify, verify } from "node:crypto";
import type { PluginManifest } from "@/types/plugin";
import { base64ToPEM } from "./key-manager";
import {
	buildSignatureData,
	calculateCodeHash,
	serializeSignatureData,
} from "./signer";
import type {
	PluginSignature,
	SignatureAlgorithm,
	SignatureData,
	SignatureVerificationResult,
	VerificationOptions,
} from "./types";

/**
 * Verify plugin signature with Ed25519
 *
 * @param signatureData Signature data to verify
 * @param signature Base64-encoded signature
 * @param publicKey Base64-encoded PEM public key
 * @returns True if signature is valid
 */
export function verifyWithEd25519(
	signatureData: SignatureData,
	signature: string,
	publicKey: string,
): boolean {
	try {
		const publicKeyPEM = base64ToPEM(publicKey);
		const serializedData = serializeSignatureData(signatureData);
		const dataBuffer = Buffer.from(serializedData, "utf8");
		const signatureBuffer = Buffer.from(signature, "base64");

		// Node.js crypto.verify() with Ed25519
		// Ed25519 doesn't use a hash algorithm, so we pass null
		const isValid = verify(null, dataBuffer, publicKeyPEM, signatureBuffer);
		return isValid;
	} catch (error) {
		// Fallback: try with createVerify if direct verify() fails
		if (
			error instanceof Error &&
			(error.message.includes("Invalid digest") ||
				error.message.includes("not supported"))
		) {
			try {
				const verifyObj = createVerify("Ed25519");
				const serializedData = serializeSignatureData(signatureData);
				verifyObj.update(serializedData, "utf8");
				verifyObj.end();
				return verifyObj.verify(base64ToPEM(publicKey), signature, "base64");
			} catch (_fallbackError) {
				return false;
			}
		}
		return false;
	}
}

/**
 * Verify plugin signature with RSA
 *
 * @param signatureData Signature data to verify
 * @param signature Base64-encoded signature
 * @param publicKey Base64-encoded PEM public key
 * @returns True if signature is valid
 */
export function verifyWithRSA(
	signatureData: SignatureData,
	signature: string,
	publicKey: string,
): boolean {
	try {
		const publicKeyPEM = base64ToPEM(publicKey);
		const serializedData = serializeSignatureData(signatureData);

		const verifyObj = createVerify("RSA-SHA256");
		verifyObj.update(serializedData, "utf8");
		verifyObj.end();

		return verifyObj.verify(publicKeyPEM, signature, "base64");
	} catch (_error) {
		return false;
	}
}

/**
 * Verify plugin signature
 *
 * @param manifest Plugin manifest
 * @param code Plugin code as string
 * @param pluginSignature Plugin signature
 * @param options Verification options
 * @returns Verification result
 */
export function verifyPluginSignature(
	manifest: PluginManifest,
	code: string,
	pluginSignature: PluginSignature,
	options: VerificationOptions,
): SignatureVerificationResult {
	// Validate inputs
	if (!manifest.id || !manifest.version || !manifest.author) {
		return {
			valid: false,
			error: "Invalid manifest: missing required fields",
		};
	}

	if (!code || code.trim().length === 0) {
		return {
			valid: false,
			error: "Invalid code: code cannot be empty",
		};
	}

	if (!pluginSignature.signature || !pluginSignature.signatureData) {
		return {
			valid: false,
			error: "Invalid signature: signature data is missing",
		};
	}

	if (!options.publicKey) {
		return {
			valid: false,
			error: "Invalid options: publicKey is required",
		};
	}

	// Calculate code hash
	const codeHash = calculateCodeHash(code);

	// Rebuild signature data from manifest and code hash
	const expectedSignatureData = buildSignatureData(manifest, codeHash);

	// Verify signature data matches
	if (
		expectedSignatureData.pluginId !== pluginSignature.signatureData.pluginId ||
		expectedSignatureData.version !== pluginSignature.signatureData.version ||
		expectedSignatureData.codeHash !== pluginSignature.signatureData.codeHash ||
		expectedSignatureData.author !== pluginSignature.signatureData.author
	) {
		return {
			valid: false,
			error: "Signature data mismatch: manifest or code has been modified",
		};
	}

	// Verify signature
	const algorithm = options.algorithm || pluginSignature.algorithm || "ed25519";
	let isValid: boolean;

	switch (algorithm) {
		case "ed25519":
			isValid = verifyWithEd25519(
				pluginSignature.signatureData,
				pluginSignature.signature,
				options.publicKey,
			);
			break;
		case "rsa":
			isValid = verifyWithRSA(
				pluginSignature.signatureData,
				pluginSignature.signature,
				options.publicKey,
			);
			break;
		default:
			return {
				valid: false,
				error: `Unsupported algorithm: ${algorithm}`,
			};
	}

	if (!isValid) {
		return {
			valid: false,
			error: "Invalid signature: signature verification failed",
		};
	}

	return {
		valid: true,
		error: null,
		details: {
			algorithm,
			codeHash,
			verifiedAt: Date.now(),
		},
	};
}

/**
 * Verify plugin signature from database format
 *
 * This is a convenience function for verifying signatures stored in the database.
 * Note: The timestamp in signatureData must match the original signing timestamp.
 * If signedAt is provided, it will be used; otherwise, the current timestamp is used
 * (which may cause verification to fail if the signature was created with a different timestamp).
 *
 * @param manifest Plugin manifest
 * @param code Plugin code as string
 * @param signature Base64-encoded signature (from database)
 * @param publicKey Base64-encoded public key (from database)
 * @param algorithm Signature algorithm (from database, defaults to "ed25519")
 * @param signedAt Timestamp when the plugin was signed (from database, optional)
 * @returns Verification result
 */
export function verifyPluginSignatureFromDB(
	manifest: PluginManifest,
	code: string,
	signature: string | null,
	publicKey: string | null,
	algorithm: SignatureAlgorithm | null = "ed25519",
	signedAt?: number | string | null,
): SignatureVerificationResult {
	// Check if signature exists
	if (!signature || !publicKey) {
		return {
			valid: false,
			error: "Signature or public key is missing",
		};
	}

	// Use provided algorithm or default to ed25519
	const signatureAlgorithm: SignatureAlgorithm = algorithm || "ed25519";

	// Calculate code hash
	const codeHash = calculateCodeHash(code);

	// Build signature data with timestamp
	// If signedAt is provided, use it; otherwise use current timestamp
	// Note: This may cause verification to fail if the signature was created with a different timestamp
	const timestamp =
		signedAt !== undefined && signedAt !== null
			? typeof signedAt === "string"
				? new Date(signedAt).getTime()
				: signedAt
			: Date.now();

	const signatureData: SignatureData = {
		pluginId: manifest.id,
		version: manifest.version,
		codeHash,
		timestamp,
		author: manifest.author,
	};

	// Create plugin signature object
	const pluginSignature: PluginSignature = {
		algorithm: signatureAlgorithm,
		signature,
		signatureData,
		signedAt: timestamp,
	};

	// Verify
	return verifyPluginSignature(manifest, code, pluginSignature, {
		publicKey,
		algorithm: signatureAlgorithm,
	});
}
