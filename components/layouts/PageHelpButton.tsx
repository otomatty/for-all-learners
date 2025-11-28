"use client";

import { HelpCircle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ResponsiveDialog } from "@/components/layouts/ResponsiveDialog";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	useUpdateUserSettings,
	useUserSettings,
} from "@/hooks/user_settings/useUserSettings";
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
	const { data: userSettings } = useUserSettings();
	const updateUserSettings = useUpdateUserSettings();
	// 音声設定をローカル state で管理（初期値はuserSettingsから取得）
	const [localPlayAudio, setLocalPlayAudio] = useState(
		userSettings?.play_help_video_audio ?? playAudio,
	);
	const pathname = usePathname();

	// userSettingsが変更されたときにlocalPlayAudioを更新
	useEffect(() => {
		if (userSettings?.play_help_video_audio !== undefined) {
			setLocalPlayAudio(userSettings.play_help_video_audio);
		}
	}, [userSettings?.play_help_video_audio]);

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

	// 設定をトグル
	const handleToggleAudio = () => {
		const newValue = !localPlayAudio;
		setLocalPlayAudio(newValue);
		updateUserSettings.mutate({
			play_help_video_audio: newValue,
		});
	};

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
