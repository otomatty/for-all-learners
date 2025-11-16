/**
 * Page Visits Server Actions Tests
 *
 * Tests for page visit recording and retrieval
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ app/(protected)/notes/[slug]/[id]/page.tsx
 *
 * Dependencies:
 *   ├─ lib/supabase/server.ts
 *   └─ lib/logger.ts
 *
 * Related Documentation:
 *   ├─ Issue: https://github.com/otomatty/for-all-learners/issues/139
 *   └─ Plan: docs/03_plans/telomere-feature/
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { getLastPageVisit, recordPageVisit } from "../page-visits";

// Mock Supabase client
vi.mock("@/lib/supabase/server", () => ({
	createClient: vi.fn(),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
	default: {
		error: vi.fn(),
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
	},
}));

import { createClient } from "@/lib/supabase/server";

describe("Page Visits Server Actions", () => {
	const mockSupabase = {
		auth: {
			getUser: vi.fn(),
		},
		from: vi.fn(),
	};

	const mockUser = {
		id: "user-123",
		email: "test@example.com",
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
	});

	describe("recordPageVisit", () => {
		it("should record page visit successfully", async () => {
			const pageId = "page-123";
			const now = new Date("2025-11-16T12:00:00Z");

			mockSupabase.auth.getUser.mockResolvedValue({
				data: { user: mockUser },
				error: null,
			});

			const mockFrom = {
				upsert: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({
					data: { last_visited_at: now.toISOString() },
					error: null,
				}),
			};

			mockSupabase.from.mockReturnValue(mockFrom);

			const result = await recordPageVisit(pageId);

			expect(result).toBeInstanceOf(Date);
			expect(mockSupabase.from).toHaveBeenCalledWith("user_page_visits");
			expect(mockFrom.upsert).toHaveBeenCalledWith(
				{
					user_id: mockUser.id,
					page_id: pageId,
					last_visited_at: expect.any(String),
				},
				{
					onConflict: "user_id,page_id",
				},
			);
		});

		it("should return null when user is not authenticated", async () => {
			const pageId = "page-123";

			mockSupabase.auth.getUser.mockResolvedValue({
				data: { user: null },
				error: { message: "Not authenticated" },
			});

			const result = await recordPageVisit(pageId);

			expect(result).toBeNull();
		});

		it("should return null when database error occurs", async () => {
			const pageId = "page-123";

			mockSupabase.auth.getUser.mockResolvedValue({
				data: { user: mockUser },
				error: null,
			});

			const mockFrom = {
				upsert: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({
					data: null,
					error: { message: "Database error" },
				}),
			};

			mockSupabase.from.mockReturnValue(mockFrom);

			const result = await recordPageVisit(pageId);

			expect(result).toBeNull();
		});

		it("should return current time when data is missing", async () => {
			const pageId = "page-123";

			mockSupabase.auth.getUser.mockResolvedValue({
				data: { user: mockUser },
				error: null,
			});

			const mockFrom = {
				upsert: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({
					data: { last_visited_at: null },
					error: null,
				}),
			};

			mockSupabase.from.mockReturnValue(mockFrom);

			const result = await recordPageVisit(pageId);

			expect(result).toBeInstanceOf(Date);
		});
	});

	describe("getLastPageVisit", () => {
		it("should return last visit timestamp when record exists", async () => {
			const pageId = "page-123";
			const lastVisitedAt = new Date("2025-11-16T10:00:00Z");

			mockSupabase.auth.getUser.mockResolvedValue({
				data: { user: mockUser },
				error: null,
			});

			const mockFrom = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({
					data: { last_visited_at: lastVisitedAt.toISOString() },
					error: null,
				}),
			};

			mockSupabase.from.mockReturnValue(mockFrom);

			const result = await getLastPageVisit(pageId);

			expect(result).toBeInstanceOf(Date);
			expect(result?.toISOString()).toBe(lastVisitedAt.toISOString());
			expect(mockSupabase.from).toHaveBeenCalledWith("user_page_visits");
			expect(mockFrom.eq).toHaveBeenCalledWith("user_id", mockUser.id);
			expect(mockFrom.eq).toHaveBeenCalledWith("page_id", pageId);
		});

		it("should return null when user is not authenticated", async () => {
			const pageId = "page-123";

			mockSupabase.auth.getUser.mockResolvedValue({
				data: { user: null },
				error: { message: "Not authenticated" },
			});

			const result = await getLastPageVisit(pageId);

			expect(result).toBeNull();
		});

		it("should return null when page was never visited", async () => {
			const pageId = "page-123";

			mockSupabase.auth.getUser.mockResolvedValue({
				data: { user: mockUser },
				error: null,
			});

			const mockFrom = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({
					data: null,
					error: { code: "PGRST116", message: "No rows returned" },
				}),
			};

			mockSupabase.from.mockReturnValue(mockFrom);

			const result = await getLastPageVisit(pageId);

			expect(result).toBeNull();
		});

		it("should return null when database error occurs", async () => {
			const pageId = "page-123";

			mockSupabase.auth.getUser.mockResolvedValue({
				data: { user: mockUser },
				error: null,
			});

			const mockFrom = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({
					data: null,
					error: { message: "Database error" },
				}),
			};

			mockSupabase.from.mockReturnValue(mockFrom);

			const result = await getLastPageVisit(pageId);

			expect(result).toBeNull();
		});

		it("should return null when last_visited_at is null", async () => {
			const pageId = "page-123";

			mockSupabase.auth.getUser.mockResolvedValue({
				data: { user: mockUser },
				error: null,
			});

			const mockFrom = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({
					data: { last_visited_at: null },
					error: null,
				}),
			};

			mockSupabase.from.mockReturnValue(mockFrom);

			const result = await getLastPageVisit(pageId);

			expect(result).toBeNull();
		});
	});
});
