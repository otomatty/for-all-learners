import { waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import {
	useChangelogData,
	useCreateChangelogEntry,
	useDeleteChangelogEntry,
	useUpdateChangelogEntry,
} from "../useChangelog";
import { mockSupabaseClient, renderHookWithProvider } from "./helpers";

vi.mock("@/lib/supabase/client");

describe("useChangelog", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);
	});

	describe("useChangelogData", () => {
		it("should fetch changelog data successfully", async () => {
			const mockEntries = [
				{
					id: "entry-1",
					version: "1.0.0",
					title: "Test Release",
					published_at: "2025-01-01T00:00:00Z",
				},
			];

			const mockItems = [
				{
					entry_id: "entry-1",
					type: "new" as const,
					description: "New feature",
				},
			];

			const selectEntriesMock = vi.fn().mockReturnValue({
				order: vi.fn().mockResolvedValue({
					data: mockEntries,
					error: null,
				}),
			});

			const selectItemsMock = vi.fn().mockReturnValue({
				in: vi.fn().mockReturnValue({
					order: vi.fn().mockResolvedValue({
						data: mockItems,
						error: null,
					}),
				}),
			});

			mockSupabaseClient.from = vi.fn().mockImplementation((table) => {
				if (table === "changelog_entries") {
					return {
						select: selectEntriesMock,
					};
				}
				if (table === "changelog_items") {
					return {
						select: selectItemsMock,
					};
				}
				return {};
			});

			const { result } = renderHookWithProvider(() => useChangelogData());

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			expect(result.current.data).toHaveLength(1);
			expect(result.current.data?.[0].version).toBe("1.0.0");
			expect(result.current.data?.[0].changes).toHaveLength(1);
		});

		it("should handle empty changelog", async () => {
			const selectEntriesMock = vi.fn().mockReturnValue({
				order: vi.fn().mockResolvedValue({
					data: [],
					error: null,
				}),
			});

			const selectItemsMock = vi.fn().mockReturnValue({
				in: vi.fn().mockReturnValue({
					order: vi.fn().mockResolvedValue({
						data: [],
						error: null,
					}),
				}),
			});

			mockSupabaseClient.from = vi.fn().mockImplementation((table) => {
				if (table === "changelog_entries") {
					return {
						select: selectEntriesMock,
					};
				}
				if (table === "changelog_items") {
					return {
						select: selectItemsMock,
					};
				}
				return {};
			});

			const { result } = renderHookWithProvider(() => useChangelogData());

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			expect(result.current.data).toEqual([]);
		});

		it("should handle errors gracefully", async () => {
			const selectEntriesMock = vi.fn().mockReturnValue({
				order: vi.fn().mockResolvedValue({
					data: null,
					error: { message: "Database error" },
				}),
			});

			mockSupabaseClient.from = vi.fn().mockReturnValue({
				select: selectEntriesMock,
			});

			const { result } = renderHookWithProvider(() => useChangelogData());

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			expect(result.current.data).toEqual([]);
		});
	});

	describe("useCreateChangelogEntry", () => {
		it("should create changelog entry successfully", async () => {
			const input = {
				version: "1.0.0",
				title: "Test Release",
				published_at: "2025-01-01",
				changes: [
					{
						type: "new" as const,
						description: "New feature",
					},
				],
			};

			const mockEntry = {
				id: "entry-1",
				version: "1.0.0",
				title: "Test Release",
				published_at: "2025-01-01T00:00:00Z",
			};

			const maybeSingleMock = vi.fn().mockResolvedValue({
				data: null,
				error: null,
			});

			const insertEntryMock = vi.fn().mockReturnValue({
				select: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue({
						data: mockEntry,
						error: null,
					}),
				}),
			});

			const insertItemsMock = vi.fn().mockResolvedValue({
				data: null,
				error: null,
			});

			mockSupabaseClient.from = vi.fn().mockImplementation((table) => {
				if (table === "changelog_entries") {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								maybeSingle: maybeSingleMock,
							}),
						}),
						insert: insertEntryMock,
						update: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								select: vi.fn().mockReturnValue({
									single: vi.fn().mockResolvedValue({
										data: mockEntry,
										error: null,
									}),
								}),
							}),
						}),
					};
				}
				if (table === "changelog_items") {
					return {
						delete: vi.fn().mockReturnValue({
							eq: vi.fn().mockResolvedValue({
								data: null,
								error: null,
							}),
						}),
						insert: insertItemsMock,
					};
				}
				return {};
			});

			const { result } = renderHookWithProvider(() =>
				useCreateChangelogEntry(),
			);

			await waitFor(() => {
				expect(result.current.isIdle).toBe(true);
			});

			result.current.mutate(input);

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			expect(result.current.data?.success).toBe(true);
			expect(result.current.data?.data?.version).toBe("1.0.0");
		});
	});

	describe("useUpdateChangelogEntry", () => {
		it("should update changelog entry successfully", async () => {
			const input = {
				entryId: "entry-1",
				version: "1.0.1",
				changes: [
					{
						type: "fix" as const,
						description: "Bug fix",
					},
				],
			};

			const mockUpdatedEntry = {
				id: "entry-1",
				version: "1.0.1",
				title: "Test Release",
				published_at: "2025-01-01T00:00:00Z",
			};

			const updateMock = vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					select: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: mockUpdatedEntry,
							error: null,
						}),
					}),
				}),
			});

			const deleteItemsMock = vi.fn().mockReturnValue({
				eq: vi.fn().mockResolvedValue({
					data: null,
					error: null,
				}),
			});

			const insertItemsMock = vi.fn().mockResolvedValue({
				data: null,
				error: null,
			});

			mockSupabaseClient.from = vi.fn().mockImplementation((table) => {
				if (table === "changelog_entries") {
					return {
						update: updateMock,
					};
				}
				if (table === "changelog_items") {
					return {
						delete: deleteItemsMock,
						insert: insertItemsMock,
					};
				}
				return {};
			});

			const { result } = renderHookWithProvider(() =>
				useUpdateChangelogEntry(),
			);

			await waitFor(() => {
				expect(result.current.isIdle).toBe(true);
			});

			result.current.mutate(input);

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			expect(result.current.data?.success).toBe(true);
			expect(result.current.data?.data?.version).toBe("1.0.1");
		});
	});

	describe("useDeleteChangelogEntry", () => {
		it("should delete changelog entry successfully", async () => {
			const entryId = "entry-1";

			const deleteMock = vi.fn().mockReturnValue({
				eq: vi.fn().mockResolvedValue({
					data: null,
					error: null,
				}),
			});

			mockSupabaseClient.from = vi.fn().mockReturnValue({
				delete: deleteMock,
			});

			const { result } = renderHookWithProvider(() =>
				useDeleteChangelogEntry(),
			);

			await waitFor(() => {
				expect(result.current.isIdle).toBe(true);
			});

			result.current.mutate(entryId);

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			expect(result.current.data?.success).toBe(true);
		});

		it("should handle errors gracefully", async () => {
			const entryId = "entry-1";

			const deleteMock = vi.fn().mockReturnValue({
				eq: vi.fn().mockResolvedValue({
					data: null,
					error: { message: "Database error" },
				}),
			});

			mockSupabaseClient.from = vi.fn().mockReturnValue({
				delete: deleteMock,
			});

			const { result } = renderHookWithProvider(() =>
				useDeleteChangelogEntry(),
			);

			await waitFor(() => {
				expect(result.current.isIdle).toBe(true);
			});

			result.current.mutate(entryId);

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			expect(result.current.data?.success).toBe(false);
			expect(result.current.data?.error).toBe("Database error");
		});
	});
});
