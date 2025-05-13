import type { FormattedInquiryListItem } from "@/app/_actions/inquiries";
import type { Database } from "@/types/database.types";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

type InquiryStatus = Database["public"]["Enums"]["inquiry_status_enum"];
type InquiryPriority = Database["public"]["Enums"]["inquiry_priority_enum"];

// inquiries.sql の enum と一致させる
const validStatuses: InquiryStatus[] = [
	"open",
	"in_progress",
	"resolved",
	"closed",
];
const validPriorities: InquiryPriority[] = ["low", "medium", "high"];

// getAllInquiries で実際にソート可能なキー (FormattedInquiryListItem のキーと一致)
const validSortByKeysForAdminInquiries: (
	| keyof FormattedInquiryListItem
	| "category_name_ja"
)[] = [
	"id",
	"created_at",
	"subject",
	"status",
	"priority",
	"email",
	"name",
	"category_name_ja",
];

export type ParsedAdminInquiriesSearchParams = {
	page: number;
	limit: number;
	sortBy: keyof FormattedInquiryListItem | "category_name_ja";
	sortOrder: "asc" | "desc";
	status?: InquiryStatus;
	priority?: InquiryPriority;
	categoryId?: string;
	searchQuery?: string;
};

export function parseAdminInquiriesSearchParams(searchParams?: {
	[key: string]: string | string[] | undefined;
}): ParsedAdminInquiriesSearchParams {
	const params = new URLSearchParams();
	if (searchParams) {
		for (const key in searchParams) {
			const value = searchParams[key];
			if (typeof value === "string") {
				params.set(key, value);
			}
		}
	}

	const page = Number.parseInt(params.get("page") || "1", 10);
	const limit = Number.parseInt(params.get("limit") || "20", 10);

	const sortByInput = params.get("sortBy") || "created_at";
	const sortBy = validSortByKeysForAdminInquiries.includes(
		sortByInput as keyof FormattedInquiryListItem | "category_name_ja",
	)
		? (sortByInput as keyof FormattedInquiryListItem | "category_name_ja")
		: "created_at";

	const sortOrderInput = params.get("sortOrder") || "desc";
	const sortOrder = (sortOrderInput === "asc" ? "asc" : "desc") as
		| "asc"
		| "desc";

	const status =
		(params.get("status") as InquiryStatus | undefined) || undefined;
	const priority =
		(params.get("priority") as InquiryPriority | undefined) || undefined;
	const categoryId = params.get("categoryId") || undefined;
	const searchQuery = params.get("q") || undefined;

	return {
		page: page > 0 ? page : 1,
		limit: limit > 0 ? limit : 20,
		sortBy,
		sortOrder,
		status: status && validStatuses.includes(status) ? status : undefined,
		priority:
			priority && validPriorities.includes(priority) ? priority : undefined,
		categoryId,
		searchQuery,
	};
}
