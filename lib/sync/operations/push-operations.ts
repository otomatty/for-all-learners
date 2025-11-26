/**
 * プッシュ操作（ローカル → サーバー）
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
import type {
	LocalCard,
	LocalDeck,
	LocalLearningLog,
	LocalMilestone,
	LocalNote,
	LocalPage,
	LocalStudyGoal,
	LocalUserSettings,
	TiptapContent,
} from "@/lib/db/types";
import type { Database, Json } from "@/types/database.types";
import type { ConflictResolver } from "../conflict-resolver";
import type { PushResult } from "../types";

/**
 * プッシュ操作クラス
 */
export class PushOperations {
	constructor(
		private supabase: SupabaseClient<Database>,
		private db: HybridDBClientInterface,
		private conflictResolver: ConflictResolver,
	) {}

	/**
	 * ローカルの変更をサーバーにプッシュ
	 */
	async pushAll(): Promise<PushResult> {
		const errors: string[] = [];
		let pushed = 0;

		// Notes をプッシュ
		const pendingNotes = await this.db.notes.getPendingSync();
		for (const note of pendingNotes) {
			try {
				await this.pushNote(note);
				pushed++;
			} catch (error) {
				errors.push(
					`Note ${note.id}: ${error instanceof Error ? error.message : "Unknown error"}`,
				);
			}
		}

		// 削除済みノートを処理
		const deletedNotes = await this.db.notes.getDeleted();
		for (const note of deletedNotes) {
			try {
				await this.deleteNoteOnServer(note.id);
				await this.db.notes.hardDelete(note.id);
				pushed++;
			} catch (error) {
				errors.push(
					`Delete Note ${note.id}: ${error instanceof Error ? error.message : "Unknown error"}`,
				);
			}
		}

		// Pages をプッシュ
		const pendingPages = await this.db.pages.getPendingSync();
		for (const page of pendingPages) {
			try {
				await this.pushPage(page);
				pushed++;
			} catch (error) {
				errors.push(
					`Page ${page.id}: ${error instanceof Error ? error.message : "Unknown error"}`,
				);
			}
		}

		// 削除済みページを処理
		const deletedPages = await this.db.pages.getDeleted();
		for (const page of deletedPages) {
			try {
				await this.deletePageOnServer(page.id);
				await this.db.pages.hardDelete(page.id);
				pushed++;
			} catch (error) {
				errors.push(
					`Delete Page ${page.id}: ${error instanceof Error ? error.message : "Unknown error"}`,
				);
			}
		}

		// Decks をプッシュ
		const pendingDecks = await this.db.decks.getPendingSync();
		for (const deck of pendingDecks) {
			try {
				await this.pushDeck(deck);
				pushed++;
			} catch (error) {
				errors.push(
					`Deck ${deck.id}: ${error instanceof Error ? error.message : "Unknown error"}`,
				);
			}
		}

		// 削除済みデッキを処理
		const deletedDecks = await this.db.decks.getDeleted();
		for (const deck of deletedDecks) {
			try {
				await this.deleteDeckOnServer(deck.id);
				await this.db.decks.hardDelete(deck.id);
				pushed++;
			} catch (error) {
				errors.push(
					`Delete Deck ${deck.id}: ${error instanceof Error ? error.message : "Unknown error"}`,
				);
			}
		}

		// Cards をプッシュ
		const pendingCards = await this.db.cards.getPendingSync();
		for (const card of pendingCards) {
			try {
				await this.pushCard(card);
				pushed++;
			} catch (error) {
				errors.push(
					`Card ${card.id}: ${error instanceof Error ? error.message : "Unknown error"}`,
				);
			}
		}

		// 削除済みカードを処理
		const deletedCards = await this.db.cards.getDeleted();
		for (const card of deletedCards) {
			try {
				await this.deleteCardOnServer(card.id);
				await this.db.cards.hardDelete(card.id);
				pushed++;
			} catch (error) {
				errors.push(
					`Delete Card ${card.id}: ${error instanceof Error ? error.message : "Unknown error"}`,
				);
			}
		}

		// StudyGoals をプッシュ
		const pendingGoals = await this.db.studyGoals.getPendingSync();
		for (const goal of pendingGoals) {
			try {
				await this.pushStudyGoal(goal);
				pushed++;
			} catch (error) {
				errors.push(
					`StudyGoal ${goal.id}: ${error instanceof Error ? error.message : "Unknown error"}`,
				);
			}
		}

		// LearningLogs をプッシュ
		const pendingLogs = await this.db.learningLogs.getPendingSync();
		for (const log of pendingLogs) {
			try {
				await this.pushLearningLog(log);
				pushed++;
			} catch (error) {
				errors.push(
					`LearningLog ${log.id}: ${error instanceof Error ? error.message : "Unknown error"}`,
				);
			}
		}

		// Milestones をプッシュ
		const pendingMilestones = await this.db.milestones.getPendingSync();
		for (const milestone of pendingMilestones) {
			try {
				await this.pushMilestone(milestone);
				pushed++;
			} catch (error) {
				errors.push(
					`Milestone ${milestone.id}: ${error instanceof Error ? error.message : "Unknown error"}`,
				);
			}
		}

		// UserSettings をプッシュ
		const pendingSettings = await this.db.userSettings.getPendingSync();
		for (const settings of pendingSettings) {
			try {
				await this.pushUserSettings(settings);
				pushed++;
			} catch (error) {
				errors.push(
					`UserSettings ${settings.id}: ${error instanceof Error ? error.message : "Unknown error"}`,
				);
			}
		}

		return { count: pushed, errors };
	}

	// ============================================================================
	// 個別エンティティのプッシュ処理
	// ============================================================================

	private async pushNote(note: LocalNote): Promise<void> {
		const { data: serverNote } = await this.supabase
			.from("notes")
			.select("*")
			.eq("id", note.id)
			.single();

		if (serverNote) {
			if (
				this.conflictResolver.isServerNewer(note, serverNote.updated_at ?? "")
			) {
				await this.db.notes.overwriteWithServer({
					...serverNote,
					visibility: serverNote.visibility as LocalNote["visibility"],
					page_count: serverNote.page_count ?? 0,
					participant_count: serverNote.participant_count ?? 0,
					is_default_note: serverNote.is_default_note ?? null,
					sync_status: "synced",
					synced_at: new Date().toISOString(),
					local_updated_at: serverNote.updated_at ?? new Date().toISOString(),
					server_updated_at: serverNote.updated_at ?? new Date().toISOString(),
				});
				return;
			}

			const { error } = await this.supabase
				.from("notes")
				.update({
					title: note.title,
					description: note.description,
					visibility: note.visibility,
					updated_at: new Date().toISOString(),
				})
				.eq("id", note.id);

			if (error) throw error;
		} else {
			const { error } = await this.supabase.from("notes").insert({
				id: note.id,
				owner_id: note.owner_id,
				slug: note.slug,
				title: note.title,
				description: note.description,
				visibility: note.visibility,
			});

			if (error) throw error;
		}

		await this.db.notes.markSynced(note.id, new Date().toISOString());
	}

	private async deleteNoteOnServer(id: string): Promise<void> {
		const { error } = await this.supabase.from("notes").delete().eq("id", id);
		if (error) throw error;
	}

	private async pushPage(page: LocalPage): Promise<void> {
		const { data: serverPage } = await this.supabase
			.from("pages")
			.select("*")
			.eq("id", page.id)
			.single();

		if (serverPage) {
			if (
				this.conflictResolver.isServerNewer(page, serverPage.updated_at ?? "")
			) {
				await this.db.pages.overwriteWithServer({
					...serverPage,
					note_id: page.note_id,
					created_at: serverPage.created_at ?? new Date().toISOString(),
					updated_at: serverPage.updated_at ?? new Date().toISOString(),
					sync_status: "synced",
					synced_at: new Date().toISOString(),
					local_updated_at: serverPage.updated_at ?? new Date().toISOString(),
					server_updated_at: serverPage.updated_at ?? new Date().toISOString(),
				});
				return;
			}

			const { error } = await this.supabase
				.from("pages")
				.update({
					title: page.title,
					is_public: page.is_public,
					thumbnail_url: page.thumbnail_url,
					updated_at: new Date().toISOString(),
				})
				.eq("id", page.id);

			if (error) throw error;
		} else {
			const { error } = await this.supabase.from("pages").insert({
				id: page.id,
				user_id: page.user_id,
				title: page.title,
				is_public: page.is_public,
				thumbnail_url: page.thumbnail_url,
				content_tiptap: {},
			});

			if (error) throw error;
		}

		await this.db.pages.markSynced(page.id, new Date().toISOString());
	}

	private async deletePageOnServer(id: string): Promise<void> {
		const { error } = await this.supabase.from("pages").delete().eq("id", id);
		if (error) throw error;
	}

	private async pushDeck(deck: LocalDeck): Promise<void> {
		const { data: serverDeck } = await this.supabase
			.from("decks")
			.select("*")
			.eq("id", deck.id)
			.single();

		if (serverDeck) {
			if (
				this.conflictResolver.isServerNewer(deck, serverDeck.updated_at ?? "")
			) {
				await this.db.decks.overwriteWithServer({
					...serverDeck,
					is_public: serverDeck.is_public ?? false,
					created_at: serverDeck.created_at ?? new Date().toISOString(),
					updated_at: serverDeck.updated_at ?? new Date().toISOString(),
					sync_status: "synced",
					synced_at: new Date().toISOString(),
					local_updated_at: serverDeck.updated_at ?? new Date().toISOString(),
					server_updated_at: serverDeck.updated_at ?? new Date().toISOString(),
				});
				return;
			}

			const { error } = await this.supabase
				.from("decks")
				.update({
					title: deck.title,
					description: deck.description,
					is_public: deck.is_public,
					updated_at: new Date().toISOString(),
				})
				.eq("id", deck.id);

			if (error) throw error;
		} else {
			const { error } = await this.supabase.from("decks").insert({
				id: deck.id,
				user_id: deck.user_id,
				title: deck.title,
				description: deck.description,
				is_public: deck.is_public,
			});

			if (error) throw error;
		}

		await this.db.decks.markSynced(deck.id, new Date().toISOString());
	}

	private async deleteDeckOnServer(id: string): Promise<void> {
		const { error } = await this.supabase.from("decks").delete().eq("id", id);
		if (error) throw error;
	}

	private async pushCard(card: LocalCard): Promise<void> {
		const { data: serverCard } = await this.supabase
			.from("cards")
			.select("*")
			.eq("id", card.id)
			.single();

		if (serverCard) {
			if (
				this.conflictResolver.isServerNewer(card, serverCard.updated_at ?? "")
			) {
				await this.db.cards.overwriteWithServer({
					...serverCard,
					front_content: serverCard.front_content as unknown as TiptapContent,
					back_content: serverCard.back_content as unknown as TiptapContent,
					created_at: serverCard.created_at ?? new Date().toISOString(),
					updated_at: serverCard.updated_at ?? new Date().toISOString(),
					sync_status: "synced",
					synced_at: new Date().toISOString(),
					local_updated_at: serverCard.updated_at ?? new Date().toISOString(),
					server_updated_at: serverCard.updated_at ?? new Date().toISOString(),
				});
				return;
			}

			const { error } = await this.supabase
				.from("cards")
				.update({
					front_content: card.front_content as unknown as Json,
					back_content: card.back_content as unknown as Json,
					source_audio_url: card.source_audio_url,
					source_ocr_image_url: card.source_ocr_image_url,
					ease_factor: card.ease_factor,
					repetition_count: card.repetition_count,
					review_interval: card.review_interval,
					next_review_at: card.next_review_at,
					stability: card.stability,
					difficulty: card.difficulty,
					last_reviewed_at: card.last_reviewed_at,
					updated_at: new Date().toISOString(),
				})
				.eq("id", card.id);

			if (error) throw error;
		} else {
			const { error } = await this.supabase.from("cards").insert({
				deck_id: card.deck_id,
				user_id: card.user_id,
				front_content: card.front_content as unknown as Json,
				back_content: card.back_content as unknown as Json,
				source_audio_url: card.source_audio_url,
				source_ocr_image_url: card.source_ocr_image_url,
				ease_factor: card.ease_factor,
				repetition_count: card.repetition_count,
				review_interval: card.review_interval,
				next_review_at: card.next_review_at,
				stability: card.stability,
				difficulty: card.difficulty,
				last_reviewed_at: card.last_reviewed_at,
			});

			if (error) throw error;
		}

		await this.db.cards.markSynced(card.id, new Date().toISOString());
	}

	private async deleteCardOnServer(id: string): Promise<void> {
		const { error } = await this.supabase.from("cards").delete().eq("id", id);
		if (error) throw error;
	}

	private async pushStudyGoal(goal: LocalStudyGoal): Promise<void> {
		const { data: serverGoal } = await this.supabase
			.from("study_goals")
			.select("*")
			.eq("id", goal.id)
			.single();

		if (serverGoal) {
			if (
				this.conflictResolver.isServerNewer(goal, serverGoal.updated_at ?? "")
			) {
				await this.db.studyGoals.overwriteWithServer({
					...serverGoal,
					status: serverGoal.status as LocalStudyGoal["status"],
					created_at: serverGoal.created_at ?? new Date().toISOString(),
					updated_at: serverGoal.updated_at ?? new Date().toISOString(),
					sync_status: "synced",
					synced_at: new Date().toISOString(),
					local_updated_at: serverGoal.updated_at ?? new Date().toISOString(),
					server_updated_at: serverGoal.updated_at ?? new Date().toISOString(),
				});
				return;
			}

			const { error } = await this.supabase
				.from("study_goals")
				.update({
					title: goal.title,
					description: goal.description,
					deadline: goal.deadline,
					progress_rate: goal.progress_rate,
					status: goal.status,
					completed_at: goal.completed_at,
					updated_at: new Date().toISOString(),
				})
				.eq("id", goal.id);

			if (error) throw error;
		} else {
			const { error } = await this.supabase.from("study_goals").insert({
				id: goal.id,
				user_id: goal.user_id,
				title: goal.title,
				description: goal.description,
				deadline: goal.deadline,
				progress_rate: goal.progress_rate,
				status: goal.status,
				completed_at: goal.completed_at,
			});

			if (error) throw error;
		}

		await this.db.studyGoals.markSynced(goal.id, new Date().toISOString());
	}

	private async pushLearningLog(log: LocalLearningLog): Promise<void> {
		const { data: serverLog } = await this.supabase
			.from("learning_logs")
			.select("*")
			.eq("id", log.id)
			.single();

		if (!serverLog) {
			const { error } = await this.supabase.from("learning_logs").insert({
				id: log.id,
				user_id: log.user_id,
				card_id: log.card_id,
				question_id: log.question_id,
				answered_at: log.answered_at,
				is_correct: log.is_correct,
				user_answer: log.user_answer,
				practice_mode: log.practice_mode,
				review_interval: log.review_interval,
				next_review_at: log.next_review_at,
				quality: log.quality,
				response_time: log.response_time,
				effort_time: log.effort_time,
				attempt_count: log.attempt_count,
			});

			if (error) throw error;
		}

		await this.db.learningLogs.markSynced(log.id, new Date().toISOString());
	}

	private async pushMilestone(milestone: LocalMilestone): Promise<void> {
		const { data: serverMilestone } = await this.supabase
			.from("milestones")
			.select("*")
			.eq("id", milestone.id)
			.single();

		if (serverMilestone) {
			if (
				this.conflictResolver.isServerNewer(
					milestone,
					serverMilestone.updated_at ?? "",
				)
			) {
				await this.db.milestones.overwriteWithServer({
					...serverMilestone,
					status: serverMilestone.status as LocalMilestone["status"],
					related_links:
						serverMilestone.related_links as LocalMilestone["related_links"],
					sync_status: "synced",
					synced_at: new Date().toISOString(),
					local_updated_at:
						serverMilestone.updated_at ?? new Date().toISOString(),
					server_updated_at:
						serverMilestone.updated_at ?? new Date().toISOString(),
				});
				return;
			}

			const { error } = await this.supabase
				.from("milestones")
				.update({
					title: milestone.title,
					description: milestone.description,
					status: milestone.status,
					progress: milestone.progress,
					sort_order: milestone.sort_order,
					image_url: milestone.image_url,
					features: milestone.features,
					related_links: milestone.related_links as unknown as Json,
					updated_at: new Date().toISOString(),
				})
				.eq("id", milestone.id);

			if (error) throw error;
		} else {
			const { error } = await this.supabase.from("milestones").insert({
				milestone_id: milestone.milestone_id,
				timeframe: milestone.timeframe,
				title: milestone.title,
				description: milestone.description,
				status: milestone.status,
				progress: milestone.progress,
				sort_order: milestone.sort_order,
				image_url: milestone.image_url,
				features: milestone.features,
				related_links: milestone.related_links as unknown as Json,
			});

			if (error) throw error;
		}

		await this.db.milestones.markSynced(milestone.id, new Date().toISOString());
	}

	private async pushUserSettings(settings: LocalUserSettings): Promise<void> {
		const { data: serverSettings } = await this.supabase
			.from("user_settings")
			.select("*")
			.eq("id", settings.id)
			.single();

		if (serverSettings) {
			if (
				this.conflictResolver.isServerNewer(
					settings,
					serverSettings.updated_at ?? "",
				)
			) {
				await this.db.userSettings.overwriteWithServer({
					...serverSettings,
					theme: serverSettings.theme as LocalUserSettings["theme"],
					mode: serverSettings.mode as LocalUserSettings["mode"],
					notifications:
						serverSettings.notifications as LocalUserSettings["notifications"],
					sync_status: "synced",
					synced_at: new Date().toISOString(),
					local_updated_at:
						serverSettings.updated_at ?? new Date().toISOString(),
					server_updated_at:
						serverSettings.updated_at ?? new Date().toISOString(),
				});
				return;
			}

			const { error } = await this.supabase
				.from("user_settings")
				.update({
					theme: settings.theme,
					mode: settings.mode,
					locale: settings.locale,
					timezone: settings.timezone,
					notifications: settings.notifications as unknown as Json,
					items_per_page: settings.items_per_page,
					play_help_video_audio: settings.play_help_video_audio,
					cosense_sync_enabled: settings.cosense_sync_enabled,
					notion_sync_enabled: settings.notion_sync_enabled,
					gyazo_sync_enabled: settings.gyazo_sync_enabled,
					quizlet_sync_enabled: settings.quizlet_sync_enabled,
					updated_at: new Date().toISOString(),
				})
				.eq("id", settings.id);

			if (error) throw error;
		} else {
			const { error } = await this.supabase.from("user_settings").insert({
				user_id: settings.user_id,
				theme: settings.theme,
				mode: settings.mode,
				locale: settings.locale,
				timezone: settings.timezone,
				notifications: settings.notifications as unknown as Json,
				items_per_page: settings.items_per_page,
				play_help_video_audio: settings.play_help_video_audio,
				cosense_sync_enabled: settings.cosense_sync_enabled,
				notion_sync_enabled: settings.notion_sync_enabled,
				gyazo_sync_enabled: settings.gyazo_sync_enabled,
				quizlet_sync_enabled: settings.quizlet_sync_enabled,
			});

			if (error) throw error;
		}

		await this.db.userSettings.markSynced(
			settings.id,
			new Date().toISOString(),
		);
	}
}
