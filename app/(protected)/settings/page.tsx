import React from "react";
import { getUserSettings } from "@/app/_actions/user_settings";
import { getUserCosenseProjects } from "@/app/_actions/cosense";
import UserSettingsForm from "./_components/user-settings-form";

export default async function SettingsPage() {
	// サーバーサイドでユーザー設定を取得
	const initialSettings = await getUserSettings();
	const initialProjects = await getUserCosenseProjects();

	return (
		<div className="max-w-3xl mx-auto py-8">
			<h1 className="text-2xl font-bold mb-6">ユーザー設定</h1>
			{/* 設定フォームを表示 */}
			<UserSettingsForm
				initialSettings={initialSettings}
				initialProjects={initialProjects}
			/>
		</div>
	);
}
