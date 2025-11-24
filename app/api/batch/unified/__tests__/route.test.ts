/**
 * /api/batch/unified API Route Tests
 *
 * Tests for the unified batch processing API endpoint
 *
 * Related Files:
 * - Implementation: app/api/batch/unified/route.ts
 */

import { NextRequest, type NextResponse } from "next/server";
import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { POST } from "../route";

// Mock Supabase
vi.mock("@/lib/supabase/server");

// Mock fetch
global.fetch = vi.fn();

// Mock LLM factory
vi.mock("@/lib/llm/factory", () => ({
	createClientWithUserKey: vi.fn().mockResolvedValue({
		uploadFile: vi.fn().mockResolvedValue({
			uri: "test-uri",
			mimeType: "image/png",
		}),
		generateWithFiles: vi.fn().mockResolvedValue(
			JSON.stringify([
				{
					audioIndex: 1,
					transcript: "test transcript",
					language: "ja",
					confidence: 0.9,
				},
			]),
		),
	}),
}));

// Mock Supabase storage
const _mockSupabaseStorage = {
	from: vi.fn(() => ({
		upload: vi.fn().mockResolvedValue({ error: null }),
		createSignedUrl: vi.fn().mockResolvedValue({
			data: { signedUrl: "https://example.com/signed-url" },
			error: null,
		}),
		remove: vi.fn().mockResolvedValue({ error: null }),
	})),
};

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
		recordRequest: vi.fn(),
		waitForRateLimit: vi.fn().mockResolvedValue(undefined),
	})),
	executeWithQuotaCheck: vi.fn((fn) => fn()),
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
	const mockSupabaseStorage = {
		from: vi.fn(() => ({
			upload: vi.fn().mockResolvedValue({ error: null }),
			createSignedUrl: vi.fn().mockResolvedValue({
				data: { signedUrl: "https://example.com/signed-url" },
				error: null,
			}),
			remove: vi.fn().mockResolvedValue({ error: null }),
		})),
	};

	const mockSupabase = {
		auth: {
			getUser: vi.fn(),
		},
		storage: mockSupabaseStorage,
	};

	beforeEach(() => {
		vi.clearAllMocks();
		(createClient as Mock).mockResolvedValue(mockSupabase);
		vi.mocked(global.fetch).mockResolvedValue({
			ok: true,
			blob: vi
				.fn()
				.mockResolvedValue(new Blob(["test"], { type: "image/png" })),
			arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
			headers: {
				get: vi.fn().mockReturnValue("image/png"),
			},
		} as unknown as Response);
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

			const response = (await POST(request)) as NextResponse;
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

			const response = (await POST(request)) as NextResponse;
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

			const response = (await POST(request)) as NextResponse;
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

			const response = (await POST(request)) as NextResponse;
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

			const response = (await POST(request)) as NextResponse;
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

			const response = (await POST(request)) as NextResponse;
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

			const response = (await POST(request)) as NextResponse;
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
			const { createClientWithUserKey } = await import("@/lib/llm/factory");
			vi.mocked(createClientWithUserKey).mockResolvedValue({
				generate: vi.fn().mockResolvedValue("test"),
				generateStream: async function* () {
					yield "test";
				},
				uploadFile: vi.fn().mockResolvedValue({
					uri: "test-uri",
					mimeType: "image/png",
				}),
				generateWithFiles: vi.fn().mockResolvedValue(
					JSON.stringify([
						{
							pageNumber: 1,
							extractedText: "test extracted text",
						},
					]),
				),
			} as never);

			const request = new NextRequest("http://localhost/api/batch/unified", {
				method: "POST",
				body: JSON.stringify({
					batchType: "multi-file",
					files: [
						{
							fileId: "file-1",
							fileName: "test.png",
							fileType: "image",
							fileBlob:
								"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
						},
					],
				}),
			});

			const response = (await POST(request)) as NextResponse;
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.batchType).toBe("multi-file");
		});

		it("should process audio-batch", async () => {
			const { createClientWithUserKey } = await import("@/lib/llm/factory");
			vi.mocked(createClientWithUserKey).mockResolvedValue({
				generate: vi.fn().mockResolvedValue("test"),
				generateStream: async function* () {
					yield "test";
				},
				uploadFile: vi.fn().mockResolvedValue({
					uri: "test-uri",
					mimeType: "audio/mp3",
				}),
				generateWithFiles: vi.fn().mockResolvedValue(
					JSON.stringify([
						{
							audioIndex: 1,
							transcript: "test transcript",
							language: "ja",
							confidence: 0.9,
						},
					]),
				),
			} as never);

			// Mock fetch for audio file download in processBatchAudioTranscription
			vi.mocked(global.fetch).mockResolvedValue({
				ok: true,
				blob: vi
					.fn()
					.mockResolvedValue(new Blob(["test"], { type: "audio/mp3" })),
				arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
				headers: {
					get: vi.fn().mockReturnValue("audio/mp3"),
				},
			} as unknown as Response);

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

			const response = (await POST(request)) as NextResponse;
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.batchType).toBe("audio-batch");
		});

		it("should process image-batch", async () => {
			const { createClientWithUserKey } = await import("@/lib/llm/factory");
			vi.mocked(createClientWithUserKey).mockResolvedValue({
				generate: vi.fn().mockResolvedValue("test"),
				generateStream: async function* () {
					yield "test";
				},
				uploadFile: vi.fn().mockResolvedValue({
					uri: "test-uri",
					mimeType: "image/png",
				}),
				generateWithFiles: vi.fn().mockResolvedValue(
					JSON.stringify([
						{
							pageNumber: 1,
							extractedText: "test extracted text",
						},
					]),
				),
			} as never);

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

			const response = (await POST(request)) as NextResponse;
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.batchType).toBe("image-batch");
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
			// Mock storage upload to fail
			mockSupabaseStorage.from = vi.fn(() => ({
				upload: vi.fn().mockResolvedValue({
					error: new Error("Upload failed"),
				}),
				createSignedUrl: vi.fn(),
				remove: vi.fn(),
			}));

			const request = new NextRequest("http://localhost/api/batch/unified", {
				method: "POST",
				body: JSON.stringify({
					batchType: "multi-file",
					files: [
						{
							fileId: "file-1",
							fileName: "test.png",
							fileType: "image",
							fileBlob:
								"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
						},
					],
				}),
			});

			const response = (await POST(request)) as NextResponse;
			const data = await response.json();

			// Should return 200 with success: false in result
			expect(response.status).toBe(200);
			expect(data.multiFileResult).toBeDefined();
			expect(data.multiFileResult.processedFiles).toHaveLength(1);
			expect(data.multiFileResult.processedFiles[0].success).toBe(false);
		});
	});
});
