import { Container } from "@/components/container";
import { BackLink } from "@/components/ui/back-link";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import { notFound, redirect } from "next/navigation";
import { GenerateCardsForm } from "./_components/generate-cards-form"; // 次に作成するクライアントコンポーネント

type Page = Database["public"]["Tables"]["pages"]["Row"];
type Deck = Database["public"]["Tables"]["decks"]["Row"];

// createClient関数の返り値の型 (Promiseが解決された後の型) を取得
type ResolvedSupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function getPageById(
	supabase: ResolvedSupabaseClient, // 解決済みのSupabaseクライアントの型を使用
	pageId: string,
): Promise<Page | null> {
	const { data: page, error } = await supabase
		.from("pages")
		.select("*")
		.eq("id", pageId)
		.single();

	if (error) {
		console.error("Error fetching page:", error);
		return null;
	}
	return page;
}

async function getUserDecks(
	supabase: ResolvedSupabaseClient, // 解決済みのSupabaseクライアントの型を使用
	userId: string,
): Promise<Deck[]> {
	const { data: decks, error } = await supabase
		.from("decks")
		.select("*")
		.eq("user_id", userId)
		.order("created_at", { ascending: false });

	if (error) {
		console.error("Error fetching decks:", error);
		return [];
	}
	return decks || [];
}

export default async function GenerateCardsPage({
	params: paramsPromise, // params を Promise として受け取る
}: {
	params: Promise<{ id: string }>; // params の型を Promise<{ id: string }> に変更
}) {
	const params = await paramsPromise; // params を await して解決

	const supabase = await createClient(); // createClient() を await で呼び出し、解決されたインスタンスを取得
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect("/auth/login");
	}

	const pageId = params.id;
	const [page, decks] = await Promise.all([
		getPageById(supabase, pageId),
		getUserDecks(supabase, user.id),
	]);

	if (!page) {
		notFound();
	}

	return (
		<>
			<div className="max-w-5xl mx-auto py-4 lg:py-8">
				<BackLink title="ページに戻る" path={`/pages/${page.id}`} />
			</div>
			<Container className="max-w-3xl py-8">
				<h1 className="mb-6 mt-4 text-3xl font-bold">
					ページ「{page.title}」からカードを生成
				</h1>
				<GenerateCardsForm page={page} decks={decks} userId={user.id} />
			</Container>
		</>
	);
}
