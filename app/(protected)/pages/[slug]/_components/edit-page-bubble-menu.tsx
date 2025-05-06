"use client";

import { BubbleMenu } from "@tiptap/react";
import type { Editor } from "@tiptap/react";

interface EditPageBubbleMenuProps {
	editor: Editor | null;
	wrapSelectionWithPageLink: () => Promise<void>;
}

export function EditPageBubbleMenu({
	editor,
	wrapSelectionWithPageLink,
}: EditPageBubbleMenuProps) {
	if (!editor) return null;

	return (
		<BubbleMenu
			editor={editor}
			shouldShow={({ state }) => {
				const { from, to } = state.selection;
				return from < to;
			}}
			tippyOptions={{ duration: 100 }}
		>
			<div className="flex space-x-1 bg-tooltip text-tooltip-foreground shadow-md rounded p-1">
				<button
					type="button"
					onClick={() =>
						editor.chain().focus().toggleHeading({ level: 1 }).run()
					}
					className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800"
				>
					H1
				</button>
				<button
					type="button"
					onClick={() =>
						editor.chain().focus().toggleHeading({ level: 2 }).run()
					}
					className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800"
				>
					H2
				</button>
				<button
					type="button"
					onClick={() =>
						editor.chain().focus().toggleHeading({ level: 3 }).run()
					}
					className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800"
				>
					H3
				</button>
				<button
					type="button"
					onClick={() => editor.chain().focus().toggleBulletList().run()}
					className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800"
				>
					UL
				</button>
				<button
					type="button"
					onClick={wrapSelectionWithPageLink}
					className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800"
				>
					Link
				</button>
			</div>
		</BubbleMenu>
	);
}
