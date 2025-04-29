import { Mark, markInputRule, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import PageLinkView from "./PageLinkView";

export const PageLink = Mark.create({
	name: "pageLink",
	addOptions() {
		return {};
	},
	addAttributes() {
		return {
			pageName: { default: null },
			pageId: { default: null },
		};
	},
	parseHTML() {
		return [{ tag: "a[data-page-name]" }];
	},
	renderHTML({ HTMLAttributes }) {
		return ["a", mergeAttributes(HTMLAttributes), 0];
	},
	addInputRules() {
		return [
			markInputRule({
				find: /\[\[([^\]]+)\]\]/,
				type: this.type,
				getAttributes: (match) => ({ pageName: match[1] }),
			}),
		];
	},
	addNodeView() {
		return ReactNodeViewRenderer(PageLinkView);
	},
});
