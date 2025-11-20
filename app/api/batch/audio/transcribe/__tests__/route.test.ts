/**
 * /api/batch/audio/transcribe API Route Tests
 * 
 * Tests for the audio batch transcription API endpoint
 * 
 * Related Files:
 * - Implementation: app/api/batch/audio/transcribe/route.ts
 * - Original Server Action: app/_actions/audioBatchProcessing.ts
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
		checkQuota: jest.fn(() => ({
			canProceed: true,
			reason: "",
		})),
	})),
	executeWithQuotaCheck: jest.fn((fn) => fn()),
}));

describe("POST /api/batch/audio/transcribe", () => {
	const mockSupabase = {
		auth: {
			getUser: jest.fn(),
		},
		storage: {
			from: jest.fn(),
		},
	};

	const mockStorage = {
		upload: jest.fn(),
		createSignedUrl: jest.fn(),
		remove: jest.fn(),
	};

	beforeEach(() => {
		jest.clearAllMocks();
		(createClient as jest.Mock).mockResolvedValue(mockSupabase);
		mockSupabase.storage.from.mockReturnValue(mockStorage);
	});

	describe("Authentication", () => {
		it("should return 401 if user is not authenticated", async () => {
			mockSupabase.auth.getUser.mockResolvedValue({
				data: { user: null },
				error: new Error("Not authenticated"),
			});

			const request = new NextRequest("http://localhost/api/batch/audio/transcribe", {
				method: "POST",
				body: JSON.stringify({
					audioFiles: [],
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

		it("should return 400 if audioFiles array is missing", async () => {
			const request = new NextRequest("http://localhost/api/batch/audio/transcribe", {
				method: "POST",
				body: JSON.stringify({}),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("Bad request");
			expect(data.message).toContain("audioFiles");
		});

		it("should return 400 if audioFiles array is empty", async () => {
			const request = new NextRequest("http://localhost/api/batch/audio/transcribe", {
				method: "POST",
				body: JSON.stringify({
					audioFiles: [],
				}),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("Bad request");
			expect(data.message).toContain("少なくとも1つ");
		});

		it("should return 400 if audioFiles array is too large", async () => {
			const audioFiles = Array.from({ length: 31 }, (_, i) => ({
				audioId: `audio-${i}`,
				audioName: `audio-${i}.mp3`,
				audioBlob: "data:audio/mp3;base64,test",
			}));

			const request = new NextRequest("http://localhost/api/batch/audio/transcribe", {
				method: "POST",
				body: JSON.stringify({ audioFiles }),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("Bad request");
			expect(data.message).toContain("30");
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
			const mockCheckQuota = jest.fn().mockReturnValue({
				canProceed: false,
				reason: "Quota exceeded",
			});

			getGeminiQuotaManager.mockReturnValue({
				checkQuota: mockCheckQuota,
			});

			const audioFiles = [
				{
					audioId: "audio-1",
					audioName: "audio-1.mp3",
					audioBlob: "data:audio/mp3;base64,test",
				},
			];

			const request = new NextRequest("http://localhost/api/batch/audio/transcribe", {
				method: "POST",
				body: JSON.stringify({ audioFiles }),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(429);
			expect(data.error).toBe("Too Many Requests");
			expect(mockCheckQuota).toHaveBeenCalled();
		});
	});

	describe("Audio Upload to Supabase", () => {
		beforeEach(() => {
			mockSupabase.auth.getUser.mockResolvedValue({
				data: { user: { id: "test-user-id" } },
				error: null,
			});
		});

		it("should upload audio files to Supabase Storage", async () => {
			mockStorage.upload.mockResolvedValue({
				error: null,
				data: { path: "test-path" },
			});

			mockStorage.createSignedUrl.mockResolvedValue({
				error: null,
				data: { signedUrl: "https://example.com/audio.mp3" },
			});

			mockStorage.remove.mockResolvedValue({ error: null });

			const mockUploadFile = jest.fn().mockResolvedValue({
				uri: "test-uri",
				mimeType: "audio/mp3",
			});

			const mockGenerateWithFiles = jest.fn().mockResolvedValue(
				JSON.stringify([
					{
						audioIndex: 1,
						transcript: "Test transcription",
						language: "ja",
						confidence: 0.9,
					},
				])
			);

			const { createClientWithUserKey } = require("@/lib/llm/factory");
			createClientWithUserKey.mockResolvedValue({
				uploadFile: mockUploadFile,
				generateWithFiles: mockGenerateWithFiles,
			});

			const audioFiles = [
				{
					audioId: "audio-1",
					audioName: "audio-1.mp3",
					audioBlob: "data:audio/mp3;base64,dGVzdA==",
				},
			];

			const request = new NextRequest("http://localhost/api/batch/audio/transcribe", {
				method: "POST",
				body: JSON.stringify({ audioFiles }),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(mockStorage.upload).toHaveBeenCalled();
			expect(mockStorage.createSignedUrl).toHaveBeenCalled();
			expect(mockStorage.remove).toHaveBeenCalled();
		});

		it("should handle upload failures", async () => {
			mockStorage.upload.mockResolvedValue({
				error: new Error("Upload failed"),
				data: null,
			});

			const audioFiles = [
				{
					audioId: "audio-1",
					audioName: "audio-1.mp3",
					audioBlob: "data:audio/mp3;base64,test",
				},
			];

			const request = new NextRequest("http://localhost/api/batch/audio/transcribe", {
				method: "POST",
				body: JSON.stringify({ audioFiles }),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(false);
			expect(data.message).toContain("アップロード");
		});
	});

	describe("Batch Transcription Processing", () => {
		beforeEach(() => {
			mockSupabase.auth.getUser.mockResolvedValue({
				data: { user: { id: "test-user-id" } },
				error: null,
			});

			mockStorage.upload.mockResolvedValue({
				error: null,
				data: { path: "test-path" },
			});

			mockStorage.createSignedUrl.mockResolvedValue({
				error: null,
				data: { signedUrl: "https://example.com/audio.mp3" },
			});

			mockStorage.remove.mockResolvedValue({ error: null });
		});

		it("should successfully transcribe audio files in batches", async () => {
			const mockUploadFile = jest.fn().mockResolvedValue({
				uri: "test-uri",
				mimeType: "audio/mp3",
			});

			const mockGenerateWithFiles = jest.fn().mockResolvedValue(
				JSON.stringify([
					{
						audioIndex: 1,
						transcript: "Transcription 1",
						language: "ja",
						confidence: 0.9,
					},
					{
						audioIndex: 2,
						transcript: "Transcription 2",
						language: "ja",
						confidence: 0.85,
					},
					{
						audioIndex: 3,
						transcript: "Transcription 3",
						language: "ja",
						confidence: 0.95,
					},
				])
			);

			global.fetch = jest.fn().mockResolvedValue({
				ok: true,
				blob: async () => new Blob(["test"], { type: "audio/mp3" }),
			});

			const { createClientWithUserKey } = require("@/lib/llm/factory");
			createClientWithUserKey.mockResolvedValue({
				uploadFile: mockUploadFile,
				generateWithFiles: mockGenerateWithFiles,
			});

			const audioFiles = [
				{
					audioId: "audio-1",
					audioName: "audio-1.mp3",
					audioBlob: "data:audio/mp3;base64,dGVzdA==",
				},
				{
					audioId: "audio-2",
					audioName: "audio-2.mp3",
					audioBlob: "data:audio/mp3;base64,dGVzdA==",
				},
				{
					audioId: "audio-3",
					audioName: "audio-3.mp3",
					audioBlob: "data:audio/mp3;base64,dGVzdA==",
				},
			];

			const request = new NextRequest("http://localhost/api/batch/audio/transcribe", {
				method: "POST",
				body: JSON.stringify({ audioFiles }),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.transcriptions).toHaveLength(3);
			expect(data.transcriptions[0].transcript).toBe("Transcription 1");
			expect(data.apiRequestsUsed).toBe(1); // 3 files in 1 batch
		});

		it("should process multiple batches with rate limiting", async () => {
			const mockUploadFile = jest.fn().mockResolvedValue({
				uri: "test-uri",
				mimeType: "audio/mp3",
			});

			const mockGenerateWithFiles = jest
				.fn()
				.mockResolvedValueOnce(
					JSON.stringify([
						{ audioIndex: 1, transcript: "T1", language: "ja", confidence: 0.9 },
						{ audioIndex: 2, transcript: "T2", language: "ja", confidence: 0.9 },
						{ audioIndex: 3, transcript: "T3", language: "ja", confidence: 0.9 },
					])
				)
				.mockResolvedValueOnce(
					JSON.stringify([
						{ audioIndex: 1, transcript: "T4", language: "ja", confidence: 0.9 },
					])
				);

			global.fetch = jest.fn().mockResolvedValue({
				ok: true,
				blob: async () => new Blob(["test"], { type: "audio/mp3" }),
			});

			const { createClientWithUserKey } = require("@/lib/llm/factory");
			createClientWithUserKey.mockResolvedValue({
				uploadFile: mockUploadFile,
				generateWithFiles: mockGenerateWithFiles,
			});

			// 4 audio files (2 batches: 3 + 1)
			const audioFiles = Array.from({ length: 4 }, (_, i) => ({
				audioId: `audio-${i + 1}`,
				audioName: `audio-${i + 1}.mp3`,
				audioBlob: "data:audio/mp3;base64,dGVzdA==",
			}));

			const request = new NextRequest("http://localhost/api/batch/audio/transcribe", {
				method: "POST",
				body: JSON.stringify({ audioFiles }),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.apiRequestsUsed).toBe(2); // 2 batches
		});

		it("should handle unclear audio ([不明瞭])", async () => {
			const mockUploadFile = jest.fn().mockResolvedValue({
				uri: "test-uri",
				mimeType: "audio/mp3",
			});

			const mockGenerateWithFiles = jest.fn().mockResolvedValue(
				JSON.stringify([
					{
						audioIndex: 1,
						transcript: "[不明瞭]",
						language: "ja",
						confidence: 0.1,
					},
				])
			);

			global.fetch = jest.fn().mockResolvedValue({
				ok: true,
				blob: async () => new Blob(["test"], { type: "audio/mp3" }),
			});

			const { createClientWithUserKey } = require("@/lib/llm/factory");
			createClientWithUserKey.mockResolvedValue({
				uploadFile: mockUploadFile,
				generateWithFiles: mockGenerateWithFiles,
			});

			const audioFiles = [
				{
					audioId: "audio-1",
					audioName: "audio-1.mp3",
					audioBlob: "data:audio/mp3;base64,dGVzdA==",
				},
			];

			const request = new NextRequest("http://localhost/api/batch/audio/transcribe", {
				method: "POST",
				body: JSON.stringify({ audioFiles }),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.transcriptions[0].success).toBe(false);
			expect(data.transcriptions[0].error).toContain("不明瞭");
		});
	});

	describe("Error Handling", () => {
		beforeEach(() => {
			mockSupabase.auth.getUser.mockResolvedValue({
				data: { user: { id: "test-user-id" } },
				error: null,
			});

			mockStorage.upload.mockResolvedValue({
				error: null,
				data: { path: "test-path" },
			});

			mockStorage.createSignedUrl.mockResolvedValue({
				error: null,
				data: { signedUrl: "https://example.com/audio.mp3" },
			});

			mockStorage.remove.mockResolvedValue({ error: null });
		});

		it("should handle batch processing errors gracefully", async () => {
			const { createClientWithUserKey } = require("@/lib/llm/factory");
			createClientWithUserKey.mockResolvedValue({
				uploadFile: jest.fn().mockRejectedValue(new Error("Upload failed")),
				generateWithFiles: jest.fn(),
			});

			const audioFiles = [
				{
					audioId: "audio-1",
					audioName: "audio-1.mp3",
					audioBlob: "data:audio/mp3;base64,dGVzdA==",
				},
			];

			const request = new NextRequest("http://localhost/api/batch/audio/transcribe", {
				method: "POST",
				body: JSON.stringify({ audioFiles }),
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.transcriptions[0].success).toBe(false);
			expect(data.transcriptions[0].error).toBeDefined();
		});
	});
});
