/**
 * DeckForm Component
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   ├─ app/(protected)/dashboard/_components/GoalSummary/GoalDeckSection/MobileDecksList.tsx
 *   ├─ app/(protected)/decks/[deckId]/_components/ActionMenu.tsx
 *   ├─ app/(protected)/dashboard/_components/GoalSummary/GoalDeckSection/decks-table.tsx
 *   └─ app/(protected)/decks/_components/create-deck-dialog-button.tsx
 *
 * Dependencies (External files that this file imports):
 *   ├─ @/components/ui/button
 *   ├─ @/components/ui/input
 *   ├─ @/components/ui/label
 *   ├─ @/components/ui/switch
 *   ├─ @/components/ui/textarea
 *   ├─ @/hooks/decks (useCreateDeck, useUpdateDeck)
 *   └─ @/lib/supabase/client
 */

"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useCreateDeck, useUpdateDeck } from "@/hooks/decks";
import { createClient } from "@/lib/supabase/client";

interface DeckFormProps {
	userId: string;
	// If deckId is provided, the form will update an existing deck
	deckId?: string;
	// Initial values for editing
	initialTitle?: string;
	initialDescription?: string;
	initialIsPublic?: boolean;
	onSuccess?: () => void;
}

export function DeckForm({
	userId,
	deckId,
	initialTitle,
	initialDescription,
	initialIsPublic = false,
	onSuccess,
}: DeckFormProps) {
	const router = useRouter();
	const _supabase = createClient();
	const titleId = useId();
	const descriptionId = useId();
	const isPublicId = useId();
	// Initialize form state (use initial values for edit)
	const [title, setTitle] = useState(initialTitle ?? "");
	const [description, setDescription] = useState(initialDescription ?? "");
	const [isPublic, setIsPublic] = useState(initialIsPublic);

	const updateDeckMutation = useUpdateDeck();
	const createDeckMutation = useCreateDeck();

	const isLoading =
		updateDeckMutation.isPending || createDeckMutation.isPending;

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		try {
			if (!title.trim()) {
				throw new Error("タイトルを入力してください");
			}

			if (deckId) {
				// 更新: カスタムフックを利用
				await updateDeckMutation.mutateAsync({
					id: deckId,
					updates: { title, description, is_public: isPublic },
				});
				toast.success("デッキ情報を更新しました");
				onSuccess?.();
			} else {
				// 作成: カスタムフックを利用
				const newDeck = await createDeckMutation.mutateAsync({
					user_id: userId,
					title,
					description,
					is_public: isPublic,
				});
				toast.success("デッキを作成しました");
				onSuccess?.();
				router.push(`/decks/${newDeck.id}`);
			}
		} catch (err) {
			// Determine user-friendly message
			let message = "デッキの作成中にエラーが発生しました。";
			if (err instanceof Error && err.message) {
				message = err.message;
			} else if (typeof err === "object" && err !== null) {
				// Supabase error shape
				const supaErr = err as { message?: string };
				if (supaErr.message) message = supaErr.message;
			}
			toast.error(message);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div className="space-y-2">
				<Label htmlFor={titleId}>タイトル</Label>
				<Input
					id={titleId}
					placeholder="デッキのタイトルを入力"
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					required
				/>
			</div>
			<div className="space-y-2">
				<Label htmlFor={descriptionId}>説明</Label>
				<Textarea
					id={descriptionId}
					placeholder="デッキの説明を入力（任意）"
					value={description}
					onChange={(e) => setDescription(e.target.value)}
					rows={4}
				/>
			</div>
			<div className="flex items-center space-x-2">
				<Switch
					id={isPublicId}
					checked={isPublic}
					onCheckedChange={setIsPublic}
				/>
				<Label htmlFor={isPublicId}>公開する</Label>
			</div>
			<Button
				type="button"
				variant="outline"
				onClick={() => router.push("/decks")}
			>
				キャンセル
			</Button>
			<Button type="submit" disabled={isLoading}>
				{isLoading ? "作成中..." : "デッキを作成"}
			</Button>
		</form>
	);
}
