import { Skeleton } from "@/components/ui/skeleton"; // shadcn/ui の Skeleton を利用
import { Suspense } from "react";
import { InquiriesTableContainer } from "./_components/InquiriesTableContainer";

export const metadata = {
	title: "お問い合わせ管理 | 管理者ダッシュボード",
};

function AdminInquiriesPageSkeleton() {
	return (
		<div className="space-y-6">
			{/* Filters Skeleton */}
			<div className="p-4 border rounded-lg bg-card">
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
					{[...Array(4)].map((_, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
						<div key={i} className="space-y-2">
							<Skeleton className="h-4 w-20" />
							<Skeleton className="h-10 w-full" />
						</div>
					))}
				</div>
				<div className="mt-4 flex gap-2">
					<Skeleton className="h-10 w-24" />
					<Skeleton className="h-10 w-24" />
				</div>
			</div>
			{/* Table Skeleton */}
			<Skeleton className="h-96 w-full rounded-md border" />
			{/* Pagination Skeleton */}
			<div className="flex justify-center">
				<Skeleton className="h-10 w-64" />
			</div>
		</div>
	);
}

export default async function AdminInquiriesPage({
	searchParams,
}: {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	const resolvedSearchParams = await searchParams;
	return (
		<div className="container mx-auto py-8 px-4 md:px-6">
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
					お問い合わせ管理
				</h1>
				{/* 必要であれば新規作成ボタンなどをここに追加 */}
			</div>
			<Suspense fallback={<AdminInquiriesPageSkeleton />}>
				<InquiriesTableContainer searchParams={resolvedSearchParams} />
			</Suspense>
		</div>
	);
}
