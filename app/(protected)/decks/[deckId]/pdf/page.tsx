import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PdfGeneratorPageClient } from "./_components/PdfGeneratorPageClient";

// Generate static params for dynamic routes
// Returns empty array to enable dynamic rendering for all routes
// Phase 6: Next.js静的化とTauri統合 (Issue #157)
export async function generateStaticParams() {
	return [];
}

export default async function PdfGeneratorPage({
	params,
}: {
	params: Promise<{ deckId: string }>;
}) {
	const { deckId } = await params;
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect("/auth/login");
	}

	return <PdfGeneratorPageClient deckId={deckId} userId={user.id} />;
}
