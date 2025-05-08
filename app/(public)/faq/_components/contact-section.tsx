import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/container";

export default function ContactSection() {
	return (
		<section className="w-full py-12 md:py-24 bg-slate-50">
			<Container>
				<div className="flex flex-col items-center justify-center space-y-4 text-center">
					<div className="space-y-2">
						<h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
							質問が見つからない場合
						</h2>
						<p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
							お探しの質問が見つからない場合は、お気軽にお問い合わせください。
						</p>
					</div>
					<div className="flex flex-col gap-2 min-[400px]:flex-row">
						<Link href="/contact">
							<Button size="lg" className="h-12">
								お問い合わせ
							</Button>
						</Link>
					</div>
				</div>
			</Container>
		</section>
	);
}
