/**
 * Tests for useIsPluginInstalled hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - プラグインがインストールされている
 * - TC-002: 正常系 - プラグインがインストールされていない
 * - TC-003: 異常系 - 未認証ユーザー（falseを返す）
 * - TC-004: 異常系 - データベースエラー
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { useIsPluginInstalled } from "../useIsPluginInstalled";
import { createMockSupabaseClient, createWrapper, mockUser } from "./helpers";

// Mock Supabase client
vi.mock("@/lib/supabase/client");

describe("useIsPluginInstalled", () => {
	let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabaseClient = createMockSupabaseClient();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);
	});

	// TC-001: 正常系 - プラグインがインストールされている
	test("TC-001: Should return true when plugin is installed", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: { id: "user-plugin-123" },
				error: null,
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(
			() => useIsPluginInstalled("com.example.plugin"),
			{
				wrapper: createWrapper(),
			},
		);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBe(true);
	});

	// TC-002: 正常系 - プラグインがインストールされていない
	test("TC-002: Should return false when plugin is not installed", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: null,
				error: { code: "PGRST116" },
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(
			() => useIsPluginInstalled("non-existent-plugin"),
			{
				wrapper: createWrapper(),
			},
		);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBe(false);
	});

	// TC-003: 異常系 - 未認証ユーザー（falseを返す）
	test("TC-003: Should return false when user is not authenticated", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: null },
			error: { message: "Not authenticated" },
		});

		const { result } = renderHook(
			() => useIsPluginInstalled("com.example.plugin"),
			{
				wrapper: createWrapper(),
			},
		);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBe(false);
	});

	// TC-004: 異常系 - データベースエラー
	test("TC-004: Should handle database error", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: null,
				error: { message: "Database error" },
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(
			() => useIsPluginInstalled("com.example.plugin"),
			{
				wrapper: createWrapper(),
			},
		);

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});
});
