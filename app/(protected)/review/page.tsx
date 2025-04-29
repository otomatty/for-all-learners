import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardHeader } from "@/app/(protected)/dashboard/_components/dashboard-header";
import { DashboardShell } from "@/app/(protected)/dashboard/_components/dashboard-shell";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export default async function ReviewPage() {
	const supabase = createClient();
	const {
		data: { session },
	} = await supabase.auth.getSession();

	if (!session) {
		redirect("/auth/login");
	}

	// 復習が必要なカードを取得
	const { data: reviewCards } = await supabase
		.from("learning_logs")
		.select("*, cards(*)")
		.eq("user_id", session.user.id)
		.lte("next_review_at", new Date().toISOString())
		.order("next_review_at", { ascending: true });

	// 復習が必要なカードをデッキごとにグループ化
	const deckMap = new Map();

	if (reviewCards && reviewCards.length > 0) {
		for (const log of reviewCards) {
			if (!log.cards) continue;

			// デッキ情報を取得
			const { data: deck } = await supabase
				.from("decks")
				.select("id, title")
				.eq("id", log.cards.deck_id)
				.single();

			if (!deck) continue;

			if (!deckMap.has(deck.id)) {
				deckMap.set(deck.id, {
					id: deck.id,
					title: deck.title,
					cardCount: 0,
				});
			}

			const deckInfo = deckMap.get(deck.id);
			deckInfo.cardCount++;
			deckMap.set(deck.id, deckInfo);
		}
	}

	const reviewDecks = Array.from(deckMap.values());

	return (
		<DashboardShell>
			<DashboardHeader
				heading="復習"
				text="最適なタイミングで復習することで記憶の定着を促進します"
			/>

			{reviewDecks.length > 0 ? (
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{reviewDecks.map((deck) => (
						<Card key={deck.id}>
							<CardHeader>
								<CardTitle>{deck.title}</CardTitle>
								<CardDescription>
									復習が必要なカード: {deck.cardCount}枚
								</CardDescription>
							</CardHeader>
							<CardContent>
								<p className="text-sm text-muted-foreground">
									最適なタイミングで復習することで、記憶の定着率が大幅に向上します。
								</p>
							</CardContent>
							<CardFooter>
								<Button asChild className="w-full">
									<Link
										href={`/practice/session?deckId=${deck.id}&mode=review&answerType=flashcard`}
									>
										復習を始める
									</Link>
								</Button>
							</CardFooter>
						</Card>
					))}
				</div>
			) : (
				<div className="flex flex-col items-center justify-center h-40 border rounded-lg">
					<p className="text-muted-foreground">
						現在、復習が必要なカードはありません
					</p>
					<p className="text-sm text-muted-foreground">
						学習を続けると、最適なタイミングで復習するカードが表示されます
					</p>
				</div>
			)}
		</DashboardShell>
	);
}
