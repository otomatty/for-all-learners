import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
	Card,
	CardHeader,
	CardTitle,
	CardContent,
	CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getStudyGoalsByUser } from "@/app/_actions/study_goals";
import { getLearningLogsByUser } from "@/app/_actions/learning_logs";
import { GoalSummary } from "../dashboard/_components/goal-summary";
import { QuizSettingsDialog } from "@/components/QuizSettingsDialog";

export default async function LearnPage() {
	const supabase = await createClient();
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();
	if (authError || !user) {
		redirect("/auth/login");
	}

	const { data: decks, error: decksError } = await supabase
		.from("decks")
		.select("id, title")
		.eq("user_id", user.id);
	if (decksError) throw decksError;

	// 目標と学習ログを取得
	const goals = await getStudyGoalsByUser(user.id);
	const logs = await getLearningLogsByUser(user.id);

	return (
		<Tabs defaultValue="decks" className="p-6">
			<TabsList>
				<TabsTrigger value="decks">デッキ</TabsTrigger>
				<TabsTrigger value="goals">目標</TabsTrigger>
			</TabsList>

			<TabsContent value="decks">
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{decks?.map((deck) => (
						<Card key={deck.id}>
							<CardHeader>
								<CardTitle>{deck.title}</CardTitle>
							</CardHeader>
							<CardContent>{/* TODO: カード数など詳細を表示 */}</CardContent>
							<CardFooter>
								<QuizSettingsDialog deckId={deck.id} deckTitle={deck.title} />
							</CardFooter>
						</Card>
					))}
					{decks && decks.length === 0 && (
						<div className="p-4 text-center">
							まだデッキがありません。
							<Link href="/decks/new">
								<Button>新規デッキ作成</Button>
							</Link>
						</div>
					)}
				</div>
			</TabsContent>

			<TabsContent value="goals">
				<GoalSummary goals={goals} logs={logs} />
			</TabsContent>
		</Tabs>
	);
}
