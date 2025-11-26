"use client";

import { Quote } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Container } from "@/components/layouts/container";
import { SectionHeader } from "@/components/SectionHeader";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

interface Testimonial {
	quote: string;
	imageAlt: string;
	name: string;
	title: string;
}

export default function TestimonialSection() {
	const t = useTranslations("landing.testimonials");
	const items = t.raw("items") as Testimonial[];

	return (
		<section className="w-full py-12 md:py-24 lg:py-32 bg-slate-50 dark:bg-gray-900">
			<Container>
				<SectionHeader
					label={t("label")}
					title={t("title")}
					description={t("description")}
				/>
			</Container>

			<div className="overflow-x-auto pb-4 hidden-scrollbar">
				<div className="mx-96 flex gap-6 ">
					{items.map((item, index) => (
						<Card
							key={index}
							className="border-0 bg-background shadow-md min-w-[300px] md:min-w-[350px]"
						>
							<CardContent className="p-6">
								<div className="flex items-start gap-4">
									<div className="rounded-full bg-primary/10 p-2">
										<Quote className="h-4 w-4 text-primary" />
									</div>
									<div>
										<p className="text-sm leading-relaxed text-muted-foreground">
											{item.quote}
										</p>
									</div>
								</div>
							</CardContent>
							<CardFooter className="flex items-center gap-4 border-t px-6 py-4">
								<div className="rounded-full overflow-hidden">
									<Image
										src="/placeholder.svg?height=40&width=40"
										width={40}
										height={40}
										alt={item.imageAlt}
										className="aspect-square object-cover"
									/>
								</div>
								<div>
									<p className="text-sm font-medium">{item.name}</p>
									<p className="text-xs text-muted-foreground">{item.title}</p>
								</div>
							</CardFooter>
						</Card>
					))}
				</div>
			</div>
		</section>
	);
}
