import { Container } from "@/components/layouts/container";

export default function HeaderSection() {
	return (
		<section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-white to-slate-50">
			<Container>
				<div className="flex flex-col items-center justify-center space-y-4 text-center">
					<div className="space-y-2">
						<h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">
							主要機能一覧
						</h1>
						<p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
							AIと科学的アプローチを組み合わせた革新的な機能で、効率的な学習と継続的なモチベーション維持を実現します。
						</p>
					</div>
				</div>
			</Container>
		</section>
	);
}
