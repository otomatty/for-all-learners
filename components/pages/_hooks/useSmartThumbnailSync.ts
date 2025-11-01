/**
 * スマートサムネイル同期フック
 * エディターの画像変更をリアルタイムで監視してサムネイルを自動更新
 */

import type { JSONContent } from "@tiptap/core";
import type { Editor } from "@tiptap/react";
import { useCallback, useEffect, useRef } from "react";
import { updatePage } from "@/app/_actions/updatePage";

interface UseSmartThumbnailSyncOptions {
	/** エディターインスタンス */
	editor: Editor | null;
	/** ページID */
	pageId: string;
	/** ページタイトル */
	title: string;
	/** 現在のサムネイルURL */
	currentThumbnailUrl: string | null;
	/** 同期の有効/無効（デフォルト: true） */
	enabled?: boolean;
	/** 同期の遅延時間（ミリ秒、デフォルト: 1000） */
	debounceMs?: number;
}

/**
 * エディターの画像変更を監視してサムネイルを自動同期するフック
 */
export function useSmartThumbnailSync({
	editor,
	pageId,
	title,
	currentThumbnailUrl: _currentThumbnailUrl,
	enabled = true,
	debounceMs = 1000,
}: UseSmartThumbnailSyncOptions) {
	const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const lastContentRef = useRef<JSONContent | null>(null);

	// サムネイル同期関数
	const syncThumbnail = useCallback(
		async (currentContent: JSONContent) => {
			try {
				await updatePage({
					id: pageId,
					title,
					content: JSON.stringify(currentContent),
					enableSmartThumbnailUpdate: true,
					autoGenerateThumbnail: true,
				});

				// 前回コンテンツを更新
				lastContentRef.current = structuredClone(currentContent);
			} catch (_error) {}
		},
		[pageId, title],
	);

	// デバウンス付きの同期実行
	const debouncedSync = useCallback(
		(content: JSONContent) => {
			if (syncTimeoutRef.current) {
				clearTimeout(syncTimeoutRef.current);
			}

			syncTimeoutRef.current = setTimeout(() => {
				void syncThumbnail(content);
			}, debounceMs);
		},
		[syncThumbnail, debounceMs],
	);

	// エディター更新イベントの監視
	useEffect(() => {
		if (!editor || !enabled) return;

		const onUpdate = () => {
			const currentContent = editor.getJSON() as JSONContent;
			debouncedSync(currentContent);
		};

		// エディターの更新イベントをリスニング
		editor.on("update", onUpdate);

		// 初期コンテンツを記録
		if (editor && !lastContentRef.current) {
			lastContentRef.current = editor.getJSON() as JSONContent;
		}

		return () => {
			editor.off("update", onUpdate);
			if (syncTimeoutRef.current) {
				clearTimeout(syncTimeoutRef.current);
			}
		};
	}, [editor, enabled, debouncedSync]);

	// クリーンアップ
	useEffect(() => {
		return () => {
			if (syncTimeoutRef.current) {
				clearTimeout(syncTimeoutRef.current);
			}
		};
	}, []);

	// 手動同期関数（必要に応じて外部から呼び出し可能）
	const manualSync = useCallback(() => {
		if (!editor) return;
		const currentContent = editor.getJSON() as JSONContent;
		void syncThumbnail(currentContent);
	}, [editor, syncThumbnail]);

	return {
		manualSync,
	};
}
