/**
 * Google Gemini Client
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   - lib/llm/client.ts
 *
 * Dependencies (依存先):
 *   - @google/generative-ai
 *
 * Related Files:
 *   - Interface: ./client.ts
 *   - Tests: ./__tests__/google-client.test.ts
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import type {
	FileUploadOptions,
	FileUploadResult,
	GenerateOptions,
	LLMClient,
	StreamOptions,
} from "./client";

/**
 * Google Gemini Client implementation
 */
export class GoogleGeminiClient implements LLMClient {
	private genAI: GoogleGenerativeAI;
	private fileManager: GoogleAIFileManager;
	private model: string;

	constructor(apiKey: string, model: string = "gemini-2.0-flash-exp") {
		this.genAI = new GoogleGenerativeAI(apiKey);
		this.fileManager = new GoogleAIFileManager(apiKey);
		this.model = model;
	}

	/**
	 * Generate text from a prompt
	 */
	async generate(prompt: string, options?: GenerateOptions): Promise<string> {
		try {
			const model = this.genAI.getGenerativeModel({
				model: this.model,
				generationConfig: {
					temperature: options?.temperature,
					maxOutputTokens: options?.maxTokens,
					topP: options?.topP,
				},
			});

			const result = await model.generateContent(prompt);
			const response = result.response;
			return response.text();
		} catch (error) {
			throw new Error(
				`Gemini generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	/**
	 * Generate text stream from a prompt
	 */
	async *generateStream(
		prompt: string,
		options?: StreamOptions,
	): AsyncGenerator<string> {
		try {
			const model = this.genAI.getGenerativeModel({
				model: this.model,
				generationConfig: {
					temperature: options?.temperature,
					maxOutputTokens: options?.maxTokens,
					topP: options?.topP,
				},
			});

			const result = await model.generateContentStream(prompt);

			for await (const chunk of result.stream) {
				const text = chunk.text();
				if (text) {
					if (options?.onChunk) {
						options.onChunk(text);
					}
					yield text;
				}
			}
		} catch (error) {
			throw new Error(
				`Gemini stream generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	/**
	 * Upload a file to Google AI File Manager
	 * @param fileData - File data as Blob, Buffer, or file path (string)
	 * @param options - Upload options including mimeType
	 * @returns File upload result with URI and metadata
	 */
	async uploadFile(
		fileData: Blob | Buffer | string,
		options: FileUploadOptions,
	): Promise<FileUploadResult> {
		try {
			// Convert Blob to Buffer if needed
			let buffer: Buffer | string;

			if (typeof fileData === "string") {
				// File path - pass directly to GoogleAIFileManager
				buffer = fileData;
			} else if (Buffer.isBuffer(fileData)) {
				// Already a Buffer
				buffer = fileData;
			} else {
				// Blob - convert to Buffer
				const arrayBuffer = await fileData.arrayBuffer();
				buffer = Buffer.from(arrayBuffer);
			}

			// Upload file using GoogleAIFileManager
			const uploadResponse = await this.fileManager.uploadFile(buffer, {
				mimeType: options.mimeType,
				displayName: options.displayName,
			});

			// Return standardized result
			return {
				uri: uploadResponse.file.uri,
				mimeType: uploadResponse.file.mimeType,
				name: uploadResponse.file.name,
				sizeBytes: uploadResponse.file.sizeBytes,
			};
		} catch (error) {
			throw new Error(
				`Gemini file upload failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	/**
	 * Generate content with file references
	 * @param prompt - Text prompt
	 * @param fileUris - Array of file URIs with mime types
	 * @param options - Generation options
	 * @returns Generated text
	 */
	async generateWithFiles(
		prompt: string,
		fileUris: Array<{ uri: string; mimeType: string }>,
		options?: GenerateOptions,
	): Promise<string> {
		try {
			const model = this.genAI.getGenerativeModel({
				model: this.model,
				generationConfig: {
					temperature: options?.temperature,
					maxOutputTokens: options?.maxTokens,
					topP: options?.topP,
				},
			});

			// Build content parts: files first, then text prompt
			const parts = [
				...fileUris.map((file) => ({
					fileData: {
						fileUri: file.uri,
						mimeType: file.mimeType,
					},
				})),
				{ text: prompt },
			];

			const result = await model.generateContent({
				contents: [{ role: "user", parts }],
			});

			const response = result.response;
			return response.text();
		} catch (error) {
			throw new Error(
				`Gemini generation with files failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}
}
