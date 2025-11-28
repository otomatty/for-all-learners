/**
 * Prompt Builder - Convert structured contents to simple prompt string
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   └─ lib/gemini.ts
 *
 * Dependencies (依存先):
 *   └─ なし
 *
 * Related Files:
 *   ├─ Spec: ./prompt-builder.spec.md
 *   ├─ Tests: ./__tests__/prompt-builder.test.ts
 *   └─ Plan: docs/03_plans/ai-integration/20251103_04_dynamic-llm-client-implementation-plan.md
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Prompt part can be:
 * - Simple string
 * - Object with text property
 * - Object with nested parts array (Gemini-style)
 */
export type PromptPart =
	| string
	| { text: string }
	| { parts: { text: string }[] };

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Build prompt string from parts array
 *
 * Converts various formats (Gemini's contents structure, simple strings, etc.)
 * to a single unified prompt string.
 *
 * @param parts - Array of content parts
 * @returns Combined prompt string
 *
 * @example
 * ```typescript
 * // Simple strings
 * buildPrompt(["System prompt", "User input"]);
 * // => "System prompt\n\nUser input"
 *
 * // Objects with text
 * buildPrompt([{ text: "Hello" }, { text: "World" }]);
 * // => "Hello\n\nWorld"
 *
 * // Mixed
 * buildPrompt(["System", { text: "User" }]);
 * // => "System\n\nUser"
 *
 * // Gemini-style nested parts
 * buildPrompt([{ parts: [{ text: "Part 1" }, { text: "Part 2" }] }]);
 * // => "Part 1 Part 2"
 * ```
 */
export function buildPrompt(parts: PromptPart[]): string {
	if (!parts || parts.length === 0) {
		return "";
	}

	return parts
		.map((part) => {
			// Case 1: Simple string
			if (typeof part === "string") {
				return part;
			}

			// Case 2: Object with text property
			if ("text" in part) {
				return part.text;
			}

			// Case 3: Object with nested parts array (Gemini-style)
			if ("parts" in part && Array.isArray(part.parts)) {
				return part.parts.map((p) => p.text).join(" ");
			}

			// Fallback: stringify the object
			return JSON.stringify(part);
		})
		.filter((text) => text.trim().length > 0)
		.join("\n\n");
}

/**
 * Build prompt from Gemini-style contents array
 *
 * @param contents - Gemini contents array
 * @returns Prompt string
 *
 * @example
 * ```typescript
 * buildPromptFromGeminiContents([
 *   { role: "user", parts: [{ text: "Hello" }] }
 * ]);
 * // => "Hello"
 * ```
 */
export function buildPromptFromGeminiContents(
	contents: { role?: string; parts: { text: string }[] }[],
): string {
	if (!contents || contents.length === 0) {
		return "";
	}

	return contents
		.map((content) => {
			if (!content.parts || content.parts.length === 0) {
				return "";
			}
			return content.parts.map((p) => p.text).join(" ");
		})
		.filter((text) => text.trim().length > 0)
		.join("\n\n");
}
