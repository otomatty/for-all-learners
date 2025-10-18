"use client";

import type React from "react";
import type { Database } from "@/types/database.types";
import ModeToggle from "./mode-toggle";
import ThemeSelector from "./theme-selector";

// user settings type
type UserSettings = Database["public"]["Tables"]["user_settings"]["Row"];

interface AppearanceSettingsProps {
	settings: UserSettings;
	setSettings: React.Dispatch<React.SetStateAction<UserSettings>>;
}

export default function AppearanceSettings({
	settings,
	setSettings,
}: AppearanceSettingsProps) {
	return (
		<>
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
		</>
	);
}
