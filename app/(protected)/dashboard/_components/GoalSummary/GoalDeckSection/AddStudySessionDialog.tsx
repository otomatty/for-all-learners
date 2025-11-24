"use client";

import { useState } from "react";
import { useAddDeckStudyLog } from "@/hooks/goal_decks";
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
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const addDeckStudyLogMutation = useAddDeckStudyLog();

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
						disabled={addDeckStudyLogMutation.isPending}
						onClick={async () => {
							await addDeckStudyLogMutation.mutateAsync({ deckId, date });
							onSuccess();
							setIsDialogOpen(false); // Close dialog on success
						}}
					>
						登録
					</Button>
				</div>
			</ResponsiveDialog>
		</>
	);
}
