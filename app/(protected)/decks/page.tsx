import { redirect } from "next/navigation";
import { Container } from "@/components/layouts/container";
import { BackLink } from "@/components/ui/back-link";
import { createClient } from "@/lib/supabase/server";
import { DecksPageClient } from "./_components/DecksPageClient";

export default async function DecksPage() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect("/auth/login");
	}

	return (
		<Container>
			<BackLink path="/dashboard" title="ホームに戻る" />
			<DecksPageClient userId={user.id} />
		</Container>
	);
}
