import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OcrPageClient } from "./_components/OcrPageClient";

// Generate static params for dynamic routes
// Returns empty array to enable dynamic rendering for all routes
// Phase 6: Next.js静的化とTauri統合 (Issue #157)
export async function generateStaticParams() {
	return [];
}

export default async function OcrPage({
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

	return <OcrPageClient deckId={deckId} userId={user.id} />;
}
