"use client";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { BookOpen, Clock, Users } from "lucide-react";
import Link from "next/link";
import React from "react";
import type { NoteSummary } from "./notes-list";

interface RecommendedPublicNotesProps {
	notes: NoteSummary[];
}

export default function RecommendedPublicNotes({
	notes,
}: RecommendedPublicNotesProps) {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{notes.map((note) => {
				const formattedDate = new Date(note.updatedAt).toLocaleDateString(
					"ja-JP",
				);
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
								<p className="text-sm text-muted-foreground">
									{note.description}
								</p>
								<div className="space-y-2 text-sm text-muted-foreground mt-4">
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
								<Badge variant="secondary">公開</Badge>
							</CardFooter>
						</Card>
					</Link>
				);
			})}
		</div>
	);
}
