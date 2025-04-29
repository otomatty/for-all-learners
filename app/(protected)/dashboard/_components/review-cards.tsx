import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { Database } from "@/types/database.types";

// 学習ログとカード情報を結合した型
type ReviewCardItem = Database["public"]["Tables"]["learning_logs"]["Row"] & {
	cards: Database["public"]["Tables"]["cards"]["Row"];
};

interface ReviewCardsProps {
	className?: string;
	reviewCards: ReviewCardItem[];
}

export function ReviewCards({ className, reviewCards }: ReviewCardsProps) {
	return (
		<Card className={className}>
			<CardHeader>
				<CardTitle>復習が必要なカード</CardTitle>
				<CardDescription>
					最適なタイミングで復習することで記憶の定着を促進します
				</CardDescription>
			</CardHeader>
			<CardContent className="grid gap-4">
				{reviewCards.length > 0 ? (
					reviewCards.map((log) => (
						<div
							key={log.id}
							className="flex items-center justify-between space-x-4 rounded-md border p-4"
						>
							<div className="flex-1 space-y-1">
								<p className="text-sm font-medium leading-none">
									{log.cards.front_content.length > 50
										? `${log.cards.front_content.substring(0, 50)}...`
										: log.cards.front_content}
								</p>
								<p className="text-sm text-muted-foreground">
									最終学習:{" "}
									{log.answered_at
										? new Date(log.answered_at).toLocaleDateString()
										: "回答日時なし"}
								</p>
							</div>
						</div>
					))
				) : (
					<div className="flex items-center justify-center h-24">
						<p className="text-sm text-muted-foreground">
							現在、復習が必要なカードはありません
						</p>
					</div>
				)}
			</CardContent>
			<CardFooter>
				{reviewCards.length > 0 ? (
					<Button asChild className="w-full">
						<Link href="/review">復習を始める</Link>
					</Button>
				) : (
					<Button disabled className="w-full">
						復習を始める
					</Button>
				)}
			</CardFooter>
		</Card>
	);
}
