import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Database } from "@/types/database.types";

// 学習ログに紐づくカードデータを含む型
type RecentActivityItem =
	Database["public"]["Tables"]["learning_logs"]["Row"] & {
		cards: Database["public"]["Tables"]["cards"]["Row"];
	};

interface RecentActivityProps {
	className?: string;
	recentActivity: RecentActivityItem[];
}

export function RecentActivity({
	className,
	recentActivity,
}: RecentActivityProps) {
	return (
		<Card className={className}>
			<CardHeader>
				<CardTitle>最近の学習活動</CardTitle>
				<CardDescription>直近の学習記録を確認できます</CardDescription>
			</CardHeader>
			<CardContent>
				{recentActivity.length > 0 ? (
					<div className="space-y-8">
						{recentActivity.map((log) => (
							<div key={log.id} className="flex items-start">
								<div className="ml-4 space-y-1">
									<p className="text-sm font-medium">
										{log.cards.front_content.length > 50
											? `${log.cards.front_content.substring(0, 50)}...`
											: log.cards.front_content}
									</p>
									<div className="flex items-center pt-2">
										<Badge variant={log.is_correct ? "default" : "destructive"}>
											{log.is_correct ? "正解" : "不正解"}
										</Badge>
										<span className="ml-2 text-xs text-muted-foreground">
											{log.answered_at
												? new Date(log.answered_at).toLocaleString()
												: "回答日時なし"}
										</span>
									</div>
								</div>
							</div>
						))}
					</div>
				) : (
					<div className="flex items-center justify-center h-24">
						<p className="text-sm text-muted-foreground">
							まだ学習記録がありません
						</p>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
