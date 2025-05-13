"use client";

import type { Database } from "@/types/database.types";
import type React from "react";
import NotificationSettingsComponent from "./notification-settings";

// ユーザー設定の型
type UserSettings = Database["public"]["Tables"]["user_settings"]["Row"];

interface NotificationSettingsProps {
	settings: UserSettings;
	setSettings: React.Dispatch<React.SetStateAction<UserSettings>>;
}

export default function NotificationSettings({
	settings,
	setSettings,
}: NotificationSettingsProps) {
	return (
		<NotificationSettingsComponent
			notifications={settings.notifications as Record<string, boolean>}
			onChange={(notifications) => setSettings({ ...settings, notifications })}
		/>
	);
}
