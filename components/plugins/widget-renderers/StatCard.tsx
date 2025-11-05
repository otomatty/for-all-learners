/**
 * Stat Card Widget Component
 *
 * Displays a statistical card with title, value, and optional description.
 *
 * Props:
 * - title: string - Card title
 * - value: string | number - Main value to display
 * - description?: string - Optional description
 * - trend?: "up" | "down" | "neutral" - Trend indicator
 * - trendValue?: string | number - Trend value
 * - icon?: string - Icon emoji or identifier
 */

interface StatCardProps {
	title: string;
	value: string | number;
	description?: string;
	trend?: "up" | "down" | "neutral";
	trendValue?: string | number;
	icon?: string;
}

export function StatCard({
	title,
	value,
	description,
	trend,
	trendValue,
	icon,
}: StatCardProps) {
	const trendIcon =
		trend === "up"
			? "↑"
			: trend === "down"
				? "↓"
				: trend === "neutral"
					? "→"
					: null;

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					{icon && <span className="text-lg">{icon}</span>}
					<span className="text-sm font-medium text-muted-foreground">
						{title}
					</span>
				</div>
				{trend && trendIcon && trendValue !== undefined && (
					<span
						className={`text-xs font-medium ${
							trend === "up"
								? "text-green-600 dark:text-green-400"
								: trend === "down"
									? "text-red-600 dark:text-red-400"
									: "text-muted-foreground"
						}`}
					>
						{trendIcon} {trendValue}
					</span>
				)}
			</div>
			<div className="text-2xl font-bold">{value}</div>
			{description && (
				<p className="text-xs text-muted-foreground">{description}</p>
			)}
		</div>
	);
}
