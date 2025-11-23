/**
 * Tests for useInstalledPlugins hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - インストール済みプラグイン取得成功
 * - TC-002: 異常系 - 認証エラー（未認証ユーザー）
 * - TC-003: 異常系 - データベースエラー
 * - TC-004: エッジケース - 空の結果セット
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { useInstalledPlugins } from "../useInstalledPlugins";
import {
	createMockSupabaseClient,
	createWrapper,
	mockPluginRow,
	mockUser,
	mockUserPluginRow,
} from "./helpers";

// Mock Supabase client
vi.mock("@/lib/supabase/client");

describe("useInstalledPlugins", () => {
	let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabaseClient = createMockSupabaseClient();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);
	});

	// TC-001: 正常系 - インストール済みプラグイン取得成功
	test("TC-001: Should fetch installed plugins successfully", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockData = [
			{
				...mockUserPluginRow,
				metadata: mockPluginRow,
			},
		];

		const mockQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			order: vi.fn().mockResolvedValue({
				data: mockData,
				error: null,
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => useInstalledPlugins(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
		expect(result.current.data?.length).toBeGreaterThan(0);
		expect(result.current.data?.[0]?.pluginId).toBe("com.example.plugin");
		expect(result.current.data?.[0]?.metadata).toBeDefined();
	});

	// TC-002: 異常系 - 認証エラー（未認証ユーザー）
	test("TC-002: Should throw error when user is not authenticated", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: null },
			error: { message: "Not authenticated" },
		});

		const mockQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			order: vi.fn(),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => useInstalledPlugins(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});

	// TC-003: 異常系 - データベースエラー
	test("TC-003: Should handle database error", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			order: vi.fn().mockResolvedValue({
				data: null,
				error: { message: "Database error" },
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => useInstalledPlugins(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});

	// TC-004: エッジケース - 空の結果セット
	test("TC-004: Should handle empty result set", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			order: vi.fn().mockResolvedValue({
				data: [],
				error: null,
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => useInstalledPlugins(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
		expect(result.current.data?.length).toBe(0);
	});
});
