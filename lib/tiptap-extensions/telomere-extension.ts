/**
 * Telomere Extension
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ components/pages/_hooks/usePageEditorLogic.ts
 *
 * Dependencies (External files that this file imports/uses):
 *   ├─ lib/utils/telomere-calculator.ts
 *   └─ @tiptap/core, @tiptap/starter-kit
 *
 * Related Documentation:
 *   ├─ Issue: https://github.com/otomatty/for-all-learners/issues/139
 *   ├─ Plan: docs/03_plans/telomere-feature/
 *   └─ Spec: lib/tiptap-extensions/telomere-extension.spec.md
 */

import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";
import { getTelomereStyle } from "@/lib/utils/telomere-calculator";

export interface TelomereExtensionOptions {
	/**
	 * Timestamp when the user last visited the page
	 * Used to determine which lines are unread (green)
	 */
	lastVisitedAt: Date | null;
	/**
	 * Whether to enable telomere visualization
	 * Default: true
	 */
	enabled: boolean;
}

/**
 * Block node types that should have telomere visualization
 */
const BLOCK_NODE_TYPES = [
	"paragraph",
	"heading",
	"listItem",
	"blockquote",
	"codeBlock",
];

/**
 * Telomere Extension for TipTap
 *
 * Adds telomere visualization to block elements:
 * - Lines get thinner as they age (based on updatedAt timestamp)
 * - Unread lines (updated after last visit) are shown in green
 * - Minimum width is 1px (lines never completely disappear)
 */
export const TelomereExtension = Extension.create<TelomereExtensionOptions>({
	name: "telomere",

	addOptions() {
		return {
			lastVisitedAt: null,
			enabled: true,
		};
	},

	addGlobalAttributes() {
		return [
			{
				types: BLOCK_NODE_TYPES,
				attributes: {
					updatedAt: {
						default: null,
						parseHTML: (element) => {
							const attr = element.getAttribute("data-updated-at");
							return attr ? attr : null;
						},
						renderHTML: (attributes) => {
							if (!attributes.updatedAt) return {};
							return {
								"data-updated-at": attributes.updatedAt,
							};
						},
					},
				},
			},
		];
	},

	addProseMirrorPlugins() {
		const { enabled, lastVisitedAt } = this.options;

		if (!enabled) {
			return [];
		}

		return [
			new Plugin({
				key: new PluginKey("telomere"),

				// Update updatedAt when content changes
				appendTransaction(transactions, _oldState, newState) {
					// Skip if no document changes
					const docChanged = transactions.some((tr) => tr.docChanged);
					if (!docChanged) return null;

					// Skip our own transactions to prevent infinite loop
					const isOwnTransaction = transactions.some((tr) =>
						tr.getMeta("telomere"),
					);
					if (isOwnTransaction) return null;

					const now = new Date();
					const tr = newState.tr;
					let modified = false;
					const processedNodes = new Set<number>();
					const isPaste = transactions.some((tr) => tr.getMeta("pasted"));

					// 1. Update nodes that were directly changed in this transaction
					// Use selection range as a proxy for changed content (more efficient than scanning entire doc)
					transactions.forEach((transaction) => {
						if (!transaction.docChanged) return;

						// Use selection range to identify which nodes might have been modified
						const selection = newState.selection;
						const selectionFrom = Math.max(0, selection.from - 100);
						const selectionTo = Math.min(
							newState.doc.content.size,
							selection.to + 100,
						);

						newState.doc.nodesBetween(selectionFrom, selectionTo, (node, pos) => {
							if (
								BLOCK_NODE_TYPES.includes(node.type.name) &&
								!processedNodes.has(pos)
							) {
								tr.setNodeMarkup(pos, undefined, {
									...node.attrs,
									updatedAt: now.toISOString(),
								});
								modified = true;
								processedNodes.add(pos);
							}
						});
					});

					// 2. Backfill `updatedAt` for nodes that don't have it, but only on paste
					if (isPaste) {
						newState.doc.nodesBetween(
							0,
							newState.doc.content.size,
							(node, pos) => {
								if (
									BLOCK_NODE_TYPES.includes(node.type.name) &&
									!node.attrs.updatedAt &&
									!processedNodes.has(pos)
								) {
									tr.setNodeMarkup(pos, undefined, {
										...node.attrs,
										updatedAt: now.toISOString(),
									});
									modified = true;
									processedNodes.add(pos);
								}
							},
						);
					}

					if (!modified) return null;

					// Mark this transaction as coming from telomere plugin
					tr.setMeta("telomere", true);
					return tr;
				},

				// Apply telomere styles to rendered DOM elements
				view(view) {
					// Function to apply telomere styles to all block elements
					const applyTelomereStyles = () => {
						const dom = view.dom;
						const blockSelectors = [
							"p[data-updated-at]",
							"h1[data-updated-at], h2[data-updated-at], h3[data-updated-at], h4[data-updated-at], h5[data-updated-at], h6[data-updated-at]",
							"li[data-updated-at]",
							"blockquote[data-updated-at]",
							"pre[data-updated-at]",
						].join(", ");

						const blockElements = dom.querySelectorAll(blockSelectors);

						blockElements.forEach((element) => {
							const htmlElement = element as HTMLElement;
							const updatedAtAttr = htmlElement.getAttribute("data-updated-at");

							if (!updatedAtAttr) {
								// Remove telomere styles if no updatedAt
								htmlElement.style.borderLeft = "";
								htmlElement.style.paddingLeft = "";
								return;
							}

							const style = getTelomereStyle(updatedAtAttr, lastVisitedAt);

							htmlElement.style.borderLeftWidth = `${style.width}px`;
							htmlElement.style.borderLeftStyle = "solid";
							htmlElement.style.borderLeftColor = style.color;
							htmlElement.style.paddingLeft = "0.5rem";
						});
					};

					// Apply styles initially
					requestAnimationFrame(applyTelomereStyles);

					return {
						update: (updatedView, prevState) => {
							// Apply styles only if the document has actually changed
							if (!prevState.doc.eq(updatedView.state.doc)) {
								// Using requestAnimationFrame for smoother rendering
								requestAnimationFrame(applyTelomereStyles);
							}
						},
					};
				},
			}),
		];
	},
});
