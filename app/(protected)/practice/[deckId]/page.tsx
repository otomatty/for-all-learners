import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardHeader } from "@/app/(protected)/dashboard/_components/dashboard-header";
import { DashboardShell } from "@/app/(protected)/dashboard/_components/dashboard-shell";
import { PracticeSettings } from "@/components/practice/practice-settings";

export default async function PracticePage({
	params,
}: { params: { deckId: string } }) {
	const supabase = createClient();
	const {
		data: { session },
	} = await supabase.auth.getSession();

	if (!session) {
		redirect("/auth/login");
	}

	// デッキ情報を取得
	const { data: deck } = await supabase
		.from("decks")
		.select("*")
		.eq("id", params.deckId)
		.single();

	if (!deck) {
		redirect("/decks");
	}

	// デッキ内のカードを取得
	const { data: cards } = await supabase
		.from("cards")
		.select("*")
		.eq("deck_id", params.deckId);

	if (!cards || cards.length === 0) {
		redirect(`/decks/${params.deckId}`);
	}

	return (
		<DashboardShell>
			<DashboardHeader
				heading="練習設定"
				text={`デッキ「${deck.title}」で練習を始めます`}
			/>
			<PracticeSettings deckId={params.deckId} cardCount={cards.length} />
		</DashboardShell>
	);
}
