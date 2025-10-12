"use client";

import { Highlight } from "@/lib/tiptap-extensions/highlight-extension";
import { UnifiedLinkMark } from "@/lib/tiptap-extensions/unified-link-mark";
import type { JSONContent } from "@tiptap/core";
import Image from "@tiptap/extension-image"; // Imageエクステンションをインポート
import LinkExtension from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align"; // TextAlignをインポート
import Typography from "@tiptap/extension-typography"; // Typographyをインポート
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
/**
 * RichContent component: renders Tiptap JSON content with Link, PageLink, and Highlight extensions,
 * and applies the Highlight mark to occurrences of a given keyword.
 */
import React from "react";

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
          transformNode(child, keyword)
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
      StarterKit.configure({
        // 必要に応じてStarterKitのオプションを設定
      }),
      LinkExtension.configure({
        HTMLAttributes: { className: "text-blue-500 underline" },
        openOnClick: false,
        autolink: true,
      }),
      Image.configure({
        inline: false,
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Typography,
      UnifiedLinkMark,
      Highlight,
    ],
    editable: false,
    content: processedDoc,
    editorProps: {},
  });

  if (!editor) return null;
  return (
    <div className="rich-content">
      <EditorContent editor={editor} />
    </div>
  );
}
