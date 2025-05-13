import { getUserCosenseProjects } from "@/app/_actions/cosense";
import { getUserSettings } from "@/app/_actions/user_settings";
import { Container } from "@/components/container";
import { BackLink } from "@/components/ui/back-link";
import React from "react";
import UserSettingsForm from "./_components/user-settings-form";

export default async function SettingsPage() {
	// サーバーサイドでユーザー設定を取得
	const initialSettings = await getUserSettings();
	const initialProjects = await getUserCosenseProjects();

	return (
		<Container className="max-w-3xl">
			<div className="mb-6">
				<BackLink path="/dashboard" title="ホームに戻る" />
			</div>
			<h1 className="text-2xl font-bold mb-6">ユーザー設定</h1>
			{/* 設定フォームを表示 */}
			<UserSettingsForm
				initialSettings={initialSettings}
				initialProjects={initialProjects}
			/>
		</Container>
	);
}
