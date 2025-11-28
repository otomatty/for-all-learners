/**
 * プル操作（サーバー → ローカル）
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this module):
 *   └─ lib/sync/sync-manager.ts
 *
 * Dependencies:
 *   ├─ lib/sync/conflict-resolver.ts
 *   ├─ lib/db/hybrid-client.ts
 *   └─ lib/supabase/client.ts
 *
 * Issue: https://github.com/otomatty/for-all-learners/issues/193
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { HybridDBClientInterface } from "@/lib/db/hybrid-client";
import type { LocalNote, TiptapContent } from "@/lib/db/types";
import type { Database } from "@/types/database.types";
import type { ConflictResolver } from "../conflict-resolver";
import type { PullResult, SyncEvent } from "../types";

/**
 * プル操作クラス
 */
export class PullOperations {
	constructor(
		private supabase: SupabaseClient<Database>,
		private db: HybridDBClientInterface,
		private userId: string,
		private conflictResolver: ConflictResolver,
		private emitEvent: (event: SyncEvent) => void,
	) {}

	/**
	 * サーバーの変更をローカルにプル
	 */
	async pullAll(): Promise<PullResult> {
		const errors: string[] = [];
		let pulled = 0;

		// Notes をプル
		try {
			const notesPulled = await this.pullNotes();
			pulled += notesPulled;
		} catch (error) {
			errors.push(
				`Pull Notes: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}

		// Pages をプル
		try {
			const pagesPulled = await this.pullPages();
			pulled += pagesPulled;
		} catch (error) {
			errors.push(
				`Pull Pages: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}

		// Decks をプル
		try {
			const decksPulled = await this.pullDecks();
			pulled += decksPulled;
		} catch (error) {
			errors.push(
				`Pull Decks: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}

		// Cards をプル
		try {
			const cardsPulled = await this.pullCards();
			pulled += cardsPulled;
		} catch (error) {
			errors.push(
				`Pull Cards: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}

		return { count: pulled, errors };
	}

	private async pullNotes(): Promise<number> {
		const { data: serverNotes, error } = await this.supabase
			.from("notes")
			.select("*")
			.eq("owner_id", this.userId)
			.order("updated_at", { ascending: false });

		if (error) throw error;

		let pulled = 0;

		if (serverNotes) {
			for (const serverNote of serverNotes) {
				const localNote = await this.db.notes.getById(serverNote.id);
				const serverUpdatedAt =
					serverNote.updated_at ?? new Date().toISOString();

				if (!localNote) {
					await this.db.notes.overwriteWithServer({
						...serverNote,
						visibility: serverNote.visibility as LocalNote["visibility"],
						page_count: serverNote.page_count ?? 0,
						participant_count: serverNote.participant_count ?? 0,
						is_default_note: serverNote.is_default_note ?? null,
						sync_status: "synced",
						synced_at: new Date().toISOString(),
						local_updated_at: serverUpdatedAt,
						server_updated_at: serverUpdatedAt,
					});
					pulled++;
				} else if (
					this.conflictResolver.isServerNewer(localNote, serverUpdatedAt)
				) {
					await this.db.notes.overwriteWithServer({
						...serverNote,
						visibility: serverNote.visibility as LocalNote["visibility"],
						page_count: serverNote.page_count ?? 0,
						participant_count: serverNote.participant_count ?? 0,
						is_default_note: serverNote.is_default_note ?? null,
						sync_status: "synced",
						synced_at: new Date().toISOString(),
						local_updated_at: serverUpdatedAt,
						server_updated_at: serverUpdatedAt,
					});
					pulled++;
					this.emitEvent({
						type: "conflict_resolved",
						timestamp: new Date().toISOString(),
						data: { table: "notes", id: serverNote.id, winner: "server" },
					});
				}
			}
		}

		return pulled;
	}

	private async pullPages(): Promise<number> {
		const { data: serverPages, error } = await this.supabase
			.from("pages")
			.select("*")
			.eq("user_id", this.userId)
			.order("updated_at", { ascending: false });

		if (error) throw error;

		let pulled = 0;

		if (serverPages) {
			for (const serverPage of serverPages) {
				const localPage = await this.db.pages.getById(serverPage.id);
				const serverUpdatedAt =
					serverPage.updated_at ?? new Date().toISOString();

				if (!localPage) {
					await this.db.pages.overwriteWithServer({
						...serverPage,
						note_id: null,
						created_at: serverPage.created_at ?? new Date().toISOString(),
						updated_at: serverUpdatedAt,
						sync_status: "synced",
						synced_at: new Date().toISOString(),
						local_updated_at: serverUpdatedAt,
						server_updated_at: serverUpdatedAt,
					});
					pulled++;
				} else if (
					this.conflictResolver.isServerNewer(localPage, serverUpdatedAt)
				) {
					await this.db.pages.overwriteWithServer({
						...serverPage,
						note_id: localPage.note_id,
						created_at: serverPage.created_at ?? new Date().toISOString(),
						updated_at: serverUpdatedAt,
						sync_status: "synced",
						synced_at: new Date().toISOString(),
						local_updated_at: serverUpdatedAt,
						server_updated_at: serverUpdatedAt,
					});
					pulled++;
				}
			}
		}

		return pulled;
	}

	private async pullDecks(): Promise<number> {
		const { data: serverDecks, error } = await this.supabase
			.from("decks")
			.select("*")
			.eq("user_id", this.userId)
			.order("updated_at", { ascending: false });

		if (error) throw error;

		let pulled = 0;

		if (serverDecks) {
			for (const serverDeck of serverDecks) {
				const localDeck = await this.db.decks.getById(serverDeck.id);
				const serverUpdatedAt =
					serverDeck.updated_at ?? new Date().toISOString();

				if (!localDeck) {
					await this.db.decks.overwriteWithServer({
						...serverDeck,
						is_public: serverDeck.is_public ?? false,
						created_at: serverDeck.created_at ?? new Date().toISOString(),
						updated_at: serverUpdatedAt,
						sync_status: "synced",
						synced_at: new Date().toISOString(),
						local_updated_at: serverUpdatedAt,
						server_updated_at: serverUpdatedAt,
					});
					pulled++;
				} else if (
					this.conflictResolver.isServerNewer(localDeck, serverUpdatedAt)
				) {
					await this.db.decks.overwriteWithServer({
						...serverDeck,
						is_public: serverDeck.is_public ?? false,
						created_at: serverDeck.created_at ?? new Date().toISOString(),
						updated_at: serverUpdatedAt,
						sync_status: "synced",
						synced_at: new Date().toISOString(),
						local_updated_at: serverUpdatedAt,
						server_updated_at: serverUpdatedAt,
					});
					pulled++;
				}
			}
		}

		return pulled;
	}

	private async pullCards(): Promise<number> {
		const { data: serverCards, error } = await this.supabase
			.from("cards")
			.select("*")
			.eq("user_id", this.userId)
			.order("updated_at", { ascending: false });

		if (error) throw error;

		let pulled = 0;

		if (serverCards) {
			for (const serverCard of serverCards) {
				const localCard = await this.db.cards.getById(serverCard.id);
				const serverUpdatedAt =
					serverCard.updated_at ?? new Date().toISOString();

				if (!localCard) {
					await this.db.cards.overwriteWithServer({
						...serverCard,
						front_content: serverCard.front_content as unknown as TiptapContent,
						back_content: serverCard.back_content as unknown as TiptapContent,
						created_at: serverCard.created_at ?? new Date().toISOString(),
						updated_at: serverUpdatedAt,
						sync_status: "synced",
						synced_at: new Date().toISOString(),
						local_updated_at: serverUpdatedAt,
						server_updated_at: serverUpdatedAt,
					});
					pulled++;
				} else if (
					this.conflictResolver.isServerNewer(localCard, serverUpdatedAt)
				) {
					await this.db.cards.overwriteWithServer({
						...serverCard,
						front_content: serverCard.front_content as unknown as TiptapContent,
						back_content: serverCard.back_content as unknown as TiptapContent,
						created_at: serverCard.created_at ?? new Date().toISOString(),
						updated_at: serverUpdatedAt,
						sync_status: "synced",
						synced_at: new Date().toISOString(),
						local_updated_at: serverUpdatedAt,
						server_updated_at: serverUpdatedAt,
					});
					pulled++;
				}
			}
		}

		return pulled;
	}
}
