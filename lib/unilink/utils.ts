/**
 * Unified Link Mark utilities
 * 正規化、キャッシュ、状態更新ヘルパ
 */

/**
 * 正規化規則に従ってタイトルをキーに変換
 * 1. トリミング: 前後空白除去
 * 2. 連続空白: 単一スペースへ圧縮
 * 3. 全角スペース: 半角スペースへ
 * 4. アンダースコア _ → スペース (互換性維持)
 * 5. Unicode 正規化 NFC
 * 6. ケース: 現状保持 (Case-sensitive)
 */
export function normalizeTitleToKey(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, " ") // 連続空白を単一スペースに
    .replace(/　/g, " ") // 全角スペースを半角に
    .replace(/_/g, " ") // アンダースコアをスペースに (互換性)
    .normalize("NFC"); // Unicode正規化
}

/**
 * 30秒TTLメモリキャッシュ
 */
interface CacheEntry {
  pageId: string;
  timestamp: number;
}

const TTL_MS = 30000; // 30秒
const resolvedCache = new Map<string, CacheEntry>();

export function getCachedPageId(key: string): string | null {
  const entry = resolvedCache.get(key);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > TTL_MS) {
    resolvedCache.delete(key);
    return null;
  }

  return entry.pageId;
}

export function setCachedPageId(key: string, pageId: string): void {
  resolvedCache.set(key, {
    pageId,
    timestamp: Date.now(),
  });
}

export function clearCache(): void {
  resolvedCache.clear();
}

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
 */
export function updateUnilinkAttrs(
  tr: any, // ProseMirror Transaction
  pos: number,
  attrs: UnilinkAttrs
): void {
  const mark = tr.doc
    .nodeAt(pos)
    ?.marks?.find((m: any) => m.type.name === "unilink");
  if (!mark) return;

  // 新しい属性をマージ
  const newAttrs = { ...mark.attrs, ...attrs };

  // exists フラグを state と同期
  if (attrs.state) {
    newAttrs.exists = attrs.state === "exists";
  }

  tr.setNodeMarkup(pos, null, newAttrs);
}
