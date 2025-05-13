import { getPagesByUser } from "@/app/_actions/pages";
import { Container } from "@/components/container";
import { BackLink } from "@/components/ui/back-link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PagesPageClient from "./page-client";

export default async function PagesPage() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect("/auth/login");
	}

	const { totalCount } = await getPagesByUser(user.id);

	return (
		<Container className="max-w-7xl">
			<div className="mb-6">
				<BackLink path="/dashboard" title="ホームに戻る" />
			</div>
			<PagesPageClient userId={user.id} totalCount={totalCount} />
		</Container>
	);
}
