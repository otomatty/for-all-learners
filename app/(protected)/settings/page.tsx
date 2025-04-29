import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardHeader } from "@/app/(protected)/dashboard/_components/dashboard-header";
import { DashboardShell } from "@/app/(protected)/dashboard/_components/dashboard-shell";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default async function SettingsPage() {
	const supabase = await createClient();
	const {
		data: { session },
	} = await supabase.auth.getSession();

	if (!session) {
		redirect("/auth/login");
	}

	// ユーザー情報を取得
	const { data: user } = await supabase.auth.getUser();

	return (
		<DashboardShell>
			<DashboardHeader heading="設定" text="アカウント設定を管理します" />
			<div className="grid gap-8">
				<Card>
					<CardHeader>
						<CardTitle>プロフィール</CardTitle>
						<CardDescription>アカウント情報を確認します</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="name">名前</Label>
							<Input
								id="name"
								value={user?.user?.user_metadata?.full_name || ""}
								disabled
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="email">メールアドレス</Label>
							<Input id="email" value={user?.user?.email || ""} disabled />
						</div>
						<div className="space-y-2">
							<Label htmlFor="provider">認証プロバイダー</Label>
							<Input id="provider" value="Google" disabled />
						</div>
					</CardContent>
				</Card>
			</div>
		</DashboardShell>
	);
}
