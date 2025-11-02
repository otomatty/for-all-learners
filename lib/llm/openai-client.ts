/**
 * OpenAI Client
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   - lib/llm/client.ts
 *
 * Dependencies (依存先):
 *   - openai
 *
 * Related Files:
 *   - Interface: ./client.ts
 *   - Tests: ./__tests__/openai-client.test.ts
 */

import OpenAI from "openai";
import type { GenerateOptions, LLMClient, StreamOptions } from "./client";

/**
 * OpenAI Client implementation
 */
export class OpenAIClient implements LLMClient {
	private client: OpenAI;
	private model: string;

	constructor(apiKey: string, model: string = "gpt-4o") {
		this.client = new OpenAI({ apiKey });
		this.model = model;
	}

	/**
	 * Generate text from a prompt
	 */
	async generate(prompt: string, options?: GenerateOptions): Promise<string> {
		try {
			const response = await this.client.chat.completions.create({
				model: this.model,
				messages: [{ role: "user", content: prompt }],
				temperature: options?.temperature,
				max_tokens: options?.maxTokens,
				top_p: options?.topP,
			});

			return response.choices[0]?.message?.content || "";
		} catch (error) {
			throw new Error(
				`OpenAI generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
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
			const stream = await this.client.chat.completions.create({
				model: this.model,
				messages: [{ role: "user", content: prompt }],
				temperature: options?.temperature,
				max_tokens: options?.maxTokens,
				top_p: options?.topP,
				stream: true,
			});

			for await (const chunk of stream) {
				const text = chunk.choices[0]?.delta?.content;
				if (text) {
					if (options?.onChunk) {
						options.onChunk(text);
					}
					yield text;
				}
			}
		} catch (error) {
			throw new Error(
				`OpenAI stream generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}
}
