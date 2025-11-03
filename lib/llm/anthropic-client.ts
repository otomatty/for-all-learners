/**
 * Anthropic Claude Client
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   - lib/llm/client.ts
 *
 * Dependencies (依存先):
 *   - @anthropic-ai/sdk
 *
 * Related Files:
 *   - Interface: ./client.ts
 *   - Tests: ./__tests__/anthropic-client.test.ts
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
	FileUploadOptions,
	FileUploadResult,
	GenerateOptions,
	LLMClient,
	StreamOptions,
} from "./client";

/**
 * Anthropic Claude Client implementation
 */
export class AnthropicClient implements LLMClient {
	private client: Anthropic;
	private model: string;

	constructor(apiKey: string, model: string = "claude-3-5-sonnet-20241022") {
		this.client = new Anthropic({ apiKey });
		this.model = model;
	}

	/**
	 * Generate text from a prompt
	 */
	async generate(prompt: string, options?: GenerateOptions): Promise<string> {
		try {
			const response = await this.client.messages.create({
				model: this.model,
				max_tokens: options?.maxTokens || 1024,
				temperature: options?.temperature,
				top_p: options?.topP,
				messages: [{ role: "user", content: prompt }],
			});

			const textBlock = response.content.find((block) => block.type === "text");
			return textBlock && textBlock.type === "text" ? textBlock.text : "";
		} catch (error) {
			throw new Error(
				`Anthropic generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
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
			const stream = await this.client.messages.create({
				model: this.model,
				max_tokens: options?.maxTokens || 1024,
				temperature: options?.temperature,
				top_p: options?.topP,
				messages: [{ role: "user", content: prompt }],
				stream: true,
			});

			for await (const chunk of stream) {
				if (
					chunk.type === "content_block_delta" &&
					chunk.delta.type === "text_delta"
				) {
					const text = chunk.delta.text;
					if (text) {
						if (options?.onChunk) {
							options.onChunk(text);
						}
						yield text;
					}
				}
			}
		} catch (error) {
			throw new Error(
				`Anthropic stream generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	/**
	 * File upload is not yet implemented for Anthropic
	 * TODO: Implement file upload when Anthropic supports it
	 */
	async uploadFile(
		_fileData: Blob | Buffer | string,
		_options: FileUploadOptions,
	): Promise<FileUploadResult> {
		throw new Error(
			"File upload is not yet implemented for Anthropic provider. Use Google Gemini provider for file upload functionality.",
		);
	}
}
