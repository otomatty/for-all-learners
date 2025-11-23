/**
 * /api/batch/unified API Route Tests
 *
 * Tests for the unified batch processing API endpoint
 *
 * Related Files:
 * - Implementation: app/api/batch/unified/route.ts
 * - Original Server Action: app/_actions/unifiedBatchProcessor.ts
 */

import { NextRequest } from "next/server";
import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { POST } from "../route";

// Mock Supabase
vi.mock("@/lib/supabase/server");

// Mock Server Actions
vi.mock("@/app/_actions/audioBatchProcessing", () => ({
	processAudioFilesBatch: vi.fn(),
}));

vi.mock("@/app/_actions/multiFileBatchProcessing", () => ({
	processMultiFilesBatch: vi.fn(),
}));

vi.mock("@/app/_actions/transcribeImageBatch", () => ({
	transcribeImagesBatch: vi.fn(),
}));

// Mock Gemini Quota Manager
vi.mock("@/lib/utils/geminiQuotaManager", () => ({
	getGeminiQuotaManager: vi.fn(() => ({
		getQuotaStatus: vi.fn(() => ({
			remaining: 100,
			used: 0,
			limit: 100,
		})),
		checkQuota: vi.fn(() => ({
			canProceed: true,
			reason: "",
		})),
	})),
}));

// Mock Blob Utils
vi.mock("@/lib/utils/blobUtils", () => ({
	base64ToBlob: vi.fn((base64: string, mimeType: string) => {
		const base64Data = base64.split(",")[1] || base64;
		const binaryString = Buffer.from(base64Data, "base64");
		return new Blob([binaryString], { type: mimeType });
	}),
	getMimeTypeForFileType: vi.fn((fileType: string) => {
		const mimeTypes: Record<string, string> = {
			pdf: "application/pdf",
			image: "image/png",
			audio: "audio/mp3",
		};
		return mimeTypes[fileType] || "application/octet-stream";
	}),
}));

describe("POST /api/batch/unified", () => {
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

			const request = new NextRequest("http://localhost/api/batch/unified", {
				method: "POST",
				body: JSON.stringify({
					batchType: "image-batch",
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

		it("should return 400 if batchType is missing", async () => {
			const request = new NextRequest("http://localhost/api/batch/unified", {
				method: "POST",
				body: JSON.stringify({}),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("Bad request");
		});

		it("should return 400 if batchType is invalid", async () => {
			const request = new NextRequest("http://localhost/api/batch/unified", {
				method: "POST",
				body: JSON.stringify({
					batchType: "invalid-type",
				}),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("Bad request");
		});

		it("should return 400 if files array is missing for multi-file type", async () => {
			const request = new NextRequest("http://localhost/api/batch/unified", {
				method: "POST",
				body: JSON.stringify({
					batchType: "multi-file",
				}),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("Bad request");
			expect(data.message).toContain("files");
		});

		it("should return 400 if audioFiles array is missing for audio-batch type", async () => {
			const request = new NextRequest("http://localhost/api/batch/unified", {
				method: "POST",
				body: JSON.stringify({
					batchType: "audio-batch",
				}),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("Bad request");
			expect(data.message).toContain("audioFiles");
		});

		it("should return 400 if pages array is missing for image-batch type", async () => {
			const request = new NextRequest("http://localhost/api/batch/unified", {
				method: "POST",
				body: JSON.stringify({
					batchType: "image-batch",
				}),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("Bad request");
			expect(data.message).toContain("pages");
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
			const { getGeminiQuotaManager } = await import(
				"@/lib/utils/geminiQuotaManager"
			);
			const mockCheckQuota = vi.fn().mockReturnValue({
				canProceed: false,
				reason: "Quota exceeded",
			});

			(getGeminiQuotaManager as Mock).mockReturnValue({
				getQuotaStatus: vi.fn(() => ({
					remaining: 0,
					used: 100,
					limit: 100,
				})),
				checkQuota: mockCheckQuota,
			});

			const request = new NextRequest("http://localhost/api/batch/unified", {
				method: "POST",
				body: JSON.stringify({
					batchType: "audio-batch",
					audioFiles: [
						{
							audioId: "audio-1",
							audioName: "test.mp3",
							audioBlob: "data:audio/mp3;base64,dGVzdA==",
						},
					],
				}),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(429);
			expect(data.error).toBe("Too Many Requests");
			expect(mockCheckQuota).toHaveBeenCalled();
		});
	});

	describe("Batch Processing", () => {
		beforeEach(async () => {
			mockSupabase.auth.getUser.mockResolvedValue({
				data: { user: { id: "test-user-id" } },
				error: null,
			});

			const { getGeminiQuotaManager } = await import(
				"@/lib/utils/geminiQuotaManager"
			);
			(getGeminiQuotaManager as Mock).mockReturnValue({
				getQuotaStatus: vi.fn(() => ({
					remaining: 100,
					used: 0,
					limit: 100,
				})),
				checkQuota: vi.fn(() => ({
					canProceed: true,
					reason: "",
				})),
			});
		});

		it("should process multi-file batch", async () => {
			const { processMultiFilesBatch } = await import(
				"@/app/_actions/multiFileBatchProcessing"
			);
			(processMultiFilesBatch as Mock).mockResolvedValue({
				success: true,
				message: "Processed successfully",
				processedFiles: [],
				totalCards: 0,
				totalProcessingTimeMs: 1000,
				apiRequestsUsed: 1,
			});

			const request = new NextRequest("http://localhost/api/batch/unified", {
				method: "POST",
				body: JSON.stringify({
					batchType: "multi-file",
					files: [
						{
							fileId: "file-1",
							fileName: "test.pdf",
							fileType: "pdf",
							fileBlob: "data:application/pdf;base64,dGVzdA==",
						},
					],
				}),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.batchType).toBe("multi-file");
			expect(processMultiFilesBatch).toHaveBeenCalled();
		});

		it("should process audio-batch", async () => {
			const { processAudioFilesBatch } = await import(
				"@/app/_actions/audioBatchProcessing"
			);
			(processAudioFilesBatch as Mock).mockResolvedValue({
				success: true,
				message: "Processed successfully",
				transcriptions: [],
				totalCards: 0,
				totalProcessingTimeMs: 1000,
				apiRequestsUsed: 1,
			});

			const request = new NextRequest("http://localhost/api/batch/unified", {
				method: "POST",
				body: JSON.stringify({
					batchType: "audio-batch",
					audioFiles: [
						{
							audioId: "audio-1",
							audioName: "test.mp3",
							audioBlob: "data:audio/mp3;base64,dGVzdA==",
						},
					],
				}),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.batchType).toBe("audio-batch");
			expect(processAudioFilesBatch).toHaveBeenCalled();
		});

		it("should process image-batch", async () => {
			const { transcribeImagesBatch } = await import(
				"@/app/_actions/transcribeImageBatch"
			);
			(transcribeImagesBatch as Mock).mockResolvedValue({
				success: true,
				message: "Processed successfully",
				extractedPages: [],
			});

			const request = new NextRequest("http://localhost/api/batch/unified", {
				method: "POST",
				body: JSON.stringify({
					batchType: "image-batch",
					pages: [
						{
							pageNumber: 1,
							imageUrl: "https://example.com/image.png",
						},
					],
				}),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.batchType).toBe("image-batch");
			expect(transcribeImagesBatch).toHaveBeenCalled();
		});
	});

	describe("Error Handling", () => {
		beforeEach(() => {
			mockSupabase.auth.getUser.mockResolvedValue({
				data: { user: { id: "test-user-id" } },
				error: null,
			});
		});

		it("should handle processing errors gracefully", async () => {
			const { processMultiFilesBatch } = await import(
				"@/app/_actions/multiFileBatchProcessing"
			);
			(processMultiFilesBatch as Mock).mockRejectedValue(
				new Error("Processing failed"),
			);

			const request = new NextRequest("http://localhost/api/batch/unified", {
				method: "POST",
				body: JSON.stringify({
					batchType: "multi-file",
					files: [
						{
							fileId: "file-1",
							fileName: "test.pdf",
							fileType: "pdf",
							fileBlob: "data:application/pdf;base64,dGVzdA==",
						},
					],
				}),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(500);
			expect(data.success).toBe(false);
			expect(data.message).toContain("エラー");
		});
	});
});
