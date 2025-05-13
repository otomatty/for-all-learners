import { Container } from "@/components/container";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	BarChart,
	BookOpen,
	Brain,
	FileText,
	Layers,
	Settings,
	Share2,
	UserCircle,
	Users,
	Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function StepGuideSection() {
	return (
		<section className="w-full py-12 md:py-24">
			<Container>
				<Tabs defaultValue="start" className="w-full">
					<TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
						<TabsTrigger value="start">はじめに</TabsTrigger>
						<TabsTrigger value="deck">デッキ作成</TabsTrigger>
						<TabsTrigger value="study">学習方法</TabsTrigger>
						<TabsTrigger value="note">ノート機能</TabsTrigger>
						<TabsTrigger value="share">共有機能</TabsTrigger>
					</TabsList>

					{/* はじめに */}
					<TabsContent value="start" className="mt-6">
						<div className="grid gap-6 lg:grid-cols-[1fr_500px] lg:gap-12 xl:grid-cols-[1fr_550px]">
							<div className="flex flex-col justify-center space-y-4">
								<h2 className="text-2xl font-bold tracking-tighter md:text-3xl">
									アカウント登録とダッシュボード
								</h2>
								<p className="text-muted-foreground md:text-lg/relaxed">
									アプリケーションを始めるための最初のステップと、ダッシュボードの基本的な使い方をご紹介します。
								</p>

								<div className="space-y-4">
									<div className="rounded-lg border p-4">
										<h3 className="text-lg font-semibold mb-2 flex items-center">
											<UserCircle className="mr-2 h-5 w-5 text-primary" />
											アカウント作成
										</h3>
										<ol className="list-decimal pl-5 space-y-2">
											<li>
												アプリケーションのトップページにある「新規登録」ボタンをクリックします。
											</li>
											<li>
												メールアドレス、パスワードを設定し、利用規約に同意の上、登録を完了してください。
											</li>
											<li>
												SNSアカウント（Google、Xなど）を利用した簡単登録も可能です。
											</li>
										</ol>
									</div>

									<div className="rounded-lg border p-4">
										<h3 className="text-lg font-semibold mb-2 flex items-center">
											<BarChart className="mr-2 h-5 w-5 text-primary" />
											ダッシュボードの概要
										</h3>
										<p className="mb-2">
											ログイン後、最初に表示されるのがダッシュボードです。ここでは以下の情報が確認できます。
										</p>
										<ul className="list-disc pl-5 space-y-2">
											<li>
												学習状況のサマリー:
												現在学習中のデッキ、次の復習予定、総学習時間など
											</li>
											<li>最近作成したデッキやノートへのショートカット</li>
											<li>お知らせやお勧め情報</li>
											<li>各種機能へのナビゲーションメニュー</li>
										</ul>
									</div>
								</div>
							</div>

							<div className="relative aspect-video overflow-hidden rounded-xl border shadow-xl">
								<Image
									src="/placeholder.svg?height=1080&width=1920"
									width={550}
									height={310}
									alt="ダッシュボード画面のスクリーンショット"
									className="object-cover"
								/>
							</div>
						</div>
					</TabsContent>

					{/* デッキ作成 */}
					<TabsContent value="deck" className="mt-6">
						<div className="grid gap-6 lg:grid-cols-[500px_1fr] lg:gap-12 xl:grid-cols-[550px_1fr]">
							<div className="relative aspect-video overflow-hidden rounded-xl border shadow-xl">
								<Image
									src="/placeholder.svg?height=1080&width=1920"
									width={550}
									height={310}
									alt="デッキ作成画面のスクリーンショット"
									className="object-cover"
								/>
							</div>

							<div className="flex flex-col justify-center space-y-4">
								<h2 className="text-2xl font-bold tracking-tighter md:text-3xl">
									教材の取り込みとデッキ作成
								</h2>
								<p className="text-muted-foreground md:text-lg/relaxed">
									学習したい内容に基づいて、オリジナルの学習デッキを作成する方法をご紹介します。
								</p>

								<div className="space-y-4">
									<div className="rounded-lg border p-4">
										<h3 className="text-lg font-semibold mb-2 flex items-center">
											<BookOpen className="mr-2 h-5 w-5 text-primary" />
											デッキの新規作成
										</h3>
										<ol className="list-decimal pl-5 space-y-2">
											<li>
												ダッシュボードまたはデッキ一覧画面から「新しいデッキを作成」を選択します。
											</li>
											<li>
												デッキのタイトル、説明、関連タグなどを入力します。
											</li>
										</ol>
									</div>

									<div className="rounded-lg border p-4">
										<h3 className="text-lg font-semibold mb-2 flex items-center">
											<Zap className="mr-2 h-5 w-5 text-primary" />
											教材の取り込み方法
										</h3>
										<ul className="list-disc pl-5 space-y-2">
											<li>
												<strong>テキスト入力:</strong>{" "}
												学習したい文章やキーワードを直接入力、またはコピー＆ペーストします。
											</li>
											<li>
												<strong>音声入力（音読）:</strong>{" "}
												マイクに向かって教材を音読すると、AIがリアルタイムで文字起こしを行い、教材として取り込みます。（プレミアムプラン推奨）
											</li>
											<li>
												<strong>画像OCR:</strong>{" "}
												教科書や参考書のページを撮影した画像ファイル、またはスキャンしたPDF内の画像をアップロードすると、AIが画像内の文字を認識し、テキストデータとして抽出します。（プレミアムプラン推奨）
											</li>
										</ul>
									</div>

									<div className="rounded-lg border p-4">
										<h3 className="text-lg font-semibold mb-2 flex items-center">
											<Brain className="mr-2 h-5 w-5 text-primary" />
											AIによる問題生成
										</h3>
										<ol className="list-decimal pl-5 space-y-2">
											<li>
												デッキ作成画面で教材を取り込んだ後、「AI問題生成」ボタンをクリックします。
											</li>
											<li>
												<strong>問題形式の選択（任意）:</strong>{" "}
												フラッシュカード（一問一答）、穴埋め問題、選択式問題、記述式問題など、希望する問題形式や難易度があれば指定できます。
											</li>
											<li>
												<strong>生成の実行:</strong>{" "}
												AIが教材を分析し、問題と解答のペアを生成します。
											</li>
											<li>
												<strong>内容の確認と編集:</strong>{" "}
												生成された問題と解答を確認し、必要に応じて手動で編集・追加・削除が可能です。
											</li>
										</ol>
									</div>
								</div>
							</div>
						</div>
					</TabsContent>

					{/* 学習方法 */}
					<TabsContent value="study" className="mt-6">
						<div className="grid gap-6 lg:grid-cols-[1fr_500px] lg:gap-12 xl:grid-cols-[1fr_550px]">
							<div className="flex flex-col justify-center space-y-4">
								<h2 className="text-2xl font-bold tracking-tighter md:text-3xl">
									学習の進め方
								</h2>
								<p className="text-muted-foreground md:text-lg/relaxed">
									作成したデッキを使った学習方法と、FSRSアルゴリズムによる効率的な復習の進め方をご紹介します。
								</p>

								<div className="space-y-4">
									<div className="rounded-lg border p-4">
										<h3 className="text-lg font-semibold mb-2 flex items-center">
											<BookOpen className="mr-2 h-5 w-5 text-primary" />
											フラッシュカードと問題解答
										</h3>
										<ol className="list-decimal pl-5 space-y-2">
											<li>
												学習したいデッキを選択し、「学習開始」ボタンをクリックします。
											</li>
											<li>
												<strong>フラッシュカード形式:</strong>{" "}
												カードの表面（問題）を見て解答を思い浮かべ、カードをクリックまたはスワイプして裏面（解答）を確認します。
											</li>
											<li>
												<strong>問題解答形式:</strong>{" "}
												選択問題や穴埋め問題では、選択肢を選んだり、解答を入力したりします。
											</li>
											<li>
												<strong>自己評価:</strong>{" "}
												解答の正誤や理解度を「完璧」「分かった」「難しい」「分からない」などで評価します。この評価がFSRSアルゴリズムによる復習スケジューリングに利用されます。
											</li>
										</ol>
									</div>

									<div className="rounded-lg border p-4">
										<h3 className="text-lg font-semibold mb-2 flex items-center">
											<BarChart className="mr-2 h-5 w-5 text-primary" />
											FSRSアルゴリズムによる復習
										</h3>
										<p className="mb-2">忘</p>
										<h3 className="text-lg font-semibold mb-2 flex items-center">
											<BarChart className="mr-2 h-5 w-5 text-primary" />
											FSRSアルゴリズムによる復習
										</h3>
										<p className="mb-2">
											忘却曲線に基づいて、AIが最適なタイミングで復習を促します。
										</p>
										<ol className="list-decimal pl-5 space-y-2">
											<li>
												ダッシュボードや通知で、本日復習すべきカードが表示されます。
											</li>
											<li>
												「復習開始」から、指示されたカードの学習を行います。
											</li>
											<li>
												復習時の正誤や理解度も記録され、次回の復習スケジュールがさらに最適化されます。
											</li>
										</ol>
									</div>

									<div className="rounded-lg border p-4">
										<h3 className="text-lg font-semibold mb-2 flex items-center">
											<BarChart className="mr-2 h-5 w-5 text-primary" />
											進捗管理と学習統計
										</h3>
										<p className="mb-2">
											自身の学習状況を把握し、モチベーション維持に繋げましょう。
										</p>
										<ul className="list-disc pl-5 space-y-2">
											<li>
												<strong>ダッシュボード:</strong>{" "}
												学習時間、完了したカード数、正解率などの基本的な統計が表示されます。
											</li>
											<li>
												<strong>学習統計ページ（プレミアムプラン）:</strong>{" "}
												より詳細な分析データ（デッキごとの進捗、科目別の理解度、忘却曲線の可視化など）を確認できます。データのエクスポートも可能です。
											</li>
											<li>
												<strong>ゲーミフィケーション要素:</strong>{" "}
												獲得したポイント、バッジ、スキルツリーの進捗なども学習の成果として確認できます。
											</li>
										</ul>
									</div>
								</div>
							</div>

							<div className="relative aspect-video overflow-hidden rounded-xl border shadow-xl">
								<Image
									src="/placeholder.svg?height=1080&width=1920"
									width={550}
									height={310}
									alt="学習画面のスクリーンショット"
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
									ノート機能の活用
								</h2>
								<p className="text-muted-foreground md:text-lg/relaxed">
									学習内容の整理や知識の深化にノート機能を活用しましょう。
								</p>

								<div className="space-y-4">
									<div className="rounded-lg border p-4">
										<h3 className="text-lg font-semibold mb-2 flex items-center">
											<FileText className="mr-2 h-5 w-5 text-primary" />
											ノートの新規作成
										</h3>
										<ol className="list-decimal pl-5 space-y-2">
											<li>
												ナビゲーションメニューから「ノート」を選択し、「新しいノートを作成」をクリックします。
											</li>
											<li>タイトルやタグを設定します。</li>
										</ol>
									</div>

									<div className="rounded-lg border p-4">
										<h3 className="text-lg font-semibold mb-2 flex items-center">
											<Layers className="mr-2 h-5 w-5 text-primary" />
											内容の記述と編集
										</h3>
										<ul className="list-disc pl-5 space-y-2">
											<li>
												テキストエディタで自由に内容を記述します。学習中に気になった単語や、デッキの内容に関連する深い考察などを記録しましょう。
											</li>
											<li>
												<strong>AIアシスト（プレミアムプラン）:</strong>{" "}
												キーワードやテーマを入力すると、AIが関連情報に基づいてノートの下書きを自動生成します。
											</li>
										</ul>
									</div>

									<div className="rounded-lg border p-4">
										<h3 className="text-lg font-semibold mb-2 flex items-center">
											<Share2 className="mr-2 h-5 w-5 text-primary" />
											関連付けと整理
										</h3>
										<ul className="list-disc pl-5 space-y-2">
											<li>
												作成したノートを特定の学習デッキやカードに関連付けたり、ノート同士をリンクさせたりすることで、知識のネットワークを構築できます。
											</li>
											<li>画像やファイルの添付も可能です。</li>
										</ul>
									</div>
								</div>
							</div>
						</div>
					</TabsContent>

					{/* 共有機能 */}
					<TabsContent value="share" className="mt-6">
						<div className="grid gap-6 lg:grid-cols-[1fr_500px] lg:gap-12 xl:grid-cols-[1fr_550px]">
							<div className="flex flex-col justify-center space-y-4">
								<h2 className="text-2xl font-bold tracking-tighter md:text-3xl">
									共有機能の使い方
								</h2>
								<p className="text-muted-foreground md:text-lg/relaxed">
									作成したデッキやノートを他のユーザーと共有する方法をご紹介します。
								</p>

								<div className="space-y-4">
									<div className="rounded-lg border p-4">
										<h3 className="text-lg font-semibold mb-2 flex items-center">
											<Share2 className="mr-2 h-5 w-5 text-primary" />
											共有の基本手順
										</h3>
										<ol className="list-decimal pl-5 space-y-2">
											<li>共有したいデッキまたはノートを選択します。</li>
											<li>
												共有設定画面を開き、以下のいずれかの方法で共有します。
											</li>
										</ol>
									</div>

									<div className="rounded-lg border p-4">
										<h3 className="text-lg font-semibold mb-2 flex items-center">
											<Users className="mr-2 h-5 w-5 text-primary" />
											共有方法の種類
										</h3>
										<ul className="list-disc pl-5 space-y-2">
											<li>
												<strong>リンク共有（フリープラン以上）:</strong>{" "}
												閲覧専用の共有リンクを生成し、相手に伝えます。
											</li>
											<li>
												<strong>個別ユーザー招待（プレミアムプラン）:</strong>{" "}
												メールアドレスを指定して、特定のユーザーを閲覧者または編集者として招待します。
											</li>
											<li>
												<strong>チーム共有フォルダ（プレミアムプラン）:</strong>{" "}
												事前に作成した共有フォルダにデッキやノートを移動することで、フォルダの参加メンバー全員に共有されます。
											</li>
										</ul>
									</div>

									<div className="rounded-lg border p-4">
										<h3 className="text-lg font-semibold mb-2 flex items-center">
											<Settings className="mr-2 h-5 w-5 text-primary" />
											権限設定（プレミアムプラン）
										</h3>
										<ul className="list-disc pl-5 space-y-2">
											<li>
												<strong>閲覧のみ:</strong>{" "}
												共有相手はコンテンツを閲覧するだけで、編集はできません。
											</li>
											<li>
												<strong>編集可能:</strong>{" "}
												共有相手はコンテンツを閲覧・編集できます。
											</li>
											<li>
												<strong>管理者:</strong>{" "}
												共有相手はコンテンツの閲覧・編集に加え、他のユーザーへの共有権限の設定も可能です。
											</li>
										</ul>
									</div>
								</div>
							</div>

							<div className="relative aspect-video overflow-hidden rounded-xl border shadow-xl">
								<Image
									src="/placeholder.svg?height=1080&width=1920"
									width={550}
									height={310}
									alt="共有機能のスクリーンショット"
									className="object-cover"
								/>
							</div>
						</div>
					</TabsContent>
				</Tabs>
			</Container>
		</section>
	);
}
