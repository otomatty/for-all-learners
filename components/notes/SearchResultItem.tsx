import parse from "html-react-parser";
import { Calendar, FileText, Layers } from "lucide-react";
import Link from "next/link";
import sanitizeHtml from "sanitize-html";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

/**
 * 検索結果項目の型定義
 */
interface SearchResultItemProps {
	/** 結果の種別 */
	type: "card" | "page";
	/** レコードID */
	id: string;
	/** タイトル */
	title: string;
	/** 抜粋（ハイライト付きHTML） */
	excerpt: string;
	/** 遷移先URL */
	href: string;
	/** 更新日時（オプション） */
	updatedAt?: string;
}

/**
 * 検索結果項目を表示するカードコンポーネント
 */
export function SearchResultItem({
	type,
	title,
	excerpt,
	href,
	updatedAt,
}: SearchResultItemProps) {
	// タイプに応じたアイコンとラベル
	const typeConfig = {
		card: {
			icon: Layers,
			label: "カード",
			variant: "default" as const,
		},
		page: {
			icon: FileText,
			label: "ページ",
			variant: "secondary" as const,
		},
	};

	const config = typeConfig[type];
	const Icon = config.icon;

	// 日付フォーマット
	const formattedDate = updatedAt
		? new Date(updatedAt).toLocaleDateString("ja-JP", {
				year: "numeric",
				month: "long",
				day: "numeric",
			})
		: null;

	return (
		<Link href={href} className="block group">
			<Card className="transition-all hover:shadow-md hover:border-primary/50">
				<CardHeader>
					<div className="flex items-start gap-3">
						{/* アイコン */}
						<div className="p-2 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors shrink-0">
							<Icon className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
						</div>

						{/* タイトルとバッジ */}
						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-2 mb-2">
								<Badge variant={config.variant}>{config.label}</Badge>
							</div>
							<CardTitle className="text-lg group-hover:text-primary transition-colors line-clamp-2">
								{title}
							</CardTitle>
						</div>
					</div>
				</CardHeader>

				<CardContent>
					{/* 抜粋（ハイライト付き） */}
					<CardDescription className="text-sm leading-relaxed line-clamp-3 [&_mark]:bg-yellow-200 [&_mark]:dark:bg-yellow-800 [&_mark]:px-1 [&_mark]:rounded">
						{parse(
							sanitizeHtml(excerpt, {
								allowedTags: ["mark"],
								allowedAttributes: {},
							}),
						)}
					</CardDescription>

					{/* メタ情報 */}
					{formattedDate && (
						<div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
							<div className="flex items-center gap-1">
								<Calendar className="w-3 h-3" />
								<span>更新: {formattedDate}</span>
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		</Link>
	);
}
