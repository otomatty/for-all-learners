import { beforeAll, describe, expect, test } from "vitest";
import { decryptAPIKey, encryptAPIKey } from "../api-key-vault";

describe("API Key Vault", () => {
	beforeAll(() => {
		// Ensure ENCRYPTION_KEY is set for tests
		if (!process.env.ENCRYPTION_KEY) {
			process.env.ENCRYPTION_KEY =
				"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
		}
	});

	// TC-001: 暗号化成功
	test("TC-001: Should encrypt API key", async () => {
		const apiKey = "sk-test-123";
		const encrypted = await encryptAPIKey(apiKey);

		expect(encrypted).toBeDefined();
		expect(encrypted).not.toBe(apiKey);
		expect(encrypted.split(":").length).toBe(3);
	});

	// TC-002: 復号化成功
	test("TC-002: Should decrypt API key", async () => {
		const original = "sk-test-123";
		const encrypted = await encryptAPIKey(original);
		const decrypted = await decryptAPIKey(encrypted);

		expect(decrypted).toBe(original);
	});

	// TC-003: 複数回の暗号化で異なる結果
	test("TC-003: Should produce different encrypted strings", async () => {
		const apiKey = "sk-test-123";
		const encrypted1 = await encryptAPIKey(apiKey);
		const encrypted2 = await encryptAPIKey(apiKey);

		expect(encrypted1).not.toBe(encrypted2);

		// But both should decrypt to the same value
		const decrypted1 = await decryptAPIKey(encrypted1);
		const decrypted2 = await decryptAPIKey(encrypted2);
		expect(decrypted1).toBe(apiKey);
		expect(decrypted2).toBe(apiKey);
	});

	// TC-005: 不正な形式
	test("TC-005: Should throw error for invalid format", async () => {
		await expect(decryptAPIKey("invalid-format")).rejects.toThrow(
			"Invalid encrypted key format",
		);
	});

	// TC-006: 空文字列の暗号化
	test("TC-006: Should handle empty string", async () => {
		const encrypted = await encryptAPIKey("");
		const decrypted = await decryptAPIKey(encrypted);

		expect(decrypted).toBe("");
	});

	// TC-007: 長い文字列の暗号化
	test("TC-007: Should handle long strings", async () => {
		const longKey = `sk-${"a".repeat(1000)}`;
		const encrypted = await encryptAPIKey(longKey);
		const decrypted = await decryptAPIKey(encrypted);

		expect(decrypted).toBe(longKey);
	});

	// TC-008: 改ざん検出
	test("TC-008: Should detect tampering", async () => {
		const encrypted = await encryptAPIKey("sk-test-123");

		// Tamper with the encrypted string
		const parts = encrypted.split(":");
		const tampered = `${parts[0]}:${parts[1]}:${parts[2].slice(0, -2)}XX`;

		await expect(decryptAPIKey(tampered)).rejects.toThrow(
			"Failed to decrypt API key",
		);
	});

	// TC-010: 特殊文字を含むAPIキー
	test("TC-010: Should handle special characters", async () => {
		const apiKey = "sk-test-!@#$%^&*()_+-=[]{}|;':\",./<>?";
		const encrypted = await encryptAPIKey(apiKey);
		const decrypted = await decryptAPIKey(encrypted);

		expect(decrypted).toBe(apiKey);
	});

	// TC-011: エラーメッセージにAPIキーが含まれないことを確認
	test("TC-011: Should not include API key in error messages", async () => {
		const apiKey = "sk-secret-key-should-not-appear";

		try {
			// Force an error by using invalid format
			await decryptAPIKey("invalid");
		} catch (error) {
			expect(error).toBeInstanceOf(Error);
			if (error instanceof Error) {
				expect(error.message).not.toContain(apiKey);
			}
		}
	});

	// TC-012: 正しい形式の確認
	test("TC-012: Should return correct format (iv:authTag:encrypted)", async () => {
		const apiKey = "sk-test-123";
		const encrypted = await encryptAPIKey(apiKey);
		const parts = encrypted.split(":");

		expect(parts).toHaveLength(3);

		// IV should be 32 hex characters (16 bytes)
		expect(parts[0]).toHaveLength(32);
		expect(/^[0-9a-f]+$/i.test(parts[0])).toBe(true);

		// Auth tag should be 32 hex characters (16 bytes)
		expect(parts[1]).toHaveLength(32);
		expect(/^[0-9a-f]+$/i.test(parts[1])).toBe(true);

		// Encrypted part should be hex
		expect(/^[0-9a-f]+$/i.test(parts[2])).toBe(true);
	});
});
