/**
 * /api/batch/multi-file API Route Tests
 *
 * Tests for the multi-file batch processing API endpoint
 *
 * Related Files:
 * - Implementation: app/api/batch/multi-file/route.ts
 * - Original Server Action: app/_actions/multiFileBatchProcessing.ts
 */

import { NextRequest } from "next/server";
import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { POST } from "../route";

// Mock Supabase
vi.mock("@/lib/supabase/server");

// Mock Server Actions
vi.mock("@/app/_actions/multiFileBatchProcessing", () => ({
	processMultiFilesBatch: vi.fn(),
}));

describe("POST /api/batch/multi-file", () => {
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

			const request = new NextRequest("http://localhost/api/batch/multi-file", {
				method: "POST",
				body: JSON.stringify({
					files: [],
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

		it("should return 400 if files array is missing", async () => {
			const request = new NextRequest("http://localhost/api/batch/multi-file", {
				method: "POST",
				body: JSON.stringify({}),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("Bad request");
			expect(data.message).toContain("files");
		});

		it("should return 400 if files array is empty", async () => {
			const request = new NextRequest("http://localhost/api/batch/multi-file", {
				method: "POST",
				body: JSON.stringify({
					files: [],
				}),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("Bad request");
			expect(data.message).toContain("少なくとも1つ");
		});

		it("should return 400 if files array is too large", async () => {
			const files = Array.from({ length: 51 }, (_, i) => ({
				fileId: `file-${i}`,
				fileName: `file-${i}.pdf`,
				fileType: "pdf" as const,
				fileBlob: "data:application/pdf;base64,dGVzdA==",
			}));

			const request = new NextRequest("http://localhost/api/batch/multi-file", {
				method: "POST",
				body: JSON.stringify({ files }),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("Bad request");
			expect(data.message).toContain("50");
		});

		it("should return 400 if file structure is invalid", async () => {
			const request = new NextRequest("http://localhost/api/batch/multi-file", {
				method: "POST",
				body: JSON.stringify({
					files: [
						{
							fileId: "file-1",
							// Missing required fields
						},
					],
				}),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("Bad request");
		});
	});

	describe("Batch Processing", () => {
		beforeEach(() => {
			mockSupabase.auth.getUser.mockResolvedValue({
				data: { user: { id: "test-user-id" } },
				error: null,
			});
		});

		it("should process files successfully", async () => {
			const { processMultiFilesBatch } = await import(
				"@/app/_actions/multiFileBatchProcessing"
			);
			(processMultiFilesBatch as Mock).mockResolvedValue({
				success: true,
				message: "Processed successfully",
				processedFiles: [
					{
						fileId: "file-1",
						fileName: "test.pdf",
						success: true,
						cards: [],
						extractedText: [],
						processingTimeMs: 1000,
					},
				],
				totalCards: 0,
				totalProcessingTimeMs: 1000,
				apiRequestsUsed: 1,
			});

			const request = new NextRequest("http://localhost/api/batch/multi-file", {
				method: "POST",
				body: JSON.stringify({
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
			expect(data.processedFiles).toHaveLength(1);
			expect(processMultiFilesBatch).toHaveBeenCalled();
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

			const request = new NextRequest("http://localhost/api/batch/multi-file", {
				method: "POST",
				body: JSON.stringify({
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
			expect(data.error).toBe("Internal server error");
		});
	});
});
