import { searchPages } from "@/lib/utils/searchPages";
import type { Editor } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import tippy, { type Instance, type Props } from "tippy.js";
import type { UnifiedLinkMarkOptions } from "../types";

// Suggestion state interface
interface UnifiedLinkSuggestionState {
  active: boolean;
  range: { from: number; to: number } | null;
  query: string;
  results: Array<{ id: string; title: string; slug?: string }>;
  selectedIndex: number;
}

// Plugin key for state management
const suggestionPluginKey = new PluginKey<UnifiedLinkSuggestionState>(
  "unifiedLinkSuggestion"
);

/**
 * Create suggestion plugin for UnifiedLinkMark
 * Provides real-time page title suggestions while typing inside brackets
 */
export function createSuggestionPlugin(context: {
  editor: Editor;
  options: UnifiedLinkMarkOptions;
}) {
  return new Plugin<UnifiedLinkSuggestionState>({
    key: suggestionPluginKey,

    state: {
      // Initialize empty state
      init: () => ({
        active: false,
        range: null,
        query: "",
        results: [],
        selectedIndex: 0,
      }),

      // Apply state updates from transaction metadata
      apply(tr, prev) {
        const meta = tr.getMeta(suggestionPluginKey) as
          | UnifiedLinkSuggestionState
          | undefined;
        return meta ?? prev;
      },
    },

    view(view) {
      let debounceTimeoutId: number | null = null;
      let tippyInstance: Instance<Props> | null = null;

      return {
        update(editorView) {
          const state = suggestionPluginKey.getState(
            editorView.state
          ) as UnifiedLinkSuggestionState;
          const { $from } = editorView.state.selection;

          // Get paragraph boundaries
          const paraStart = $from.start($from.depth);
          const paraEnd = $from.end($from.depth);
          const text = editorView.state.doc.textBetween(
            paraStart,
            paraEnd,
            "",
            ""
          );
          const posInPara = $from.pos - paraStart;

          // Detect bracket range: [query]
          const openBracketIndex = text.lastIndexOf("[", posInPara - 1);

          if (openBracketIndex !== -1) {
            // Find closing bracket or end of text
            const rest = text.slice(openBracketIndex + 1);
            const closeBracketIndex = rest.indexOf("]");
            const endInPara =
              closeBracketIndex === -1
                ? text.length
                : openBracketIndex + 1 + closeBracketIndex;

            // Check if cursor is within bracket range
            if (posInPara > openBracketIndex && posInPara <= endInPara) {
              const rangeFrom = paraStart + openBracketIndex + 1; // After '['
              const rangeTo = paraStart + endInPara; // Before ']' or end
              const query = text.slice(openBracketIndex + 1, endInPara);

              // Only show suggestions for non-empty query
              if (query.length > 0) {
                // Check if state needs update
                if (
                  !state.active ||
                  !state.range ||
                  state.range.from !== rangeFrom ||
                  state.range.to !== rangeTo ||
                  state.query !== query
                ) {
                  // Clear existing timeout
                  if (debounceTimeoutId) {
                    clearTimeout(debounceTimeoutId);
                  }

                  // Debounced search (300ms)
                  debounceTimeoutId = window.setTimeout(async () => {
                    const results = await searchPages(query);
                    editorView.dispatch(
                      editorView.state.tr.setMeta(suggestionPluginKey, {
                        active: true,
                        range: { from: rangeFrom, to: rangeTo },
                        query,
                        results,
                        selectedIndex: 0,
                      } satisfies UnifiedLinkSuggestionState)
                    );
                  }, 300);
                }
              } else if (state.active) {
                // Clear suggestion when query is empty
                if (debounceTimeoutId) {
                  clearTimeout(debounceTimeoutId);
                }
                editorView.dispatch(
                  editorView.state.tr.setMeta(suggestionPluginKey, {
                    active: false,
                    range: null,
                    query: "",
                    results: [],
                    selectedIndex: 0,
                  } satisfies UnifiedLinkSuggestionState)
                );
              }
            } else if (state.active) {
              // Cursor moved outside bracket range
              if (debounceTimeoutId) {
                clearTimeout(debounceTimeoutId);
              }
              editorView.dispatch(
                editorView.state.tr.setMeta(suggestionPluginKey, {
                  active: false,
                  range: null,
                  query: "",
                  results: [],
                  selectedIndex: 0,
                } satisfies UnifiedLinkSuggestionState)
              );
            }
          } else if (state.active) {
            // No open bracket found
            if (debounceTimeoutId) {
              clearTimeout(debounceTimeoutId);
            }
            editorView.dispatch(
              editorView.state.tr.setMeta(suggestionPluginKey, {
                active: false,
                range: null,
                query: "",
                results: [],
                selectedIndex: 0,
              } satisfies UnifiedLinkSuggestionState)
            );
          }

          // Show/hide Tippy tooltip
          const currentState = suggestionPluginKey.getState(
            editorView.state
          ) as UnifiedLinkSuggestionState;

          if (currentState.active && currentState.range) {
            const { from } = currentState.range;
            const coords = editorView.coordsAtPos(from);

            // Create suggestion list DOM
            const createSuggestionList = () => {
              const list = document.createElement("div");
              list.className = "unified-link-suggestion-list";

              currentState.results.forEach((item, index) => {
                const div = document.createElement("div");
                div.textContent = item.title;
                div.className = `suggestion-item${
                  index === currentState.selectedIndex ? " active" : ""
                }`;

                // Handle mouse click
                div.addEventListener("mousedown", (e) => {
                  e.preventDefault();
                  insertUnifiedLink(editorView, currentState, item);
                  tippyInstance?.hide();
                });

                list.appendChild(div);
              });

              return list;
            };

            // Create or update Tippy instance
            if (!tippyInstance) {
              tippyInstance = tippy(document.body, {
                trigger: "manual",
                interactive: true,
                placement: "bottom-start",
                arrow: false,
                getReferenceClientRect: () =>
                  new DOMRect(coords.left, coords.bottom, 0, 0),
                content: createSuggestionList(),
              });
            } else {
              tippyInstance.setContent(createSuggestionList());
              tippyInstance.setProps({
                getReferenceClientRect: () =>
                  new DOMRect(coords.left, coords.bottom, 0, 0),
              });
            }

            tippyInstance.show();
          } else if (tippyInstance) {
            tippyInstance.hide();
          }
        },

        destroy() {
          if (debounceTimeoutId) {
            clearTimeout(debounceTimeoutId);
          }
          tippyInstance?.destroy();
          tippyInstance = null;
        },
      };
    },

    props: {
      handleKeyDown(view, event) {
        const state = suggestionPluginKey.getState(
          view.state
        ) as UnifiedLinkSuggestionState;

        if (!state.active || !state.range) {
          return false;
        }

        // Arrow key navigation
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          const direction = event.key === "ArrowDown" ? 1 : -1;
          const newIndex =
            (state.selectedIndex + direction + state.results.length) %
            state.results.length;

          view.dispatch(
            view.state.tr.setMeta(suggestionPluginKey, {
              ...state,
              selectedIndex: newIndex,
            } satisfies UnifiedLinkSuggestionState)
          );
          return true;
        }

        // Select current item with Tab or Enter
        if (event.key === "Tab" || event.key === "Enter") {
          event.preventDefault();
          const selectedItem = state.results[state.selectedIndex];

          if (!selectedItem) {
            return false;
          }

          insertUnifiedLink(view, state, selectedItem);
          return true;
        }

        // Close suggestion with Escape
        if (event.key === "Escape") {
          event.preventDefault();
          view.dispatch(
            view.state.tr.setMeta(suggestionPluginKey, {
              active: false,
              range: null,
              query: "",
              results: [],
              selectedIndex: 0,
            } satisfies UnifiedLinkSuggestionState)
          );
          return true;
        }

        return false;
      },
    },
  });
}

/**
 * Insert UnifiedLink mark for selected item
 */
function insertUnifiedLink(
  view: EditorView,
  state: UnifiedLinkSuggestionState,
  item: { id: string; title: string; slug?: string }
) {
  if (!state.range) return;

  const { from, to } = state.range;
  const key = item.slug || item.title;

  // Create transaction to replace bracket content with UnifiedLink mark
  const tr = view.state.tr;

  // Delete bracket range including brackets
  tr.delete(
    from - 1,
    to + (view.state.doc.textBetween(to, to + 1) === "]" ? 1 : 0)
  );

  // Insert text with UnifiedLink mark
  const markType = view.state.schema.marks.unifiedLink;
  if (markType) {
    const mark = markType.create({
      key,
      title: item.title,
      noteSlug: item.slug,
      resolved: true,
      status: "exists",
      pageId: item.id,
    });

    tr.insert(from - 1, view.state.schema.text(item.title, [mark]));
  }

  // Clear suggestion state
  tr.setMeta(suggestionPluginKey, {
    active: false,
    range: null,
    query: "",
    results: [],
    selectedIndex: 0,
  } satisfies UnifiedLinkSuggestionState);

  view.dispatch(tr);
}
