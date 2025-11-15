import { mergeAttributes } from "@tiptap/core";
import HorizontalRule from "@tiptap/extension-horizontal-rule";

/**
 * CustomHorizontalRule
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   ├─ components/tiptap-editor.tsx
 *   └─ components/pages/_hooks/usePageEditorLogic.ts
 *
 * Dependencies (External files that this file imports):
 *   ├─ @tiptap/core (mergeAttributes)
 *   └─ @tiptap/extension-horizontal-rule (HorizontalRule)
 *
 * Related Documentation:
 *   └─ (To be added)
 */
export const CustomHorizontalRule = HorizontalRule.extend({
	renderHTML({ HTMLAttributes }) {
		return [
			"hr",
			mergeAttributes(HTMLAttributes, {
				class: "custom-horizontal-rule",
				style:
					"display: block; margin: 0; padding: 2rem 0; border: none; width: 100%; position: relative; background: transparent; overflow: visible;",
			}),
		];
	},
});
