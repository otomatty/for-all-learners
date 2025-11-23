/**
 * API Utilities
 *
 * Utility functions for handling API responses and errors
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   ├─ hooks/batch/useUnifiedBatch.ts
 *   ├─ hooks/batch/useMultiFileBatch.ts
 *
 * Dependencies (External files that this file uses):
 *   └─ None (pure utility functions)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */

/**
 * Handle API error response
 *
 * Extracts error message from response JSON, or uses default message
 * if response is not valid JSON.
 *
 * @param response - Fetch Response object
 * @param defaultMessage - Default error message to use if JSON parsing fails
 * @returns Promise that rejects with Error containing the error message
 *
 * @example
 * ```typescript
 * if (!response.ok) {
 *   await handleApiError(response, "Request failed");
 * }
 * ```
 */
export async function handleApiError(
	response: Response,
	defaultMessage: string,
): Promise<never> {
	let errorMessage = defaultMessage;
	try {
		const errorData = await response.json();
		errorMessage = errorData.message || errorMessage;
	} catch {
		// Response is not valid JSON, use default message
	}
	throw new Error(errorMessage);
}
