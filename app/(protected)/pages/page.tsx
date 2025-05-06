import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Container } from "@/components/container";
import PagesPageClient from "./page-client";
import { getPagesByUser } from "@/app/_actions/pages";

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
			<PagesPageClient userId={user.id} totalCount={totalCount} />
		</Container>
	);
}
