"use client";

/**
 * RichContent component: renders Tiptap JSON content with Link, PageLink, and Highlight extensions,
 * and applies the Highlight mark to occurrences of a given keyword.
 */
import React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import { PageLink } from "@/lib/tiptap-extensions/page-link";
import { Highlight } from "@/lib/tiptap-extensions/highlight-extension";
import type { JSONContent } from "@tiptap/core";

interface RichContentProps {
	/** The Tiptap JSONContent to render */
	content?: unknown;
	/** Optional keyword to highlight across the content */
	highlight?: string | null;
}

/**
 * Recursively transforms a node to highlight keyword occurrences.
 * Splits text nodes on the keyword and wraps matches with highlight marks.
 */
function transformNode(node: JSONContent, keyword: string): JSONContent[] {
	if (node.type === "text" && typeof node.text === "string") {
		const text = node.text;
		if (!keyword || !text.includes(keyword)) {
			return [node];
		}
		const parts = text.split(keyword);
		const result: JSONContent[] = [];
		parts.forEach((part, idx) => {
			if (idx > 0) {
				result.push({
					type: "text",
					text: keyword,
					marks: [{ type: "highlight" }],
				});
			}
			if (part) {
				result.push({ type: "text", text: part });
			}
		});
		return result;
	}
	if (node.content && Array.isArray(node.content)) {
		return [
			{
				...node,
				content: node.content.flatMap((child: JSONContent) =>
					transformNode(child, keyword),
				),
			},
		];
	}
	return [node];
}

/**
 * Applies keyword highlighting across the entire JSONContent document.
 */
function transformContent(doc: JSONContent, keyword: string): JSONContent {
	const newContent =
		doc.content?.flatMap((node: JSONContent) => transformNode(node, keyword)) ??
		[];
	return { ...doc, content: newContent };
}

/**
 * RichContent React component.
 */
export function RichContent({ content, highlight }: RichContentProps) {
	const doc = (content as JSONContent) ?? { type: "doc", content: [] };
	const processedDoc = highlight ? transformContent(doc, highlight) : doc;
	const editor = useEditor({
		extensions: [
			StarterKit,
			LinkExtension.configure({
				HTMLAttributes: { className: "text-blue-500 underline" },
			}),
			PageLink,
			Highlight,
		],
		editable: false,
		content: processedDoc,
		editorProps: {
			handleDOMEvents: {
				click: (_view, event) => {
					return false;
				},
			},
		},
	});

	if (!editor) return null;
	return (
		<div className="rich-content">
			<EditorContent editor={editor} />
		</div>
	);
}
