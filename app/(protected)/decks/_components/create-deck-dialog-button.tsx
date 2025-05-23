"use client";

import { DeckForm } from "@/app/(protected)/decks/_components/deck-form";
import { ResponsiveDialog } from "@/components/responsive-dialog";
import { Button } from "@/components/ui/button";
import React, { useState } from "react";

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
