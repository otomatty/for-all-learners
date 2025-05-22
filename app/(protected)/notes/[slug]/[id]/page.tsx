import { getPagesByUser, getSharedPagesByUser } from "@/app/_actions/pages";
import { Container } from "@/components/container";
import { BackLink } from "@/components/ui/back-link";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";

import { transformPageLinks } from "@/lib/utils/transformPageLinks";
import type { JSONContent } from "@tiptap/core";
import { extractLinkData } from "@/lib/utils/linkUtils";

import EditPageForm from "../../../pages/[id]/_components/edit-page-form";

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

	const { data: relation, error: relError } = await supabase
		.from("user_cosense_projects")
		.select("cosense_projects(project_name)")
		.eq("user_id", user.id)
		.limit(1)
		.single();
	const cosenseProjectName = relation?.cosense_projects.project_name ?? null;

	const [myPages, sharedPageShares] = await Promise.all([
		getPagesByUser(user.id),
		getSharedPagesByUser(user.id),
	]);
	const sharedPages = sharedPageShares.map((share) => share.pages);
	const allPages = [...(myPages?.pages ?? []), ...(sharedPages ?? [])];
	const pagesMap = new Map<string, string>(
		allPages.map((p) => [p.title, p.id]),
	);

	if (!page.links_migrated) {
		const { outgoingIds } = extractLinkData(page.content_tiptap as JSONContent);
		if (outgoingIds.length > 0) {
			await supabase
				.from("page_page_links")
				.insert(
					outgoingIds.map((linked_id) => ({ page_id: page.id, linked_id })),
				);
		}
		await supabase
			.from("pages")
			.update({ links_migrated: true })
			.eq("id", page.id);
	}

	const decoratedDoc = transformPageLinks(
		page.content_tiptap as JSONContent,
		pagesMap,
	);

	const { missingNames } = extractLinkData(decoratedDoc);
	const missingLinks = missingNames;

	const { data: outRecs, error: outErr } = await supabase
		.from("page_page_links")
		.select("linked_id")
		.eq("page_id", page.id);
	if (outErr) throw outErr;
	const outgoingIds = outRecs.map((r) => r.linked_id);
	const { data: outgoingPages, error: fetchErr } = await supabase
		.from("pages")
		.select("id, title, content_tiptap, thumbnail_url")
		.in("id", outgoingIds as string[]);
	if (fetchErr) throw fetchErr;

	const { data: inRecs, error: inErr } = await supabase
		.from("page_page_links")
		.select("page_id")
		.eq("linked_id", page.id);
	if (inErr) throw inErr;
	const incomingIds = inRecs.map((r) => r.page_id);
	let incomingPages: Array<{
		id: string;
		title: string;
		content_tiptap: JSONContent;
		thumbnail_url: string | null;
	}> = [];
	if (incomingIds.length > 0) {
		const { data: fetchedIncomingPages, error: incomingErr } = await supabase
			.from("pages")
			.select("id, title, content_tiptap, thumbnail_url")
			.in("id", incomingIds as string[]);
		if (incomingErr) throw incomingErr;
		incomingPages = fetchedIncomingPages.map((p) => ({
			...p,
			content_tiptap: p.content_tiptap as JSONContent,
			thumbnail_url: p.thumbnail_url ?? null,
		}));
	}

	return (
		<Container>
			<BackLink title="ページ一覧に戻る" path={`/notes/${noteSlug}`} />
			<div className="flex gap-4">
				<div className="flex-1">
					<EditPageForm
						page={page}
						initialContent={decoratedDoc}
						cosenseProjectName={cosenseProjectName}
						outgoingPages={outgoingPages.map((p) => ({
							id: p.id,
							title: p.title,
							thumbnail_url: p.thumbnail_url ?? null,
							content_tiptap: p.content_tiptap as JSONContent,
						}))}
						incomingPages={incomingPages}
						missingLinks={missingLinks}
					/>
				</div>
			</div>
		</Container>
	);
}
