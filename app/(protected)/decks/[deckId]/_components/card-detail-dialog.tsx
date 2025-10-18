"use client";

import type * as React from "react";
import { useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Database } from "@/types/database.types";
import { RichContent } from "./rich-content";

interface CardDetailDialogProps {
	card: Database["public"]["Tables"]["cards"]["Row"];
	children: React.ReactNode;
}

export function CardDetailDialog({ card, children }: CardDetailDialogProps) {
	const [open, setOpen] = useState(false);
	const isMobile = useIsMobile();

	const detailContent = (
		<div className="space-y-4">
			<h3 className="text-lg font-semibold">問題文</h3>
			<div className="prose">
				<RichContent content={card.front_content} />
			</div>
			{/* 他の詳細フィールドを追加 */}
		</div>
	);

	if (isMobile) {
		return (
			<Drawer open={open} onOpenChange={setOpen}>
				<DrawerTrigger asChild>{children}</DrawerTrigger>
				<DrawerContent className="sm:max-w-[425px]">
					<DrawerHeader>
						<DrawerTitle>カード詳細</DrawerTitle>
						<DrawerDescription>カードの詳細情報を表示します</DrawerDescription>
					</DrawerHeader>
					{detailContent}
				</DrawerContent>
			</Drawer>
		);
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent>
				<DialogHeader className="text-left">
					<DialogTitle>カード詳細</DialogTitle>
					<DialogDescription>カードの詳細情報を表示します</DialogDescription>
				</DialogHeader>
				{detailContent}
			</DialogContent>
		</Dialog>
	);
}
