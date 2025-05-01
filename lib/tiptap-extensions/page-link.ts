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
		// Include href for static HTML rendering
		const href = HTMLAttributes.pageId
			? `/pages/${HTMLAttributes.pageId}`
			: undefined;
		return ["a", mergeAttributes(HTMLAttributes, { href }), 0];
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
		console.debug("[PageLink] addNodeView invoked");
		return ReactNodeViewRenderer(PageLinkView, {
			stopEvent: () => false,
		});
	},
});
