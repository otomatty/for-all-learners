/**
 * Tests for useUpdatePlugin hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - プラグイン更新成功
 * - TC-002: 異常系 - 認証エラー（未認証ユーザー）
 * - TC-003: 異常系 - プラグインが見つからない
 * - TC-004: 異常系 - プラグインがインストールされていない
 * - TC-005: 異常系 - 既に最新バージョン
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { useUpdatePlugin } from "../useUpdatePlugin";
import {
	createMockSupabaseClient,
	createWrapper,
	mockPluginRow,
	mockUser,
	mockUserPluginRow,
} from "./helpers";

// Mock Supabase client
vi.mock("@/lib/supabase/client");

describe("useUpdatePlugin", () => {
	let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabaseClient = createMockSupabaseClient();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);
	});

	// TC-001: 正常系 - プラグイン更新成功
	test("TC-001: Should update plugin successfully", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const updatedPluginRow = {
			...mockPluginRow,
			version: "2.0.0",
		};

		const mockPluginQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: updatedPluginRow,
				error: null,
			}),
		};

		const mockUserPluginQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: mockUserPluginRow,
				error: null,
			}),
		};

		let callCount = 0;
		const mockUpdateQuery = {
			update: vi.fn().mockReturnThis(),
			eq: vi.fn().mockImplementation(() => {
				callCount++;
				// Second eq() call resolves
				if (callCount === 2) {
					return Promise.resolve({
						data: null,
						error: null,
					});
				}
				return mockUpdateQuery;
			}),
		};

		mockSupabaseClient.from = vi
			.fn()
			.mockReturnValueOnce(mockPluginQuery)
			.mockReturnValueOnce(mockUserPluginQuery)
			.mockReturnValueOnce(mockUpdateQuery);

		const { result } = renderHook(() => useUpdatePlugin(), {
			wrapper: createWrapper(),
		});

		result.current.mutate("com.example.plugin");

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(mockUpdateQuery.update).toHaveBeenCalledWith({
			installed_version: "2.0.0",
		});
	});

	// TC-002: 異常系 - 認証エラー（未認証ユーザー）
	test("TC-002: Should throw error when user is not authenticated", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: null },
			error: { message: "Not authenticated" },
		});

		const { result } = renderHook(() => useUpdatePlugin(), {
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

		const { result } = renderHook(() => useUpdatePlugin(), {
			wrapper: createWrapper(),
		});

		result.current.mutate("non-existent-plugin");

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});

	// TC-004: 異常系 - プラグインがインストールされていない
	test("TC-004: Should throw error when plugin is not installed", async () => {
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

		const mockUserPluginQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: null,
				error: { code: "PGRST116" },
			}),
		};

		mockSupabaseClient.from = vi
			.fn()
			.mockReturnValueOnce(mockPluginQuery)
			.mockReturnValueOnce(mockUserPluginQuery);

		const { result } = renderHook(() => useUpdatePlugin(), {
			wrapper: createWrapper(),
		});

		result.current.mutate("com.example.plugin");

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});

	// TC-005: 異常系 - 既に最新バージョン
	test("TC-005: Should throw error when plugin is already at latest version", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockPluginQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: mockPluginRow, // version: "1.0.0"
				error: null,
			}),
		};

		const mockUserPluginQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: mockUserPluginRow, // installed_version: "1.0.0"
				error: null,
			}),
		};

		mockSupabaseClient.from = vi
			.fn()
			.mockReturnValueOnce(mockPluginQuery)
			.mockReturnValueOnce(mockUserPluginQuery);

		const { result } = renderHook(() => useUpdatePlugin(), {
			wrapper: createWrapper(),
		});

		result.current.mutate("com.example.plugin");

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});
});
