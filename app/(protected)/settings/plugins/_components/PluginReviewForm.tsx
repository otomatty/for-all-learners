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
 *   ├─ hooks/plugins/usePluginReviews.ts
 *   ├─ components/ui/button.tsx
 *   ├─ components/ui/textarea.tsx
 *   ├─ components/ui/input.tsx
 *   └─ sonner (toast)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/implementation-status.md
 */

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	useDeleteReview,
	useGetUserReview,
	useSubmitReview,
} from "@/hooks/plugins/usePluginReviews";

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
	const [isEditing, setIsEditing] = useState(false);

	const { data: existingReview, isLoading } = useGetUserReview(pluginId);
	const submitReviewMutation = useSubmitReview();
	const deleteReviewMutation = useDeleteReview();

	const existingReviewId = existingReview?.id || null;

	// Load user's existing review into form
	useEffect(() => {
		if (existingReview) {
			setTitle(existingReview.title || "");
			setContent(existingReview.content);
			setIsEditing(false);
		} else {
			setTitle("");
			setContent("");
		}
	}, [existingReview]);

	const handleSubmit = async () => {
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

		try {
			await submitReviewMutation.mutateAsync({
				pluginId,
				content: content.trim(),
				title: title.trim() || null,
			});
			setIsEditing(false);
			toast.success("レビューを投稿しました");
			onReviewSubmitted?.();
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "レビューの投稿に失敗しました",
			);
		}
	};

	const handleDelete = async () => {
		if (!existingReviewId) {
			return;
		}

		try {
			await deleteReviewMutation.mutateAsync(existingReviewId);
			setTitle("");
			setContent("");
			setIsEditing(false);
			toast.success("レビューを削除しました");
			onReviewSubmitted?.();
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "レビューの削除に失敗しました",
			);
		}
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
						disabled={deleteReviewMutation.isPending}
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
					disabled={submitReviewMutation.isPending}
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
					disabled={submitReviewMutation.isPending}
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
					disabled={submitReviewMutation.isPending || !content.trim()}
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
							// Reset form to original review
							if (existingReview) {
								setTitle(existingReview.title || "");
								setContent(existingReview.content);
							}
						}}
						disabled={submitReviewMutation.isPending}
					>
						キャンセル
					</Button>
				)}
			</div>
		</div>
	);
}
