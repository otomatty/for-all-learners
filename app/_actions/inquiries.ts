"use server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
// import { revalidatePath } from "next/cache"; // 必要に応じてコメント解除
import type { InquiryCategoryOption } from "@/types/inquiry-types";
import { headers } from "next/headers";
import { v4 as uuidv4 } from "uuid"; // ファイル名の一意性を保つためにuuidを使用
import { z } from "zod";

// お問い合わせフォームの入力スキーマ定義 (zodを使用)
const CreateInquirySchema = z.object({
	email: z
		.string()
		.email("無効なメールアドレスです。")
		.optional()
		.or(z.literal("")), // 任意入力だが、形式はemail
	name: z.string().optional(),
	categoryId: z.coerce
		.number()
		.int("カテゴリIDは整数である必要があります。")
		.positive("カテゴリを選択してください。")
		.optional(),
	subject: z.string().min(1, "件名を入力してください。"),
	body: z.string().min(1, "お問い合わせ内容を入力してください。"),
	pagePath: z.string().optional(),
	userAgent: z.string().optional(),
});

// サーバーアクションの戻り値の型定義
export type InquiryFormState = {
	message: string | null;
	errors?: {
		email?: string[];
		name?: string[];
		categoryId?: string[];
		subject?: string[];
		body?: string[];
		pagePath?: string[];
		userAgent?: string[];
		general?: string[]; // その他のエラー用
	};
	success: boolean;
	inquiryId?: string | null;
};

export async function submitInquiry(
	// prevState: InquiryFormState | undefined, // React useFormState を使う場合はこの引数が必要
	formData: FormData,
): Promise<InquiryFormState> {
	const supabase = await createClient();

	// FormDataからデータを抽出
	const rawFormData = {
		email: formData.get("email") as string | null,
		name: formData.get("name") as string | null,
		categoryId: formData.get("categoryId")
			? (formData.get("categoryId") as string)
			: undefined,
		subject: formData.get("subject") as string | null,
		body: formData.get("body") as string | null,
		pagePath: formData.get("pagePath") as string | null,
		// userAgentはクライアントサイドで設定するか、ヘッダーから取得する
		// ここではフォームから渡される想定
		userAgent:
			(formData.get("userAgent") as string | null) ??
			(await headers()).get("user-agent"),
		// ファイルは別途取得
		attachments: formData.getAll("attachments") as File[], // 複数ファイルを取得
	};

	// 入力データのバリデーション
	const validatedFields = CreateInquirySchema.safeParse(rawFormData);

	if (!validatedFields.success) {
		return {
			message: `入力内容に誤りがあります。件名、お問い合わせ内容は必須です。${
				rawFormData.attachments.some((file) => file.size > 5 * 1024 * 1024) // いずれかのファイルサイズが大きい場合
					? " 添付ファイルの中にサイズが大きすぎるものがあります。"
					: rawFormData.attachments.length > 5
						? " 添付ファイルは最大5枚までです。"
						: ""
			}`, // 簡単なファイルサイズチェック例

			errors: validatedFields.error.flatten().fieldErrors,
			success: false,
		};
	}

	const { data: validatedData } = validatedFields;
	const {
		data: { user },
	} = await supabase.auth.getUser();

	// データベースに挿入するデータ準備
	const inquiryDataToInsert: {
		user_id?: string;
		email?: string;
		name?: string;
		category_id?: number;
		subject: string;
		body: string;
		page_path?: string;
		user_agent?: string;
		ip_address?: string;
	} = {
		subject: validatedData.subject,
		body: validatedData.body,
		category_id: validatedData.categoryId,
		page_path: validatedData.pagePath || undefined, // 空文字ならundefined
		user_agent: validatedData.userAgent || undefined,
	};

	// IPアドレスの取得
	const headerList = await headers();
	inquiryDataToInsert.ip_address =
		headerList.get("x-forwarded-for")?.split(",")[0].trim() ??
		headerList.get("remote_addr") ??
		undefined;

	if (user) {
		inquiryDataToInsert.user_id = user.id;
		inquiryDataToInsert.email = validatedData.email || user.email; // フォーム入力優先、なければユーザー情報
		inquiryDataToInsert.name =
			validatedData.name ||
			user.user_metadata?.full_name ||
			user.user_metadata?.name ||
			undefined;
	} else {
		// 匿名ユーザーの場合、メールアドレスは必須
		if (!validatedData.email) {
			return {
				message: "メールアドレスは必須です。",
				errors: {
					email: [
						"匿名ユーザーとしてお問い合わせる場合、メールアドレスを入力してください。",
					],
				},
				success: false,
			};
		}
		inquiryDataToInsert.email = validatedData.email;
		inquiryDataToInsert.name = validatedData.name || undefined;
	}

	// データベースへ挿入
	const { data: inquiry, error } = await supabase
		.from("inquiries")
		.insert([inquiryDataToInsert])
		.select("id")
		.single();

	if (error) {
		console.error("Supabase error creating inquiry:", error);
		return {
			message: `お問い合わせの送信中にエラーが発生しました。(詳細: ${error.message})`,
			success: false,
		};
	}

	// お問い合わせが正常に作成された後、ファイルをアップロード
	let uploadedFilesCount = 0;
	const attachmentErrors: string[] = [];

	if (
		rawFormData.attachments &&
		rawFormData.attachments.length > 0 &&
		inquiry?.id
	) {
		if (rawFormData.attachments.length > 5) {
			// サーバーサイドでも枚数チェック
			attachmentErrors.push(
				"添付ファイルは最大5枚までです。超過分は処理されませんでした。",
			);
			rawFormData.attachments = rawFormData.attachments.slice(0, 5);
		}

		for (const file of rawFormData.attachments) {
			if (file.size > 5 * 1024 * 1024) {
				// サーバーサイドでもサイズチェック
				attachmentErrors.push(
					`ファイル "${file.name}" はサイズが大きすぎるためアップロードされませんでした。`,
				);
				continue;
			}

			const fileExtension = file.name.split(".").pop() || "webp"; // クライアントでwebpに変換済み想定
			const fileNameInStorage = `${inquiry.id}/${uuidv4()}.${fileExtension}`;

			const { data: uploadData, error: uploadError } = await supabase.storage
				.from("inquiry-attachments") // バケット名
				.upload(fileNameInStorage, file, {
					contentType: file.type, // 'image/webp' など
					cacheControl: "3600",
					upsert: false,
				});

			if (uploadError) {
				console.error(
					`Supabase Storage upload error for ${file.name}:`,
					uploadError,
				);
				attachmentErrors.push(
					`ファイル "${file.name}" のアップロードに失敗しました: ${uploadError.message}`,
				);
				continue; // 次のファイルへ
			}

			const attachmentStoragePath = uploadData.path;

			// inquiry_attachments テーブルに記録
			const { error: attachmentDbError } = await supabase
				.from("inquiry_attachments")
				.insert({
					inquiry_id: inquiry.id,
					file_name: file.name,
					storage_path: attachmentStoragePath,
					mime_type: file.type,
					size: file.size,
				});

			if (attachmentDbError) {
				console.error(
					`Error saving attachment metadata to DB for ${file.name}:`,
					attachmentDbError,
				);
				attachmentErrors.push(
					`ファイル "${file.name}" のメタデータ保存に失敗しました。`,
				);
				// ストレージにはアップロード済みだがDB保存失敗。必要ならロールバック処理など。
			} else {
				uploadedFilesCount++;
			}
		}
	}

	// revalidatePath("/admin/inquiries"); // 必要に応じて関連ページのキャッシュをクリア
	let finalMessage = "お問い合わせが正常に送信されました。";
	if (uploadedFilesCount > 0) {
		finalMessage += ` ${uploadedFilesCount}件のファイルがアップロードされました。`;
	}
	if (attachmentErrors.length > 0) {
		finalMessage += ` いくつかのファイル処理でエラーが発生しました: ${attachmentErrors.join("; ")}`;
	}

	return {
		message: finalMessage,
		success: true,
		inquiryId: inquiry?.id || null,
	};
}

// --- お問い合わせカテゴリ取得アクション ---
export type GetInquiryCategoriesState = {
	categories: InquiryCategoryOption[] | null;
	message: string | null;
	success: boolean;
};

export async function getInquiryCategories(): Promise<GetInquiryCategoriesState> {
	const supabase = await createClient();

	// RLSにより、inquiry_categories は "All users can select inquiry categories" ポリシーで公開されている想定
	const { data, error } = await supabase
		.from("inquiry_categories")
		.select("id, name_ja")
		.order("sort_order", { ascending: true }); // inquiries.sql の sort_order を使用

	if (error) {
		console.error("Supabase error fetching inquiry categories:", error);
		return {
			categories: null,
			message: `お問い合わせカテゴリの取得中にエラーが発生しました。(詳細: ${error.message})`,
			success: false,
		};
	}

	if (!data) {
		return {
			categories: [], // データがない場合は空配列
			message: "お問い合わせカテゴリが見つかりませんでした。",
			success: true, // エラーではないがデータがない状態
		};
	}

	return {
		categories: data as InquiryCategoryOption[], // 型アサーション
		message: "お問い合わせカテゴリを正常に取得しました。",
		success: true,
	};
}

// --- 管理者向けアクション ---

// Supabaseの型エイリアス
type Inquiry = Database["public"]["Tables"]["inquiries"]["Row"];
type InquiryCategory =
	Database["public"]["Tables"]["inquiry_categories"]["Row"];
type InquiryAttachment =
	Database["public"]["Tables"]["inquiry_attachments"]["Row"];

// 一覧取得時の整形後アイテムの型
export type FormattedInquiryListItem = Omit<
	Inquiry,
	| "category_id"
	| "user_id"
	| "body"
	| "page_path"
	| "user_agent"
	| "ip_address"
	| "assigned_admin_id"
	| "updated_at"
> & {
	category_name_ja: string | null;
	// 必要に応じてユーザー情報や担当者情報も追加
};

// 一覧取得時のオプションの型
export type GetAllInquiriesOptions = {
	page?: number;
	limit?: number;
	sortBy?: keyof Inquiry | "category_name_ja"; // ソート可能なキー
	sortOrder?: "asc" | "desc";
	filters?: {
		status?: Inquiry["status"];
		priority?: Inquiry["priority"];
		categoryId?: number;
		searchQuery?: string; // subject や body の部分一致検索用
	};
};

// 一覧取得の戻り値の型
export type AdminInquiriesListState = {
	inquiries: FormattedInquiryListItem[] | null;
	totalCount: number;
	message: string | null;
	success: boolean;
};

export async function getAllInquiries(
	options: GetAllInquiriesOptions = {},
): Promise<AdminInquiriesListState> {
	const supabase = await createClient();
	// RLSにより管理者のみがアクセスできる想定

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

	// ソート: inquiry_categories.name_ja でソートする場合は特殊処理が必要になることがあるが、
	// SupabaseのPostgRESTでは直接JOIN先のカラムでソートできる場合がある。
	// 不可な場合はDBビューや関数を作るか、取得後にクライアントサイドでソート。
	// ここでは直接指定を試みる。
	if (sortBy === "category_name_ja") {
		query = query.order("inquiry_categories(name_ja)", {
			ascending: sortOrder === "asc",
			foreignTable: "inquiry_categories",
		});
	} else {
		query = query.order(sortBy as string, { ascending: sortOrder === "asc" });
	}

	query = query.range(offset, offset + limit - 1);

	// フィルタリング
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
		console.error("Supabase error fetching inquiries for admin:", error);
		return {
			inquiries: null,
			totalCount: 0,
			message: `お問い合わせ一覧の取得中にエラーが発生しました。(詳細: ${error.message})`,
			success: false,
		};
	}

	const formattedInquiries: FormattedInquiryListItem[] =
		data?.map((inq) => ({
			id: inq.id,
			created_at: inq.created_at,
			subject: inq.subject,
			status: inq.status,
			priority: inq.priority,
			email: inq.email,
			name: inq.name,
			category_name_ja:
				(inq.inquiry_categories as unknown as InquiryCategory)?.name_ja || null,
		})) || [];

	return {
		inquiries: formattedInquiries,
		totalCount: count || 0,
		message: "お問い合わせ一覧を正常に取得しました。",
		success: true,
	};
}

// 詳細取得時の整形後アイテムの型
type FormattedInquiryAttachment = InquiryAttachment & {
	public_url: string;
};
type FormattedInquiryDetail = Inquiry & {
	category: Pick<InquiryCategory, "id" | "name_ja" | "name_en"> | null;
	attachments: FormattedInquiryAttachment[];
};

// 詳細取得の戻り値の型
export type AdminInquiryDetailState = {
	inquiry: FormattedInquiryDetail | null;
	message: string | null;
	success: boolean;
};

export async function getInquiryById(
	inquiryId: string,
): Promise<AdminInquiryDetailState> {
	if (!inquiryId) {
		return {
			inquiry: null,
			message: "お問い合わせIDが指定されていません。",
			success: false,
		};
	}
	const supabase = await createClient();

	const { data, error } = await supabase
		.from("inquiries")
		.select(`
      *,
      inquiry_categories ( id, name_ja, name_en ),
      inquiry_attachments ( id, file_name, storage_path, mime_type, size, created_at )
    `)
		.eq("id", inquiryId)
		.single();

	if (error) {
		if (error.code === "PGRST116") {
			// "Searched for one row, but found 0"
			return {
				inquiry: null,
				message: "指定されたお問い合わせは見つかりませんでした。",
				success: false,
			};
		}
		console.error(
			`Supabase error fetching inquiry by ID (${inquiryId}):`,
			error,
		);
		return {
			inquiry: null,
			message: `お問い合わせ詳細の取得中にエラーが発生しました。(詳細: ${error.message})`,
			success: false,
		};
	}

	// 添付ファイルの公開URLを取得
	const attachmentsWithPublicUrl = await Promise.all(
		((data.inquiry_attachments as InquiryAttachment[] | null) || []).map(
			async (attachment) => {
				const { data: urlData } = supabase.storage
					.from("inquiry-attachments") // バケット名を確認
					.getPublicUrl(attachment.storage_path);
				return {
					...attachment,
					public_url: urlData?.publicUrl || "",
				};
			},
		),
	);

	const formattedInquiry: FormattedInquiryDetail = {
		...(data as Inquiry), // キャストで型エラーを抑制
		category:
			(data.inquiry_categories as Pick<
				InquiryCategory,
				"id" | "name_ja" | "name_en"
			> | null) || null,
		attachments: attachmentsWithPublicUrl,
	};

	return {
		inquiry: formattedInquiry,
		message: "お問い合わせ詳細を正常に取得しました。",
		success: true,
	};
}

// お問い合わせ更新用スキーマ
const UpdateInquirySchema = z
	.object({
		status: z
			.enum(["open", "in_progress", "resolved", "closed"] as const)
			.optional(),
		priority: z.preprocess(
			(val) => (val === "" ? null : val), // 空文字列をnullに変換
			z
				.enum(["low", "medium", "high"] as const)
				.optional()
				.nullable(),
		),
		assigned_admin_id: z.preprocess(
			(val) => (val === "" ? null : val), // 空文字列をnullに変換
			z
				.string()
				.uuid("有効な担当者ID (UUID) を入力してください。")
				.optional()
				.nullable(),
		),
		// 必要に応じて他の更新可能なフィールドも追加 (例: internal_notes)
	})
	.refine((data) => Object.values(data).some((val) => val !== undefined), {
		message: "更新する項目が少なくとも1つ必要です。",
	});

export type UpdateInquiryState = {
	message: string | null;
	errors?:
		| z.ZodFormattedError<
				z.infer<typeof UpdateInquirySchema>,
				string
		  >["_errors"]
		| Record<string, string[] | undefined>;
	success: boolean;
	updatedInquiry?: Inquiry | null;
};

export async function updateInquiry(
	inquiryId: string,
	formData: FormData,
): Promise<UpdateInquiryState> {
	const supabase = await createClient();

	const rawData = {
		status: formData.get("status"),
		priority: formData.get("priority"),
		assigned_admin_id: formData.get("assigned_admin_id"),
	};

	const validatedFields = UpdateInquirySchema.safeParse(rawData);

	if (!validatedFields.success) {
		return {
			message: "入力内容に誤りがあります。",
			errors: validatedFields.error.flatten().fieldErrors,
			success: false,
		};
	}

	const { data: updateData } = validatedFields;

	// 空のオブジェクトなら更新しない (refineでチェック済みだが念のため)
	if (Object.keys(updateData).length === 0) {
		return { message: "更新する項目が指定されていません。", success: false };
	}

	const { data: updatedInquiry, error } = await supabase
		.from("inquiries")
		.update({ ...updateData, updated_at: new Date().toISOString() })
		.eq("id", inquiryId)
		.select()
		.single();

	if (error) {
		console.error(`Supabase error updating inquiry (${inquiryId}):`, error);
		return {
			message: `お問い合わせの更新中にエラーが発生しました。(詳細: ${error.message})`,
			success: false,
		};
	}

	// revalidatePath(`/admin/inquiries/${inquiryId}`);
	// revalidatePath(`/admin/inquiries`);
	return {
		message: "お問い合わせ情報を更新しました。",
		success: true,
		updatedInquiry,
	};
}
