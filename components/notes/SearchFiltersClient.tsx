"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { SearchFilters } from "./SearchFilters";

interface SearchFiltersClientProps {
	currentType: "all" | "card" | "page";
	currentSort: "relevance" | "updated" | "created";
}

export function SearchFiltersClient({
	currentType,
	currentSort,
}: SearchFiltersClientProps) {
	const router = useRouter();
	const searchParams = useSearchParams();

	const handleTypeChange = (newType: "all" | "card" | "page") => {
		const params = new URLSearchParams(searchParams);
		params.set("type", newType);
		params.set("page", "1"); // ページをリセット
		router.push(`/search?${params.toString()}`);
	};

	const handleSortChange = (newSort: "relevance" | "updated" | "created") => {
		const params = new URLSearchParams(searchParams);
		params.set("sort", newSort);
		params.set("page", "1"); // ページをリセット
		router.push(`/search?${params.toString()}`);
	};

	return (
		<SearchFilters
			currentType={currentType}
			currentSort={currentSort}
			onTypeChange={handleTypeChange}
			onSortChange={handleSortChange}
		/>
	);
}
