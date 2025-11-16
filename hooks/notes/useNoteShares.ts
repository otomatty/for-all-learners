"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface NoteShare {
	shared_with_user_id: string;
	permission_level: "editor" | "viewer";
	created_at: string;
}

type PermissionLevel = "editor" | "viewer";

/**
 * Validates that a string is a valid permission level.
 * This is a type guard function that narrows the type.
 */
function isValidPermissionLevel(value: string): value is PermissionLevel {
	return value === "editor" || value === "viewer";
}

/**
 * 指定したノートの共有ユーザー一覧を取得します。
 */
export function useNoteShares(noteId: string) {
	const supabase = createClient();

	return useQuery({
		queryKey: ["note-shares", noteId],
		queryFn: async (): Promise<NoteShare[]> => {
			const { data, error } = await supabase
				.from("note_shares")
				.select("shared_with_user_id, permission_level, created_at")
				.eq("note_id", noteId);
			if (error) throw error;
			if (!data) return [];

			// Map database result to NoteShare type
			// permission_level is validated by database constraints, but TypeScript needs explicit validation
			return data.map((share) => {
				if (!isValidPermissionLevel(share.permission_level)) {
					throw new Error(
						`Invalid permission_level value: ${share.permission_level}`,
					);
				}
				return {
					shared_with_user_id: share.shared_with_user_id,
					permission_level: share.permission_level,
					created_at: share.created_at,
				};
			});
		},
		enabled: !!noteId,
	});
}
