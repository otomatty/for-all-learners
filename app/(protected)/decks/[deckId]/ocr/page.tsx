import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OcrPageClient } from "./_components/OcrPageClient";

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
