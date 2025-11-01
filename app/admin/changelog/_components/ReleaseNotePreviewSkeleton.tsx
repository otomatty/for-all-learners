import { Skeleton } from "@/components/ui/skeleton";

export function ReleaseNotePreviewSkeleton() {
	return (
		<div className="mt-4 space-y-2">
			<Skeleton className="h-5 w-1/3 mb-2" />
			<div className="space-y-2">
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-full" />
			</div>
		</div>
	);
}
