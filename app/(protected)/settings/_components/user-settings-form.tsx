"use client";

import React, { useState, useTransition } from "react";
import type { Database } from "@/types/database.types";
import { updateUserSettings } from "@/app/_actions/user_settings";
import { Button } from "@/components/ui/button";
import ThemeSelector from "./theme-selector";
import ModeToggle from "./mode-toggle";
import LocaleSelector from "./locale-selector";
import TimezoneSelector from "./timezone-selector";
import NotificationSettings from "./notification-settings";
import ItemsPerPageSelector from "./items-per-page-selector";

// ユーザー設定の型
type UserSettings = Database["public"]["Tables"]["user_settings"]["Row"];

interface UserSettingsFormProps {
	initialSettings: UserSettings;
}

export default function UserSettingsForm({
	initialSettings,
}: UserSettingsFormProps) {
	const [settings, setSettings] = useState<UserSettings>(initialSettings);
	const [isPending, startTransition] = useTransition();

	const handleSave = () => {
		startTransition(async () => {
			await updateUserSettings({
				theme: settings.theme,
				mode: settings.mode,
				locale: settings.locale,
				timezone: settings.timezone,
				notifications: settings.notifications,
				items_per_page: settings.items_per_page,
			});
			// TODO: トースト表示やリロードなどを追加
		});
	};

	return (
		<div className="space-y-6 p-4">
			<div>
				<h2 className="text-lg font-medium">外観設定 (Appearance)</h2>
				<div className="mt-2 space-y-4">
					<ThemeSelector
						value={settings.theme}
						onChange={(value) => setSettings({ ...settings, theme: value })}
					/>
					<ModeToggle
						checked={settings.mode === "dark"}
						onCheckedChange={(checked) =>
							setSettings({ ...settings, mode: checked ? "dark" : "light" })
						}
					/>
				</div>
			</div>
			<div>
				<h2 className="text-lg font-medium">全般設定 (General)</h2>
				<div className="mt-2 space-y-4">
					<LocaleSelector
						value={settings.locale}
						onChange={(value) => setSettings({ ...settings, locale: value })}
					/>
					<TimezoneSelector
						value={settings.timezone}
						onChange={(value) => setSettings({ ...settings, timezone: value })}
					/>
				</div>
			</div>
			<div>
				<h2 className="text-lg font-medium">通知設定 (Notifications)</h2>
				<NotificationSettings
					notifications={settings.notifications as Record<string, boolean>}
					onChange={(notifications) =>
						setSettings({ ...settings, notifications })
					}
				/>
			</div>
			<div>
				<h2 className="text-lg font-medium">ページあたり件数 (Pagination)</h2>
				<ItemsPerPageSelector
					value={settings.items_per_page}
					onChange={(value) =>
						setSettings({ ...settings, items_per_page: value })
					}
				/>
			</div>
			<Button onClick={handleSave} disabled={isPending}>
				保存
			</Button>
		</div>
	);
}
