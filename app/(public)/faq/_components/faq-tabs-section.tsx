import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Container } from "@/components/container";

export default function FAQTabsSection() {
	return (
		<section className="w-full py-12 md:py-24">
			<Container>
				<Tabs defaultValue="features" className="w-full max-w-4xl mx-auto">
					<div className="flex justify-center mb-8">
						<TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
							<TabsTrigger value="features">機能について</TabsTrigger>
							<TabsTrigger value="pricing">料金・支払いについて</TabsTrigger>
							<TabsTrigger value="account">アカウントについて</TabsTrigger>
							<TabsTrigger value="technical">技術的なこと</TabsTrigger>
						</TabsList>
					</div>

					{/* 機能についてのFAQ */}
					<TabsContent value="features" className="mt-6">
						<Accordion type="single" collapsible className="w-full">
							<AccordionItem value="item-1">
								<AccordionTrigger>
									AIによる問題自動生成は、どのような教材から可能ですか？
								</AccordionTrigger>
								<AccordionContent>
									テキスト入力、音声入力（マイクを利用した音読など）、画像ファイル（OCR機能によりテキストを抽出）からの問題生成に対応しております。PDFファイル内のテキスト情報も、コピー＆ペーストでテキスト入力としてご利用いただけます。
								</AccordionContent>
							</AccordionItem>
							<AccordionItem value="item-2">
								<AccordionTrigger>
									FSRSアルゴリズムとは何ですか？どのように学習に役立ちますか？
								</AccordionTrigger>
								<AccordionContent>
									FSRS（Free Spaced Repetition
									Scheduler）は、科学的な忘却曲線理論に基づき、個々のユーザーの記憶度に合わせて最適な復習タイミングを計算するアルゴリズムです。本アプリケーションでは、このアルゴリズムを用いて、学習した内容が長期記憶として定着しやすくなるよう、効率的な復習スケジュールを自動で提案します。
								</AccordionContent>
							</AccordionItem>
							<AccordionItem value="item-3">
								<AccordionTrigger>
									ノート機能では、どのようなことができますか？
								</AccordionTrigger>
								<AccordionContent>
									学習中に気になった単語や内容を簡単に記録できるだけでなく、AIによる下書き生成（プレミアムプラン）、タグ付けによる整理、ノート間の双方向リンクによる知識の関連付け、画像やファイルの添付などが可能です。これにより、多角的な知識の整理と深化をサポートします。
								</AccordionContent>
							</AccordionItem>
							<AccordionItem value="item-4">
								<AccordionTrigger>
									ゲーミフィケーション要素とは具体的にどのようなものですか？
								</AccordionTrigger>
								<AccordionContent>
									学習の継続を支援するために、ポイント獲得、バッジ授与、アバターカスタマイズ、進捗ツリーの可視化、ランキング表示（プレミアムプランの共有機能利用時）など、ゲーム感覚で楽しく取り組める様々な仕組みを導入しています。
								</AccordionContent>
							</AccordionItem>
							<AccordionItem value="item-5">
								<AccordionTrigger>
									他のユーザーと教材やノートを共有できますか？
								</AccordionTrigger>
								<AccordionContent>
									はい、可能です。フリープランでは作成したデッキの閲覧専用リンクを生成できます。プレミアムプランでは、デッキやノートの共同編集、編集権限の詳細設定、チーム単位での共有フォルダ作成など、より高度な共有機能をご利用いただけます。
								</AccordionContent>
							</AccordionItem>
						</Accordion>
					</TabsContent>

					{/* 料金・支払いについてのFAQ */}
					<TabsContent value="pricing" className="mt-6">
						<Accordion type="single" collapsible className="w-full">
							<AccordionItem value="item-1">
								<AccordionTrigger>
									フリープランとプレミアムプランの主な違いは何ですか？
								</AccordionTrigger>
								<AccordionContent>
									フリープランでは、AI問題生成の回数や作成可能なデッキ・カード数、ノート作成数などに制限がございます。また、一部の高度な機能（AIノートアシスト、詳細な共有設定、広告非表示など）はプレミアムプランでのみご利用いただけます。詳細な機能比較は「価格プラン」のページをご確認ください。
								</AccordionContent>
							</AccordionItem>
							<AccordionItem value="item-2">
								<AccordionTrigger>
									プレミアムプランの無料トライアルはありますか？
								</AccordionTrigger>
								<AccordionContent>
									はい、初めてプレミアムプランをご利用になる方を対象に、14日間の無料トライアル期間を設けております。トライアル期間中はプレミアムプランの全機能をご利用いただけます。
								</AccordionContent>
							</AccordionItem>
							<AccordionItem value="item-3">
								<AccordionTrigger>
									支払い方法には何がありますか？
								</AccordionTrigger>
								<AccordionContent>
									クレジットカード（Visa, MasterCard, American Express,
									JCB）、および各種オンライン決済サービスに対応予定です。詳細はサービス開始時に改めてご案内いたします。
								</AccordionContent>
							</AccordionItem>
							<AccordionItem value="item-4">
								<AccordionTrigger>
									プレミアムプランの契約期間中に解約した場合、返金はありますか？
								</AccordionTrigger>
								<AccordionContent>
									月額プランの場合、解約手続きをされた次の契約更新日までは引き続きご利用可能で、日割りでの返金は行っておりません。年額プランの場合も同様に、契約期間満了まではご利用可能で、中途解約による返金は原則として行っておりません。詳細は利用規約をご確認ください。
								</AccordionContent>
							</AccordionItem>
						</Accordion>
					</TabsContent>

					{/* アカウントについてのFAQ */}
					<TabsContent value="account" className="mt-6">
						<Accordion type="single" collapsible className="w-full">
							<AccordionItem value="item-1">
								<AccordionTrigger>
									アカウント登録に必要な情報は何ですか？
								</AccordionTrigger>
								<AccordionContent>
									アカウント登録には、メールアドレスとパスワードが必要です。また、GoogleやXなどのSNSアカウントを利用した簡単登録も可能です。
								</AccordionContent>
							</AccordionItem>
							<AccordionItem value="item-2">
								<AccordionTrigger>
									パスワードを忘れた場合はどうすればよいですか？
								</AccordionTrigger>
								<AccordionContent>
									ログイン画面の「パスワードをお忘れですか？」リンクから、登録済みのメールアドレスにパスワードリセット用のリンクを送信できます。リンクに従ってパスワードの再設定を行ってください。
								</AccordionContent>
							</AccordionItem>
							<AccordionItem value="item-3">
								<AccordionTrigger>
									アカウントを削除するにはどうすればよいですか？
								</AccordionTrigger>
								<AccordionContent>
									アプリケーション内の「設定」→「アカウント管理」→「アカウント削除」から手続きを行うことができます。アカウント削除後は、すべてのデータが完全に削除され、復元することはできませんのでご注意ください。
								</AccordionContent>
							</AccordionItem>
						</Accordion>
					</TabsContent>

					{/* 技術的なことについてのFAQ */}
					<TabsContent value="technical" className="mt-6">
						<Accordion type="single" collapsible className="w-full">
							<AccordionItem value="item-1">
								<AccordionTrigger>
									どのデバイスで利用できますか？
								</AccordionTrigger>
								<AccordionContent>
									Webブラウザ（PC、スマートフォン、タブレット対応のレスポンシブデザイン）でのご利用を基本とし、将来的にはiOSおよびAndroidのネイティブアプリの提供も計画しております。
								</AccordionContent>
							</AccordionItem>
							<AccordionItem value="item-2">
								<AccordionTrigger>
									学習データは安全に保管されますか？
								</AccordionTrigger>
								<AccordionContent>
									お客様の学習データは、セキュリティ対策を施したクラウドサーバーに安全に保管されます。データの暗号化やアクセス制御など、情報セキュリティには最大限配慮しております。
								</AccordionContent>
							</AccordionItem>
							<AccordionItem value="item-3">
								<AccordionTrigger>
									オフラインでも利用できますか？
								</AccordionTrigger>
								<AccordionContent>
									プレミアムプランの特典として、一部コンテンツ（事前にダウンロードしたデッキやノートなど）のオフラインアクセス機能を検討しております。ただし、AI機能やリアルタイム同期など、オンライン接続が必須の機能もございます。
								</AccordionContent>
							</AccordionItem>
							<AccordionItem value="item-4">
								<AccordionTrigger>
									不具合を見つけた場合や、機能要望はどこに連絡すればよいですか？
								</AccordionTrigger>
								<AccordionContent>
									アプリケーション内のお問い合わせフォーム、またはサポート用メールアドレスまでご連絡ください。皆様からのフィードバックを元に、サービスの改善に努めてまいります。
								</AccordionContent>
							</AccordionItem>
						</Accordion>
					</TabsContent>
				</Tabs>
			</Container>
		</section>
	);
}
