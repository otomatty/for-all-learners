import { Check, X } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function PricingSection() {
	return (
		<section className="w-full py-12 md:py-24">
			<Container>
				<Tabs defaultValue="monthly" className="w-full max-w-4xl mx-auto">
					<div className="flex justify-center mb-8">
						<TabsList>
							<TabsTrigger value="monthly">月額プラン</TabsTrigger>
							<TabsTrigger value="yearly">年額プラン（お得）</TabsTrigger>
						</TabsList>
					</div>

					<TabsContent value="monthly">
						<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">
							{/* フリープラン */}
							<Card className="flex flex-col">
								<CardHeader className="flex flex-col space-y-1.5">
									<CardTitle className="text-2xl">フリープラン</CardTitle>
									<CardDescription>
										まずは気軽に試してみたい方向け
									</CardDescription>
									<div className="mt-4">
										<span className="text-4xl font-bold">¥0</span>
										<span className="text-muted-foreground">/月</span>
									</div>
								</CardHeader>
								<CardContent className="grid gap-4 flex-1">
									<div className="grid gap-2">
										<div className="flex items-center gap-2">
											<Check className="h-4 w-4 text-primary" />
											<span>AI問題自動生成（月間3回まで）</span>
										</div>
										<div className="flex items-center gap-2">
											<Check className="h-4 w-4 text-primary" />
											<span>FSRSアルゴリズム（基本機能）</span>
										</div>
										<div className="flex items-center gap-2">
											<Check className="h-4 w-4 text-primary" />
											<span>デッキ数上限：5デッキ</span>
										</div>
										<div className="flex items-center gap-2">
											<Check className="h-4 w-4 text-primary" />
											<span>カード総数上限：100カード</span>
										</div>
										<div className="flex items-center gap-2">
											<Check className="h-4 w-4 text-primary" />
											<span>ノート機能（月間3ノートまで）</span>
										</div>
										<div className="flex items-center gap-2">
											<Check className="h-4 w-4 text-primary" />
											<span>閲覧専用リンク共有</span>
										</div>
										<div className="flex items-center gap-2">
											<Check className="h-4 w-4 text-primary" />
											<span>基本的なゲーミフィケーション要素</span>
										</div>
										<div className="flex items-center gap-2">
											<X className="h-4 w-4 text-muted-foreground" />
											<span className="text-muted-foreground">
												AIノートアシスト
											</span>
										</div>
										<div className="flex items-center gap-2">
											<X className="h-4 w-4 text-muted-foreground" />
											<span className="text-muted-foreground">
												高度な共有機能
											</span>
										</div>
										<div className="flex items-center gap-2">
											<X className="h-4 w-4 text-muted-foreground" />
											<span className="text-muted-foreground">広告非表示</span>
										</div>
									</div>
								</CardContent>
								<CardFooter>
									<Button className="w-full">無料で始める</Button>
								</CardFooter>
							</Card>

							{/* プレミアムプラン */}
							<Card className="flex flex-col border-primary">
								<CardHeader className="flex flex-col space-y-1.5">
									<div className="inline-flex self-center rounded-full bg-primary/20 px-3 py-1 text-sm font-medium text-primary mb-2">
										おすすめ
									</div>
									<CardTitle className="text-2xl">プレミアムプラン</CardTitle>
									<CardDescription>
										全機能を活用して学習効果を最大化
									</CardDescription>
									<div className="mt-4">
										<span className="text-4xl font-bold">¥1,280</span>
										<span className="text-muted-foreground">/月</span>
									</div>
								</CardHeader>
								<CardContent className="grid gap-4 flex-1">
									<div className="grid gap-2">
										<div className="flex items-center gap-2">
											<Check className="h-4 w-4 text-primary" />
											<span>AI問題自動生成（無制限）</span>
										</div>
										<div className="flex items-center gap-2">
											<Check className="h-4 w-4 text-primary" />
											<span>FSRSアルゴリズム（高度機能）</span>
										</div>
										<div className="flex items-center gap-2">
											<Check className="h-4 w-4 text-primary" />
											<span>デッキ数：無制限</span>
										</div>
										<div className="flex items-center gap-2">
											<Check className="h-4 w-4 text-primary" />
											<span>カード総数：無制限</span>
										</div>
										<div className="flex items-center gap-2">
											<Check className="h-4 w-4 text-primary" />
											<span>ノート機能（無制限、AIアシスト付き）</span>
										</div>
										<div className="flex items-center gap-2">
											<Check className="h-4 w-4 text-primary" />
											<span>高度な共有機能（共同編集、チーム共有）</span>
										</div>
										<div className="flex items-center gap-2">
											<Check className="h-4 w-4 text-primary" />
											<span>全てのゲーミフィケーション要素</span>
										</div>
										<div className="flex items-center gap-2">
											<Check className="h-4 w-4 text-primary" />
											<span>広告非表示</span>
										</div>
										<div className="flex items-center gap-2">
											<Check className="h-4 w-4 text-primary" />
											<span>優先カスタマーサポート</span>
										</div>
										<div className="flex items-center gap-2">
											<Check className="h-4 w-4 text-primary" />
											<span>オフラインアクセス機能（一部）</span>
										</div>
									</div>
								</CardContent>
								<CardFooter>
									<Button className="w-full" variant="default">
										14日間無料トライアル
									</Button>
								</CardFooter>
							</Card>
						</div>
					</TabsContent>

					<TabsContent value="yearly">
						<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">
							{/* フリープラン */}
							<Card className="flex flex-col">
								<CardHeader className="flex flex-col space-y-1.5">
									<CardTitle className="text-2xl">フリープラン</CardTitle>
									<CardDescription>
										まずは気軽に試してみたい方向け
									</CardDescription>
									<div className="mt-4">
										<span className="text-4xl font-bold">¥0</span>
										<span className="text-muted-foreground">/年</span>
									</div>
								</CardHeader>
								<CardContent className="grid gap-4 flex-1">
									<div className="grid gap-2">
										<div className="flex items-center gap-2">
											<Check className="h-4 w-4 text-primary" />
											<span>AI問題自動生成（月間3回まで）</span>
										</div>
										<div className="flex items-center gap-2">
											<Check className="h-4 w-4 text-primary" />
											<span>FSRSアルゴリズム（基本機能）</span>
										</div>
										<div className="flex items-center gap-2">
											<Check className="h-4 w-4 text-primary" />
											<span>デッキ数上限：5デッキ</span>
										</div>
										<div className="flex items-center gap-2">
											<Check className="h-4 w-4 text-primary" />
											<span>カード総数上限：100カード</span>
										</div>
										<div className="flex items-center gap-2">
											<Check className="h-4 w-4 text-primary" />
											<span>ノート機能（月間3ノートまで）</span>
										</div>
										<div className="flex items-center gap-2">
											<Check className="h-4 w-4 text-primary" />
											<span>閲覧専用リンク共有</span>
										</div>
										<div className="flex items-center gap-2">
											<Check className="h-4 w-4 text-primary" />
											<span>基本的なゲーミフィケーション要素</span>
										</div>
										<div className="flex items-center gap-2">
											<X className="h-4 w-4 text-muted-foreground" />
											<span className="text-muted-foreground">
												AIノートアシスト
											</span>
										</div>
										<div className="flex items-center gap-2">
											<X className="h-4 w-4 text-muted-foreground" />
											<span className="text-muted-foreground">
												高度な共有機能
											</span>
										</div>
										<div className="flex items-center gap-2">
											<X className="h-4 w-4 text-muted-foreground" />
											<span className="text-muted-foreground">広告非表示</span>
										</div>
									</div>
								</CardContent>
								<CardFooter>
									<Button className="w-full">無料で始める</Button>
								</CardFooter>
							</Card>

							{/* プレミアムプラン（年額） */}
							<Card className="flex flex-col border-primary">
								<CardHeader className="flex flex-col space-y-1.5">
									<div className="inline-flex self-center rounded-full bg-primary/20 px-3 py-1 text-sm font-medium text-primary mb-2">
										おすすめ
									</div>
									<CardTitle className="text-2xl">
										プレミアムプラン（年額）
									</CardTitle>
									<CardDescription>
										全機能を活用して学習効果を最大化
									</CardDescription>
									<div className="mt-4">
										<span className="text-4xl font-bold">¥12,800</span>
										<span className="text-muted-foreground">/年</span>
										<p className="text-xs text-muted-foreground mt-1">
											月額換算 約¥1,067（約2ヶ月分お得）
										</p>
									</div>
								</CardHeader>
								<CardContent className="grid gap-4 flex-1">
									<div className="grid gap-2">
										<div className="flex items-center gap-2">
											<Check className="h-4 w-4 text-primary" />
											<span>AI問題自動生成（無制限）</span>
										</div>
										<div className="flex items-center gap-2">
											<Check className="h-4 w-4 text-primary" />
											<span>FSRSアルゴリズム（高度機能）</span>
										</div>
										<div className="flex items-center gap-2">
											<Check className="h-4 w-4 text-primary" />
											<span>デッキ数：無制限</span>
										</div>
										<div className="flex items-center gap-2">
											<Check className="h-4 w-4 text-primary" />
											<span>カード総数：無制限</span>
										</div>
										<div className="flex items-center gap-2">
											<Check className="h-4 w-4 text-primary" />
											<span>ノート機能（無制限、AIアシスト付き）</span>
										</div>
										<div className="flex items-center gap-2">
											<Check className="h-4 w-4 text-primary" />
											<span>高度な共有機能（共同編集、チーム共有）</span>
										</div>
										<div className="flex items-center gap-2">
											<Check className="h-4 w-4 text-primary" />
											<span>全てのゲーミフィケーション要素</span>
										</div>
										<div className="flex items-center gap-2">
											<Check className="h-4 w-4 text-primary" />
											<span>広告非表示</span>
										</div>
										<div className="flex items-center gap-2">
											<Check className="h-4 w-4 text-primary" />
											<span>優先カスタマーサポート</span>
										</div>
										<div className="flex items-center gap-2">
											<Check className="h-4 w-4 text-primary" />
											<span>オフラインアクセス機能（一部）</span>
										</div>
									</div>
								</CardContent>
								<CardFooter>
									<Button className="w-full" variant="default">
										14日間無料トライアル
									</Button>
								</CardFooter>
							</Card>
						</div>
					</TabsContent>
				</Tabs>
			</Container>
		</section>
	);
}
