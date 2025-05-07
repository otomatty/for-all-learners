"use client";

import React, { useCallback } from "react";
import type { Database } from "@/types/database.types";
import { useInfiniteQuery } from "@tanstack/react-query";
import { PagesList } from "./pages-list";
import { PagesListSkeleton } from "./pages-list-skeleton";

type PageRow = Database["public"]["Tables"]["pages"]["Row"];

interface PagesListContainerProps {
	userId: string;
	sortBy: "updated" | "created";
}

export function PagesListContainer({
	userId,
	sortBy,
}: PagesListContainerProps) {
	const limit = 100;

	const {
		data,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		isLoading,
		isError,
		error,
	} = useInfiniteQuery<{ pages: PageRow[]; totalCount: number }, Error>({
		queryKey: ["pages", userId, sortBy],
		queryFn: async ({ pageParam = 0 }) => {
			const res = await fetch(
				`/api/pages?userId=${userId}&limit=${limit}&offset=${pageParam}&sortBy=${sortBy}`,
			);
			if (!res.ok) {
				throw new Error("Failed to fetch pages");
			}
			return res.json();
		},
		getNextPageParam: (lastPage, allPages) =>
			lastPage.pages.length === limit ? allPages.length * limit : undefined,
		initialPageParam: 0,
	});

	const pages = (data?.pages.flatMap((g) => g.pages) ?? []).filter(
		(page, index, self) => self.findIndex((p) => p.id === page.id) === index,
	);

	const sentinelRef = useCallback(
		(node: HTMLElement | null) => {
			if (isFetchingNextPage) return;
			if (!node) return;
			const observer = new IntersectionObserver((entries) => {
				if (entries[0].isIntersecting && hasNextPage) {
					fetchNextPage();
				}
			});
			observer.observe(node);
		},
		[fetchNextPage, hasNextPage, isFetchingNextPage],
	);

	return (
		<div>
			{isError && <div className="text-red-500">Error: {error?.message}</div>}
			{isLoading ? <PagesListSkeleton /> : <PagesList pages={pages} />}
			<div ref={sentinelRef} />
		</div>
	);
}
