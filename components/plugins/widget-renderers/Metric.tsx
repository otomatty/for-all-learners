/**
 * Metric Widget Component
 *
 * Displays a simple metric with label and value.
 *
 * Props:
 * - label: string - Metric label
 * - value: string | number - Metric value
 * - unit?: string - Unit to display after value
 * - color?: string - Color variant (default, primary, success, warning, danger)
 */

interface MetricProps {
	label: string;
	value: string | number;
	unit?: string;
	color?: "default" | "primary" | "success" | "warning" | "danger";
}

const colorClasses = {
	default: "text-foreground",
	primary: "text-blue-600 dark:text-blue-400",
	success: "text-green-600 dark:text-green-400",
	warning: "text-yellow-600 dark:text-yellow-400",
	danger: "text-red-600 dark:text-red-400",
};

export function Metric({ label, value, unit, color = "default" }: MetricProps) {
	return (
		<div className="space-y-1">
			<span className="text-xs text-muted-foreground">{label}</span>
			<div className={`text-lg font-semibold ${colorClasses[color]}`}>
				{value}
				{unit && <span className="text-sm font-normal ml-1">{unit}</span>}
			</div>
		</div>
	);
}
