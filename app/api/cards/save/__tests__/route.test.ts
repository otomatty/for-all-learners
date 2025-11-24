/**
 * Tests for Save Cards API Route
 *
 * DEPENDENCY MAP:
 *
 * Parents (Tests for):
 *   └─ app/api/cards/save/route.ts
 *
 * Dependencies (Mocks):
 *   ├─ lib/supabase/server.ts (createClient - mocked)
 *   ├─ lib/utils/pdfUtils.ts (convertTextToTiptapJSON - mocked)
 *   └─ lib/logger.ts (logger - mocked)
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies BEFORE imports
vi.mock("@/lib/supabase/server");
vi.mock("@/lib/utils/pdfUtils");
vi.mock("@/lib/logger");

import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { convertTextToTiptapJSON } from "@/lib/utils/pdfUtils";
import { POST } from "../route";

// Helper: Create mock NextRequest
function createMockRequest(body: unknown): NextRequest {
	return {
		json: async () => body,
	} as NextRequest;
}

// Helper: Create mock Supabase client with authenticated user
function createMockSupabaseClient(authenticated = true) {
	const mockFrom = vi.fn().mockReturnValue({
		insert: vi.fn().mockReturnThis(),
		select: vi.fn().mockResolvedValue({
			data: [
				{
					id: "card-1",
					deck_id: "deck-123",
					user_id: "user-123",
					page_id: "page-123",
					front_content: { type: "doc", content: [] },
					back_content: { type: "doc", content: [] },
				},
				{
					id: "card-2",
					deck_id: "deck-123",
					user_id: "user-123",
					page_id: "page-123",
					front_content: { type: "doc", content: [] },
					back_content: { type: "doc", content: [] },
				},
			],
			error: null,
		}),
	});

	return {
		auth: {
			getUser: () =>
				Promise.resolve({
					data: {
						user: authenticated ? { id: "user-123" } : null,
					},
					error: authenticated ? null : new Error("Not authenticated"),
				}),
		},
		from: mockFrom,
	};
}

describe("POST /api/cards/save", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ========================================
	// TC-001: 基本的なカード保存
	// ========================================
	describe("TC-001: Basic card save", () => {
		it("should save cards successfully", async () => {
			const mockClient = createMockSupabaseClient();
			vi.mocked(createClient).mockResolvedValue(mockClient as never);

			vi.mocked(convertTextToTiptapJSON).mockReturnValue({
				type: "doc",
				content: [],
			});

			const request = createMockRequest({
				cards: [
					{
						front_content: "Question 1",
						back_content: "Answer 1",
					},
					{
						front_content: "Question 2",
						back_content: "Answer 2",
					},
				],
				pageId: "page-123",
				deckId: "deck-123",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.savedCardsCount).toBe(2);
			expect(mockClient.from).toHaveBeenCalledWith("cards");
		});
	});

	// ========================================
	// TC-002: 認証エラー
	// ========================================
	describe("TC-002: Authentication error", () => {
		it("should return 401 when user is not authenticated", async () => {
			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient(false) as never,
			);

			const request = createMockRequest({
				cards: [
					{
						front_content: "Question",
						back_content: "Answer",
					},
				],
				pageId: "page-123",
				deckId: "deck-123",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(401);
			expect(data.error).toBe("認証が必要です");
		});
	});

	// ========================================
	// TC-003: バリデーションエラー（cards未指定）
	// ========================================
	describe("TC-003: Validation error - missing cards", () => {
		it("should return 400 when cards is missing", async () => {
			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient() as never,
			);

			const request = createMockRequest({
				pageId: "page-123",
				deckId: "deck-123",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("cardsは配列である必要があります");
		});
	});

	// ========================================
	// TC-004: バリデーションエラー（空のcards）
	// ========================================
	describe("TC-004: Validation error - empty cards", () => {
		it("should return 400 when cards is empty", async () => {
			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient() as never,
			);

			const request = createMockRequest({
				cards: [],
				pageId: "page-123",
				deckId: "deck-123",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("保存するカードがありません");
		});
	});

	// ========================================
	// TC-005: バリデーションエラー（pageId未指定）
	// ========================================
	describe("TC-005: Validation error - missing pageId", () => {
		it("should return 400 when pageId is missing", async () => {
			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient() as never,
			);

			const request = createMockRequest({
				cards: [
					{
						front_content: "Question",
						back_content: "Answer",
					},
				],
				deckId: "deck-123",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("pageIdは必須です");
		});
	});

	// ========================================
	// TC-006: バリデーションエラー（deckId未指定）
	// ========================================
	describe("TC-006: Validation error - missing deckId", () => {
		it("should return 400 when deckId is missing", async () => {
			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient() as never,
			);

			const request = createMockRequest({
				cards: [
					{
						front_content: "Question",
						back_content: "Answer",
					},
				],
				pageId: "page-123",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("deckIdは必須です");
		});
	});

	// ========================================
	// TC-007: カード保存エラー
	// ========================================
	describe("TC-007: Card save error", () => {
		it("should return 500 when save fails", async () => {
			const mockClient = createMockSupabaseClient();
			vi.mocked(createClient).mockResolvedValue(mockClient as never);

			vi.mocked(convertTextToTiptapJSON).mockReturnValue({
				type: "doc",
				content: [],
			});

			// Mock Supabase insert error
			const mockFrom = vi.fn().mockReturnValue({
				insert: vi.fn().mockReturnThis(),
				select: vi.fn().mockResolvedValue({
					data: null,
					error: { message: "データベースエラー" },
				}),
			});
			mockClient.from = mockFrom;

			const request = createMockRequest({
				cards: [
					{
						front_content: "Question",
						back_content: "Answer",
					},
				],
				pageId: "page-123",
				deckId: "deck-123",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(500);
			expect(data.error).toBe("データベースエラー");
			expect(data.savedCardsCount).toBe(0);
		});
	});
});
