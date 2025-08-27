"use client";

import { CosenseSyncBadge } from "@/components/ui/cosense-sync-badge";
import { Textarea } from "@/components/ui/textarea";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface PageHeaderProps {
	title: string;
	onTitleChange: (newTitle: string) => void;
	onEnterPress?: () => void;
	cosenseProjectName?: string | null;
	scrapboxPageContentSyncedAt?: string | null;
	scrapboxPageListSyncedAt?: string | null;
}

export function PageHeader({
	title,
	onTitleChange,
	onEnterPress,
	cosenseProjectName,
	scrapboxPageContentSyncedAt,
	scrapboxPageListSyncedAt,
}: PageHeaderProps) {
	const router = useRouter();
	const [isSyncingContent, setIsSyncingContent] = useState(false);
	// Ref to ensure auto-sync runs only once
	const hasAutoSyncedRef = useRef(false);

	// Auto-sync only once when content has never been synced
	useEffect(() => {
		if (hasAutoSyncedRef.current) return;
		if (!cosenseProjectName) return;
		// Only auto-sync pages that have been list-synced
		if (!scrapboxPageListSyncedAt) return;
		if (scrapboxPageContentSyncedAt) return;
		hasAutoSyncedRef.current = true;
		(async () => {
			setIsSyncingContent(true);
			try {
				const res = await fetch(
					`/api/cosense/sync/page/${encodeURIComponent(cosenseProjectName)}/${encodeURIComponent(title)}`,
					{ cache: "no-store" },
				);
				if (!res.ok) throw new Error(`Sync failed: ${res.status}`);
				router.refresh();
			} catch (err) {
				console.error("Auto Cosense content sync error:", err);
				toast.error("自動同期に失敗しました");
			} finally {
				setIsSyncingContent(false);
			}
		})();
	}, [
		cosenseProjectName,
		scrapboxPageListSyncedAt,
		scrapboxPageContentSyncedAt,
		title,
		router,
	]);

	return (
		<div className="flex items-center">
			<Textarea
				role="heading"
				aria-level={1}
				value={title}
				onChange={(e) => onTitleChange(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === "Enter") {
						e.preventDefault();
						onEnterPress?.();
					}
				}}
				placeholder="ページタイトルを入力"
				className="!text-2xl sm:!text-3xl md:!text-4xl font-bold flex-1 resize-none whitespace-pre-wrap break-words border-0 bg-transparent focus-visible:outline-none focus-visible:ring-0"
			/>
			{cosenseProjectName && scrapboxPageListSyncedAt && (
				<button
					type="button"
					onClick={async () => {
						setIsSyncingContent(true);
						try {
							const res = await fetch(
								`/api/cosense/sync/page/${encodeURIComponent(
									cosenseProjectName,
								)}/${encodeURIComponent(title)}`,
								{ cache: "no-store" },
							);
							if (!res.ok) throw new Error(`Sync failed: ${res.status}`);
							toast.success("コンテンツ同期完了");
							router.refresh();
						} catch (err) {
							console.error("Cosense content sync error:", err);
							toast.error("コンテンツ同期に失敗しました");
						} finally {
							setIsSyncingContent(false);
						}
					}}
					title="Cosenseからコンテンツを同期"
					className="ml-2"
				>
					<CosenseSyncBadge
						isLoading={isSyncingContent}
						status={scrapboxPageContentSyncedAt ? "synced" : "unsynced"}
						className="cursor-pointer"
					/>
				</button>
			)}
		</div>
	);
}
