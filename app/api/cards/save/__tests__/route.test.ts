/**
 * Tests for Save Cards API Route
 *
 * DEPENDENCY MAP:
 *
 * Parents (Tests for):
 *   └─ app/api/cards/save/route.ts
 *
 * Dependencies (Mocks):
 *   ├─ app/_actions/generateCardsFromPage.ts (saveGeneratedCards, wrapTextInTiptapJson - mocked)
 *   ├─ lib/supabase/server.ts (createClient - mocked)
 *   └─ lib/logger.ts (logger - mocked)
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies BEFORE imports
// Mock non-existent Server Actions module
vi.mock("@/app/_actions/generateCardsFromPage", () => ({
	saveGeneratedCards: vi.fn(),
	wrapTextInTiptapJson: vi.fn(),
}));

vi.mock("@/lib/supabase/server");
vi.mock("@/lib/logger");

import type { NextRequest } from "next/server";
import {
	saveGeneratedCards,
	wrapTextInTiptapJson,
} from "@/app/_actions/generateCardsFromPage";
import { createClient } from "@/lib/supabase/server";
import { POST } from "../route";

// Helper: Create mock NextRequest
function createMockRequest(body: unknown): NextRequest {
	return {
		json: async () => body,
	} as NextRequest;
}

// Helper: Create mock Supabase client with authenticated user
function createMockSupabaseClient(authenticated = true) {
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
			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient() as never,
			);

			vi.mocked(wrapTextInTiptapJson).mockResolvedValue({
				type: "doc",
				content: [],
			} as never);

			vi.mocked(saveGeneratedCards).mockResolvedValue({
				savedCardsCount: 2,
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
			expect(saveGeneratedCards).toHaveBeenCalled();
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
			expect(saveGeneratedCards).not.toHaveBeenCalled();
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
			expect(saveGeneratedCards).not.toHaveBeenCalled();
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
			expect(saveGeneratedCards).not.toHaveBeenCalled();
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
			expect(saveGeneratedCards).not.toHaveBeenCalled();
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
			expect(saveGeneratedCards).not.toHaveBeenCalled();
		});
	});

	// ========================================
	// TC-007: カード保存エラー
	// ========================================
	describe("TC-007: Card save error", () => {
		it("should return 500 when save fails", async () => {
			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient() as never,
			);

			vi.mocked(wrapTextInTiptapJson).mockResolvedValue({
				type: "doc",
				content: [],
			} as never);

			vi.mocked(saveGeneratedCards).mockResolvedValue({
				savedCardsCount: 0,
				error: "データベースエラー",
			});

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
