import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

/**
 * ロード中に表示するデッキ一覧テーブルのスケルトン
 */
export function DecksTableSkeleton() {
	const ROW_COUNT = 5;
	// Skeleton 行用にユニークキーを生成
	const skeletonKeys = Array.from(
		{ length: ROW_COUNT },
		(_, i) => `skeleton-${i}`,
	);

	return (
		<div className="overflow-auto">
			<Table className="w-full text-left animate-pulse">
				<TableHeader>
					<TableRow>
						<TableHead className="w-[50px]">選択</TableHead>
						<TableHead>タイトル</TableHead>
						<TableHead className="hidden md:table-cell">作成日</TableHead>
						<TableHead className="hidden sm:table-cell">カード数</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{skeletonKeys.map((key) => (
						<TableRow key={key}>
							<TableCell>
								<Skeleton className="h-4 w-4" />
							</TableCell>
							<TableCell>
								<Skeleton className="h-4 w-1/2" />
							</TableCell>
							<TableCell className="hidden md:table-cell">
								<Skeleton className="h-4 w-24" />
							</TableCell>
							<TableCell className="hidden sm:table-cell">
								<Skeleton className="h-4 w-8" />
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
