"use client";

import { useState } from "react";
import { DeckForm } from "@/components/decks/DeckForm";
import { ResponsiveDialog } from "@/components/layouts/ResponsiveDialog";
import { Button } from "@/components/ui/button";

interface CreateDeckDialogProps {
	userId: string;
}

export function CreateDeckDialog({ userId }: CreateDeckDialogProps) {
	const [isDialogOpen, setIsDialogOpen] = useState(false);

	return (
		<>
			<Button onClick={() => setIsDialogOpen(true)}>新規デッキ</Button>
			<ResponsiveDialog
				open={isDialogOpen}
				onOpenChange={setIsDialogOpen}
				dialogTitle="デッキを作成"
				dialogDescription="デッキタイトルと説明を入力してください"
			>
				<DeckForm userId={userId} onSuccess={() => setIsDialogOpen(false)} />
			</ResponsiveDialog>
		</>
	);
}
