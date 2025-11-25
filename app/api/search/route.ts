import { type NextRequest, NextResponse } from "next/server";
import logger from "@/lib/logger";
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
 * 検索APIエンドポイント
 * POST /api/search
 */
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { query, type, sort, page } = body;

		if (!query || typeof query !== "string") {
			return NextResponse.json(
				{ error: "検索クエリが必要です" },
				{ status: 400 },
			);
		}

		const trimmedQuery = query.trim();
		if (!trimmedQuery) {
			return NextResponse.json(
				{ error: "検索クエリが空です" },
				{ status: 400 },
			);
		}

		const filterType = (type === "card" || type === "page" ? type : "all") as
			| "all"
			| "card"
			| "page";
		const sortBy = (
			sort === "updated" || sort === "created" ? sort : "relevance"
		) as "relevance" | "updated" | "created";
		const currentPage = Number(page) || 1;
		const perPage = 20;

		const supabase = createAdminClient();

		// ファジー検索を使用（タイポ対応）
		const useFuzzySearch = true;

		// RPC で検索候補を取得
		const { data: rpcData, error: rpcError } = useFuzzySearch
			? await supabase.rpc("search_suggestions_fuzzy", {
					p_query: trimmedQuery,
				})
			: await supabase.rpc("search_suggestions", { p_query: trimmedQuery });

		if (rpcError || !rpcData) {
			return NextResponse.json(
				{ error: rpcError?.message ?? "不明なエラー" },
				{ status: 500 },
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
				rows.sort((a, b) => {
					const aScore = a.similarity ?? a.rank ?? 0;
					const bScore = b.similarity ?? b.rank ?? 0;
					return bScore - aScore;
				});
			} else if (sortBy === "updated" || sortBy === "created") {
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

		// 結果を整形
		const results = paginatedRows.map((r) => {
			const href =
				r.type === "card"
					? `/decks/${encodeURIComponent(deckMap.get(r.id) ?? "")}`
					: `/notes/default/${encodeURIComponent(r.id)}`;

			const updatedAt =
				r.type === "card" ? cardUpdates.get(r.id) : pageUpdates.get(r.id);

			return {
				type: r.type,
				id: r.id,
				title: r.suggestion,
				excerpt: r.excerpt,
				href,
				updatedAt,
			};
		});

		return NextResponse.json({
			query: trimmedQuery,
			results,
			totalResults,
			totalPages,
			currentPage,
			filterType,
			sortBy,
		});
	} catch (error) {
		logger.error({ error }, "Search API error");
		return NextResponse.json({ error: "検索に失敗しました" }, { status: 500 });
	}
}
