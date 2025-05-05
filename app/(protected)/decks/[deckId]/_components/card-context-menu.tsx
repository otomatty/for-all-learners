"use client";

import type * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
	ContextMenu,
	ContextMenuTrigger,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
} from "@/components/ui/context-menu";

interface CardContextMenuProps {
	cardId: string;
	onEdit: () => void;
	children: React.ReactNode;
}

export function CardContextMenu({
	cardId,
	onEdit,
	children,
}: CardContextMenuProps) {
	const supabase = createClient();
	const router = useRouter();

	const handleDelete = async () => {
		const { error } = await supabase.from("cards").delete().eq("id", cardId);
		if (error) {
			toast.error(error.message || "削除に失敗しました");
		} else {
			toast.success("カードを削除しました");
			router.refresh();
		}
	};

	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
			<ContextMenuContent>
				<ContextMenuItem onSelect={onEdit}>編集</ContextMenuItem>
				<ContextMenuSeparator />
				<ContextMenuItem onSelect={handleDelete}>削除</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
}
