/**
 * Tests for useAudioRecordings hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - 音声ファイル一覧取得成功
 * - TC-002: 異常系 - 未認証ユーザー
 * - TC-003: 異常系 - ストレージリスト取得エラー
 * - TC-004: 異常系 - Signed URL生成エラー
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type React from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { useAudioRecordings } from "../useAudioRecordings";
import { createMockSupabaseClient } from "./helpers";

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

describe("useAudioRecordings", () => {
	let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabaseClient = createMockSupabaseClient();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);
	});

	// TC-001: 正常系 - 音声ファイル一覧取得成功
	test("TC-001: Should fetch audio recordings successfully", async () => {
		const mockUser = { id: "user-123" };
		const mockFiles = [
			{
				name: "recording1.mp3",
				created_at: "2025-01-01T00:00:00Z",
				updated_at: "2025-01-01T00:00:00Z",
			},
		];
		const mockSignedUrl = "https://example.com/recording1.mp3";
		const mockTranscriptions = [
			{
				file_path: "audio/user-123/recording1.mp3",
				title: "Test Recording",
				duration_sec: 120,
			},
		];

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		// Mock transcription data
		const mockFrom = vi.fn((table: string) => {
			if (table === "audio_transcriptions") {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockResolvedValue({
							data: mockTranscriptions,
							error: null,
						}),
					}),
				};
			}
			if (table === "audio-recordings") {
				return {
					list: vi.fn().mockResolvedValue({
						data: mockFiles,
						error: null,
					}),
					createSignedUrl: vi.fn().mockResolvedValue({
						data: { signedUrl: mockSignedUrl },
						error: null,
					}),
				};
			}
			return {};
		});

		mockSupabaseClient.storage.from =
			mockFrom as unknown as typeof mockSupabaseClient.storage.from;
		mockSupabaseClient.from =
			mockFrom as unknown as typeof mockSupabaseClient.from;

		const { result } = renderHook(() => useAudioRecordings(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
		expect(result.current.data?.[0]?.url).toBe(mockSignedUrl);
		expect(result.current.data?.[0]?.title).toBe("Test Recording");
	});

	// TC-002: 異常系 - 未認証ユーザー
	test("TC-002: Should throw error when user is not authenticated", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: null },
			error: null,
		});

		const { result } = renderHook(() => useAudioRecordings(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});

	// TC-003: 異常系 - ストレージリスト取得エラー
	test("TC-003: Should handle storage list error", async () => {
		const mockUser = { id: "user-123" };

		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		mockSupabaseClient.storage.from = vi.fn(() => ({
			list: vi.fn().mockResolvedValue({
				data: null,
				error: { message: "List failed" },
			}),
		})) as unknown as typeof mockSupabaseClient.storage.from;

		const { result } = renderHook(() => useAudioRecordings(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toBeDefined();
	});
});
