import { waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { useCreateActionLog, useRecordLearningTime } from "../useActionLogs";
import { mockSupabaseClient, renderHookWithProvider } from "./helpers";

vi.mock("@/lib/supabase/client");

describe("useActionLogs", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: { id: "test-user-id" } },
			error: null,
		});
	});

	describe("useCreateActionLog", () => {
		it("should create an action log successfully", async () => {
			const insertMock = vi.fn().mockResolvedValue({
				data: null,
				error: null,
			});
			mockSupabaseClient.from = vi.fn().mockReturnValue({
				insert: insertMock,
			});

			const { result } = renderHookWithProvider(() => useCreateActionLog());

			await waitFor(() => {
				expect(result.current.isIdle).toBe(true);
			});

			result.current.mutate({
				actionType: "audio",
				duration: 60,
			});

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			expect(mockSupabaseClient.from).toHaveBeenCalledWith("action_logs");
			expect(insertMock).toHaveBeenCalledWith({
				user_id: "test-user-id",
				action_type: "audio",
				duration: 60,
			});
		});

		it("should throw error when user is not authenticated", async () => {
			mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
				data: { user: null },
				error: null,
			});

			const { result } = renderHookWithProvider(() => useCreateActionLog());

			await waitFor(() => {
				expect(result.current.isIdle).toBe(true);
			});

			result.current.mutate({
				actionType: "audio",
				duration: 60,
			});

			await waitFor(() => {
				expect(result.current.isError).toBe(true);
			});

			expect(result.current.error).toBeInstanceOf(Error);
			expect((result.current.error as Error).message).toBe("Not authenticated");
		});

		it("should handle database errors", async () => {
			const insertMock = vi.fn().mockResolvedValue({
				data: null,
				error: { message: "Database error" },
			});
			mockSupabaseClient.from = vi.fn().mockReturnValue({
				insert: insertMock,
			});

			const { result } = renderHookWithProvider(() => useCreateActionLog());

			await waitFor(() => {
				expect(result.current.isIdle).toBe(true);
			});

			result.current.mutate({
				actionType: "ocr",
				duration: 120,
			});

			await waitFor(() => {
				expect(result.current.isError).toBe(true);
			});

			expect(result.current.error).toEqual({ message: "Database error" });
		});
	});

	describe("useRecordLearningTime", () => {
		it("should record learning time successfully", async () => {
			mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
				data: { user: { id: "test-user-id" } },
				error: null,
			});

			const insertMock = vi.fn().mockResolvedValue({
				data: null,
				error: null,
			});
			mockSupabaseClient.from = vi.fn().mockReturnValue({
				insert: insertMock,
			});

			const { result } = renderHookWithProvider(() => useRecordLearningTime());

			await waitFor(() => {
				expect(result.current.isIdle).toBe(true);
			});

			result.current.mutate(180);

			await waitFor(() => {
				if (result.current.isError) {
					throw result.current.error;
				}
				expect(result.current.isSuccess).toBe(true);
			});

			expect(mockSupabaseClient.from).toHaveBeenCalledWith("action_logs");
			expect(insertMock).toHaveBeenCalledWith({
				user_id: "test-user-id",
				action_type: "learn",
				duration: 180,
			});
		});
	});
});
