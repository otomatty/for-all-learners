"use client";

import { cn } from "@/lib/utils";

interface GoalProgressBarProps {
	progress: number;
	status: "not_started" | "in_progress" | "completed";
	className?: string;
}

export function GoalProgressBar({
	progress,
	status,
	className,
}: GoalProgressBarProps) {
	const getProgressColorClass = () => {
		switch (status) {
			case "completed":
				return "bg-green-500";
			case "in_progress":
				return progress >= 75
					? "bg-blue-500"
					: progress >= 50
						? "bg-yellow-500"
						: "bg-orange-500";
			case "not_started":
				return "bg-gray-400";
			default:
				return "bg-gray-400";
		}
	};

	return (
		<div className={cn("space-y-2", className)}>
			<div className="flex justify-between items-center">
				<span className="text-sm text-muted-foreground">進捗</span>
				<span className="text-sm font-medium">{progress}%</span>
			</div>
			<div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200">
				<div
					className={cn(
						"h-full transition-all duration-300",
						getProgressColorClass(),
					)}
					style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
				/>
			</div>
		</div>
	);
}
