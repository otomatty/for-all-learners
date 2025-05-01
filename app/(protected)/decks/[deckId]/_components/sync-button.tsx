"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { syncDeckLinks } from "@/app/_actions/decks";

interface SyncButtonProps {
	deckId: string;
}

export function SyncButton({ deckId }: SyncButtonProps) {
	const router = useRouter();
	const [isSyncing, setIsSyncing] = useState(false);

	const handleSync = async () => {
		setIsSyncing(true);
		try {
			await syncDeckLinks(deckId);
			toast.success("リンクの同期が完了しました");
			router.refresh();
		} catch (err: unknown) {
			console.error("同期エラー:", err);
			toast.error(
				err instanceof Error ? err.message : "リンクの同期に失敗しました",
			);
		} finally {
			setIsSyncing(false);
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
