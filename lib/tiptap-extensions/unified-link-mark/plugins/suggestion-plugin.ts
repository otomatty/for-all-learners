import type { Editor } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import tippy, { type Instance, type Props } from "tippy.js";
import logger from "@/lib/logger";
import { searchPages } from "@/lib/utils/searchPages";
import type { UnifiedLinkMarkOptions } from "../types";

// Debug flag - set to true to enable detailed logging
const DEBUG_TAG_DUPLICATION = false;

// Feature flag: Disable suggestion feature to isolate tag duplication issue
// When false, suggestion plugin will not show any suggestions (bracket or tag)
// This helps identify whether the problem is in InputRule or Suggestion Plugin
const ENABLE_SUGGESTION_FEATURE = false;

// Debug logging utility
function debugLog(
	context: string,
	message: string,
	data?: Record<string, unknown>,
) {
	if (!DEBUG_TAG_DUPLICATION) return;
	logger.debug(data || {}, `[UnifiedLinkMark] [${context}] ${message}`);
}

// Suggestion state interface
export interface UnifiedLinkSuggestionState {
	active: boolean;
	range: { from: number; to: number } | null;
	query: string;
	results: Array<{ id: string; title: string; slug?: string }>;
	selectedIndex: number;
	variant?: "bracket" | "tag";
	loading?: boolean;
}

// Plugin key for state management
export const suggestionPluginKey = new PluginKey<UnifiedLinkSuggestionState>(
	"unifiedLinkSuggestion",
);

/**
 * Create suggestion plugin for UnifiedLinkMark
 * Provides real-time page title suggestions while typing inside brackets
 */
export function createSuggestionPlugin(_context: {
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
				selectedIndex: -1, // No item selected initially; user must select with arrow keys
			}),

			// Apply state updates from transaction metadata
			apply(tr, prev) {
				const meta = tr.getMeta(suggestionPluginKey) as
					| UnifiedLinkSuggestionState
					| undefined;
				return meta ?? prev;
			},
		},

		view() {
			let debounceTimeoutId: number | null = null;
			let tippyInstance: Instance<Props> | null = null;

			return {
				update(editorView) {
					// Feature flag: Skip all suggestion logic if disabled
					if (!ENABLE_SUGGESTION_FEATURE) {
						// Clear any active suggestion state
						if (debounceTimeoutId) {
							clearTimeout(debounceTimeoutId);
						}
						tippyInstance?.destroy();
						tippyInstance = null;
						return;
					}

					const state = suggestionPluginKey.getState(
						editorView.state,
					) as UnifiedLinkSuggestionState;
					const { $from } = editorView.state.selection;

					// Get paragraph boundaries
					const paraStart = $from.start($from.depth);
					const paraEnd = $from.end($from.depth);
					const text = editorView.state.doc.textBetween(
						paraStart,
						paraEnd,
						"",
						"",
					);
					const posInPara = $from.pos - paraStart;

					// Detect bracket range: [query]
					const openBracketIndex = text.lastIndexOf("[", posInPara - 1);
					// Detect tag range: #tag
					const hashIndex = text.lastIndexOf("#", posInPara - 1);

					// Determine which pattern is active (prefer the closest one to cursor)
					let detectedRange: {
						from: number;
						to: number;
						query: string;
						variant: "bracket" | "tag";
					} | null = null;

					// Check bracket pattern - only show suggestions when bracket is closed
					if (openBracketIndex !== -1) {
						const rest = text.slice(openBracketIndex + 1);
						const closeBracketIndex = rest.indexOf("]");

						// Only show suggestions if closing bracket exists
						if (closeBracketIndex !== -1) {
							const endInPara = openBracketIndex + 1 + closeBracketIndex;

							// Cursor must be inside the closed brackets
							if (posInPara > openBracketIndex && posInPara <= endInPara) {
								const rangeFrom = paraStart + openBracketIndex + 1;
								const rangeTo = paraStart + endInPara;
								const query = text.slice(openBracketIndex + 1, endInPara);

								detectedRange = {
									from: rangeFrom,
									to: rangeTo,
									query,
									variant: "bracket",
								};
							}
						}
					} // Check tag pattern (only if no bracket pattern or tag is closer)
					if (
						hashIndex !== -1 &&
						(!detectedRange || hashIndex > openBracketIndex)
					) {
						const rest = text.slice(hashIndex + 1);
						// Find tag end (space, punctuation, or end of text)
						const tagEndMatch = rest.match(/[\s\])}.,;!?]|$/);
						const tagEndIndex = tagEndMatch
							? (tagEndMatch.index ?? rest.length)
							: rest.length;
						const endInPara = hashIndex + 1 + tagEndIndex;

						if (posInPara > hashIndex && posInPara <= endInPara) {
							const rangeFrom = paraStart + hashIndex + 1;
							const rangeTo = paraStart + endInPara;
							const query = text.slice(hashIndex + 1, endInPara);

							detectedRange = {
								from: rangeFrom,
								to: rangeTo,
								query,
								variant: "tag",
							};
						}
					}

					if (detectedRange) {
						const {
							from: rangeFrom,
							to: rangeTo,
							query,
							variant,
						} = detectedRange;

						// Show suggestions for tag pattern even with empty query (#)
						// For bracket pattern, only show if query is non-empty
						const shouldShowSuggestions = query.length > 0 || variant === "tag";

						if (shouldShowSuggestions) {
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

								// Show loading state immediately
								editorView.dispatch(
									editorView.state.tr.setMeta(suggestionPluginKey, {
										active: true,
										range: { from: rangeFrom, to: rangeTo },
										query,
										results: [],
										selectedIndex: -1, // No item selected initially
										variant,
										loading: true,
									} satisfies UnifiedLinkSuggestionState),
								);

								// Debounced search (300ms)
								debounceTimeoutId = window.setTimeout(async () => {
									const results = await searchPages(query);
									editorView.dispatch(
										editorView.state.tr.setMeta(suggestionPluginKey, {
											active: true,
											range: { from: rangeFrom, to: rangeTo },
											query,
											results,
											selectedIndex: -1, // Maintain -1 after search
											variant,
											loading: false,
										} satisfies UnifiedLinkSuggestionState),
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
								} satisfies UnifiedLinkSuggestionState),
							);
						}
					} else if (state.active) {
						// No pattern detected - clear suggestion
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
							} satisfies UnifiedLinkSuggestionState),
						);
					}

					// Show/hide Tippy tooltip
					const currentState = suggestionPluginKey.getState(
						editorView.state,
					) as UnifiedLinkSuggestionState;

					if (currentState.active && currentState.range) {
						const { from } = currentState.range;
						const coords = editorView.coordsAtPos(from);

						// Create suggestion list DOM
						const createSuggestionList = () => {
							const container = document.createElement("div");
							const variant = currentState.variant || "bracket";

							// Main list container with improved styling
							container.className = `${variant}-suggestion-list bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden`;

							// Loading state
							if (currentState.loading) {
								const loadingState = document.createElement("div");
								loadingState.className =
									"px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center flex items-center justify-center gap-2";

								const spinner = document.createElement("span");
								spinner.className =
									"inline-block w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin";
								loadingState.appendChild(spinner);

								const text = document.createElement("span");
								text.textContent = "検索中...";
								loadingState.appendChild(text);

								container.appendChild(loadingState);
								return container;
							}

							// No results message
							if (currentState.results.length === 0) {
								const emptyState = document.createElement("div");
								emptyState.className =
									"px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center";
								emptyState.textContent = "結果が見つかりませんでした";
								container.appendChild(emptyState);
								return container;
							}

							// Header with hint
							const header = document.createElement("div");
							header.className =
								"px-3 py-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between";

							const headerText = document.createElement("span");
							headerText.textContent =
								variant === "tag" ? "タグページ" : "ページ";
							header.appendChild(headerText);

							const hint = document.createElement("span");
							hint.className = "text-gray-400 dark:text-gray-500";
							hint.textContent = "↑↓ 選択 • Enter 決定";
							header.appendChild(hint);

							container.appendChild(header);

							// Results list
							const list = document.createElement("div");
							list.className = "max-h-[200px] overflow-y-auto py-1";

							currentState.results.forEach((item, index) => {
								const itemDiv = document.createElement("div");
								itemDiv.className = `suggestion-item px-3 py-2 cursor-pointer flex items-center gap-2 transition-colors ${
									index === currentState.selectedIndex
										? "bg-blue-500 text-white"
										: "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
								}`;

								// Icon
								const icon = document.createElement("span");
								icon.className = `flex-shrink-0 text-sm ${
									index === currentState.selectedIndex
										? "text-white"
										: "text-gray-400 dark:text-gray-500"
								}`;
								icon.textContent = variant === "tag" ? "#" : "📄";
								itemDiv.appendChild(icon);

								// Title
								const title = document.createElement("span");
								title.className = "flex-1 text-sm truncate";
								title.textContent = item.title;
								itemDiv.appendChild(title);

								// Selected indicator
								if (index === currentState.selectedIndex) {
									const indicator = document.createElement("span");
									indicator.className =
										"flex-shrink-0 text-xs text-white opacity-75";
									indicator.textContent = "⏎";
									itemDiv.appendChild(indicator);
								}

								// Handle mouse events
								itemDiv.addEventListener("mousedown", (e) => {
									e.preventDefault();
									insertUnifiedLink(editorView, currentState, item);
									tippyInstance?.hide();
								});

								itemDiv.addEventListener("mouseenter", () => {
									// Update selected index on hover
									editorView.dispatch(
										editorView.state.tr.setMeta(suggestionPluginKey, {
											...currentState,
											selectedIndex: index,
										} satisfies UnifiedLinkSuggestionState),
									);
								});

								list.appendChild(itemDiv);
							});

							container.appendChild(list);

							return container;
						};

						// Create or update Tippy instance
						if (!tippyInstance) {
							tippyInstance = tippy(document.body, {
								trigger: "manual",
								interactive: true,
								placement: "bottom-start",
								arrow: false,
								offset: [0, 8],
								duration: [200, 150],
								animation: "shift-away",
								theme: "light-border",
								maxWidth: 400,
								getReferenceClientRect: () =>
									new DOMRect(coords.left, coords.bottom, 0, 0),
								content: createSuggestionList(),
								// Improve accessibility
								role: "listbox",
								appendTo: () => document.body,
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
				// Feature flag: Skip suggestion handling if disabled
				if (!ENABLE_SUGGESTION_FEATURE) {
					return false;
				}

				const state = suggestionPluginKey.getState(
					view.state,
				) as UnifiedLinkSuggestionState;

				// Always log key events for debugging
				debugLog("handleKeyDown", `Key pressed: ${event.key}`, {
					active: state.active,
					hasRange: !!state.range,
					variant: state.variant,
				});

				if (!state.active || !state.range) {
					debugLog(
						"handleKeyDown",
						`Early return: active=${state.active}, hasRange=${!!state.range}`,
					);
					return false;
				}

				debugLog(
					"handleKeyDown",
					`Suggestion is active, processing key: ${event.key}`,
				);

				// Arrow key navigation
				if (event.key === "ArrowDown" || event.key === "ArrowUp") {
					event.preventDefault();
					const direction = event.key === "ArrowDown" ? 1 : -1;
					let newIndex = state.selectedIndex + direction;

					// Handle wrap-around from -1 to first item with down arrow
					if (newIndex < -1) {
						newIndex = state.results.length - 1;
					} else if (newIndex >= state.results.length) {
						newIndex = -1; // Wrap to unselected state
					}

					view.dispatch(
						view.state.tr.setMeta(suggestionPluginKey, {
							...state,
							selectedIndex: newIndex,
						} satisfies UnifiedLinkSuggestionState),
					);
					return true;
				}

				// Select current item with Tab or Enter
				if (event.key === "Tab" || event.key === "Enter") {
					event.preventDefault();

					debugLog("KeyHandler", `${event.key} key pressed`, {
						active: state.active,
						variant: state.variant,
						query: state.query,
						selectedIndex: state.selectedIndex,
						range: state.range,
					});

					// Immediately clear suggestion state to prevent InputRule from triggering again
					// This prevents duplicate processing when Enter/Tab creates a new line
					debugLog("KeyHandler", "Clearing suggestion state immediately");
					view.dispatch(
						view.state.tr.setMeta(suggestionPluginKey, {
							active: false,
							range: null,
							query: "",
							results: [],
							selectedIndex: -1,
						} satisfies UnifiedLinkSuggestionState),
					);

					// If no item is selected (selectedIndex === -1), use input text as-is
					if (state.selectedIndex === -1) {
						// Create link with input text
						debugLog("KeyHandler", "Creating link with input text", {
							query: state.query,
						});
						insertUnifiedLinkWithQuery(view, state);
						return true;
					}

					// Otherwise, use the selected item
					const selectedItem = state.results[state.selectedIndex];

					if (!selectedItem) {
						return false;
					}

					debugLog("KeyHandler", "Creating link with selected item", {
						title: selectedItem.title,
					});
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
							selectedIndex: -1,
						} satisfies UnifiedLinkSuggestionState),
					);
					return true;
				}

				// Handle Space key: create link with input text if tag pattern is active
				if (event.key === " " && state.variant === "tag") {
					event.preventDefault();

					// Immediately clear suggestion state to prevent InputRule from triggering again
					view.dispatch(
						view.state.tr.setMeta(suggestionPluginKey, {
							active: false,
							range: null,
							query: "",
							results: [],
							selectedIndex: -1,
						} satisfies UnifiedLinkSuggestionState),
					);

					// Create link with input text (includes the space)
					insertUnifiedLinkWithSpaceKey(view, state);
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
	item: { id: string; title: string; slug?: string },
) {
	if (!state.range) return;

	const { from, to } = state.range;
	const variant = state.variant || "bracket";
	const key = item.slug || item.title;

	// Create transaction to replace bracket content with UnifiedLink mark
	const tr = view.state.tr;

	if (variant === "bracket") {
		// For bracket notation, only replace the text content
		// The InputRule will handle the Mark conversion when user closes the bracket with ]
		tr.delete(from, to);
		tr.insertText(item.title, from);
	} else if (variant === "tag") {
		// Delete # and tag text
		tr.delete(from - 1, to);

		// Insert text with UnifiedLink mark (with # prefix)
		const markType = view.state.schema.marks.unifiedLink;
		if (markType) {
			const mark = markType.create({
				variant: "tag",
				raw: item.title,
				text: `#${item.title}`,
				key,
				pageId: item.id,
				href: `/notes/default/${item.id}`,
				state: "exists",
				exists: true,
				markId: `tag-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
			});

			tr.insert(from - 1, view.state.schema.text(`#${item.title}`, [mark]));
		}
	}

	// Clear suggestion state
	tr.setMeta(suggestionPluginKey, {
		active: false,
		range: null,
		query: "",
		results: [],
		selectedIndex: -1,
	} satisfies UnifiedLinkSuggestionState);

	view.dispatch(tr);
}

/**
 * Insert unified link using input query text when Space is pressed
 * Used for " #MyTag" + Space → creates link for "MyTag" and continues with space
 * The space is inserted after the link to allow normal text continuation
 */
function insertUnifiedLinkWithSpaceKey(
	view: EditorView,
	state: UnifiedLinkSuggestionState,
) {
	if (!state.range) return;

	const { from, to } = state.range;
	const variant = state.variant || "bracket";
	const rawQuery = state.query;

	// Create transaction
	const tr = view.state.tr;

	if (variant === "tag") {
		// For tag: delete # and tag text, insert with mark, then add space
		tr.delete(from - 1, to);

		const markType = view.state.schema.marks.unifiedLink;
		if (markType) {
			const key = rawQuery.toLowerCase();
			const mark = markType.create({
				variant: "tag",
				raw: rawQuery,
				text: `#${rawQuery}`,
				key,
				pageId: null,
				href: "#",
				state: "pending",
				exists: false,
				markId: `tag-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
			});

			// Insert link text and add space after it
			const insertPos = from - 1;
			tr.insert(insertPos, view.state.schema.text(`#${rawQuery}`, [mark]));
			tr.insert(insertPos + `#${rawQuery}`.length, view.state.schema.text(" "));
		}
	}

	// Clear suggestion state
	tr.setMeta(suggestionPluginKey, {
		active: false,
		range: null,
		query: "",
		results: [],
		selectedIndex: -1,
	} satisfies UnifiedLinkSuggestionState);

	view.dispatch(tr);
}
/**
 * Insert unified link using input query text (when no suggestion is selected)
 * Used for " #MyTag" + Enter → creates link with "MyTag"
 */
function insertUnifiedLinkWithQuery(
	view: EditorView,
	state: UnifiedLinkSuggestionState,
) {
	if (!state.range) return;

	const { from, to } = state.range;
	const variant = state.variant || "bracket";
	const rawQuery = state.query;

	debugLog("insertUnifiedLinkWithQuery", "Starting insertion", {
		from,
		to,
		variant,
		rawQuery,
		docContent: view.state.doc.textBetween(
			Math.max(0, from - 5),
			Math.min(view.state.doc.content.size, to + 5),
		),
	});

	// Create transaction
	const tr = view.state.tr;

	if (variant === "tag") {
		debugLog("insertUnifiedLinkWithQuery", "Deleting old content", {
			deleteFrom: from - 1,
			deleteTo: to,
		});
		// For tag: delete # and tag text, insert with mark
		tr.delete(from - 1, to);

		const markType = view.state.schema.marks.unifiedLink;
		if (markType) {
			const key = rawQuery.toLowerCase();
			const mark = markType.create({
				variant: "tag",
				raw: rawQuery,
				text: `#${rawQuery}`,
				key,
				pageId: null,
				href: "#",
				state: "pending",
				exists: false,
				markId: `tag-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
			});

			const insertText = `#${rawQuery}`;
			debugLog("insertUnifiedLinkWithQuery", "Inserting text with mark", {
				insertPos: from - 1,
				insertText,
			});
			tr.insert(from - 1, view.state.schema.text(insertText, [mark]));
		}
	}

	// Clear suggestion state
	tr.setMeta(suggestionPluginKey, {
		active: false,
		range: null,
		query: "",
		results: [],
		selectedIndex: -1,
	} satisfies UnifiedLinkSuggestionState);

	debugLog("insertUnifiedLinkWithQuery", "Dispatching transaction");
	view.dispatch(tr);
}
