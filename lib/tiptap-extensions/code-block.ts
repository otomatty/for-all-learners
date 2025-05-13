// lib/tiptap-extensions/code-block.ts
import type { Node } from "@tiptap/core";
import { textblockTypeInputRule } from "@tiptap/core";
import { createHighlighter } from "shiki";
import CodeBlockShiki, {
	type CodeBlockShikiOptions,
} from "tiptap-extension-code-block-shiki";

/**
 * Custom Shiki code block extension that supports fenced code blocks with syntax highlighting
 * and an additional input rule for code:{lang} syntax.
 */
export const CustomCodeBlock = CodeBlockShiki.extend({
	addInputRules() {
		const original = CodeBlockShiki.config.addInputRules?.call(this) ?? [];
		return [
			...original,
			textblockTypeInputRule({
				find: /^code:\{([A-Za-z0-9_-]+)\}$/,
				type: this.type,
				getAttributes: (match) => ({ language: match[1] }),
			}),
		];
	},
}).configure({
	defaultTheme: "tokyo-night",
});
