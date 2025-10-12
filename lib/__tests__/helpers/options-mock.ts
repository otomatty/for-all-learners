/**
 * UnifiedLinkMarkOptions Mock Helper
 *
 * Provides utilities for creating mock UnifiedLinkMarkOptions instances
 * to be used across tests, reducing duplication and ensuring consistency.
 *
 * @example
 * ```typescript
 * import { createMockOptions } from '@/lib/__tests__/helpers';
 *
 * const options = createMockOptions({ userId: 'custom-user' });
 * ```
 */

import { vi } from "vitest";
import type { UnifiedLinkMarkOptions } from "@/lib/tiptap-extensions/unified-link-mark/types";
import type { AutoReconciler } from "@/lib/unilink/auto-reconciler";

/**
 * Configuration options for creating mock UnifiedLinkMarkOptions
 */
export interface MockOptionsConfig {
  userId?: string | null;
  noteSlug?: string | null;
  autoReconciler?: AutoReconciler | null;
  onShowCreatePageDialog?: (
    title: string,
    onConfirm: () => Promise<void>
  ) => void;
  HTMLAttributes?: Record<string, string>;
}

/**
 * Create a mock UnifiedLinkMarkOptions instance for testing
 *
 * This helper provides default values for all required options
 * and allows customization through the config parameter.
 *
 * @param config - Optional configuration to override defaults
 * @returns A complete UnifiedLinkMarkOptions object
 *
 * @example
 * // Default options
 * const options = createMockOptions();
 *
 * @example
 * // Custom user ID
 * const options = createMockOptions({ userId: 'test-user-123' });
 *
 * @example
 * // With auto reconciler
 * const autoReconciler = { enqueue: vi.fn() };
 * const options = createMockOptions({ autoReconciler });
 *
 * @example
 * // With custom callback
 * const onShowCreatePageDialog = vi.fn();
 * const options = createMockOptions({ onShowCreatePageDialog });
 */
export function createMockOptions(
  config: MockOptionsConfig = {}
): UnifiedLinkMarkOptions {
  return {
    HTMLAttributes: config.HTMLAttributes ?? {},
    autoReconciler: config.autoReconciler ?? null,
    noteSlug: config.noteSlug ?? null,
    userId: config.userId ?? "test-user-id",
    onShowCreatePageDialog: config.onShowCreatePageDialog ?? vi.fn(),
  };
}

/**
 * Create mock options with no user ID (anonymous user scenario)
 *
 * @returns UnifiedLinkMarkOptions with userId set to null
 *
 * @example
 * const options = createMockOptionsAnonymous();
 * expect(options.userId).toBeNull();
 */
export function createMockOptionsAnonymous(): UnifiedLinkMarkOptions {
  return createMockOptions({ userId: null });
}

/**
 * Create mock options with all optional fields set
 *
 * Useful for testing scenarios where all features are enabled
 *
 * @returns UnifiedLinkMarkOptions with all fields populated
 *
 * @example
 * const options = createMockOptionsFull();
 * expect(options.noteSlug).toBe('test-note');
 * expect(options.autoReconciler).toBeDefined();
 */
/**
 * Create a mock AutoReconciler for testing
 *
 * @returns A mock AutoReconciler instance
 */
function createMockAutoReconciler(): Partial<AutoReconciler> {
  return {
    initialize: vi.fn(),
    destroy: vi.fn(),
    // Add other methods as needed
  };
}

export function createMockOptionsFull(): UnifiedLinkMarkOptions {
  return createMockOptions({
    userId: "test-user-id",
    noteSlug: "test-note",
    autoReconciler: createMockAutoReconciler() as AutoReconciler,
    onShowCreatePageDialog: vi.fn(),
    HTMLAttributes: {
      class: "unified-link",
      "data-testid": "unified-link",
    },
  });
}

/**
 * Create mock options for a specific note
 *
 * @param noteSlug - The slug of the note
 * @param userId - Optional user ID (defaults to 'test-user-id')
 * @returns UnifiedLinkMarkOptions configured for the specified note
 *
 * @example
 * const options = createMockOptionsForNote('my-note', 'user-123');
 * expect(options.noteSlug).toBe('my-note');
 * expect(options.userId).toBe('user-123');
 */
export function createMockOptionsForNote(
  noteSlug: string,
  userId = "test-user-id"
): UnifiedLinkMarkOptions {
  return createMockOptions({ noteSlug, userId });
}
