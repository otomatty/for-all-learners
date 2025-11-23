import { waitFor } from "@testing-library/react";
import type { JSONContent } from "@tiptap/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	deleteLinkOccurrencesByPage,
	upsertLinkGroup,
	upsertLinkOccurrence,
} from "@/lib/services/linkGroupService";
import { createClient } from "@/lib/supabase/client";
import { extractLinksFromContent } from "@/lib/utils/extractLinksFromContent";
import {
	useConnectLinkGroupToPage,
	useDeleteLinkGroupsForPage,
	useSyncLinkGroupsForPage,
} from "../useSyncLinkGroups";
import { mockSupabaseClient, renderHookWithProvider } from "./helpers";

vi.mock("@/lib/supabase/client");
vi.mock("@/lib/services/linkGroupService");
vi.mock("@/lib/utils/extractLinksFromContent");

describe("useSyncLinkGroups", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);
	});

	describe("useSyncLinkGroupsForPage", () => {
		it("should sync link groups successfully", async () => {
			const pageId = "page-123";
			const contentTiptap: JSONContent = {
				type: "doc",
				content: [],
			};

			const mockLinks = [
				{
					key: "test-link",
					text: "Test Link",
					markId: "mark-1",
					position: 0,
					variant: "bracket" as const,
					pageId: null,
				},
			];

			const mockLinkGroup = {
				id: "link-group-123",
				key: "test-link",
				raw_text: "Test Link",
				page_id: null,
				link_count: 1,
			};

			const mockLinkOccurrence = {
				id: "occurrence-123",
				link_group_id: "link-group-123",
				source_page_id: pageId,
				mark_id: "mark-1",
				position: 0,
			};

			vi.mocked(extractLinksFromContent).mockReturnValue(mockLinks);
			vi.mocked(deleteLinkOccurrencesByPage).mockResolvedValue(undefined);
			vi.mocked(upsertLinkGroup).mockResolvedValue(mockLinkGroup);
			vi.mocked(upsertLinkOccurrence).mockResolvedValue(mockLinkOccurrence);

			const { result } = renderHookWithProvider(() =>
				useSyncLinkGroupsForPage(),
			);

			await waitFor(() => {
				expect(result.current.isIdle).toBe(true);
			});

			result.current.mutate({ pageId, contentTiptap });

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			expect(extractLinksFromContent).toHaveBeenCalledWith(contentTiptap);
			expect(deleteLinkOccurrencesByPage).toHaveBeenCalledWith(
				mockSupabaseClient,
				pageId,
			);
			expect(upsertLinkGroup).toHaveBeenCalledWith(mockSupabaseClient, {
				key: "test-link",
				rawText: "Test Link",
				pageId: null,
			});
			expect(upsertLinkOccurrence).toHaveBeenCalledWith(mockSupabaseClient, {
				linkGroupId: "link-group-123",
				sourcePageId: pageId,
				markId: "mark-1",
				position: 0,
			});
			expect(result.current.data).toEqual({ success: true });
		});

		it("should handle errors gracefully", async () => {
			const pageId = "page-123";
			const contentTiptap: JSONContent = {
				type: "doc",
				content: [],
			};

			vi.mocked(extractLinksFromContent).mockReturnValue([]);
			vi.mocked(deleteLinkOccurrencesByPage).mockRejectedValue(
				new Error("Database error"),
			);

			const { result } = renderHookWithProvider(() =>
				useSyncLinkGroupsForPage(),
			);

			await waitFor(() => {
				expect(result.current.isIdle).toBe(true);
			});

			result.current.mutate({ pageId, contentTiptap });

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			expect(result.current.data).toEqual({
				success: false,
				error: "Failed to sync link groups",
			});
		});
	});

	describe("useDeleteLinkGroupsForPage", () => {
		it("should delete link groups successfully", async () => {
			const pageId = "page-123";

			vi.mocked(deleteLinkOccurrencesByPage).mockResolvedValue(undefined);

			const { result } = renderHookWithProvider(() =>
				useDeleteLinkGroupsForPage(),
			);

			await waitFor(() => {
				expect(result.current.isIdle).toBe(true);
			});

			result.current.mutate(pageId);

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			expect(deleteLinkOccurrencesByPage).toHaveBeenCalledWith(
				mockSupabaseClient,
				pageId,
			);
			expect(result.current.data).toEqual({ success: true });
		});

		it("should handle errors gracefully", async () => {
			const pageId = "page-123";

			vi.mocked(deleteLinkOccurrencesByPage).mockRejectedValue(
				new Error("Database error"),
			);

			const { result } = renderHookWithProvider(() =>
				useDeleteLinkGroupsForPage(),
			);

			await waitFor(() => {
				expect(result.current.isIdle).toBe(true);
			});

			result.current.mutate(pageId);

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			expect(result.current.data).toEqual({
				success: false,
				error: "Failed to delete link groups",
			});
		});
	});

	describe("useConnectLinkGroupToPage", () => {
		it("should connect link group to page successfully", async () => {
			const pageKey = "test-link";
			const pageId = "page-123";

			const updateMock = vi.fn().mockResolvedValue({
				data: null,
				error: null,
			});

			mockSupabaseClient.from = vi.fn().mockReturnValue({
				update: vi.fn().mockReturnValue({
					eq: vi.fn().mockResolvedValue(updateMock()),
				}),
			});

			const { result } = renderHookWithProvider(() =>
				useConnectLinkGroupToPage(),
			);

			await waitFor(() => {
				expect(result.current.isIdle).toBe(true);
			});

			result.current.mutate({ pageKey, pageId });

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			expect(mockSupabaseClient.from).toHaveBeenCalledWith("link_groups");
			expect(result.current.data).toEqual({ success: true });
		});

		it("should handle errors gracefully", async () => {
			const pageKey = "test-link";
			const pageId = "page-123";

			const updateMock = vi.fn().mockResolvedValue({
				data: null,
				error: { message: "Database error" },
			});

			mockSupabaseClient.from = vi.fn().mockReturnValue({
				update: vi.fn().mockReturnValue({
					eq: vi.fn().mockResolvedValue(updateMock()),
				}),
			});

			const { result } = renderHookWithProvider(() =>
				useConnectLinkGroupToPage(),
			);

			await waitFor(() => {
				expect(result.current.isIdle).toBe(true);
			});

			result.current.mutate({ pageKey, pageId });

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			expect(result.current.data).toEqual({
				success: false,
				error: "Failed to connect link group",
			});
		});
	});
});
