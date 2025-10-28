import { redirect } from "next/navigation";

/**
 * /pages/[id] ルートは /notes/default/[id] に統合されました
 * このページは自動的にリダイレクトされます
 */
export default async function PageDetail({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	// Await params for Next.js 14 sync dynamic APIs
	const { id: rawSlug } = await params;
	const slug = decodeURIComponent(rawSlug);

	// Redirect to /notes/default/[id] (each user's default note)
	redirect(`/notes/default/${encodeURIComponent(slug)}`);
}
