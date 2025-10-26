"use client";

/**
 * Create Page Card Component
 * Displays a card for creating a new page from an undefined link
 */

import { PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

interface CreatePageCardProps {
	displayText: string;
	linkGroupId: string;
	noteSlug?: string;
}

export function CreatePageCard({
	displayText,
	linkGroupId,
	noteSlug,
}: CreatePageCardProps) {
	const router = useRouter();

	const handleClick = async () => {
		const supabase = createClient();

		// Authentication check
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();
		if (authError || !user) {
			toast.error("ログインしてください");
			return;
		}

		// 1. Create page
		const { data: page, error: insertError } = await supabase
			.from("pages")
			.insert({
				user_id: user.id,
				title: displayText,
				content_tiptap: { type: "doc", content: [] },
				is_public: false,
			})
			.select("id")
			.single();

		if (insertError || !page) {
			toast.error("ページ作成に失敗しました");
			return;
		}

		// 2. Update link_groups.page_id
		const { error: updateError } = await supabase
			.from("link_groups")
			.update({ page_id: page.id })
			.eq("id", linkGroupId);

		if (updateError) {
			// Error but page was created, so continue
		}

		// 3. Link to note if noteSlug exists
		if (noteSlug) {
			const { data: note } = await supabase
				.from("notes")
				.select("id")
				.eq("slug", noteSlug)
				.single();

			if (note) {
				await supabase
					.from("note_page_links")
					.insert({ note_id: note.id, page_id: page.id });
			}
		}

		// 4. Redirect to new page
		const redirectUrl = noteSlug
			? `/notes/${encodeURIComponent(noteSlug)}/${page.id}?newPage=true`
			: `/pages/${page.id}?newPage=true`;

		toast.success("ページを作成しました");
		router.push(redirectUrl);
	};

	return (
		<Card
			className="h-full border-dashed border-2 hover:border-primary 
                 hover:bg-accent cursor-pointer transition-all
                 flex flex-col items-center justify-center py-8 gap-3"
			onClick={handleClick}
			role="button"
			tabIndex={0}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					handleClick();
				}
			}}
		>
			<PlusCircle className="w-10 h-10 text-muted-foreground" />
			<p className="text-sm font-medium text-center px-3">ページを作成</p>
		</Card>
	);
}
