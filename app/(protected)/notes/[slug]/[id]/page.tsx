import type { JSONContent } from "@tiptap/core";
import { notFound, redirect } from "next/navigation";
import { Container } from "@/components/layouts/container";
import EditPageForm from "@/components/pages/EditPageForm";
import { BackLink } from "@/components/ui/back-link";
import logger from "@/lib/logger";
import { deleteLinkOccurrencesByPage } from "@/lib/services/linkGroupService";
import { createClient } from "@/lib/supabase/server";
import { extractLinksFromContent } from "@/lib/utils/extractLinksFromContent";
import { extractLinkData } from "@/lib/utils/linkUtils";
import { transformPageLinks } from "@/lib/utils/transformPageLinks";
import type { LinkGroupForUI, LinkGroupPage } from "@/types/link-group";

interface PageDetailProps {
	params: Promise<{ slug: string; id: string }>;
}

// Generate static params for dynamic routes
// Returns empty array to enable dynamic rendering for all routes
// Phase 6: Next.js静的化とTauri統合 (Issue #157)
export async function generateStaticParams() {
	return [];
}

export default async function PageDetail({ params }: PageDetailProps) {
	const { slug: rawNoteSlug, id: rawRawId } = await params;
	const noteSlug = decodeURIComponent(rawNoteSlug);
	const id = decodeURIComponent(rawRawId);

	const supabase = await createClient();
	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser();
	if (userError || !user) {
		redirect("/auth/login");
	}

	const { data: pageData, error } = await supabase
		.from("pages")
		.select("*")
		.or(`id.eq.${id},title.eq.${id}`)
		.single();
	if (error) throw error;
	if (!pageData) {
		notFound();
	}
	const page = pageData;

	const { data: relation } = await supabase
		.from("user_cosense_projects")
		.select("cosense_projects(project_name)")
		.eq("user_id", user.id)
		.limit(1)
		.single();
	const cosenseProjectName = relation?.cosense_projects.project_name ?? null;

	// Get user pages (shared pages will be fetched in EditPageForm client component)
	const { data: myPages } = await supabase
		.from("pages")
		.select("id, title")
		.eq("user_id", user.id);
	const pagesMap = new Map<string, string>(
		(myPages || []).map((p) => [p.title, p.id]),
	);

	const decoratedDoc = transformPageLinks(
		page.content_tiptap as JSONContent,
		pagesMap,
	);

	const { missingNames } = extractLinkData(decoratedDoc);
	const missingLinks = missingNames;

	// --- ページ読み込み時にリンクグループを同期（既存ページ対応） ---
	try {
		const links = extractLinksFromContent(page.content_tiptap as JSONContent);
		await deleteLinkOccurrencesByPage(supabase, page.id);

		if (links.length > 0) {
			const linkGroupsToUpsert = links.map((link) => ({
				key: link.key,
				raw_text: link.text,
				page_id: link.pageId || null,
			}));

			const { data: upsertedGroups, error: upsertError } = await supabase
				.from("link_groups")
				.upsert(linkGroupsToUpsert, { onConflict: "key" })
				.select("id, key");

			if (!upsertError && upsertedGroups) {
				const groupIdMap = new Map(upsertedGroups.map((g) => [g.key, g.id]));

				const occurrencesToUpsert = links
					.map((link) => {
						const linkGroupId = groupIdMap.get(link.key);
						if (!linkGroupId) return null;
						return {
							link_group_id: linkGroupId,
							source_page_id: page.id,
							mark_id: link.markId,
							position: link.position ?? null,
						};
					})
					.filter((o): o is NonNullable<typeof o> => o !== null);

				if (occurrencesToUpsert.length > 0) {
					await supabase.from("link_occurrences").upsert(occurrencesToUpsert, {
						onConflict: "source_page_id,mark_id",
					});
				}
			}
		}
	} catch (error) {
		logger.error({ pageId: page.id, error }, "Failed to sync link groups");
	}

	// --- ページ訪問履歴を記録（テロメア機能用） ---
	// 記録前に前回訪問時刻を取得（テロメア機能で使用）
	const { data: lastVisitData } = await supabase
		.from("user_page_visits")
		.select("last_visited_at")
		.eq("user_id", user.id)
		.eq("page_id", page.id)
		.maybeSingle();
	const lastVisitedAt = lastVisitData?.last_visited_at
		? new Date(lastVisitData.last_visited_at)
		: null;

	// ページ訪問を記録
	const now = new Date().toISOString();
	await supabase.from("user_page_visits").upsert(
		{
			user_id: user.id,
			page_id: page.id,
			last_visited_at: now,
		},
		{
			onConflict: "user_id,page_id",
		},
	);

	// リンクグループを取得
	const links = extractLinksFromContent(page.content_tiptap as JSONContent);
	const linkKeys = links.map((link) => link.key);
	let linkGroups: LinkGroupForUI[] = [];

	if (linkKeys.length > 0) {
		const { data: groupsData } = await supabase
			.from("link_groups")
			.select(
				`
				id,
				key,
				raw_text,
				page_id,
				link_count,
				target_page:pages!link_groups_page_id_fkey(id, title, thumbnail_url, content_tiptap, updated_at),
				referencing_pages:link_occurrences!link_occurrences_link_group_id_fkey(
					source_page:pages!link_occurrences_source_page_id_fkey(id, title, thumbnail_url, content_tiptap, updated_at)
				)
			`,
			)
			.in("key", linkKeys)
			.gt("link_count", 1);

		if (groupsData) {
			linkGroups = groupsData.map((group) => ({
				key: group.key,
				displayText: group.raw_text,
				linkGroupId: group.id,
				pageId: group.page_id,
				linkCount: group.link_count ?? 0,
				targetPage: group.target_page
					? {
							id: group.target_page.id,
							title: group.target_page.title,
							thumbnail_url: group.target_page.thumbnail_url,
							content_tiptap:
								typeof group.target_page.content_tiptap === "object" &&
								group.target_page.content_tiptap !== null
									? (group.target_page.content_tiptap as Record<
											string,
											unknown
										>)
									: {},
							updated_at: group.target_page.updated_at ?? "",
						}
					: null,
				referencingPages: Array.isArray(group.referencing_pages)
					? group.referencing_pages
							.map((occ: { source_page: unknown }) => occ.source_page)
							.filter(
								(page): page is LinkGroupPage =>
									typeof page === "object" &&
									page !== null &&
									"id" in page &&
									"title" in page &&
									"content_tiptap" in page,
							)
							.map((page) => ({
								id: page.id,
								title: page.title,
								thumbnail_url: page.thumbnail_url ?? null,
								content_tiptap:
									typeof page.content_tiptap === "object" &&
									page.content_tiptap !== null
										? (page.content_tiptap as Record<string, unknown>)
										: {},
								updated_at: page.updated_at ?? "",
							}))
					: [],
			}));
		}
	}

	// リンクグループに含まれているページIDをセットに入れておく
	const inGroupPageIds = new Set<string>();
	for (const group of linkGroups || []) {
		if (group.targetPage) {
			inGroupPageIds.add(group.targetPage.id);
		}
		for (const refPage of group.referencingPages) {
			inGroupPageIds.add(refPage.id);
		}
	}

	// missingLinks からリンクグループに含まれるものを除外
	const missingLinksFiltered = missingLinks.filter((linkText) => {
		// リンクグループの displayText に含まれているか確認
		const isInGroup = linkGroups?.some(
			(group) => group.displayText === linkText,
		);
		return !isInGroup;
	});

	return (
		<Container>
			<BackLink title="ページ一覧に戻る" path={`/notes/${noteSlug}`} />
			<EditPageForm
				page={page}
				initialContent={decoratedDoc}
				cosenseProjectName={cosenseProjectName}
				missingLinks={missingLinksFiltered}
				linkGroups={linkGroups || []}
				lastVisitedAt={lastVisitedAt}
			/>
		</Container>
	);
}
