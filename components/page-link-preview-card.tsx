"use client";

import type { PagePreview } from "@/lib/services/page-preview-service";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { Calendar, FileText, FolderOpen } from "lucide-react";
import Image from "next/image";
import { memo } from "react";

export interface PreviewCardProps {
	preview: PagePreview | null;
	isLoading: boolean;
	error?: string;
}

/**
 * ページリンクプレビューカード（memoized）
 */
export const PageLinkPreviewCard = memo<PreviewCardProps>(
	function PageLinkPreviewCard({
		preview,
		isLoading,
		error,
	}: PreviewCardProps) {
		const formattedDate = preview
			? formatDistanceToNow(new Date(preview.updated_at), {
					addSuffix: true,
					locale: ja,
				})
			: "";

		const containerClasses = `page-preview-card preview-content-fade ${
			isLoading ? "loading" : "loaded"
		}`;

		return (
			<div className={containerClasses}>
				{error && (
					<div className="flex items-center gap-2 text-red-600">
						<FileText className="w-4 h-4" />
						<span className="text-sm font-medium">エラー</span>
					</div>
				)}
				{error && <p className="text-sm text-red-500 mt-1">{error}</p>}

				{isLoading && (
					<div className="animate-pulse">
						<div className="h-4 bg-gray-200 rounded mb-2" />
						<div className="h-3 bg-gray-200 rounded mb-1" />
						<div className="h-3 bg-gray-200 rounded mb-1" />
						<div className="h-3 bg-gray-200 rounded w-3/4" />
					</div>
				)}

				{!isLoading && !error && preview && (
					<>
						{/* ヘッダー */}
						<div className="flex items-start gap-2 mb-2">
							<FileText className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
							<h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-tight">
								{preview.title}
							</h3>
						</div>

						{/* サムネイル */}
						{preview.thumbnail_url && (
							<div className="mb-2">
								<Image
									src={preview.thumbnail_url}
									alt={preview.title}
									width={280}
									height={140}
									className="w-full h-20 object-cover rounded border"
								/>
							</div>
						)}

						{/* コンテンツプレビュー */}
						{preview.content_preview && (
							<p className="text-xs text-gray-600 line-clamp-3 leading-relaxed mb-2">
								{preview.content_preview}
							</p>
						)}

						{/* メタ情報 */}
						<div className="flex flex-col gap-1 text-xs text-gray-500">
							{/* Note情報 */}
							{preview.note_info && (
								<div className="flex items-center gap-1">
									<FolderOpen className="w-3 h-3" />
									<span>{preview.note_info.title}</span>
								</div>
							)}

							{/* 更新日時 */}
							<div className="flex items-center gap-1">
								<Calendar className="w-3 h-3" />
								<span>{formattedDate}</span>
							</div>
						</div>
					</>
				)}
			</div>
		);
	},
);

/**
 * プレビューカードのローディング状態
 */
export function PageLinkPreviewCardLoading() {
	return (
		<div className="page-preview-card p-3 bg-white border border-gray-200 rounded-lg shadow-lg max-w-80">
			<div className="animate-pulse">
				<div className="flex items-center gap-2 mb-2">
					<div className="w-4 h-4 bg-gray-200 rounded" />
					<div className="h-4 bg-gray-200 rounded flex-1" />
				</div>
				<div className="h-3 bg-gray-200 rounded mb-1" />
				<div className="h-3 bg-gray-200 rounded mb-1" />
				<div className="h-3 bg-gray-200 rounded w-3/4 mb-2" />
				<div className="flex gap-1">
					<div className="w-3 h-3 bg-gray-200 rounded" />
					<div className="h-3 bg-gray-200 rounded w-20" />
				</div>
			</div>
		</div>
	);
}

/**
 * プレビューカードのエラー状態
 */
export function PageLinkPreviewCardError({ error }: { error: string }) {
	return (
		<div className="page-preview-card p-3 bg-white border border-red-200 rounded-lg shadow-lg max-w-80">
			<div className="flex items-center gap-2 text-red-600 mb-1">
				<FileText className="w-4 h-4" />
				<span className="text-sm font-medium">読み込みエラー</span>
			</div>
			<p className="text-xs text-red-500">{error}</p>
		</div>
	);
}
