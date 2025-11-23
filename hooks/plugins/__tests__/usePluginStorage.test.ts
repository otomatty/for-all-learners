/**
 * Tests for usePluginStorage hooks
 *
 * Test Coverage:
 * - TC-001: 正常系 - ストレージ値の取得成功
 * - TC-002: 正常系 - ストレージ値が存在しない場合
 * - TC-003: 正常系 - ストレージ値の設定成功
 * - TC-004: 正常系 - ストレージ値の削除成功
 * - TC-005: 正常系 - ストレージキー一覧の取得
 * - TC-006: 正常系 - 全ストレージ値の取得
 * - TC-007: 正常系 - ストレージのクリア
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import {
	useClearPluginStorage,
	useDeletePluginStorage,
	useGetAllPluginStorage,
	useGetPluginStorage,
	useListPluginStorageKeys,
	useSetPluginStorage,
} from "../usePluginStorage";
import { createMockSupabaseClient, createWrapper, mockUser } from "./helpers";

// Mock Supabase client
vi.mock("@/lib/supabase/client");

describe("usePluginStorage", () => {
	let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabaseClient = createMockSupabaseClient();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);
	});

	describe("useGetPluginStorage", () => {
		// TC-001: 正常系 - ストレージ値の取得成功
		test("TC-001: Should get storage value successfully", async () => {
			mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
				data: { user: mockUser },
				error: null,
			});

			const mockValue = { setting: "value" };

			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({
					data: { value: mockValue },
					error: null,
				}),
			};

			mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

			const { result } = renderHook(
				() => useGetPluginStorage("test-plugin", "test-key"),
				{
					wrapper: createWrapper(),
				},
			);

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			expect(result.current.data).toEqual(mockValue);
		});

		// TC-002: 正常系 - ストレージ値が存在しない場合
		test("TC-002: Should return undefined when storage value does not exist", async () => {
			mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
				data: { user: mockUser },
				error: null,
			});

			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({
					data: null,
					error: { code: "PGRST116", message: "No rows found" },
				}),
			};

			mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

			const { result } = renderHook(
				() => useGetPluginStorage("test-plugin", "test-key"),
				{
					wrapper: createWrapper(),
				},
			);

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			expect(result.current.data).toBeNull();
		});
	});

	describe("useSetPluginStorage", () => {
		// TC-003: 正常系 - ストレージ値の設定成功
		test("TC-003: Should set storage value successfully", async () => {
			mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
				data: { user: mockUser },
				error: null,
			});

			const mockUpsert = vi.fn().mockResolvedValue({
				error: null,
			});

			mockSupabaseClient.from = vi.fn().mockReturnValue({
				upsert: mockUpsert,
			});

			const { result } = renderHook(() => useSetPluginStorage(), {
				wrapper: createWrapper(),
			});

			await result.current.mutateAsync({
				pluginId: "test-plugin",
				key: "test-key",
				value: { setting: "value" },
			});

			expect(mockUpsert).toHaveBeenCalledWith(
				{
					user_id: mockUser.id,
					plugin_id: "test-plugin",
					key: "test-key",
					value: { setting: "value" },
				},
				{
					onConflict: "user_id,plugin_id,key",
				},
			);
		});
	});

	describe("useDeletePluginStorage", () => {
		// TC-004: 正常系 - ストレージ値の削除成功
		test("TC-004: Should delete storage value successfully", async () => {
			mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
				data: { user: mockUser },
				error: null,
			});

			const mockEq1 = vi.fn().mockReturnThis();
			const mockEq2 = vi.fn().mockReturnThis();
			const mockEq3 = vi.fn().mockResolvedValue({
				error: null,
			});
			const mockDelete = vi.fn().mockReturnValue({
				eq: mockEq1,
			});

			mockSupabaseClient.from = vi.fn().mockReturnValue({
				delete: mockDelete,
			});
			mockEq1.mockReturnValue({
				eq: mockEq2,
			});
			mockEq2.mockReturnValue({
				eq: mockEq3,
			});

			const { result } = renderHook(() => useDeletePluginStorage(), {
				wrapper: createWrapper(),
			});

			await result.current.mutateAsync({
				pluginId: "test-plugin",
				key: "test-key",
			});

			expect(mockEq1).toHaveBeenCalledWith("user_id", mockUser.id);
			expect(mockEq2).toHaveBeenCalledWith("plugin_id", "test-plugin");
			expect(mockEq3).toHaveBeenCalledWith("key", "test-key");
		});
	});

	describe("useListPluginStorageKeys", () => {
		// TC-005: 正常系 - ストレージキー一覧の取得
		test("TC-005: Should get storage keys successfully", async () => {
			mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
				data: { user: mockUser },
				error: null,
			});

			const mockEq1 = vi.fn().mockReturnThis();
			const mockEq2 = vi.fn().mockResolvedValue({
				data: [{ key: "key1" }, { key: "key2" }],
				error: null,
			});
			const mockSelect = vi.fn().mockReturnValue({
				eq: mockEq1,
			});

			mockSupabaseClient.from = vi.fn().mockReturnValue({
				select: mockSelect,
			});
			mockEq1.mockReturnValue({
				eq: mockEq2,
			});

			const { result } = renderHook(
				() => useListPluginStorageKeys("test-plugin"),
				{
					wrapper: createWrapper(),
				},
			);

			await waitFor(
				() => {
					expect(result.current.isSuccess).toBe(true);
				},
				{ timeout: 3000 },
			);

			expect(result.current.data).toEqual(["key1", "key2"]);
		});
	});

	describe("useGetAllPluginStorage", () => {
		// TC-006: 正常系 - 全ストレージ値の取得
		test("TC-006: Should get all storage values successfully", async () => {
			mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
				data: { user: mockUser },
				error: null,
			});

			const mockEq1 = vi.fn().mockReturnThis();
			const mockEq2 = vi.fn().mockResolvedValue({
				data: [
					{ key: "key1", value: "value1" },
					{ key: "key2", value: "value2" },
				],
				error: null,
			});
			const mockSelect = vi.fn().mockReturnValue({
				eq: mockEq1,
			});

			mockSupabaseClient.from = vi.fn().mockReturnValue({
				select: mockSelect,
			});
			mockEq1.mockReturnValue({
				eq: mockEq2,
			});

			const { result } = renderHook(
				() => useGetAllPluginStorage("test-plugin"),
				{
					wrapper: createWrapper(),
				},
			);

			await waitFor(
				() => {
					expect(result.current.isSuccess).toBe(true);
				},
				{ timeout: 3000 },
			);

			expect(result.current.data).toEqual({
				key1: "value1",
				key2: "value2",
			});
		});
	});

	describe("useClearPluginStorage", () => {
		// TC-007: 正常系 - ストレージのクリア
		test("TC-007: Should clear all storage successfully", async () => {
			mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
				data: { user: mockUser },
				error: null,
			});

			const mockEq1 = vi.fn().mockReturnThis();
			const mockEq2 = vi.fn().mockResolvedValue({
				error: null,
			});
			const mockDelete = vi.fn().mockReturnValue({
				eq: mockEq1,
			});

			mockSupabaseClient.from = vi.fn().mockReturnValue({
				delete: mockDelete,
			});
			mockEq1.mockReturnValue({
				eq: mockEq2,
			});

			const { result } = renderHook(() => useClearPluginStorage(), {
				wrapper: createWrapper(),
			});

			await result.current.mutateAsync("test-plugin");

			expect(mockEq1).toHaveBeenCalledWith("user_id", mockUser.id);
			expect(mockEq2).toHaveBeenCalledWith("plugin_id", "test-plugin");
		});
	});
});
