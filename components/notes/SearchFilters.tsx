/**
 * SearchFilters Component
 *
 * DEPENDENCY MAP:
 *
 * Parents (このファイルを import している場所):
 *   └─ components/notes/SearchFiltersClient.tsx
 *
 * Dependencies (このファイルが import している外部ファイル):
 *   ├─ ./TypeFilter
 *   └─ ./SortSelect
 *
 * Related Files:
 *   └─ Issue: docs/01_issues/open/2025_10/20251029_XX_xxx.md
 */

import { SortSelect } from "./SortSelect";
import { TypeFilter } from "./TypeFilter";

interface SearchFiltersProps {
	currentType: "all" | "card" | "page";
	currentSort: "relevance" | "updated" | "created";
	onTypeChange: (type: "all" | "card" | "page") => void;
	onSortChange: (sort: "relevance" | "updated" | "created") => void;
}

export function SearchFilters({
	currentType,
	currentSort,
	onTypeChange,
	onSortChange,
}: SearchFiltersProps) {
	return (
		<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<TypeFilter value={currentType} onChange={onTypeChange} />
			<SortSelect value={currentSort} onChange={onSortChange} />
		</div>
	);
}
