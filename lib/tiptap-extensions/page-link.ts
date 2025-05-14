import { createClient } from "@/lib/supabase/client";
import { Mark, markInputRule, mergeAttributes } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";
import { toast } from "sonner";

// Create a single plugin key and instance to avoid duplicate instances
const pageLinkPluginKey = new PluginKey("pageLinkPlugin");
const pageLinkPlugin = new Plugin({
	key: pageLinkPluginKey,
	props: {
		handleDOMEvents: {
			click: (view, event: MouseEvent) => {
				const anchor = (event.target as HTMLElement).closest(
					"a[data-page-name]",
				);
				if (!anchor) return false;
				event.preventDefault();
				event.stopPropagation();
				const pageName = anchor.getAttribute("data-page-name") ?? "";
				const pageId = anchor.getAttribute("data-page-id");
				(async () => {
					const supabase = createClient();
					const {
						data: { user },
						error: authError,
					} = await supabase.auth.getUser();
					if (authError || !user) {
						toast.error("ログインしてください");
						return;
					}
					let id = pageId ?? "";
					if (!id) {
						const { data: newPage, error: insertError } = await supabase
							.from("pages")
							.insert({
								user_id: user.id,
								title: pageName,
								content_tiptap: { type: "doc", content: [] },
								is_public: false,
							})
							.select("id")
							.single();
						if (insertError || !newPage) {
							toast.error("ページの作成に失敗しました");
							return;
						}
						id = newPage.id;
						const { tr } = view.state;
						const markType = view.state.schema.marks.pageLink;
						const mark = markType.create({ pageName, pageId: id });
						const pos = view.posAtDOM(anchor, 0);
						view.dispatch(
							tr.addMark(pos, pos + (anchor.textContent ?? "").length, mark),
						);
					}
					window.location.href = `/pages/${id}?newPage=true`;
				})();
				return true;
			},
		},
	},
});

export const PageLink = Mark.create({
	name: "pageLink",
	addOptions() {
		return {};
	},
	addAttributes() {
		return {
			pageName: { default: null },
			pageId: { default: null },
			href: { default: null },
		};
	},
	parseHTML() {
		return [{ tag: "a[data-page-name]" }, { tag: "a[href]" }];
	},
	renderHTML({ HTMLAttributes }) {
		const { pageName, pageId, href } = HTMLAttributes;
		const resolvedHref = href ?? (pageId ? `/pages/${pageId}` : undefined);
		const className = pageId
			? "text-blue-500 cursor-pointer"
			: href
				? "text-blue-500 underline cursor-pointer"
				: "text-red-500 cursor-pointer";
		return [
			"a",
			mergeAttributes(HTMLAttributes, {
				...(pageName ? { "data-page-name": pageName } : {}),
				...(pageId ? { "data-page-id": pageId } : {}),
				...(resolvedHref ? { href: resolvedHref } : {}),
				class: className,
			}),
			0,
		];
	},
	addInputRules() {
		return [
			markInputRule({
				find: /\[([^\]]+)\]/,
				type: this.type,
				getAttributes: (match) => {
					const text = match[1];
					if (/^https?:\/\//.test(text)) {
						return { href: text };
					}
					return { pageName: text };
				},
			}),
		];
	},
	addProseMirrorPlugins() {
		return [pageLinkPlugin];
	},
});
