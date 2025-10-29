"use client";

import { HelpCircle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { toggleHelpVideoAudioSetting } from "@/app/_actions/user_settings";
import { ResponsiveDialog } from "@/components/layouts/ResponsiveDialog";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { pageHelpConfig } from "@/lib/pageHelpConfig";

/**
 * ヘルプダイアログを表示するボタンコンポーネント
 * @param triggerIcon ボタンに表示するアイコン（指定しない場合はテキスト）
 * @param playAudio ヘルプ動画の音声を再生するか
 */
interface PageHelpButtonProps {
	/** ヘルプ動画の音声を再生するか */
	playAudio?: boolean;
}

export function PageHelpButton({ playAudio = false }: PageHelpButtonProps) {
	const [isDialogOpen, setIsDialogOpen] = useState(false);
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
		<>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						onClick={() => setIsDialogOpen(true)}
					>
						<HelpCircle />
					</Button>
				</TooltipTrigger>
				<TooltipContent>このページの操作ガイドを表示します</TooltipContent>
			</Tooltip>
			<ResponsiveDialog
				open={isDialogOpen}
				onOpenChange={setIsDialogOpen}
				dialogTitle="操作ガイド"
				className="!max-w-5xl"
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
				<Link
					href="/help"
					className="text-sm text-blue-600 underline"
					target="_blank"
				>
					使い方を見る
				</Link>
			</ResponsiveDialog>
		</>
	);
}
