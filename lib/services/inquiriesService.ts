import type {
	AdminInquiriesListState,
	GetAllInquiriesOptions,
	GetInquiryCategoriesState,
} from "@/hooks/inquiries";
import { createClient } from "@/lib/supabase/server";
import type { InquiryCategoryOption } from "@/types/inquiry-types";

/**
 * サーバーサイドでお問い合わせ一覧を取得する
 * 既存のuseAllInquiries()フックと同じロジックを使用
 */
export async function getAllInquiriesServer(
	options: GetAllInquiriesOptions = {},
): Promise<AdminInquiriesListState> {
	const supabase = await createClient();

	const {
		page = 1,
		limit = 20,
		sortBy = "created_at",
		sortOrder = "desc",
		filters = {},
	} = options;
	const offset = (page - 1) * limit;

	let query = supabase.from("inquiries").select(
		`
      id,
      created_at,
      subject,
      status,
      priority,
      email,
      name,
      inquiry_categories ( name_ja )
    `,
		{ count: "exact" },
	);

	if (sortBy === "category_name_ja") {
		query = query.order("inquiry_categories(name_ja)", {
			ascending: sortOrder === "asc",
			foreignTable: "inquiry_categories",
		});
	} else {
		query = query.order(sortBy as string, {
			ascending: sortOrder === "asc",
		});
	}

	query = query.range(offset, offset + limit - 1);

	if (filters.status) {
		query = query.eq("status", filters.status);
	}
	if (filters.priority) {
		query = query.eq("priority", filters.priority);
	}
	if (filters.categoryId) {
		query = query.eq("category_id", filters.categoryId);
	}
	if (filters.searchQuery && filters.searchQuery.trim() !== "") {
		const searchQuery = `%${filters.searchQuery.trim()}%`;
		query = query.or(
			`subject.ilike.${searchQuery},body.ilike.${searchQuery},email.ilike.${searchQuery},name.ilike.${searchQuery}`,
		);
	}

	const { data, error, count } = await query;

	if (error) {
		return {
			inquiries: null,
			totalCount: 0,
			message: `お問い合わせ一覧の取得中にエラーが発生しました。(詳細: ${error.message})`,
			success: false,
		};
	}

	const formattedInquiries =
		data?.map((inq) => ({
			id: inq.id,
			created_at: inq.created_at,
			subject: inq.subject,
			status: inq.status,
			priority: inq.priority,
			email: inq.email,
			name: inq.name,
			category_name_ja:
				(inq.inquiry_categories as { name_ja: string | null } | null)
					?.name_ja || null,
		})) || [];

	return {
		inquiries: formattedInquiries,
		totalCount: count || 0,
		message: "お問い合わせ一覧を正常に取得しました。",
		success: true,
	};
}

/**
 * サーバーサイドでお問い合わせカテゴリ一覧を取得する
 * 既存のuseInquiryCategories()フックと同じロジックを使用
 */
export async function getInquiryCategoriesServer(): Promise<GetInquiryCategoriesState> {
	const supabase = await createClient();

	const { data, error } = await supabase
		.from("inquiry_categories")
		.select("id, name_ja, name_en")
		.order("display_order", { ascending: true });

	if (error) {
		return {
			categories: null,
			message: `カテゴリの取得中にエラーが発生しました。(詳細: ${error.message})`,
			success: false,
		};
	}

	const categories: InquiryCategoryOption[] =
		data?.map((cat) => ({
			id: cat.id,
			name_ja: cat.name_ja,
		})) || [];

	return {
		categories,
		message: "カテゴリを正常に取得しました。",
		success: true,
	};
}
