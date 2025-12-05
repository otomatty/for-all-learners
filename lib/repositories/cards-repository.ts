/**
 * Cards Repository
 *
 * Cards データの CRUD 操作と Cards 固有のクエリを提供
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this module):
 *   └─ hooks/cards/*.ts
 *
 * Dependencies:
 *   ├─ lib/repositories/base-repository.ts
 *   ├─ lib/repositories/types.ts
 *   └─ lib/db/types.ts
 *
 * Spec: lib/repositories/cards-repository.spec.md
 * Issue: https://github.com/otomatty/for-all-learners/issues/197
 */

import type { CreateCardPayload, LocalCard } from "@/lib/db/types";
import { BaseRepository, RepositoryError } from "./base-repository";
import type { EntityName, RepositoryOptions } from "./types";

/**
 * 復習結果の型
 */
export interface ReviewResult {
	ease_factor: number;
	repetition_count: number;
	review_interval: number;
	next_review_at: string | null;
	stability: number;
	difficulty: number;
	last_reviewed_at: string | null;
}

/**
 * Cards Repository
 *
 * Cards データの CRUD 操作を提供
 */
export class CardsRepository extends BaseRepository<
	LocalCard,
	CreateCardPayload
> {
	protected entityName: EntityName = "cards";

	/**
	 * コンストラクタ
	 *
	 * @param options Repository オプション
	 */
	constructor(options: RepositoryOptions = {}) {
		super(options);
	}

	/**
	 * 作成ペイロードからカードエンティティを生成
	 *
	 * FSRS アルゴリズムの初期値を設定
	 */
	protected createEntity(
		userId: string,
		payload: CreateCardPayload,
	): Omit<
		LocalCard,
		| "id"
		| "sync_status"
		| "synced_at"
		| "local_updated_at"
		| "server_updated_at"
	> {
		const now = new Date().toISOString();
		return {
			user_id: userId,
			deck_id: payload.deck_id,
			front_content: payload.front_content,
			back_content: payload.back_content,
			source_audio_url: payload.source_audio_url ?? null,
			source_ocr_image_url: payload.source_ocr_image_url ?? null,
			created_at: now,
			updated_at: now,
			// FSRS 初期値
			ease_factor: 2.5,
			repetition_count: 0,
			review_interval: 0,
			next_review_at: null,
			stability: 0,
			difficulty: 0,
			last_reviewed_at: null,
		};
	}

	// ==========================================================================
	// Cards 固有のメソッド
	// ==========================================================================

	/**
	 * デッキ内のカード一覧を取得
	 *
	 * @param deckId デッキID
	 * @returns カードの配列
	 */
	async getByDeckId(deckId: string): Promise<LocalCard[]> {
		try {
			const db = await this.getDB();
			const cards = await db.cards.getByDeck(deckId);
			return cards;
		} catch (error) {
			throw new RepositoryError("DB_ERROR", `Failed to get cards by deck id`, {
				entityName: this.entityName,
				originalError: error instanceof Error ? error : undefined,
			});
		}
	}

	/**
	 * 復習対象カードを取得
	 *
	 * next_review_at が現在時刻より前のカードを取得
	 *
	 * @param userId ユーザーID
	 * @returns 復習対象カードの配列
	 */
	async getDueCards(userId: string): Promise<LocalCard[]> {
		try {
			const db = await this.getDB();
			const cards = await db.cards.getDueCards(userId);
			return cards;
		} catch (error) {
			throw new RepositoryError("DB_ERROR", `Failed to get due cards`, {
				entityName: this.entityName,
				originalError: error instanceof Error ? error : undefined,
			});
		}
	}

	/**
	 * 復習結果を更新
	 *
	 * FSRS アルゴリズムの計算結果を保存
	 *
	 * @param id カードID
	 * @param result 復習結果
	 * @returns 更新されたカード
	 */
	async updateReviewResult(
		id: string,
		result: ReviewResult,
	): Promise<LocalCard> {
		return this.update(id, {
			ease_factor: result.ease_factor,
			repetition_count: result.repetition_count,
			review_interval: result.review_interval,
			next_review_at: result.next_review_at,
			stability: result.stability,
			difficulty: result.difficulty,
			last_reviewed_at: result.last_reviewed_at,
		});
	}

	/**
	 * カードを一括作成
	 *
	 * @param userId ユーザーID
	 * @param payloads 作成ペイロードの配列
	 * @returns 作成されたカードの配列
	 */
	async createBatch(
		userId: string,
		payloads: CreateCardPayload[],
	): Promise<LocalCard[]> {
		try {
			const db = await this.getDB();

			// 各ペイロードに同期メタデータを追加
			const now = new Date().toISOString();
			const entities = payloads.map((payload) => ({
				...this.createEntity(userId, payload),
				id: crypto.randomUUID(),
				sync_status: "pending" as const,
				synced_at: null,
				local_updated_at: now,
				server_updated_at: null,
			}));

			const result = await db.cards.createMany(userId, entities);

			// バックグラウンドで同期をトリガー
			this.triggerBackgroundSync();

			return result;
		} catch (error) {
			throw new RepositoryError("DB_ERROR", `Failed to create cards batch`, {
				entityName: this.entityName,
				originalError: error instanceof Error ? error : undefined,
			});
		}
	}

	/**
	 * デッキ内の復習対象カードを取得
	 *
	 * next_review_at が現在時刻より前のカードを取得（デッキ単位）
	 *
	 * @param deckId デッキID
	 * @param userId ユーザーID
	 * @returns 復習対象カードの配列
	 */
	async getDueCardsByDeck(
		deckId: string,
		userId: string,
	): Promise<LocalCard[]> {
		try {
			const db = await this.getDB();
			const cards = await db.cards.getByDeck(deckId);
			const now = new Date().toISOString();
			return cards.filter(
				(card) =>
					card.user_id === userId &&
					card.next_review_at &&
					card.next_review_at <= now,
			);
		} catch (error) {
			throw new RepositoryError("DB_ERROR", `Failed to get due cards by deck`, {
				entityName: this.entityName,
				originalError: error instanceof Error ? error : undefined,
			});
		}
	}

	/**
	 * ユーザーの全デッキごとの復習対象カード数を取得
	 *
	 * @param userId ユーザーID
	 * @returns デッキIDをキーとした復習対象カード数のマップ
	 */
	async getDueCountsByUser(userId: string): Promise<Record<string, number>> {
		try {
			const db = await this.getDB();
			const allCards = await db.cards.getAll(userId);
			const now = new Date().toISOString();

			const map: Record<string, number> = {};
			for (const card of allCards) {
				if (card.next_review_at && card.next_review_at <= now) {
					map[card.deck_id] = (map[card.deck_id] ?? 0) + 1;
				}
			}
			return map;
		} catch (error) {
			throw new RepositoryError(
				"DB_ERROR",
				`Failed to get due counts by user`,
				{
					entityName: this.entityName,
					originalError: error instanceof Error ? error : undefined,
				},
			);
		}
	}
}

/**
 * CardsRepository のシングルトンインスタンス
 */
export const cardsRepository = new CardsRepository();
