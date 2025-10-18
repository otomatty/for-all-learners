import { BarChart, BookOpen, Brain, Layers, Share2, Zap } from "lucide-react";
import Image from "next/image";
import { Container } from "@/components/container";
import { SectionHeader } from "@/components/SectionHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FeatureSection() {
	return (
		<section className="w-full py-12 md:py-24 lg:py-32" id="features">
			<Container>
				<SectionHeader
					label="主要機能"
					title="あなたの学習をサポートする機能"
					description="AIと科学的アプローチを組み合わせた革新的な機能で、効率的な学習と継続的なモチベーション維持を実現します。"
				/>

				{/* デッキ＆カード機能 */}
				<div className="grid items-center gap-6 py-12 lg:grid-cols-[1fr_500px] lg:gap-12 xl:grid-cols-[1fr_550px]">
					<Image
						src="/placeholder.svg?height=1080&width=1920"
						width={550}
						height={310}
						alt="デッキ＆カード機能のイメージ"
						className="mx-auto aspect-video overflow-hidden rounded-xl object-cover object-center sm:w-full lg:order-last"
					/>
					<div className="flex flex-col justify-center space-y-4">
						<div className="inline-flex items-center space-x-2 rounded-md bg-muted px-3 py-1 text-sm font-medium">
							<BookOpen className="h-4 w-4" />
							<span>デッキ＆カード機能</span>
						</div>
						<h3 className="text-2xl font-bold tracking-tighter md:text-3xl">
							多様な教材取り込みとAI問題生成
						</h3>
						<p className="text-muted-foreground md:text-lg/relaxed">
							音声入力、画像OCR、テキスト入力など様々な方法で教材を取り込み、AIが自動で最適な問題を生成します。
							FSRSアルゴリズムによる科学的な復習スケジュールで、効率的に記憶を定着させます。
						</p>
						<ul className="grid gap-2 py-4">
							<li className="flex items-center gap-2">
								<div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20">
									<Zap className="h-4 w-4 text-primary" />
								</div>
								<span>音声入力（音読）での自動文字起こし</span>
							</li>
							<li className="flex items-center gap-2">
								<div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20">
									<Zap className="h-4 w-4 text-primary" />
								</div>
								<span>画像OCRでテキスト化</span>
							</li>
							<li className="flex items-center gap-2">
								<div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20">
									<Zap className="h-4 w-4 text-primary" />
								</div>
								<span>Google Gemini APIを活用した多形式の問題自動生成</span>
							</li>
							<li className="flex items-center gap-2">
								<div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20">
									<Zap className="h-4 w-4 text-primary" />
								</div>
								<span>
									FSRSアルゴリズムによる最適な復習タイミングの自動計算
								</span>
							</li>
						</ul>
					</div>
				</div>

				{/* ノート機能 */}
				<div className="grid items-center gap-6 py-12 lg:grid-cols-[500px_1fr] lg:gap-12 xl:grid-cols-[550px_1fr]">
					<Image
						src="/placeholder.svg?height=1080&width=1920"
						width={550}
						height={310}
						alt="ノート機能のイメージ"
						className="mx-auto aspect-video overflow-hidden rounded-xl object-cover object-center sm:w-full"
					/>
					<div className="flex flex-col justify-center space-y-4">
						<div className="inline-flex items-center space-x-2 rounded-md bg-muted px-3 py-1 text-sm font-medium">
							<Layers className="h-4 w-4" />
							<span>ノート機能</span>
						</div>
						<h3 className="text-2xl font-bold tracking-tighter md:text-3xl">
							知識を整理し、深める高度なノート機能
						</h3>
						<p className="text-muted-foreground md:text-lg/relaxed">
							学習中に気になった単語や用語を簡単に登録し、AIによるノート自動生成機能で効率的に知識を整理。
							ノート間のリンク機能でナレッジグラフを構築し、知識の関連性を視覚的に把握できます。
						</p>
						<ul className="grid gap-2 py-4">
							<li className="flex items-center gap-2">
								<div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20">
									<Zap className="h-4 w-4 text-primary" />
								</div>
								<span>学習中の不明語句をワンクリックでノート化</span>
							</li>
							<li className="flex items-center gap-2">
								<div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20">
									<Zap className="h-4 w-4 text-primary" />
								</div>
								<span>タイトルやキーワード入力でAIによる下書き生成</span>
							</li>
							<li className="flex items-center gap-2">
								<div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20">
									<Zap className="h-4 w-4 text-primary" />
								</div>
								<span>ノート間を相互リンクしナレッジグラフを構築</span>
							</li>
							<li className="flex items-center gap-2">
								<div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20">
									<Zap className="h-4 w-4 text-primary" />
								</div>
								<span>Markdown／PDF形式でエクスポート</span>
							</li>
						</ul>
					</div>
				</div>

				{/* その他の機能 */}
				<div className="grid grid-cols-1 gap-6 pt-12 md:grid-cols-2 lg:grid-cols-3">
					<Card>
						<CardHeader className="flex flex-row items-center gap-4">
							<Brain className="h-8 w-8 text-primary" />
							<div className="grid gap-1">
								<CardTitle>AIによる学習最適化</CardTitle>
							</div>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-muted-foreground">
								AIが学習パターンを分析し、個々のユーザーに最適化された学習プランを提案。苦手分野を特定し、集中的な学習をサポートします。
							</p>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="flex flex-row items-center gap-4">
							<BarChart className="h-8 w-8 text-primary" />
							<div className="grid gap-1">
								<CardTitle>詳細な学習分析</CardTitle>
							</div>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-muted-foreground">
								学習時間、正解率、復習効率などを詳細に分析し、視覚的にわかりやすく表示。学習の進捗を把握し、モチベーション維持に役立ちます。
							</p>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="flex flex-row items-center gap-4">
							<Share2 className="h-8 w-8 text-primary" />
							<div className="grid gap-1">
								<CardTitle>共有と協力学習</CardTitle>
							</div>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-muted-foreground">
								作成したデッキやノートを友人や同僚と共有。共同編集機能で協力して学習コンテンツを作成し、互いに高め合うことができます。
							</p>
						</CardContent>
					</Card>
				</div>
			</Container>
		</section>
	);
}
