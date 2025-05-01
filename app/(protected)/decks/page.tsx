import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DecksList } from "@/app/(protected)/decks/_components/decks-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResponsiveDialog } from "@/components/responsive-dialog";
import { DeckForm } from "@/app/(protected)/decks/_components/deck-form";
import { getDecksByUser, getSharedDecksByUser } from "@/app/_actions/decks";

export default async function DecksPage() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect("/auth/login");
	}

	// Get decks via server actions
	const [myDecks, sharedDeckShares] = await Promise.all([
		getDecksByUser(user.id),
		getSharedDecksByUser(user.id),
	]);
	const sharedDecks = sharedDeckShares.map((share) => share.decks);

	return (
		<>
			<Tabs defaultValue="my-decks" className="space-y-4">
				{/* 新規／編集デッキフォーム */}
				<div className="flex justify-between mb-4">
					<TabsList>
						<TabsTrigger value="my-decks">マイデッキ</TabsTrigger>
						<TabsTrigger value="shared-decks">共有デッキ</TabsTrigger>
					</TabsList>
					<ResponsiveDialog
						triggerText="新規デッキ"
						dialogTitle="デッキを作成／編集"
						dialogDescription="デッキタイトルと説明を入力してください"
					>
						<DeckForm userId={user.id} />
					</ResponsiveDialog>
				</div>
				<TabsContent value="my-decks" className="space-y-4">
					<DecksList decks={myDecks || []} />
				</TabsContent>
				<TabsContent value="shared-decks" className="space-y-4">
					<DecksList decks={sharedDecks || []} />
				</TabsContent>
			</Tabs>
		</>
	);
}
