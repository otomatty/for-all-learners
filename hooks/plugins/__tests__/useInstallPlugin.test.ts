/**
 * Tests for useInstallPlugin hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - プラグインインストール成功
 * - TC-002: 異常系 - 認証エラー（未認証ユーザー）
 * - TC-003: 異常系 - プラグインが見つからない
 * - TC-004: 異常系 - 既にインストール済み
 * - TC-005: 正常系 - ダウンロード数のインクリメント
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { useInstallPlugin } from "../useInstallPlugin";
import {
	createMockSupabaseClient,
	createWrapper,
	mockPluginRow,
	mockUser,
} from "./helpers";

// Mock Supabase client
vi.mock("@/lib/supabase/client");

describe("useInstallPlugin", () => {
	let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabaseClient = createMockSupabaseClient();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);
	});

	// TC-001: 正常系 - プラグインインストール成功
	test("TC-001: Should install plugin successfully", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		// Mock plugin query
		const mockPluginQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: mockPluginRow,
				error: null,
			}),
		};

		// Mock existing plugin check (should return null - not installed)
		const mockExistingQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: null,
				error: { code: "PGRST116" },
			}),
		};

		// Mock insert query
		const mockInsertQuery = {
			insert: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: { id: "new-user-plugin-123" },
				error: null,
			}),
		};

		// Mock RPC call
		mockSupabaseClient.rpc = vi.fn().mockResolvedValue({
			data: null,
			error: null,
		});

		mockSupabaseClient.from = vi
			.fn()
			.mockReturnValueOnce(mockPluginQuery)
			.mockReturnValueOnce(mockExistingQuery)
			.mockReturnValueOnce(mockInsertQuery);

		const { result } = renderHook(() => useInstallPlugin(), {
			wrapper: createWrapper(),
		});

		result.current.mutate("com.example.plugin");

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(mockInsertQuery.insert).toHaveBeenCalled();
		expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
			"increment_plugin_downloads",
			{ p_plugin_id: "com.example.plugin" },
		);
	});

	// TC-002: 異常系 - 認証エラー（未認証ユーザー）
	test("TC-002: Should throw error when user is not authenticated", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: null },
			error: { message: "Not authenticated" },
		});

		const { result } = renderHook(() => useInstallPlugin(), {
			wrapper: createWrapper(),
		});

		result.current.mutate("com.example.plugin");

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});

	// TC-003: 異常系 - プラグインが見つからない
	test("TC-003: Should throw error when plugin is not found", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockPluginQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: null,
				error: { code: "PGRST116" },
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockPluginQuery);

		const { result } = renderHook(() => useInstallPlugin(), {
			wrapper: createWrapper(),
		});

		result.current.mutate("non-existent-plugin");

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});

	// TC-004: 異常系 - 既にインストール済み
	test("TC-004: Should throw error when plugin is already installed", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockPluginQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: mockPluginRow,
				error: null,
			}),
		};

		const mockExistingQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: { id: "existing-plugin" },
				error: null,
			}),
		};

		mockSupabaseClient.from = vi
			.fn()
			.mockReturnValueOnce(mockPluginQuery)
			.mockReturnValueOnce(mockExistingQuery);

		const { result } = renderHook(() => useInstallPlugin(), {
			wrapper: createWrapper(),
		});

		result.current.mutate("com.example.plugin");

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});
});
