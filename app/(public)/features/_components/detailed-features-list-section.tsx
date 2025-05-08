import { BookOpen, Brain, Layers, Users, Zap } from "lucide-react";
import { Container } from "@/components/container";

export default function DetailedFeaturesListSection() {
	return (
		<section className="w-full py-12 md:py-24 bg-slate-50">
			<Container>
				<div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
					<div className="space-y-2">
						<h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
							すべての機能を詳しく見る
						</h2>
						<p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
							本アプリケーションが提供する多彩な機能の詳細をご紹介します。
						</p>
					</div>
				</div>

				<div className="grid gap-8 md:grid-cols-2">
					{/* デッキ＆カード機能 */}
					<div className="space-y-4">
						<div className="inline-flex items-center space-x-2 rounded-md bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
							<BookOpen className="h-4 w-4" />
							<span>デッキ＆カード機能</span>
						</div>
						<h3 className="text-xl font-bold">
							効率的な学習コンテンツ作成と復習
						</h3>
						<ul className="space-y-2">
							<li className="flex items-start gap-2">
								<div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 mt-0.5">
									<Zap className="h-3 w-3 text-primary" />
								</div>
								<div>
									<span className="font-medium">教材取り込み</span>
									<p className="text-sm text-muted-foreground">
										音声入力（音読）での自動文字起こし、画像OCRでテキスト化
									</p>
								</div>
							</li>
							<li className="flex items-start gap-2">
								<div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 mt-0.5">
									<Zap className="h-3 w-3 text-primary" />
								</div>
								<div>
									<span className="font-medium">AI問題生成</span>
									<p className="text-sm text-muted-foreground">
										Google Gemini
										APIを活用した多形式の問題即時作成、モデルや問題難易度のカスタマイズ
									</p>
								</div>
							</li>
							<li className="flex items-start gap-2">
								<div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 mt-0.5">
									<Zap className="h-3 w-3 text-primary" />
								</div>
								<div>
									<span className="font-medium">レビュー＆進捗管理</span>
									<p className="text-sm text-muted-foreground">
										解答フィードバックのリアルタイム記録、FSRSアルゴリズムによる復習タイミング自動計算
									</p>
								</div>
							</li>
							<li className="flex items-start gap-2">
								<div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 mt-0.5">
									<Zap className="h-3 w-3 text-primary" />
								</div>
								<div>
									<span className="font-medium">カード編集・共有</span>
									<p className="text-sm text-muted-foreground">
										問題文・解答の手動編集機能、デッキ単位での共同編集・共有リンク生成
									</p>
								</div>
							</li>
						</ul>
					</div>

					{/* ノート機能 */}
					<div className="space-y-4">
						<div className="inline-flex items-center space-x-2 rounded-md bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
							<Layers className="h-4 w-4" />
							<span>ノート機能</span>
						</div>
						<h3 className="text-xl font-bold">知識の整理と深化をサポート</h3>
						<ul className="space-y-2">
							<li className="flex items-start gap-2">
								<div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 mt-0.5">
									<Zap className="h-3 w-3 text-primary" />
								</div>
								<div>
									<span className="font-medium">単語＆用語登録</span>
									<p className="text-sm text-muted-foreground">
										学習中に不明語句をワンクリックでノート化、タグやカテゴリで体系的に整理
									</p>
								</div>
							</li>
							<li className="flex items-start gap-2">
								<div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 mt-0.5">
									<Zap className="h-3 w-3 text-primary" />
								</div>
								<div>
									<span className="font-medium">ノート自動生成</span>
									<p className="text-sm text-muted-foreground">
										タイトルやキーワード入力でAI（Gemini）による下書き生成、生成後の編集・追記が可能
									</p>
								</div>
							</li>
							<li className="flex items-start gap-2">
								<div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 mt-0.5">
									<Zap className="h-3 w-3 text-primary" />
								</div>
								<div>
									<span className="font-medium">関連ノートリンク</span>
									<p className="text-sm text-muted-foreground">
										ノート間を相互リンクしナレッジグラフを構築、グラフビューやサイドバーで関連性を探索
									</p>
								</div>
							</li>
							<li className="flex items-start gap-2">
								<div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 mt-0.5">
									<Zap className="h-3 w-3 text-primary" />
								</div>
								<div>
									<span className="font-medium">エクスポート＆共有</span>
									<p className="text-sm text-muted-foreground">
										Markdown／PDF形式でエクスポート、チーム共有用リンクの作成
									</p>
								</div>
							</li>
						</ul>
					</div>

					{/* AI活用機能 */}
					<div className="space-y-4">
						<div className="inline-flex items-center space-x-2 rounded-md bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
							<Brain className="h-4 w-4" />
							<span>AI活用機能</span>
						</div>
						<h3 className="text-xl font-bold">最新AIによる学習効率の最大化</h3>
						<ul className="space-y-2">
							<li className="flex items-start gap-2">
								<div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 mt-0.5">
									<Zap className="h-3 w-3 text-primary" />
								</div>
								<div>
									<span className="font-medium">
										インテリジェント教材プロセッシング
									</span>
									<p className="text-sm text-muted-foreground">
										多様な形式の教材をAIが瞬時に解析し、最適な問題形式を自動生成
									</p>
								</div>
							</li>
							<li className="flex items-start gap-2">
								<div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 mt-0.5">
									<Zap className="h-3 w-3 text-primary" />
								</div>
								<div>
									<span className="font-medium">
										科学的根拠に基づく記憶定着
									</span>
									<p className="text-sm text-muted-foreground">
										FSRSアルゴリズムを搭載し、個々のユーザーの忘却曲線を分析した最適な復習タイミングを提案
									</p>
								</div>
							</li>
							<li className="flex items-start gap-2">
								<div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 mt-0.5">
									<Zap className="h-3 w-3 text-primary" />
								</div>
								<div>
									<span className="font-medium">
										パーソナライズド・ラーニングパス
									</span>
									<p className="text-sm text-muted-foreground">
										学習者の理解度や進捗状況を分析し、個々に最適化された学習計画を動的に生成・提供
									</p>
								</div>
							</li>
						</ul>
					</div>

					{/* ゲーミフィケーション */}
					<div className="space-y-4">
						<div className="inline-flex items-center space-x-2 rounded-md bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
							<Users className="h-4 w-4" />
							<span>ゲーミフィケーション</span>
						</div>
						<h3 className="text-xl font-bold">
							持続的な学習エンゲージメントの醸成
						</h3>
						<ul className="space-y-2">
							<li className="flex items-start gap-2">
								<div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 mt-0.5">
									<Zap className="h-3 w-3 text-primary" />
								</div>
								<div>
									<span className="font-medium">
										進捗の可視化と内発的動機付け
									</span>
									<p className="text-sm text-muted-foreground">
										ポイント獲得、バッジ収集、スキルツリー形式での進捗表示など、多彩な要素で学習意欲を引き出します
									</p>
								</div>
							</li>
							<li className="flex items-start gap-2">
								<div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 mt-0.5">
									<Zap className="h-3 w-3 text-primary" />
								</div>
								<div>
									<span className="font-medium">
										創造性を刺激するインタラクティブ機能
									</span>
									<p className="text-sm text-muted-foreground">
										AIによるノート下書き生成、マルチメディア情報の挿入・編集など、思考を深める体験を提供
									</p>
								</div>
							</li>
							<li className="flex items-start gap-2">
								<div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 mt-0.5">
									<Zap className="h-3 w-3 text-primary" />
								</div>
								<div>
									<span className="font-medium">協調学習と健全な競争</span>
									<p className="text-sm text-muted-foreground">
										共同編集、ランキングシステム、スタディグループ機能で、仲間と切磋琢磨しながら学習できます
									</p>
								</div>
							</li>
						</ul>
					</div>
				</div>
			</Container>
		</section>
	);
}
