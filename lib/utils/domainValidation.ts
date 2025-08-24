/**
 * ドメイン検証ユーティリティ
 * 画像URLのドメインが許可されているかチェックする共通関数
 *
 * @fileoverview 画像URLドメインの検証機能
 * @version 1.0.0
 * @author AI Assistant
 */

// 許可されているドメイン一覧（セキュリティ対策）
export const ALLOWED_IMAGE_DOMAINS = [
	"scrapbox.io", // Scrapbox
	"gyazo.com", // Gyazo
	"i.gyazo.com", // Gyazo画像直接URL
	"i.ytimg.com", // YouTubeサムネイル
] as const;

/**
 * 画像URLのドメインが許可されているかチェック
 *
 * @param url チェック対象のURL
 * @returns 許可されているドメインかどうか
 */
export function isAllowedImageDomain(url: string): boolean {
	try {
		const { hostname } = new URL(url);
		const isAllowed = ALLOWED_IMAGE_DOMAINS.includes(
			hostname as (typeof ALLOWED_IMAGE_DOMAINS)[number],
		);

		return isAllowed;
	} catch (error) {
		return false;
	}
}

/**
 * URLが有効な画像URLかどうかをチェック（ドメイン + 拡張子）
 *
 * @param url チェック対象のURL
 * @returns 有効な画像URLかどうか
 */
export function isValidImageUrl(url: string): boolean {
	if (!url || typeof url !== "string" || url.trim() === "") {
		return false;
	}

	if (!isAllowedImageDomain(url)) {
		return false;
	}

	const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];
	const urlLower = url.toLowerCase();

	// Gyazoの場合は拡張子チェックをスキップ（Gyazo独自形式のため）
	if (urlLower.includes("gyazo.com")) {
		return true;
	}

	return imageExtensions.some((ext) => urlLower.includes(ext));
}
