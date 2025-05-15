import { getPagesByUser, getSharedPagesByUser } from "@/app/_actions/pages";
import { Container } from "@/components/container";
import { BackLink } from "@/components/ui/back-link";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";

import { transformPageLinks } from "@/lib/utils/transformPageLinks";
// Add imports for page link transformation and content viewer
import type { JSONContent } from "@tiptap/core";
// テキストノード用型定義と型ガード
type JSONTextNode = JSONContent & { type: "text"; text: string };
function isTextNode(node: JSONContent): node is JSONTextNode {
	const textNode = node as JSONTextNode;
	return textNode.type === "text" && typeof textNode.text === "string";
}
import EditPageForm from "./_components/edit-page-form";
import PageLinksGrid from "./_components/page-links-grid";
import RelatedCardsGrid from "./_components/related-cards-grid";

// JSONContent内のpageLinkおよびlegacy linkマーク用型定義
type ContentMark = {
	type: string;
	attrs?: { pageId?: string | null; pageName?: string; href?: string };
};

/**
 * JSONContentから内部リンクの存在／未設定リンクを抽出するヘルパー
 */
function extractLinkData(doc: JSONContent, pagesMap: Map<string, string>) {
	const outgoingIds = new Set<string>();
	const missingNames = new Set<string>();
	function traverse(node: JSONContent) {
		// Skip entire code blocks
		if (node.type === "codeBlock") {
			return;
		}
		if (node.marks) {
			for (const mark of node.marks as ContentMark[]) {
				// 新pageLinkマーク
				if (
					mark.type === "pageLink" &&
					mark.attrs &&
					mark.attrs.pageName !== undefined
				) {
					const { pageId, pageName } = mark.attrs;
					// 外部リンクは除外
					if (/^https?:\/\//.test(pageName)) continue;
					if (pageId) outgoingIds.add(pageId);
					else missingNames.add(pageName);
				}
				// レガシーlinkマーク
				else if (
					mark.type === "link" &&
					mark.attrs &&
					mark.attrs.pageId !== undefined
				) {
					// 外部リンクはテキストノードで判定して除外
					if (
						isTextNode(node) &&
						/^\[https?:\/\//.test((node as JSONTextNode).text)
					)
						continue;
					// インラインコード内のリンクは除外
					const hasCodeMark = (node.marks as ContentMark[]).some(
						(m) => m.type === "code",
					);
					if (hasCodeMark) continue;
					const pageId = mark.attrs.pageId;
					if (pageId) outgoingIds.add(pageId);
					else if (isTextNode(node)) {
						const textVal = (node as JSONTextNode).text;
						const match = textVal.match(/\[([^\]]+)\]/);
						const name = match ? match[1] : textVal;
						missingNames.add(name);
					}
				}
			}
		}
		if ("content" in node && Array.isArray(node.content)) {
			for (const child of node.content) {
				traverse(child as JSONContent);
			}
		}
		// Detect plain bracket syntax ([...]) in text nodes, excluding external links and inline code
		if (node.type === "text") {
			// skip inline code marks
			const hasCodeMark = (node.marks as ContentMark[] | undefined)?.some(
				(m) => m.type === "code",
			);
			if (!hasCodeMark) {
				const textVal = (node as JSONTextNode).text;
				const bracketRegex = /\[([^\[\]]+)\]/g;
				for (const match of textVal.matchAll(bracketRegex)) {
					const title = match[1];
					// skip external links
					if (/^https?:\/\//.test(title)) continue;
					const id = pagesMap.get(title);
					if (id !== undefined) {
						outgoingIds.add(id);
					} else {
						missingNames.add(title);
					}
				}
			}
		}
	}
	traverse(doc);
	return {
		outgoingIds: Array.from(outgoingIds),
		missingNames: Array.from(missingNames),
	};
}

export default async function PageDetail({
	params,
}: { params: Promise<{ id: string }> }) {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) {
		redirect("/auth/login");
	}

	// Await params for Next.js 14 sync dynamic APIs
	const { id: rawSlug } = await params;
	const slug = decodeURIComponent(rawSlug);
	// Fetch by ID or title
	const { data: pageData, error } = await supabase
		.from("pages")
		.select("*")
		.or(`id.eq.${slug},title.eq.${slug}`)
		.single();
	if (error) throw error;
	if (!pageData) {
		notFound();
	}
	// Use mutable page for potential re-fetch after content sync
	const page = pageData;

	// Fetch user's Cosense projectName for manual sync
	const { data: relation, error: relError } = await supabase
		.from("user_cosense_projects")
		.select("cosense_projects(project_name)")
		.eq("user_id", user.id)
		.limit(1)
		.single();
	const cosenseProjectName = relation?.cosense_projects.project_name ?? null;

	// Fetch pages and shared pages for mapping titles to IDs (after potential content sync)
	const [myPages, sharedPageShares] = await Promise.all([
		getPagesByUser(user.id),
		getSharedPagesByUser(user.id),
	]);
	const sharedPages = sharedPageShares.map((share) => share.pages);
	const allPages = [...(myPages?.pages ?? []), ...(sharedPages ?? [])];
	const pagesMap = new Map<string, string>(
		allPages.map((p) => [p.title, p.id]),
	);

	// Transform page content to embed pageId in pageLink marks
	const decoratedDoc = transformPageLinks(
		page.content_tiptap as JSONContent,
		pagesMap,
	);

	// --- 内部リンク一覧と未設定リンクを抽出 ---
	const { outgoingIds, missingNames } = extractLinkData(decoratedDoc, pagesMap);
	const { data: outgoingPages, error: fetchErr } = await supabase
		.from("pages")
		.select("id, title, content_tiptap, thumbnail_url")
		.in("id", outgoingIds as string[]);
	if (fetchErr) throw fetchErr;

	const nestedLinks: Record<string, string[]> = {};
	for (const p of outgoingPages) {
		const { outgoingIds: nested } = extractLinkData(
			p.content_tiptap as JSONContent,
			pagesMap,
		);
		nestedLinks[p.id] = nested;
	}
	const missingLinks = missingNames;

	return (
		<>
			<div className="max-w-5xl mx-auto py-4 lg:py-8">
				<BackLink title="ページ一覧に戻る" path="/pages" />
			</div>
			<Container className="max-w-5xl">
				<EditPageForm
					page={page}
					initialContent={decoratedDoc}
					cosenseProjectName={cosenseProjectName}
				/>
			</Container>
			<PageLinksGrid
				outgoingPages={outgoingPages.map((p) => ({
					id: p.id,
					title: p.title,
					thumbnail_url: p.thumbnail_url ?? null,
					content_tiptap: p.content_tiptap as JSONContent,
				}))}
				nestedLinks={nestedLinks}
				missingLinks={missingLinks}
			/>
			<RelatedCardsGrid pageId={page.id} />
		</>
	);
}
