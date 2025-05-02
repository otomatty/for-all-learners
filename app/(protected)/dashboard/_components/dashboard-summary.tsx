"use client";

import type React from "react";
import type { Stats } from "@/types/dashboard"; // ensure Stats type is defined
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
	CardFooter,
} from "@/components/ui/card";
import { BookOpen, BrainCircuit, Clock } from "lucide-react";
import { PieChart, Pie, Cell } from "recharts";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";

interface DashboardSummaryProps {
	stats: Stats;
}

// Duration segment keys
type DurationKey = "学習" | "音読" | "OCR" | "メモ";

export function DashboardSummary({ stats }: DashboardSummaryProps) {
	// Helper to format duration
	const formatDuration = (sec?: number): string => {
		if (sec == null) return "<missing>";
		const h = Math.floor(sec / 3600);
		const m = Math.floor((sec % 3600) / 60);
		const s = sec % 60;
		const parts: string[] = [];
		if (h) parts.push(`${h}`);
		if (m) parts.push(`${m}`);
		if (s || parts.length === 0) parts.push(`${s}`);
		return parts.join(":");
	};
	// Pie chart data: only non-zero segments, typed as DurationKey
	const chartData: { name: DurationKey; value: number }[] = [
		{ name: "学習", value: stats.learnTime },
		{ name: "音読", value: stats.audioTime },
		{ name: "OCR", value: stats.ocrTime },
		{ name: "メモ", value: stats.memoTime },
	].filter((d) => d.value > 0) as { name: DurationKey; value: number }[];
	const chartConfig = {
		value: { label: "時間" },
		学習: { label: "学習", color: "var(--chart-1)" },
		音読: { label: "音読", color: "var(--chart-2)" },
		OCR: { label: "OCR", color: "var(--chart-3)" },
		メモ: { label: "メモ", color: "var(--chart-4)" },
	} satisfies ChartConfig;
	return (
		<>
			<Card>
				<CardHeader className="flex items-center justify-between pb-2">
					<CardTitle className="text-sm font-medium">ページ数</CardTitle>
					<BookOpen className="h-4 w-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold">{stats.totalPages}</div>
					<div className="text-sm text-muted-foreground">
						<span className="text-green-500">
							+{stats.totalPages - stats.previousTotalPages} (昨日)
						</span>
						<span className="mx-2">|</span>
						<span className="text-blue-500">
							+{stats.totalPages - stats.previousWeekTotalPages} (先週)
						</span>
					</div>
				</CardContent>
			</Card>
			<Card>
				<CardHeader className="flex items-center justify-between pb-2">
					<CardTitle className="text-sm font-medium">カード数</CardTitle>
					<BrainCircuit className="h-4 w-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold">{stats.totalCards}</div>
					<div className="text-sm text-muted-foreground">
						<span className="text-green-500">
							+{stats.totalCards - stats.previousTotalCards} (昨日)
						</span>
						<span className="mx-2">|</span>
						<span className="text-blue-500">
							+{stats.totalCards - stats.previousWeekTotalCards} (先週)
						</span>
					</div>
				</CardContent>
			</Card>
			<Card>
				<CardHeader className="flex items-center justify-between pb-2">
					<CardTitle className="text-sm font-medium">今日の問題数</CardTitle>
					<Clock className="h-4 w-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold">
						{stats.totalProblems - stats.previousTotalProblems}問
					</div>
					<div className="text-sm text-muted-foreground">
						<span className="text-green-500">
							+{stats.totalProblems - stats.previousTotalProblems} (昨日)
						</span>
						<span className="mx-2">|</span>
						<span className="text-blue-500">
							+{stats.totalProblems - stats.previousWeekTotalProblems} (先週)
						</span>
					</div>
				</CardContent>
			</Card>
			<Card>
				<CardHeader className="items-center pb-0">
					<CardTitle>学習時間の内訳</CardTitle>
					<CardDescription>
						集計: {formatDuration(stats.totalTime)}
					</CardDescription>
				</CardHeader>
				<CardContent className="flex-1 pb-0">
					<ChartContainer
						config={chartConfig}
						className="mx-auto aspect-square max-h-[250px]"
					>
						<PieChart>
							<ChartTooltip
								cursor={false}
								content={<ChartTooltipContent hideLabel />}
							/>
							<Pie data={chartData} dataKey="value" nameKey="name" stroke="0">
								{chartData.map((entry) => (
									<Cell key={entry.name} fill={`var(--color-${entry.name})`} />
								))}
							</Pie>
						</PieChart>
					</ChartContainer>
				</CardContent>
				<CardFooter className="flex-col gap-2 text-sm">
					{/* You may add additional footer content or leave empty */}
				</CardFooter>
			</Card>
		</>
	);
}
