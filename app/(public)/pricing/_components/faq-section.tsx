import { Container } from "@/components/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FAQSection() {
	return (
		<section className="w-full py-12 md:py-24">
			<Container>
				<div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
					<div className="space-y-2">
						<h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
							料金に関するよくある質問
						</h2>
						<p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
							料金プランについてよく寄せられる質問にお答えします。
						</p>
					</div>
				</div>

				<div className="mx-auto max-w-3xl space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>
								プレミアムプランの無料トライアルはありますか？
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p>
								はい、初めてプレミアムプランをご利用になる方を対象に、14日間の無料トライアル期間を設けております。トライアル期間中はプレミアムプランの全機能をご利用いただけます。トライアル期間終了後は、自動的にフリープランに移行します（自動課金はされません）。
							</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>支払い方法には何がありますか？</CardTitle>
						</CardHeader>
						<CardContent>
							<p>
								クレジットカード（Visa, MasterCard, American Express,
								JCB）、および各種オンライン決済サービスに対応予定です。詳細はサービス開始時に改めてご案内いたします。
							</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>
								プレミアムプランの契約期間中に解約した場合、返金はありますか？
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p>
								月額プランの場合、解約手続きをされた次の契約更新日までは引き続きご利用可能で、日割りでの返金は行っておりません。年額プランの場合も同様に、契約期間満了まではご利用可能で、中途解約による返金は原則として行っておりません。詳細は利用規約をご確認ください。
							</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>
								フリープランからプレミアムプランに移行した場合、データは引き継がれますか？
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p>
								はい、フリープランで作成したすべてのデータ（デッキ、カード、ノートなど）はプレミアムプランに移行しても完全に引き継がれます。逆に、プレミアムプランからフリープランに戻る場合は、フリープランの制限内のデータのみが利用可能となります。
							</p>
						</CardContent>
					</Card>
				</div>
			</Container>
		</section>
	);
}
