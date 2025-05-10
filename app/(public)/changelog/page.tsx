import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge"; // shadcn/ui の Badge を想定
import {
	SparklesIcon, // 新機能
	TrendingUpIcon, // 改善
	BugIcon, // バグ修正
	ShieldCheckIcon, // セキュリティ
} from "lucide-react"; // アイコンライブラリ
import React from "react";

export const metadata: Metadata = {
	title: "更新履歴 - For All Learners",
	description:
		"For All Learners アプリケーションのこれまでの改善と新機能の履歴です。",
};

interface Change {
	type: "new" | "improvement" | "fix" | "security";
	description: string;
}

interface ChangeLogEntry {
	date: string;
	version: string;
	title?: string; // 各バージョンに対するキャッチーなタイトル (任意)
	changes: Change[];
}

// ダミーデータ: 実際にはCMSやデータベース、または静的なファイルから取得することを推奨します
const changelogData: ChangeLogEntry[] = [
	{
		date: "2024年5月15日",
		version: "v1.2.0",
		title: "集中モード登場＆パフォーマンス向上！",
		changes: [
			{
				type: "new",
				description:
					"新しい学習モード「集中モード」を追加しました。より学習に没頭できます。",
			},
			{
				type: "improvement",
				description:
					"データ同期のパフォーマンスを大幅に向上させ、よりスムーズな操作感を実現しました。",
			},
			{
				type: "fix",
				description:
					"特定の条件下で学習記録が正しく保存されない場合がある不具合を修正しました。",
			},
		],
	},
	{
		date: "2024年4月28日",
		version: "v1.1.5",
		changes: [
			{
				type: "fix",
				description: "ログイン画面における軽微なUIの表示ズレを修正しました。",
			},
			{
				type: "improvement",
				description:
					"ヘルプドキュメントの内容を最新化し、より分かりやすくなりました。",
			},
			{
				type: "security",
				description:
					"パスワードリセット処理に関するセキュリティを強化しました。",
			},
		],
	},
	{
		date: "2024年4月10日",
		version: "v1.1.0",
		title: "レポート機能強化＆プロフィール拡張",
		changes: [
			{
				type: "new",
				description:
					"レポート機能に新しいグラフオプション「進捗ヒートマップ」を追加しました。",
			},
			{
				type: "new",
				description:
					"ユーザープロフィールのカスタマイズ項目に「目標設定」を追加しました。",
			},
			{
				type: "improvement",
				description:
					"アプリ全体のローディング速度を改善し、起動時間を短縮しました。",
			},
		],
	},
];

const getTypeAttributes = (type: Change["type"]) => {
	switch (type) {
		case "new":
			return {
				label: "新機能",
				icon: SparklesIcon,
				badgeVariant: "default" as const,
			};
		case "improvement":
			return {
				label: "改善",
				icon: TrendingUpIcon,
				badgeVariant: "secondary" as const,
			};
		case "fix":
			return {
				label: "修正",
				icon: BugIcon,
				badgeVariant: "destructive" as const,
			};
		case "security":
			return {
				label: "セキュリティ",
				icon: ShieldCheckIcon,
				badgeVariant: "outline" as const,
			};
		default:
			return {
				label: type,
				icon: SparklesIcon,
				badgeVariant: "default" as const,
			};
	}
};

export default function ChangelogPage() {
	return (
		<div className="container mx-auto px-4 sm:px-6 py-12 max-w-4xl">
			<header className="mb-12 text-center">
				<h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
					更新履歴
				</h1>
				<p className="mt-4 text-lg text-muted-foreground">
					For All Learners の最新のアップデート情報をお届けします。
				</p>
			</header>

			<div className="relative">
				{/* タイムラインの縦線 */}
				<div className="absolute left-4 sm:left-5 top-0 bottom-0 w-0.5 bg-border -z-10" />

				{changelogData.map((entry, entryIndex) => (
					<div key={entry.version} className="relative pl-10 sm:pl-12 mb-10">
						{/* タイムラインのマーカー */}
						<div className="absolute left-[11px] sm:left-[15px] top-1 w-3 h-3 rounded-full bg-primary border-2 border-background" />
						<div className="mb-1">
							<time className="text-sm font-medium text-primary">
								{entry.date}
							</time>
							<h2 className="text-2xl font-semibold mt-0.5">
								{entry.version}
								{entry.title && (
									<span className="ml-2 text-xl font-normal text-muted-foreground">
										- {entry.title}
									</span>
								)}
							</h2>
						</div>
						<div className="space-y-3 mt-3">
							{entry.changes.map((change, changeIndex) => {
								const {
									label,
									icon: IconComponent,
									badgeVariant,
								} = getTypeAttributes(change.type);
								return (
									<div
										key={changeIndex}
										className="p-4 rounded-md border bg-card text-card-foreground shadow-sm"
									>
										<Badge variant={badgeVariant} className="mb-1.5 text-xs">
											<IconComponent className="h-3.5 w-3.5 mr-1.5" />
											{label}
										</Badge>
										<p className="text-sm text-muted-foreground leading-relaxed">
											{change.description}
										</p>
									</div>
								);
							})}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
