import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
	return (
		<div className="p-4 space-y-6">
			{Array.from({ length: 3 }).map((_, idx) => (
				<div key={idx} className="p-4 border rounded-md">
					<Skeleton className="h-6 mb-2 w-1/3" />
					<Skeleton className="h-4 mb-1 w-full" />
					<Skeleton className="h-4 w-full" />
				</div>
			))}
		</div>
	);
}
