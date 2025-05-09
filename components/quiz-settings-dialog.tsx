"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ResponsiveDialog } from "@/components/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { startQuizAction } from "@/app/_actions/startQuiz";
import { List, Grid, Type } from "lucide-react";

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
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [questionType, setQuestionType] = useState<string>("one");

	// 選択された問題形式ごとの説明文
	const descriptions: Record<string, string> = {
		one: "単一の質問に対して解答を入力します。",
		mcq: "提示された4つの選択肢から正しい答えを1つ選びます。",
		fill: "空欄を埋めて正しい語句を入力します。",
	};
	const description = descriptions[questionType];

	const displayText =
		reviewMode && typeof reviewCount === "number"
			? `${triggerText} (${reviewCount})`
			: triggerText;

	const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		// フォームのデフォルト送信を止めずに、ダイアログを閉じる
		// 実際の送信は form の action で行われる
		// 送信成功・失敗に関わらずダイアログは閉じることになるが、
		// 通常はページ遷移が発生するため問題になりにくい
		setIsDialogOpen(false);
	};

	return (
		<>
			<Button
				onClick={() => setIsDialogOpen(true)}
				className="w-full relative"
				disabled={disabled || (reviewMode && (reviewCount ?? 0) === 0)}
			>
				{displayText}
			</Button>
			<ResponsiveDialog
				open={isDialogOpen}
				onOpenChange={setIsDialogOpen}
				dialogTitle="学習モード設定"
			>
				<form
					action={startQuizAction}
					onSubmit={handleFormSubmit}
					className="space-y-4 p-4 max-w-md"
				>
					<input type="hidden" name="deckId" value={deckId ?? ""} />
					<input type="hidden" name="goalId" value={goalId ?? ""} />
					<input type="hidden" name="mode" value={questionType} />
					<input type="hidden" name="count" value="10" />
					<input type="hidden" name="shuffle" value="true" />
					<div>
						<Label className="font-medium mb-2">問題形式</Label>
						<div className="grid grid-cols-3 gap-4">
							<button
								type="button"
								onClick={() => setQuestionType("one")}
								className={`p-4 flex flex-col items-center border rounded-lg focus:outline-none transition ${questionType === "one" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}
							>
								<List className="w-6 h-6 mb-2" />
								<span className="text-sm">一問一答</span>
							</button>
							<button
								type="button"
								onClick={() => setQuestionType("mcq")}
								className={`p-4 flex flex-col items-center border rounded-lg focus:outline-none transition ${questionType === "mcq" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}
							>
								<Grid className="w-6 h-6 mb-2" />
								<span className="text-sm">4択</span>
							</button>
							<button
								type="button"
								onClick={() => setQuestionType("fill")}
								className={`p-4 flex flex-col items-center border rounded-lg focus:outline-none transition ${questionType === "fill" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}
							>
								<Type className="w-6 h-6 mb-2" />
								<span className="text-sm">穴埋め</span>
							</button>
						</div>

						{/* 選択中の問題形式説明 */}
						<p className="mt-2 text-sm text-muted-foreground">{description}</p>
					</div>
					<div className="flex justify-end">
						<Button type="submit">開始</Button>
					</div>
				</form>
			</ResponsiveDialog>
		</>
	);
}
