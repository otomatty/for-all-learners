import { BarChart, BookOpen, Brain, Layers, Share2, Zap } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Container } from "@/components/layouts/container";
import { SectionHeader } from "@/components/SectionHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FeatureSection() {
	const t = useTranslations("landing.features");

	return (
		<section className="w-full py-12 md:py-24 lg:py-32" id="features">
			<Container>
				<SectionHeader
					label={t("label")}
					title={t("title")}
					description={t("description")}
				/>

				{/* デッキ＆カード機能 */}
				<div className="grid items-center gap-6 py-12 lg:grid-cols-[1fr_500px] lg:gap-12 xl:grid-cols-[1fr_550px]">
					<Image
						src="/placeholder.svg?height=1080&width=1920"
						width={550}
						height={310}
						alt={t("deckCard.imageAlt")}
						className="mx-auto aspect-video overflow-hidden rounded-xl object-cover object-center sm:w-full lg:order-last"
					/>
					<div className="flex flex-col justify-center space-y-4">
						<div className="inline-flex items-center space-x-2 rounded-md bg-muted px-3 py-1 text-sm font-medium">
							<BookOpen className="h-4 w-4" />
							<span>{t("deckCard.label")}</span>
						</div>
						<h3 className="text-2xl font-bold tracking-tighter md:text-3xl">
							{t("deckCard.title")}
						</h3>
						<p className="text-muted-foreground md:text-lg/relaxed">
							{t("deckCard.description")}
						</p>
						<ul className="grid gap-2 py-4">
							<li className="flex items-center gap-2">
								<div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20">
									<Zap className="h-4 w-4 text-primary" />
								</div>
								<span>{t("deckCard.feature1")}</span>
							</li>
							<li className="flex items-center gap-2">
								<div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20">
									<Zap className="h-4 w-4 text-primary" />
								</div>
								<span>{t("deckCard.feature2")}</span>
							</li>
							<li className="flex items-center gap-2">
								<div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20">
									<Zap className="h-4 w-4 text-primary" />
								</div>
								<span>{t("deckCard.feature3")}</span>
							</li>
							<li className="flex items-center gap-2">
								<div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20">
									<Zap className="h-4 w-4 text-primary" />
								</div>
								<span>{t("deckCard.feature4")}</span>
							</li>
						</ul>
					</div>
				</div>

				{/* ノート機能 */}
				<div className="grid items-center gap-6 py-12 lg:grid-cols-[500px_1fr] lg:gap-12 xl:grid-cols-[550px_1fr]">
					<Image
						src="/placeholder.svg?height=1080&width=1920"
						width={550}
						height={310}
						alt={t("note.imageAlt")}
						className="mx-auto aspect-video overflow-hidden rounded-xl object-cover object-center sm:w-full"
					/>
					<div className="flex flex-col justify-center space-y-4">
						<div className="inline-flex items-center space-x-2 rounded-md bg-muted px-3 py-1 text-sm font-medium">
							<Layers className="h-4 w-4" />
							<span>{t("note.label")}</span>
						</div>
						<h3 className="text-2xl font-bold tracking-tighter md:text-3xl">
							{t("note.title")}
						</h3>
						<p className="text-muted-foreground md:text-lg/relaxed">
							{t("note.description")}
						</p>
						<ul className="grid gap-2 py-4">
							<li className="flex items-center gap-2">
								<div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20">
									<Zap className="h-4 w-4 text-primary" />
								</div>
								<span>{t("note.feature1")}</span>
							</li>
							<li className="flex items-center gap-2">
								<div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20">
									<Zap className="h-4 w-4 text-primary" />
								</div>
								<span>{t("note.feature2")}</span>
							</li>
							<li className="flex items-center gap-2">
								<div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20">
									<Zap className="h-4 w-4 text-primary" />
								</div>
								<span>{t("note.feature3")}</span>
							</li>
							<li className="flex items-center gap-2">
								<div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20">
									<Zap className="h-4 w-4 text-primary" />
								</div>
								<span>{t("note.feature4")}</span>
							</li>
						</ul>
					</div>
				</div>

				{/* その他の機能 */}
				<div className="grid grid-cols-1 gap-6 pt-12 md:grid-cols-2 lg:grid-cols-3">
					<Card>
						<CardHeader className="flex flex-row items-center gap-4">
							<Brain className="h-8 w-8 text-primary" />
							<div className="grid gap-1">
								<CardTitle>{t("aiOptimization.title")}</CardTitle>
							</div>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-muted-foreground">
								{t("aiOptimization.description")}
							</p>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="flex flex-row items-center gap-4">
							<BarChart className="h-8 w-8 text-primary" />
							<div className="grid gap-1">
								<CardTitle>{t("analytics.title")}</CardTitle>
							</div>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-muted-foreground">
								{t("analytics.description")}
							</p>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="flex flex-row items-center gap-4">
							<Share2 className="h-8 w-8 text-primary" />
							<div className="grid gap-1">
								<CardTitle>{t("sharing.title")}</CardTitle>
							</div>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-muted-foreground">
								{t("sharing.description")}
							</p>
						</CardContent>
					</Card>
				</div>
			</Container>
		</section>
	);
}
