import { Container } from "@/components/layouts/container";

export default function HeaderSection() {
	return (
		<section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-white to-slate-50">
			<Container>
				<div className="flex flex-col items-center justify-center space-y-4 text-center">
					<div className="space-y-2">
						<h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">
							料金プラン
						</h1>
						<p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
							より多くの方にご利用いただき、その効果を実感していただくために、複数のプランをご用意しています。
						</p>
					</div>
				</div>
			</Container>
		</section>
	);
}
