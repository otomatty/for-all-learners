import { isAdmin } from "@/app/_actions/admin";
import { getHelpVideoAudioSetting } from "@/app/_actions/user_settings";
import { AppFooter } from "@/components/app-footer";
import { AuthHeader } from "@/components/auth-header";
import type React from "react";
import { version } from "../../package.json";
import { navItems } from "./navItems";

interface ProtectedLayoutProps {
	children: React.ReactNode;
}

export default async function ProtectedLayout({
	children,
}: ProtectedLayoutProps) {
	const admin = await isAdmin();
	const playAudio = await getHelpVideoAudioSetting();

	// アプリ名を指定します。必要に応じて変更してください。
	const appName = "For All Learners";

	return (
		<div className="flex flex-col min-h-screen">
			<AuthHeader
				version={version}
				isAdmin={admin}
				appNavItems={navItems}
				playAudio={playAudio}
			/>
			<main>{children}</main>
			<AppFooter version={version} appName={appName} />
		</div>
	);
}
