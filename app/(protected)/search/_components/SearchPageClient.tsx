"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Container } from "@/components/layouts/container";
import { EmptySearchResults } from "@/components/notes/EmptySearchResults";
import { SearchFiltersClient } from "@/components/notes/SearchFiltersClient";
import { SearchHistoryUpdater } from "@/components/notes/SearchHistoryUpdater";
import { SearchPagination } from "@/components/notes/SearchPagination";
import { SearchResultItem } from "@/components/notes/SearchResultItem";
import { BackLink } from "@/components/ui/back-link";

interface SearchResult {
	type: "card" | "page";
	id: string;
	title: string;
	excerpt: string;
	href: string;
	updatedAt?: string;
}

interface SearchResponse {
	query: string;
	results: SearchResult[];
	totalResults: number;
	totalPages: number;
	currentPage: number;
	filterType: "all" | "card" | "page";
	sortBy: "relevance" | "updated" | "created";
}

/**
 * Search Page Client Component
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ app/(protected)/search/page.tsx
 *
 * Dependencies (External files that this file imports):
 *   ├─ next/navigation (useSearchParams)
 *   ├─ @tanstack/react-query (useQuery)
 *   └─ components/notes/* (Search components)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/tauri-migration/20250124_01_static-export-client-side-auth-implementation-plan.md
 */
export function SearchPageClient() {
	const searchParams = useSearchParams();
	const [query, setQuery] = useState("");
	const [filterType, setFilterType] = useState<"all" | "card" | "page">("all");
	const [sortBy, setSortBy] = useState<"relevance" | "updated" | "created">(
		"relevance",
	);
	const [currentPage, setCurrentPage] = useState(1);

	// URLパラメータから値を取得
	useEffect(() => {
		const q = searchParams.get("q")?.trim() ?? "";
		const type = searchParams.get("type");
		const sort = searchParams.get("sort");
		const page = searchParams.get("page");

		setQuery(q);
		setFilterType(type === "card" || type === "page" ? type : "all");
		setSortBy(sort === "updated" || sort === "created" ? sort : "relevance");
		setCurrentPage(Number(page) || 1);
	}, [searchParams]);

	// 検索APIを呼び出し
	const { data, isLoading, error } = useQuery<SearchResponse>({
		queryKey: ["search", query, filterType, sortBy, currentPage],
		queryFn: async () => {
			if (!query) {
				return {
					query: "",
					results: [],
					totalResults: 0,
					totalPages: 0,
					currentPage: 1,
					filterType: "all",
					sortBy: "relevance",
				};
			}

			const response = await fetch("/api/search", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					query,
					type: filterType,
					sort: sortBy,
					page: currentPage,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error ?? "検索に失敗しました");
			}

			return response.json();
		},
		enabled: !!query,
	});

	if (!query) {
		return (
			<>
				<div className="mb-6 max-w-5xl mx-auto py-4 lg:py-8">
					<BackLink path="/dashboard" title="ホームに戻る" />
				</div>
				<Container>
					<div className="p-4">キーワードを入力してください。</div>
				</Container>
			</>
		);
	}

	if (isLoading) {
		return (
			<>
				<div className="mb-6 max-w-5xl mx-auto py-4 lg:py-8">
					<BackLink path="/dashboard" title="ホームに戻る" />
				</div>
				<Container>
					<div className="flex items-center justify-center min-h-screen">
						<div className="text-muted-foreground">検索中...</div>
					</div>
				</Container>
			</>
		);
	}

	if (error || !data) {
		return (
			<>
				<div className="mb-6 max-w-5xl mx-auto py-4 lg:py-8">
					<BackLink path="/dashboard" title="ホームに戻る" />
				</div>
				<Container>
					<div className="p-4 text-red-600">
						検索に失敗しました:{" "}
						{error instanceof Error ? error.message : "不明なエラー"}
					</div>
				</Container>
			</>
		);
	}

	const {
		results,
		totalResults,
		totalPages,
		filterType: responseFilterType,
		sortBy: responseSortBy,
	} = data;

	// ベースURL（ページネーション用）
	const params = new URLSearchParams({
		q: query,
		type: responseFilterType,
		sort: responseSortBy,
	});
	const baseUrl = `/search?${params.toString()}`;

	return (
		<>
			{/* 検索履歴更新 */}
			<SearchHistoryUpdater
				query={query}
				resultsCount={totalResults}
				type={responseFilterType}
				sort={responseSortBy}
			/>

			<div className="mb-6 max-w-5xl mx-auto py-4 lg:py-8">
				<BackLink path="/dashboard" title="ホームに戻る" />
			</div>
			<Container>
				<div className="space-y-6">
					{/* タイトルと結果数 */}
					<div>
						<h1 className="text-2xl font-bold mb-2">検索結果</h1>
						<p className="text-muted-foreground">
							「{query}」の検索結果: {totalResults}件
						</p>
					</div>

					{/* フィルター・ソート */}
					{totalResults > 0 && (
						<SearchFiltersClient
							currentType={responseFilterType}
							currentSort={responseSortBy}
						/>
					)}

					{/* 検索結果 */}
					{results.length === 0 ? (
						<EmptySearchResults query={query} />
					) : (
						<div className="space-y-4">
							{results.map((r) => (
								<SearchResultItem
									key={`${r.type}-${r.id}`}
									type={r.type}
									title={r.title}
									excerpt={r.excerpt}
									href={r.href}
									updatedAt={r.updatedAt}
								/>
							))}
						</div>
					)}

					{/* ページネーション */}
					{totalPages > 1 && (
						<SearchPagination
							currentPage={currentPage}
							totalPages={totalPages}
							baseUrl={baseUrl}
						/>
					)}
				</div>
			</Container>
		</>
	);
}
