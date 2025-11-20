/**
 * /api/batch/pdf/ocr API Route Tests
 * 
 * Tests for the PDF batch OCR API endpoint
 * 
 * Related Files:
 * - Implementation: app/api/batch/pdf/ocr/route.ts
 * - Original Server Action: app/_actions/pdfBatchOcr.ts (processPdfBatchOcr)
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

describe("POST /api/batch/pdf/ocr", () => {
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
		beforeEach(() => {
			mockSupabase.auth.getUser.mockResolvedValue({
				data: { user: { id: "test-user-id" } },
				error: null,
			});
		});

		it("should successfully process PDF batch OCR", async () => {
			const imagePages = [
				{ pageNumber: 1, imageBlob: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg" },
				{ pageNumber: 2, imageBlob: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg" },
			];

			const mockUploadFile = jest.fn().mockResolvedValue({
				uri: "test-uri",
				mimeType: "image/png",
			});

			const mockGenerateWithFiles = jest.fn().mockResolvedValue(
				JSON.stringify([
					{ pageNumber: 1, extractedText: "Text from page 1" },
					{ pageNumber: 2, extractedText: "Text from page 2" },
				])
			);

			const { createClientWithUserKey } = require("@/lib/llm/factory");
			createClientWithUserKey.mockResolvedValue({
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

			const mockUploadFile = jest.fn().mockResolvedValue({
				uri: "test-uri",
				mimeType: "image/png",
			});

			const mockGenerateWithFiles = jest.fn().mockResolvedValue(
				'```json\n[{"pageNumber": 1, "extractedText": "Test text"}]\n```'
			);

			const { createClientWithUserKey } = require("@/lib/llm/factory");
			createClientWithUserKey.mockResolvedValue({
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

			const mockUploadFile = jest.fn().mockResolvedValue({
				uri: "test-uri",
				mimeType: "image/png",
			});

			const mockGenerateWithFiles = jest.fn().mockResolvedValue(
				JSON.stringify([
					{ pageNumber: 1, extractedText: "Valid text" },
					{ pageNumber: 2, extractedText: "" }, // Empty text
				])
			);

			const { createClientWithUserKey } = require("@/lib/llm/factory");
			createClientWithUserKey.mockResolvedValue({
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

			const { createClientWithUserKey } = require("@/lib/llm/factory");
			createClientWithUserKey.mockResolvedValue({
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

			const { createClientWithUserKey } = require("@/lib/llm/factory");
			createClientWithUserKey.mockResolvedValue({
				uploadFile: jest.fn().mockRejectedValue(new Error("Upload failed")),
				generateWithFiles: jest.fn(),
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
		beforeEach(() => {
			mockSupabase.auth.getUser.mockResolvedValue({
				data: { user: { id: "test-user-id" } },
				error: null,
			});
		});

		it("should include processingTimeMs in response", async () => {
			const imagePages = [
				{ pageNumber: 1, imageBlob: "data:image/png;base64,test" },
			];

			const mockUploadFile = jest.fn().mockResolvedValue({
				uri: "test-uri",
				mimeType: "image/png",
			});

			const mockGenerateWithFiles = jest.fn().mockResolvedValue(
				JSON.stringify([{ pageNumber: 1, extractedText: "Test" }])
			);

			const { createClientWithUserKey } = require("@/lib/llm/factory");
			createClientWithUserKey.mockResolvedValue({
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
			expect(data.processingTimeMs).toBeGreaterThan(0);
		});
	});
});
