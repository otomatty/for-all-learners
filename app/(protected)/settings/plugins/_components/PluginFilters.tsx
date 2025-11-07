/**
 * PluginFilters Component
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ app/(protected)/settings/plugins/_components/PluginFiltersClient.tsx
 *
 * Dependencies (External files that this file imports):
 *   ├─ @/components/ui/checkbox
 *   ├─ @/components/ui/label
 *   ├─ @/components/ui/select
 *   └─ ./PluginSortSelect
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/implementation-status.md
 */

"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { PluginSortSelect, type PluginSortType } from "./PluginSortSelect";

export type ExtensionPoint =
	| "editor"
	| "ai"
	| "ui"
	| "dataProcessor"
	| "integration";

interface PluginFiltersProps {
	// Filter values
	isOfficial: boolean | null;
	isReviewed: boolean | null;
	extensionPoint: ExtensionPoint | null;
	// Sort value
	sort: PluginSortType;
	// Callbacks
	onOfficialChange: (value: boolean | null) => void;
	onReviewedChange: (value: boolean | null) => void;
	onExtensionPointChange: (value: ExtensionPoint | null) => void;
	onSortChange: (value: PluginSortType) => void;
}

export function PluginFilters({
	isOfficial,
	isReviewed,
	extensionPoint,
	sort,
	onOfficialChange,
	onReviewedChange,
	onExtensionPointChange,
	onSortChange,
}: PluginFiltersProps) {
	const extensionPointLabels: Record<ExtensionPoint, string> = {
		editor: "エディタ",
		ai: "AI",
		ui: "UI",
		dataProcessor: "データ処理",
		integration: "外部連携",
	};

	return (
		<div className="flex flex-col gap-4">
			{/* Filter Row */}
			<div className="flex flex-wrap items-center gap-4">
				{/* Official Filter */}
				<div className="flex items-center gap-2">
					<Checkbox
						id="filter-official"
						checked={isOfficial === true}
						onCheckedChange={(checked) =>
							onOfficialChange(checked ? true : null)
						}
					/>
					<Label htmlFor="filter-official" className="cursor-pointer">
						公式のみ
					</Label>
				</div>

				{/* Reviewed Filter */}
				<div className="flex items-center gap-2">
					<Checkbox
						id="filter-reviewed"
						checked={isReviewed === true}
						onCheckedChange={(checked) =>
							onReviewedChange(checked ? true : null)
						}
					/>
					<Label htmlFor="filter-reviewed" className="cursor-pointer">
						レビュー済みのみ
					</Label>
				</div>

				{/* Extension Point Filter */}
				<div className="flex items-center gap-2">
					<Label htmlFor="filter-extension-point">拡張ポイント:</Label>
					<Select
						value={extensionPoint ?? "all"}
						onValueChange={(value) =>
							onExtensionPointChange(
								value === "all" ? null : (value as ExtensionPoint),
							)
						}
					>
						<SelectTrigger
							id="filter-extension-point"
							className="w-[160px]"
							aria-label="拡張ポイント"
						>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">すべて</SelectItem>
							{Object.entries(extensionPointLabels).map(([key, label]) => (
								<SelectItem key={key} value={key}>
									{label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			{/* Sort Row */}
			<div className="flex items-center gap-2">
				<Label htmlFor="sort-select">並び替え:</Label>
				<PluginSortSelect
					value={sort}
					onChange={onSortChange}
					id="sort-select"
				/>
			</div>
		</div>
	);
}
