import { Suspense } from "react";
import {
	getAllInquiries,
	getInquiryCategories,
} from "@/app/_actions/inquiries";
import type { GetAllInquiriesOptions } from "@/app/_actions/inquiries";
import { InquiriesTable } from "./InquiriesTable";
import { InquiryPagination } from "./InquiryPagination";
import { InquiryFilters } from "./InquiryFilters";
import {
	parseAdminInquiriesSearchParams,
	type ParsedAdminInquiriesSearchParams,
} from "@/lib/utils";

interface InquiriesTableContainerProps {
	searchParams?: { [key: string]: string | string[] | undefined };
}

export async function InquiriesTableContainer({
	searchParams,
}: InquiriesTableContainerProps) {
	const parsedParams: ParsedAdminInquiriesSearchParams =
		parseAdminInquiriesSearchParams(searchParams);

	const options: GetAllInquiriesOptions = {
		page: parsedParams.page,
		limit: parsedParams.limit,
		sortBy: parsedParams.sortBy,
		sortOrder: parsedParams.sortOrder,
		filters: {
			status: parsedParams.status,
			priority: parsedParams.priority,
			categoryId: parsedParams.categoryId
				? Number(parsedParams.categoryId)
				: undefined,
			searchQuery: parsedParams.searchQuery,
		},
	};

	// データ取得を並行して行う
	const [inquiriesResult, categoriesResult] = await Promise.all([
		getAllInquiries(options),
		getInquiryCategories(),
	]);

	if (!inquiriesResult.success || !categoriesResult.success) {
		// エラーハンドリング: より具体的にエラーメッセージを表示することを推奨
		const errorMessage =
			inquiriesResult.message ||
			categoriesResult.message ||
			"データの取得に失敗しました。";
		return <p className="text-destructive text-center py-8">{errorMessage}</p>;
	}

	const inquiries = inquiriesResult.inquiries || [];
	const totalCount = inquiriesResult.totalCount || 0;
	const categories = categoriesResult.categories || [];
	const totalPages = Math.ceil(totalCount / parsedParams.limit);

	// クライアントコンポーネントに渡すためのコールバックや状態は、
	// Next.jsのルーター (useRouter, usePathname, useSearchParams) をクライアントコンポーネント内で使用してURLを更新することで実現します。
	// このコンテナは主にデータ供給と初期状態の設定に責任を持ちます。

	const initialFilters = {
		searchQuery: parsedParams.searchQuery,
		status: parsedParams.status,
		priority: parsedParams.priority,
		categoryId: parsedParams.categoryId,
	};

	return (
		<div className="space-y-6">
			<Suspense
				fallback={
					<div className="p-4 border rounded-lg bg-card text-card-foreground">
						フィルターを読み込み中...
					</div>
				}
			>
				<InquiryFilters
					categories={categories}
					initialFilters={initialFilters}
				/>
			</Suspense>

			{inquiries.length > 0 ? (
				<>
					<Suspense
						fallback={
							<div className="rounded-md border p-8 text-center">
								テーブルを読み込み中...
							</div>
						}
					>
						<InquiriesTable
							inquiries={inquiries}
							currentSortBy={parsedParams.sortBy}
							currentSortOrder={parsedParams.sortOrder}
							// onSortChange は InquiriesTable 内部で処理
						/>
					</Suspense>
					{totalPages > 1 && (
						<Suspense
							fallback={
								<div className="text-center">
									ページネーションを読み込み中...
								</div>
							}
						>
							<InquiryPagination
								currentPage={parsedParams.page}
								totalPages={totalPages}
								// onPageChange は InquiryPagination 内部で処理
							/>
						</Suspense>
					)}
					<div className="text-sm text-muted-foreground">
						全 {totalCount} 件中{" "}
						{inquiries.length > 0
							? (parsedParams.page - 1) * parsedParams.limit + 1
							: 0}{" "}
						- {(parsedParams.page - 1) * parsedParams.limit + inquiries.length}{" "}
						件表示
					</div>
				</>
			) : (
				<p className="text-center text-muted-foreground py-8">
					{parsedParams.searchQuery ||
					parsedParams.status ||
					parsedParams.priority ||
					parsedParams.categoryId
						? "指定された条件に一致するお問い合わせはありません。"
						: "お問い合わせはまだありません。"}
				</p>
			)}
		</div>
	);
}
