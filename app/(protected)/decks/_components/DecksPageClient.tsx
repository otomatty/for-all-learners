"use client";

import { CreateDeckDialog } from "@/app/(protected)/decks/_components/CreateDeckDialog";
import { DecksList } from "@/app/(protected)/decks/_components/DecksList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDecks, useSharedDecks } from "@/hooks/decks";

interface DecksPageClientProps {
	userId: string;
}

export function DecksPageClient({ userId }: DecksPageClientProps) {
	const { data: myDecks, isLoading: isLoadingMyDecks } = useDecks();
	const { data: sharedDeckShares, isLoading: isLoadingSharedDecks } =
		useSharedDecks();

	const sharedDecks = sharedDeckShares?.map((share) => share.decks) ?? [];

	if (isLoadingMyDecks || isLoadingSharedDecks) {
		return (
			<div className="flex items-center justify-center h-40">
				<p className="text-muted-foreground">読み込み中...</p>
			</div>
		);
	}

	return (
		<Tabs defaultValue="my-decks" className="space-y-4 mb-20">
			{/* 新規／編集デッキフォーム */}
			<div className="flex justify-between mb-4">
				<TabsList>
					<TabsTrigger value="my-decks">マイデッキ</TabsTrigger>
					<TabsTrigger value="shared-decks">共有デッキ</TabsTrigger>
				</TabsList>
				<CreateDeckDialog userId={userId} />
			</div>
			<TabsContent value="my-decks" className="space-y-4">
				<DecksList decks={myDecks || []} />
			</TabsContent>
			<TabsContent value="shared-decks" className="space-y-4">
				<DecksList decks={sharedDecks || []} />
			</TabsContent>
		</Tabs>
	);
}
