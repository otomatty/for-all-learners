"use server";

import type { QuizParams } from "@/app/_actions/quiz";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * フォームで受け取ったクイズ設定を HttpOnly Cookie に保存し、/learn にリダイレクトします
 */
export async function startQuizAction(formData: FormData) {
	const cookieStore = await cookies();
	const params: QuizParams = {
		deckId: formData.get("deckId") as string | undefined,
		goalId: formData.get("goalId") as string | undefined,
		mode: formData.get("mode") as QuizParams["mode"],
		count: Number(formData.get("count")),
		shuffle: formData.get("shuffle") === "true",
	};

	cookieStore.set({
		name: "quizSettings",
		value: JSON.stringify(params),
		path: "/learn",
		httpOnly: true,
	});

	redirect("/learn");
}
