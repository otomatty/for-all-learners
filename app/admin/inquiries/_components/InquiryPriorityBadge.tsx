"use client";

import { Badge } from "@/components/ui/badge";
import type { Database } from "@/types/database.types";

type InquiryPriority = Database["public"]["Enums"]["inquiry_priority_enum"];

interface InquiryPriorityBadgeProps {
	priority: InquiryPriority | null | undefined;
}

export function InquiryPriorityBadge({ priority }: InquiryPriorityBadgeProps) {
	if (!priority) {
		return <Badge variant="outline">未設定</Badge>;
	}

	const priorityMap: Record<
		InquiryPriority,
		{
			text: string;
			variant: "default" | "secondary" | "destructive" | "outline";
		}
	> = {
		low: { text: "低", variant: "secondary" },
		medium: { text: "中", variant: "default" },
		high: { text: "高", variant: "destructive" },
	};

	const currentPriority = priorityMap[priority] || {
		text: priority,
		variant: "outline",
	};

	return (
		<Badge variant={currentPriority.variant}>{currentPriority.text}</Badge>
	);
}
