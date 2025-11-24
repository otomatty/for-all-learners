"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import type { GetAllInquiriesOptions } from "@/hooks/inquiries";
import { useAllInquiries, useInquiryCategories } from "@/hooks/inquiries";
import {
	type ParsedAdminInquiriesSearchParams,
	parseAdminInquiriesSearchParams,
} from "@/lib/utils";
import { InquiriesTable } from "./InquiriesTable";
import { InquiryFilters } from "./InquiryFilters";
import { InquiryPagination } from "./InquiryPagination";

interface InquiriesTableClientProps {
	initialCategories: Array<{ id: number; name_ja: string }>;
}

export function InquiriesTableClient({
	initialCategories,
}: InquiriesTableClientProps) {
	const searchParams = useSearchParams();
	const parsedParams: ParsedAdminInquiriesSearchParams =
		parseAdminInquiriesSearchParams(Object.fromEntries(searchParams.entries()));

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

	const { data: inquiriesResult, isLoading: isLoadingInquiries } =
		useAllInquiries(options);
	const { data: categoriesResult, isLoading: isLoadingCategories } =
		useInquiryCategories();

	const isLoading = isLoadingInquiries || isLoadingCategories;

	if (isLoading) {
		return <p className="text-center py-8">読み込み中...</p>;
	}

	if (!inquiriesResult?.success || !categoriesResult?.success) {
		const errorMessage =
			inquiriesResult?.message ||
			categoriesResult?.message ||
			"データの取得に失敗しました。";
		return <p className="text-destructive text-center py-8">{errorMessage}</p>;
	}

	const inquiries = inquiriesResult.inquiries || [];
	const totalCount = inquiriesResult.totalCount || 0;
	const categories = categoriesResult.categories || initialCategories;
	const totalPages = Math.ceil(totalCount / parsedParams.limit);

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
