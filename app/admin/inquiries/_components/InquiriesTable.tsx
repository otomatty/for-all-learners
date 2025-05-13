"use client";

import type { FormattedInquiryListItem } from "@/app/_actions/inquiries"; // 型をインポート
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { ArrowUpDown } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { InquiryPriorityBadge } from "./InquiryPriorityBadge";
import { InquiryStatusBadge } from "./InquiryStatusBadge";

interface InquiriesTableProps {
	inquiries: FormattedInquiryListItem[];
	currentSortBy: string;
	currentSortOrder: "asc" | "desc";
}

const columns: {
	key: keyof FormattedInquiryListItem | "category_name_ja";
	label: string;
	sortable: boolean;
}[] = [
	{ key: "subject", label: "件名", sortable: true },
	{ key: "category_name_ja", label: "カテゴリ", sortable: true },
	{ key: "name", label: "送信者名", sortable: true },
	{ key: "email", label: "Email", sortable: true },
	{ key: "status", label: "ステータス", sortable: true },
	{ key: "priority", label: "優先度", sortable: true },
	{ key: "created_at", label: "受付日時", sortable: true },
];

export function InquiriesTable({
	inquiries,
	currentSortBy,
	currentSortOrder,
}: InquiriesTableProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	if (!inquiries || inquiries.length === 0) {
		return (
			<p className="text-center text-muted-foreground py-8">
				お問い合わせはありません。
			</p>
		);
	}

	const handleSortChange = (
		columnKey: keyof FormattedInquiryListItem | "category_name_ja",
	) => {
		const params = new URLSearchParams(searchParams.toString());
		let newSortOrder: "asc" | "desc" = "asc";

		if (currentSortBy === columnKey) {
			newSortOrder = currentSortOrder === "asc" ? "desc" : "asc";
		}

		params.set("sortBy", columnKey);
		params.set("sortOrder", newSortOrder);
		// ソート変更時は1ページ目に戻すのが一般的ですが、要件に応じて変更してください
		// params.set("page", "1");
		router.push(`${pathname}?${params.toString()}`, { scroll: false });
	};

	return (
		<div className="rounded-md border">
			<Table>
				<TableHeader>
					<TableRow>
						{columns.map((col) => (
							<TableHead key={col.key}>
								{col.sortable ? (
									<Button
										variant="ghost"
										onClick={() => handleSortChange(col.key)}
										className="px-2 py-1"
									>
										{col.label}
										{currentSortBy === col.key && (
											<ArrowUpDown
												className={`ml-2 h-4 w-4 ${currentSortOrder === "asc" ? "" : "rotate-180"}`}
											/>
										)}
									</Button>
								) : (
									col.label
								)}
							</TableHead>
						))}
						<TableHead>操作</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{inquiries.map((inquiry) => (
						<TableRow key={inquiry.id}>
							<TableCell className="font-medium">
								<Link
									href={`/admin/inquiries/${inquiry.id}`}
									className="hover:underline"
								>
									{inquiry.subject}
								</Link>
							</TableCell>
							<TableCell>{inquiry.category_name_ja || "未分類"}</TableCell>
							<TableCell>{inquiry.name || "-"}</TableCell>
							<TableCell>{inquiry.email || "-"}</TableCell>
							<TableCell>
								<InquiryStatusBadge status={inquiry.status} />
							</TableCell>
							<TableCell>
								<InquiryPriorityBadge priority={inquiry.priority} />
							</TableCell>
							<TableCell>
								{inquiry.created_at
									? new Date(inquiry.created_at).toLocaleString("ja-JP")
									: "-"}
							</TableCell>
							<TableCell>
								<Button asChild variant="outline" size="sm">
									<Link href={`/admin/inquiries/${inquiry.id}`}>詳細</Link>
								</Button>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
