import { Brain, Clock, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { Container } from "@/components/layouts/container";
import { SectionHeader } from "@/components/SectionHeader";

export default function ValuePropositionSection() {
	const t = useTranslations("landing.valueProposition");

	return (
		<section className="w-full py-12 md:py-24 lg:py-32 bg-slate-50 dark:bg-slate-900">
			<Container>
				<SectionHeader
					label={t("label")}
					title={t("title")}
					description={t("description")}
				/>
				<div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3 lg:gap-12 mt-12">
					<div className="flex flex-col items-center space-y-2 rounded-lg border p-6 shadow-sm">
						<Brain className="h-12 w-12 text-primary" />
						<h3 className="text-xl font-bold">{t("aiTitle")}</h3>
						<p className="text-center text-muted-foreground">
							{t("aiDescription")}
						</p>
					</div>
					<div className="flex flex-col items-center space-y-2 rounded-lg border p-6 shadow-sm">
						<Users className="h-12 w-12 text-primary" />
						<h3 className="text-xl font-bold">{t("gamificationTitle")}</h3>
						<p className="text-center text-muted-foreground">
							{t("gamificationDescription")}
						</p>
					</div>
					<div className="flex flex-col items-center space-y-2 rounded-lg border p-6 shadow-sm">
						<Clock className="h-12 w-12 text-primary" />
						<h3 className="text-xl font-bold">{t("seamlessTitle")}</h3>
						<p className="text-center text-muted-foreground">
							{t("seamlessDescription")}
						</p>
					</div>
				</div>
			</Container>
		</section>
	);
}
