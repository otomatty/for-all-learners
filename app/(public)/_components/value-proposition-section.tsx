import { Brain, Clock, Users } from "lucide-react";
import { Container } from "@/components/container";
import React from "react";
import { SectionHeader } from "@/components/SectionHeader";

export default function ValuePropositionSection() {
	return (
		<section className="w-full py-12 md:py-24 lg:py-32 bg-slate-50 dark:bg-slate-900">
			<Container>
				<SectionHeader
					label="なぜ選ばれるのか"
					title="効率の良い、継続できる学習"
					description="最新のAI技術と洗練されたゲーミフィケーション要素を高度に融合させることにより、「時間的制約」「継続の困難性」「成果の不明確さ」といった普遍的な課題に対し、個別最適化されたソリューションを提供します。"
				/>
				<div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3 lg:gap-12 mt-12">
					<div className="flex flex-col items-center space-y-2 rounded-lg border p-6 shadow-sm">
						<Brain className="h-12 w-12 text-primary" />
						<h3 className="text-xl font-bold">AIによる学習効率の向上</h3>
						<p className="text-center text-muted-foreground">
							AIが教材を解析し、最適な問題形式を自動生成。FSRSアルゴリズムで科学的に最適な復習タイミングを提案します。
						</p>
					</div>
					<div className="flex flex-col items-center space-y-2 rounded-lg border p-6 shadow-sm">
						<Users className="h-12 w-12 text-primary" />
						<h3 className="text-xl font-bold">ゲーミフィケーションの活用</h3>
						<p className="text-center text-muted-foreground">
							ポイント獲得、バッジ収集、スキルツリーなど多彩な要素で、学習の継続をゲーム感覚で楽しめます。
						</p>
					</div>
					<div className="flex flex-col items-center space-y-2 rounded-lg border p-6 shadow-sm">
						<Clock className="h-12 w-12 text-primary" />
						<h3 className="text-xl font-bold">シームレスな学習体験</h3>
						<p className="text-center text-muted-foreground">
							教材取り込みから問題生成、復習、知識の整理まで、学習に必要なすべてのプロセスを一つのプラットフォームで完結。
						</p>
					</div>
				</div>
			</Container>
		</section>
	);
}
