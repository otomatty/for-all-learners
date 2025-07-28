import { Container } from "@/components/container";
import React from "react";

export default function HeaderSection() {
	return (
		<section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-white to-slate-50">
			<Container>
				<div className="flex flex-col items-center justify-center space-y-4 text-center">
					<div className="space-y-2">
						<h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
							更新履歴
						</h1>
						<p className="mt-4 text-lg text-muted-foreground">
							For All Learners の最新のアップデート情報をお届けします。
						</p>
					</div>
				</div>
			</Container>
		</section>
	);
}
