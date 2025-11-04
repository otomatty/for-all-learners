/**
 * Unified Link Mark utilities
 * 正規化、キャッシュ、状態更新ヘルパ
 */

import logger from "../logger";

/**
 * 正規化規則に従ってタイトルをキーに変換
 * 1. トリミング: 前後空白除去
 * 2. 連続空白: 単一スペースへ圧縮
 * 3. 全角スペース: 半角スペースへ
 * 4. アンダースコア _ → スペース (互換性維持)
 * 5. Unicode 正規化 NFC
 * 6. ケース: 現状保持 (Case-sensitive)
 */
export const normalizeTitleToKey = (raw: string): string => {
	const normalized = raw
		.trim()
		.replace(/\s+/g, " ") // Normalize consecutive spaces to single space
		.replace(/　/g, " ") // Convert full-width space to half-width
		.replace(/_/g, " ") // Convert underscore to space (compatibility)
		.normalize("NFC"); // Unicode normalization
	return normalized;
};

/**
 * Enhanced cache with SessionStorage persistence
 * Default TTL: 5 minutes for better cross-page link sharing
 */
interface CacheEntry {
	pageId: string;
	timestamp: number;
}

const TTL_MS = 5 * 60 * 1000; // 5 minutes TTL (extended from 30 seconds)
const STORAGE_KEY = "unilink_cache";
const resolvedCache = new Map<string, CacheEntry>();

/**
 * Check if we're in a browser environment
 */
const isBrowser =
	typeof window !== "undefined" && typeof sessionStorage !== "undefined";

/**
 * Load cache from SessionStorage on initialization
 */
function loadCacheFromStorage(): void {
	if (!isBrowser) return;

	try {
		const stored = sessionStorage.getItem(STORAGE_KEY);
		if (!stored) return;

		const parsed = JSON.parse(stored) as Record<string, CacheEntry>;
		const now = Date.now();

		// Load only non-expired entries
		for (const [key, entry] of Object.entries(parsed)) {
			if (now - entry.timestamp <= TTL_MS) {
				resolvedCache.set(key, entry);
			}
		}
	} catch (error) {
		logger.warn({ error }, "[Cache] Failed to load from SessionStorage");
	}
}

/**
 * Save cache to SessionStorage
 */
function saveCacheToStorage(): void {
	if (!isBrowser) return;

	try {
		const obj: Record<string, CacheEntry> = {};
		for (const [key, entry] of resolvedCache.entries()) {
			obj[key] = entry;
		}
		sessionStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
	} catch (error) {
		logger.warn({ error }, "[Cache] Failed to save to SessionStorage");
	}
}

// Load cache on module initialization
loadCacheFromStorage();

/**
 * Get cached page ID if not expired
 * Checks both memory cache and SessionStorage
 * Automatically normalizes the key for consistent lookups
 */
export const getCachedPageId = (key: string): string | null => {
	// Normalize the key for consistent lookups
	const normalizedKey = normalizeTitleToKey(key);

	// Check memory cache first
	let entry = resolvedCache.get(normalizedKey);

	// If not in memory, try SessionStorage
	if (!entry && isBrowser) {
		try {
			const stored = sessionStorage.getItem(STORAGE_KEY);
			if (stored) {
				const parsed = JSON.parse(stored) as Record<string, CacheEntry>;
				entry = parsed[normalizedKey];
				if (entry) {
					// Restore to memory cache
					resolvedCache.set(normalizedKey, entry);
				}
			}
		} catch (error) {
			logger.warn({ error }, "[Cache] Failed to read from SessionStorage");
		}
	}

	if (!entry) return null;

	// Check expiration
	if (Date.now() - entry.timestamp > TTL_MS) {
		resolvedCache.delete(normalizedKey);
		saveCacheToStorage();
		logger.debug({ key: normalizedKey }, "[Cache] Entry expired and removed");
		return null;
	}

	logger.debug({ key: normalizedKey, pageId: entry.pageId }, "[Cache] Hit");
	return entry.pageId;
};

/**
 * Set cache entry with current timestamp
 * Persists to SessionStorage for cross-page sharing
 * Automatically normalizes the key for consistent storage
 */
export const setCachedPageId = (key: string, pageId: string): void => {
	// Normalize the key for consistent storage
	const normalizedKey = normalizeTitleToKey(key);

	resolvedCache.set(normalizedKey, {
		pageId,
		timestamp: Date.now(),
	});
	saveCacheToStorage();
	logger.debug({ key: normalizedKey, pageId }, "[Cache] Entry set");
};

/**
 * Bulk set multiple cache entries
 * Useful for preloading all page titles
 * Automatically normalizes all keys for consistent storage
 */
export const setCachedPageIds = (
	entries: Array<{ key: string; pageId: string }>,
): void => {
	const timestamp = Date.now();
	for (const { key, pageId } of entries) {
		// Normalize the key for consistent storage
		const normalizedKey = normalizeTitleToKey(key);
		resolvedCache.set(normalizedKey, { pageId, timestamp });
	}
	saveCacheToStorage();
};

/**
 * Get all cache entries
 * Useful for debugging and statistics
 */
export const getAllCacheEntries = (): Array<{
	key: string;
	pageId: string;
	age: number;
}> => {
	const now = Date.now();
	return Array.from(resolvedCache.entries()).map(([key, entry]) => ({
		key,
		pageId: entry.pageId,
		age: now - entry.timestamp,
	}));
};

/**
 * Clear all cache entries
 * Clears both memory and SessionStorage
 */
export const clearCache = (): void => {
	const size = resolvedCache.size;
	resolvedCache.clear();
	if (isBrowser) {
		try {
			sessionStorage.removeItem(STORAGE_KEY);
		} catch (error) {
			logger.warn({ error }, "[Cache] Failed to clear SessionStorage");
		}
	}
	logger.debug({ clearedEntries: size }, "[Cache] Cleared all entries");
};

/**
 * Mark属性の更新用ヘルパ
 */
export interface UnilinkAttrs {
	variant?: "bracket" | "tag";
	raw?: string;
	text?: string;
	key?: string;
	pageId?: string | null;
	href?: string;
	state?: "pending" | "exists" | "missing";
	exists?: boolean;
	created?: boolean;
	meta?: object;
}

/**
 * Transaction内でunilink markの属性を更新
 * Note: ProseMirror types are kept as 'any' due to complex type imports
 */
export const updateUnilinkAttrs = (
	tr: any,
	pos: number,
	attrs: UnilinkAttrs,
): void => {
	const mark = tr.doc
		.nodeAt(pos)
		?.marks?.find((m: any) => m.type.name === "unilink");
	if (!mark) {
		logger.debug(
			{ pos },
			"[updateUnilinkAttrs] No unilink mark found at position",
		);
		return;
	}

	// Merge new attributes with existing ones
	const newAttrs = { ...mark.attrs, ...attrs };

	// Sync exists flag with state
	if (attrs.state) {
		newAttrs.exists = attrs.state === "exists";
	}

	tr.setNodeMarkup(pos, null, newAttrs);
	logger.debug({ pos, attrs }, "[updateUnilinkAttrs] Mark attributes updated");
};
