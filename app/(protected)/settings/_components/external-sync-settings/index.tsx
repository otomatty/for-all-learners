"use client";

import type { Database } from "@/types/database.types";
import type React from "react";
import CosenseSyncSettings, {
	type CosenseProject,
} from "./cosense-sync-settings";
import IntegrationCardShell from "./integration-card-shell";
import ServiceIntegrationDetails from "./service-integration-details";

// ユーザー設定の型
type UserSettings = Database["public"]["Tables"]["user_settings"]["Row"];

interface ExternalServicesProps {
	settings: UserSettings;
	setSettings: React.Dispatch<React.SetStateAction<UserSettings>>;
	isPending: boolean;
	initialProjects: CosenseProject[];
}

export default function ExternalServices({
	settings,
	setSettings,
	isPending,
	initialProjects,
}: ExternalServicesProps) {
	return (
		<>
			<h2 className="text-lg font-medium">外部サービス (External Services)</h2>
			<div className="mt-2 space-y-4">
				<IntegrationCardShell
					name="Cosense"
					description="Cosenseと連携することで、Cosenseのプロジェクトごとにページ情報を登録することができます"
					logoSrc="/images/cosense.webp"
					status={settings.cosense_sync_enabled ? "connected" : "disconnected"}
					isLoading={isPending}
					isConnected={settings.cosense_sync_enabled}
					onConnect={() =>
						setSettings({ ...settings, cosense_sync_enabled: true })
					}
					onDisconnect={() =>
						setSettings({ ...settings, cosense_sync_enabled: false })
					}
				>
					<CosenseSyncSettings
						initialProjects={initialProjects}
						initialEnabled={settings.cosense_sync_enabled as boolean}
						onEnabledChange={(value) =>
							setSettings({ ...settings, cosense_sync_enabled: value })
						}
					/>
				</IntegrationCardShell>

				<IntegrationCardShell
					name="Gyazo"
					description="Gyazoと連携することで、Gyazoのアルバム情報を管理できます"
					logoSrc="/images/gyazo.webp"
					status={settings.gyazo_sync_enabled ? "connected" : "disconnected"}
					isLoading={isPending}
					isConnected={settings.gyazo_sync_enabled}
					onConnect={() =>
						setSettings({ ...settings, gyazo_sync_enabled: true })
					}
					onDisconnect={() =>
						setSettings({ ...settings, gyazo_sync_enabled: false })
					}
				>
					<ServiceIntegrationDetails
						apiKeyRequired={false}
						apiKey=""
						onApiKeyChange={() => {}}
						syncOptions={[]}
						syncDirection=""
						onSyncDirectionChange={() => {}}
						syncFrequencyOptions={[]}
						syncFrequency=""
						onSyncFrequencyChange={() => {}}
						errorMessage=""
						hasChanges={false}
						isSaving={false}
						onSave={() => {}}
						onCancel={() => {}}
					/>
				</IntegrationCardShell>
				<IntegrationCardShell
					name="Quizlet"
					description="Quizletと連携することで、Quizletのセット情報を管理できます"
					logoSrc="/images/quizlet.webp"
					status={settings.quizlet_sync_enabled ? "connected" : "disconnected"}
					isLoading={isPending}
					isConnected={settings.quizlet_sync_enabled}
					onConnect={() =>
						setSettings({ ...settings, quizlet_sync_enabled: true })
					}
					onDisconnect={() =>
						setSettings({ ...settings, quizlet_sync_enabled: false })
					}
				>
					<ServiceIntegrationDetails
						apiKeyRequired={false}
						apiKey=""
						onApiKeyChange={() => {}}
						syncOptions={[]}
						syncDirection=""
						onSyncDirectionChange={() => {}}
						syncFrequencyOptions={[]}
						syncFrequency=""
						onSyncFrequencyChange={() => {}}
						errorMessage=""
						hasChanges={false}
						isSaving={false}
						onSave={() => {}}
						onCancel={() => {}}
					/>
				</IntegrationCardShell>
				<IntegrationCardShell
					name="Notion"
					description="Notionと連携することで、Notionのページ情報を登録することができます"
					logoSrc="/images/notion.webp"
					status={settings.notion_sync_enabled ? "connected" : "disconnected"}
					isLoading={isPending}
					isConnected={settings.notion_sync_enabled}
					onConnect={() =>
						setSettings({ ...settings, notion_sync_enabled: true })
					}
					onDisconnect={() =>
						setSettings({ ...settings, notion_sync_enabled: false })
					}
				>
					<ServiceIntegrationDetails
						apiKeyRequired={false}
						apiKey=""
						onApiKeyChange={() => {}}
						syncOptions={[]}
						syncDirection=""
						onSyncDirectionChange={() => {}}
						syncFrequencyOptions={[]}
						syncFrequency=""
						onSyncFrequencyChange={() => {}}
						errorMessage=""
						hasChanges={false}
						isSaving={false}
						onSave={() => {}}
						onCancel={() => {}}
					/>
				</IntegrationCardShell>
			</div>
		</>
	);
}
