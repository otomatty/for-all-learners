import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Container } from "@/components/layouts/container";
import { Button } from "@/components/ui/button";

export default function CTASection() {
	const t = useTranslations("landing.cta");

	return (
		<section className="w-full py-12 md:py-24 lg:py-32 bg-primary text-primary-foreground">
			<Container>
				<div className="flex flex-col items-center justify-center space-y-4 text-center">
					<div className="space-y-2">
						<h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
							{t("title")}
						</h2>
						<p className="max-w-[900px] md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
							{t("description")}
						</p>
					</div>
					<div className="flex flex-col gap-2 min-[400px]:flex-row">
						<Button
							size="lg"
							className="h-12 bg-background text-primary hover:bg-background/90"
						>
							{t("ctaStart")}
							<ArrowRight className="ml-2 h-4 w-4" />
						</Button>
						<Link href="/features">
							<Button
								size="lg"
								variant="outline"
								className="h-12 border-background text-background hover:bg-primary-foreground hover:text-primary"
							>
								{t("ctaDetails")}
							</Button>
						</Link>
					</div>
					<div className="text-sm">{t("footer")}</div>
				</div>
			</Container>
		</section>
	);
}
