import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";
import tippy, { type Instance, type Props } from "tippy.js";
import { searchPages } from "@/lib/utils/searchPages";

// State for tag suggestion
interface TagSuggestionState {
	suggesting: boolean;
	range: { from: number; to: number } | null;
	items: Array<{ id: string; title: string }>;
	activeIndex: number;
	query: string;
}

// Plugin key
const tagSuggestionPluginKey = new PluginKey<TagSuggestionState>(
	"tagSuggestion",
);

// Tag suggestion plugin
const tagSuggestionPlugin = new Plugin<TagSuggestionState>({
	key: tagSuggestionPluginKey,
	state: {
		init: () => ({
			suggesting: false,
			range: null,
			items: [],
			activeIndex: 0,
			query: "",
		}),
		apply(tr, prev) {
			const meta = tr.getMeta(tagSuggestionPluginKey) as
				| TagSuggestionState
				| undefined;
			return meta ?? prev;
		},
	},
	view(view) {
		let timeoutId: number | null = null;
		let tip: Instance<Props> | null = null;

		return {
			update(view) {
				const prev = tagSuggestionPluginKey.getState(
					view.state,
				) as TagSuggestionState;
				const { $from } = view.state.selection;
				const paraStart = $from.start($from.depth);
				const paraEnd = $from.end($from.depth);
				const text = view.state.doc.textBetween(paraStart, paraEnd, "", "");
				const posInPara = $from.pos - paraStart;

				// Detect #text range
				const hashIndex = text.lastIndexOf("#", posInPara - 1);
				if (hashIndex !== -1 && posInPara > hashIndex + 0) {
					// find end: next whitespace or punctuation
					const rest = text.slice(hashIndex + 1);
					const spaceRel = rest.search(/[\s\.,!?;:]/);
					const endInPara =
						spaceRel === -1 ? text.length : hashIndex + 1 + spaceRel;
					if (posInPara <= endInPara) {
						const rangeFrom = paraStart + hashIndex;
						const rangeTo = paraStart + endInPara;
						const query = text.slice(hashIndex + 1, endInPara);
						// Only show suggestions for non-empty query
						if (query.length > 0) {
							if (
								!prev.suggesting ||
								!prev.range ||
								prev.range.from !== rangeFrom ||
								prev.range.to !== rangeTo ||
								prev.query !== query
							) {
								if (timeoutId) clearTimeout(timeoutId);
								timeoutId = window.setTimeout(async () => {
									const items = await searchPages(query);
									view.dispatch(
										view.state.tr.setMeta(tagSuggestionPluginKey, {
											suggesting: true,
											range: { from: rangeFrom, to: rangeTo },
											items,
											activeIndex: 0,
											query,
										}),
									);
								}, 300);
							}
						} else if (prev.suggesting) {
							// clear suggestion state when query empty
							if (timeoutId) clearTimeout(timeoutId);
							view.dispatch(
								view.state.tr.setMeta(tagSuggestionPluginKey, {
									suggesting: false,
									range: null,
									items: [],
									activeIndex: 0,
									query: "",
								}),
							);
						}
					} else if (prev.suggesting) {
						// out of tag range: clear
						if (timeoutId) clearTimeout(timeoutId);
						view.dispatch(
							view.state.tr.setMeta(tagSuggestionPluginKey, {
								suggesting: false,
								range: null,
								items: [],
								activeIndex: 0,
								query: "",
							}),
						);
					}
				} else if (prev.suggesting) {
					// out of tag range: clear
					if (timeoutId) clearTimeout(timeoutId);
					view.dispatch(
						view.state.tr.setMeta(tagSuggestionPluginKey, {
							suggesting: false,
							range: null,
							items: [],
							activeIndex: 0,
							query: "",
						}),
					);
				}

				// Show/hide Tippy tooltip
				const state = tagSuggestionPluginKey.getState(
					view.state,
				) as TagSuggestionState;
				if (state.suggesting && state.range) {
					const { from, to } = state.range;
					const coords = view.coordsAtPos(from);
					const makeList = () => {
						const list = document.createElement("div");
						list.className = "tag-suggestion-list";
						state.items.forEach((item, i) => {
							const div = document.createElement("div");
							div.textContent = item.title;
							// click to select
							div.addEventListener("mousedown", (e) => {
								e.preventDefault();
								const tagText = item.title.replace(/\s+/g, "_");
								view.dispatch(
									view.state.tr
										.insertText(`#${tagText}`, from, to)
										.setMeta(tagSuggestionPluginKey, {
											suggesting: false,
											range: null,
											items: [],
											activeIndex: 0,
											query: "",
										}),
								);
								tip?.hide();
							});
							div.className = `suggestion-item${i === state.activeIndex ? " active" : ""}`;
							list.appendChild(div);
						});
						return list;
					};

					if (!tip) {
						tip = tippy(document.body, {
							trigger: "manual",
							interactive: true,
							placement: "bottom-start",
							arrow: false,
							getReferenceClientRect: () =>
								new DOMRect(coords.left, coords.bottom, 0, 0),
							content: makeList(),
						});
					} else {
						tip.setContent(makeList());
						tip.setProps({
							getReferenceClientRect: () =>
								new DOMRect(coords.left, coords.bottom, 0, 0),
						});
					}
					tip.show();
				} else if (tip) {
					tip.hide();
				}
			},
			destroy() {
				if (timeoutId) clearTimeout(timeoutId);
				tip?.destroy();
				tip = null;
			},
		};
	},

	props: {
		handleKeyDown(view, event) {
			const state = tagSuggestionPluginKey.getState(
				view.state,
			) as TagSuggestionState;
			if (!state.suggesting || !state.range) return false;
			if (event.key === "ArrowDown" || event.key === "ArrowUp") {
				event.preventDefault();
				const dir = event.key === "ArrowDown" ? 1 : -1;
				const newIndex =
					(state.activeIndex + dir + state.items.length) % state.items.length;
				view.dispatch(
					view.state.tr.setMeta(tagSuggestionPluginKey, {
						...state,
						activeIndex: newIndex,
					}),
				);
				return true;
			}
			if (event.key === "Tab" || event.key === "Enter") {
				event.preventDefault();
				const item = state.items[state.activeIndex];
				if (!item) return false;
				const { from, to } = state.range;
				const tagText = item.title.replace(/\s+/g, "_");
				view.dispatch(
					view.state.tr
						.insertText(`#${tagText}`, from, to)
						.setMeta(tagSuggestionPluginKey, {
							suggesting: false,
							range: null,
							items: [],
							activeIndex: 0,
							query: "",
						}),
				);
				return true;
			}
			return false;
		},
	},
});

// Export TagLink extension
export const TagLink = Extension.create({
	name: "tagLink",
	addProseMirrorPlugins() {
		return [tagSuggestionPlugin];
	},
});
