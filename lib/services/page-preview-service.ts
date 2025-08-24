import { createClient } from "@/lib/supabase/client";
import type { JSONContent } from "@tiptap/core";

/**
 * ページプレビュー情報
 */
export interface PagePreview {
	id: string;
	title: string;
	content_preview: string; // 先頭200文字のプレーンテキスト
	thumbnail_url?: string | null;
	updated_at: string;
	// note関連情報（note内ページの場合）
	note_info?: {
		title: string;
		slug: string;
	};
}

/**
 * キャッシュ統計情報
 */
export interface CacheStats {
	size: number;
	hitRate: number;
	totalRequests: number;
	cacheHits: number;
}

/**
 * JSONContentからプレーンテキストを抽出
 */
function extractTextFromContent(content: JSONContent): string {
	if (!content) return "";

	if (content.type === "text" && content.text) {
		return content.text;
	}

	if (content.content && Array.isArray(content.content)) {
		return content.content
			.map(extractTextFromContent)
			.join(" ")
			.replace(/\s+/g, " ")
			.trim();
	}

	return "";
}

/**
 * ページプレビューサービス
 * ページの概要情報を取得・キャッシュする
 */
export class PagePreviewService {
	private cache = new Map<string, PagePreview>();
	private timestamps = new Map<string, number>();
	private readonly maxAge = 5 * 60 * 1000; // 5分間
	private readonly maxCacheSize = 50;

	// 統計情報
	private totalRequests = 0;
	private cacheHits = 0;

	/**
	 * ページプレビューを取得
	 */
	async getPreview(pageId: string): Promise<PagePreview> {
		this.totalRequests++;

		// キャッシュチェック
		const cached = this.getCachedPreview(pageId);
		if (cached) {
			this.cacheHits++;
			return cached;
		}

		try {
			const supabase = createClient();

			// まず note関連情報なしでページ情報を取得
			const { data: pageData, error: pageError } = await supabase
				.from("pages")
				.select("id, title, content_tiptap, thumbnail_url, updated_at")
				.eq("id", pageId)
				.single();

			if (pageError || !pageData) {
				throw new Error("Page not found");
			}

			// 基本プレビューを構築
			const preview = this.buildPreviewFromPageData(pageData);

			// note関連情報を別途取得
			const { data: linkData } = await supabase
				.from("note_page_links")
				.select(`
					notes(title, slug)
				`)
				.eq("page_id", pageId)
				.limit(1)
				.single();

			// note情報があれば追加
			if (linkData?.notes) {
				preview.note_info = {
					title: linkData.notes.title,
					slug: linkData.notes.slug,
				};
			}

			// キャッシュに保存
			this.setCachedPreview(pageId, preview);

			return preview;
		} catch (error) {
			console.error("Failed to fetch page preview:", error);
			throw error;
		}
	}

	/**
	 * ページデータからプレビューを構築
	 */
	private buildPreviewFromPageData(data: {
		id: string;
		title: string | null;
		content_tiptap: unknown;
		thumbnail_url: string | null;
		updated_at: string | null;
	}): PagePreview {
		// プレビューデータを構築
		const contentText = extractTextFromContent(
			data.content_tiptap as JSONContent,
		);
		const preview: PagePreview = {
			id: data.id,
			title: data.title || "無題",
			content_preview: contentText.substring(0, 200),
			thumbnail_url: data.thumbnail_url,
			updated_at: data.updated_at || new Date().toISOString(),
		};

		return preview;
	}

	/**
	 * キャッシュからプレビューを取得
	 */
	private getCachedPreview(pageId: string): PagePreview | null {
		const cached = this.cache.get(pageId);
		const timestamp = this.timestamps.get(pageId);

		if (!cached || !timestamp) {
			return null;
		}

		// 期限切れチェック
		if (Date.now() - timestamp > this.maxAge) {
			this.cache.delete(pageId);
			this.timestamps.delete(pageId);
			return null;
		}

		return cached;
	}

	/**
	 * キャッシュにプレビューを保存
	 */
	private setCachedPreview(pageId: string, preview: PagePreview): void {
		// キャッシュサイズ制限
		if (this.cache.size >= this.maxCacheSize) {
			// 最も古いエントリを削除
			let oldestKey = "";
			let oldestTime = Date.now();

			for (const [key, time] of this.timestamps.entries()) {
				if (time < oldestTime) {
					oldestTime = time;
					oldestKey = key;
				}
			}

			if (oldestKey) {
				this.cache.delete(oldestKey);
				this.timestamps.delete(oldestKey);
			}
		}

		this.cache.set(pageId, preview);
		this.timestamps.set(pageId, Date.now());
	}

	/**
	 * キャッシュをクリア
	 */
	clearCache(): void {
		this.cache.clear();
		this.timestamps.clear();
	}

	/**
	 * キャッシュ統計を取得
	 */
	getCacheStats(): CacheStats {
		return {
			size: this.cache.size,
			hitRate: this.totalRequests > 0 ? this.cacheHits / this.totalRequests : 0,
			totalRequests: this.totalRequests,
			cacheHits: this.cacheHits,
		};
	}
}

// シングルトンインスタンス
export const pagePreviewService = new PagePreviewService();
