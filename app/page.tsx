import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BookOpen, BrainCircuit, Clock, Share2 } from "lucide-react";
import { UnauthHeader } from "@/components/unauth-header";

export default async function Home() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (user) redirect("/dashboard");

	return (
		<div className="flex flex-col min-h-screen bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
			<UnauthHeader />

			<main className="flex-1 container mx-auto px-6 py-16 text-center text-white">
				<h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4">
					資格学習をもっと効率的に
				</h1>
				<p className="max-w-2xl mx-auto text-lg sm:text-xl mb-8">
					AIによる問題生成と間隔反復学習で、最短ルートの学習体験を。さあ、始めましょう。
				</p>
				<Button
					size="lg"
					asChild
					variant="default"
					className="bg-white text-indigo-600 hover:bg-gray-100"
				>
					<Link href="/auth/login">Googleで始める</Link>
				</Button>

				<section className="mt-16 grid gap-8 grid-cols-1 sm:grid-cols-2 md:grid-cols-4 text-gray-700">
					<div className="bg-white p-6 rounded-lg shadow-lg">
						<BookOpen className="w-6 h-6 text-indigo-500 mb-2" />
						<h3 className="font-semibold text-lg mb-1">デッキとカード</h3>
						<p>教材をデッキ化し、カードで効率的に学習。</p>
					</div>
					<div className="bg-white p-6 rounded-lg shadow-lg">
						<BrainCircuit className="w-6 h-6 text-indigo-500 mb-2" />
						<h3 className="font-semibold text-lg mb-1">AI問題生成</h3>
						<p>Google Gemini APIで多彩な形式の問題を自動生成。</p>
					</div>
					<div className="bg-white p-6 rounded-lg shadow-lg">
						<Clock className="w-6 h-6 text-indigo-500 mb-2" />
						<h3 className="font-semibold text-lg mb-1">間隔反復</h3>
						<p>Anki/SuperMemo2アルゴリズムで最適復習タイミングを管理。</p>
					</div>
					<div className="bg-white p-6 rounded-lg shadow-lg">
						<Share2 className="w-6 h-6 text-indigo-500 mb-2" />
						<h3 className="font-semibold text-lg mb-1">ノート共有</h3>
						<p>専門用語ノートを作成し、チームや仲間と共有。</p>
					</div>
				</section>
			</main>

			<footer className="bg-white py-6 border-t">
				<div className="container mx-auto text-center text-gray-500">
					&copy; {new Date().getFullYear()} 資格学習支援アプリ ForAllLearners
				</div>
			</footer>
		</div>
	);
}
