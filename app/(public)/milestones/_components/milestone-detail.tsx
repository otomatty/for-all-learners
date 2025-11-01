"use client";

import { CalendarClockIcon } from "lucide-react"; // XIconなどはResponsiveDialog側で持つため削除
import Image from "next/image";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getStatusAttributes, type MilestoneEntry } from "./milestone-timeline"; // 親コンポーネントから型と関数をインポート

interface MilestoneDetailProps {
	milestone: MilestoneEntry;
	onClose: () => void;
}

export default function MilestoneDetail({
	milestone,
	onClose,
}: MilestoneDetailProps) {
	const {
		label: statusLabel,
		icon: StatusIcon,
		badgeVariant: statusBadgeVariant,
		textColor: statusTextColor,
	} = getStatusAttributes(milestone.status);

	const [imageLoading, setImageLoading] = useState(!!milestone.imageUrl);

	useEffect(() => {
		if (milestone.imageUrl) {
			setImageLoading(true); // 画像URLがある場合、または変更された場合はローディング状態をリセット
		} else {
			setImageLoading(false); // 画像URLがない場合はローディングしない
		}
	}, [milestone.imageUrl]);

	// ダミーデータやプレースホルダー
	const features = milestone.features || [
		"この機能により、ユーザー体験が向上します。",
		"新しい分析ツールが利用可能になります。",
		"パフォーマンスが大幅に改善されました。",
	];
	const relatedLinks = milestone.relatedLinks || [
		{ label: "関連ブログ記事を読む", url: "#" },
		{ label: "ヘルプドキュメントを見る", url: "#" },
	];

	return (
		// ResponsiveDialogがヘッダーとモーダルの枠組みを提供するため、
		// ここではコンテンツとフッターの閉じるボタンのみをレンダリングします。
		<>
			<div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
				{" "}
				{/* DialogContent内でスクロール可能にする */}
				{/* 基本情報セクション */}
				<section className="space-y-3">
					<div className="flex flex-wrap gap-4 items-center">
						<Badge
							variant={statusBadgeVariant}
							className={`text-sm ${statusTextColor}`}
						>
							<StatusIcon className="h-4 w-4 mr-2" />
							{statusLabel}
						</Badge>
						<div className="flex items-center text-sm text-muted-foreground">
							<CalendarClockIcon className="h-4 w-4 mr-2" />
							{milestone.timeframe}
						</div>
					</div>

					{milestone.status === "in-progress" &&
						milestone.progress !== undefined && (
							<div>
								<div className="flex justify-between text-sm mb-1">
									<span>進捗</span>
									<span>{milestone.progress}%</span>
								</div>
								<Progress value={milestone.progress} className="w-full h-3" />
							</div>
						)}
				</section>
				{/* 詳細説明 */}
				<section>
					<h2 className="text-lg font-semibold mb-2">概要</h2>
					<p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
						{milestone.description}
					</p>
				</section>
				{/* 主要な機能・変更点 (ダミー) */}
				<section>
					<h2 className="text-lg font-semibold mb-2">主なポイント</h2>
					<ul className="list-disc list-inside text-muted-foreground space-y-1">
						{features.map((feature, _index) => (
							<li key={feature}>{feature}</li>
						))}
					</ul>
				</section>
				{/* ビジュアルコンテンツ */}
				{milestone.imageUrl && ( // milestone.imageUrlが存在する場合のみこのセクションを表示
					<section>
						<h2 className="text-lg font-semibold mb-2">イメージ</h2>
						<div className="relative w-full aspect-[16/9] bg-muted rounded-lg overflow-hidden">
							{imageLoading && (
								<div className="absolute inset-0 w-full h-full bg-secondary animate-pulse" />
							)}
							<Image
								src={milestone.imageUrl}
								alt={
									milestone.title
										? `${milestone.title} のイメージ`
										: "マイルストーンイメージ"
								}
								fill
								className={`object-cover transition-opacity duration-300 ${imageLoading ? "opacity-0" : "opacity-100"}`}
								onLoad={() => setImageLoading(false)}
								onError={() => {
									setImageLoading(false); // エラー時もスケルトンを非表示
								}}
							/>
						</div>
					</section>
				)}
				{/* 関連情報・リンク (ダミー) */}
				<section>
					<h2 className="text-lg font-semibold mb-2">関連情報</h2>
					<ul className="space-y-1">
						{relatedLinks.map((link, _index) => (
							<li key={link.url}>
								<a
									href={link.url}
									target="_blank"
									rel="noopener noreferrer"
									className="text-primary hover:underline"
								>
									{link.label}
								</a>
							</li>
						))}
					</ul>
				</section>
			</div>
			<footer className="p-4 border-t flex justify-end">
				{" "}
				{/* p-6 から p-4 に変更 */}
				<Button onClick={onClose}>閉じる</Button>
			</footer>
		</>
	);
}
