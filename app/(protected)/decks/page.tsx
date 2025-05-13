import { CreateDeckDialogButton } from "@/app/(protected)/decks/_components/create-deck-dialog-button";
import { DecksList } from "@/app/(protected)/decks/_components/decks-list";
import { getDecksByUser, getSharedDecksByUser } from "@/app/_actions/decks";
import { Container } from "@/components/container";
import { BackLink } from "@/components/ui/back-link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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
		<Container>
			<div className="mb-6">
				<BackLink path="/dashboard" title="ホームに戻る" />
			</div>
			<Tabs defaultValue="my-decks" className="space-y-4">
				{/* 新規／編集デッキフォーム */}
				<div className="flex justify-between mb-4">
					<TabsList>
						<TabsTrigger value="my-decks">マイデッキ</TabsTrigger>
						<TabsTrigger value="shared-decks">共有デッキ</TabsTrigger>
					</TabsList>
					<CreateDeckDialogButton userId={user.id} />
				</div>
				<TabsContent value="my-decks" className="space-y-4">
					<DecksList decks={myDecks || []} />
				</TabsContent>
				<TabsContent value="shared-decks" className="space-y-4">
					<DecksList decks={sharedDecks || []} />
				</TabsContent>
			</Tabs>
		</Container>
	);
}
