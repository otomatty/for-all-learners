import { Container } from "@/components/layouts/container";
import { BackLink } from "@/components/ui/back-link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function PageDetailLoading() {
	return (
		<Container>
			<BackLink title="ページ一覧に戻る" />
			<Card className="mt-4">
				<CardHeader>
					<Skeleton className="h-8 w-64" />
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-3/4" />
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-5/6" />
					</div>
				</CardContent>
			</Card>
		</Container>
	);
}
