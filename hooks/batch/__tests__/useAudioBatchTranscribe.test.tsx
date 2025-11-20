/**
 * Tests for useAudioBatchTranscribe hook
 *
 * Related Files:
 * - Implementation: hooks/batch/useAudioBatchTranscribe.ts
 * - API Route: app/api/batch/audio/transcribe/route.ts
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Mock } from "vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAudioBatchTranscribe } from "../useAudioBatchTranscribe";

// Mock fetch
global.fetch = vi.fn();

const createWrapper = () => {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});

	return ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
};

describe("useAudioBatchTranscribe", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it("should successfully transcribe audio files", async () => {
		const mockResponse = {
			success: true,
			message: "音声バッチ処理完了: 2/2ファイル成功",
			transcriptions: [
				{
					audioId: "audio-1",
					audioName: "lecture1.mp3",
					success: true,
					transcript: "Transcription 1",
					processingTimeMs: 500,
				},
				{
					audioId: "audio-2",
					audioName: "lecture2.mp3",
					success: true,
					transcript: "Transcription 2",
					processingTimeMs: 600,
				},
			],
			totalCards: 0,
			totalProcessingTimeMs: 2000,
			apiRequestsUsed: 1,
		};

		(global.fetch as Mock).mockResolvedValueOnce({
			ok: true,
			json: async () => mockResponse,
		});

		const { result } = renderHook(() => useAudioBatchTranscribe(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({
			audioFiles: [
				{
					audioId: "audio-1",
					audioName: "lecture1.mp3",
					audioBlob: "data:audio/mp3;base64,test1",
				},
				{
					audioId: "audio-2",
					audioName: "lecture2.mp3",
					audioBlob: "data:audio/mp3;base64,test2",
				},
			],
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(result.current.data).toEqual(mockResponse);
		expect(global.fetch).toHaveBeenCalledWith(
			"/api/batch/audio/transcribe",
			expect.objectContaining({
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
			}),
		);
	});

	it("should handle API errors", async () => {
		const errorMessage = "Audio batch transcription failed";
		(global.fetch as Mock).mockResolvedValueOnce({
			ok: false,
			json: async () => ({
				error: "Internal server error",
				message: errorMessage,
			}),
		});

		const { result } = renderHook(() => useAudioBatchTranscribe(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({
			audioFiles: [
				{
					audioId: "audio-1",
					audioName: "test.mp3",
					audioBlob: "data:audio/mp3;base64,test",
				},
			],
		});

		await waitFor(() => expect(result.current.isError).toBe(true));

		expect(result.current.error).toBeInstanceOf(Error);
		expect((result.current.error as Error).message).toBe(errorMessage);
	});

	it("should call onSuccess callback", async () => {
		const mockResponse = {
			success: true,
			message: "Success",
			transcriptions: [
				{
					audioId: "audio-1",
					audioName: "test.mp3",
					success: true,
					transcript: "Test transcription",
					processingTimeMs: 500,
				},
			],
			totalCards: 0,
			totalProcessingTimeMs: 1000,
			apiRequestsUsed: 1,
		};

		(global.fetch as Mock).mockResolvedValueOnce({
			ok: true,
			json: async () => mockResponse,
		});

		const onSuccess = vi.fn();
		const { result } = renderHook(
			() => useAudioBatchTranscribe({ onSuccess }),
			{
				wrapper: createWrapper(),
			},
		);

		result.current.mutate({
			audioFiles: [
				{
					audioId: "audio-1",
					audioName: "test.mp3",
					audioBlob: "data:audio/mp3;base64,test",
				},
			],
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		await waitFor(() => expect(onSuccess).toHaveBeenCalled());
		expect(onSuccess.mock.calls[0][0]).toEqual(mockResponse);
	});
});
