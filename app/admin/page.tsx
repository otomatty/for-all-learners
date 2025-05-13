import { isAdmin } from "@/app/_actions/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ActiveUsersCard } from "./_components/ActiveUsersCard";
import { NewUsersCard } from "./_components/NewUsersCard";
import { SupabaseMetrics } from "./_components/SupabaseMetrics";
import { SupabaseStatusCard } from "./_components/SupabaseStatusCard";
import { VercelStatusCard } from "./_components/VercelStatusCard";
/**
 * 管理者用ダッシュボードトップページ
 */
export default async function AdminPage() {
	// 認証チェック
	const supabase = await createClient();
	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser();
	if (userError || !user) {
		redirect("/auth/login");
	}

	// 管理者判定
	const admin = await isAdmin();
	if (!admin) {
		redirect("/");
	}

	return (
		<div className="space-y-6">
			<h1 className="text-2xl font-bold">管理者ダッシュボード</h1>
			<div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
				<ActiveUsersCard />
				<NewUsersCard />
				<SupabaseStatusCard />
				<VercelStatusCard />
			</div>
			<SupabaseMetrics />
		</div>
	);
}
