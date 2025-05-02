import { Skeleton } from "@/components/ui/skeleton";

// define static keys for skeleton items to avoid using array index as React key
const SKELETON_COUNT = 3;
const skeletonKeys = Array.from(
	{ length: SKELETON_COUNT },
	(_, i) => `skeleton-${i}`,
);

export default function Loading() {
	return (
		<div className="p-4 space-y-6">
			{skeletonKeys.map((key) => (
				<div key={key} className="p-4 border border-border rounded-md">
					<Skeleton className="h-6 mb-2 w-1/3" />
					<Skeleton className="h-4 mb-1 w-full" />
					<Skeleton className="h-4 w-full" />
				</div>
			))}
		</div>
	);
}
