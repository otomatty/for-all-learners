"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSyncDeckLinks } from "@/hooks/decks";

interface SyncButtonProps {
	deckId: string;
}

export function SyncButton({ deckId }: SyncButtonProps) {
	const syncDeckLinksMutation = useSyncDeckLinks();
	const isSyncing = syncDeckLinksMutation.isPending;

	const handleSync = async () => {
		try {
			await syncDeckLinksMutation.mutateAsync(deckId);
			toast.success("リンクの同期が完了しました");
		} catch (err: unknown) {
			toast.error(
				err instanceof Error ? err.message : "リンクの同期に失敗しました",
			);
		}
	};

	return (
		<Button
			variant="outline"
			size="sm"
			onClick={handleSync}
			disabled={isSyncing}
		>
			{isSyncing ? "同期中..." : "同期する"}
		</Button>
	);
}
