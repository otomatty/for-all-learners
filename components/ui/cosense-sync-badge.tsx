import { CheckCircle, Loader2, XCircle } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface CosenseSyncBadgeProps {
	/** Optional className for custom styling */
	className?: string;
	isLoading?: boolean; // 同期中フラグ
	/** 'synced' when content and list both synced, 'unsynced' when list synced but content not */
	status?: "synced" | "unsynced";
}

/**
 * Badge component to show Cosense (旧Scrapbox) sync status.
 * Displays loading state or synced state with check icon.
 */
export function CosenseSyncBadge({
	className,
	isLoading = false,
	status,
}: CosenseSyncBadgeProps) {
	if (isLoading) {
		return (
			<Tooltip>
				<TooltipTrigger asChild>
					<Badge variant="secondary" className={cn(className)}>
						<Loader2 className="w-3 h-3 animate-spin mr-1" />
						同期中
					</Badge>
				</TooltipTrigger>
				<TooltipContent>同期処理中です</TooltipContent>
			</Tooltip>
		);
	}
	// unsynced: list synced but content not
	if (status === "unsynced") {
		return (
			<Tooltip>
				<TooltipTrigger asChild>
					<Badge
						variant="secondary"
						className={cn("text-red-500 border-red-500", className)}
					>
						<XCircle className="w-3 h-3 mr-1" />
						未同期
					</Badge>
				</TooltipTrigger>
				<TooltipContent>クリックして同期してください。</TooltipContent>
			</Tooltip>
		);
	}
	// synced: both content and list synced
	if (status === "synced") {
		return (
			<Tooltip>
				<TooltipTrigger asChild>
					<Badge
						variant="secondary"
						className={cn("text-lime-500 border-lime-500", className)}
					>
						<Image
							src="/images/cosense.webp"
							alt="Cosense"
							width={16}
							height={16}
							className="object-contain"
						/>
						同期済み
						<CheckCircle className="w-3 h-3 ml-1" />
					</Badge>
				</TooltipTrigger>
				<TooltipContent>Cosenseと同期されています。</TooltipContent>
			</Tooltip>
		);
	}
	// default: nothing
	return null;
}
