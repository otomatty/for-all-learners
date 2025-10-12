/**
 * JSDOM Test Environment Setup Helper
 *
 * Provides utilities for setting up JSDOM environment in test files.
 * This is needed for tests that require DOM manipulation but run in Node.js.
 *
 * @example
 * ```typescript
 * import { setupJSDOMEnvironment } from "@/lib/__tests__/helpers";
 *
 * // At the top of your test file
 * setupJSDOMEnvironment();
 *
 * describe("My Test", () => {
 *   // global.document and global.window are now available
 * });
 * ```
 */

import { JSDOM } from "jsdom";

/**
 * Setup JSDOM environment for testing
 *
 * This function sets up a minimal JSDOM environment by creating a DOM instance
 * and assigning it to global.document and global.window. This is required for
 * tests that need to interact with DOM APIs.
 *
 * @param options - Configuration options
 * @param options.html - HTML content for the document (default: minimal HTML5 document)
 * @param options.setupRAF - Whether to setup requestAnimationFrame mock (default: true)
 * @returns The JSDOM instance for advanced usage
 *
 * @example
 * ```typescript
 * // Basic usage
 * setupJSDOMEnvironment();
 *
 * // With custom HTML
 * setupJSDOMEnvironment({
 *   html: '<div id="app"></div>'
 * });
 *
 * // Without RAF mock (if you need a custom implementation)
 * setupJSDOMEnvironment({ setupRAF: false });
 * ```
 */
export function setupJSDOMEnvironment(
  options: {
    html?: string;
    setupRAF?: boolean;
  } = {}
): JSDOM {
  const {
    html = "<!DOCTYPE html><html><body></body></html>",
    setupRAF = true,
  } = options;

  const dom = new JSDOM(html);

  // Assign to global for test access
  global.document = dom.window.document as unknown as Document;
  global.window = dom.window as unknown as Window & typeof globalThis;

  // Setup requestAnimationFrame mock if requested
  if (setupRAF) {
    global.requestAnimationFrame = ((callback: FrameRequestCallback) => {
      setTimeout(callback, 0);
      return 0;
    }) as typeof requestAnimationFrame;
  }

  return dom;
}
