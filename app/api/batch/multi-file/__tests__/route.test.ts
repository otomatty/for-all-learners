/**
 * /api/batch/multi-file API Route Tests
 *
 * Tests for the multi-file batch processing API endpoint
 *
 * Related Files:
 * - Implementation: app/api/batch/multi-file/route.ts
 */

import { NextRequest } from "next/server";
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
		generateWithFiles: vi.fn().mockResolvedValue("test result"),
	}),
}));

// Mock Supabase storage
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

describe("POST /api/batch/multi-file", () => {
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
			arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
			blob: vi
				.fn()
				.mockResolvedValue(new Blob(["test"], { type: "image/png" })),
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

		it("should process image files successfully", async () => {
			const request = new NextRequest("http://localhost/api/batch/multi-file", {
				method: "POST",
				body: JSON.stringify({
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

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.processedFiles).toHaveLength(1);
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
			mockSupabase.storage.from = vi.fn(() => ({
				upload: vi.fn().mockResolvedValue({
					error: new Error("Upload failed"),
				}),
				createSignedUrl: vi.fn(),
				remove: vi.fn(),
			}));

			const request = new NextRequest("http://localhost/api/batch/multi-file", {
				method: "POST",
				body: JSON.stringify({
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

			const response = await POST(request);
			const data = await response.json();

			// Should return 200 with success: false in processedFiles
			expect(response.status).toBe(200);
			expect(data.processedFiles).toHaveLength(1);
			expect(data.processedFiles[0].success).toBe(false);
		});
	});
});
