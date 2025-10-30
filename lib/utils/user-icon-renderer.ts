"use client";

import React from "react";
import { createRoot } from "react-dom/client";
import { UserIcon } from "@/components/ui/user-icon";

/**
 * DOM上のuser-icon-wrapperを実際のUserIconコンポーネントに置き換え
 */
export function renderUserIcons() {
	const iconWrappers = document.querySelectorAll(
		'[data-is-icon="true"]:not(.user-icon-rendered)',
	);

	for (const wrapper of iconWrappers) {
		const userSlug = wrapper.getAttribute("data-user-slug");
		const pageId = wrapper.getAttribute("data-page-id");

		if (!userSlug) return;

		// Reactコンポーネントをマウント
		const container = document.createElement("span");
		container.className = "user-icon-container inline-flex items-center";

		const root = createRoot(container);
		root.render(
			React.createElement(UserIcon, {
				userSlug,
				size: "sm",
				onClick: pageId
					? () => {
							const currentUrl = window.location.pathname;
							if (currentUrl.includes("/notes/")) {
								const noteSlug = currentUrl.split("/notes/")[1]?.split("/")[0];
								if (noteSlug) {
									window.location.href = `/notes/${encodeURIComponent(noteSlug)}/${pageId}`;
									return;
								}
							}

							window.location.href = `/notes/default/${pageId}`;
						}
					: undefined,
			}),
		);

		// 元の要素を置き換え
		wrapper.parentNode?.replaceChild(container, wrapper);
		container.classList.add("user-icon-rendered");
	}
}

/**
 * Tiptapエディターの更新時に呼び出すためのフック
 */
export function useUserIconRenderer(editor: unknown) {
	React.useEffect(() => {
		if (
			!editor ||
			typeof editor !== "object" ||
			!("on" in editor) ||
			!("off" in editor)
		)
			return;

		const handleUpdate = () => {
			// 少し遅延させてからレンダリング（DOMの更新を待つ）
			setTimeout(renderUserIcons, 100);
		};

		// エディター更新イベントをリッスン
		(editor as { on: (event: string, handler: () => void) => void }).on(
			"update",
			handleUpdate,
		);

		// 初回レンダリング
		setTimeout(renderUserIcons, 100);

		return () => {
			(editor as { off: (event: string, handler: () => void) => void }).off(
				"update",
				handleUpdate,
			);
		};
	}, [editor]);
}
