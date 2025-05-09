"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/responsive-dialog";
import { DeckForm } from "@/app/(protected)/decks/_components/deck-form";

interface CreateDeckDialogButtonProps {
	userId: string;
}

export function CreateDeckDialogButton({
	userId,
}: CreateDeckDialogButtonProps) {
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
