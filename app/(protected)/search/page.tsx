import { Container } from "@/components/layouts/container";
import { EmptySearchResults } from "@/components/notes/EmptySearchResults";
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
}

/**
 * 検索ページコンポーネント
 * @param searchParams.q 検索クエリ
 */
export default async function SearchPage({
	searchParams,
}: {
	searchParams: Promise<{ q?: string }>;
}) {
	const { q } = await searchParams;
	const query = q?.trim() ?? "";
	if (!query) {
		return <div className="p-4">キーワードを入力してください。</div>;
	}

	const supabase = createAdminClient();
	// RPC で検索候補を取得
	const { data: rpcData, error: rpcError } = await supabase.rpc(
		"search_suggestions",
		{ p_query: query },
	);
	if (rpcError || !rpcData) {
		return (
			<div className="p-4 text-red-600">
				検索に失敗しました: {rpcError?.message ?? "不明なエラー"}
			</div>
		);
	}

	const rows = rpcData as SuggestionRow[];

	// カード候補の deck_id と更新日時をまとめて取得
	const cards = rows.filter((r) => r.type === "card");
	const deckMap = new Map<string, string>();
	const cardUpdates = new Map<string, string>();

	if (cards.length > 0) {
		const { data: cardData, error: cardError } = await supabase
			.from("cards")
			.select("id, deck_id, updated_at")
			.in(
				"id",
				cards.map((c) => c.id),
			);
		if (!cardError && cardData) {
			// 1回のループで両方のMapを生成
			for (const card of cardData) {
				deckMap.set(card.id, card.deck_id);
				if (card.updated_at) {
					cardUpdates.set(card.id, card.updated_at);
				}
			}
		}
	}

	// ページの更新日時を取得
	const pages = rows.filter((r) => r.type === "page");
	const pageUpdates = new Map<string, string>();

	if (pages.length > 0) {
		const { data: pageData, error: pageError } = await supabase
			.from("pages")
			.select("id, updated_at")
			.in(
				"id",
				pages.map((p) => p.id),
			);
		if (!pageError && pageData) {
			for (const page of pageData) {
				if (page.updated_at) {
					pageUpdates.set(page.id, page.updated_at);
				}
			}
		}
	}

	// 検索結果の総数
	const totalResults = rows.length;

	return (
		<>
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

					{/* 検索結果 */}
					{rows.length === 0 ? (
						<EmptySearchResults query={query} />
					) : (
						<div className="space-y-4">
							{rows.map((r) => {
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
				</div>
			</Container>
		</>
	);
}
