import type { JSONContent } from "@tiptap/core";

/**
 * リンクマークを持つノード（ページリンクまたは通常リンク）を含む JSONContent ノード型
 */
export type LinkNode = JSONContent & {
	marks?: Array<{
		type: string;
		attrs?: { pageId?: string | null; pageName?: string };
	}>;
	content?: LinkNode[];
};

/**
 * extractLinkData の戻り値型
 */
export interface ExtractLinkDataResult {
	/** リンク先ページID一覧 */
	outgoingIds: string[];
	/** ページ未設定リンク名一覧 */
	missingNames: string[];
}

/**
 * JSONContent ドキュメントから outgoing link IDs と missing link names を抽出する
 */
export function extractLinkData(doc: JSONContent): ExtractLinkDataResult {
	const outgoingIds = new Set<string>();
	const missingNames = new Set<string>();

	function traverse(node: LinkNode) {
		for (const mark of node.marks ?? []) {
			if ((mark.type === "pageLink" || mark.type === "link") && mark.attrs) {
				const { pageId, pageName } = mark.attrs;
				if (pageId) {
					outgoingIds.add(pageId);
				} else if (pageName) {
					missingNames.add(pageName);
				}
			}
		}
		for (const child of node.content ?? []) {
			traverse(child as LinkNode);
		}
	}

	traverse(doc as LinkNode);
	return {
		outgoingIds: Array.from(outgoingIds),
		missingNames: Array.from(missingNames),
	};
}

/**
 * JSONContent ドキュメントから outgoing link IDs のみを抽出する
 */
export function extractOutgoingIds(doc: JSONContent): string[] {
	return extractLinkData(doc).outgoingIds;
}
