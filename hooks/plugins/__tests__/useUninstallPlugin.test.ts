/**
 * Tests for useUninstallPlugin hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - プラグインアンインストール成功
 * - TC-002: 異常系 - 認証エラー（未認証ユーザー）
 * - TC-003: 異常系 - データベースエラー
 * - TC-004: 正常系 - ストレージクリア失敗でも成功する
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { useUninstallPlugin } from "../useUninstallPlugin";
import { createMockSupabaseClient, createWrapper, mockUser } from "./helpers";

// Mock Supabase client
vi.mock("@/lib/supabase/client");

describe("useUninstallPlugin", () => {
	let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabaseClient = createMockSupabaseClient();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);
	});

	// TC-001: 正常系 - プラグインアンインストール成功
	test("TC-001: Should uninstall plugin successfully", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		let deleteCallCount = 0;
		let storageCallCount = 0;

		const mockDeleteQuery = {
			delete: vi.fn().mockReturnThis(),
			eq: vi.fn().mockImplementation(() => {
				deleteCallCount++;
				// Second eq() call resolves
				if (deleteCallCount === 2) {
					return Promise.resolve({
						data: null,
						error: null,
					});
				}
				return mockDeleteQuery;
			}),
		};

		const mockStorageDeleteQuery = {
			delete: vi.fn().mockReturnThis(),
			eq: vi.fn().mockImplementation(() => {
				storageCallCount++;
				// Second eq() call resolves
				if (storageCallCount === 2) {
					return Promise.resolve({
						data: null,
						error: null,
					});
				}
				return mockStorageDeleteQuery;
			}),
		};

		mockSupabaseClient.from = vi
			.fn()
			.mockReturnValueOnce(mockDeleteQuery)
			.mockReturnValueOnce(mockStorageDeleteQuery);

		const { result } = renderHook(() => useUninstallPlugin(), {
			wrapper: createWrapper(),
		});

		result.current.mutate("com.example.plugin");

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(mockDeleteQuery.delete).toHaveBeenCalled();
		expect(mockStorageDeleteQuery.delete).toHaveBeenCalled();
	});

	// TC-002: 異常系 - 認証エラー（未認証ユーザー）
	test("TC-002: Should throw error when user is not authenticated", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: null },
			error: { message: "Not authenticated" },
		});

		const { result } = renderHook(() => useUninstallPlugin(), {
			wrapper: createWrapper(),
		});

		result.current.mutate("com.example.plugin");

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

		let callCount = 0;
		const mockDeleteQuery = {
			delete: vi.fn().mockReturnThis(),
			eq: vi.fn().mockImplementation(() => {
				callCount++;
				// Second eq() call resolves with error
				if (callCount === 2) {
					return Promise.resolve({
						data: null,
						error: { message: "Database error" },
					});
				}
				return mockDeleteQuery;
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockDeleteQuery);

		const { result } = renderHook(() => useUninstallPlugin(), {
			wrapper: createWrapper(),
		});

		result.current.mutate("com.example.plugin");

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});

	// TC-004: 正常系 - ストレージクリア失敗でも成功する
	test("TC-004: Should succeed even if storage cleanup fails", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		let deleteCallCount = 0;
		let storageCallCount = 0;

		const mockDeleteQuery = {
			delete: vi.fn().mockReturnThis(),
			eq: vi.fn().mockImplementation(() => {
				deleteCallCount++;
				// Second eq() call resolves
				if (deleteCallCount === 2) {
					return Promise.resolve({
						data: null,
						error: null,
					});
				}
				return mockDeleteQuery;
			}),
		};

		const mockStorageDeleteQuery = {
			delete: vi.fn().mockReturnThis(),
			eq: vi.fn().mockImplementation(() => {
				storageCallCount++;
				// Second eq() call resolves with error
				if (storageCallCount === 2) {
					return Promise.resolve({
						data: null,
						error: { message: "Storage error" },
					});
				}
				return mockStorageDeleteQuery;
			}),
		};

		mockSupabaseClient.from = vi
			.fn()
			.mockReturnValueOnce(mockDeleteQuery)
			.mockReturnValueOnce(mockStorageDeleteQuery);

		const { result } = renderHook(() => useUninstallPlugin(), {
			wrapper: createWrapper(),
		});

		result.current.mutate("com.example.plugin");

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(mockDeleteQuery.delete).toHaveBeenCalled();
	});
});
