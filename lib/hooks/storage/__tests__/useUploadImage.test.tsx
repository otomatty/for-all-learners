/**
 * Tests for useUploadImage hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - 画像アップロード成功
 * - TC-002: 異常系 - 未認証ユーザー
 * - TC-003: 異常系 - アップロードエラー
 * - TC-004: 異常系 - Public URL取得エラー
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createClient } from "../../../supabase/client";
import { useUploadImage } from "../useUploadImage";
import { createMockFile, createMockSupabaseClient } from "./helpers";

// Helper to create test wrapper
function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});

	return ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}

// Mock Supabase client
vi.mock("@/lib/supabase/client");

describe("useUploadImage", () => {
	let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabaseClient = createMockSupabaseClient();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);
	});

	// TC-001: 正常系 - 画像アップロード成功
	test("TC-001: Should upload image successfully", async () => {
		const mockUser = { id: "user-123" };
		const mockFile = createMockFile("test.jpg", 1024, "image/jpeg");
		const mockPath = "user-123/uuid.jpg";
		const mockPublicUrl = "https://example.com/image.jpg";

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		mockSupabaseClient.storage.from = vi.fn(() => ({
			upload: vi.fn().mockResolvedValue({
				data: { path: mockPath },
				error: null,
			}),
			getPublicUrl: vi.fn().mockReturnValue({
				data: { publicUrl: mockPublicUrl },
			}),
		})) as unknown as typeof mockSupabaseClient.storage.from;

		const { result } = renderHook(() => useUploadImage(), {
			wrapper: createWrapper(),
		});

		const mutation = result.current;
		const uploadResult = await mutation.mutateAsync(mockFile);

		await waitFor(() => {
			expect(uploadResult.publicUrl).toBe(mockPublicUrl);
			expect(uploadResult.error).toBeNull();
		});
	});

	// TC-002: 異常系 - 未認証ユーザー
	test("TC-002: Should throw error when user is not authenticated", async () => {
		const mockFile = createMockFile("test.jpg", 1024, "image/jpeg");

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: null },
			error: null,
		});

		const { result } = renderHook(() => useUploadImage(), {
			wrapper: createWrapper(),
		});

		const mutation = result.current;

		await expect(mutation.mutateAsync(mockFile)).rejects.toThrow(
			"Not authenticated",
		);
	});

	// TC-003: 異常系 - アップロードエラー
	test("TC-003: Should handle upload error", async () => {
		const mockUser = { id: "user-123" };
		const mockFile = createMockFile("test.jpg", 1024, "image/jpeg");

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		mockSupabaseClient.storage.from = vi.fn(() => ({
			upload: vi.fn().mockResolvedValue({
				data: null,
				error: { message: "Upload failed" },
			}),
		})) as unknown as typeof mockSupabaseClient.storage.from;

		const { result } = renderHook(() => useUploadImage(), {
			wrapper: createWrapper(),
		});

		const mutation = result.current;

		await expect(mutation.mutateAsync(mockFile)).rejects.toThrow(
			"Upload failed",
		);
	});

	// TC-004: 異常系 - Public URL取得エラー
	test("TC-004: Should handle public URL error", async () => {
		const mockUser = { id: "user-123" };
		const mockFile = createMockFile("test.jpg", 1024, "image/jpeg");
		const mockPath = "user-123/uuid.jpg";

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		mockSupabaseClient.storage.from = vi.fn(() => ({
			upload: vi.fn().mockResolvedValue({
				data: { path: mockPath },
				error: null,
			}),
			getPublicUrl: vi.fn().mockReturnValue({
				data: { publicUrl: null },
			}),
		})) as unknown as typeof mockSupabaseClient.storage.from;

		const { result } = renderHook(() => useUploadImage(), {
			wrapper: createWrapper(),
		});

		const mutation = result.current;

		await expect(mutation.mutateAsync(mockFile)).rejects.toThrow(
			"Failed to get public URL",
		);
	});
});
