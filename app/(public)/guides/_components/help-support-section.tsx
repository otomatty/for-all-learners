import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { BookOpen, Users, Settings } from "lucide-react";
import { Container } from "@/components/container";

export default function HelpSupportSection() {
	return (
		<section className="w-full py-12 md:py-24">
			<Container>
				<div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
					<div className="space-y-2">
						<h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
							ヘルプとサポート
						</h2>
						<p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
							さらに詳しい情報や、お困りの際のサポート方法をご案内します。
						</p>
					</div>
				</div>

				<div className="grid gap-6 md:grid-cols-3">
					<Card className="flex flex-col items-center text-center p-6">
						<BookOpen className="h-12 w-12 text-primary mb-4" />
						<h3 className="text-xl font-bold mb-2">詳細ドキュメント</h3>
						<p className="text-sm text-muted-foreground mb-4">
							各機能の詳細な使い方や、高度な活用法を解説したドキュメントをご用意しています。
						</p>
						<Button variant="outline" className="mt-auto">
							ドキュメントを見る
						</Button>
					</Card>

					<Card className="flex flex-col items-center text-center p-6">
						<Users className="h-12 w-12 text-primary mb-4" />
						<h3 className="text-xl font-bold mb-2">コミュニティフォーラム</h3>
						<p className="text-sm text-muted-foreground mb-4">
							他のユーザーと情報交換したり、質問したりできるコミュニティフォーラムをご利用ください。
						</p>
						<Button variant="outline" className="mt-auto">
							フォーラムに参加
						</Button>
					</Card>

					<Card className="flex flex-col items-center text-center p-6">
						<Settings className="h-12 w-12 text-primary mb-4" />
						<h3 className="text-xl font-bold mb-2">カスタマーサポート</h3>
						<p className="text-sm text-muted-foreground mb-4">
							解決できない問題がある場合は、カスタマーサポートチームにお問い合わせください。
						</p>
						<Button variant="outline" className="mt-auto">
							お問い合わせ
						</Button>
					</Card>
				</div>
			</Container>
		</section>
	);
}
