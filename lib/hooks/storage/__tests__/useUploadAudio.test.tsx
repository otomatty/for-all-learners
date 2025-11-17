import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "../../../supabase/client";
import { useUploadAudio } from "../useUploadAudio";
import { createMockFile, createMockSupabaseClient } from "./helpers";

// Mock Supabase client
vi.mock("@/lib/supabase/client");

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

describe("useUploadAudio", () => {
	let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabaseClient = createMockSupabaseClient();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);
	});

	it("should upload audio file successfully", async () => {
		const mockFile = createMockFile("test-audio.wav", 1024 * 1024, "audio/wav");
		const mockSignedUrl = "https://example.com/signed-url";
		const mockFilePath = "audio/user-id/1234567890-test-audio.wav";

		// Mock auth.getUser
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: {
				user: {
					id: "user-id",
					email: "test@example.com",
				},
			},
			error: null,
		});

		// Mock storage upload
		mockSupabaseClient.storage.from = vi.fn(() => ({
			upload: vi.fn().mockResolvedValue({
				data: { path: mockFilePath },
				error: null,
			}),
			createSignedUrl: vi.fn().mockResolvedValue({
				data: { signedUrl: mockSignedUrl },
				error: null,
			}),
		})) as unknown as typeof mockSupabaseClient.storage.from;

		const { result } = renderHook(() => useUploadAudio(), {
			wrapper: createWrapper(),
		});

		const mutation = result.current;
		const uploadResult = await mutation.mutateAsync({
			file: mockFile,
		});

		await waitFor(() => {
			expect(uploadResult.success).toBe(true);
			expect(uploadResult.signedUrl).toBe(mockSignedUrl);
		});
	});

	it("should throw error when user is not authenticated", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: null },
			error: null,
		});

		const mockFile = createMockFile("test-audio.wav", 1024, "audio/wav");

		const { result } = renderHook(() => useUploadAudio(), {
			wrapper: createWrapper(),
		});

		const mutation = result.current;

		await expect(mutation.mutateAsync({ file: mockFile })).rejects.toThrow(
			"Not authenticated",
		);
	});

	it("should throw error when file size exceeds limit", async () => {
		// Blobを作成してsizeプロパティを設定
		const largeBlob = new Blob(["x".repeat(101 * 1024 * 1024)], {
			type: "audio/wav",
		});
		// Fileオブジェクトを作成（Blobから）
		const largeFile = new File([largeBlob], "large-audio.wav", {
			type: "audio/wav",
		});

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: {
				user: {
					id: "user-id",
					email: "test@example.com",
				},
			},
			error: null,
		});

		const { result } = renderHook(() => useUploadAudio(), {
			wrapper: createWrapper(),
		});

		const mutation = result.current;

		// ファイルサイズチェックでエラーが発生するため、storage.fromは呼ばれない
		await expect(mutation.mutateAsync({ file: largeFile })).rejects.toThrow(
			"100MB",
		);
	});

	it("should use custom fileName when provided", async () => {
		const mockFile = createMockFile("test-audio.wav", 1024, "audio/wav");
		const customFileName = "custom-name.wav";
		const mockSignedUrl = "https://example.com/signed-url";
		const mockUpload = vi.fn().mockResolvedValue({
			data: { path: "audio/user-id/123-custom-name.wav" },
			error: null,
		});

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: {
				user: {
					id: "user-id",
					email: "test@example.com",
				},
			},
			error: null,
		});

		mockSupabaseClient.storage.from = vi.fn(() => ({
			upload: mockUpload,
			createSignedUrl: vi.fn().mockResolvedValue({
				data: { signedUrl: mockSignedUrl },
				error: null,
			}),
		})) as unknown as typeof mockSupabaseClient.storage.from;

		const { result } = renderHook(() => useUploadAudio(), {
			wrapper: createWrapper(),
		});

		const mutation = result.current;
		await mutation.mutateAsync({
			file: mockFile,
			fileName: customFileName,
		});

		expect(mockUpload).toHaveBeenCalledWith(
			expect.stringContaining(customFileName),
			mockFile,
			expect.any(Object),
		);
	});

	it("should use custom expiresIn when provided", async () => {
		const mockFile = createMockFile("test-audio.wav", 1024, "audio/wav");
		const customExpiresIn = 600; // 10分
		const mockSignedUrl = "https://example.com/signed-url";
		const mockCreateSignedUrl = vi.fn().mockResolvedValue({
			data: { signedUrl: mockSignedUrl },
			error: null,
		});

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: {
				user: {
					id: "user-id",
					email: "test@example.com",
				},
			},
			error: null,
		});

		mockSupabaseClient.storage.from = vi.fn(() => ({
			upload: vi.fn().mockResolvedValue({
				data: { path: "audio/user-id/123-test-audio.wav" },
				error: null,
			}),
			createSignedUrl: mockCreateSignedUrl,
		})) as unknown as typeof mockSupabaseClient.storage.from;

		const { result } = renderHook(() => useUploadAudio(), {
			wrapper: createWrapper(),
		});

		const mutation = result.current;
		await mutation.mutateAsync({
			file: mockFile,
			expiresIn: customExpiresIn,
		});

		expect(mockCreateSignedUrl).toHaveBeenCalledWith(
			expect.any(String),
			customExpiresIn,
		);
	});

	it("should handle Blob input", async () => {
		const mockBlob = new Blob(["audio data"], { type: "audio/wav" });
		const mockSignedUrl = "https://example.com/signed-url";

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: {
				user: {
					id: "user-id",
					email: "test@example.com",
				},
			},
			error: null,
		});

		mockSupabaseClient.storage.from = vi.fn(() => ({
			upload: vi.fn().mockResolvedValue({
				data: { path: "audio/user-id/123-.wav" },
				error: null,
			}),
			createSignedUrl: vi.fn().mockResolvedValue({
				data: { signedUrl: mockSignedUrl },
				error: null,
			}),
		})) as unknown as typeof mockSupabaseClient.storage.from;

		const { result } = renderHook(() => useUploadAudio(), {
			wrapper: createWrapper(),
		});

		const mutation = result.current;
		const uploadResult = await mutation.mutateAsync({
			file: mockBlob,
		});

		expect(uploadResult).toEqual({
			success: true,
			filePath: expect.stringContaining("audio/user-id/"),
			signedUrl: mockSignedUrl,
		});
	});

	it("should handle upload error", async () => {
		const mockFile = createMockFile("test-audio.wav", 1024, "audio/wav");
		const uploadError = new Error("Upload failed");

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: {
				user: {
					id: "user-id",
					email: "test@example.com",
				},
			},
			error: null,
		});

		mockSupabaseClient.storage.from = vi.fn(() => ({
			upload: vi.fn().mockResolvedValue({
				data: null,
				error: uploadError,
			}),
		})) as unknown as typeof mockSupabaseClient.storage.from;

		const { result } = renderHook(() => useUploadAudio(), {
			wrapper: createWrapper(),
		});

		const mutation = result.current;

		await expect(mutation.mutateAsync({ file: mockFile })).rejects.toThrow(
			"アップロードに失敗しました",
		);
	});

	it("should handle signed URL creation error", async () => {
		const mockFile = createMockFile("test-audio.wav", 1024, "audio/wav");
		const signedUrlError = new Error("Failed to create signed URL");

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: {
				user: {
					id: "user-id",
					email: "test@example.com",
				},
			},
			error: null,
		});

		mockSupabaseClient.storage.from = vi.fn(() => ({
			upload: vi.fn().mockResolvedValue({
				data: { path: "audio/user-id/123-test-audio.wav" },
				error: null,
			}),
			createSignedUrl: vi.fn().mockResolvedValue({
				data: null,
				error: signedUrlError,
			}),
		})) as unknown as typeof mockSupabaseClient.storage.from;

		const { result } = renderHook(() => useUploadAudio(), {
			wrapper: createWrapper(),
		});

		const mutation = result.current;

		await expect(mutation.mutateAsync({ file: mockFile })).rejects.toThrow(
			"ファイルURLの生成に失敗しました",
		);
	});
});
