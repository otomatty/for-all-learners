import { getUserCosenseProjects } from "@/app/_actions/cosense";
import { getUserSettings } from "@/app/_actions/user_settings";
import { Container } from "@/components/layouts/container";
import { BackLink } from "@/components/ui/back-link";
import UserSettingsForm from "./_components/user-settings-form";

export default async function SettingsPage() {
	// サーバーサイドでユーザー設定を取得
	const initialSettings = await getUserSettings();
	const initialProjects = await getUserCosenseProjects();

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
