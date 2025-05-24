import { useEffect, useRef } from "react";
import type { Editor } from "@tiptap/react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { existencePluginKey } from "@/lib/tiptap-extensions/page-link";

/**
 * Hook to check and set existence metadata for page and tag links.
 */
export function useLinkExistenceChecker(
	editor: Editor | null,
	supabase: SupabaseClient,
) {
	const existenceTimeout = useRef<NodeJS.Timeout | null>(null);

	useEffect(() => {
		if (!editor) return;
		const checkExistence = async () => {
			const fullText = editor.getText();
			const bracketMatches = Array.from(fullText.matchAll(/\[([^\[\]]+)\]/g));
			const tagMatches = Array.from(fullText.matchAll(/#([^\s\[\]]+)/g));
			const titles = Array.from(
				new Set([
					...bracketMatches.map((m) => m[1]),
					...tagMatches.map((m) => m[1]),
				]),
			);
			const existMap = new Map<string, string | null>();
			if (titles.length > 0) {
				const { data: pages } = await supabase
					.from("pages")
					.select("title,id")
					.in("title", titles);
				const pageMap = new Map<string, string>(
					(pages ?? []).map((p) => [p.title, p.id]),
				);
				for (const t of titles) {
					existMap.set(t, pageMap.get(t) ?? null);
				}
			}
			const tr = editor.state.tr.setMeta(existencePluginKey, existMap);
			editor.view.dispatch(tr);
		};

		const handler = () => {
			if (existenceTimeout.current) clearTimeout(existenceTimeout.current);
			existenceTimeout.current = setTimeout(checkExistence, 500);
		};

		editor.on("update", handler);
		handler();
		return () => {
			editor.off("update", handler);
			if (existenceTimeout.current) clearTimeout(existenceTimeout.current);
		};
	}, [editor, supabase]);
}
