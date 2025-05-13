import { Container } from "@/components/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	BarChart,
	BookOpen,
	Brain,
	FileText,
	ImageIcon,
	Layers,
	LinkIcon,
	Mic,
	Share2,
	Users,
	Zap,
} from "lucide-react";
import Image from "next/image";

export default function TabbedFeaturesSection() {
	return (
		<section className="w-full py-12 md:py-24">
			<Container>
				<Tabs defaultValue="deck" className="w-full">
					<TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
						<TabsTrigger value="deck">デッキ＆カード</TabsTrigger>
						<TabsTrigger value="note">ノート機能</TabsTrigger>
						<TabsTrigger value="ai">AI活用</TabsTrigger>
						<TabsTrigger value="community">共有・コミュニティ</TabsTrigger>
					</TabsList>

					{/* デッキ＆カード機能 */}
					<TabsContent value="deck" className="mt-6">
						<div className="grid gap-6 lg:grid-cols-[1fr_500px] lg:gap-12 xl:grid-cols-[1fr_550px]">
							<div className="flex flex-col justify-center space-y-4">
								<h2 className="text-2xl font-bold tracking-tighter md:text-3xl">
									デッキ＆カード機能
								</h2>
								<p className="text-muted-foreground md:text-lg/relaxed">
									様々な方法で教材を取り込み、AIが自動で問題を生成。FSRSアルゴリズムによる科学的な復習スケジュールで、効率的に記憶を定着させます。
								</p>

								<div className="grid gap-4 md:grid-cols-2">
									<Card>
										<CardHeader className="p-4">
											<CardTitle className="flex items-center text-lg">
												<Mic className="mr-2 h-5 w-5 text-primary" />
												音声入力
											</CardTitle>
										</CardHeader>
										<CardContent className="p-4 pt-0">
											<p className="text-sm text-muted-foreground">
												音読した内容を自動で文字起こし。通勤中や移動時間を活用した学習が可能になります。
											</p>
										</CardContent>
									</Card>

									<Card>
										<CardHeader className="p-4">
											<CardTitle className="flex items-center text-lg">
												<ImageIcon className="mr-2 h-5 w-5 text-primary" />
												画像OCR
											</CardTitle>
										</CardHeader>
										<CardContent className="p-4 pt-0">
											<p className="text-sm text-muted-foreground">
												教科書や参考書のページを撮影するだけで、テキストを自動抽出し教材として取り込みます。
											</p>
										</CardContent>
									</Card>

									<Card>
										<CardHeader className="p-4">
											<CardTitle className="flex items-center text-lg">
												<Brain className="mr-2 h-5 w-5 text-primary" />
												AI問題生成
											</CardTitle>
										</CardHeader>
										<CardContent className="p-4 pt-0">
											<p className="text-sm text-muted-foreground">
												Google Gemini
												APIを活用し、フラッシュカード、穴埋め、選択式など多様な問題形式を自動生成します。
											</p>
										</CardContent>
									</Card>

									<Card>
										<CardHeader className="p-4">
											<CardTitle className="flex items-center text-lg">
												<BarChart className="mr-2 h-5 w-5 text-primary" />
												FSRS学習管理
											</CardTitle>
										</CardHeader>
										<CardContent className="p-4 pt-0">
											<p className="text-sm text-muted-foreground">
												科学的なFSRSアルゴリズムで最適な復習タイミングを自動計算し、効率的な記憶定着をサポートします。
											</p>
										</CardContent>
									</Card>
								</div>
							</div>

							<div className="relative aspect-video overflow-hidden rounded-xl border shadow-xl">
								<Image
									src="/placeholder.svg?height=1080&width=1920"
									width={550}
									height={310}
									alt="デッキ＆カード機能のスクリーンショット"
									className="object-cover"
								/>
							</div>
						</div>
					</TabsContent>

					{/* ノート機能 */}
					<TabsContent value="note" className="mt-6">
						<div className="grid gap-6 lg:grid-cols-[500px_1fr] lg:gap-12 xl:grid-cols-[550px_1fr]">
							<div className="relative aspect-video overflow-hidden rounded-xl border shadow-xl">
								<Image
									src="/placeholder.svg?height=1080&width=1920"
									width={550}
									height={310}
									alt="ノート機能のスクリーンショット"
									className="object-cover"
								/>
							</div>

							<div className="flex flex-col justify-center space-y-4">
								<h2 className="text-2xl font-bold tracking-tighter md:text-3xl">
									ノート機能
								</h2>
								<p className="text-muted-foreground md:text-lg/relaxed">
									学習内容を整理し、知識を深めるための高度なノート機能。AIによる自動生成やナレッジグラフの構築で、効率的な知識の体系化をサポートします。
								</p>

								<div className="grid gap-4 md:grid-cols-2">
									<Card>
										<CardHeader className="p-4">
											<CardTitle className="flex items-center text-lg">
												<FileText className="mr-2 h-5 w-5 text-primary" />
												単語＆用語登録
											</CardTitle>
										</CardHeader>
										<CardContent className="p-4 pt-0">
											<p className="text-sm text-muted-foreground">
												学習中に不明な語句をワンクリックでノート化。タグやカテゴリで体系的に整理できます。
											</p>
										</CardContent>
									</Card>

									<Card>
										<CardHeader className="p-4">
											<CardTitle className="flex items-center text-lg">
												<Brain className="mr-2 h-5 w-5 text-primary" />
												ノート自動生成
											</CardTitle>
										</CardHeader>
										<CardContent className="p-4 pt-0">
											<p className="text-sm text-muted-foreground">
												タイトルやキーワードを入力するだけで、AIが関連情報を収集し下書きを自動生成します。
											</p>
										</CardContent>
									</Card>

									<Card>
										<CardHeader className="p-4">
											<CardTitle className="flex items-center text-lg">
												<LinkIcon className="mr-2 h-5 w-5 text-primary" />
												関連ノートリンク
											</CardTitle>
										</CardHeader>
										<CardContent className="p-4 pt-0">
											<p className="text-sm text-muted-foreground">
												ノート間を相互リンクしてナレッジグラフを構築。グラフビューで関連性を視覚的に探索できます。
											</p>
										</CardContent>
									</Card>

									<Card>
										<CardHeader className="p-4">
											<CardTitle className="flex items-center text-lg">
												<Share2 className="mr-2 h-5 w-5 text-primary" />
												エクスポート＆共有
											</CardTitle>
										</CardHeader>
										<CardContent className="p-4 pt-0">
											<p className="text-sm text-muted-foreground">
												Markdown／PDF形式でエクスポート可能。チーム共有用リンクで知識を共有できます。
											</p>
										</CardContent>
									</Card>
								</div>
							</div>
						</div>
					</TabsContent>

					{/* AI活用 */}
					<TabsContent value="ai" className="mt-6">
						<div className="grid gap-6 lg:grid-cols-[1fr_500px] lg:gap-12 xl:grid-cols-[1fr_550px]">
							<div className="flex flex-col justify-center space-y-4">
								<h2 className="text-2xl font-bold tracking-tighter md:text-3xl">
									AI活用機能
								</h2>
								<p className="text-muted-foreground md:text-lg/relaxed">
									最新のAI技術を活用し、学習効率を飛躍的に向上させる機能群。個々のユーザーに最適化された学習体験を提供します。
								</p>

								<div className="grid gap-4 md:grid-cols-2">
									<Card>
										<CardHeader className="p-4">
											<CardTitle className="flex items-center text-lg">
												<Brain className="mr-2 h-5 w-5 text-primary" />
												問題自動生成
											</CardTitle>
										</CardHeader>
										<CardContent className="p-4 pt-0">
											<p className="text-sm text-muted-foreground">
												Google Gemini
												APIを活用し、取り込んだ教材から多様な形式の問題を自動生成します。
											</p>
										</CardContent>
									</Card>

									<Card>
										<CardHeader className="p-4">
											<CardTitle className="flex items-center text-lg">
												<Zap className="mr-2 h-5 w-5 text-primary" />
												パーソナライズド学習
											</CardTitle>
										</CardHeader>
										<CardContent className="p-4 pt-0">
											<p className="text-sm text-muted-foreground">
												学習パターンや正誤データを分析し、個々のユーザーに最適化された学習プランを提案します。
											</p>
										</CardContent>
									</Card>

									<Card>
										<CardHeader className="p-4">
											<CardTitle className="flex items-center text-lg">
												<FileText className="mr-2 h-5 w-5 text-primary" />
												コンテンツ解析
											</CardTitle>
										</CardHeader>
										<CardContent className="p-4 pt-0">
											<p className="text-sm text-muted-foreground">
												取り込まれた教材を自動で解析し、重要ポイントの抽出や関連知識の提案を行います。
											</p>
										</CardContent>
									</Card>

									<Card>
										<CardHeader className="p-4">
											<CardTitle className="flex items-center text-lg">
												<BarChart className="mr-2 h-5 w-5 text-primary" />
												学習分析
											</CardTitle>
										</CardHeader>
										<CardContent className="p-4 pt-0">
											<p className="text-sm text-muted-foreground">
												学習データを多角的に分析し、苦手分野の特定や効率的な学習方法の提案を行います。
											</p>
										</CardContent>
									</Card>
								</div>
							</div>

							<div className="relative aspect-video overflow-hidden rounded-xl border shadow-xl">
								<Image
									src="/placeholder.svg?height=1080&width=1920"
									width={550}
									height={310}
									alt="AI活用機能のスクリーンショット"
									className="object-cover"
								/>
							</div>
						</div>
					</TabsContent>

					{/* 共有・コミュニティ */}
					<TabsContent value="community" className="mt-6">
						<div className="grid gap-6 lg:grid-cols-[500px_1fr] lg:gap-12 xl:grid-cols-[550px_1fr]">
							<div className="relative aspect-video overflow-hidden rounded-xl border shadow-xl">
								<Image
									src="/placeholder.svg?height=1080&width=1920"
									width={550}
									height={310}
									alt="共有・コミュニティ機能のスクリーンショット"
									className="object-cover"
								/>
							</div>

							<div className="flex flex-col justify-center space-y-4">
								<h2 className="text-2xl font-bold tracking-tighter md:text-3xl">
									共有・コミュニティ機能
								</h2>
								<p className="text-muted-foreground md:text-lg/relaxed">
									仲間と一緒に学ぶことで、モチベーションを高め、互いに高め合える環境を提供します。
								</p>

								<div className="grid gap-4 md:grid-cols-2">
									<Card>
										<CardHeader className="p-4">
											<CardTitle className="flex items-center text-lg">
												<Share2 className="mr-2 h-5 w-5 text-primary" />
												デッキ＆ノート共有
											</CardTitle>
										</CardHeader>
										<CardContent className="p-4 pt-0">
											<p className="text-sm text-muted-foreground">
												作成したデッキやノートを友人や同僚と共有。共同編集機能で協力して学習コンテンツを作成できます。
											</p>
										</CardContent>
									</Card>

									<Card>
										<CardHeader className="p-4">
											<CardTitle className="flex items-center text-lg">
												<Users className="mr-2 h-5 w-5 text-primary" />
												スタディグループ
											</CardTitle>
										</CardHeader>
										<CardContent className="p-4 pt-0">
											<p className="text-sm text-muted-foreground">
												同じ目標を持つ仲間とグループを作成。進捗共有や専用チャットで互いに励まし合えます。
											</p>
										</CardContent>
									</Card>

									<Card>
										<CardHeader className="p-4">
											<CardTitle className="flex items-center text-lg">
												<BarChart className="mr-2 h-5 w-5 text-primary" />
												ランキング機能
											</CardTitle>
										</CardHeader>
										<CardContent className="p-4 pt-0">
											<p className="text-sm text-muted-foreground">
												学習時間や正解率に基づいたランキングで健全な競争意識を醸成。モチベーション維持に役立ちます。
											</p>
										</CardContent>
									</Card>

									<Card>
										<CardHeader className="p-4">
											<CardTitle className="flex items-center text-lg">
												<Zap className="mr-2 h-5 w-5 text-primary" />
												協力学習モード
											</CardTitle>
										</CardHeader>
										<CardContent className="p-4 pt-0">
											<p className="text-sm text-muted-foreground">
												難問に協力して挑む「レイドバトル」風の協力モードや、クイズ形式の対戦モードで楽しく学習できます。
											</p>
										</CardContent>
									</Card>
								</div>
							</div>
						</div>
					</TabsContent>
				</Tabs>
			</Container>
		</section>
	);
}
