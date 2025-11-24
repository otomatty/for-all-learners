/**
 * Multi-LLM Client - Unified interface for multiple LLM providers
 *
 * DEPENDENCY MAP:
 *
 * Dependencies: @google/generative-ai, openai, @anthropic-ai/sdk
 * Related Files: ./client.spec.md, ./__tests__/client.test.ts
 */

export type LLMProvider = "google" | "openai" | "anthropic";

export interface GenerateOptions {
	temperature?: number;
	maxTokens?: number;
	topP?: number;
}

export interface StreamOptions extends GenerateOptions {
	onChunk?: (chunk: string) => void;
}

// File upload types
export interface FileUploadOptions {
	mimeType: string;
	displayName?: string;
}

export interface FileUploadResult {
	uri: string;
	mimeType: string;
	name: string;
	sizeBytes?: string;
}

export interface LLMClient {
	generate(prompt: string, options?: GenerateOptions): Promise<string>;
	generateStream(
		prompt: string,
		options?: StreamOptions,
	): AsyncGenerator<string>;
	/**
	 * Upload a file to the LLM provider's file storage
	 * @param fileData - File data as Blob, Buffer, or string path
	 * @param options - Upload options including mime type
	 * @returns File upload result with URI and metadata
	 */
	uploadFile?(
		fileData: Blob | Buffer | string,
		options: FileUploadOptions,
	): Promise<FileUploadResult>;
	/**
	 * Generate content with file references
	 * @param prompt - Text prompt
	 * @param fileUris - Array of file URIs (from uploadFile)
	 * @param options - Generation options
	 * @returns Generated text
	 */
	generateWithFiles?(
		prompt: string,
		fileUris: Array<{ uri: string; mimeType: string }>,
		options?: GenerateOptions,
	): Promise<string>;
}

export interface LLMClientOptions {
	provider: LLMProvider;
	model?: string;
	apiKey: string;
}

export const DEFAULT_MODELS: Record<LLMProvider, string> = {
	google: "gemini-2.0-flash-exp",
	openai: "gpt-4o",
	anthropic: "claude-3-5-sonnet-20241022",
};

export const AVAILABLE_MODELS: Record<LLMProvider, string[]> = {
	google: ["gemini-2.0-flash-exp", "gemini-1.5-pro", "gemini-1.5-flash"],
	openai: ["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"],
	anthropic: [
		"claude-3-5-sonnet-20241022",
		"claude-3-opus-20240229",
		"claude-3-haiku-20240307",
	],
};

export async function createLLMClient(
	options: LLMClientOptions,
): Promise<LLMClient> {
	const { provider, apiKey } = options;

	if (!apiKey || apiKey.trim() === "") {
		throw new Error("API key is required");
	}

	if (!isValidProvider(provider)) {
		throw new Error(`Invalid provider: ${provider}`);
	}

	const model = options.model || DEFAULT_MODELS[provider];

	try {
		switch (provider) {
			case "google": {
				const { GoogleGeminiClient } = await import("./google-client");
				return new GoogleGeminiClient(apiKey, model);
			}
			case "openai": {
				const { OpenAIClient } = await import("./openai-client");
				return new OpenAIClient(apiKey, model);
			}
			case "anthropic": {
				const { AnthropicClient } = await import("./anthropic-client");
				return new AnthropicClient(apiKey, model);
			}
		}
	} catch (error) {
		throw new Error(
			`Failed to create LLM client: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}

export function getAvailableProviders(): LLMProvider[] {
	return ["google", "openai", "anthropic"];
}

export function getAvailableModels(provider: LLMProvider): string[] {
	if (!isValidProvider(provider)) {
		throw new Error(`Invalid provider: ${provider}`);
	}
	return AVAILABLE_MODELS[provider];
}

export function getDefaultModel(provider: LLMProvider): string {
	if (!isValidProvider(provider)) {
		throw new Error(`Invalid provider: ${provider}`);
	}
	return DEFAULT_MODELS[provider];
}

function isValidProvider(provider: string): provider is LLMProvider {
	return ["google", "openai", "anthropic"].includes(provider);
}
