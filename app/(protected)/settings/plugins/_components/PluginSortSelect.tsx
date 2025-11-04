/**
 * PluginSortSelect Component
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ app/(protected)/settings/plugins/_components/PluginFilters.tsx
 *
 * Dependencies (External files that this file imports):
 *   └─ @/components/ui/select
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/implementation-status.md
 */

"use client";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

// Allowed sort orders
const allowedSorts = ["popular", "rating", "updated", "name"] as const;

export type PluginSortType = (typeof allowedSorts)[number];

// Type guard function
function isValidSort(value: string): value is PluginSortType {
	return allowedSorts.includes(value as PluginSortType);
}

interface PluginSortSelectProps {
	value: PluginSortType;
	onChange: (value: PluginSortType) => void;
	id?: string;
}

export function PluginSortSelect({
	value,
	onChange,
	id,
}: PluginSortSelectProps) {
	const handleChange = (newValue: string) => {
		if (isValidSort(newValue)) {
			onChange(newValue);
		}
	};

	const sortLabels: Record<PluginSortType, string> = {
		popular: "人気順",
		rating: "レーティング順",
		updated: "最新順",
		name: "名前順",
	};

	return (
		<Select value={value} onValueChange={handleChange}>
			<SelectTrigger className="w-[180px]" aria-label="並び替え" id={id}>
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="popular">{sortLabels.popular}</SelectItem>
				<SelectItem value="rating">{sortLabels.rating}</SelectItem>
				<SelectItem value="updated">{sortLabels.updated}</SelectItem>
				<SelectItem value="name">{sortLabels.name}</SelectItem>
			</SelectContent>
		</Select>
	);
}
