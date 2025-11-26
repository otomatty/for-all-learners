import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Container } from "@/components/layouts/container";
import { SectionHeader } from "@/components/SectionHeader";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export default function PricingSection() {
	const t = useTranslations("landing.pricing");

	return (
		<section className="w-full py-12 md:py-24 lg:py-32" id="pricing">
			<Container>
				<SectionHeader
					label={t("label")}
					title={t("title")}
					description={t("description")}
				/>

				<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8 mt-12 max-w-5xl mx-auto">
					{/* フリープラン */}
					<Card className="flex flex-col">
						<CardHeader className="flex flex-col space-y-1.5">
							<CardTitle className="text-2xl">{t("free.name")}</CardTitle>
							<CardDescription>{t("free.description")}</CardDescription>
							<div className="mt-4">
								<span className="text-4xl font-bold">{t("free.price")}</span>
								<span className="text-muted-foreground">
									{t("free.priceUnit")}
								</span>
							</div>
						</CardHeader>
						<CardContent className="grid gap-4 flex-1">
							<div className="grid gap-2">
								<div className="flex items-center gap-2">
									<Check className="h-4 w-4 text-primary" />
									<span>{t("free.features.aiGeneration")}</span>
								</div>
								<div className="flex items-center gap-2">
									<Check className="h-4 w-4 text-primary" />
									<span>{t("free.features.fsrsBasic")}</span>
								</div>
								<div className="flex items-center gap-2">
									<Check className="h-4 w-4 text-primary" />
									<span>{t("free.features.deckLimit")}</span>
								</div>
								<div className="flex items-center gap-2">
									<Check className="h-4 w-4 text-primary" />
									<span>{t("free.features.cardLimit")}</span>
								</div>
								<div className="flex items-center gap-2">
									<Check className="h-4 w-4 text-primary" />
									<span>{t("free.features.noteLimit")}</span>
								</div>
								<div className="flex items-center gap-2">
									<Check className="h-4 w-4 text-primary" />
									<span>{t("free.features.shareReadOnly")}</span>
								</div>
								<div className="flex items-center gap-2">
									<X className="h-4 w-4 text-muted-foreground" />
									<span className="text-muted-foreground">
										{t("free.features.noAiAssist")}
									</span>
								</div>
								<div className="flex items-center gap-2">
									<X className="h-4 w-4 text-muted-foreground" />
									<span className="text-muted-foreground">
										{t("free.features.noAdvancedShare")}
									</span>
								</div>
								<div className="flex items-center gap-2">
									<X className="h-4 w-4 text-muted-foreground" />
									<span className="text-muted-foreground">
										{t("free.features.noAdFree")}
									</span>
								</div>
							</div>
						</CardContent>
						<CardFooter>
							<Button className="w-full">{t("free.cta")}</Button>
						</CardFooter>
					</Card>

					{/* プレミアムプラン */}
					<Card className="flex flex-col border-primary">
						<CardHeader className="flex flex-col space-y-1.5">
							<div className="inline-flex self-center rounded-full bg-primary/20 px-3 py-1 text-sm font-medium text-primary mb-2">
								{t("premium.recommended")}
							</div>
							<CardTitle className="text-2xl">{t("premium.name")}</CardTitle>
							<CardDescription>{t("premium.description")}</CardDescription>
							<div className="mt-4">
								<span className="text-4xl font-bold">{t("premium.price")}</span>
								<span className="text-muted-foreground">
									{t("premium.priceUnit")}
								</span>
								<p className="text-xs text-muted-foreground mt-1">
									{t("premium.yearlyNote")}
								</p>
							</div>
						</CardHeader>
						<CardContent className="grid gap-4 flex-1">
							<div className="grid gap-2">
								<div className="flex items-center gap-2">
									<Check className="h-4 w-4 text-primary" />
									<span>{t("premium.features.aiGeneration")}</span>
								</div>
								<div className="flex items-center gap-2">
									<Check className="h-4 w-4 text-primary" />
									<span>{t("premium.features.fsrsAdvanced")}</span>
								</div>
								<div className="flex items-center gap-2">
									<Check className="h-4 w-4 text-primary" />
									<span>{t("premium.features.deckUnlimited")}</span>
								</div>
								<div className="flex items-center gap-2">
									<Check className="h-4 w-4 text-primary" />
									<span>{t("premium.features.cardUnlimited")}</span>
								</div>
								<div className="flex items-center gap-2">
									<Check className="h-4 w-4 text-primary" />
									<span>{t("premium.features.noteUnlimited")}</span>
								</div>
								<div className="flex items-center gap-2">
									<Check className="h-4 w-4 text-primary" />
									<span>{t("premium.features.advancedShare")}</span>
								</div>
								<div className="flex items-center gap-2">
									<Check className="h-4 w-4 text-primary" />
									<span>{t("premium.features.gamification")}</span>
								</div>
								<div className="flex items-center gap-2">
									<Check className="h-4 w-4 text-primary" />
									<span>{t("premium.features.adFree")}</span>
								</div>
								<div className="flex items-center gap-2">
									<Check className="h-4 w-4 text-primary" />
									<span>{t("premium.features.prioritySupport")}</span>
								</div>
							</div>
						</CardContent>
						<CardFooter>
							<Button className="w-full" variant="default">
								{t("premium.cta")}
							</Button>
						</CardFooter>
					</Card>
				</div>

				<div className="mt-8 text-center text-sm text-muted-foreground">
					<p>
						{t("footer")}
						<a href="/features" className="underline text-primary">
							{t("footerLink")}
						</a>
						{t("footerEnd")}
					</p>
				</div>
			</Container>
		</section>
	);
}
