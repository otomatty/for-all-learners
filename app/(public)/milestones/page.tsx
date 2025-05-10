import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import {
	LightbulbIcon, // 計画中・アイデア
	ConstructionIcon, // 開発中
	CheckCircle2Icon, // 完了
	RocketIcon, // ローンチ・リリース
	PauseCircleIcon, // 保留・延期
	CalendarClockIcon, // 時期
} from "lucide-react";
import React from "react";

export const metadata: Metadata = {
	title: "マイルストーン - For All Learners",
	description:
		"For All Learners アプリケーションの今後の開発計画と目標をご紹介します。",
};

type MilestoneStatus =
	| "planning" // 計画中
	| "in-progress" // 開発中
	| "completed" // 完了 (過去のマイルストーン)
	| "launched" // ローンチ済み (過去の大きなリリース)
	| "on-hold"; // 保留・延期

interface MilestoneEntry {
	id: string;
	/** 時期 (例: "2024年 Q4", "2025年前半", "近日公開") */
	timeframe: string;
	title: string;
	description: string;
	status: MilestoneStatus;
	/** 開発中の場合の進捗 (0-100) */
	progress?: number;
}

// ダミーデータ: 実際にはCMSやデータベース、または静的なファイルから取得することを推奨します
const milestoneData: MilestoneEntry[] = [
	{
		id: "community-feature",
		timeframe: "2024年 Q4 予定",
		title: "コミュニティ機能の導入",
		description:
			"ユーザー同士が学びを共有し、モチベーションを高め合えるコミュニティ機能を追加します。フォーラムやグループ学習などが含まれる予定です。",
		status: "planning",
	},
	{
		id: "ai-assistant",
		timeframe: "2025年 Q1 予定",
		title: "AI学習アシスタント機能",
		description:
			"AIを活用したパーソナル学習アシスタントを導入し、個々の進捗に合わせた最適な学習プランの提案や質問応答を行います。",
		status: "planning",
	},
	{
		id: "v2-release",
		timeframe: "2024年 夏 ローンチ済",
		title: "For All Learners v2.0 リリース",
		description:
			"UI/UXの大幅な改善、パフォーマンス向上、そして新しいコア学習モジュールを搭載したメジャーバージョンをリリースしました。",
		status: "launched",
	},
	{
		id: "advanced-analytics",
		timeframe: "2024年 Q3 開発中",
		title: "高度な学習分析機能",
		description:
			"学習パターンや弱点をより詳細に分析できる高度なレポート機能を追加します。進捗の可視化を強化し、学習戦略の立案をサポートします。",
		status: "in-progress",
		progress: 60,
	},
	{
		id: "gamification-elements",
		timeframe: "時期未定",
		title: "ゲーミフィケーション要素の強化",
		description:
			"学習の継続を促すためのバッジ、ポイント、ランキングなどのゲーミフィケーション要素をさらに充実させることを検討中です。",
		status: "on-hold",
	},
];

const getStatusAttributes = (status: MilestoneStatus) => {
	switch (status) {
		case "planning":
			return {
				label: "計画中",
				icon: LightbulbIcon,
				badgeVariant: "outline" as const,
				textColor: "text-blue-600 dark:text-blue-400",
			};
		case "in-progress":
			return {
				label: "開発中",
				icon: ConstructionIcon,
				badgeVariant: "default" as const,
				textColor: "text-yellow-600 dark:text-yellow-400",
			};
		case "completed":
			return {
				label: "完了",
				icon: CheckCircle2Icon,
				badgeVariant: "secondary" as const,
				textColor: "text-green-600 dark:text-green-400",
			};
		case "launched":
			return {
				label: "ローンチ済",
				icon: RocketIcon,
				badgeVariant: "default" as const, // 完了と区別するため、より目立つスタイルに
				textColor: "text-purple-600 dark:text-purple-400",
			};
		case "on-hold":
			return {
				label: "保留中",
				icon: PauseCircleIcon,
				badgeVariant: "destructive" as const,
				textColor: "text-gray-500 dark:text-gray-400",
			};
		default:
			return {
				label: status,
				icon: LightbulbIcon,
				badgeVariant: "outline" as const,
				textColor: "text-foreground",
			};
	}
};

export default function MilestonesPage() {
	// 完了/ローンチ済みのものを下に、それ以外を上にソート（任意）
	const sortedMilestones = [...milestoneData].sort((a, b) => {
		const completedStatus = ["completed", "launched"];
		const aIsCompleted = completedStatus.includes(a.status);
		const bIsCompleted = completedStatus.includes(b.status);
		if (aIsCompleted && !bIsCompleted) return 1;
		if (!aIsCompleted && bIsCompleted) return -1;
		// TODO: 時系列でのソートも加えるとより良い
		return 0;
	});

	return (
		<div className="container mx-auto px-4 sm:px-6 py-12 max-w-4xl">
			<header className="mb-12 text-center">
				<h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
					マイルストーン
				</h1>
				<p className="mt-4 text-lg text-muted-foreground">
					For All Learners の今後の開発計画と達成済みの目標をご紹介します。
				</p>
			</header>

			<div className="relative">
				<div className="absolute left-4 sm:left-5 top-0 bottom-0 w-0.5 bg-border -z-10" />

				{sortedMilestones.map((milestone) => {
					const {
						label,
						icon: Icon,
						badgeVariant,
						textColor,
					} = getStatusAttributes(milestone.status);
					const isPast =
						milestone.status === "completed" || milestone.status === "launched";
					return (
						<div
							key={milestone.id}
							className={`relative pl-10 sm:pl-12 mb-10 ${isPast ? "opacity-70" : ""}`}
						>
							<div
								className={`absolute left-[11px] sm:left-[15px] top-1 w-3 h-3 rounded-full border-2 border-background ${isPast ? "bg-muted-foreground" : "bg-primary"}`}
							/>
							<div className="mb-2">
								<div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-0.5">
									<CalendarClockIcon className="h-4 w-4" />
									<span>{milestone.timeframe}</span>
								</div>
								<h2 className="text-2xl font-semibold mt-0">
									{milestone.title}
								</h2>
							</div>
							<Badge
								variant={badgeVariant}
								className={`mb-2 text-xs ${textColor}`}
							>
								<Icon className="h-3.5 w-3.5 mr-1.5" />
								{label}
								{milestone.status === "in-progress" && milestone.progress && (
									<span className="ml-1.5">({milestone.progress}%)</span>
								)}
							</Badge>
							<p className="text-sm text-muted-foreground leading-relaxed">
								{milestone.description}
							</p>
						</div>
					);
				})}
			</div>
		</div>
	);
}
