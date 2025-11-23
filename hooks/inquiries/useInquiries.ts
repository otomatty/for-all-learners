"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";
import type { InquiryCategoryOption } from "@/types/inquiry-types";

type Inquiry = Database["public"]["Tables"]["inquiries"]["Row"];
type InquiryCategory =
	Database["public"]["Tables"]["inquiry_categories"]["Row"];
type InquiryAttachment =
	Database["public"]["Tables"]["inquiry_attachments"]["Row"];

// お問い合わせフォームの入力スキーマ定義
const CreateInquirySchema = z.object({
	email: z
		.string()
		.email("無効なメールアドレスです。")
		.optional()
		.or(z.literal("")),
	name: z.string().optional(),
	categoryId: z
		.preprocess((val) => {
			if (val === null || val === undefined || val === "") {
				return undefined;
			}
			return Number(val);
		}, z
			.number()
			.int("カテゴリIDは整数である必要があります。")
			.positive("カテゴリを選択してください。")
			.optional())
		.optional(),
	subject: z.string().min(1, "件名を入力してください。"),
	body: z.string().min(1, "お問い合わせ内容を入力してください。"),
	pagePath: z.string().optional(),
	userAgent: z.string().optional(),
});

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
		general?: string[];
	};
	success: boolean;
	inquiryId?: string | null;
};

export type GetInquiryCategoriesState = {
	categories: InquiryCategoryOption[] | null;
	message: string | null;
	success: boolean;
};

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
};

export type GetAllInquiriesOptions = {
	page?: number;
	limit?: number;
	sortBy?: keyof Inquiry | "category_name_ja";
	sortOrder?: "asc" | "desc";
	filters?: {
		status?: Inquiry["status"];
		priority?: Inquiry["priority"];
		categoryId?: number;
		searchQuery?: string;
	};
};

export type AdminInquiriesListState = {
	inquiries: FormattedInquiryListItem[] | null;
	totalCount: number;
	message: string | null;
	success: boolean;
};

type FormattedInquiryAttachment = InquiryAttachment & {
	public_url: string;
};

export type FormattedInquiryDetail = Inquiry & {
	category: Pick<InquiryCategory, "id" | "name_ja" | "name_en"> | null;
	attachments: FormattedInquiryAttachment[];
};

export type AdminInquiryDetailState = {
	inquiry: FormattedInquiryDetail | null;
	message: string | null;
	success: boolean;
};

const UpdateInquirySchema = z
	.object({
		status: z
			.enum(["open", "in_progress", "resolved", "closed"] as const)
			.optional(),
		priority: z.preprocess(
			(val) => (val === "" ? null : val),
			z
				.enum(["low", "medium", "high"] as const)
				.optional()
				.nullable(),
		),
		assigned_admin_id: z.preprocess(
			(val) => (val === "" ? null : val),
			z
				.string()
				.uuid("有効な担当者ID (UUID) を入力してください。")
				.optional()
				.nullable(),
		),
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

/**
 * Hook for submitting inquiry
 */
export function useSubmitInquiry() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			formData,
			attachments = [],
		}: {
			formData: FormData;
			attachments?: File[];
		}): Promise<InquiryFormState> => {
			// FormDataからデータを抽出
			const getFormValue = (key: string): string | undefined => {
				const value = formData.get(key);
				return value === null ? undefined : (value as string);
			};

			const rawFormData = {
				email: getFormValue("email"),
				name: getFormValue("name"),
				categoryId: getFormValue("categoryId"),
				subject: getFormValue("subject"),
				body: getFormValue("body"),
				pagePath: getFormValue("pagePath"),
				userAgent: getFormValue("userAgent"),
				attachments,
			};

			// 入力データのバリデーション
			const validatedFields = CreateInquirySchema.safeParse(rawFormData);

			if (!validatedFields.success) {
				return {
					message: `入力内容に誤りがあります。件名、お問い合わせ内容は必須です。${
						rawFormData.attachments.some((file) => file.size > 5 * 1024 * 1024)
							? " 添付ファイルの中にサイズが大きすぎるものがあります。"
							: rawFormData.attachments.length > 5
								? " 添付ファイルは最大5枚までです。"
								: ""
					}`,
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
			} = {
				subject: validatedData.subject,
				body: validatedData.body,
				category_id: validatedData.categoryId,
				page_path: validatedData.pagePath || undefined,
				user_agent: validatedData.userAgent || undefined,
			};

			if (user) {
				inquiryDataToInsert.user_id = user.id;
				inquiryDataToInsert.email =
					validatedData.email || user.email || undefined;
				inquiryDataToInsert.name =
					validatedData.name ||
					user.user_metadata?.full_name ||
					user.user_metadata?.name ||
					undefined;
			} else {
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
				inquiryDataToInsert.name = validatedData.name;
			}

			// データベースへ挿入
			const { data: inquiry, error } = await supabase
				.from("inquiries")
				.insert([inquiryDataToInsert])
				.select("id")
				.single();

			if (error) {
				return {
					message: `お問い合わせの送信中にエラーが発生しました。(詳細: ${error.message})`,
					success: false,
				};
			}

			// ファイルをアップロード
			let uploadedFilesCount = 0;
			const attachmentErrors: string[] = [];

			if (
				rawFormData.attachments &&
				rawFormData.attachments.length > 0 &&
				inquiry?.id
			) {
				if (rawFormData.attachments.length > 5) {
					attachmentErrors.push(
						"添付ファイルは最大5枚までです。超過分は処理されませんでした。",
					);
					rawFormData.attachments = rawFormData.attachments.slice(0, 5);
				}

				for (const file of rawFormData.attachments) {
					if (file.size > 5 * 1024 * 1024) {
						attachmentErrors.push(
							`ファイル "${file.name}" はサイズが大きすぎるためアップロードされませんでした。`,
						);
						continue;
					}

					const fileExtension = file.name.split(".").pop() || "webp";
					const fileNameInStorage = `${inquiry.id}/${uuidv4()}.${fileExtension}`;

					const { data: uploadData, error: uploadError } =
						await supabase.storage
							.from("inquiry-attachments")
							.upload(fileNameInStorage, file, {
								contentType: file.type,
								cacheControl: "3600",
								upsert: false,
							});

					if (uploadError) {
						attachmentErrors.push(
							`ファイル "${file.name}" のアップロードに失敗しました: ${uploadError.message}`,
						);
						continue;
					}

					const attachmentStoragePath = uploadData.path;

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
						attachmentErrors.push(
							`ファイル "${file.name}" のメタデータ保存に失敗しました。`,
						);
					} else {
						uploadedFilesCount++;
					}
				}
			}

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
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["inquiries"] });
		},
	});
}

/**
 * Hook for fetching inquiry categories
 */
export function useInquiryCategories() {
	const supabase = createClient();

	return useQuery({
		queryKey: ["inquiry_categories"],
		queryFn: async (): Promise<GetInquiryCategoriesState> => {
			const { data, error } = await supabase
				.from("inquiry_categories")
				.select("id, name_ja")
				.order("sort_order", { ascending: true });

			if (error) {
				return {
					categories: null,
					message: `お問い合わせカテゴリの取得中にエラーが発生しました。(詳細: ${error.message})`,
					success: false,
				};
			}

			if (!data) {
				return {
					categories: [],
					message: "お問い合わせカテゴリが見つかりませんでした。",
					success: true,
				};
			}

			return {
				categories: data as InquiryCategoryOption[],
				message: "お問い合わせカテゴリを正常に取得しました。",
				success: true,
			};
		},
	});
}

/**
 * Hook for fetching all inquiries (admin only)
 */
export function useAllInquiries(options: GetAllInquiriesOptions = {}) {
	const supabase = createClient();

	const {
		page = 1,
		limit = 20,
		sortBy = "created_at",
		sortOrder = "desc",
		filters = {},
	} = options;
	const offset = (page - 1) * limit;

	return useQuery({
		queryKey: ["all_inquiries", options],
		queryFn: async (): Promise<AdminInquiriesListState> => {
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
						(inq.inquiry_categories as unknown as InquiryCategory)?.name_ja ||
						null,
				})) || [];

			return {
				inquiries: formattedInquiries,
				totalCount: count || 0,
				message: "お問い合わせ一覧を正常に取得しました。",
				success: true,
			};
		},
	});
}

/**
 * Hook for fetching inquiry by ID (admin only)
 */
export function useInquiryById(inquiryId: string) {
	const supabase = createClient();

	return useQuery({
		queryKey: ["inquiry", inquiryId],
		queryFn: async (): Promise<AdminInquiryDetailState> => {
			if (!inquiryId) {
				return {
					inquiry: null,
					message: "お問い合わせIDが指定されていません。",
					success: false,
				};
			}

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
					return {
						inquiry: null,
						message: "指定されたお問い合わせは見つかりませんでした。",
						success: false,
					};
				}
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
							.from("inquiry-attachments")
							.getPublicUrl(attachment.storage_path);
						return {
							...attachment,
							public_url: urlData?.publicUrl || "",
						};
					},
				),
			);

			const formattedInquiry: FormattedInquiryDetail = {
				...(data as Inquiry),
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
		},
		enabled: !!inquiryId,
	});
}

/**
 * Hook for updating inquiry (admin only)
 */
export function useUpdateInquiry() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			inquiryId,
			formData,
		}: {
			inquiryId: string;
			formData: FormData;
		}): Promise<UpdateInquiryState> => {
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

			if (Object.keys(updateData).length === 0) {
				return {
					message: "更新する項目が指定されていません。",
					success: false,
				};
			}

			const { data: updatedInquiry, error } = await supabase
				.from("inquiries")
				.update({ ...updateData, updated_at: new Date().toISOString() })
				.eq("id", inquiryId)
				.select()
				.single();

			if (error) {
				return {
					message: `お問い合わせの更新中にエラーが発生しました。(詳細: ${error.message})`,
					success: false,
				};
			}

			return {
				message: "お問い合わせ情報を更新しました。",
				success: true,
				updatedInquiry,
			};
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["inquiries"] });
			queryClient.invalidateQueries({ queryKey: ["all_inquiries"] });
		},
	});
}
