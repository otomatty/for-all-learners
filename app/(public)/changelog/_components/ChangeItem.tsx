import {
	BugIcon,
	ShieldCheckIcon,
	SparklesIcon,
	TrendingUpIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Change } from "../../../_actions/changelog";

const getTypeAttributes = (type: Change["type"]) => {
	switch (type) {
		case "new":
			return {
				label: "新機能",
				icon: SparklesIcon,
				badgeVariant: "default" as const,
			};
		case "improvement":
			return {
				label: "改善",
				icon: TrendingUpIcon,
				badgeVariant: "secondary" as const,
			};
		case "fix":
			return {
				label: "修正",
				icon: BugIcon,
				badgeVariant: "destructive" as const,
			};
		case "security":
			return {
				label: "セキュリティ",
				icon: ShieldCheckIcon,
				badgeVariant: "outline" as const,
			};
		default:
			return {
				label: type,
				icon: SparklesIcon,
				badgeVariant: "default" as const,
			};
	}
};

export function ChangeItem({ change }: { change: Change }) {
	const {
		label,
		icon: IconComponent,
		badgeVariant,
	} = getTypeAttributes(change.type);
	return (
		<div className="p-4 rounded-md border bg-card text-card-foreground shadow-sm">
			<Badge variant={badgeVariant} className="mb-1.5 text-xs">
				<IconComponent className="h-3.5 w-3.5 mr-1.5" />
				{label}
			</Badge>
			<p className="text-sm text-muted-foreground leading-relaxed">
				{change.description}
			</p>
		</div>
	);
}
