"use client";

import { XIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { Database } from "@/types/database.types";
import type { InquiryCategoryOption } from "@/types/inquiry-types";

type InquiryStatus = Database["public"]["Enums"]["inquiry_status_enum"];
type InquiryPriority = Database["public"]["Enums"]["inquiry_priority_enum"];

const inquiryStatuses: { value: InquiryStatus; label: string }[] = [
	{ value: "open", label: "未対応" },
	{ value: "in_progress", label: "対応中" },
	{ value: "resolved", label: "対応済み" },
	{ value: "closed", label: "クローズ" },
];

const inquiryPriorities: { value: InquiryPriority; label: string }[] = [
	{ value: "low", label: "低" },
	{ value: "medium", label: "中" },
	{ value: "high", label: "高" },
];

interface InquiryFiltersProps {
	categories: InquiryCategoryOption[];
	initialFilters: {
		searchQuery?: string;
		status?: InquiryStatus;
		priority?: InquiryPriority;
		categoryId?: string; // string because it comes from URL
	};
}

export function InquiryFilters({
	categories,
	initialFilters,
}: InquiryFiltersProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const ALL_ITEMS_VALUE = "__ALL_ITEMS__"; // 「すべて」を表すための一意な値

	const [searchQuery, setSearchQuery] = useState(
		initialFilters.searchQuery || "",
	);
	const [status, setStatus] = useState<InquiryStatus | "">(
		initialFilters.status || "",
	);
	const [priority, setPriority] = useState<InquiryPriority | "">(
		initialFilters.priority || "",
	);
	const [categoryId, setCategoryId] = useState(initialFilters.categoryId || "");

	const searchQueryId = useId();
	const statusId = useId();
	const priorityId = useId();
	const categoryIdInput = useId();

	const handleFilterChange = () => {
		const params = new URLSearchParams(searchParams);
		if (searchQuery) params.set("q", searchQuery);
		else params.delete("q");
		if (status) params.set("status", status);
		else params.delete("status");
		if (priority) params.set("priority", priority);
		else params.delete("priority");
		if (categoryId) params.set("categoryId", categoryId);
		else params.delete("categoryId");
		params.set("page", "1"); // フィルタ変更時は1ページ目に戻す
		router.push(`${pathname}?${params.toString()}`);
	};

	const clearFilters = () => {
		setSearchQuery("");
		setStatus("");
		setPriority("");
		setCategoryId("");
		router.push(pathname); // クエリパラメータなしのURLへ
	};

	// Apply initial filters from URL on mount
	useEffect(() => {
		setSearchQuery(searchParams.get("q") || "");
		setStatus((searchParams.get("status") as InquiryStatus | null) || "");
		setPriority((searchParams.get("priority") as InquiryPriority | null) || "");
		setCategoryId(searchParams.get("categoryId") || "");
	}, [searchParams]);

	return (
		<div className="mb-6 p-4 border rounded-lg bg-card text-card-foreground">
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
				<div>
					<Label htmlFor={searchQueryId}>キーワード</Label>
					<Input
						id={searchQueryId}
						placeholder="件名、内容、Emailなどで検索..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && handleFilterChange()}
					/>
				</div>
				<div>
					<Label htmlFor={statusId}>ステータス</Label>
					<Select
						value={status}
						onValueChange={(value) =>
							setStatus(
								value === ALL_ITEMS_VALUE ? "" : (value as InquiryStatus),
							)
						}
					>
						<SelectTrigger id={statusId}>
							<SelectValue placeholder="すべて" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={ALL_ITEMS_VALUE}>すべて</SelectItem>
							{inquiryStatuses.map((s) => (
								<SelectItem key={s.value} value={s.value}>
									{s.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div>
					<Label htmlFor={priorityId}>優先度</Label>
					<Select
						value={priority}
						onValueChange={(value) => {
							setPriority(
								value === ALL_ITEMS_VALUE ? "" : (value as InquiryPriority),
							);
						}}
					>
						<SelectTrigger id={priorityId}>
							<SelectValue placeholder="すべて" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={ALL_ITEMS_VALUE}>すべて</SelectItem>
							{inquiryPriorities.map((p) => (
								<SelectItem key={p.value} value={p.value}>
									{p.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div>
					<Label htmlFor={categoryIdInput}>カテゴリ</Label>
					<Select
						value={categoryId}
						onValueChange={(value) =>
							setCategoryId(value === ALL_ITEMS_VALUE ? "" : value)
						}
					>
						<SelectTrigger id={categoryIdInput}>
							<SelectValue placeholder="すべて" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={ALL_ITEMS_VALUE}>すべて</SelectItem>
							{categories.map((cat) => (
								<SelectItem key={cat.id} value={cat.id.toString()}>
									{cat.name_ja}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>
			<div className="mt-4 flex gap-2">
				<Button onClick={handleFilterChange}>絞り込む</Button>
				<Button
					variant="ghost"
					onClick={clearFilters}
					className="text-muted-foreground"
				>
					<XIcon className="mr-2 h-4 w-4" />
					クリア
				</Button>
			</div>
		</div>
	);
}
