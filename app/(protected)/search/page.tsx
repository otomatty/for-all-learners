import { Container } from "@/components/layouts/container";
import { EmptySearchResults } from "@/components/notes/EmptySearchResults";
import { SearchFiltersClient } from "@/components/notes/SearchFiltersClient";
import { SearchHistoryUpdater } from "@/components/notes/SearchHistoryUpdater";
import { SearchPagination } from "@/components/notes/SearchPagination";
import { SearchResultItem } from "@/components/notes/SearchResultItem";
import { BackLink } from "@/components/ui/back-link";
import { createAdminClient } from "@/lib/supabase/adminClient";

/**
 * 検索結果項目の型定義
 */
interface SuggestionRow {
	/** 候補の種別 */
	type: "card" | "page";
	/** 元レコードのID (UUID) */
	id: string;
	/** 表示テキスト */
	suggestion: string;
	/** 抜粋（ハイライト付きHTML） */
	excerpt: string;
	/** 更新日時 */
	updated_at?: string;
	/** 作成日時 */
	created_at?: string;
	/** 関連度スコア（ts_rank） */
	rank?: number;
	/** 類似度スコア（pg_trgm） */
	similarity?: number;
}

/**
 * 検索ページコンポーネント
 * @param searchParams.q 検索クエリ
 * @param searchParams.type フィルタータイプ
 * @param searchParams.sort ソート順
 * @param searchParams.page ページ番号
 */
export default async function SearchPage({
	searchParams,
}: {
	searchParams: Promise<{
		q?: string;
		type?: string;
		sort?: string;
		page?: string;
	}>;
}) {
	const { q, type, sort, page } = await searchParams;
	const query = q?.trim() ?? "";
	const filterType = (type === "card" || type === "page" ? type : "all") as
		| "all"
		| "card"
		| "page";
	const sortBy = (
		sort === "updated" || sort === "created" ? sort : "relevance"
	) as "relevance" | "updated" | "created";
	const currentPage = Number(page) || 1;
	const perPage = 20;

	if (!query) {
		return <div className="p-4">キーワードを入力してください。</div>;
	}

	const supabase = createAdminClient();

	// ファジー検索を使用（タイポ対応）
	// 通常検索: "search_suggestions" - 完全一致のみ
	// ファジー検索: "search_suggestions_fuzzy" - タイポ対応
	const useFuzzySearch = true;

	// RPC で検索候補を取得
	const { data: rpcData, error: rpcError } = useFuzzySearch
		? await supabase.rpc("search_suggestions_fuzzy" as "search_suggestions", {
				p_query: query,
			})
		: await supabase.rpc("search_suggestions", { p_query: query });

	if (rpcError || !rpcData) {
		return (
			<div className="p-4 text-red-600">
				検索に失敗しました: {rpcError?.message ?? "不明なエラー"}
			</div>
		);
	}

	const rows = rpcData as SuggestionRow[];

	// フィルター適用（タイプ別）
	let filteredRows = rows;
	if (filterType !== "all") {
		filteredRows = rows.filter((r) => r.type === filterType);
	}

	// カード候補の deck_id と更新日時・作成日時をまとめて取得
	const cards = filteredRows.filter((r) => r.type === "card");
	const deckMap = new Map<string, string>();
	const cardUpdates = new Map<string, string>();
	const cardCreated = new Map<string, string>();

	if (cards.length > 0) {
		const { data: cardData, error: cardError } = await supabase
			.from("cards")
			.select("id, deck_id, updated_at, created_at")
			.in(
				"id",
				cards.map((c) => c.id),
			);
		if (!cardError && cardData) {
			// 1回のループで全Mapを生成
			for (const card of cardData) {
				deckMap.set(card.id, card.deck_id);
				if (card.updated_at) {
					cardUpdates.set(card.id, card.updated_at);
				}
				if (card.created_at) {
					cardCreated.set(card.id, card.created_at);
				}
			}
		}
	}

	// ページの更新日時・作成日時を取得
	const pages = filteredRows.filter((r) => r.type === "page");
	const pageUpdates = new Map<string, string>();
	const pageCreated = new Map<string, string>();

	if (pages.length > 0) {
		const { data: pageData, error: pageError } = await supabase
			.from("pages")
			.select("id, updated_at, created_at")
			.in(
				"id",
				pages.map((p) => p.id),
			);
		if (!pageError && pageData) {
			for (const page of pageData) {
				if (page.updated_at) {
					pageUpdates.set(page.id, page.updated_at);
				}
				if (page.created_at) {
					pageCreated.set(page.id, page.created_at);
				}
			}
		}
	}

	// ソート適用
	const sortedRows = (() => {
		const rows = [...filteredRows];

		if (sortBy === "relevance") {
			// 関連度でソート（rank or similarity）
			// ファジー検索の場合: similarity を優先
			// 通常検索の場合: rank を使用
			rows.sort((a, b) => {
				const aScore = a.similarity ?? a.rank ?? 0;
				const bScore = b.similarity ?? b.rank ?? 0;
				return bScore - aScore;
			});
		} else if (sortBy === "updated" || sortBy === "created") {
			// 日付でソート
			const cardDateMap = sortBy === "updated" ? cardUpdates : cardCreated;
			const pageDateMap = sortBy === "updated" ? pageUpdates : pageCreated;

			rows.sort((a, b) => {
				const aDate =
					a.type === "card" ? cardDateMap.get(a.id) : pageDateMap.get(a.id);
				const bDate =
					b.type === "card" ? cardDateMap.get(b.id) : pageDateMap.get(b.id);
				if (!aDate) return 1;
				if (!bDate) return -1;
				return new Date(bDate).getTime() - new Date(aDate).getTime();
			});
		}

		return rows;
	})();

	// ページネーション適用
	const totalResults = sortedRows.length;
	const totalPages = Math.ceil(totalResults / perPage);
	const offset = (currentPage - 1) * perPage;
	const paginatedRows = sortedRows.slice(offset, offset + perPage);

	// ベースURL（ページネーション用）
	const params = new URLSearchParams({
		q: query,
		type: filterType,
		sort: sortBy,
	});
	const baseUrl = `/search?${params.toString()}`;

	return (
		<>
			{/* 検索履歴更新 */}
			<SearchHistoryUpdater
				query={query}
				resultsCount={totalResults}
				type={filterType}
				sort={sortBy}
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
							currentType={filterType}
							currentSort={sortBy}
						/>
					)}

					{/* 検索結果 */}
					{paginatedRows.length === 0 ? (
						<EmptySearchResults query={query} />
					) : (
						<div className="space-y-4">
							{paginatedRows.map((r) => {
								const href =
									r.type === "card"
										? `/decks/${encodeURIComponent(deckMap.get(r.id) ?? "")}`
										: `/notes/default/${encodeURIComponent(r.id)}`;

								const updatedAt =
									r.type === "card"
										? cardUpdates.get(r.id)
										: pageUpdates.get(r.id);

								return (
									<SearchResultItem
										key={`${r.type}-${r.id}`}
										type={r.type}
										title={r.suggestion}
										excerpt={r.excerpt}
										href={href}
										updatedAt={updatedAt}
									/>
								);
							})}
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
