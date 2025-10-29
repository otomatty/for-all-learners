import { Search } from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

interface EmptySearchResultsProps {
	query: string;
}

/**
 * 検索結果が空の場合に表示するコンポーネント
 */
export function EmptySearchResults({ query }: EmptySearchResultsProps) {
	return (
		<Card className="border-dashed">
			<CardHeader>
				<div className="flex flex-col items-center text-center space-y-4">
					<div className="p-4 rounded-full bg-muted">
						<Search className="w-8 h-8 text-muted-foreground" />
					</div>
					<div>
						<CardTitle className="text-xl mb-2">
							「{query}」に一致する結果が見つかりませんでした
						</CardTitle>
						<CardDescription>
							検索条件を変えて再度お試しください
						</CardDescription>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<div className="space-y-2 text-sm text-muted-foreground">
					<p className="font-medium">検索のヒント:</p>
					<ul className="list-disc list-inside space-y-1 ml-2">
						<li>キーワードを変えて試してみてください</li>
						<li>より一般的な言葉で検索してみてください</li>
						<li>別の表現で検索してみてください</li>
						<li>キーワードの数を減らしてみてください</li>
					</ul>
				</div>
			</CardContent>
		</Card>
	);
}
