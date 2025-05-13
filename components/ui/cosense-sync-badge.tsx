import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle, Loader2 } from "lucide-react";
import Image from "next/image";

interface CosenseSyncBadgeProps {
	/** Optional className for custom styling */
	className?: string;
	isLoading?: boolean; // 同期中フラグ
}

/**
 * Badge component to show Cosense (旧Scrapbox) sync status.
 * Displays loading state or synced state with check icon.
 */
export function CosenseSyncBadge({
	className,
	isLoading = false,
}: CosenseSyncBadgeProps) {
	if (isLoading) {
		return (
			<Badge variant="secondary" className={cn(className)}>
				<Loader2 className="w-3 h-3 animate-spin mr-1" />
				同期中
			</Badge>
		);
	}
	// detailed synced
	return (
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
	);
}
