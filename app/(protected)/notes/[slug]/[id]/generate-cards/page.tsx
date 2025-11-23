import { notFound, redirect } from "next/navigation";
import { Container } from "@/components/layouts/container";
import { GenerateCardsForm } from "@/components/pages/generate-cards/generate-cards-form";
import { BackLink } from "@/components/ui/back-link";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

type Page = Database["public"]["Tables"]["pages"]["Row"];
type Deck = Database["public"]["Tables"]["decks"]["Row"];

// createClient関数の返り値の型 (Promiseが解決された後の型) を取得
type ResolvedSupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function getPageById(
	supabase: ResolvedSupabaseClient,
	pageId: string,
): Promise<Page | null> {
	const { data: page, error } = await supabase
		.from("pages")
		.select("*")
		.eq("id", pageId)
		.single();

	if (error) {
		return null;
	}
	return page;
}

async function getUserDecks(
	supabase: ResolvedSupabaseClient,
	userId: string,
): Promise<Deck[]> {
	const { data: decks, error } = await supabase
		.from("decks")
		.select("*")
		.eq("user_id", userId)
		.order("created_at", { ascending: false });

	if (error) {
		return [];
	}
	return decks || [];
}

// Generate static params for dynamic routes
// Returns empty array to enable dynamic rendering for all routes
// Phase 6: Next.js静的化とTauri統合 (Issue #157)
export async function generateStaticParams() {
	return [];
}

export default async function GenerateCardsPage({
	params: paramsPromise,
}: {
	params: Promise<{ slug: string; id: string }>;
}) {
	const params = await paramsPromise;

	const supabase = await createClient();
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
		<Container className="py-8">
			<BackLink
				title="ページに戻る"
				path={`/notes/${params.slug}/${page.id}`}
			/>
			<h1 className="mb-6 mt-4 text-3xl font-bold">
				ページ「{page.title}」からカードを生成
			</h1>
			<GenerateCardsForm page={page} decks={decks} userId={user.id} />
		</Container>
	);
}
