/**
 * Tests for useUploadPdf hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - PDFアップロード成功
 * - TC-003: 異常系 - ファイルタイプエラー（PDF以外）
 * - TC-004: 異常系 - アップロードエラー
 * - TC-005: 異常系 - Signed URL生成エラー
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type React from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { useUploadPdf } from "../useUploadPdf";
import { createMockFile, createMockSupabaseClient } from "./helpers";

// Helper to create test wrapper
function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});

	return ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}

// Mock Supabase client
vi.mock("@/lib/supabase/client");

describe("useUploadPdf", () => {
	let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabaseClient = createMockSupabaseClient();
		// createClient()が呼ばれるたびに最新のmockSupabaseClientを返すように設定
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);
	});

	// TC-001: 正常系 - PDFアップロード成功
	test("TC-001: Should upload PDF successfully", async () => {
		const mockUser = { id: "user-123" };
		const mockFile = createMockFile("test.pdf", 1024 * 1024, "application/pdf");
		const mockPath = "pdf-uploads/user-123/1234567890-test.pdf";
		const mockSignedUrl = "https://example.com/signed-url.pdf";

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		mockSupabaseClient.storage.from = vi.fn(() => ({
			upload: vi.fn().mockResolvedValue({
				data: { path: mockPath },
				error: null,
			}),
			createSignedUrl: vi.fn().mockResolvedValue({
				data: { signedUrl: mockSignedUrl },
				error: null,
			}),
		})) as unknown as typeof mockSupabaseClient.storage.from;

		const { result } = renderHook(() => useUploadPdf(), {
			wrapper: createWrapper(),
		});

		const mutation = result.current;
		const uploadResult = await mutation.mutateAsync({
			file: mockFile,
			userId: mockUser.id,
		});

		await waitFor(() => {
			expect(uploadResult.pdfUrl).toBe(mockSignedUrl);
			expect(uploadResult.message).toBe("PDFアップロードが完了しました");
		});
	});

	// TC-003: 異常系 - ファイルタイプエラー
	test("TC-003: Should reject non-PDF file", async () => {
		const mockUser = { id: "user-123" };
		const mockFile = createMockFile("test.jpg", 1024, "image/jpeg");

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const { result } = renderHook(() => useUploadPdf(), {
			wrapper: createWrapper(),
		});

		const mutation = result.current;

		await expect(
			mutation.mutateAsync({ file: mockFile, userId: mockUser.id }),
		).rejects.toThrow("PDFファイルのみアップロード可能です");
	});

	// TC-004: 異常系 - アップロードエラー
	test("TC-004: Should handle upload error", async () => {
		const mockUser = { id: "user-123" };
		const mockFile = createMockFile("test.pdf", 1024, "application/pdf");

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

		const { result } = renderHook(() => useUploadPdf(), {
			wrapper: createWrapper(),
		});

		const mutation = result.current;

		await expect(
			mutation.mutateAsync({ file: mockFile, userId: mockUser.id }),
		).rejects.toThrow("アップロードに失敗しました: Upload failed");
	});

	// TC-005: 異常系 - Signed URL生成エラー
	test("TC-005: Should handle signed URL error", async () => {
		const mockUser = { id: "user-123" };
		const mockFile = createMockFile("test.pdf", 1024, "application/pdf");
		const mockPath = "pdf-uploads/user-123/1234567890-test.pdf";

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		mockSupabaseClient.storage.from = vi.fn(() => ({
			upload: vi.fn().mockResolvedValue({
				data: { path: mockPath },
				error: null,
			}),
			createSignedUrl: vi.fn().mockResolvedValue({
				data: { signedUrl: null },
				error: { message: "Failed to create signed URL" },
			}),
		})) as unknown as typeof mockSupabaseClient.storage.from;

		const { result } = renderHook(() => useUploadPdf(), {
			wrapper: createWrapper(),
		});

		const mutation = result.current;

		await expect(
			mutation.mutateAsync({ file: mockFile, userId: mockUser.id }),
		).rejects.toThrow("ファイルURLの生成に失敗しました");
	});
});
