import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminInquiryDetailLoading() {
	return (
		<div className="container mx-auto py-8 px-4 md:px-6">
			<div className="mb-6">
				<Button variant="outline" size="sm" disabled>
					<ArrowLeftIcon className="mr-2 h-4 w-4" />
					お問い合わせ一覧へ戻る
				</Button>
			</div>

			<Card>
				<CardHeader>
					<div className="flex justify-between items-start">
						<div>
							<Skeleton className="h-6 w-48 mb-2" />
							<Skeleton className="h-8 w-72" />
						</div>
						<div className="flex gap-2">
							<Skeleton className="h-6 w-20" />
							<Skeleton className="h-6 w-16" />
						</div>
					</div>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="space-y-3">
						{Array.from({ length: 4 }, (_, i) => `skeleton-${i}`).map((key) => (
							<div
								key={key}
								className="grid grid-cols-3 gap-2 py-2 border-b last:border-b-0"
							>
								<Skeleton className="h-5 w-24" />
								<div className="col-span-2">
									<Skeleton className="h-5 w-full" />
								</div>
							</div>
						))}
					</div>
					<div>
						<Skeleton className="h-5 w-32 mb-2" />
						<div className="p-4 border rounded-md bg-muted/50">
							<Skeleton className="h-4 w-full mb-2" />
							<Skeleton className="h-4 w-full mb-2" />
							<Skeleton className="h-4 w-3/4" />
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
