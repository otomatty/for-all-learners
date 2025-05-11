"use client";

import { Badge } from "@/components/ui/badge";
import type { Database } from "@/types/database.types";

type InquiryStatus = Database["public"]["Enums"]["inquiry_status_enum"];

interface InquiryStatusBadgeProps {
	status: InquiryStatus | null | undefined;
}

export function InquiryStatusBadge({ status }: InquiryStatusBadgeProps) {
	if (!status) {
		return null;
	}

	const statusMap: Record<
		InquiryStatus,
		{
			text: string;
			variant: "default" | "secondary" | "destructive" | "outline";
		}
	> = {
		open: { text: "未対応", variant: "destructive" },
		in_progress: { text: "対応中", variant: "default" }, // blue-ish in shadcn default
		resolved: { text: "対応済み", variant: "secondary" }, // green-ish in shadcn default
		closed: { text: "クローズ", variant: "outline" },
	};

	const currentStatus = statusMap[status] || {
		text: status,
		variant: "outline",
	};

	return <Badge variant={currentStatus.variant}>{currentStatus.text}</Badge>;
}
