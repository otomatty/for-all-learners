import { InputRule, mergeAttributes, Node } from "@tiptap/core";
import katex from "katex";
import { type EditorState, Plugin } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";

export interface LatexInlineNodeOptions {
	HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
	interface Commands<ReturnType> {
		latexInlineNode: {
			/**
			 * Set a latex-inline node
			 */
			setLatexInlineNode: (options: { content: string }) => ReturnType;
		};
	}
}

export const LatexInlineNode = Node.create<LatexInlineNodeOptions>({
	name: "latexInlineNode",
	group: "inline",
	inline: true,
	atom: true, // Ensures the node is treated as a single, indivisible unit

	addOptions() {
		return {
			HTMLAttributes: {},
		};
	},

	addAttributes() {
		return {
			content: {
				default: "",
				parseHTML: (element) => element.getAttribute("data-latex-content"),
				renderHTML: (attributes) => {
					if (!attributes.content) {
						return {};
					}
					return { "data-latex-content": attributes.content };
				},
			},
		};
	},

	parseHTML() {
		return [
			{
				tag: "span[data-latex-inline]",
			},
		];
	},

	renderHTML({ HTMLAttributes, node }) {
		const latexContent = node.attrs.content;
		let html = "";
		try {
			html = katex.renderToString(latexContent, {
				throwOnError: false, // Don't throw errors, just log them
				displayMode: false, // Render inline
			});
		} catch (error: unknown) {
			if (error instanceof Error) {
			} else {
			}
			// Return the original content or an error message if KaTeX fails
			return [
				"span",
				mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
					"data-latex-inline": true,
					class: "latex-render-error",
				}),
				`Error: ${latexContent}`,
			];
		}

		const span = document.createElement("span");
		span.innerHTML = html;
		const katexElement = span.firstChild as HTMLElement; // KaTeX usually wraps in a .katex span

		return [
			"span",
			mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
				"data-latex-inline": true,
				// If KaTeX adds its own class like 'katex', we might not need an extra one
				// class: 'rendered-latex-inline'
			}),
			katexElement || `[KaTeX Error: ${latexContent}]`, // Return the KaTeX element or error
		];
	},

	// Return the original LaTeX string when editor.getText() is called
	// or when content is serialized to text.
	toPredictedText({ node }: { node: { attrs: { content: string } } }): string {
		return node.attrs.content;
	},

	addCommands() {
		return {
			setLatexInlineNode:
				(options) =>
				({ commands }) => {
					return commands.insertContent({
						type: this.name,
						attrs: options,
					});
				},
		};
	},

	addInputRules() {
		return [
			new InputRule({
				find: /\$([^$]+)\$/,
				handler: ({ range, match, commands }) => {
					const content = match[1];
					if (content) {
						commands.deleteRange(range);
						commands.insertContent({
							type: this.name,
							attrs: { content },
						});
					}
				},
			}),
		];
	},

	addProseMirrorPlugins() {
		return [
			new Plugin({
				props: {
					transformPastedHTML: (html: string): string => {
						return html;
					},
					transformPastedText(
						this: Plugin<EditorState>,
						text: string,
						_plain: boolean,
						_view: EditorView,
					): string {
						return text;
					},
				},
			}),
		];
	},
});
