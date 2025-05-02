import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Profile from "./_components/Profile";
import DecksAndCards from "./_components/DecksAndCards";
import Questions from "./_components/Questions";
import LearningActivity from "./_components/LearningActivity";
import Goals from "./_components/Goals";
import Settings from "./_components/Settings";
import AudioRecordings from "./_components/AudioRecordings";

interface UserDetailPageProps {
	params: Promise<{ id: string }>;
}

export default async function UserDetailPage({ params }: UserDetailPageProps) {
	const { id: userId } = await params;
	return (
		<div className="px-4 py-6">
			<Profile userId={userId} />
			<Tabs defaultValue="decks" className="space-y-4">
				<TabsList>
					<TabsTrigger value="decks">デッキ＆カード</TabsTrigger>
					<TabsTrigger value="questions">問題バリエーション</TabsTrigger>
					<TabsTrigger value="activity">学習アクティビティ</TabsTrigger>
					<TabsTrigger value="goals">目標管理</TabsTrigger>
					<TabsTrigger value="audio-recordings">音読データ</TabsTrigger>
					<TabsTrigger value="settings">設定</TabsTrigger>
				</TabsList>
				<TabsContent value="decks">
					<DecksAndCards userId={userId} />
				</TabsContent>
				<TabsContent value="questions">
					<Questions userId={userId} />
				</TabsContent>
				<TabsContent value="activity">
					<LearningActivity userId={userId} />
				</TabsContent>
				<TabsContent value="goals">
					<Goals userId={userId} />
				</TabsContent>
				<TabsContent value="audio-recordings">
					<AudioRecordings userId={userId} />
				</TabsContent>
				<TabsContent value="settings">
					<Settings userId={userId} />
				</TabsContent>
			</Tabs>
		</div>
	);
}
