/**
 * Plugin Signature Module
 *
 * Exports for plugin code signing and verification system.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   ├─ lib/plugins/plugin-loader/plugin-loader.ts
 *   └─ scripts/plugin-sign.ts (future)
 *
 * Dependencies:
 *   ├─ lib/plugins/plugin-signature/types.ts
 *   ├─ lib/plugins/plugin-signature/key-manager.ts
 *   ├─ lib/plugins/plugin-signature/signer.ts
 *   └─ lib/plugins/plugin-signature/verifier.ts (future)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/plugin-code-signing.md
 */

// Key Management
export {
	base64ToPEM,
	generateEd25519KeyPair,
	generateKeyPair,
	generateRSAKeyPair,
} from "./key-manager";
// Signing
export {
	buildSignatureData,
	calculateCodeHash,
	serializeSignatureData,
	signPlugin,
	signWithEd25519,
	signWithRSA,
} from "./signer";
// Types
export type {
	KeyPair,
	KeyPairOptions,
	PluginSignature,
	SignatureAlgorithm,
	SignatureData,
	SignatureVerificationResult,
	SigningOptions,
	VerificationOptions,
} from "./types";
// Verification
export {
	verifyPluginSignature,
	verifyPluginSignatureFromDB,
	verifyWithEd25519,
	verifyWithRSA,
} from "./verifier";
