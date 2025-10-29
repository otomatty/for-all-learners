/**
 * Markdown Paste Extension
 *
 * Automatically converts Markdown syntax to Tiptap nodes when pasting
 * Handles common Markdown patterns including:
 * - Headings (##, ###, etc.)
 * - Bold (**text**)
 * - Italic (*text*)
 * - Links ([text](url))
 * - Lists (-, 1.)
 * - Code blocks (```language)
 * - Blockquotes (>)
 * - Inline code (`code`)
 * - Horizontal rules (---)
 */

import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";
import logger from "@/lib/logger";
import {
	containsMarkdownSyntax,
	parseMarkdownToNodes,
} from "../utils/markdownParser";

export interface MarkdownPasteOptions {
	/**
	 * Enable/disable Markdown paste conversion
	 */
	enabled: boolean;

	/**
	 * Debug mode - logs conversion details to console
	 */
	debug: boolean;
}

export const MarkdownPaste = Extension.create<MarkdownPasteOptions>({
	name: "markdownPaste",

	addOptions() {
		return {
			enabled: true,
			debug: false,
		};
	},

	addProseMirrorPlugins() {
		const { enabled, debug } = this.options;

		if (!enabled) {
			return [];
		}

		return [
			new Plugin({
				key: new PluginKey("markdownPasteHandler"),
				props: {
					handlePaste: (view, event) => {
						// Get pasted text
						const text = event.clipboardData?.getData("text/plain");

						if (!text) {
							if (debug) {
								logger.debug("MarkdownPaste: No text in clipboard");
							}
							return false;
						}

						// Check if text contains Markdown syntax
						if (!containsMarkdownSyntax(text)) {
							if (debug) {
								logger.debug("MarkdownPaste: No Markdown syntax detected");
							}
							return false;
						}

						if (debug) {
							logger.debug({ text }, "MarkdownPaste: Markdown syntax detected");
						}

						// Parse Markdown to nodes
						try {
							const nodes = parseMarkdownToNodes(text);

							if (nodes.length === 0) {
								if (debug) {
									logger.debug("MarkdownPaste: No nodes generated");
								}
								return false;
							}

							if (debug) {
								logger.debug({ nodes }, "MarkdownPaste: Parsed nodes");
							}

							// Create ProseMirror nodes from JSONContent
							const { schema, tr } = view.state;
							const proseMirrorNodes = nodes
								.map((nodeSpec) => {
									try {
										return schema.nodeFromJSON(nodeSpec);
									} catch (error) {
										if (debug) {
											logger.error(
												{ nodeSpec, error },
												"MarkdownPaste: Failed to create node",
											);
										}
										return null;
									}
								})
								.filter((node) => node !== null);

							if (proseMirrorNodes.length === 0) {
								if (debug) {
									logger.debug(
										"MarkdownPaste: No valid ProseMirror nodes created",
									);
								}
								return false;
							}

							// Insert nodes at current position
							const { from } = view.state.selection;
							let insertPos = from;

							for (const node of proseMirrorNodes) {
								if (node) {
									tr.insert(insertPos, node);
									insertPos += node.nodeSize;
								}
							}

							// Apply transaction
							view.dispatch(tr.scrollIntoView());

							if (debug) {
								logger.debug("MarkdownPaste: Successfully inserted nodes");
							}

							// Prevent default paste behavior
							return true;
						} catch (error) {
							logger.error({ error }, "MarkdownPaste: Error parsing Markdown");
							return false;
						}
					},
				},
			}),
		];
	},
});
