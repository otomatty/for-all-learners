import { Container } from "@/components/layouts/container";
import { BackLink } from "@/components/ui/back-link";
import { getUserSettingsServer } from "@/lib/services/userSettingsService";
import { createClient } from "@/lib/supabase/server";
import UserSettingsForm from "./_components/user-settings-form";

type CosenseProject = {
	id: string;
	project_name: string;
	lastSyncedAt: string;
	page_count: number;
	accessible: boolean;
};

export default async function SettingsPage() {
	const supabase = await createClient();

	// 認証チェック
	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser();

	if (userError || !user) {
		throw new Error("Not authenticated");
	}

	// サーバーサイドでユーザー設定を取得（既存フックのロジックを再利用）
	const initialSettings = await getUserSettingsServer(user.id);

	// Cosenseプロジェクトを取得
	const { data: cosenseProjectsData } = await supabase
		.from("user_cosense_projects")
		.select(
			"id, cosense_projects(project_name), page_count, accessible, updated_at",
		)
		.eq("user_id", user.id);

	const initialProjects: CosenseProject[] =
		cosenseProjectsData?.map((item) => ({
			id: item.id,
			project_name:
				(item.cosense_projects as { project_name: string })?.project_name || "",
			lastSyncedAt: item.updated_at || new Date().toISOString(),
			page_count: item.page_count || 0,
			accessible: item.accessible ?? true,
		})) || [];

	return (
		<>
			<div className="mb-6 max-w-5xl mx-auto py-4 lg:py-8">
				<BackLink path="/dashboard" title="ホームに戻る" />
			</div>
			<Container>
				<h1 className="text-2xl font-bold mb-6">ユーザー設定</h1>
				{/* 設定フォームを表示 */}
				<UserSettingsForm
					initialSettings={initialSettings}
					initialProjects={initialProjects}
				/>
			</Container>
		</>
	);
}
