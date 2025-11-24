import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
	const { data: adminData } = await supabase
		.from("admin_users")
		.select("role, is_active")
		.eq("user_id", user.id)
		.maybeSingle();

	const admin = Boolean(
		adminData?.is_active &&
			(adminData.role === "superadmin" || adminData.role === "admin"),
	);

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
