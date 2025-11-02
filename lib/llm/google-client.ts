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
import type { GenerateOptions, LLMClient, StreamOptions } from "./client";

/**
 * Google Gemini Client implementation
 */
export class GoogleGeminiClient implements LLMClient {
	private genAI: GoogleGenerativeAI;
	private model: string;

	constructor(apiKey: string, model: string = "gemini-2.0-flash-exp") {
		this.genAI = new GoogleGenerativeAI(apiKey);
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
}
