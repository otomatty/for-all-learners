/**
 * Unit tests for getLinkGroupsForPage server action
 * Note: These are simplified unit tests. Integration tests require actual Supabase connection.
 */

import { describe, expect, test, vi, beforeEach } from "vitest";
import { getLinkGroupsForPage } from "../linkGroups";

// Mock Supabase server client
vi.mock("@/lib/supabase/server", () => ({
	createClient: vi.fn(),
}));

const mockSupabaseClient = {
	from: vi.fn(),
};

describe("getLinkGroupsForPage (Unit Tests)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		const { createClient } = require("@/lib/supabase/server");
		createClient.mockResolvedValue(mockSupabaseClient);
	});

	test("should return error when database query fails", async () => {
		// Mock database error
		mockSupabaseClient.from.mockReturnValue({
			select: vi.fn().mockReturnValue({
				eq: vi.fn().mockResolvedValue({
					data: null,
					error: new Error("Database error"),
				}),
			}),
		});

		const result = await getLinkGroupsForPage("page-id");

		expect(result.error).toBeDefined();
		expect(result.data).toBeNull();
	});

	test("should return empty array when page has no links", async () => {
		// Mock page query returning empty content
		mockSupabaseClient.from.mockImplementation((table: string) => {
			if (table === "pages") {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockResolvedValue({
							data: {
								id: "page-1",
								content_tiptap: { type: "doc", content: [] },
							},
							error: null,
						}),
					}),
				};
			}
			// No link groups query needed
			return {
				select: vi.fn().mockReturnValue({
					in: vi.fn().mockResolvedValue({
						data: [],
						error: null,
					}),
				}),
			};
		});

		const result = await getLinkGroupsForPage("page-1");

		expect(result.error).toBeNull();
		expect(result.data).toEqual([]);
	});

	test("should filter out link groups with linkCount = 1", async () => {
		// Mock page with links
		mockSupabaseClient.from.mockImplementation((table: string) => {
			if (table === "pages") {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockResolvedValue({
							data: {
								id: "page-1",
								content_tiptap: {
									type: "doc",
									content: [
										{
											type: "paragraph",
											content: [
												{
													type: "text",
													text: "React",
													marks: [
														{
															type: "unilink",
															attrs: { key: "react" },
														},
													],
												},
											],
										},
									],
								},
							},
							error: null,
						}),
					}),
				};
			}
			if (table === "link_groups") {
				return {
					select: vi.fn().mockReturnValue({
						in: vi.fn().mockResolvedValue({
							data: [
								{
									id: "group-1",
									key: "react",
									raw_text: "React",
									page_id: null,
									link_count: 1, // Should be filtered out
								},
							],
							error: null,
						}),
					}),
				};
			}
			return {};
		});

		const result = await getLinkGroupsForPage("page-1");

		expect(result.error).toBeNull();
		expect(result.data).toEqual([]);
	});

	test("should return link groups with linkCount > 1", async () => {
		const mockTargetPage = {
			id: "target-page",
			title: "React Framework",
			thumbnail_url: null,
			content_tiptap: { type: "doc", content: [] },
			updated_at: "2025-01-01T00:00:00Z",
		};

		const mockReferencingPage = {
			id: "ref-page",
			title: "Referencing Page",
			thumbnail_url: null,
			content_tiptap: { type: "doc", content: [] },
			updated_at: "2025-01-01T00:00:00Z",
		};

		mockSupabaseClient.from.mockImplementation((table: string) => {
			if (table === "pages") {
				return {
					select: vi.fn().mockImplementation((query: string) => {
						if (query === "content_tiptap") {
							return {
								eq: vi.fn().mockResolvedValue({
									data: {
										id: "current-page",
										content_tiptap: {
											type: "doc",
											content: [
												{
													type: "paragraph",
													content: [
														{
															type: "text",
															text: "React",
															marks: [
																{
																	type: "unilink",
																	attrs: { key: "react" },
																},
															],
														},
													],
												},
											],
										},
									},
									error: null,
								}),
							};
						}
						// Query for target page and referencing pages
						return {
							eq: vi.fn().mockResolvedValue({
								data: mockTargetPage,
								error: null,
							}),
							in: vi.fn().mockResolvedValue({
								data: [mockReferencingPage],
								error: null,
							}),
						};
					}),
				};
			}
			if (table === "link_groups") {
				return {
					select: vi.fn().mockReturnValue({
						in: vi.fn().mockResolvedValue({
							data: [
								{
									id: "group-1",
									key: "react",
									raw_text: "React",
									page_id: "target-page",
									link_count: 3,
								},
							],
							error: null,
						}),
					}),
				};
			}
			if (table === "link_occurrences") {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockResolvedValue({
							data: [
								{ source_page_id: "current-page" },
								{ source_page_id: "ref-page" },
								{ source_page_id: "target-page" },
							],
							error: null,
						}),
					}),
				};
			}
			return {};
		});

		const result = await getLinkGroupsForPage("current-page");

		expect(result.error).toBeNull();
		expect(result.data).toHaveLength(1);
		expect(result.data?.[0]).toMatchObject({
			key: "react",
			displayText: "React",
			linkCount: 3,
		});
	});

	test("should handle page without target page (undefined link)", async () => {
		mockSupabaseClient.from.mockImplementation((table: string) => {
			if (table === "pages") {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockResolvedValue({
							data: {
								id: "page-1",
								content_tiptap: {
									type: "doc",
									content: [
										{
											type: "paragraph",
											content: [
												{
													type: "text",
													text: "Undefined",
													marks: [
														{
															type: "unilink",
															attrs: { key: "undefined" },
														},
													],
												},
											],
										},
									],
								},
							},
							error: null,
						}),
						in: vi.fn().mockResolvedValue({
							data: [],
							error: null,
						}),
					}),
				};
			}
			if (table === "link_groups") {
				return {
					select: vi.fn().mockReturnValue({
						in: vi.fn().mockResolvedValue({
							data: [
								{
									id: "group-1",
									key: "undefined",
									raw_text: "Undefined",
									page_id: null, // No target page
									link_count: 2,
								},
							],
							error: null,
						}),
					}),
				};
			}
			if (table === "link_occurrences") {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockResolvedValue({
							data: [
								{ source_page_id: "page-1" },
								{ source_page_id: "page-2" },
							],
							error: null,
						}),
					}),
				};
			}
			return {};
		});

		const result = await getLinkGroupsForPage("page-1");

		expect(result.error).toBeNull();
		expect(result.data).toHaveLength(1);
		expect(result.data?.[0].pageId).toBeNull();
		expect(result.data?.[0].targetPage).toBeNull();
	});
});
