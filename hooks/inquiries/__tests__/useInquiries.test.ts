import { waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import {
	useAllInquiries,
	useInquiryById,
	useInquiryCategories,
	useSubmitInquiry,
	useUpdateInquiry,
} from "../useInquiries";
import { mockSupabaseClient, renderHookWithProvider } from "./helpers";

vi.mock("@/lib/supabase/client");

describe("useInquiries", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);
	});

	describe("useInquiryCategories", () => {
		it("should fetch inquiry categories successfully", async () => {
			const mockCategories = [
				{ id: 1, name_ja: "バグ報告" },
				{ id: 2, name_ja: "機能要望" },
			];

			const orderMock = vi.fn().mockResolvedValue({
				data: mockCategories,
				error: null,
			});

			mockSupabaseClient.from = vi.fn().mockReturnValue({
				select: vi.fn().mockReturnValue({
					order: orderMock,
				}),
			});

			const { result } = renderHookWithProvider(() => useInquiryCategories());

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			expect(result.current.data?.success).toBe(true);
			expect(result.current.data?.categories).toEqual(mockCategories);
		});

		it("should handle errors gracefully", async () => {
			const orderMock = vi.fn().mockResolvedValue({
				data: null,
				error: { message: "Database error" },
			});

			mockSupabaseClient.from = vi.fn().mockReturnValue({
				select: vi.fn().mockReturnValue({
					order: orderMock,
				}),
			});

			const { result } = renderHookWithProvider(() => useInquiryCategories());

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			expect(result.current.data?.success).toBe(false);
			expect(result.current.data?.categories).toBeNull();
		});
	});

	describe("useSubmitInquiry", () => {
		it("should submit inquiry successfully", async () => {
			const formData = new FormData();
			formData.append("subject", "Test Subject");
			formData.append("body", "Test Body");
			formData.append("email", "test@example.com");

			const mockInquiry = {
				id: "inquiry-123",
			};

			mockSupabaseClient.auth = {
				getUser: vi.fn().mockResolvedValue({
					data: { user: null },
					error: null,
				}),
			} as unknown as typeof mockSupabaseClient.auth;

			const insertMock = vi.fn().mockReturnValue({
				select: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue({
						data: mockInquiry,
						error: null,
					}),
				}),
			});

			mockSupabaseClient.from = vi.fn().mockImplementation((table) => {
				if (table === "inquiries") {
					return {
						insert: insertMock,
					};
				}
				if (table === "inquiry_attachments") {
					return {
						insert: vi.fn().mockResolvedValue({
							data: null,
							error: null,
						}),
					};
				}
				return {};
			});

			vi.mocked(mockSupabaseClient.storage.from).mockReturnValue({
				upload: vi.fn().mockResolvedValue({
					data: { path: "test-path" },
					error: null,
				}),
				getPublicUrl: vi.fn().mockReturnValue({
					data: { publicUrl: "http://public.url" },
				}),
			} as any);

			const { result } = renderHookWithProvider(() => useSubmitInquiry());

			await waitFor(() => {
				expect(result.current.isIdle).toBe(true);
			});

			result.current.mutate({ formData, attachments: [] });

			await waitFor(
				() => {
					expect(result.current.isSuccess || result.current.isError).toBe(true);
				},
				{ timeout: 5000 },
			);

			if (result.current.isError) {
				// Error handling is tested via expect statements below
			}
			if (result.current.data && !result.current.data.success) {
				// Error handling is tested via expect statements below
			}

			expect(result.current.isSuccess).toBe(true);
			expect(result.current.data?.success).toBe(true);
			expect(result.current.data?.inquiryId).toBe("inquiry-123");
		});
	});

	describe("useAllInquiries", () => {
		it("should fetch all inquiries successfully", async () => {
			const mockInquiries = [
				{
					id: "inquiry-1",
					created_at: "2025-01-01T00:00:00Z",
					subject: "Test Inquiry",
					status: "open" as const,
					priority: "medium" as const,
					email: "test@example.com",
					name: "Test User",
					inquiry_categories: { name_ja: "バグ報告" },
				},
			];

			const rangeMock = vi.fn().mockResolvedValue({
				data: mockInquiries,
				count: 1,
				error: null,
			});

			mockSupabaseClient.from = vi.fn().mockReturnValue({
				select: vi.fn().mockReturnValue({
					order: vi.fn().mockReturnValue({
						range: rangeMock,
						eq: vi.fn().mockReturnThis(),
						or: vi.fn().mockReturnThis(),
					}),
				}),
			});

			const { result } = renderHookWithProvider(() => useAllInquiries());

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			expect(result.current.data?.success).toBe(true);
			expect(result.current.data?.inquiries).toHaveLength(1);
			expect(result.current.data?.totalCount).toBe(1);
		});
	});

	describe("useInquiryById", () => {
		it("should fetch inquiry by ID successfully", async () => {
			const inquiryId = "inquiry-123";
			const mockInquiry = {
				id: inquiryId,
				subject: "Test Inquiry",
				body: "Test Body",
				status: "open" as const,
				inquiry_categories: { id: 1, name_ja: "バグ報告", name_en: "Bug" },
				inquiry_attachments: [],
			};

			const singleMock = vi.fn().mockResolvedValue({
				data: mockInquiry,
				error: null,
			});

			mockSupabaseClient.from = vi.fn().mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: singleMock,
					}),
				}),
			});

			vi.mocked(mockSupabaseClient.storage.from).mockReturnValue({
				getPublicUrl: vi.fn().mockReturnValue({
					data: { publicUrl: "https://example.com/file.jpg" },
				}),
			} as any);

			const { result } = renderHookWithProvider(() =>
				useInquiryById(inquiryId),
			);

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			expect(result.current.data?.success).toBe(true);
			expect(result.current.data?.inquiry?.id).toBe(inquiryId);
		});
	});

	describe("useUpdateInquiry", () => {
		it("should update inquiry successfully", async () => {
			const inquiryId = "inquiry-123";
			const formData = new FormData();
			formData.append("status", "resolved");

			const mockUpdatedInquiry = {
				id: inquiryId,
				status: "resolved" as const,
			};

			const singleMock = vi.fn().mockResolvedValue({
				data: mockUpdatedInquiry,
				error: null,
			});

			mockSupabaseClient.from = vi.fn().mockReturnValue({
				update: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						select: vi.fn().mockReturnValue({
							single: singleMock,
						}),
					}),
				}),
			});

			const { result } = renderHookWithProvider(() => useUpdateInquiry());

			await waitFor(() => {
				expect(result.current.isIdle).toBe(true);
			});

			result.current.mutate({ inquiryId, formData });

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			expect(result.current.data?.success).toBe(true);
			expect(result.current.data?.updatedInquiry?.id).toBe(inquiryId);
		});
	});
});
