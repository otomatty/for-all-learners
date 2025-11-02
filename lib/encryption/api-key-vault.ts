/**
 * API Key Vault - Encryption utilities
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   ├─ app/_actions/ai/apiKey.ts (Phase 0.4)
 *   └─ lib/mastra/client.ts (Phase 0.3)
 *
 * Dependencies (依存先):
 *   ├─ node:crypto (Node.js標準)
 *   └─ process.env.ENCRYPTION_KEY
 *
 * Related Files:
 *   ├─ Spec: ./api-key-vault.spec.md
 *   ├─ Tests: ./__tests__/api-key-vault.test.ts
 *   └─ README: ./README.md
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 128 bits

// Get encryption key from environment
const ENCRYPTION_KEY_HEX = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY_HEX) {
	throw new Error("ENCRYPTION_KEY environment variable is not set");
}

const KEY = Buffer.from(ENCRYPTION_KEY_HEX, "hex");

if (KEY.length !== 32) {
	throw new Error("ENCRYPTION_KEY must be 32 bytes (64 hex characters)");
}

/**
 * Encrypt API key using AES-256-GCM
 *
 * @param apiKey - Plain text API key to encrypt
 * @returns Encrypted string in format: "iv:authTag:encrypted"
 * @throws Error if encryption fails
 *
 * @example
 * ```typescript
 * const encrypted = await encryptAPIKey('sk-test-123');
 * console.log(encrypted); // "1a2b3c...:4d5e6f...:7g8h9i..."
 * ```
 */
export async function encryptAPIKey(apiKey: string): Promise<string> {
	try {
		// Generate random IV
		const iv = randomBytes(IV_LENGTH);

		// Create cipher
		const cipher = createCipheriv(ALGORITHM, KEY, iv);

		// Encrypt
		let encrypted = cipher.update(apiKey, "utf8", "hex");
		encrypted += cipher.final("hex");

		// Get auth tag
		const authTag = cipher.getAuthTag();

		// Combine: iv:authTag:encrypted
		return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
	} catch (error) {
		// Don't include the API key in error message for security
		throw new Error(
			`Failed to encrypt API key: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}

/**
 * Decrypt encrypted API key
 *
 * @param encryptedKey - Encrypted string from encryptAPIKey
 * @returns Plain text API key
 * @throws Error if decryption fails or format is invalid
 *
 * @example
 * ```typescript
 * const decrypted = await decryptAPIKey('1a2b3c...:4d5e6f...:7g8h9i...');
 * console.log(decrypted); // "sk-test-123"
 * ```
 */
export async function decryptAPIKey(encryptedKey: string): Promise<string> {
	try {
		// Split into components
		const parts = encryptedKey.split(":");

		if (parts.length !== 3) {
			throw new Error("Invalid encrypted key format");
		}

		const [ivHex, authTagHex, encrypted] = parts;

		// Convert from hex
		const iv = Buffer.from(ivHex, "hex");
		const authTag = Buffer.from(authTagHex, "hex");

		// Create decipher
		const decipher = createDecipheriv(ALGORITHM, KEY, iv);
		decipher.setAuthTag(authTag);

		// Decrypt
		let decrypted = decipher.update(encrypted, "hex", "utf8");
		decrypted += decipher.final("utf8");

		return decrypted;
	} catch (error) {
		// Don't include the encrypted key in error message for security
		throw new Error(
			`Failed to decrypt API key: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}
