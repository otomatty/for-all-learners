/**
 * Tests for useUpdatePluginConfig hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - プラグイン設定更新成功
 * - TC-002: 異常系 - 認証エラー（未認証ユーザー）
 * - TC-003: 異常系 - データベースエラー
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { useUpdatePluginConfig } from "../useUpdatePluginConfig";
import { createMockSupabaseClient, createWrapper, mockUser } from "./helpers";

// Mock Supabase client
vi.mock("@/lib/supabase/client");

describe("useUpdatePluginConfig", () => {
	let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabaseClient = createMockSupabaseClient();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);
	});

	// TC-001: 正常系 - プラグイン設定更新成功
	test("TC-001: Should update plugin config successfully", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

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

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockUpdateQuery);

		const { result } = renderHook(() => useUpdatePluginConfig(), {
			wrapper: createWrapper(),
		});

		const config = { apiKey: "test-key", enabled: true };

		result.current.mutate({
			pluginId: "com.example.plugin",
			config,
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(mockUpdateQuery.update).toHaveBeenCalledWith({
			config,
		});
	});

	// TC-002: 異常系 - 認証エラー（未認証ユーザー）
	test("TC-002: Should throw error when user is not authenticated", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: null },
			error: { message: "Not authenticated" },
		});

		const { result } = renderHook(() => useUpdatePluginConfig(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({
			pluginId: "com.example.plugin",
			config: { apiKey: "test-key" },
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

		let callCount = 0;
		const mockUpdateQuery = {
			update: vi.fn().mockReturnThis(),
			eq: vi.fn().mockImplementation(() => {
				callCount++;
				// Second eq() call resolves with error
				if (callCount === 2) {
					return Promise.resolve({
						data: null,
						error: { message: "Database error" },
					});
				}
				return mockUpdateQuery;
			}),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockUpdateQuery);

		const { result } = renderHook(() => useUpdatePluginConfig(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({
			pluginId: "com.example.plugin",
			config: { apiKey: "test-key" },
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});
});
