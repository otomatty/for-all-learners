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
