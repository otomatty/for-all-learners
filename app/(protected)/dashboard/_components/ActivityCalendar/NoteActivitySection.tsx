/**
 * Note Activity Section Component
 *
 * 詳細パネル内のノート活動セクションを表示するコンポーネント
 */

import { Edit, FileText, Link as LinkIcon } from "lucide-react";
import Link from "next/link";
import { ACTIVITY_ICONS } from "./constants";
import type { NoteActivityDetail } from "./types";

interface NoteActivitySectionProps {
	activities: NoteActivityDetail;
}

export function NoteActivitySection({ activities }: NoteActivitySectionProps) {
	const hasActivity =
		activities.created.length > 0 ||
		activities.updated.length > 0 ||
		activities.linksCreated > 0;

	if (!hasActivity) {
		return (
			<div className="p-4 bg-muted rounded-lg">
				<div className="flex items-center gap-2 text-muted-foreground">
					<FileText className="h-5 w-5" />
					<p className="text-sm">この日のノート活動はありません</p>
				</div>
			</div>
		);
	}

	const totalPages = activities.created.length + activities.updated.length;

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-semibold flex items-center gap-2">
					{ACTIVITY_ICONS.page_created} ノート活動
				</h3>
				<div className="text-sm text-muted-foreground">
					合計 {totalPages}ページ
				</div>
			</div>

			<div className="space-y-4">
				{/* 新規作成ページ */}
				{activities.created.length > 0 && (
					<div>
						<div className="flex items-center gap-2 mb-2 text-sm font-medium text-foreground">
							<Edit className="h-4 w-4" />
							<span>新規作成 ({activities.created.length})</span>
						</div>
						<div className="space-y-2">
							{activities.created.map((page) => (
								<Link
									key={page.id}
									href={`/notes/default/${page.id}`}
									className="block p-3 bg-background border border-border rounded-lg hover:border-green-300 hover:shadow-sm transition-all"
								>
									<div className="flex items-start gap-2">
										<span className="text-base mt-0.5">
											{ACTIVITY_ICONS.page_created}
										</span>
										<div className="flex-1 min-w-0">
											<div className="font-medium text-foreground truncate">
												{page.title}
											</div>
											<div className="text-xs text-muted-foreground mt-1">
												{new Date(page.createdAt).toLocaleTimeString("ja-JP", {
													hour: "2-digit",
													minute: "2-digit",
												})}
											</div>
										</div>
									</div>
								</Link>
							))}
						</div>
					</div>
				)}

				{/* 更新ページ */}
				{activities.updated.length > 0 && (
					<div>
						<div className="flex items-center gap-2 mb-2 text-sm font-medium text-foreground">
							<FileText className="h-4 w-4" />
							<span>編集 ({activities.updated.length})</span>
						</div>
						<div className="space-y-2">
							{activities.updated.map((page) => (
								<Link
									key={page.id}
									href={`/notes/default/${page.id}`}
									className="block p-3 bg-background border border-border rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
								>
									<div className="flex items-start gap-2">
										<span className="text-base mt-0.5">
											{ACTIVITY_ICONS.page_updated}
										</span>
										<div className="flex-1 min-w-0">
											<div className="font-medium text-foreground truncate">
												{page.title}
											</div>
											<div className="text-xs text-muted-foreground mt-1">
												{new Date(page.updatedAt).toLocaleTimeString("ja-JP", {
													hour: "2-digit",
													minute: "2-digit",
												})}
											</div>
										</div>
									</div>
								</Link>
							))}
						</div>
					</div>
				)}

				{/* リンク作成 */}
				{activities.linksCreated > 0 && (
					<div className="p-3 bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-lg">
						<div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
							<LinkIcon className="h-4 w-4" />
							<span className="text-sm font-medium">
								{activities.linksCreated}個のリンクを作成
							</span>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
