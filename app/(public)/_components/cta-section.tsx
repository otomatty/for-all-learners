import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/container";

export default function CTASection() {
	return (
		<section className="w-full py-12 md:py-24 lg:py-32 bg-primary text-primary-foreground">
			<Container>
				<div className="flex flex-col items-center justify-center space-y-4 text-center">
					<div className="space-y-2">
						<h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
							あなたの学習を革新する時が来ました
						</h2>
						<p className="max-w-[900px] md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
							AIと科学的アプローチを組み合わせた革新的な学習体験を、今すぐ始めてみませんか？
							14日間の無料トライアルで、プレミアムプランのすべての機能をお試しいただけます。
						</p>
					</div>
					<div className="flex flex-col gap-2 min-[400px]:flex-row">
						<Button
							size="lg"
							className="h-12 bg-background text-primary hover:bg-background/90"
						>
							無料で始める
							<ArrowRight className="ml-2 h-4 w-4" />
						</Button>
						<Link href="/features">
							<Button
								size="lg"
								variant="outline"
								className="h-12 border-background text-background hover:bg-primary-foreground hover:text-primary"
							>
								詳細を見る
							</Button>
						</Link>
					</div>
					<div className="text-sm">
						クレジットカード不要・いつでもキャンセル可能
					</div>
				</div>
			</Container>
		</section>
	);
}
