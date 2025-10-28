import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function GenerateCardsPage({
	params: paramsPromise,
}: {
	params: Promise<{ id: string }>;
}) {
	const params = await paramsPromise;

	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect("/auth/login");
	}

	// Redirect to the new location: /notes/default/{id}/generate-cards
	redirect(`/notes/default/${encodeURIComponent(params.id)}/generate-cards`);
}
