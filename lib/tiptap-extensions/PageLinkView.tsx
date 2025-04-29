import type React from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useEffect } from "react";

export default function PageLinkView({
	node,
	updateAttributes,
}: NodeViewProps) {
	const { pageName, pageId } = node.attrs as {
		pageName: string;
		pageId: string | null;
	};
	const supabase = createClient();

	// Check if page exists and update pageId attribute to change link color
	useEffect(() => {
		if (!pageId) {
			(async () => {
				const {
					data: { user },
				} = await supabase.auth.getUser();
				if (!user) return;
				const { data, error } = await supabase
					.from("pages")
					.select("id")
					.eq("user_id", user.id)
					.eq("title", pageName)
					.single();
				if (!error && data) {
					updateAttributes({ pageId: data.id });
				}
			})();
		}
	}, [pageId, pageName, updateAttributes, supabase]);

	const handleClick = async (e: React.MouseEvent) => {
		e.preventDefault();
		if (!pageId) {
			const user = await supabase.auth.getUser();
			if (!user.data.user) {
				toast.error("ログインしてください");
				return;
			}
			const { data, error } = await supabase
				.from("pages")
				.insert({
					user_id: user.data.user.id,
					title: pageName,
					content_tiptap: { type: "doc", content: [] },
					is_public: false,
				})
				.select("id")
				.single();
			if (!error && data) {
				updateAttributes({ pageId: data.id });
			}
		}
	};

	return (
		<NodeViewWrapper
			as="a"
			href={pageId ? `/pages/${pageId}` : undefined}
			className={pageId ? "text-blue-500 underline" : "text-red-500 underline"}
			onClick={handleClick}
			data-page-name={pageName}
		>
			{pageName}
		</NodeViewWrapper>
	);
}
