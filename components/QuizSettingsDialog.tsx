"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ResponsiveDialog } from "@/components/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

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
	const [questionCount, setQuestionCount] = useState<number>(10);
	const [difficulty, setDifficulty] = useState<string>("normal");
	const [timeLimit, setTimeLimit] = useState<number>(0);
	const [shuffle, setShuffle] = useState<boolean>(false);

	const startLearning = () => {
		const params = new URLSearchParams();
		if (deckId) params.append("deckId", deckId);
		if (goalId) params.append("goalId", goalId);
		params.append("mode", questionType);
		params.append("count", questionCount.toString());
		params.append("difficulty", difficulty);
		if (timeLimit > 0) params.append("timeLimit", timeLimit.toString());
		if (shuffle) params.append("shuffle", "true");
		const startTime = Date.now().toString();
		params.append("startTime", startTime);
		if (reviewMode) {
			params.append("review", "true");
		}
		router.push(`/learn?${params.toString()}`);
	};

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
			{(deckTitle || goalTitle) && (
				<div className="mb-4">
					{deckTitle && (
						<p className="text-lg font-semibold">デッキ: {deckTitle}</p>
					)}
					{goalTitle && (
						<p className="text-lg font-semibold">目標: {goalTitle}</p>
					)}
				</div>
			)}
			<div className="space-y-4 p-4">
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
				<div>
					<Label className="font-medium">問題数</Label>
					<Input
						type="number"
						min={1}
						value={questionCount}
						onChange={(e) => setQuestionCount(Number(e.target.value))}
						className="w-24 mt-2"
					/>
				</div>
				<div>
					<Label className="font-medium">難易度</Label>
					<select
						value={difficulty}
						onChange={(e) => setDifficulty(e.target.value)}
						className="mt-2 p-2 border rounded"
					>
						<option value="easy">易しい</option>
						<option value="normal">普通</option>
						<option value="hard">難しい</option>
					</select>
				</div>
				<div>
					<Label className="font-medium">
						制限時間 (秒) <span className="text-sm ml-2">(0: 無制限)</span>
					</Label>
					<Input
						type="number"
						min={0}
						value={timeLimit}
						onChange={(e) => setTimeLimit(Number(e.target.value))}
						className="w-24 mt-2"
					/>
				</div>
				<div className="flex items-center">
					<Checkbox
						checked={shuffle}
						onCheckedChange={(checked) => setShuffle(!!checked)}
					/>
					<Label className="ml-2">シャッフル</Label>
				</div>
				<div className="flex justify-end">
					<Button onClick={startLearning}>開始</Button>
				</div>
			</div>
		</ResponsiveDialog>
	);
}
