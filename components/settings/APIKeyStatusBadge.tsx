/**
 * APIKeyStatusBadge Component
 *
 * DEPENDENCY MAP:
 *
 * Parents (このファイルを import している場所):
 *   └─ components/settings/ProviderCard.tsx
 *
 * Dependencies (このファイルが import している外部ファイル):
 *   ├─ components/ui/badge.tsx
 *   ├─ lucide-react (Check icon)
 *   └─ lib/utils.ts (cn utility)
 *
 * Related Files:
 *   ├─ Spec: ./APIKeyStatusBadge.spec.md
 *   └─ Tests: ./__tests__/APIKeyStatusBadge.test.tsx
 */

import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface APIKeyStatusBadgeProps {
	/** APIキーが設定済みかどうか */
	configured: boolean;

	/** カスタムクラス名（オプション） */
	className?: string;
}

export function APIKeyStatusBadge({
	configured,
	className,
}: APIKeyStatusBadgeProps) {
	if (configured) {
		return (
			<Badge variant="success" className={cn("gap-1", className)}>
				<Check className="h-3 w-3" aria-hidden="true" />
				設定済み
			</Badge>
		);
	}

	return (
		<Badge variant="secondary" className={className}>
			未設定
		</Badge>
	);
}
