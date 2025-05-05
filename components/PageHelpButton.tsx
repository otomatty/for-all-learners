"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { ResponsiveDialog } from "@/components/responsive-dialog";
import { pageHelpConfig, type PageHelpConfig } from "@/lib/pageHelpConfig";
import type { ReactNode } from "react";
import { toggleHelpVideoAudioSetting } from "@/app/_actions/user_settings";

/**
 * ヘルプダイアログを表示するボタンコンポーネント
 * @param triggerIcon ボタンに表示するアイコン（指定しない場合はテキスト）
 * @param playAudio ヘルプ動画の音声を再生するか
 */
interface PageHelpButtonProps {
	/** ボタンに表示するアイコン（指定しない場合はテキスト） */
	triggerIcon?: ReactNode;
	/** ヘルプ動画の音声を再生するか */
	playAudio?: boolean;
}

export function PageHelpButton({
	triggerIcon,
	playAudio = false,
}: PageHelpButtonProps) {
	// 音声設定をローカル state で管理
	const [localPlayAudio, setLocalPlayAudio] = useState(playAudio);
	const pathname = usePathname();
	// 動的ルート含め、セグメントごとにマッチング
	const matchedRoute = Object.keys(pageHelpConfig).find((route) => {
		// パスを / で分割して空文字を除去
		const routeParts = route.split("/").filter(Boolean);
		const pathParts = pathname.split("/").filter(Boolean);
		if (routeParts.length !== pathParts.length) return false;
		// 各セグメントを比較: [param] はワイルドカード扱い
		return routeParts.every((rp, idx) =>
			rp.startsWith("[") && rp.endsWith("]") ? true : rp === pathParts[idx],
		);
	});
	const config = matchedRoute ? pageHelpConfig[matchedRoute] : undefined;

	if (!config) return null;

	// サーバーアクションで設定をトグル
	async function handleToggleAudio() {
		const updated = await toggleHelpVideoAudioSetting(localPlayAudio);
		setLocalPlayAudio(updated);
	}

	return (
		<ResponsiveDialog
			triggerText="ヘルプ"
			triggerIcon={triggerIcon}
			triggerButtonProps={{ variant: "ghost", size: "sm" }}
			dialogTitle="操作ガイド"
		>
			<div className="space-y-4">
				{config.mode === "video" ? (
					<>
						<iframe
							title="ヘルプ動画"
							width="100%"
							height="600"
							src={`https://www.youtube.com/embed/${config.videoId}?autoplay=1&mute=${localPlayAudio ? 0 : 1}`}
							allow="autoplay; encrypted-media; gyroscope; accelerometer"
							allowFullScreen
							className="rounded-md"
						/>
						<button
							type="button"
							className="mt-2 text-sm text-blue-600 underline"
							onClick={handleToggleAudio}
						>
							音声: {localPlayAudio ? "オン" : "オフ"}（クリックで切り替え）
						</button>
					</>
				) : (
					<ol className="list-decimal pl-4 space-y-2">
						{config.steps.map((step) => (
							<li key={step}>{step}</li>
						))}
					</ol>
				)}
			</div>
		</ResponsiveDialog>
	);
}
