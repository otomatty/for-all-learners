"use client";

import React, { useState, useEffect } from "react";
import {
	Card,
	CardHeader,
	CardContent,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShareSettingsModal } from "@/components/ShareSettingsModal";
import { BookOpen, Users, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface NoteHeaderProps {
	id: string;
	title: string;
	slug: string;
	description: string | null;
	visibility: "public" | "unlisted" | "invite" | "private";
	pageCount: number;
	participantCount: number;
	updatedAt: string;
	ownerId: string;
}

export default function NoteHeader({
	id,
	title,
	slug,
	description,
	visibility,
	pageCount,
	participantCount,
	updatedAt,
	ownerId,
}: NoteHeaderProps) {
	const [currentUserId, setCurrentUserId] = useState<string | null>(null);

	useEffect(() => {
		const supabase = createClient();
		async function fetchUser() {
			const {
				data: { user },
				error,
			} = await supabase.auth.getUser();
			if (!error && user) {
				setCurrentUserId(user.id);
			}
		}
		fetchUser();
	}, []);

	const formattedDate = new Date(updatedAt).toLocaleDateString("ja-JP");
	const visibilityLabel =
		visibility === "public"
			? "公開"
			: visibility === "unlisted"
				? "限定公開"
				: visibility === "invite"
					? "招待"
					: "非公開";
	const badgeVariant =
		visibility === "public"
			? "secondary"
			: visibility === "unlisted"
				? "outline"
				: visibility === "invite"
					? "default"
					: "destructive";

	return (
		<Card className="mb-4">
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				<CardDescription>{slug}</CardDescription>
			</CardHeader>
			<CardContent>
				{description && (
					<p className="text-sm text-muted-foreground mb-2">{description}</p>
				)}
				<div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
					<div className="flex items-center gap-1">
						<BookOpen className="h-4 w-4" />
						<span>ページ数: {pageCount}</span>
					</div>
					<div className="flex items-center gap-1">
						<Users className="h-4 w-4" />
						<span>参加者数: {participantCount}</span>
					</div>
					<div className="flex items-center gap-1">
						<Clock className="h-4 w-4" />
						<span>最終更新日: {formattedDate}</span>
					</div>
				</div>
			</CardContent>
			<div className="px-4 pb-4 flex justify-end">
				{currentUserId === ownerId && (
					<ShareSettingsModal
						note={{
							id,
							title,
							slug,
							description,
							visibility,
							pageCount,
							participantCount,
							updatedAt,
							ownerId,
						}}
					/>
				)}
				<Badge variant={badgeVariant}>{visibilityLabel}</Badge>
			</div>
		</Card>
	);
}
