import { redirect } from "next/navigation";
import { Container } from "@/components/layouts/container";
import { BackLink } from "@/components/ui/back-link";
import { createClient } from "@/lib/supabase/server";
import { DecksPageClient } from "./_components/DecksPageClient";

export default async function DecksPage() {
	// 静的エクスポート時はクライアントコンポーネントを使用
	const isStaticExport = Boolean(process.env.ENABLE_STATIC_EXPORT);
	if (isStaticExport) {
		return (
			<Container>
				<BackLink path="/dashboard" title="ホームに戻る" />
				<DecksPageClient />
			</Container>
		);
	}

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
