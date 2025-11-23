/**
 * Tests for Generate Cards From Page API Route
 *
 * DEPENDENCY MAP:
 *
 * Parents (Tests for):
 *   └─ app/api/ai/generate-cards-from-page/route.ts
 *
 * Dependencies (Mocks):
 *   ├─ app/_actions/generateCardsFromPage.ts (generateRawCardsFromPageContent, saveGeneratedCards - mocked)
 *   ├─ lib/supabase/server.ts (createClient - mocked)
 *   └─ lib/logger.ts (logger - mocked)
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies BEFORE imports
vi.mock("@/app/_actions/generateCardsFromPage");
vi.mock("@/lib/supabase/server");
vi.mock("@/lib/logger");

import type { NextRequest } from "next/server";
import {
	generateRawCardsFromPageContent,
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

describe("POST /api/ai/generate-cards-from-page", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ========================================
	// TC-001: 基本的なカード生成（データベース保存なし）
	// ========================================
	describe("TC-001: Basic card generation without saving", () => {
		it("should generate cards successfully without saving", async () => {
			const mockCards = [
				{
					front_content: "What is React?",
					back_content: "A JavaScript library",
				},
			];

			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient() as never,
			);

			vi.mocked(generateRawCardsFromPageContent).mockResolvedValue({
				generatedRawCards: mockCards,
			});

			const request = createMockRequest({
				pageContentTiptap: { type: "doc", content: [] },
				pageId: "page-123",
				deckId: "deck-123",
				saveToDatabase: false,
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.cards).toEqual(mockCards);
			expect(data.savedCardsCount).toBeUndefined();
			expect(saveGeneratedCards).not.toHaveBeenCalled();
		});
	});

	// ========================================
	// TC-002: カード生成とデータベース保存
	// ========================================
	describe("TC-002: Card generation with database save", () => {
		it("should generate cards and save to database", async () => {
			const mockCards = [
				{
					front_content: "What is React?",
					back_content: "A JavaScript library",
				},
			];

			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient() as never,
			);

			vi.mocked(generateRawCardsFromPageContent).mockResolvedValue({
				generatedRawCards: mockCards,
			});

			vi.mocked(wrapTextInTiptapJson).mockResolvedValue({
				type: "doc",
				content: [],
			} as never);

			vi.mocked(saveGeneratedCards).mockResolvedValue({
				savedCardsCount: 1,
			});

			const request = createMockRequest({
				pageContentTiptap: { type: "doc", content: [] },
				pageId: "page-123",
				deckId: "deck-123",
				saveToDatabase: true,
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.cards).toEqual(mockCards);
			expect(data.savedCardsCount).toBe(1);
			expect(saveGeneratedCards).toHaveBeenCalled();
		});
	});

	// ========================================
	// TC-003: 認証エラー
	// ========================================
	describe("TC-003: Authentication error", () => {
		it("should return 401 when user is not authenticated", async () => {
			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient(false) as never,
			);

			const request = createMockRequest({
				pageContentTiptap: { type: "doc", content: [] },
				pageId: "page-123",
				deckId: "deck-123",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(401);
			expect(data.error).toBe("認証が必要です");
			expect(generateRawCardsFromPageContent).not.toHaveBeenCalled();
		});
	});

	// ========================================
	// TC-004: バリデーションエラー（pageId未指定）
	// ========================================
	describe("TC-004: Validation error - missing pageId", () => {
		it("should return 400 when pageId is missing", async () => {
			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient() as never,
			);

			const request = createMockRequest({
				pageContentTiptap: { type: "doc", content: [] },
				deckId: "deck-123",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("pageIdは必須です");
			expect(generateRawCardsFromPageContent).not.toHaveBeenCalled();
		});
	});

	// ========================================
	// TC-005: バリデーションエラー（deckId未指定）
	// ========================================
	describe("TC-005: Validation error - missing deckId", () => {
		it("should return 400 when deckId is missing", async () => {
			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient() as never,
			);

			const request = createMockRequest({
				pageContentTiptap: { type: "doc", content: [] },
				pageId: "page-123",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("deckIdは必須です");
			expect(generateRawCardsFromPageContent).not.toHaveBeenCalled();
		});
	});

	// ========================================
	// TC-006: バリデーションエラー（不正なprovider）
	// ========================================
	describe("TC-006: Validation error - invalid provider", () => {
		it("should return 400 when provider is invalid", async () => {
			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient() as never,
			);

			const request = createMockRequest({
				pageContentTiptap: { type: "doc", content: [] },
				pageId: "page-123",
				deckId: "deck-123",
				provider: "invalid-provider",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toContain("無効なproviderです");
			expect(generateRawCardsFromPageContent).not.toHaveBeenCalled();
		});
	});

	// ========================================
	// TC-007: カード生成エラー（エラーあり）
	// ========================================
	describe("TC-007: Card generation error", () => {
		it("should return 400 when card generation returns error", async () => {
			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient() as never,
			);

			vi.mocked(generateRawCardsFromPageContent).mockResolvedValue({
				generatedRawCards: [],
				error: "ページにテキストがありません",
			});

			const request = createMockRequest({
				pageContentTiptap: { type: "doc", content: [] },
				pageId: "page-123",
				deckId: "deck-123",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("ページにテキストがありません");
			expect(data.cards).toEqual([]);
		});
	});

	// ========================================
	// TC-008: データベース保存エラー
	// ========================================
	describe("TC-008: Database save error", () => {
		it("should return 500 when database save fails", async () => {
			const mockCards = [
				{
					front_content: "What is React?",
					back_content: "A JavaScript library",
				},
			];

			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient() as never,
			);

			vi.mocked(generateRawCardsFromPageContent).mockResolvedValue({
				generatedRawCards: mockCards,
			});

			vi.mocked(wrapTextInTiptapJson).mockResolvedValue({
				type: "doc",
				content: [],
			} as never);

			vi.mocked(saveGeneratedCards).mockResolvedValue({
				savedCardsCount: 0,
				error: "データベースエラー",
			});

			const request = createMockRequest({
				pageContentTiptap: { type: "doc", content: [] },
				pageId: "page-123",
				deckId: "deck-123",
				saveToDatabase: true,
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(500);
			expect(data.error).toBe("データベースエラー");
			expect(data.cards).toEqual(mockCards);
			expect(data.savedCardsCount).toBe(0);
		});
	});

	// ========================================
	// TC-009: APIキー未設定エラー
	// ========================================
	describe("TC-009: API key not configured error", () => {
		it("should return 400 when API key is not configured", async () => {
			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient() as never,
			);

			vi.mocked(generateRawCardsFromPageContent).mockRejectedValue(
				new Error("API key not configured"),
			);

			const request = createMockRequest({
				pageContentTiptap: { type: "doc", content: [] },
				pageId: "page-123",
				deckId: "deck-123",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toContain("APIキーが設定されていません");
		});
	});
});

