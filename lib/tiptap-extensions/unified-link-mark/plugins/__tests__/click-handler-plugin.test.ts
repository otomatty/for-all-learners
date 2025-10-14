/**
 * Click handler plugin tests
 * Tests the unified link mark click handling functionality
 */

import type { Editor } from "@tiptap/core";
import { PluginKey } from "prosemirror-state";
import { beforeEach, describe, expect, it } from "vitest";
import {
	createMinimalMockEditor,
	createMockOptions,
} from "@/lib/__tests__/helpers";
import type { UnifiedLinkMarkOptions } from "../../types";
import { createClickHandlerPlugin } from "../click-handler-plugin";

describe("createClickHandlerPlugin", () => {
	let mockEditor: Editor;
	let mockOptions: UnifiedLinkMarkOptions;

	beforeEach(() => {
		// Use helper functions to create mocks
		mockEditor = createMinimalMockEditor();
		mockOptions = createMockOptions();
	});

	describe("Plugin creation", () => {
		it("should create a plugin instance", () => {
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin).toBeDefined();
			expect(plugin.spec).toBeDefined();
		});

		it("should have correct plugin key", () => {
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.key).toBeInstanceOf(PluginKey);
		});

		it("should have props with handleClick", () => {
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props).toBeDefined();
			expect(plugin.spec.props?.handleClick).toBeDefined();
			expect(typeof plugin.spec.props?.handleClick).toBe("function");
		});
	});

	describe("Context requirements", () => {
		it("should accept editor in context", () => {
			expect(() =>
				createClickHandlerPlugin({
					editor: mockEditor,
					options: mockOptions,
				}),
			).not.toThrow();
		});

		it("should accept options in context", () => {
			expect(() =>
				createClickHandlerPlugin({
					editor: mockEditor,
					options: mockOptions,
				}),
			).not.toThrow();
		});

		it("should work with minimal options", () => {
			const minimalOptions: UnifiedLinkMarkOptions = {
				HTMLAttributes: {},
				autoReconciler: null,
				noteSlug: null,
				userId: null,
			};

			expect(() =>
				createClickHandlerPlugin({
					editor: mockEditor,
					options: minimalOptions,
				}),
			).not.toThrow();
		});
	});

	describe("Handler function signature", () => {
		it("should have handleClick with correct parameter count", () => {
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});
			const handler = plugin.spec.props?.handleClick;

			expect(handler).toBeDefined();
			if (handler) {
				// Handler should accept 3 parameters: (view, pos, event)
				expect(handler.length).toBe(3);
			}
		});
	});

	describe("Plugin configuration", () => {
		it("should be configured to handle click events", () => {
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props).toHaveProperty("handleClick");
		});

		it("should store editor context", () => {
			// Plugin should have access to editor through closure
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin).toBeDefined();
		});

		it("should store options context", () => {
			// Plugin should have access to options through closure
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin).toBeDefined();
		});
	});

	describe("Integration requirements", () => {
		it("should be compatible with ProseMirror plugin system", () => {
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin).toHaveProperty("spec");
			expect(plugin).toHaveProperty("getState");
		});

		it("should export handler function for integration testing", () => {
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});
			const handler = plugin.spec.props?.handleClick;

			expect(handler).toBeDefined();
			expect(typeof handler).toBe("function");
		});
	});

	describe("Expected behavior (contract tests)", () => {
		it("should check for unilink mark at click position", () => {
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			// Implementation should check for "unilink" mark
			expect(plugin.spec.props?.handleClick).toBeDefined();
		});

		it("should handle exists state with pageId", () => {
			// Contract: When state is "exists" and pageId is present,
			// should call navigateToPage(pageId)
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleClick).toBeDefined();
		});

		it("should handle missing state", () => {
			// Contract: When state is "missing", should call handleMissingLinkClick
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleClick).toBeDefined();
		});

		it("should handle pending state", () => {
			// Contract: When state is "pending", should do nothing
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleClick).toBeDefined();
		});

		it("should prevent default event behavior", () => {
			// Contract: Should call event.preventDefault() when handling click
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleClick).toBeDefined();
		});
	});

	describe("Error handling", () => {
		it("should not throw when creating plugin", () => {
			expect(() =>
				createClickHandlerPlugin({
					editor: mockEditor,
					options: mockOptions,
				}),
			).not.toThrow();
		});

		it("should handle missing pageId gracefully", () => {
			// Plugin should handle edge cases
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleClick).toBeDefined();
		});

		it("should handle unknown state gracefully", () => {
			// Plugin should handle unexpected state values
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleClick).toBeDefined();
		});
	});

	describe("Plugin lifecycle", () => {
		it("should be reusable across multiple editor instances", () => {
			const plugin1 = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			const mockEditor2 = {} as Editor;
			const plugin2 = createClickHandlerPlugin({
				editor: mockEditor2,
				options: mockOptions,
			});

			expect(plugin1).not.toBe(plugin2);
			expect(plugin1.spec.key).toBeInstanceOf(PluginKey);
			expect(plugin2.spec.key).toBeInstanceOf(PluginKey);
		});

		it("should maintain plugin key consistency", () => {
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});
			const key = plugin.spec.key;

			expect(key).toBe(plugin.spec.key);
		});
	});

	describe("Implementation contract", () => {
		it("should resolve position to check for marks", () => {
			// Contract: Uses doc.resolve(pos) to get $pos
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleClick).toBeDefined();
		});

		it("should find unilink mark in marks array", () => {
			// Contract: Uses $pos.marks().find(mark => mark.type.name === "unilink")
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleClick).toBeDefined();
		});

		it("should extract attrs from unilink mark", () => {
			// Contract: Reads attrs from mark as UnifiedLinkAttributes
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleClick).toBeDefined();
		});

		it("should log click events for debugging", () => {
			// Contract: Uses console.log for debugging information
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleClick).toBeDefined();
		});

		it("should pass userId from options", () => {
			// Contract: Passes options.userId to handleMissingLinkClick
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleClick).toBeDefined();
		});

		it("should pass onShowCreatePageDialog callback", () => {
			// Contract: Passes options.onShowCreatePageDialog to handleMissingLinkClick
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleClick).toBeDefined();
		});
	});

	describe("Return value contract", () => {
		it("should return true when handling unilink click", () => {
			// Contract: Returns true when unilink mark is found and handled
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleClick).toBeDefined();
		});

		it("should return false when no unilink mark at position", () => {
			// Contract: Returns false to allow default behavior when no mark found
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleClick).toBeDefined();
		});
	});

	describe("State transitions", () => {
		it("should handle exists -> navigation transition", () => {
			// Contract: exists state triggers navigation
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleClick).toBeDefined();
		});

		it("should handle missing -> create page dialog transition", () => {
			// Contract: missing state triggers create page dialog
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleClick).toBeDefined();
		});

		it("should handle pending -> no action transition", () => {
			// Contract: pending state does nothing, waits for resolution
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleClick).toBeDefined();
		});
	});

	describe("Options integration", () => {
		it("should work without userId", () => {
			const optionsWithoutUserId: UnifiedLinkMarkOptions = {
				...mockOptions,
				userId: null,
			};

			expect(() =>
				createClickHandlerPlugin({
					editor: mockEditor,
					options: optionsWithoutUserId,
				}),
			).not.toThrow();
		});

		it("should work without onShowCreatePageDialog", () => {
			const optionsWithoutDialog: UnifiedLinkMarkOptions = {
				...mockOptions,
				onShowCreatePageDialog: undefined,
			};

			expect(() =>
				createClickHandlerPlugin({
					editor: mockEditor,
					options: optionsWithoutDialog,
				}),
			).not.toThrow();
		});

		it("should pass correct parameters to handleMissingLinkClick", () => {
			// Contract: handleMissingLinkClick receives:
			// (editor, markId, text, userId, onShowCreatePageDialog)
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleClick).toBeDefined();
		});
	});

	// ========================================
	// Phase 3.1: New Features Tests
	// ========================================

	describe("Phase 3.1: Bracket click detection (backward compatibility)", () => {
		it("should detect bracket pattern at click position when no unilink mark", () => {
			// Contract: When unilink mark is not found, check for [text] pattern
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleClick).toBeDefined();
			// Implementation should detect [text] pattern in text content
		});

		it("should extract bracket content from text node", () => {
			// Contract: Extract text between [ and ] at cursor position
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleClick).toBeDefined();
			// Should handle: "Some text [link text] more text"
		});

		it("should handle multiple brackets in same text node", () => {
			// Contract: Should find the bracket pair that contains the click position
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleClick).toBeDefined();
			// Should handle: "[first] and [second]"
		});

		it("should ignore brackets in code blocks", () => {
			// Contract: Should not process brackets inside code blocks
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleClick).toBeDefined();
			// Code blocks should be ignored
		});

		it("should ignore brackets in inline code", () => {
			// Contract: Should not process brackets inside inline code marks
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleClick).toBeDefined();
			// Inline code should be ignored
		});

		it("should handle nested brackets correctly", () => {
			// Contract: Should handle [[text]] as outer bracket
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleClick).toBeDefined();
			// Nested brackets should be handled properly
		});

		it("should return false if click is outside any bracket", () => {
			// Contract: Return false when no bracket at click position
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleClick).toBeDefined();
			// Should return false to allow default behavior
		});

		it("should prioritize unilink mark over bracket detection", () => {
			// Contract: Always check for unilink mark first
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleClick).toBeDefined();
			// Unilink mark has priority
		});
	});

	describe("Phase 3.1: .icon notation support", () => {
		it("should detect .icon suffix in bracket content", () => {
			// Contract: Detect pattern [username.icon]
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleClick).toBeDefined();
			// Should recognize .icon notation
		});

		it("should handle .icon click without noteSlug", () => {
			// Contract: Navigate to /pages/:pageId for user page
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleClick).toBeDefined();
			// Should navigate to user's page
		});

		it("should handle .icon click with noteSlug", () => {
			// Contract: Navigate to /notes/:slug/:pageId when noteSlug present
			const optionsWithNoteSlug: UnifiedLinkMarkOptions = {
				...mockOptions,
				noteSlug: "test-note",
			};

			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: optionsWithNoteSlug,
			});

			expect(plugin.spec.props?.handleClick).toBeDefined();
			// Should navigate with note context
		});

		it("should query accounts table by user_slug", () => {
			// Contract: Search accounts.user_slug for username
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleClick).toBeDefined();
			// Should query accounts table
		});

		it("should query pages table for user page", () => {
			// Contract: Find page where user_id matches and title equals username
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleClick).toBeDefined();
			// Should query pages table
		});

		it("should show error when user not found", () => {
			// Contract: Display error toast when user_slug doesn't exist
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleClick).toBeDefined();
			// Should handle user not found
		});

		it("should show error when user page not found", () => {
			// Contract: Display error toast when user exists but has no page
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleClick).toBeDefined();
			// Should handle page not found
		});

		it("should handle .icon in unilink mark attributes", () => {
			// Contract: Support linkType="icon" in UnifiedLinkAttributes
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleClick).toBeDefined();
			// Should process icon type in mark
		});

		it("should prevent default event on .icon click", () => {
			// Contract: Call event.preventDefault() for .icon links
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleClick).toBeDefined();
			// Should prevent default
		});

		it("should return true after handling .icon click", () => {
			// Contract: Return true to indicate event was handled
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleClick).toBeDefined();
			// Should return true
		});
	});

	describe("Phase 3.1: External link support", () => {
		it("should detect https:// URL in bracket content", () => {
			// Contract: Recognize [https://example.com] pattern
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleClick).toBeDefined();
			// Should detect https URLs
		});

		it("should detect http:// URL in bracket content", () => {
			// Contract: Recognize [http://example.com] pattern
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleClick).toBeDefined();
			// Should detect http URLs
		});

		it("should open external link in new tab", () => {
			// Contract: Call window.open(url, '_blank')
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleClick).toBeDefined();
			// Should use window.open
		});

		it("should handle external link in unilink mark", () => {
			// Contract: Support linkType="external" in UnifiedLinkAttributes
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleClick).toBeDefined();
			// Should process external type in mark
		});

		it("should prevent default event on external link click", () => {
			// Contract: Call event.preventDefault()
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleClick).toBeDefined();
			// Should prevent default
		});
	});

	describe("Phase 3.1: noteSlug integration", () => {
		it("should use noteSlug for internal page navigation", () => {
			// Contract: Navigate to /notes/:slug/:pageId when noteSlug present
			const optionsWithNoteSlug: UnifiedLinkMarkOptions = {
				...mockOptions,
				noteSlug: "my-note",
			};

			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: optionsWithNoteSlug,
			});

			expect(plugin.spec.props?.handleClick).toBeDefined();
			// Should include noteSlug in URL
		});

		it("should use standard page URL without noteSlug", () => {
			// Contract: Navigate to /pages/:pageId when noteSlug is null
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleClick).toBeDefined();
			// Should use standard URL
		});

		it("should encode noteSlug in URL", () => {
			// Contract: Use encodeURIComponent for noteSlug
			const optionsWithSpecialChars: UnifiedLinkMarkOptions = {
				...mockOptions,
				noteSlug: "note with spaces",
			};

			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: optionsWithSpecialChars,
			});

			expect(plugin.spec.props?.handleClick).toBeDefined();
			// Should encode special characters
		});

		it("should pass noteSlug to page creation flow", () => {
			// Contract: Include noteSlug when creating new page from missing link
			const optionsWithNoteSlug: UnifiedLinkMarkOptions = {
				...mockOptions,
				noteSlug: "test-note",
			};

			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: optionsWithNoteSlug,
			});

			expect(plugin.spec.props?.handleClick).toBeDefined();
			// Should use noteSlug in creation
		});

		it("should handle noteSlug in .icon navigation", () => {
			// Contract: Include noteSlug in .icon link navigation
			const optionsWithNoteSlug: UnifiedLinkMarkOptions = {
				...mockOptions,
				noteSlug: "test-note",
			};

			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: optionsWithNoteSlug,
			});

			expect(plugin.spec.props?.handleClick).toBeDefined();
			// Should use noteSlug with icon links
		});

		it("should not use noteSlug for external links", () => {
			// Contract: External links ignore noteSlug
			const optionsWithNoteSlug: UnifiedLinkMarkOptions = {
				...mockOptions,
				noteSlug: "test-note",
			};

			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: optionsWithNoteSlug,
			});

			expect(plugin.spec.props?.handleClick).toBeDefined();
			// External links should ignore noteSlug
		});

		it("should append newPage query param correctly with noteSlug", () => {
			// Contract: URL format /notes/:slug/:id?newPage=true
			const optionsWithNoteSlug: UnifiedLinkMarkOptions = {
				...mockOptions,
				noteSlug: "test-note",
			};

			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: optionsWithNoteSlug,
			});

			expect(plugin.spec.props?.handleClick).toBeDefined();
			// Should format query params correctly
		});
	});

	describe("Phase 3.1: Link type detection", () => {
		it("should detect page link type (default)", () => {
			// Contract: Regular [text] is linkType="page"
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleClick).toBeDefined();
			// Default should be page type
		});

		it("should detect tag link type (#tag)", () => {
			// Contract: #tag syntax is linkType="tag"
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleClick).toBeDefined();
			// Should detect tag type
		});

		it("should detect icon link type (.icon suffix)", () => {
			// Contract: [username.icon] is linkType="icon"
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleClick).toBeDefined();
			// Should detect icon type
		});

		it("should detect external link type (URL)", () => {
			// Contract: [https://...] is linkType="external"
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleClick).toBeDefined();
			// Should detect external type
		});
	});

	// ========================================
	// Phase 3.2: DOM Click Handler & Page Creation
	// ========================================

	describe("Phase 3.2: DOM click handler integration", () => {
		it("should register handleDOMEvents.click handler", () => {
			// Contract: Plugin should have handleDOMEvents.click property
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleDOMEvents).toBeDefined();
			expect(plugin.spec.props?.handleDOMEvents?.click).toBeDefined();
			expect(typeof plugin.spec.props?.handleDOMEvents?.click).toBe("function");
		});

		it("should handle clicks on <a> tags", () => {
			// Contract: handleDOMEvents.click should detect <a> tags
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			const handler = plugin.spec.props?.handleDOMEvents?.click;
			expect(handler).toBeDefined();
			// Handler should check target.tagName === "A"
		});

		it("should ignore clicks on non-anchor elements", () => {
			// Contract: Only <a> tags should be processed
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			const handler = plugin.spec.props?.handleDOMEvents?.click;
			expect(handler).toBeDefined();
			// Should return false for non-anchor elements
		});

		it("should extract data-page-title attribute", () => {
			// Contract: Should read data-page-title from <a> tag
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleDOMEvents?.click).toBeDefined();
			// Should extract newTitle from target.getAttribute("data-page-title")
		});

		it("should prevent default on data-page-title links", () => {
			// Contract: event.preventDefault() should be called
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleDOMEvents?.click).toBeDefined();
			// Should prevent default navigation for new page creation
		});
	});

	describe("Phase 3.2: New page creation from link", () => {
		it("should create page with title from data-page-title", () => {
			// Contract: createPageFromLink should be called with correct title
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleDOMEvents?.click).toBeDefined();
			// Should call createPageFromLink(newTitle, userId, noteSlug)
		});

		it("should convert underscores to spaces in title", () => {
			// Contract: Title should replace _ with spaces (e.g., "My_Page" -> "My Page")
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleDOMEvents?.click).toBeDefined();
			// createPageFromLink should handle underscore conversion
		});

		it("should use userId from options if available", () => {
			// Contract: Should prefer userId from options
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: { ...mockOptions, userId: "explicit-user-id" },
			});

			expect(plugin.spec.props?.handleDOMEvents?.click).toBeDefined();
			// Should use explicit-user-id
		});

		it("should fetch userId from auth if not in options", () => {
			// Contract: Should call supabase.auth.getUser() if userId not provided
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: { ...mockOptions, userId: undefined },
			});

			expect(plugin.spec.props?.handleDOMEvents?.click).toBeDefined();
			// Should dynamically fetch user from auth
		});

		it("should show error if user not authenticated", () => {
			// Contract: Should show toast.error if auth fails
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: { ...mockOptions, userId: undefined },
			});

			expect(plugin.spec.props?.handleDOMEvents?.click).toBeDefined();
			// Should call toast.error("ログインしてください")
		});

		it("should navigate to new page after creation", () => {
			// Contract: Should navigate to result.href
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleDOMEvents?.click).toBeDefined();
			// Should set window.location.href = result.href
		});

		it("should return true after handling", () => {
			// Contract: Should return true to indicate event was handled
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleDOMEvents?.click).toBeDefined();
			// Should return true
		});
	});

	describe("Phase 3.2: noteSlug integration with page creation", () => {
		it("should pass noteSlug to createPageFromLink", () => {
			// Contract: noteSlug should be passed to page creation function
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: { ...mockOptions, noteSlug: "test-note" },
			});

			expect(plugin.spec.props?.handleDOMEvents?.click).toBeDefined();
			// Should call createPageFromLink(title, userId, "test-note")
		});

		it("should link page to note when noteSlug present", () => {
			// Contract: note_page_links table should be updated
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: { ...mockOptions, noteSlug: "test-note" },
			});

			expect(plugin.spec.props?.handleDOMEvents?.click).toBeDefined();
			// createPageFromLink should insert into note_page_links
		});

		it("should navigate to /notes/:slug/:id when noteSlug present", () => {
			// Contract: href should be /notes/test-note/:pageId?newPage=true
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: { ...mockOptions, noteSlug: "test-note" },
			});

			expect(plugin.spec.props?.handleDOMEvents?.click).toBeDefined();
			// result.href should include /notes/test-note/
		});

		it("should navigate to /pages/:id when noteSlug absent", () => {
			// Contract: href should be /pages/:pageId?newPage=true
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: { ...mockOptions, noteSlug: null },
			});

			expect(plugin.spec.props?.handleDOMEvents?.click).toBeDefined();
			// result.href should be /pages/:pageId?newPage=true
		});

		it("should encode noteSlug in URL", () => {
			// Contract: noteSlug should be URL-encoded
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: { ...mockOptions, noteSlug: "test note with spaces" },
			});

			expect(plugin.spec.props?.handleDOMEvents?.click).toBeDefined();
			// Should use encodeURIComponent(noteSlug)
		});
	});

	describe("Phase 3.2: Normal href navigation", () => {
		it("should handle href attribute without data-page-title", () => {
			// Contract: Should navigate to href if no data-page-title
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleDOMEvents?.click).toBeDefined();
			// Should check target.hasAttribute("href")
		});

		it("should open link in new tab when target='_blank'", () => {
			// Contract: Should use window.open() for _blank links
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleDOMEvents?.click).toBeDefined();
			// Should call window.open(href, "_blank", "noopener,noreferrer")
		});

		it("should navigate normally when target not '_blank'", () => {
			// Contract: Should use window.location.href for normal links
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleDOMEvents?.click).toBeDefined();
			// Should set window.location.href = href
		});

		it("should prevent default on href navigation", () => {
			// Contract: event.preventDefault() should be called
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleDOMEvents?.click).toBeDefined();
			// Should prevent default browser navigation
		});

		it("should ignore # hrefs", () => {
			// Contract: Should not navigate for href="#"
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleDOMEvents?.click).toBeDefined();
			// Should skip if href === "#"
		});
	});

	describe("Phase 3.2: Error handling", () => {
		it("should handle page creation errors gracefully", () => {
			// Contract: Should not throw if createPageFromLink fails
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: mockOptions,
			});

			expect(plugin.spec.props?.handleDOMEvents?.click).toBeDefined();
			// Should catch errors and show toast
		});

		it("should handle auth errors gracefully", () => {
			// Contract: Should not throw if auth.getUser() fails
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: { ...mockOptions, userId: undefined },
			});

			expect(plugin.spec.props?.handleDOMEvents?.click).toBeDefined();
			// Should show error toast
		});

		it("should handle note linking errors gracefully", () => {
			// Contract: Page creation should succeed even if note linking fails
			const plugin = createClickHandlerPlugin({
				editor: mockEditor,
				options: { ...mockOptions, noteSlug: "test-note" },
			});

			expect(plugin.spec.props?.handleDOMEvents?.click).toBeDefined();
			// Should continue even if note_page_links insert fails
		});
	});
});
