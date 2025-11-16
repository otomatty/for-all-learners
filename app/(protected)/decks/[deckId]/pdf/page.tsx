import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PdfGeneratorPageClient } from "./_components/PdfGeneratorPageClient";

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
