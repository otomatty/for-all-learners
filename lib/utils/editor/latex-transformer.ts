import type { JSONContent } from "@tiptap/core";

/**
 * Text node type with marks for type safety
 */
interface JSONTextNode extends JSONContent {
	type: "text";
	text: string;
	marks?: Array<{ type: string; [key: string]: unknown }>;
}

/**
 * Convert inline LaTeX syntax ($...$) in text nodes to latexInlineNode nodes.
 *
 * This function searches for LaTeX expressions wrapped in dollar signs and converts
 * them to dedicated latexInlineNode nodes for proper rendering.
 *
 * @param doc - The JSONContent document to transform
 * @returns A new JSONContent document with LaTeX expressions converted to nodes
 *
 * @example
 * Input: { type: "text", text: "The formula $E=mc^2$ is famous" }
 * Output: [
 *   { type: "text", text: "The formula " },
 *   { type: "latexInlineNode", attrs: { content: "E=mc^2" } },
 *   { type: "text", text: " is famous" }
 * ]
 */
export function transformDollarInDoc(doc: JSONContent): JSONContent {
	const clone = structuredClone(doc) as JSONContent;
	const regex = /\$([^$]+)\$/g;

	clone.content =
		clone.content?.flatMap((child) =>
			transformNode(child as JSONContent, regex),
		) ?? [];
	return clone;
}

/**
 * Transform a single node, converting $...$ patterns to latexInlineNode
 *
 * @param node - The node to transform
 * @param regex - The regex pattern to match LaTeX expressions
 * @returns An array of transformed nodes
 */
function transformNode(node: JSONContent, regex: RegExp): JSONContent[] {
	// Text node: split by $...$
	if (node.type === "text") {
		return transformLatexInTextNode(node as JSONTextNode, regex);
	}

	// Recursively transform children
	if ("content" in node && Array.isArray(node.content)) {
		const transformedChildren = node.content.flatMap((child) =>
			transformNode(child as JSONContent, regex),
		);
		return [{ ...node, content: transformedChildren }];
	}

	return [node];
}

/**
 * Transform LaTeX expressions in a text node to separate nodes
 *
 * Splits text by $...$ patterns and creates latexInlineNode for each match.
 * Preserves marks from the original text node.
 *
 * @param textNode - The text node to transform
 * @param regex - The regex pattern to match LaTeX expressions
 * @returns An array of text and latexInlineNode nodes
 *
 * @example
 * Input: { type: "text", text: "Before $x^2$ after", marks: [{ type: "bold" }] }
 * Output: [
 *   { type: "text", text: "Before ", marks: [{ type: "bold" }] },
 *   { type: "latexInlineNode", attrs: { content: "x^2" } },
 *   { type: "text", text: " after", marks: [{ type: "bold" }] }
 * ]
 */
export function transformLatexInTextNode(
	textNode: JSONTextNode,
	regex: RegExp,
): JSONContent[] {
	const { text, marks } = textNode;
	const nodes: JSONContent[] = [];
	let lastIndex = 0;

	// Reset regex lastIndex for fresh search
	regex.lastIndex = 0;

	let match = regex.exec(text);
	while (match !== null) {
		const [full, content] = match;
		const index = match.index;

		// Add text before the match
		if (index > lastIndex) {
			nodes.push({
				type: "text",
				text: text.slice(lastIndex, index),
				marks,
			});
		}

		// Add the LaTeX node
		nodes.push({
			type: "latexInlineNode",
			attrs: { content },
		} as JSONContent);

		lastIndex = index + full.length;
		match = regex.exec(text);
	}

	// Add remaining text after the last match
	if (lastIndex < text.length) {
		nodes.push({
			type: "text",
			text: text.slice(lastIndex),
			marks,
		});
	}

	return nodes.length > 0 ? nodes : [textNode];
}
