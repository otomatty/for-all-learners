"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { updateDeck } from "@/app/_actions/decks";
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
	const supabase = createClient();
	const [isLoading, setIsLoading] = useState(false);
	// Initialize form state (use initial values for edit)
	const [title, setTitle] = useState(initialTitle ?? "");
	const [description, setDescription] = useState(initialDescription ?? "");
	const [isPublic, setIsPublic] = useState(initialIsPublic);

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setIsLoading(true);

		try {
			if (!title.trim()) {
				throw new Error("タイトルを入力してください");
			}

			if (deckId) {
				// 更新: サーバーアクションを利用
				await updateDeck(deckId, { title, description, is_public: isPublic });
				toast.success("デッキ情報を更新しました");
				onSuccess?.();
				router.refresh();
			} else {
				// 作成: 型付けしたSupabaseコール
				const { data, error } = await supabase
					.from("decks")
					.insert({ user_id: userId, title, description, is_public: isPublic })
					.select();
				if (error) throw error;
				toast.success("デッキを作成しました");
				onSuccess?.();
				router.push(`/decks/${data[0].id}`);
			}
		} catch (err) {
			// Log detailed error for debugging
			console.error("DeckForm handleSubmit error:", err);
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
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div className="space-y-2">
				<Label htmlFor="title">タイトル</Label>
				<Input
					id="title"
					placeholder="デッキのタイトルを入力"
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					required
				/>
			</div>
			<div className="space-y-2">
				<Label htmlFor="description">説明</Label>
				<Textarea
					id="description"
					placeholder="デッキの説明を入力（任意）"
					value={description}
					onChange={(e) => setDescription(e.target.value)}
					rows={4}
				/>
			</div>
			<div className="flex items-center space-x-2">
				<Switch
					id="is-public"
					checked={isPublic}
					onCheckedChange={setIsPublic}
				/>
				<Label htmlFor="is-public">公開する</Label>
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
