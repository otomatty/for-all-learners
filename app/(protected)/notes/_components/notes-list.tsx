"use client";
import { BookOpen, Clock, Users } from "lucide-react";
import Link from "next/link";
import React from "react";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export type NoteSummary = {
	id: string;
	slug: string;
	title: string;
	description: string | null;
	visibility: "public" | "unlisted" | "invite" | "private";
	pageCount: number;
	participantCount: number;
	updatedAt: string;
};

interface NotesListProps {
	notes: NoteSummary[];
}

export default function NotesList({ notes }: NotesListProps) {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{notes.map((note) => {
				const formattedDate = new Date(note.updatedAt).toLocaleDateString(
					"ja-JP",
				);
				const visibilityLabel =
					note.visibility === "public"
						? "公開"
						: note.visibility === "unlisted"
							? "限定公開"
							: note.visibility === "invite"
								? "招待"
								: "非公開";
				return (
					<Link
						key={note.id}
						href={`/notes/${note.slug}`}
						className="block hover:shadow-md rounded-xl transition"
					>
						<Card>
							<CardHeader>
								<CardTitle>{note.title}</CardTitle>
								<CardDescription>{note.slug}</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="space-y-2 text-sm text-muted-foreground">
									<div className="flex items-center gap-1">
										<BookOpen className="h-4 w-4" />
										<span>ページ数: {note.pageCount}</span>
									</div>
									<div className="flex items-center gap-1">
										<Users className="h-4 w-4" />
										<span>参加者数: {note.participantCount}</span>
									</div>
									<div className="flex items-center gap-1">
										<Clock className="h-4 w-4" />
										<span>最終更新日: {formattedDate}</span>
									</div>
								</div>
							</CardContent>
							<CardFooter className="flex justify-end">
								<Badge
									variant={
										note.visibility === "public"
											? "secondary"
											: note.visibility === "unlisted"
												? "outline"
												: note.visibility === "invite"
													? "default"
													: "destructive"
									}
								>
									{visibilityLabel}
								</Badge>
							</CardFooter>
						</Card>
					</Link>
				);
			})}
		</div>
	);
}
