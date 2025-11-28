"use client";

import { useTranslations } from "next-intl";
import { Container } from "@/components/layouts/container";
import { SectionHeader } from "@/components/SectionHeader";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";

interface FAQItem {
	question: string;
	answer: string;
}

export default function FAQSection() {
	const t = useTranslations("landing.faq");
	const items = t.raw("items") as FAQItem[];

	return (
		<section
			className="w-full py-12 md:py-24 lg:py-32 bg-slate-50 dark:bg-gray-900"
			id="faq"
		>
			<Container>
				<SectionHeader
					label={t("label")}
					title={t("title")}
					description={t("description")}
				/>

				<div className="mx-auto max-w-3xl mt-12">
					<Accordion type="single" collapsible className="w-full">
						{items.map((item, index) => (
							<AccordionItem key={index} value={`item-${index}`}>
								<AccordionTrigger>{item.question}</AccordionTrigger>
								<AccordionContent>{item.answer}</AccordionContent>
							</AccordionItem>
						))}
					</Accordion>
				</div>
			</Container>
		</section>
	);
}
