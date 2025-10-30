"use client";

import { useState, useTransition } from "react";
import { addDeckStudyLog } from "@/app/_actions/goal-decks";
import { ResponsiveDialog } from "@/components/layouts/ResponsiveDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
	const [isDialogOpen, setIsDialogOpen] = useState(false);

	return (
		<>
			<Button onClick={() => setIsDialogOpen(true)}>記録</Button>
			<ResponsiveDialog
				open={isDialogOpen}
				onOpenChange={setIsDialogOpen}
				dialogTitle="学習記録"
			>
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
								setIsDialogOpen(false); // Close dialog on success
							})
						}
					>
						登録
					</Button>
				</div>
			</ResponsiveDialog>
		</>
	);
}
