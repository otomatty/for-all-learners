/**
 * Test Helpers Index
 *
 * Central export point for all test helper utilities.
 * Import from this file to get access to all mock creation helpers.
 *
 * @example
 * ```typescript
 * import {
 *   createMockEditor,
 *   createMockOptions,
 *   createMockPage,
 *   createTestEnvironment
 * } from '@/lib/__tests__/helpers';
 * ```
 */

// Export types for convenience
export type { MockEditorOptions } from "./editor-mock";
export * from "./editor-mock";
// Re-export setupJSDOMEnvironment (deprecated, but kept for backwards compatibility)
export { setupJSDOMEnvironment } from "./jsdom-setup";
export type { MockOptionsConfig } from "./options-mock";
export * from "./options-mock";
export type { MockPageData, PageRow } from "./page-mock";
export * from "./page-mock";

import type { Editor } from "@tiptap/core";
import { vi } from "vitest";
import type { UnifiedLinkMarkOptions } from "@/lib/tiptap-extensions/unified-link-mark/types";
import { createMockEditor } from "./editor-mock";
import { createMockOptions } from "./options-mock";

/**
 * Common mock objects used across tests
 */
export interface CommonMocks {
	/** Mock function for creating a page */
	createPage: ReturnType<typeof vi.fn>;
	/** Mock toast notification functions */
	toast: {
		success: ReturnType<typeof vi.fn>;
		error: ReturnType<typeof vi.fn>;
		info: ReturnType<typeof vi.fn>;
		warning: ReturnType<typeof vi.fn>;
	};
	/** Mock function for emitting page created events */
	emitPageCreated: ReturnType<typeof vi.fn>;
}

/**
 * Complete test environment with all common mocks
 */
export interface TestEnvironment {
	/** Mock Editor instance */
	editor: Editor;
	/** Mock UnifiedLinkMarkOptions */
	options: UnifiedLinkMarkOptions;
	/** Common mock functions */
	mocks: CommonMocks;
	/** Cleanup function to reset all mocks */
	cleanup: () => void;
}

/**
 * Create a complete test environment with all common mocks
 *
 * This is a convenience function that sets up a typical test environment
 * with an editor, options, and common mocks. Use this when you need
 * a complete setup quickly.
 *
 * @param config - Optional configuration for editor and options
 * @returns A complete test environment object
 *
 * @example
 * ```typescript
 * describe('MyComponent', () => {
 *   let env: TestEnvironment;
 *
 *   beforeEach(() => {
 *     env = createTestEnvironment();
 *   });
 *
 *   afterEach(() => {
 *     env.cleanup();
 *   });
 *
 *   it('should work', () => {
 *     const result = myFunction(env.editor, env.options);
 *     expect(env.mocks.createPage).toHaveBeenCalled();
 *   });
 * });
 * ```
 *
 * @example
 * ```typescript
 * // With custom configuration
 * const env = createTestEnvironment({
 *   userId: 'custom-user',
 *   noteSlug: 'custom-note'
 * });
 * ```
 */
export function createTestEnvironment(config?: {
	userId?: string;
	noteSlug?: string;
}): TestEnvironment {
	const editor = createMockEditor();
	const options = createMockOptions({
		userId: config?.userId,
		noteSlug: config?.noteSlug,
	});

	const mocks: CommonMocks = {
		createPage: vi.fn(),
		toast: {
			success: vi.fn(),
			error: vi.fn(),
			info: vi.fn(),
			warning: vi.fn(),
		},
		emitPageCreated: vi.fn(),
	};

	const cleanup = () => {
		vi.clearAllMocks();
	};

	return {
		editor,
		options,
		mocks,
		cleanup,
	};
}

/**
 * Reset all mocks in the test environment
 *
 * Convenience function to clear all mock call history.
 * Can be used in beforeEach/afterEach hooks.
 *
 * @example
 * ```typescript
 * afterEach(() => {
 *   resetAllMocks();
 * });
 * ```
 */
export function resetAllMocks(): void {
	vi.clearAllMocks();
}

// Note: createMockFn is removed as vi.fn() can be used directly
// If you need typed mock functions, use: vi.fn<YourFunctionType>()
