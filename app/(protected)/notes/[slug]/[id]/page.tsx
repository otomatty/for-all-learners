import type { JSONContent } from "@tiptap/core";
import { notFound, redirect } from "next/navigation";
import { getAllUserPages } from "@/app/_actions/notes";
import { getLastPageVisit, recordPageVisit } from "@/app/_actions/page-visits";
import { getSharedPagesByUser } from "@/app/_actions/pages";
import { Container } from "@/components/layouts/container";
import EditPageForm from "@/components/pages/EditPageForm";
import { BackLink } from "@/components/ui/back-link";
import { createClient } from "@/lib/supabase/server";
import { extractLinkData } from "@/lib/utils/linkUtils";
import { transformPageLinks } from "@/lib/utils/transformPageLinks";

interface PageDetailProps {
	params: Promise<{ slug: string; id: string }>;
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

	const [myPages, sharedPageShares] = await Promise.all([
		getAllUserPages(user.id),
		getSharedPagesByUser(user.id),
	]);
	const sharedPages = sharedPageShares.map((share) => share.pages);
	const allPages = [...myPages, ...sharedPages];
	const pagesMap = new Map<string, string>(
		allPages.map((p) => [p.title, p.id]),
	);

	const decoratedDoc = transformPageLinks(
		page.content_tiptap as JSONContent,
		pagesMap,
	);

	const { missingNames } = extractLinkData(decoratedDoc);
	const missingLinks = missingNames;

	// --- ページ読み込み時にリンクグループを同期（既存ページ対応） ---
	const { syncLinkGroupsForPage } = await import(
		"@/app/_actions/syncLinkGroups"
	);
	await syncLinkGroupsForPage(page.id, page.content_tiptap as JSONContent);

	// --- ページ訪問履歴を記録（テロメア機能用） ---
	// 記録前に前回訪問時刻を取得（テロメア機能で使用）
	const lastVisitedAt = await getLastPageVisit(page.id);
	await recordPageVisit(page.id);

	// リンクグループを取得
	const { getLinkGroupsForPage } = await import("@/app/_actions/linkGroups");
	const { data: linkGroups } = await getLinkGroupsForPage(page.id);

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
