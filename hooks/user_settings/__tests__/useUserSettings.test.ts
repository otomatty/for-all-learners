import { waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import {
	useInitializeUserSettings,
	useUpdateUserSettings,
	useUserSettings,
} from "../useUserSettings";
import { mockSupabaseClient, renderHookWithProvider } from "./helpers";

vi.mock("@/lib/supabase/client");

describe("useUserSettings", () => {
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

	describe("useUserSettings", () => {
		it("should fetch user settings successfully", async () => {
			const mockSettings = {
				user_id: "test-user-id",
				theme: "light",
				mode: "system",
			};

			const selectMock = vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					maybeSingle: vi.fn().mockResolvedValue({
						data: mockSettings,
						error: null,
					}),
				}),
			});

			mockSupabaseClient.from = vi.fn().mockReturnValue({
				select: selectMock,
			});

			const { result } = renderHookWithProvider(() => useUserSettings());

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			expect(result.current.data).toEqual(mockSettings);
			expect(mockSupabaseClient.from).toHaveBeenCalledWith("user_settings");
		});

		it("should initialize settings when no settings exist", async () => {
			const newSettings = {
				user_id: "test-user-id",
				theme: "light",
				mode: "system",
			};

			const insertMock = vi.fn().mockReturnValue({
				select: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue({
						data: newSettings,
						error: null,
					}),
				}),
			});

			const selectMock = vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					maybeSingle: vi.fn().mockResolvedValue({
						data: null,
						error: null,
					}),
				}),
			});

			mockSupabaseClient.from = vi.fn().mockImplementation((table) => {
				if (table === "user_settings") {
					return {
						select: selectMock,
						insert: insertMock,
					};
				}
				return {};
			});

			const { result } = renderHookWithProvider(() => useUserSettings());

			await waitFor(
				() => {
					expect(result.current.isSuccess).toBe(true);
				},
				{ timeout: 3000 },
			);

			expect(insertMock).toHaveBeenCalledWith({
				user_id: "test-user-id",
			});
			expect(result.current.data).toEqual(newSettings);
		});

		it("should return default settings for unauthenticated users", async () => {
			mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
				data: { user: null },
				error: null,
			});

			const { result } = renderHookWithProvider(() => useUserSettings());

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			expect(result.current.data).toEqual({
				theme: "light",
				mode: "system",
			});
		});
	});

	describe("useUpdateUserSettings", () => {
		it("should update user settings successfully", async () => {
			const updatedSettings = {
				user_id: "test-user-id",
				theme: "dark",
				mode: "system",
			};

			const upsertMock = vi.fn().mockReturnValue({
				select: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue({
						data: updatedSettings,
						error: null,
					}),
				}),
			});

			mockSupabaseClient.from = vi.fn().mockReturnValue({
				upsert: upsertMock,
			});

			const { result } = renderHookWithProvider(() => useUpdateUserSettings());

			await waitFor(() => {
				expect(result.current.isIdle).toBe(true);
			});

			result.current.mutate({ theme: "dark" });

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			expect(result.current.data).toEqual(updatedSettings);
			expect(upsertMock).toHaveBeenCalledWith(
				{ user_id: "test-user-id", theme: "dark" },
				{ onConflict: "user_id" },
			);
		});

		it("should throw error when user is not authenticated", async () => {
			mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
				data: { user: null },
				error: null,
			});

			const { result } = renderHookWithProvider(() => useUpdateUserSettings());

			await waitFor(() => {
				expect(result.current.isIdle).toBe(true);
			});

			result.current.mutate({ theme: "dark" });

			await waitFor(() => {
				expect(result.current.isError).toBe(true);
			});

			expect(result.current.error).toBeInstanceOf(Error);
			expect((result.current.error as Error).message).toBe("Not authenticated");
		});
	});

	describe("useInitializeUserSettings", () => {
		it("should initialize user settings successfully", async () => {
			const newSettings = {
				user_id: "test-user-id",
				theme: "light",
				mode: "system",
			};

			mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
				data: { user: { id: "test-user-id" } },
				error: null,
			});

			const singleMock = vi.fn().mockResolvedValue({
				data: newSettings,
				error: null,
			});

			const selectMock = vi.fn().mockReturnValue({
				single: singleMock,
			});

			const insertMock = vi.fn().mockReturnValue({
				select: selectMock,
			});

			mockSupabaseClient.from = vi.fn().mockReturnValue({
				insert: insertMock,
			});

			const { result } = renderHookWithProvider(() =>
				useInitializeUserSettings(),
			);

			await waitFor(() => {
				expect(result.current.isIdle).toBe(true);
			});

			result.current.mutate();

			await waitFor(() => {
				if (result.current.isError) {
					throw result.current.error;
				}
				expect(result.current.isSuccess).toBe(true);
			});

			expect(result.current.data).toEqual(newSettings);
			expect(insertMock).toHaveBeenCalledWith({
				user_id: "test-user-id",
			});
		});
	});
});
