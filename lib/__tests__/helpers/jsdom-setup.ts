/**
 * JSDOM Test Environment Setup Helper
 *
 * @deprecated This function is deprecated. The happy-dom environment is already
 * set up in vitest.config.mts, so calling this function is unnecessary.
 *
 * This file is kept for backwards compatibility but no longer imports jsdom.
 * If you need DOM utilities, use happy-dom which is already available in the test environment.
 *
 * @example
 * ```typescript
 * // No longer needed - happy-dom is already set up
 * // import { setupJSDOMEnvironment } from "@/lib/__tests__/helpers";
 * // setupJSDOMEnvironment();
 *
 * describe("My Test", () => {
 *   // global.document and global.window are already available
 * });
 * ```
 */

/**
 * Setup JSDOM environment for testing
 *
 * @deprecated This function is deprecated. The happy-dom environment is already
 * set up in vitest.config.mts, so calling this function is unnecessary.
 *
 * @param options - Configuration options (ignored)
 * @returns void
 */
export function setupJSDOMEnvironment(
	_options: { html?: string; setupRAF?: boolean } = {},
): void {
	// No-op: happy-dom environment is already set up in vitest.config.mts
	// This function is kept for backwards compatibility only
}
