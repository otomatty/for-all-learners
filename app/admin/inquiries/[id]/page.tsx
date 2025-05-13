import { getInquiryById } from "@/app/_actions/inquiries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Database } from "@/types/database.types";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export async function generateMetadata({
	params,
}: {
	params: { id: string };
}) {
	const { id } = params;
	// 動的にメタデータを設定することも可能
	// const result = await getInquiryById(params.id);
	// if (result.success && result.inquiry) {
	//   return { title: `お問い合わせ: ${result.inquiry.subject} | 管理者ダッシュボード` };
	// }
	return { title: `お問い合わせ詳細: ${id} | 管理者ダッシュボード` };
}

function InquiryDetailItem({
	label,
	value,
}: {
	label: string;
	value: React.ReactNode;
}) {
	return (
		<div className="grid grid-cols-3 gap-2 py-2 border-b last:border-b-0">
			<dt className="font-medium text-muted-foreground">{label}</dt>
			<dd className="col-span-2">{value || "-"}</dd>
		</div>
	);
}

export default async function AdminInquiryDetailPage({
	params,
}: {
	params: { id: string };
}) {
	const { id } = params;
	const result = await getInquiryById(id);

	if (!result.success || !result.inquiry) {
		if (result.message === "指定されたお問い合わせは見つかりませんでした。") {
			notFound(); // 404ページを表示
		}
		return (
			<div className="container mx-auto py-8 px-4 md:px-6 text-center">
				<p className="text-destructive">
					{result.message || "データの取得に失敗しました。"}
				</p>
				<Button asChild variant="outline" className="mt-4">
					<Link href="/admin/inquiries">お問い合わせ一覧へ戻る</Link>
				</Button>
			</div>
		);
	}

	const inquiry = result.inquiry;

	type InquiryStatus = Database["public"]["Enums"]["inquiry_status_enum"];
	type InquiryPriority = Database["public"]["Enums"]["inquiry_priority_enum"];

	const statusMap: Record<
		InquiryStatus,
		{
			label: string;
			variant:
				| "default" // Badgeが受け付ける型に合わせる
				| "secondary"
				| "destructive"
				| "outline";
		}
	> = {
		open: { label: "未対応", variant: "destructive" }, // "warning" から変更 (例: destructive)
		in_progress: { label: "対応中", variant: "default" },
		resolved: { label: "対応済み", variant: "default" }, // "success" から変更 (例: default)
		closed: { label: "クローズ", variant: "secondary" },
	};

	const priorityMap: Record<
		InquiryPriority,
		{
			label: string;
			variant: "default" | "secondary" | "destructive" | "outline"; // "warning" を削除
		}
	> = {
		low: { label: "低", variant: "secondary" },
		medium: { label: "中", variant: "default" },
		high: { label: "高", variant: "destructive" },
	};

	return (
		<div className="container mx-auto py-8 px-4 md:px-6">
			<div className="mb-6">
				<Button asChild variant="outline" size="sm">
					<Link href="/admin/inquiries">
						<ArrowLeftIcon className="mr-2 h-4 w-4" />
						お問い合わせ一覧へ戻る
					</Link>
				</Button>
			</div>

			<Card>
				<CardHeader>
					<div className="flex justify-between items-start">
						<div>
							<CardTitle className="mb-1">
								お問い合わせ詳細: #{inquiry.id}
							</CardTitle>
							<p className="text-lg font-semibold">{inquiry.subject}</p>
						</div>
						<div className="flex gap-2">
							{inquiry.status && statusMap[inquiry.status] && (
								<Badge variant={statusMap[inquiry.status].variant}>
									{statusMap[inquiry.status].label}
								</Badge>
							)}
							{inquiry.priority && priorityMap[inquiry.priority] && (
								<Badge variant={priorityMap[inquiry.priority].variant}>
									{priorityMap[inquiry.priority].label}
								</Badge>
							)}
						</div>
					</div>
				</CardHeader>
				<CardContent className="space-y-6">
					<dl>
						<InquiryDetailItem label="送信者名" value={inquiry.name} />
						<InquiryDetailItem label="メールアドレス" value={inquiry.email} />
						<InquiryDetailItem
							label="カテゴリ"
							value={inquiry.category?.name_ja}
						/>
						<InquiryDetailItem
							label="受付日時"
							value={
								inquiry.created_at
									? new Date(inquiry.created_at).toLocaleString("ja-JP")
									: "-"
							}
						/>
						{inquiry.updated_at && (
							<InquiryDetailItem
								label="最終更新日時"
								value={new Date(inquiry.updated_at).toLocaleString("ja-JP")}
							/>
						)}
					</dl>

					<div>
						<h3 className="text-md font-semibold mb-2 text-muted-foreground">
							メッセージ本文
						</h3>
						<div className="p-4 border rounded-md bg-muted/50 whitespace-pre-wrap">
							{inquiry.body}
						</div>
					</div>

					{inquiry.attachments && inquiry.attachments.length > 0 && (
						<div>
							<h3 className="text-md font-semibold mb-2 text-muted-foreground">
								添付ファイル
							</h3>
							<ul className="list-disc pl-5 space-y-1">
								{inquiry.attachments.map((file) => (
									<li key={file.id}>
										<a
											href={file.public_url}
											target="_blank"
											rel="noopener noreferrer"
											className="text-blue-600 hover:underline"
										>
											{file.file_name}
										</a>
										<span className="text-xs text-muted-foreground ml-2">
											({(file.size / 1024).toFixed(1)} KB)
										</span>
									</li>
								))}
							</ul>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
