/**
 * PluginSearchBar Component
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ app/(protected)/settings/plugins/_components/PluginFiltersClient.tsx
 *
 * Dependencies (External files that this file imports):
 *   ├─ @/components/ui/input
 *   └─ lucide-react
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/implementation-status.md
 */

"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface PluginSearchBarProps {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
}

export function PluginSearchBar({
	value,
	onChange,
	placeholder = "プラグイン名、説明、作成者で検索...",
}: PluginSearchBarProps) {
	return (
		<div className="relative">
			<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
			<Input
				type="text"
				placeholder={placeholder}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className="pl-9"
			/>
		</div>
	);
}
