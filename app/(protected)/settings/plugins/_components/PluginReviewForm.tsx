"use client";

/**
 * Plugin Review Form Component
 *
 * Allows users to submit or update their review for a plugin.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ app/(protected)/settings/plugins/_components/PluginDetails.tsx
 *
 * Dependencies:
 *   ├─ app/_actions/plugin-ratings-reviews.ts
 *   ├─ components/ui/button.tsx
 *   ├─ components/ui/textarea.tsx
 *   ├─ components/ui/input.tsx
 *   └─ sonner (toast)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/implementation-status.md
 */

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
	deletePluginReview,
	getUserReview,
	submitPluginReview,
} from "@/app/_actions/plugin-ratings-reviews";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface PluginReviewFormProps {
	/**
	 * Plugin ID
	 */
	pluginId: string;

	/**
	 * Callback when review is successfully submitted
	 */
	onReviewSubmitted?: () => void;
}

export function PluginReviewForm({
	pluginId,
	onReviewSubmitted,
}: PluginReviewFormProps) {
	const [title, setTitle] = useState("");
	const [content, setContent] = useState("");
	const [existingReviewId, setExistingReviewId] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();
	const [isLoading, setIsLoading] = useState(true);
	const [isEditing, setIsEditing] = useState(false);

	// Load user's existing review
	useEffect(() => {
		async function loadUserReview() {
			try {
				const existingReview = await getUserReview(pluginId);
				if (existingReview) {
					setTitle(existingReview.title || "");
					setContent(existingReview.content);
					setExistingReviewId(existingReview.id);
					setIsEditing(false);
				}
			} catch (_error) {
			} finally {
				setIsLoading(false);
			}
		}

		loadUserReview();
	}, [pluginId]);

	const handleSubmit = () => {
		if (!content.trim()) {
			toast.error("レビュー内容を入力してください");
			return;
		}

		if (content.length > 5000) {
			toast.error("レビュー内容は5000文字以内で入力してください");
			return;
		}

		if (title && title.length > 200) {
			toast.error("タイトルは200文字以内で入力してください");
			return;
		}

		startTransition(async () => {
			try {
				const result = await submitPluginReview(
					pluginId,
					content.trim(),
					title.trim() || null,
				);
				if (result.success) {
					if (result.reviewId) {
						setExistingReviewId(result.reviewId);
					}
					setIsEditing(false);
					toast.success("レビューを投稿しました");
					onReviewSubmitted?.();
				} else {
					toast.error(result.error || "レビューの投稿に失敗しました");
				}
			} catch (error) {
				toast.error(
					error instanceof Error
						? error.message
						: "レビューの投稿に失敗しました",
				);
			}
		});
	};

	const handleDelete = () => {
		if (!existingReviewId) {
			return;
		}

		startTransition(async () => {
			try {
				const result = await deletePluginReview(existingReviewId);
				if (result.success) {
					setTitle("");
					setContent("");
					setExistingReviewId(null);
					setIsEditing(false);
					toast.success("レビューを削除しました");
					onReviewSubmitted?.();
				} else {
					toast.error(result.error || "レビューの削除に失敗しました");
				}
			} catch (error) {
				toast.error(
					error instanceof Error
						? error.message
						: "レビューの削除に失敗しました",
				);
			}
		});
	};

	if (isLoading) {
		return (
			<div className="flex items-center gap-2 text-sm text-muted-foreground">
				読み込み中...
			</div>
		);
	}

	// Show existing review if not editing
	if (existingReviewId && !isEditing) {
		return (
			<div className="space-y-4 rounded-lg border p-4">
				<div className="flex items-start justify-between">
					<div className="flex-1">
						{title && <h4 className="font-semibold text-sm mb-2">{title}</h4>}
						<p className="text-sm text-muted-foreground whitespace-pre-wrap">
							{content}
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={() => setIsEditing(true)}
					>
						編集
					</Button>
					<Button
						type="button"
						size="sm"
						variant="destructive"
						onClick={handleDelete}
						disabled={isPending}
					>
						削除
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-4 rounded-lg border p-4">
			<div className="space-y-2">
				<Label htmlFor="review-title">タイトル（任意）</Label>
				<Input
					id="review-title"
					placeholder="レビューのタイトルを入力..."
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					maxLength={200}
					disabled={isPending}
				/>
				<p className="text-xs text-muted-foreground">{title.length}/200文字</p>
			</div>

			<div className="space-y-2">
				<Label htmlFor="review-content">レビュー内容</Label>
				<Textarea
					id="review-content"
					placeholder="このプラグインについてのレビューを入力してください..."
					value={content}
					onChange={(e) => setContent(e.target.value)}
					maxLength={5000}
					rows={6}
					disabled={isPending}
				/>
				<p className="text-xs text-muted-foreground">
					{content.length}/5000文字
				</p>
			</div>

			<div className="flex items-center gap-2">
				<Button
					type="button"
					size="sm"
					onClick={handleSubmit}
					disabled={isPending || !content.trim()}
				>
					{existingReviewId ? "レビューを更新" : "レビューを投稿"}
				</Button>

				{existingReviewId && (
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={() => {
							setIsEditing(false);
							// Reload original review
							getUserReview(pluginId).then((review) => {
								if (review) {
									setTitle(review.title || "");
									setContent(review.content);
								}
							});
						}}
						disabled={isPending}
					>
						キャンセル
					</Button>
				)}
			</div>
		</div>
	);
}
