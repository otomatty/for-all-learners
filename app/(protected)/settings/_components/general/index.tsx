"use client";

import type React from "react";
import type { Database } from "@/types/database.types";
import LocaleSelector from "./locale-selector";
import TimezoneSelector from "./timezone-selector";

// ユーザー設定の型
type UserSettings = Database["public"]["Tables"]["user_settings"]["Row"];

interface GeneralSettingsProps {
	settings: UserSettings;
	setSettings: React.Dispatch<React.SetStateAction<UserSettings>>;
}

export default function GeneralSettings({
	settings,
	setSettings,
}: GeneralSettingsProps) {
	return (
		<>
			<LocaleSelector
				value={settings.locale}
				onChange={(value) => setSettings({ ...settings, locale: value })}
			/>
			<TimezoneSelector
				value={settings.timezone}
				onChange={(value) => setSettings({ ...settings, timezone: value })}
			/>
		</>
	);
}
