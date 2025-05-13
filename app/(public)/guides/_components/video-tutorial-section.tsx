import { Container } from "@/components/container";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import Image from "next/image";

export default function VideoTutorialSection() {
	return (
		<section className="w-full py-12 md:py-24 bg-slate-50">
			<Container>
				<div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
					<div className="space-y-2">
						<h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
							ビデオチュートリアル
						</h2>
						<p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
							視覚的に学べるビデオチュートリアルで、アプリケーションの使い方をマスターしましょう。
						</p>
					</div>
				</div>

				<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
					<Card>
						<div className="relative aspect-video overflow-hidden rounded-t-lg">
							<Image
								src="/placeholder.svg?height=1080&width=1920"
								width={550}
								height={310}
								alt="はじめてのデッキ作成のサムネイル"
								className="object-cover"
							/>
							<div className="absolute inset-0 flex items-center justify-center bg-black/30">
								<div className="rounded-full bg-white/90 p-3">
									<svg
										aria-hidden="true"
										className="h-6 w-6 text-primary"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
										xmlns="http://www.w3.org/2000/svg"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
										/>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
								</div>
							</div>
						</div>
						<CardHeader>
							<CardTitle>はじめてのデッキ作成</CardTitle>
							<CardDescription>所要時間: 5分</CardDescription>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-muted-foreground">
								デッキの作成方法から、教材の取り込み、AI問題生成までの基本的な流れを解説します。
							</p>
						</CardContent>
					</Card>

					<Card>
						<div className="relative aspect-video overflow-hidden rounded-t-lg">
							<Image
								src="/placeholder.svg?height=1080&width=1920"
								width={550}
								height={310}
								alt="効率的な学習方法のサムネイル"
								className="object-cover"
							/>
							<div className="absolute inset-0 flex items-center justify-center bg-black/30">
								<div className="rounded-full bg-white/90 p-3">
									<svg
										aria-hidden="true"
										className="h-6 w-6 text-primary"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
										xmlns="http://www.w3.org/2000/svg"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
										/>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
								</div>
							</div>
						</div>
						<CardHeader>
							<CardTitle>効率的な学習方法</CardTitle>
							<CardDescription>所要時間: 8分</CardDescription>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-muted-foreground">
								FSRSアルゴリズムを活用した効率的な学習方法と、復習スケジュールの活用法を解説します。
							</p>
						</CardContent>
					</Card>

					<Card>
						<div className="relative aspect-video overflow-hidden rounded-t-lg">
							<Image
								src="/placeholder.svg?height=1080&width=1920"
								width={550}
								height={310}
								alt="ノート機能の活用法のサムネイル"
								className="object-cover"
							/>
							<div className="absolute inset-0 flex items-center justify-center bg-black/30">
								<div className="rounded-full bg-white/90 p-3">
									<svg
										aria-hidden="true"
										className="h-6 w-6 text-primary"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
										xmlns="http://www.w3.org/2000/svg"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
										/>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
								</div>
							</div>
						</div>
						<CardHeader>
							<CardTitle>ノート機能の活用法</CardTitle>
							<CardDescription>所要時間: 6分</CardDescription>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-muted-foreground">
								ノートの作成方法から、AIアシスト機能、ナレッジグラフの構築方法までを詳しく解説します。
							</p>
						</CardContent>
					</Card>
				</div>
			</Container>
		</section>
	);
}
