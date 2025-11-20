/**
 * /api/batch/pdf/dual-ocr API Route Tests
 * 
 * Tests for the dual PDF batch OCR API endpoint
 * 
 * Related Files:
 * - Implementation: app/api/batch/pdf/dual-ocr/route.ts
 * - Original Server Action: app/_actions/pdfBatchOcr.ts (processDualPdfBatchOcr)
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

describe("POST /api/batch/pdf/dual-ocr", () => {
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

			const request = new NextRequest("http://localhost/api/batch/pdf/dual-ocr", {
				method: "POST",
				body: JSON.stringify({
					questionPages: [],
					answerPages: [],
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

		it("should return 400 if questionPages is missing", async () => {
			const request = new NextRequest("http://localhost/api/batch/pdf/dual-ocr", {
				method: "POST",
				body: JSON.stringify({
					answerPages: [],
				}),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("Bad request");
			expect(data.message).toContain("questionPages");
		});

		it("should return 400 if answerPages is missing", async () => {
			const request = new NextRequest("http://localhost/api/batch/pdf/dual-ocr", {
				method: "POST",
				body: JSON.stringify({
					questionPages: [],
				}),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("Bad request");
			expect(data.message).toContain("answerPages");
		});

		it("should return 400 if questionPages is empty", async () => {
			const request = new NextRequest("http://localhost/api/batch/pdf/dual-ocr", {
				method: "POST",
				body: JSON.stringify({
					questionPages: [],
					answerPages: [
						{ pageNumber: 1, imageBlob: "data:image/png;base64,test" },
					],
				}),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("Bad request");
			expect(data.message).toContain("問題ページ");
		});

		it("should return 400 if pages exceed limit", async () => {
			const questionPages = Array.from({ length: 51 }, (_, i) => ({
				pageNumber: i + 1,
				imageBlob: "data:image/png;base64,test",
			}));

			const request = new NextRequest("http://localhost/api/batch/pdf/dual-ocr", {
				method: "POST",
				body: JSON.stringify({
					questionPages,
					answerPages: [],
				}),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("Bad request");
			expect(data.message).toContain("50");
		});
	});

	describe("Dual PDF OCR Processing", () => {
		beforeEach(() => {
			mockSupabase.auth.getUser.mockResolvedValue({
				data: { user: { id: "test-user-id" } },
				error: null,
			});
		});

		it("should successfully process dual PDF OCR", async () => {
			const questionPages = [
				{ pageNumber: 1, imageBlob: "data:image/png;base64,test" },
			];

			const answerPages = [
				{ pageNumber: 1, imageBlob: "data:image/png;base64,test" },
			];

			const mockUploadFile = jest.fn().mockResolvedValue({
				uri: "test-uri",
				mimeType: "image/png",
			});

			const mockGenerateWithFiles = jest.fn().mockResolvedValue(
				JSON.stringify([
					{
						pageNumber: 1,
						questionText: "問題文",
						answerText: "解答",
						explanationText: "解説",
					},
				])
			);

			const { createClientWithUserKey } = require("@/lib/llm/factory");
			createClientWithUserKey.mockResolvedValue({
				uploadFile: mockUploadFile,
				generateWithFiles: mockGenerateWithFiles,
			});

			const request = new NextRequest("http://localhost/api/batch/pdf/dual-ocr", {
				method: "POST",
				body: JSON.stringify({ questionPages, answerPages }),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.extractedText).toHaveLength(1);
			expect(data.extractedText[0].questionText).toBe("問題文");
			expect(data.extractedText[0].answerText).toBe("解答");
			expect(data.extractedText[0].explanationText).toBe("解説");
		});

		it("should handle JSON extraction from code fence", async () => {
			const questionPages = [
				{ pageNumber: 1, imageBlob: "data:image/png;base64,test" },
			];

			const answerPages = [
				{ pageNumber: 1, imageBlob: "data:image/png;base64,test" },
			];

			const mockUploadFile = jest.fn().mockResolvedValue({
				uri: "test-uri",
				mimeType: "image/png",
			});

			const mockGenerateWithFiles = jest.fn().mockResolvedValue(
				'```json\n[{"pageNumber": 1, "questionText": "Q", "answerText": "A", "explanationText": "E"}]\n```'
			);

			const { createClientWithUserKey } = require("@/lib/llm/factory");
			createClientWithUserKey.mockResolvedValue({
				uploadFile: mockUploadFile,
				generateWithFiles: mockGenerateWithFiles,
			});

			const request = new NextRequest("http://localhost/api/batch/pdf/dual-ocr", {
				method: "POST",
				body: JSON.stringify({ questionPages, answerPages }),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.extractedText[0].questionText).toBe("Q");
		});

		it("should handle multiple code fences and select longest", async () => {
			const questionPages = [
				{ pageNumber: 1, imageBlob: "data:image/png;base64,test" },
			];

			const answerPages = [
				{ pageNumber: 1, imageBlob: "data:image/png;base64,test" },
			];

			const mockUploadFile = jest.fn().mockResolvedValue({
				uri: "test-uri",
				mimeType: "image/png",
			});

			const mockGenerateWithFiles = jest.fn().mockResolvedValue(
				'```json\n[{"pageNumber": 1, "questionText": "Short"}]\n```\n```json\n[{"pageNumber": 1, "questionText": "Longer question text", "answerText": "A", "explanationText": "E"}]\n```'
			);

			const { createClientWithUserKey } = require("@/lib/llm/factory");
			createClientWithUserKey.mockResolvedValue({
				uploadFile: mockUploadFile,
				generateWithFiles: mockGenerateWithFiles,
			});

			const request = new NextRequest("http://localhost/api/batch/pdf/dual-ocr", {
				method: "POST",
				body: JSON.stringify({ questionPages, answerPages }),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.extractedText[0].questionText).toBe("Longer question text");
		});

		it("should filter out empty questions", async () => {
			const questionPages = [
				{ pageNumber: 1, imageBlob: "data:image/png;base64,test" },
				{ pageNumber: 2, imageBlob: "data:image/png;base64,test" },
			];

			const answerPages = [
				{ pageNumber: 1, imageBlob: "data:image/png;base64,test" },
				{ pageNumber: 2, imageBlob: "data:image/png;base64,test" },
			];

			const mockUploadFile = jest.fn().mockResolvedValue({
				uri: "test-uri",
				mimeType: "image/png",
			});

			const mockGenerateWithFiles = jest.fn().mockResolvedValue(
				JSON.stringify([
					{
						pageNumber: 1,
						questionText: "Valid question",
						answerText: "A",
						explanationText: "E",
					},
					{
						pageNumber: 2,
						questionText: "", // Empty
						answerText: "A2",
						explanationText: "E2",
					},
				])
			);

			const { createClientWithUserKey } = require("@/lib/llm/factory");
			createClientWithUserKey.mockResolvedValue({
				uploadFile: mockUploadFile,
				generateWithFiles: mockGenerateWithFiles,
			});

			const request = new NextRequest("http://localhost/api/batch/pdf/dual-ocr", {
				method: "POST",
				body: JSON.stringify({ questionPages, answerPages }),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.extractedText).toHaveLength(1);
			expect(data.extractedText[0].questionText).toBe("Valid question");
		});

		it("should handle JSON parse errors gracefully", async () => {
			const questionPages = [
				{ pageNumber: 1, imageBlob: "data:image/png;base64,test" },
			];

			const answerPages = [
				{ pageNumber: 1, imageBlob: "data:image/png;base64,test" },
			];

			const mockUploadFile = jest.fn().mockResolvedValue({
				uri: "test-uri",
				mimeType: "image/png",
			});

			const mockGenerateWithFiles = jest.fn().mockResolvedValue(
				"Invalid JSON response"
			);

			const { createClientWithUserKey } = require("@/lib/llm/factory");
			createClientWithUserKey.mockResolvedValue({
				uploadFile: mockUploadFile,
				generateWithFiles: mockGenerateWithFiles,
			});

			const request = new NextRequest("http://localhost/api/batch/pdf/dual-ocr", {
				method: "POST",
				body: JSON.stringify({ questionPages, answerPages }),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.extractedText).toEqual([]);
		});

		it("should return 503 if file upload is not supported", async () => {
			const questionPages = [
				{ pageNumber: 1, imageBlob: "data:image/png;base64,test" },
			];

			const answerPages = [
				{ pageNumber: 1, imageBlob: "data:image/png;base64,test" },
			];

			const { createClientWithUserKey } = require("@/lib/llm/factory");
			createClientWithUserKey.mockResolvedValue({
				uploadFile: undefined,
				generateWithFiles: undefined,
			});

			const request = new NextRequest("http://localhost/api/batch/pdf/dual-ocr", {
				method: "POST",
				body: JSON.stringify({ questionPages, answerPages }),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(503);
			expect(data.error).toBe("Service unavailable");
		});
	});

	describe("Processing Time", () => {
		beforeEach(() => {
			mockSupabase.auth.getUser.mockResolvedValue({
				data: { user: { id: "test-user-id" } },
				error: null,
			});
		});

		it("should include processingTimeMs in response", async () => {
			const questionPages = [
				{ pageNumber: 1, imageBlob: "data:image/png;base64,test" },
			];

			const answerPages = [
				{ pageNumber: 1, imageBlob: "data:image/png;base64,test" },
			];

			const mockUploadFile = jest.fn().mockResolvedValue({
				uri: "test-uri",
				mimeType: "image/png",
			});

			const mockGenerateWithFiles = jest.fn().mockResolvedValue(
				JSON.stringify([
					{
						pageNumber: 1,
						questionText: "Q",
						answerText: "A",
						explanationText: "E",
					},
				])
			);

			const { createClientWithUserKey } = require("@/lib/llm/factory");
			createClientWithUserKey.mockResolvedValue({
				uploadFile: mockUploadFile,
				generateWithFiles: mockGenerateWithFiles,
			});

			const request = new NextRequest("http://localhost/api/batch/pdf/dual-ocr", {
				method: "POST",
				body: JSON.stringify({ questionPages, answerPages }),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.processingTimeMs).toBeDefined();
			expect(typeof data.processingTimeMs).toBe("number");
			expect(data.processingTimeMs).toBeGreaterThan(0);
		});
	});
});
