"use client";

/**
 * PagesListSkeleton Component
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ app/(protected)/notes/[slug]/page-client.tsx
 *
 * Dependencies (External files that this file imports):
 *   └─ @/components/ui/skeleton
 *
 * Related Documentation:
 *   ├─ Spec: ./pages-list-skeleton.spec.md
 *   ├─ Tests: ./pages-list-skeleton.test.tsx
 *   └─ Issue: docs/01_issues/open/2025_11/20251104_01_styling-adjustments.md
 */

import { Skeleton } from "@/components/ui/skeleton";

interface PagesListSkeletonProps {
	/**
	 * 表示するスケルトンの個数
	 * 指定がない場合は、画面サイズに応じた適切な個数（24個）を表示
	 */
	count?: number;
	/**
	 * グリッドレイアウトの設定
	 * デフォルトはPagesListと同じ設定
	 */
	gridCols?: string;
}

export function PagesListSkeleton({
	count,
	gridCols = "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6",
}: PagesListSkeletonProps = {}) {
	// countが指定されていない場合は、デフォルトで24個（lgサイズで4行分）
	const skeletonCount = count ?? 24;
	const skeletonKeys = Array.from(
		{ length: skeletonCount },
		(_, i) => `skeleton-${i}`,
	);

	return (
		<div className={`grid gap-2 md:gap-4 ${gridCols}`}>
			{skeletonKeys.map((key) => (
				<div
					key={key}
					className="bg-background p-4 border border-border rounded-md animate-pulse space-y-2"
				>
					<Skeleton className="h-6 w-3/4" />
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-2/3" />
				</div>
			))}
		</div>
	);
}
