import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function CTASection() {
	return (
		<section className="w-full py-12 md:py-24 bg-primary text-primary-foreground">
			<Container>
				<div className="flex flex-col items-center justify-center space-y-4 text-center">
					<div className="space-y-2">
						<h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
							さっそく始めてみませんか？
						</h2>
						<p className="max-w-[900px] md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
							14日間の無料トライアルで、プレミアムプランのすべての機能をお試しいただけます。
							クレジットカード不要で、いつでもキャンセル可能です。
						</p>
					</div>
					<div className="flex flex-col gap-2 min-[400px]:flex-row">
						<Button
							size="lg"
							className="h-12 bg-background text-primary hover:bg-background/90"
						>
							無料で始める
						</Button>
						<Link href="/guide">
							<Button
								size="lg"
								variant="outline"
								className="h-12 border-background text-background hover:bg-primary-foreground hover:text-primary"
							>
								使い方ガイドを見る
							</Button>
						</Link>
					</div>
				</div>
			</Container>
		</section>
	);
}
