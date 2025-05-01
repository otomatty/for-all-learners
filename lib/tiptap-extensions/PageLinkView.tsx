"use client";

import type React from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PageLinkView({
	node,
	updateAttributes,
}: NodeViewProps) {
	console.debug("[PageLinkView] mounted", node.attrs);
	const router = useRouter();
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
		console.debug("[PageLinkView] handleClick", { pageName, pageId, event: e });
		e.preventDefault();
		console.debug("[PageLinkView] after preventDefault, pageId:", pageId);
		if (!pageId) {
			console.debug(
				"[PageLinkView] no pageId, creating new page with pageName:",
				pageName,
			);
			const user = await supabase.auth.getUser();
			if (!user.data.user) {
				console.debug("[PageLinkView] user not logged in");
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
				console.debug("[PageLinkView] new page created with id", data.id);
				updateAttributes({ pageId: data.id });
				router.push(`/pages/${data.id}`);
			}
		} else {
			console.debug("[PageLinkView] navigating to existing page id", pageId);
			router.push(`/pages/${pageId}`);
		}
	};

	return (
		<NodeViewWrapper
			as="a"
			href={pageId ? `/pages/${pageId}` : undefined}
			className={
				pageId
					? "text-blue-500 underline cursor-pointer"
					: "text-red-500 underline cursor-pointer"
			}
			onClick={handleClick}
			data-page-name={pageName}
		>
			{pageName}
		</NodeViewWrapper>
	);
}
