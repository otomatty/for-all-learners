"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ResponsiveDialog } from "@/components/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { startQuizAction } from "@/app/_actions/startQuiz";

interface QuizSettingsDialogProps {
	deckId?: string;
	goalId?: string;
	deckTitle?: string;
	goalTitle?: string;
	triggerText?: string;
	reviewMode?: boolean;
	disabled?: boolean;
	reviewCount?: number;
}

export function QuizSettingsDialog({
	deckId,
	deckTitle,
	goalId,
	goalTitle,
	triggerText = "学習を開始する",
	reviewMode = false,
	disabled = false,
	reviewCount,
}: QuizSettingsDialogProps) {
	const router = useRouter();
	const [questionType, setQuestionType] = useState<string>("one");

	const displayText =
		reviewMode && typeof reviewCount === "number"
			? `${triggerText} (${reviewCount})`
			: triggerText;

	return (
		<ResponsiveDialog
			triggerText={displayText}
			dialogTitle="学習モード設定"
			triggerButtonProps={{
				className: "w-full relative",
				disabled: disabled || (reviewMode && (reviewCount ?? 0) === 0),
			}}
		>
			<form action={startQuizAction} className="space-y-4 p-4 max-w-md">
				<input type="hidden" name="deckId" value={deckId ?? ""} />
				<input type="hidden" name="goalId" value={goalId ?? ""} />
				<input type="hidden" name="mode" value={questionType} />
				<input type="hidden" name="count" value="10" />
				<input type="hidden" name="shuffle" value="true" />
				<div>
					<Label className="font-medium">問題形式</Label>
					<div className="flex space-x-4 mt-2">
						<label className="flex items-center">
							<input
								type="radio"
								name="questionType"
								value="one"
								checked={questionType === "one"}
								onChange={() => setQuestionType("one")}
							/>
							<span className="ml-1">一問一答</span>
						</label>
						<label className="flex items-center">
							<input
								type="radio"
								name="questionType"
								value="mcq"
								checked={questionType === "mcq"}
								onChange={() => setQuestionType("mcq")}
							/>
							<span className="ml-1">4択</span>
						</label>
						<label className="flex items-center">
							<input
								type="radio"
								name="questionType"
								value="fill"
								checked={questionType === "fill"}
								onChange={() => setQuestionType("fill")}
							/>
							<span className="ml-1">穴埋め</span>
						</label>
					</div>
				</div>
				<div className="flex justify-end">
					<Button type="submit">開始</Button>
				</div>
			</form>
		</ResponsiveDialog>
	);
}
