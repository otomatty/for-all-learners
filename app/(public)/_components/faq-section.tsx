import { Container } from "@/components/layouts/container";
import { SectionHeader } from "@/components/SectionHeader";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";

export default function FAQSection() {
	return (
		<section
			className="w-full py-12 md:py-24 lg:py-32 bg-slate-50 dark:bg-gray-900"
			id="faq"
		>
			<Container>
				<SectionHeader
					label="よくある質問"
					title="お客様からよく寄せられる質問"
					description="本アプリケーションのご利用にあたり、お客様から多く寄せられるご質問とその回答をまとめました。"
				/>

				<div className="mx-auto max-w-3xl mt-12">
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
								フリープランとプレミアムプランの主な違いは何ですか？
							</AccordionTrigger>
							<AccordionContent>
								フリープランでは、AI問題生成の回数や作成可能なデッキ・カード数、ノート作成数などに制限がございます。また、一部の高度な機能（AIノートアシスト、詳細な共有設定、広告非表示など）はプレミアムプランでのみご利用いただけます。詳細な機能比較は「価格プラン」のページをご確認ください。
							</AccordionContent>
						</AccordionItem>
						<AccordionItem value="item-5">
							<AccordionTrigger>
								プレミアムプランの無料トライアルはありますか？
							</AccordionTrigger>
							<AccordionContent>
								はい、初めてプレミアムプランをご利用になる方を対象に、14日間の無料トライアル期間を設けております。トライアル期間中はプレミアムプランの全機能をご利用いただけます。トライアル期間終了後は、自動的にフリープランに移行します（自動課金はされません）。
							</AccordionContent>
						</AccordionItem>
						<AccordionItem value="item-6">
							<AccordionTrigger>
								どのデバイスで利用できますか？
							</AccordionTrigger>
							<AccordionContent>
								Webブラウザ（PC、スマートフォン、タブレット対応のレスポンシブデザイン）でのご利用を基本とし、将来的にはiOSおよびAndroidのネイティブアプリの提供も計画しております。
							</AccordionContent>
						</AccordionItem>
						<AccordionItem value="item-7">
							<AccordionTrigger>
								学習データは安全に保管されますか？
							</AccordionTrigger>
							<AccordionContent>
								お客様の学習データは、セキュリティ対策を施したクラウドサーバーに安全に保管されます。データの暗号化やアクセス制御など、情報セキュリティには最大限配慮しております。詳細は「プライバシーポリシー」をご確認ください。
							</AccordionContent>
						</AccordionItem>
					</Accordion>
				</div>
			</Container>
		</section>
	);
}
