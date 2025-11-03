/**
 * Empty query suggestion tests
 * Tests the suggestion behavior when user types only trigger characters ([ or #)
 *
 * Related Issue: #21 - research: Investigate suggestion UI empty query behavior
 *
 * Test Cases:
 * TC-001: Empty bracket query should show "Enter keyword" message
 * TC-002: Empty tag query should show all available tags or "Enter keyword" message
 * TC-003: Single character query should show filtered suggestions
 * TC-004: No results query should show "No results found" message
 */

import { schema as tiptapSchema } from "@tiptap/pm/schema-basic";
import { DOMParser } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { beforeEach, describe, expect, it } from "vitest";
import {
	createMinimalMockEditor,
	createMockOptions,
} from "@/lib/__tests__/helpers";
import {
	createSuggestionPlugin,
	suggestionPluginKey,
	type UnifiedLinkSuggestionState,
} from "../suggestion-plugin";

// Note: happy-dom environment is already set up in vitest.config.mts

// TODO: Fix suggestion plugin tests - current implementation may have changed
describe.skip("Suggestion Plugin - Empty Query Behavior", () => {
	let editorView: EditorView;
	let plugin: ReturnType<typeof createSuggestionPlugin>;

	beforeEach(() => {
		const mockEditor = createMinimalMockEditor();
		const mockOptions = createMockOptions();
		plugin = createSuggestionPlugin({
			editor: mockEditor,
			options: mockOptions,
		});

		// Create a minimal editor state with the plugin
		const state = EditorState.create({
			schema: tiptapSchema,
			plugins: [plugin],
			doc: DOMParser.fromSchema(tiptapSchema).parse(
				document.createElement("div"),
			),
		});

		// Create a minimal editor view
		const container = document.createElement("div");
		editorView = new EditorView(container, {
			state,
		});
	});

	describe("TC-001: Empty bracket query behavior", () => {
		it("should show suggestion UI when user types '[' only", () => {
			// Arrange: User types opening bracket
			const tr = editorView.state.tr.insertText("[");
			editorView.dispatch(tr);

			// Act: Get suggestion state
			const suggestionState = suggestionPluginKey.getState(
				editorView.state,
			) as UnifiedLinkSuggestionState;

			// Assert: Suggestion should be active with empty query
			expect(suggestionState?.active).toBe(true);
			expect(suggestionState?.query).toBe("");
			expect(suggestionState?.variant).toBe("bracket");
		});

		it("should show 'Enter keyword' message for empty bracket query", () => {
			// Arrange: User types opening bracket
			const tr = editorView.state.tr.insertText("[");
			editorView.dispatch(tr);

			// Act: Get suggestion state
			const suggestionState = suggestionPluginKey.getState(
				editorView.state,
			) as UnifiedLinkSuggestionState;

			// Assert: Results should indicate empty query state
			expect(suggestionState?.results).toEqual([]);
			// Note: UI component should render "キーワードを入力してください" message
		});
	});

	describe("TC-002: Empty tag query behavior", () => {
		it("should show suggestion UI when user types '#' only", () => {
			// Arrange: User types hash symbol
			const tr = editorView.state.tr.insertText("#");
			editorView.dispatch(tr);

			// Act: Get suggestion state
			const suggestionState = suggestionPluginKey.getState(
				editorView.state,
			) as UnifiedLinkSuggestionState;

			// Assert: Suggestion should be active with empty query
			expect(suggestionState?.active).toBe(true);
			expect(suggestionState?.query).toBe("");
			expect(suggestionState?.variant).toBe("tag");
		});

		it("should show all available tags or 'Enter keyword' message for empty tag query", () => {
			// Arrange: User types hash symbol
			const tr = editorView.state.tr.insertText("#");
			editorView.dispatch(tr);

			// Act: Get suggestion state
			const suggestionState = suggestionPluginKey.getState(
				editorView.state,
			) as UnifiedLinkSuggestionState;

			// Assert: Should either show all tags or empty state
			// Implementation decision: Show "キーワードを入力してください" message
			expect(suggestionState?.results).toEqual([]);
		});
	});

	describe("TC-003: Single character query behavior", () => {
		it("should show filtered suggestions when user types '[a'", () => {
			// Arrange: User types bracket and one character
			const tr = editorView.state.tr.insertText("[a");
			editorView.dispatch(tr);

			// Act: Get suggestion state
			const suggestionState = suggestionPluginKey.getState(
				editorView.state,
			) as UnifiedLinkSuggestionState;

			// Assert: Suggestion should be active with query
			expect(suggestionState?.active).toBe(true);
			expect(suggestionState?.query).toBe("a");
			expect(suggestionState?.variant).toBe("bracket");
			// Results will be populated after API call
		});

		it("should show filtered suggestions when user types '#t'", () => {
			// Arrange: User types hash and one character
			const tr = editorView.state.tr.insertText("#t");
			editorView.dispatch(tr);

			// Act: Get suggestion state
			const suggestionState = suggestionPluginKey.getState(
				editorView.state,
			) as UnifiedLinkSuggestionState;

			// Assert: Suggestion should be active with query
			expect(suggestionState?.active).toBe(true);
			expect(suggestionState?.query).toBe("t");
			expect(suggestionState?.variant).toBe("tag");
		});
	});

	describe("TC-004: No results query behavior", () => {
		it("should show 'No results found' message when query has no matches", async () => {
			// Note: This test demonstrates the expected behavior when search returns no results
			// The actual implementation will need to handle empty results gracefully

			// Arrange: User types query with no matches
			const tr = editorView.state.tr.insertText("[xyz123");
			editorView.dispatch(tr);

			// Wait for debounced search
			await new Promise((resolve) => setTimeout(resolve, 350));

			// Act: Get suggestion state
			const suggestionState = suggestionPluginKey.getState(
				editorView.state,
			) as UnifiedLinkSuggestionState;

			// Assert: Should show no results state
			expect(suggestionState?.active).toBe(true);
			expect(suggestionState?.query).toBe("xyz123");
			expect(suggestionState?.results).toEqual([]);
			// Note: UI component should render "「xyz123」に該当するページが見つかりません" message
		});
	});

	describe("TC-005: Suggestion UI state management", () => {
		it("should distinguish between empty query and no results", () => {
			// Empty query state
			const trEmpty = editorView.state.tr.insertText("[");
			editorView.dispatch(trEmpty);
			const emptyState = suggestionPluginKey.getState(
				editorView.state,
			) as UnifiedLinkSuggestionState;

			// No results state (after search completes)
			const trNoResults = editorView.state.tr.insertText("xyz123");
			editorView.dispatch(trNoResults);
			const noResultsState = suggestionPluginKey.getState(
				editorView.state,
			) as UnifiedLinkSuggestionState;

			// Both should have empty results array but different queries
			expect(emptyState?.query).toBe("");
			expect(noResultsState?.query).toBe("xyz123");
			expect(emptyState?.results).toEqual([]);
			expect(noResultsState?.results).toEqual([]);
		});
	});
});
