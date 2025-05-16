"use client";

import { CosenseSyncBadge } from "@/components/ui/cosense-sync-badge";
import { Input } from "@/components/ui/input";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface PageHeaderProps {
	title: string;
	onTitleChange: (newTitle: string) => void;
	cosenseProjectName?: string | null;
	scrapboxPageContentSyncedAt?: string | null;
	scrapboxPageListSyncedAt?: string | null;
}

export function PageHeader({
	title,
	onTitleChange,
	cosenseProjectName,
	scrapboxPageContentSyncedAt,
	scrapboxPageListSyncedAt,
}: PageHeaderProps) {
	const router = useRouter();
	const [isSyncingContent, setIsSyncingContent] = useState(false);

	return (
		<div className="flex items-center">
			<Input
				value={title}
				onChange={(e) => onTitleChange(e.target.value)}
				placeholder="ページタイトルを入力"
				variant="borderless"
				className="text-4xl font-bold flex-1"
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
