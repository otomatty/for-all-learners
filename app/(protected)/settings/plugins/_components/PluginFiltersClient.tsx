/**
 * PluginFiltersClient Component
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ app/(protected)/settings/plugins/page.tsx
 *
 * Dependencies (External files that this file imports):
 *   ├─ next/navigation
 *   ├─ ./PluginSearchBar
 *   └─ ./PluginFilters
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/implementation-status.md
 */

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { type ExtensionPoint, PluginFilters } from "./PluginFilters";
import { PluginSearchBar } from "./PluginSearchBar";
import type { PluginSortType } from "./PluginSortSelect";

interface PluginFiltersClientProps {
	initialSearch?: string;
	initialOfficial?: boolean | null;
	initialReviewed?: boolean | null;
	initialExtensionPoint?: ExtensionPoint | null;
	initialSort?: PluginSortType;
}

export function PluginFiltersClient({
	initialSearch = "",
	initialOfficial = null,
	initialReviewed = null,
	initialExtensionPoint = null,
	initialSort = "popular",
}: PluginFiltersClientProps) {
	const router = useRouter();
	const searchParams = useSearchParams();

	const search = useMemo(
		() => searchParams.get("search") ?? initialSearch,
		[searchParams, initialSearch],
	);
	const isOfficial = useMemo(() => {
		const value = searchParams.get("official");
		if (value === null) return initialOfficial;
		return value === "true";
	}, [searchParams, initialOfficial]);
	const isReviewed = useMemo(() => {
		const value = searchParams.get("reviewed");
		if (value === null) return initialReviewed;
		return value === "true";
	}, [searchParams, initialReviewed]);
	const extensionPoint = useMemo(() => {
		const value = searchParams.get("extensionPoint");
		if (value === null) return initialExtensionPoint;
		return value === "all" ? null : (value as ExtensionPoint);
	}, [searchParams, initialExtensionPoint]);
	const sort = useMemo(
		() => (searchParams.get("sort") as PluginSortType | null) ?? initialSort,
		[searchParams, initialSort],
	);

	const updateParams = useCallback(
		(
			updates: Partial<{
				search: string;
				official: boolean | null;
				reviewed: boolean | null;
				extensionPoint: ExtensionPoint | null;
				sort: PluginSortType;
			}>,
		) => {
			const params = new URLSearchParams(searchParams);
			params.delete("page"); // Reset pagination

			if (updates.search !== undefined) {
				if (updates.search.trim()) {
					params.set("search", updates.search.trim());
				} else {
					params.delete("search");
				}
			}

			if (updates.official !== undefined) {
				if (updates.official === true) {
					params.set("official", "true");
				} else {
					params.delete("official");
				}
			}

			if (updates.reviewed !== undefined) {
				if (updates.reviewed === true) {
					params.set("reviewed", "true");
				} else {
					params.delete("reviewed");
				}
			}

			if (updates.extensionPoint !== undefined) {
				if (updates.extensionPoint) {
					params.set("extensionPoint", updates.extensionPoint);
				} else {
					params.delete("extensionPoint");
				}
			}

			if (updates.sort !== undefined) {
				params.set("sort", updates.sort);
			}

			router.push(`/settings/plugins?${params.toString()}`);
		},
		[router, searchParams],
	);

	return (
		<div className="space-y-4 mb-6">
			{/* Search Bar */}
			<PluginSearchBar
				value={search}
				onChange={(value) => updateParams({ search: value })}
			/>

			{/* Filters */}
			<PluginFilters
				isOfficial={isOfficial}
				isReviewed={isReviewed}
				extensionPoint={extensionPoint}
				sort={sort}
				onOfficialChange={(value) => updateParams({ official: value })}
				onReviewedChange={(value) => updateParams({ reviewed: value })}
				onExtensionPointChange={(value) =>
					updateParams({ extensionPoint: value })
				}
				onSortChange={(value) => updateParams({ sort: value })}
			/>
		</div>
	);
}
