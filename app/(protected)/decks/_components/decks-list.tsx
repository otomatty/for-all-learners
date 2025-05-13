import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { Database } from "@/types/database.types";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import Link from "next/link";

interface DecksListProps {
	decks: Database["public"]["Tables"]["decks"]["Row"][];
}

export function DecksList({ decks }: DecksListProps) {
	if (decks.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center h-40 border border-border rounded-lg bg-muted">
				<p className="text-muted-foreground">デッキがありません</p>
				<p className="text-sm text-muted-foreground">
					「新規デッキ」ボタンからデッキを作成してください
				</p>
			</div>
		);
	}

	return (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{decks.map((deck) => (
				<Link key={deck.id} href={`/decks/${deck.id}`}>
					<Card className="h-full overflow-hidden transition-all hover:shadow-md">
						<CardHeader className="pb-2">
							<CardTitle>{deck.title}</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="line-clamp-2 text-sm text-muted-foreground">
								{deck.description || "説明なし"}
							</p>
						</CardContent>
						<CardFooter className="flex justify-between">
							<div className="text-xs text-muted-foreground">
								{formatDistanceToNow(new Date(deck.updated_at || ""), {
									addSuffix: true,
									locale: ja,
								})}
								に更新
							</div>
							{deck.is_public && <Badge variant="outline">公開</Badge>}
						</CardFooter>
					</Card>
				</Link>
			))}
		</div>
	);
}
