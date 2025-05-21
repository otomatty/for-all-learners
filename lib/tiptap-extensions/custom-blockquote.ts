import { mergeAttributes } from "@tiptap/core";
import Blockquote from "@tiptap/extension-blockquote";

export const CustomBlockquote = Blockquote.extend({
  renderHTML({ HTMLAttributes }) {
    return [
      "blockquote",
      mergeAttributes(HTMLAttributes, {
        class: "border-l-4 border-gray-500 pl-4 italic my-4",
      }),
      0,
    ];
  },
});
