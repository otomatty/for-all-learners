"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useInView } from "react-intersection-observer";
import type { Database, Json } from "@/types/database.types";
import { PagesList } from "./pages-list";

interface MyPagesListProps {
	userId: string;
}

interface PaginatedResult {
	pages: Database["public"]["Tables"]["pages"]["Row"][];
	totalCount: number;
}

export function MyPagesList({ userId }: MyPagesListProps) {
	const limit = 100;
	const [pages, setPages] = useState<PaginatedResult["pages"]>([]);
	const [totalCount, setTotalCount] = useState(0);
	const [offset, setOffset] = useState(0);
	const [sortBy, setSortBy] = useState<"updated" | "created">("updated");
	const [loading, setLoading] = useState(false);
	const { ref, inView } = useInView();

	const fetchPages = useCallback(
		async (reset = false) => {
			setLoading(true);
			try {
				const res = await fetch(
					`/api/pages?userId=${userId}&limit=${limit}&offset=${reset ? 0 : offset}&sortBy=${sortBy}`,
				);
				const data: PaginatedResult = await res.json();
				if (reset) {
					setPages(data.pages);
					setOffset(data.pages.length);
				} else {
					setPages((prev) => [...prev, ...data.pages]);
					setOffset((prev) => prev + data.pages.length);
				}
				setTotalCount(data.totalCount);
			} catch (err) {
				console.error("MyPagesList fetch error:", err);
			} finally {
				setLoading(false);
			}
		},
		[userId, sortBy, offset],
	);

	// initial load and on sort change
	useEffect(() => {
		fetchPages(true);
	}, [fetchPages]);

	// infinite scroll trigger
	useEffect(() => {
		if (inView && !loading && pages.length < totalCount) {
			fetchPages();
		}
	}, [inView, loading, pages.length, totalCount, fetchPages]);

	return (
		<div className="space-y-4">
			<div className="flex justify-end">
				<select
					value={sortBy}
					onChange={(e) => setSortBy(e.target.value as "updated" | "created")}
					className="p-1 border rounded"
				>
					<option value="updated">更新順</option>
					<option value="created">作成順</option>
				</select>
			</div>
			<PagesList pages={pages} />
			<div ref={ref} />
			{loading && (
				<p className="text-center text-sm text-muted-foreground">
					読み込み中...
				</p>
			)}
		</div>
	);
}
