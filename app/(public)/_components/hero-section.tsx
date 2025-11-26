import { ArrowRight, CheckCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Container } from "@/components/layouts/container";
import { Button } from "@/components/ui/button";

export default function HeroSection() {
	const t = useTranslations("landing.hero");

	return (
		<section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
			<Container>
				<div className="grid gap-4 lg:grid-cols-[1fr_450px] lg:gap-8 xl:grid-cols-[1fr_500px]">
					<div className="flex flex-col justify-center space-y-4">
						<div className="space-y-2">
							<h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none text-primary-foreground">
								{t("title1")}
								<br />
								{t("title2")}
							</h1>
							<p className="max-w-[600px] text-accent md:text-xl">
								{t("description")}
							</p>
						</div>
						<div className="flex flex-col gap-2 min-[300px] md:flex-row">
							<Button size="lg" asChild>
								<Link href="/auth/login">
									{t("ctaStart")}
									<ArrowRight className="ml-2 h-4 w-4" />
								</Link>
							</Button>
							<Button size="lg" variant="outline" asChild>
								<Link href="/features">{t("ctaFeatures")}</Link>
							</Button>
						</div>
						<div className="flex items-center flex-wrap gap-2 text-sm text-primary-foreground">
							<div className="flex items-center space-x-1 border rounded-full p-2">
								<CheckCircle className="h-4 w-4" />
								<span>{t("badge14Days")}</span>
							</div>
							<div className="flex items-center space-x-1 border rounded-full p-2">
								<CheckCircle className="h-4 w-4" />
								<span>{t("badgeNoCard")}</span>
							</div>
							<div className="flex items-center space-x-1 border rounded-full p-2">
								<CheckCircle className="h-4 w-4" />
								<span>{t("badgeCancelAnytime")}</span>
							</div>
						</div>
					</div>
					<div className="flex items-center justify-center">
						<div className="relative aspect-video overflow-hidden rounded-xl border shadow-xl">
							<Image
								src="/placeholder.svg?height=1080&width=1920"
								width={550}
								height={310}
								alt={t("screenshotAlt")}
								className="object-cover"
							/>
						</div>
					</div>
				</div>
			</Container>
		</section>
	);
}
