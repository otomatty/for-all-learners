/**
 * User API Keys Migration Tests
 *
 * Tests for database/migrations/20251102_add_user_api_keys.sql
 *
 * Related Files:
 *   ├─ Spec: ../20251102_add_user_api_keys.spec.md
 *   ├─ Migration: ../20251102_add_user_api_keys.sql
 *   └─ Plan: docs/03_plans/mastra-infrastructure/20251102_01_implementation-plan.md
 */

import {
	describe,
	test,
	expect,
	beforeAll,
	afterAll,
	beforeEach,
} from "vitest";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("user_api_keys Migration", () => {
	let supabase: SupabaseClient;
	let testUserId: string;
	let testUserEmail: string;
	let testUserPassword: string;

	beforeAll(async () => {
		supabase = await createClient();

		// Create test user
		testUserEmail = `test-${Date.now()}@example.com`;
		testUserPassword = "test-password-123";

		const { data: authData, error: authError } = await supabase.auth.signUp({
			email: testUserEmail,
			password: testUserPassword,
		});

		if (authError || !authData.user) {
			throw new Error("Failed to create test user");
		}

		testUserId = authData.user.id;
	});

	afterAll(async () => {
		// Cleanup: delete test user (cascade will delete API keys)
		if (testUserId) {
			await supabase.auth.admin.deleteUser(testUserId);
		}
	});

	beforeEach(async () => {
		// Clean up test data before each test
		await supabase.from("user_api_keys").delete().eq("user_id", testUserId);
	});

	// ============================================================
	// TC-001: テーブル作成
	// ============================================================

	test("TC-001: user_api_keys テーブルが存在する", async () => {
		const { data, error } = await supabase
			.from("user_api_keys")
			.select("*")
			.limit(1);

		expect(error).toBeNull();
		expect(data).toBeDefined();
	});

	// ============================================================
	// TC-002: APIキー挿入
	// ============================================================

	test("TC-002: APIキーを挿入できる", async () => {
		const testData = {
			user_id: testUserId,
			provider: "gemini",
			encrypted_api_key: "encrypted_test_key_123",
			is_active: true,
		};

		const { data, error } = await supabase
			.from("user_api_keys")
			.insert(testData)
			.select()
			.single();

		expect(error).toBeNull();
		expect(data).toBeDefined();
		if (data) {
			expect(data.provider).toBe("gemini");
			expect(data.user_id).toBe(testUserId);
			expect(data.encrypted_api_key).toBe("encrypted_test_key_123");
		}
	});

	// ============================================================
	// TC-003: UNIQUE制約
	// ============================================================

	test("TC-003: 同じユーザー・プロバイダーで重複挿入できない", async () => {
		const testData = {
			user_id: testUserId,
			provider: "gemini",
			encrypted_api_key: "encrypted_test_key_123",
		};

		// 1回目の挿入
		const { error: firstError } = await supabase
			.from("user_api_keys")
			.insert(testData);

		expect(firstError).toBeNull();

		// 2回目の挿入（重複）
		const { error: secondError } = await supabase
			.from("user_api_keys")
			.insert(testData);

		expect(secondError).not.toBeNull();
		expect(secondError?.code).toBe("23505"); // PostgreSQL unique violation
	});

	// ============================================================
	// TC-004: 外部キー制約
	// ============================================================

	test("TC-004: 存在しないuser_idは挿入できない", async () => {
		const { error } = await supabase.from("user_api_keys").insert({
			user_id: "00000000-0000-0000-0000-000000000000", // 存在しないID
			provider: "gemini",
			encrypted_api_key: "test_key",
		});

		expect(error).not.toBeNull();
		expect(error?.code).toBe("23503"); // PostgreSQL foreign key violation
	});

	// ============================================================
	// TC-005: RLS - 自分のAPIキーにアクセス
	// ============================================================

	test("TC-005: 自分のAPIキーを取得できる", async () => {
		// ユーザーとして認証
		const { error: signInError } = await supabase.auth.signInWithPassword({
			email: testUserEmail,
			password: testUserPassword,
		});

		expect(signInError).toBeNull();

		// APIキー挿入
		await supabase.from("user_api_keys").insert({
			user_id: testUserId,
			provider: "gemini",
			encrypted_api_key: "encrypted_key_test",
		});

		// APIキー取得
		const { data, error } = await supabase
			.from("user_api_keys")
			.select("*")
			.eq("provider", "gemini");

		expect(error).toBeNull();
		expect(data).toHaveLength(1);
		if (data && data.length > 0) {
			expect(data[0].encrypted_api_key).toBe("encrypted_key_test");
		}
	});

	// ============================================================
	// TC-006: RLS - 他人のAPIキーにアクセス不可
	// ============================================================

	test("TC-006: 他人のAPIキーにアクセスできない", async () => {
		// Create another test user (User B)
		const userBEmail = `test-userb-${Date.now()}@example.com`;
		const userBPassword = "test-password-456";

		const { data: userBData } = await supabase.auth.signUp({
			email: userBEmail,
			password: userBPassword,
		});

		if (!userBData.user) {
			throw new Error("Failed to create User B");
		}

		const userBId = userBData.user.id; // ユーザーAのAPIキー挿入（service roleで挿入）
		const { error: insertError } = await supabase.from("user_api_keys").insert({
			user_id: testUserId,
			provider: "gemini",
			encrypted_api_key: "encrypted_key_A",
		});

		expect(insertError).toBeNull();

		// ユーザーBとして認証
		await supabase.auth.signInWithPassword({
			email: userBEmail,
			password: userBPassword,
		});

		// ユーザーAのAPIキーを取得しようとする
		const { data, error } = await supabase
			.from("user_api_keys")
			.select("*")
			.eq("user_id", testUserId);

		expect(error).toBeNull(); // エラーはないが...
		expect(data).toHaveLength(0); // 取得できない（空配列）

		// Cleanup: delete User B
		await supabase.auth.admin.deleteUser(userBId);
	});

	// ============================================================
	// TC-007: カスケード削除
	// ============================================================

	test("TC-007: ユーザー削除時にAPIキーも削除される", async () => {
		// Create temporary test user
		const tempUserEmail = `temp-${Date.now()}@example.com`;
		const tempUserPassword = "temp-password-789";

		const { data: tempUserData } = await supabase.auth.signUp({
			email: tempUserEmail,
			password: tempUserPassword,
		});

		if (!tempUserData.user) {
			throw new Error("Failed to create temp user");
		}

		const tempUserId = tempUserData.user.id; // APIキー挿入
		await supabase.from("user_api_keys").insert({
			user_id: tempUserId,
			provider: "gemini",
			encrypted_api_key: "temp_key",
		});

		// APIキーが存在することを確認
		const { data: beforeData } = await supabase
			.from("user_api_keys")
			.select("*")
			.eq("user_id", tempUserId);

		expect(beforeData).toHaveLength(1);

		// ユーザー削除
		await supabase.auth.admin.deleteUser(tempUserId);

		// APIキーが削除されているか確認
		const { data: afterData } = await supabase
			.from("user_api_keys")
			.select("*")
			.eq("user_id", tempUserId);

		expect(afterData).toHaveLength(0);
	});

	// ============================================================
	// TC-008: タイムスタンプ自動設定
	// ============================================================

	test("TC-008: タイムスタンプが自動設定される", async () => {
		const beforeInsert = new Date();

		const { data } = await supabase
			.from("user_api_keys")
			.insert({
				user_id: testUserId,
				provider: "openai",
				encrypted_api_key: "test_key",
			})
			.select()
			.single();

		const afterInsert = new Date();

		expect(data).toBeDefined();
		if (!data) {
			throw new Error("Data is undefined");
		}

		expect(data.created_at).toBeDefined();
		expect(data.updated_at).toBeDefined();

		const createdAt = new Date(data.created_at);
		const updatedAt = new Date(data.updated_at); // created_at が挿入前後の時刻範囲内
		expect(createdAt.getTime()).toBeGreaterThanOrEqual(beforeInsert.getTime());
		expect(createdAt.getTime()).toBeLessThanOrEqual(afterInsert.getTime());

		// updated_at が挿入前後の時刻範囲内
		expect(updatedAt.getTime()).toBeGreaterThanOrEqual(beforeInsert.getTime());
		expect(updatedAt.getTime()).toBeLessThanOrEqual(afterInsert.getTime());
	});

	// ============================================================
	// Additional Tests
	// ============================================================

	test("複数のプロバイダーのAPIキーを同時に保存できる", async () => {
		const providers = ["gemini", "openai", "claude"];

		for (const provider of providers) {
			await supabase.from("user_api_keys").insert({
				user_id: testUserId,
				provider,
				encrypted_api_key: `encrypted_key_${provider}`,
			});
		}

		const { data } = await supabase
			.from("user_api_keys")
			.select("*")
			.eq("user_id", testUserId);

		expect(data).toHaveLength(3);
		if (data) {
			expect(data.map((k) => k.provider).sort()).toEqual([
				"claude",
				"gemini",
				"openai",
			]);
		}
	});

	test("is_active フラグでAPIキーをフィルタリングできる", async () => {
		// Active API key
		await supabase.from("user_api_keys").insert({
			user_id: testUserId,
			provider: "gemini",
			encrypted_api_key: "active_key",
			is_active: true,
		});

		// Inactive API key
		await supabase.from("user_api_keys").insert({
			user_id: testUserId,
			provider: "openai",
			encrypted_api_key: "inactive_key",
			is_active: false,
		});

		// Query only active keys
		const { data } = await supabase
			.from("user_api_keys")
			.select("*")
			.eq("user_id", testUserId)
			.eq("is_active", true);

		expect(data).toHaveLength(1);
		if (data && data.length > 0) {
			expect(data[0].provider).toBe("gemini");
		}
	});

	test("updated_at が更新時に自動的に変更される", async () => {
		// Insert
		const { data: insertedData } = await supabase
			.from("user_api_keys")
			.insert({
				user_id: testUserId,
				provider: "gemini",
				encrypted_api_key: "original_key",
			})
			.select()
			.single();

		if (!insertedData) {
			throw new Error("Failed to insert data");
		}

		const originalUpdatedAt = insertedData.updated_at;

		// Wait a bit
		await new Promise((resolve) => setTimeout(resolve, 1000));

		// Update
		const { data: updatedData } = await supabase
			.from("user_api_keys")
			.update({
				encrypted_api_key: "new_key",
			})
			.eq("user_id", testUserId)
			.eq("provider", "gemini")
			.select()
			.single();

		if (!updatedData) {
			throw new Error("Failed to update data");
		}

		const newUpdatedAt = updatedData.updated_at;

		// updated_at should be different
		expect(new Date(newUpdatedAt).getTime()).toBeGreaterThan(
			new Date(originalUpdatedAt).getTime(),
		);
	});
});
