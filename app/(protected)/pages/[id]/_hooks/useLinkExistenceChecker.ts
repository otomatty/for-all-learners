import { existencePluginKey } from "@/lib/tiptap-extensions/page-link";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Editor } from "@tiptap/react";
import { useEffect, useRef } from "react";

/**
 * Hook to check and set existence metadata for page and tag links.
 */
export function useLinkExistenceChecker(
	editor: Editor | null,
	supabase: SupabaseClient,
) {
	const existenceTimeout = useRef<NodeJS.Timeout | null>(null);
	const hasInitialCheck = useRef<boolean>(false);

	useEffect(() => {
		if (!editor) return;

		const checkExistence = async (immediate = false) => {
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

			// 存在確認状態を設定
			const tr = editor.state.tr.setMeta(existencePluginKey, existMap);
			editor.view.dispatch(tr);

			if (!hasInitialCheck.current) {
				hasInitialCheck.current = true;
			}
		};

		const debouncedHandler = (immediate = false) => {
			// 初回またはimmediateフラグがtrueの場合は即座に実行
			const delay = immediate || !hasInitialCheck.current ? 0 : 500;

			if (existenceTimeout.current) clearTimeout(existenceTimeout.current);
			existenceTimeout.current = setTimeout(
				() => checkExistence(immediate),
				delay,
			);
		};

		const updateHandler = () => debouncedHandler(false);

		editor.on("update", updateHandler);

		// 初回は即座に実行
		debouncedHandler(true);

		return () => {
			editor.off("update", updateHandler);
			if (existenceTimeout.current) clearTimeout(existenceTimeout.current);
		};
	}, [editor, supabase]);
}
