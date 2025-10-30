import { CardItem } from "./card-item";

interface CardsListSkeletonProps {
	/** 表示するスケルトンアイテムの数 */
	count?: number;
	/** CardItem に渡す deckId */
	deckId: string;
}

export function CardsListSkeleton({
	count = 32,
	deckId,
}: CardsListSkeletonProps) {
	return (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{Array.from({ length: count }).map((_, index) => (
				<CardItem
					// biome-ignore lint/suspicious/noArrayIndexKey: スケルトン要素であり、順序変更や要素の追加削除がないため、indexをkeyに含めても安全です。
					key={`skeleton-${index}`}
					isLoading={true}
					deckId={deckId}
					// isLoading=true の場合、インタラクション関連の props は不要
					userId={null}
					canEdit={false}
					isBlurred={false}
				/>
			))}
		</div>
	);
}
