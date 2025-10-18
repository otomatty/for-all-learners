"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import type {
	CreateNoteDeckLinkPayload,
	NoteDeckLink,
	NoteDeckLinkWithRelations,
} from "@/types/note-deck-links";

type Deck = Database["public"]["Tables"]["decks"]["Row"];
type Note = Database["public"]["Tables"]["notes"]["Row"];

/**
 * ノートとデッキのリンクを作成
 */
export async function createNoteDeckLink(
	payload: CreateNoteDeckLinkPayload,
): Promise<NoteDeckLink> {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		throw new Error("認証が必要です");
	}

	// 権限チェック
	const permissionCheck = await validateNoteDeckLinkPermission(
		payload.note_id,
		payload.deck_id,
		"create",
	);

	if (!permissionCheck.canPerform) {
		throw new Error(permissionCheck.reason || "権限がありません");
	}

	const { data, error } = await supabase
		.from("note_deck_links")
		.insert({
			note_id: payload.note_id,
			deck_id: payload.deck_id,
			created_by: user.id,
		})
		.select()
		.single();

	if (error) {
		if (error.code === "23505") {
			// unique_violation
			throw new Error("このノートとデッキは既にリンクされています");
		}
		throw new Error(`リンク作成に失敗しました: ${error.message}`);
	}

	// キャッシュを無効化
	revalidatePath(`/notes/${payload.note_id}`);
	revalidatePath(`/decks/${payload.deck_id}`);
	revalidatePath("/dashboard");

	return data;
}

/**
 * ノートとデッキのリンクを削除
 */
export async function removeNoteDeckLink(
	noteId: string,
	deckId: string,
): Promise<void> {
	const supabase = await createClient();

	// 権限チェック
	const permissionCheck = await validateNoteDeckLinkPermission(
		noteId,
		deckId,
		"delete",
	);

	if (!permissionCheck.canPerform) {
		throw new Error(permissionCheck.reason || "権限がありません");
	}

	const { error } = await supabase
		.from("note_deck_links")
		.delete()
		.eq("note_id", noteId)
		.eq("deck_id", deckId);

	if (error) {
		throw new Error(`リンク削除に失敗しました: ${error.message}`);
	}

	// キャッシュを無効化
	revalidatePath(`/notes/${noteId}`);
	revalidatePath(`/decks/${deckId}`);
	revalidatePath("/dashboard");
}

/**
 * ノートにリンクされたデッキ一覧を取得
 */
export async function getDecksLinkedToNote(noteId: string): Promise<Deck[]> {
	const supabase = await createClient();

	const { data, error } = await supabase
		.from("note_deck_links")
		.select(`
      deck:decks (
        id,
        title,
        description,
        is_public,
        created_at,
        updated_at,
        user_id
      )
    `)
		.eq("note_id", noteId);

	if (error) {
		throw new Error(`デッキ取得に失敗しました: ${error.message}`);
	}

	return data.map((item) => item.deck).filter(Boolean) as Deck[];
}

/**
 * デッキにリンクされたノート一覧を取得
 */
export async function getNotesLinkedToDeck(deckId: string): Promise<Note[]> {
	const supabase = await createClient();

	const { data, error } = await supabase
		.from("note_deck_links")
		.select(`
      note:notes (
        id,
        slug,
        title,
        description,
        visibility,
        created_at,
        updated_at,
        owner_id
      )
    `)
		.eq("deck_id", deckId);

	if (error) {
		throw new Error(`ノート取得に失敗しました: ${error.message}`);
	}

	return data.map((item) => item.note).filter(Boolean) as Note[];
}

/**
 * ユーザーのノート-デッキリンク一覧を取得（関連データ付き）
 */
export async function getUserNoteDeckLinks(
	userId?: string,
): Promise<NoteDeckLinkWithRelations[]> {
	const supabase = await createClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) {
		throw new Error("認証が必要です");
	}

	const targetUserId = userId || user.id;

	const { data, error } = await supabase
		.from("note_deck_links")
		.select(`
      *,
      note:notes (
        id,
        title,
        slug,
        visibility,
        owner_id
      ),
      deck:decks (
        id,
        title,
        description,
        is_public,
        user_id
      )
    `)
		.eq("created_by", targetUserId);

	if (error) {
		throw new Error(`リンク一覧取得に失敗しました: ${error.message}`);
	}

	return data as NoteDeckLinkWithRelations[];
}

/**
 * 利用可能なデッキ一覧を取得（まだリンクされていないもの）
 */
export async function getAvailableDecksForNote(
	noteId: string,
): Promise<Deck[]> {
	const supabase = await createClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) {
		throw new Error("認証が必要です");
	}

	// 既にリンクされているデッキIDを取得
	const { data: linkedDecks, error: linkError } = await supabase
		.from("note_deck_links")
		.select("deck_id")
		.eq("note_id", noteId);

	if (linkError) {
		throw new Error(`リンク済みデッキ取得に失敗しました: ${linkError.message}`);
	}

	const linkedDeckIds = (linkedDecks || []).map((link) => link.deck_id);

	// アクセス可能なデッキ一覧を取得（リンク済みを除外）
	let query = supabase
		.from("decks")
		.select("*")
		.or(`user_id.eq.${user.id},is_public.eq.true`);

	if (linkedDeckIds.length > 0) {
		query = query.not("id", "in", `(${linkedDeckIds.join(",")})`);
	}

	const { data: decks, error: deckError } = await query;

	if (deckError) {
		throw new Error(`利用可能デッキ取得に失敗しました: ${deckError.message}`);
	}

	return decks || [];
}

/**
 * 利用可能なノート一覧を取得（まだリンクされていないもの）
 */
export async function getAvailableNotesForDeck(
	deckId: string,
): Promise<Note[]> {
	const supabase = await createClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) {
		throw new Error("認証が必要です");
	}

	// 既にリンクされているノートIDを取得
	const { data: linkedNotes, error: linkError } = await supabase
		.from("note_deck_links")
		.select("note_id")
		.eq("deck_id", deckId);

	if (linkError) {
		throw new Error(`リンク済みノート取得に失敗しました: ${linkError.message}`);
	}

	const linkedNoteIds = (linkedNotes || []).map((link) => link.note_id);

	// アクセス可能なノート一覧を取得（リンク済みを除外）
	let query = supabase
		.from("notes")
		.select("*")
		.or(`owner_id.eq.${user.id},visibility.in.(public,unlisted)`);

	if (linkedNoteIds.length > 0) {
		query = query.not("id", "in", `(${linkedNoteIds.join(",")})`);
	}

	const { data: notes, error: noteError } = await query;

	if (noteError) {
		throw new Error(`利用可能ノート取得に失敗しました: ${noteError.message}`);
	}

	return notes || [];
}

/**
 * ノート-デッキリンクの権限チェック
 */
export async function validateNoteDeckLinkPermission(
	noteId: string,
	deckId: string,
	action: "create" | "delete",
): Promise<{ canPerform: boolean; reason?: string }> {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return { canPerform: false, reason: "認証が必要です" };
	}

	// ノートの権限チェック
	const { data: note, error: noteError } = await supabase
		.from("notes")
		.select("owner_id, visibility")
		.eq("id", noteId)
		.single();

	if (noteError || !note) {
		return { canPerform: false, reason: "ノートが見つかりません" };
	}

	// デッキの権限チェック
	const { data: deck, error: deckError } = await supabase
		.from("decks")
		.select("user_id, is_public")
		.eq("id", deckId)
		.single();

	if (deckError || !deck) {
		return { canPerform: false, reason: "デッキが見つかりません" };
	}

	// 権限判定
	const canManageNote = note.owner_id === user.id;
	const canManageDeck = deck.user_id === user.id;

	if (action === "create") {
		if (canManageNote || canManageDeck) {
			return { canPerform: true };
		}
		return { canPerform: false, reason: "リンク作成権限がありません" };
	}

	if (action === "delete") {
		if (canManageNote || canManageDeck) {
			return { canPerform: true };
		}
		return { canPerform: false, reason: "リンク削除権限がありません" };
	}

	return { canPerform: false, reason: "不正な操作です" };
}
