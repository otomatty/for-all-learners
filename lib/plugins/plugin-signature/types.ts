/**
 * Plugin Signature Types
 *
 * Type definitions for plugin code signing and verification.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   ├─ lib/plugins/plugin-signature/signer.ts
 *   ├─ lib/plugins/plugin-signature/verifier.ts
 *   └─ lib/plugins/plugin-signature/key-manager.ts
 *
 * Dependencies:
 *   └─ types/plugin.ts
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/plugin-code-signing.md
 */

/**
 * Signature algorithm supported
 */
export type SignatureAlgorithm = "ed25519" | "rsa";

/**
 * Signature data structure
 *
 * This data is signed along with the plugin code hash.
 */
export interface SignatureData {
	pluginId: string;
	version: string;
	codeHash: string; // SHA-256 hash of plugin code
	timestamp: number;
	author: string;
}

/**
 * Plugin signature
 *
 * Contains the signature and metadata about the signing process.
 */
export interface PluginSignature {
	algorithm: SignatureAlgorithm;
	signature: string; // Base64-encoded signature
	signatureData: SignatureData;
	signedAt: number; // Unix timestamp
	publicKey?: string; // Base64-encoded public key (optional, may be stored separately)
}

/**
 * Signature verification result
 */
export interface SignatureVerificationResult {
	valid: boolean;
	error: string | null;
	details?: {
		algorithm: SignatureAlgorithm;
		codeHash: string;
		verifiedAt: number;
	};
}

/**
 * Key pair for signing
 */
export interface KeyPair {
	publicKey: string; // Base64-encoded public key
	privateKey: string; // Base64-encoded private key (for signing only)
}

/**
 * Key pair generation options
 */
export interface KeyPairOptions {
	algorithm?: SignatureAlgorithm;
}

/**
 * Signing options
 */
export interface SigningOptions {
	privateKey: string; // Base64-encoded private key
	publicKey?: string; // Base64-encoded public key (optional, for returning in signature)
	algorithm?: SignatureAlgorithm;
}

/**
 * Verification options
 */
export interface VerificationOptions {
	publicKey: string; // Base64-encoded public key
	algorithm?: SignatureAlgorithm;
}

/**
 * Plugin signature information for API responses
 */
export interface PluginSignatureInfo {
	pluginId: string;
	name: string;
	version: string;
	author: string;
	hasSignature: boolean;
	signature: string | null;
	publicKey: string | null;
	signatureAlgorithm: "ed25519" | "rsa" | null;
	signedAt: Date | null;
	isOfficial: boolean;
	isReviewed: boolean;
}

/**
 * Signature verification log entry
 */
export interface SignatureVerificationLog {
	id: string;
	pluginId: string;
	userId: string | null;
	verificationResult: "valid" | "invalid" | "missing" | "error";
	errorMessage: string | null;
	verifiedAt: Date;
}
