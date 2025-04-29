import type React from "react";
import type { Stats } from "@/types/dashboard"; // ensure Stats type is defined
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, BrainCircuit, Clock, ListChecks } from "lucide-react";

interface DashboardSummaryProps {
	stats: Stats;
}

export function DashboardSummary({ stats }: DashboardSummaryProps) {
	return (
		<>
			<Card>
				<CardHeader className="flex items-center justify-between pb-2">
					<CardTitle className="text-sm font-medium">ページ数</CardTitle>
					<BookOpen className="h-4 w-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold">{stats.totalPages}</div>
				</CardContent>
			</Card>
			<Card>
				<CardHeader className="flex items-center justify-between pb-2">
					<CardTitle className="text-sm font-medium">カード数</CardTitle>
					<BrainCircuit className="h-4 w-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold">{stats.totalCards}</div>
				</CardContent>
			</Card>
			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium">復習待ち</CardTitle>
					<Clock className="h-4 w-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold">{stats.cardsToReview}</div>
				</CardContent>
			</Card>
			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium">練習回数</CardTitle>
					<ListChecks className="h-4 w-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold">{stats.totalPractices}</div>
				</CardContent>
			</Card>
		</>
	);
}
