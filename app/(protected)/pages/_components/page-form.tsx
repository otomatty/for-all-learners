"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

interface PageFormProps {
	userId: string;
}

export function PageForm({ userId }: PageFormProps) {
	const router = useRouter();
	const supabase = createClient();
	const [title, setTitle] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setIsLoading(true);

		try {
			const name = title.trim();
			if (!name) {
				throw new Error("ページ名を入力してください");
			}

			// Default empty Tiptap document
			const content = {
				type: "doc",
				content: [],
			} as unknown as Database["public"]["Tables"]["pages"]["Row"]["content_tiptap"];
			const { data, error } = await supabase
				.from("pages")
				.insert({
					user_id: userId,
					title: name,
					content_tiptap: content,
					is_public: false,
				})
				.select();

			if (error) throw error;
			if (!data || data.length === 0)
				throw new Error("ページの作成に失敗しました");

			toast.success("ページを作成しました");
			// Navigate to new page using title as slug
			router.push(`/pages/${encodeURIComponent(name)}`);
		} catch (err) {
			console.error("PageForm error:", err);
			let message = "ページの作成中にエラーが発生しました";
			if (err instanceof Error && err.message) message = err.message;
			toast.error(message);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<form onSubmit={handleSubmit}>
			<Card>
				<CardContent className="pt-6 space-y-4">
					<div className="space-y-2">
						<Label htmlFor="page-title">ページ名</Label>
						<Input
							id="page-title"
							placeholder="ページ名を入力"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							required
						/>
					</div>
				</CardContent>
				<CardFooter className="flex justify-between">
					<Button variant="outline" type="button" onClick={() => router.back()}>
						キャンセル
					</Button>
					<Button type="submit" disabled={isLoading}>
						{isLoading ? "作成中..." : "ページを作成"}
					</Button>
				</CardFooter>
			</Card>
		</form>
	);
}
