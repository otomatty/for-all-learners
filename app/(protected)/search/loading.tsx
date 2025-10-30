import { Container } from "@/components/layouts/container";
import { BackLink } from "@/components/ui/back-link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * 検索ページのローディングUI
 * Next.js App Router の loading.tsx として使用
 */
export default function SearchLoadingPage() {
	return (
		<>
			<div className="mb-6 max-w-5xl mx-auto py-4 lg:py-8">
				<BackLink path="/dashboard" title="ホームに戻る" />
			</div>
			<Container>
				<div className="space-y-6">
					{/* タイトルスケルトン */}
					<div className="space-y-2">
						<Skeleton className="h-8 w-64" />
						<Skeleton className="h-4 w-32" />
					</div>

					{/* 検索結果カードのスケルトン */}
					<div className="space-y-4">
						{Array.from({ length: 5 }, (_, index) => index).map((id) => (
							<Card key={`skeleton-${id}`}>
								<CardHeader>
									<div className="flex items-start gap-3">
										<Skeleton className="h-12 w-12 rounded-lg shrink-0" />
										<div className="flex-1 space-y-2">
											<Skeleton className="h-5 w-24" />
											<Skeleton className="h-6 w-full max-w-md" />
										</div>
									</div>
								</CardHeader>
								<CardContent>
									<Skeleton className="h-4 w-full" />
									<Skeleton className="h-4 w-4/5 mt-2" />
									<div className="flex gap-2 mt-4">
										<Skeleton className="h-4 w-20" />
										<Skeleton className="h-4 w-24" />
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			</Container>
		</>
	);
}
