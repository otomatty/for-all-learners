"use client";

import React, { useState, useTransition } from "react";
import { ResponsiveDialog } from "@/components/responsive-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { addDeckStudyLog } from "@/app/_actions/goal-decks";

interface AddStudySessionDialogProps {
	deckId: string;
	onSuccess: () => void;
}

/**
 * 学習セッション記録用のダイアログコンポーネント
 */
export function AddStudySessionDialog({
	deckId,
	onSuccess,
}: AddStudySessionDialogProps) {
	const [date, setDate] = useState<string>(
		new Date().toISOString().slice(0, 10),
	);
	const [isPending, startTransition] = useTransition();

	return (
		<ResponsiveDialog triggerText="記録" dialogTitle="学習記録">
			<div className="space-y-2">
				<Input
					type="date"
					value={date}
					onChange={(e) => setDate(e.currentTarget.value)}
				/>
				<Button
					disabled={isPending}
					onClick={() =>
						startTransition(async () => {
							await addDeckStudyLog(deckId, date);
							onSuccess();
						})
					}
				>
					登録
				</Button>
			</div>
		</ResponsiveDialog>
	);
}
