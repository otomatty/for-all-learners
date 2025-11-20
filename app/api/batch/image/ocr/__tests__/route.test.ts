/**
 * /api/batch/image/ocr API Route Tests
 * 
 * Tests for the image batch OCR API endpoint
 * 
 * Related Files:
 * - Implementation: app/api/batch/image/ocr/route.ts
 * - Original Server Action: app/_actions/transcribeImageBatch.ts
 */

import { POST } from "../route";
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Mock Supabase
jest.mock("@/lib/supabase/server");

// Mock LLM factory
jest.mock("@/lib/llm/factory", () => ({
	createClientWithUserKey: jest.fn(),
}));

// Mock Gemini Quota Manager
jest.mock("@/lib/utils/geminiQuotaManager", () => ({
	getGeminiQuotaManager: jest.fn(() => ({
		validatePdfProcessing: jest.fn(() => ({
			canProcess: true,
			message: "OK",
		})),
	})),
	executeWithQuotaCheck: jest.fn((fn) => fn()),
}));

describe("POST /api/batch/image/ocr", () => {
	const mockSupabase = {
		auth: {
			getUser: jest.fn(),
		},
	};

	beforeEach(() => {
		jest.clearAllMocks();
		(createClient as jest.Mock).mockResolvedValue(mockSupabase);
	});

	describe("Authentication", () => {
		it("should return 401 if user is not authenticated", async () => {
			mockSupabase.auth.getUser.mockResolvedValue({
				data: { user: null },
				error: new Error("Not authenticated"),
			});

			const request = new NextRequest("http://localhost/api/batch/image/ocr", {
				method: "POST",
				body: JSON.stringify({
					pages: [],
				}),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(401);
			expect(data.error).toBe("Unauthorized");
		});

		it("should return 401 if user is null", async () => {
			mockSupabase.auth.getUser.mockResolvedValue({
				data: { user: null },
				error: null,
			});

			const request = new NextRequest("http://localhost/api/batch/image/ocr", {
				method: "POST",
				body: JSON.stringify({
					pages: [],
				}),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(401);
			expect(data.error).toBe("Unauthorized");
		});
	});

	describe("Input Validation", () => {
		beforeEach(() => {
			mockSupabase.auth.getUser.mockResolvedValue({
				data: { user: { id: "test-user-id" } },
				error: null,
			});
		});

		it("should return 400 if pages array is missing", async () => {
			const request = new NextRequest("http://localhost/api/batch/image/ocr", {
				method: "POST",
				body: JSON.stringify({}),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("Bad request");
		});

		it("should return 400 if pages array is empty", async () => {
			const request = new NextRequest("http://localhost/api/batch/image/ocr", {
				method: "POST",
				body: JSON.stringify({
					pages: [],
				}),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("Bad request");
		});

		it("should return 400 if pages array is too large", async () => {
			const pages = Array.from({ length: 101 }, (_, i) => ({
				pageNumber: i + 1,
				imageUrl: `https://example.com/page${i + 1}.png`,
			}));

			const request = new NextRequest("http://localhost/api/batch/image/ocr", {
				method: "POST",
				body: JSON.stringify({ pages }),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("Bad request");
			expect(data.message).toContain("100");
		});

		it("should accept valid page data", async () => {
			const pages = [
				{ pageNumber: 1, imageUrl: "https://example.com/page1.png" },
				{ pageNumber: 2, imageUrl: "https://example.com/page2.png" },
			];

			const request = new NextRequest("http://localhost/api/batch/image/ocr", {
				method: "POST",
				body: JSON.stringify({ pages, batchSize: 4 }),
			});

			// Mock the OCR processing to avoid actual API calls
			const { createClientWithUserKey } = require("@/lib/llm/factory");
			createClientWithUserKey.mockResolvedValue({
				uploadFile: jest.fn().mockResolvedValue({
					uri: "test-uri",
					mimeType: "image/png",
				}),
				generateWithFiles: jest.fn().mockResolvedValue(
					JSON.stringify([
						{ pageNumber: 1, extractedText: "Test text 1" },
						{ pageNumber: 2, extractedText: "Test text 2" },
					])
				),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
		});
	});

	describe("Batch OCR Processing", () => {
		beforeEach(() => {
			mockSupabase.auth.getUser.mockResolvedValue({
				data: { user: { id: "test-user-id" } },
				error: null,
			});
		});

		it("should process images in batches", async () => {
			const pages = Array.from({ length: 8 }, (_, i) => ({
				pageNumber: i + 1,
				imageUrl: `https://example.com/page${i + 1}.png`,
			}));

			const mockUploadFile = jest.fn().mockResolvedValue({
				uri: "test-uri",
				mimeType: "image/png",
			});

			const mockGenerateWithFiles = jest.fn().mockResolvedValue(
				JSON.stringify(
					pages.slice(0, 4).map((p) => ({
						pageNumber: p.pageNumber,
						extractedText: `Extracted text for page ${p.pageNumber}`,
					}))
				)
			);

			const { createClientWithUserKey } = require("@/lib/llm/factory");
			createClientWithUserKey.mockResolvedValue({
				uploadFile: mockUploadFile,
				generateWithFiles: mockGenerateWithFiles,
			});

			const request = new NextRequest("http://localhost/api/batch/image/ocr", {
				method: "POST",
				body: JSON.stringify({ pages, batchSize: 4 }),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.extractedPages).toBeDefined();
			expect(mockGenerateWithFiles).toHaveBeenCalled();
		});

		it("should handle partial success", async () => {
			const pages = [
				{ pageNumber: 1, imageUrl: "https://example.com/page1.png" },
				{ pageNumber: 2, imageUrl: "https://example.com/page2.png" },
				{ pageNumber: 3, imageUrl: "https://example.com/page3.png" },
			];

			// First batch succeeds, second fails
			const mockGenerateWithFiles = jest
				.fn()
				.mockResolvedValueOnce(
					JSON.stringify([
						{ pageNumber: 1, extractedText: "Text 1" },
						{ pageNumber: 2, extractedText: "Text 2" },
					])
				)
				.mockRejectedValueOnce(new Error("OCR failed"));

			const { createClientWithUserKey } = require("@/lib/llm/factory");
			createClientWithUserKey.mockResolvedValue({
				uploadFile: jest.fn().mockResolvedValue({
					uri: "test-uri",
					mimeType: "image/png",
				}),
				generateWithFiles: mockGenerateWithFiles,
			});

			const request = new NextRequest("http://localhost/api/batch/image/ocr", {
				method: "POST",
				body: JSON.stringify({ pages, batchSize: 2 }),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.extractedPages.length).toBeGreaterThan(0);
			expect(data.skippedCount).toBeGreaterThan(0);
		});

		it("should return error if all batches fail", async () => {
			const pages = [
				{ pageNumber: 1, imageUrl: "https://example.com/page1.png" },
			];

			const { createClientWithUserKey } = require("@/lib/llm/factory");
			createClientWithUserKey.mockResolvedValue({
				uploadFile: jest.fn().mockRejectedValue(new Error("Upload failed")),
				generateWithFiles: jest.fn(),
			});

			const request = new NextRequest("http://localhost/api/batch/image/ocr", {
				method: "POST",
				body: JSON.stringify({ pages, batchSize: 4 }),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(false);
			expect(data.message).toContain("失敗");
		});
	});

	describe("Quota Management", () => {
		beforeEach(() => {
			mockSupabase.auth.getUser.mockResolvedValue({
				data: { user: { id: "test-user-id" } },
				error: null,
			});
		});

		it("should check quota before processing", async () => {
			const { getGeminiQuotaManager } = require("@/lib/utils/geminiQuotaManager");
			const mockValidate = jest.fn().mockReturnValue({
				canProcess: false,
				message: "Quota exceeded",
			});

			getGeminiQuotaManager.mockReturnValue({
				validatePdfProcessing: mockValidate,
			});

			const pages = [
				{ pageNumber: 1, imageUrl: "https://example.com/page1.png" },
			];

			const request = new NextRequest("http://localhost/api/batch/image/ocr", {
				method: "POST",
				body: JSON.stringify({ pages, batchSize: 4 }),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(429);
			expect(data.error).toBe("Too Many Requests");
			expect(mockValidate).toHaveBeenCalled();
		});
	});

	describe("Custom Batch Size", () => {
		beforeEach(() => {
			mockSupabase.auth.getUser.mockResolvedValue({
				data: { user: { id: "test-user-id" } },
				error: null,
			});
		});

		it("should use custom batch size if provided", async () => {
			const pages = Array.from({ length: 6 }, (_, i) => ({
				pageNumber: i + 1,
				imageUrl: `https://example.com/page${i + 1}.png`,
			}));

			const mockGenerateWithFiles = jest.fn().mockResolvedValue(
				JSON.stringify(
					pages.slice(0, 2).map((p) => ({
						pageNumber: p.pageNumber,
						extractedText: `Text ${p.pageNumber}`,
					}))
				)
			);

			const { createClientWithUserKey } = require("@/lib/llm/factory");
			createClientWithUserKey.mockResolvedValue({
				uploadFile: jest.fn().mockResolvedValue({
					uri: "test-uri",
					mimeType: "image/png",
				}),
				generateWithFiles: mockGenerateWithFiles,
			});

			const request = new NextRequest("http://localhost/api/batch/image/ocr", {
				method: "POST",
				body: JSON.stringify({ pages, batchSize: 2 }),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
		});

		it("should reject batch size > 10", async () => {
			const pages = [
				{ pageNumber: 1, imageUrl: "https://example.com/page1.png" },
			];

			const request = new NextRequest("http://localhost/api/batch/image/ocr", {
				method: "POST",
				body: JSON.stringify({ pages, batchSize: 11 }),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("Bad request");
			expect(data.message).toContain("batchSize");
		});
	});
});
