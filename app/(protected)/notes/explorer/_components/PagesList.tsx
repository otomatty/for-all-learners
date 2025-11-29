"use client";

import { Calendar, FileText, Grid3X3, List, Search } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotePages } from "@/hooks/notes/useNotePages";
import { cn } from "@/lib/utils";
import DraggablePageItem from "./DraggablePageItem";

interface PagesListProps {
	noteId: string;
	noteSlug: string;
	userId: string;
	selectedPageIds: string[];
	onSelectPages: (pageIds: string[]) => void;
}

export default function PagesList({
	noteSlug,
	userId,
	selectedPageIds,
	onSelectPages,
}: PagesListProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [sortBy, setSortBy] = useState<"updated" | "created">("updated");
	const [viewMode, setViewMode] = useState<"list" | "grid">("list");

	// ページデータを取得（既存のフックを使用）
	const { data, isLoading: loading } = useNotePages({
		slug: noteSlug,
		userId,
		limit: 100, // TODO: ページネーション実装
		offset: 0,
		sortBy,
	});

	const pages = data?.pages || [];

	// 検索フィルタリング
	const filteredPages = pages.filter((page) =>
		page.title.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	// 全選択/全解除の処理
	const handleSelectAll = (checked: boolean) => {
		if (checked) {
			onSelectPages(filteredPages.map((page) => page.id));
		} else {
			onSelectPages([]);
		}
	};

	// 個別選択の処理
	const handleSelectPage = (pageId: string, checked: boolean) => {
		if (checked) {
			onSelectPages([...selectedPageIds, pageId]);
		} else {
			onSelectPages(selectedPageIds.filter((id) => id !== pageId));
		}
	};

	if (loading) {
		return (
			<div className="h-full flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
					<p className="text-sm text-muted-foreground">読み込み中...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="h-full flex flex-col">
			{/* ツールバー */}
			<div className="p-4 border-b space-y-3">
				{/* 検索バー */}
				<div className="flex items-center gap-2">
					<div className="relative flex-1">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="ページを検索..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-10"
						/>
					</div>
				</div>

				{/* コントロールバー */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						{/* 全選択チェックボックス */}
						<Checkbox
							checked={
								selectedPageIds.length === filteredPages.length &&
								filteredPages.length > 0
							}
							onCheckedChange={handleSelectAll}
						/>
						<span className="text-sm text-muted-foreground">
							{selectedPageIds.length > 0
								? `${selectedPageIds.length}件選択中`
								: `${filteredPages.length}件`}
						</span>
					</div>

					<div className="flex items-center gap-2">
						{/* ソート */}
						<Button
							variant="outline"
							size="sm"
							onClick={() =>
								setSortBy(sortBy === "updated" ? "created" : "updated")
							}
						>
							<Calendar className="h-4 w-4 mr-1" />
							{sortBy === "updated" ? "更新日順" : "作成日順"}
						</Button>

						{/* 表示モード */}
						<div className="flex rounded-md border">
							<Button
								variant={viewMode === "list" ? "default" : "ghost"}
								size="sm"
								onClick={() => setViewMode("list")}
								className="rounded-r-none"
							>
								<List className="h-4 w-4" />
							</Button>
							<Button
								variant={viewMode === "grid" ? "default" : "ghost"}
								size="sm"
								onClick={() => setViewMode("grid")}
								className="rounded-l-none border-l"
							>
								<Grid3X3 className="h-4 w-4" />
							</Button>
						</div>
					</div>
				</div>
			</div>

			{/* ページ一覧 */}
			<ScrollArea className="flex-1">
				{filteredPages.length === 0 ? (
					<div className="h-full flex items-center justify-center text-center p-8">
						<div>
							<FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
							<p className="text-muted-foreground">
								{searchQuery
									? "該当するページが見つかりません"
									: "このノートにはまだページがありません"}
							</p>
						</div>
					</div>
				) : (
					<div
						className={cn(
							"p-4",
							viewMode === "grid"
								? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
								: "space-y-2",
						)}
					>
						{filteredPages.map((page) => {
							const isSelected = selectedPageIds.includes(page.id);

							return (
								<DraggablePageItem
									key={page.id}
									page={page}
									isSelected={isSelected}
									onSelect={handleSelectPage}
								/>
							);
						})}
					</div>
				)}
			</ScrollArea>
		</div>
	);
}
