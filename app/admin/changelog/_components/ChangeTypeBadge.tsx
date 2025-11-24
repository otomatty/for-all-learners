import type { Change } from "@/hooks/changelog";

// 変更点の種類に応じたバッジのスタイルとテキスト
const changeTypeDetails: Record<
	Change["type"],
	{ style: string; label: string }
> = {
	new: { style: "bg-green-100 text-green-800", label: "NEW" },
	improvement: {
		style: "bg-blue-100 text-blue-800",
		label: "IMPROVEMENT",
	},
	fix: {
		style:
			"bg-yellow-100 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-100",
		label: "FIX",
	},
	security: { style: "bg-red-100 text-red-800", label: "SECURITY" },
};

export function ChangeTypeBadge({ type }: { type: Change["type"] }) {
	const details = changeTypeDetails[type] || changeTypeDetails.fix; // デフォルトはfix（ありえないが型安全のため）
	return (
		<span
			className={`px-2 py-0.5 text-xs font-semibold rounded-full ${details.style}`}
		>
			{details.label}
		</span>
	);
}
