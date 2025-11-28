/**
 * /api/batch/pdf/ocr API Route Tests
 *
 * Tests for the PDF batch OCR API endpoint
 *
 * Related Files:
 * - Implementation: app/api/batch/pdf/ocr/route.ts
 */

import { NextRequest } from "next/server";
import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { POST } from "../route";

// Mock Supabase
vi.mock("@/lib/supabase/server");

// Mock LLM factory
vi.mock("@/lib/llm/factory", () => ({
	createClientWithUserKey: vi.fn(),
}));

// Mock Gemini Quota Manager
vi.mock("@/lib/utils/geminiQuotaManager", () => ({
	getGeminiQuotaManager: vi.fn(),
	executeWithQuotaCheck: vi.fn((fn) => fn()),
}));

describe("POST /api/batch/pdf/ocr", () => {
	const mockSupabase = {
		auth: {
			getUser: vi.fn(),
		},
	};

	beforeEach(() => {
		vi.clearAllMocks();
		(createClient as Mock).mockResolvedValue(mockSupabase);
	});

	describe("Authentication", () => {
		it("should return 401 if user is not authenticated", async () => {
			mockSupabase.auth.getUser.mockResolvedValue({
				data: { user: null },
				error: new Error("Not authenticated"),
			});

			const request = new NextRequest("http://localhost/api/batch/pdf/ocr", {
				method: "POST",
				body: JSON.stringify({
					imagePages: [],
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

		it("should return 400 if imagePages array is missing", async () => {
			const request = new NextRequest("http://localhost/api/batch/pdf/ocr", {
				method: "POST",
				body: JSON.stringify({}),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("Bad request");
			expect(data.message).toContain("imagePages");
		});

		it("should return 400 if imagePages array is empty", async () => {
			const request = new NextRequest("http://localhost/api/batch/pdf/ocr", {
				method: "POST",
				body: JSON.stringify({
					imagePages: [],
				}),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("Bad request");
		});

		it("should return 400 if imagePages array is too large", async () => {
			const imagePages = Array.from({ length: 101 }, (_, i) => ({
				pageNumber: i + 1,
				imageBlob: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg",
			}));

			const request = new NextRequest("http://localhost/api/batch/pdf/ocr", {
				method: "POST",
				body: JSON.stringify({ imagePages }),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("Bad request");
			expect(data.message).toContain("100");
		});

		it("should return 400 if image page structure is invalid", async () => {
			const imagePages = [
				{ pageNumber: "1", imageBlob: "data:image/png;base64,test" }, // Invalid pageNumber type
			];

			const request = new NextRequest("http://localhost/api/batch/pdf/ocr", {
				method: "POST",
				body: JSON.stringify({ imagePages }),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("Bad request");
			expect(data.message).toContain("無効");
		});
	});

	describe("PDF Batch OCR Processing", () => {
		beforeEach(async () => {
			mockSupabase.auth.getUser.mockResolvedValue({
				data: { user: { id: "test-user-id" } },
				error: null,
			});

			const { getGeminiQuotaManager } = await import(
				"@/lib/utils/geminiQuotaManager"
			);
			vi.mocked(getGeminiQuotaManager).mockReturnValue({
				validatePdfProcessing: vi.fn().mockReturnValue({
					canProcess: true,
					message: "OK",
				}),
			} as any);
		});

		it("should successfully process PDF batch OCR", async () => {
			const imagePages = [
				{
					pageNumber: 1,
					imageBlob: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg",
				},
				{
					pageNumber: 2,
					imageBlob: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg",
				},
			];

			const mockUploadFile = vi.fn().mockResolvedValue({
				uri: "test-uri",
				mimeType: "image/png",
			});

			const mockGenerateWithFiles = vi.fn().mockResolvedValue(
				JSON.stringify([
					{ pageNumber: 1, extractedText: "Text from page 1" },
					{ pageNumber: 2, extractedText: "Text from page 2" },
				]),
			);

			const { createClientWithUserKey } = await import("@/lib/llm/factory");
			(createClientWithUserKey as Mock).mockResolvedValue({
				uploadFile: mockUploadFile,
				generateWithFiles: mockGenerateWithFiles,
			});

			const request = new NextRequest("http://localhost/api/batch/pdf/ocr", {
				method: "POST",
				body: JSON.stringify({ imagePages }),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.extractedText).toHaveLength(2);
			expect(data.extractedText[0].text).toBe("Text from page 1");
			expect(mockUploadFile).toHaveBeenCalledTimes(2);
			expect(mockGenerateWithFiles).toHaveBeenCalledTimes(1);
		});

		it("should handle JSON extraction from code fence", async () => {
			const imagePages = [
				{ pageNumber: 1, imageBlob: "data:image/png;base64,test" },
			];

			const mockUploadFile = vi.fn().mockResolvedValue({
				uri: "test-uri",
				mimeType: "image/png",
			});

			const mockGenerateWithFiles = vi
				.fn()
				.mockResolvedValue(
					'```json\n[{"pageNumber": 1, "extractedText": "Test text"}]\n```',
				);

			const { createClientWithUserKey } = await import("@/lib/llm/factory");
			(createClientWithUserKey as Mock).mockResolvedValue({
				uploadFile: mockUploadFile,
				generateWithFiles: mockGenerateWithFiles,
			});

			const request = new NextRequest("http://localhost/api/batch/pdf/ocr", {
				method: "POST",
				body: JSON.stringify({ imagePages }),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.extractedText[0].text).toBe("Test text");
		});

		it("should filter out empty extracted text", async () => {
			const imagePages = [
				{ pageNumber: 1, imageBlob: "data:image/png;base64,test" },
				{ pageNumber: 2, imageBlob: "data:image/png;base64,test" },
			];

			const mockUploadFile = vi.fn().mockResolvedValue({
				uri: "test-uri",
				mimeType: "image/png",
			});

			const mockGenerateWithFiles = vi.fn().mockResolvedValue(
				JSON.stringify([
					{ pageNumber: 1, extractedText: "Valid text" },
					{ pageNumber: 2, extractedText: "" }, // Empty text
				]),
			);

			const { createClientWithUserKey } = await import("@/lib/llm/factory");
			(createClientWithUserKey as Mock).mockResolvedValue({
				uploadFile: mockUploadFile,
				generateWithFiles: mockGenerateWithFiles,
			});

			const request = new NextRequest("http://localhost/api/batch/pdf/ocr", {
				method: "POST",
				body: JSON.stringify({ imagePages }),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.extractedText).toHaveLength(1);
			expect(data.extractedText[0].text).toBe("Valid text");
		});

		it("should return 503 if file upload is not supported", async () => {
			const imagePages = [
				{ pageNumber: 1, imageBlob: "data:image/png;base64,test" },
			];

			const { createClientWithUserKey } = await import("@/lib/llm/factory");
			(createClientWithUserKey as Mock).mockResolvedValue({
				uploadFile: undefined,
				generateWithFiles: undefined,
			});

			const request = new NextRequest("http://localhost/api/batch/pdf/ocr", {
				method: "POST",
				body: JSON.stringify({ imagePages }),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(503);
			expect(data.error).toBe("Service unavailable");
		});

		it("should handle processing errors gracefully", async () => {
			const imagePages = [
				{ pageNumber: 1, imageBlob: "data:image/png;base64,test" },
			];

			const { createClientWithUserKey } = await import("@/lib/llm/factory");
			(createClientWithUserKey as Mock).mockResolvedValue({
				uploadFile: vi.fn().mockRejectedValue(new Error("Upload failed")),
				generateWithFiles: vi.fn(),
			});

			const request = new NextRequest("http://localhost/api/batch/pdf/ocr", {
				method: "POST",
				body: JSON.stringify({ imagePages }),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(500);
			expect(data.error).toBe("Internal server error");
		});
	});

	describe("Processing Time", () => {
		beforeEach(async () => {
			mockSupabase.auth.getUser.mockResolvedValue({
				data: { user: { id: "test-user-id" } },
				error: null,
			});

			const { getGeminiQuotaManager } = await import(
				"@/lib/utils/geminiQuotaManager"
			);
			vi.mocked(getGeminiQuotaManager).mockReturnValue({
				validatePdfProcessing: vi.fn().mockReturnValue({
					canProcess: true,
					message: "OK",
				}),
			} as any);
		});

		it("should include processingTimeMs in response", async () => {
			const imagePages = [
				{ pageNumber: 1, imageBlob: "data:image/png;base64,test" },
			];

			const mockUploadFile = vi.fn().mockResolvedValue({
				uri: "test-uri",
				mimeType: "image/png",
			});

			const mockGenerateWithFiles = vi
				.fn()
				.mockResolvedValue(
					JSON.stringify([{ pageNumber: 1, extractedText: "Test" }]),
				);

			const { createClientWithUserKey } = await import("@/lib/llm/factory");
			(createClientWithUserKey as Mock).mockResolvedValue({
				uploadFile: mockUploadFile,
				generateWithFiles: mockGenerateWithFiles,
			});

			const request = new NextRequest("http://localhost/api/batch/pdf/ocr", {
				method: "POST",
				body: JSON.stringify({ imagePages }),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.processingTimeMs).toBeDefined();
			expect(typeof data.processingTimeMs).toBe("number");
			expect(data.processingTimeMs).toBeGreaterThanOrEqual(0);
		});
	});
});
