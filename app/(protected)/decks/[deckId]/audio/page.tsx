import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AudioPageClient } from "./_components/AudioPageClient";

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
