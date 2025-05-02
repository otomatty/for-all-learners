import React from "react";
import { getUserSettingsByUser } from "@/app/_actions/user_settings";

interface SettingsProps {
	userId: string;
}

/**
 * Settings component displays user-specific configuration.
 */
export default async function Settings({ userId }: SettingsProps) {
	// サーバーアクションを使ってユーザー設定を取得
	const settings = await getUserSettingsByUser(userId);
	return (
		<section className="space-y-2">
			<h2 className="text-lg font-semibold">設定</h2>
			<div className="grid grid-cols-2 gap-4 text-sm">
				<div>テーマ:</div>
				<div>{settings.theme}</div>
				<div>モード:</div>
				<div>{settings.mode}</div>
				<div>ロケール:</div>
				<div>{settings.locale}</div>
				<div>タイムゾーン:</div>
				<div>{settings.timezone}</div>
				<div>通知設定:</div>
				<div>
					<pre className="whitespace-pre-wrap text-xs">
						{JSON.stringify(settings.notifications)}
					</pre>
				</div>
				<div>1ページあたり件数:</div>
				<div>{settings.items_per_page}</div>
			</div>
		</section>
	);
}
