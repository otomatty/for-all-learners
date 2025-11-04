// /Users/sugaiakimasa/apps/for-all-learners/app/inquiry/_components/inquiry-form.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { type InquiryFormState, submitInquiry } from "@/app/_actions/inquiries"; // サーバーアクションをインポート
import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"; // Labelを追加
import { LabelBadge } from "@/components/ui/label-badge"; // 作成したLabelBadgeをインポート
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploader } from "./image-uploader"; // 作成したImageUploaderをインポート

// page.tsx から渡されるカテゴリの型
type InquiryCategory = {
	id: number;
	name_ja: string;
};

// フォームの入力スキーマ (サーバーアクションの CreateInquirySchema と整合性を取る)
// サーバーアクションのスキーマを直接インポートできないため、クライアント用に再定義または共有化が必要
// ここではサーバーアクションの定義に合わせて作成
const formSchema = z.object({
	email: z
		.string()
		.email({ message: "無効なメールアドレスです。" })
		.optional()
		.or(z.literal("")),
	name: z.string().optional(), // お名前は任意なので optional のまま
	categoryId: z
		.string()
		.min(1, { message: "お問い合わせカテゴリを選択してください。" }), // 必須に変更
	subject: z.string().min(1, { message: "件名を入力してください。" }),
	body: z.string().min(1, { message: "お問い合わせ内容を入力してください。" }),
	pagePath: z.string().optional(),
	userAgent: z.string().optional(),
	// attachment: z.instanceof(File).optional(), // FormDataで直接扱うため、スキーマバリデーションはサーバー側で行うか、ここでは必須としない
	// または、ファイル名やサイズなどのメタ情報のみをスキーマに含めることもできる
	// 今回はFormDataで直接ファイルを扱うため、ここには含めない
});

type InquiryFormValues = z.infer<typeof formSchema>;

interface InquiryFormProps {
	initialValues: {
		email: string;
		name: string;
	};
	isAuthenticated: boolean;
	categories: InquiryCategory[];
}

const MAX_FILE_SIZE_MB = 1; // 例: 最大5MB
const MAX_FILES_COUNT = 5;
const TARGET_COMPRESSION_SIZE_MB = 1; // Target size after compression

export default function InquiryForm({
	initialValues,
	isAuthenticated,
	categories,
}: InquiryFormProps) {
	const form = useForm<InquiryFormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: initialValues.email,
			name: initialValues.name,
			categoryId: "",
			subject: "",
			body: "",
			pagePath: "",
			userAgent: "",
		},
	});

	const formRef = useRef<HTMLFormElement>(null);
	// ImageUploaderから受け取る処理済みファイルを管理
	const [processedAttachments, setProcessedAttachments] = useState<File[]>([]);

	useEffect(() => {
		// ページパスとユーザーエージェントをフォームに設定
		if (typeof window !== "undefined") {
			form.setValue("pagePath", window.location.pathname);
			form.setValue("userAgent", navigator.userAgent);
		}
	}, [form]);

	// ImageUploaderからのファイル変更をハンドルするコールバック
	const handleProcessedFilesChange = useCallback((files: File[]) => {
		setProcessedAttachments(files);
	}, []);

	// isSubmitting や ImageUploader 内部の isProcessing を考慮して送信ボタンを制御
	const _isUploadingOrProcessing =
		processedAttachments.length > 0 && // そもそもファイルが選択されているか
		form.formState.isSubmitting; // ImageUploaderが処理中かどうかはImageUploader自身が管理

	const isSubmitDisabled = form.formState.isSubmitting; // || isOverallProcessing from ImageUploader if needed

	async function onSubmit(values: InquiryFormValues) {
		const formData = new FormData();
		formData.append("email", values.email || "");
		formData.append("name", values.name || "");
		if (values.categoryId) {
			formData.append("categoryId", values.categoryId);
		}
		formData.append("subject", values.subject);
		formData.append("body", values.body);
		formData.append("pagePath", values.pagePath || "");
		formData.append("userAgent", values.userAgent || "");

		// processedAttachments からファイルを追加
		for (const file of processedAttachments) {
			formData.append("attachments", file, file.name);
		}

		// 認証されていないユーザーでメールアドレスが空の場合のクライアントサイドバリデーション
		if (!isAuthenticated && !values.email) {
			form.setError("email", {
				type: "manual",
				message: "匿名でお問い合わせる場合、メールアドレスを入力してください。",
			});
			toast.error("入力内容に誤りがあります。メールアドレスをご確認ください。");
			return;
		}

		const promise = new Promise<InquiryFormState>((resolve) =>
			submitInquiry(formData).then(resolve),
		);

		toast.promise(promise, {
			loading: "お問い合わせを送信中...",
			success: (data) => {
				if (data.success) {
					form.reset(); // フォームをリセット
					setProcessedAttachments([]); // アップロード済みファイルをクリア
					// ページパスとUAを再設定
					if (typeof window !== "undefined") {
						form.setValue("pagePath", window.location.pathname);
						form.setValue("userAgent", navigator.userAgent);
					}
					if (initialValues.email) form.setValue("email", initialValues.email);
					if (initialValues.name) form.setValue("name", initialValues.name);

					return data.message || "お問い合わせが正常に送信されました。";
				}
				// サーバーからのフィールドエラーをフォームに反映
				if (data.errors) {
					for (const [key, value] of Object.entries(data.errors)) {
						if (value && value.length > 0) {
							form.setError(key as keyof InquiryFormValues, {
								type: "server",
								message: value.join(", "),
							});
						}
					}
				}
				// General error も表示
				if (data.errors?.general) {
					throw new Error(data.errors.general.join(", "));
				}
				throw new Error(data.message || "送信に失敗しました。");
			},
			error: (err) => {
				return (
					err.message || "お問い合わせの送信中に予期せぬエラーが発生しました。"
				);
			},
		});
	}

	return (
		<Form {...form}>
			<form
				ref={formRef}
				onSubmit={form.handleSubmit(onSubmit)}
				className="space-y-6"
			>
				<FormField
					control={form.control}
					name="email"
					render={({ field }) => (
						<FormItem>
							<FormLabel>
								メールアドレス
								{isAuthenticated ? (
									<span className="ml-1.5 text-xs text-muted-foreground">
										(自動入力)
									</span>
								) : (
									<LabelBadge variant="required">必須</LabelBadge>
								)}
							</FormLabel>
							<FormControl>
								<Input
									placeholder="your@email.com"
									{...field}
									disabled={isAuthenticated && !!initialValues.email} // 認証済みで初期値があれば編集不可にする場合
								/>
							</FormControl>
							<FormDescription>
								{isAuthenticated
									? "認証済みのため、登録メールアドレスが自動入力されています。"
									: "返信が必要な場合は、必ずご入力ください。"}
							</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="name"
					render={({ field }) => (
						<FormItem>
							<FormLabel>
								お名前
								{isAuthenticated && initialValues.name ? (
									<span className="ml-1.5 text-xs text-muted-foreground">
										(自動入力)
									</span>
								) : (
									// 任意の場合はLabelBadgeを使用
									<LabelBadge variant="optional">任意</LabelBadge>
								)}
							</FormLabel>
							<FormControl>
								<Input placeholder="山田 太郎" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				{categories && categories.length > 0 && (
					<FormField
						control={form.control}
						name="categoryId"
						render={({ field }) => (
							<FormItem>
								<FormLabel>
									お問い合わせカテゴリ
									<LabelBadge variant="required">必須</LabelBadge>
								</FormLabel>
								<Select
									onValueChange={field.onChange}
									defaultValue={field.value}
								>
									<FormControl>
										<SelectTrigger>
											<SelectValue placeholder="カテゴリを選択してください" />
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										{categories.map((category) => (
											<SelectItem key={category.id} value={String(category.id)}>
												{category.name_ja}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<FormMessage />
							</FormItem>
						)}
					/>
				)}

				<FormField
					control={form.control}
					name="subject"
					render={({ field }) => (
						<FormItem>
							<FormLabel>
								件名
								<LabelBadge variant="required">必須</LabelBadge>
							</FormLabel>
							<FormControl>
								<Input placeholder="例: 〇〇機能について" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="body"
					render={({ field }) => (
						<FormItem>
							<FormLabel>
								お問い合わせ内容
								<LabelBadge variant="required">必須</LabelBadge>
							</FormLabel>
							<FormControl>
								<Textarea
									placeholder="お問い合わせの詳細を具体的にご記入ください。"
									className="min-h-[120px]"
									{...field}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* ファイル添付フィールド */}
				<div className="space-y-2">
					<Label htmlFor="attachments">
						スクリーンショットなど
						<LabelBadge variant="optional">任意</LabelBadge>
						<span className="ml-2 text-xs text-muted-foreground">
							(画像のみ、最大{MAX_FILES_COUNT}枚、各{MAX_FILE_SIZE_MB}MBまで)
						</span>
					</Label>
					<ImageUploader
						maxFiles={MAX_FILES_COUNT}
						maxFileSizeMB={MAX_FILE_SIZE_MB}
						targetCompressionSizeMB={TARGET_COMPRESSION_SIZE_MB}
						onFilesChange={handleProcessedFilesChange}
						disabled={form.formState.isSubmitting} // フォーム送信中は操作不可
					/>
				</div>

				{/* 隠しフィールドは react-hook-form の管理下にあり、useEffectで値が設定される */}
				<Button
					type="submit"
					disabled={
						isSubmitDisabled // ImageUploader内の処理中も考慮する場合は、ImageUploaderからisProcessing状態を受け取る必要がある
					}
				>
					{form.formState.isSubmitting ? "送信中..." : "送信する"}
				</Button>
			</form>
		</Form>
	);
}
