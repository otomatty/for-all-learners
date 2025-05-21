"use client";

import { Skeleton } from "@/components/ui/skeleton";

const SKELETON_COUNT = 36;
const skeletonKeys = Array.from(
	{ length: SKELETON_COUNT },
	(_, i) => `skeleton-${i}`,
);

export function PagesListSkeleton() {
	return (
		<div className="grid gap-2 md:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
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
