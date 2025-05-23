"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { Database } from "@/types/database.types";
// Define page row type
type PageRow = Database["public"]["Tables"]["pages"]["Row"];

import { PagesList } from "./_components/pages-list";
import { PagesListSkeleton } from "@/app/(protected)/pages/_components/pages-list-skeleton";
import {
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface NotePagesClientProps {
	slug: string;
	totalCount: number;
}

export default function NotePagesClient({
	slug,
	totalCount,
}: NotePagesClientProps) {
	const [sortBy, setSortBy] = useState<"updated" | "created">("updated");
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
		queryKey: ["note-pages", slug, sortBy] as const,
		queryFn: async ({ pageParam = 0 }) => {
			const res = await fetch(
				`/api/notes/${slug}/pages?limit=${limit}&offset=${pageParam}&sortBy=${sortBy}`,
			);
			if (!res.ok) {
				throw new Error("Failed to fetch note pages");
			}
			return res.json();
		},
		getNextPageParam: (lastPage, allPages) =>
			lastPage.pages.length === limit ? allPages.length * limit : undefined,
		initialPageParam: 0,
	});

	// Flatten pages and remove duplicates by id to ensure unique keys
	const pages = (
		data?.pages.flatMap((group) => group.pages) ?? ([] as PageRow[])
	).filter(
		(page, index, self) => self.findIndex((p) => p.id === page.id) === index,
	);

	useEffect(() => {
		console.log("Debug: pages in component", pages);
		if (isError) {
			console.error("Debug: error fetching pages", error);
		}
	}, [pages, isError, error]);

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
			return () => observer.disconnect();
		},
		[fetchNextPage, hasNextPage, isFetchingNextPage],
	);

	return (
		<>
			<div className="flex justify-end mb-4 items-center space-x-2">
				<Select
					value={sortBy}
					onValueChange={(value) => setSortBy(value as "updated" | "created")}
				>
					<SelectTrigger className="p-2 border rounded">
						<SelectValue placeholder="表示順" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="updated">更新順</SelectItem>
						<SelectItem value="created">作成順</SelectItem>
					</SelectContent>
				</Select>
				<Button
					onClick={() => {
						window.location.href = `/notes/${slug}/new`;
					}}
				>
					新規ページ
				</Button>
			</div>
			{isError && <div className="text-red-500">Error: {error?.message}</div>}
			{isLoading ? (
				<PagesListSkeleton />
			) : (
				<PagesList pages={pages} slug={slug} />
			)}
			<div ref={sentinelRef} />
			<div className="hidden md:block fixed bottom-0 right-0 p-2 border-t border-l bg-background text-sm text-muted-foreground mt-4">
				総ページ数: {totalCount}
			</div>
		</>
	);
}
