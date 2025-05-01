"use client";

import React, { Suspense } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import { PageLink } from "@/lib/tiptap-extensions/page-link";
import { Highlight } from "@/lib/tiptap-extensions/highlight-extension";
import { Loader2 } from "lucide-react";
import type { JSONContent } from "@tiptap/core";

interface PageContentProps {
	/** The Tiptap JSONContent document to render */
	content: JSONContent;
}

export function PageContent({ content }: PageContentProps) {
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
		content,
		editorProps: {
			attributes: {
				class:
					"prose prose-sm sm:prose lg:prose-lg mx-auto min-h-[200px] px-3 py-2",
			},
		},
	});

	if (!editor) return null;

	return (
		<div className="rich-content min-h-[200px]">
			<Suspense
				fallback={
					<div className="flex justify-center items-center min-h-[200px]">
						<Loader2 className="animate-spin" />
					</div>
				}
			>
				<EditorContent editor={editor} />
			</Suspense>
		</div>
	);
}
