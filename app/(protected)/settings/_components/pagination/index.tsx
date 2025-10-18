"use client";

import type React from "react";
import type { Database } from "@/types/database.types";
import ItemsPerPageSelector from "./items-per-page-selector";

// ユーザー設定の型
type UserSettings = Database["public"]["Tables"]["user_settings"]["Row"];

interface PaginationSettingsProps {
	settings: UserSettings;
	setSettings: React.Dispatch<React.SetStateAction<UserSettings>>;
}

export default function PaginationSettings({
	settings,
	setSettings,
}: PaginationSettingsProps) {
	return (
		<ItemsPerPageSelector
			value={settings.items_per_page}
			onChange={(value) => setSettings({ ...settings, items_per_page: value })}
		/>
	);
}
