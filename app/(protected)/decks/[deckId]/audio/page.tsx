import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AudioPageClient } from "./_components/AudioPageClient";

// Generate static params for dynamic routes
// Phase 6: Next.js静的化とTauri統合 (Issue #157)
// Note: For static export, dynamic routes require generateStaticParams
// This page will be excluded from static export build if no params are generated
export async function generateStaticParams() {
	// Return empty array - this page will be dynamically rendered at runtime
	// For static export, Next.js will skip this page if no params are generated
	return [];
}

export default async function AudioPage({
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

	return <AudioPageClient deckId={deckId} userId={user.id} />;
}
