"use client";

import {
	Crown,
	Home,
	LogOut,
	Mail,
	Settings,
	Shield,
	Target,
	UserRound,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { logout } from "@/app/_actions/auth";
import { getUserGoalLimits } from "@/app/_actions/study_goals";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

// Plan type
type Plan = Database["public"]["Tables"]["plans"]["Row"];

// Type for data fetched from the accounts table
type Account = Database["public"]["Tables"]["accounts"]["Row"];

export function UserNav({
	isAdmin,
	account,
	plan,
}: {
	isAdmin: boolean;
	account: Account;
	plan: Plan | null;
}) {
	const router = useRouter();
	const pathname = usePathname();
	const [goalLimits, setGoalLimits] = useState<{
		currentCount: number;
		maxGoals: number;
		canAddMore: boolean;
		isPaid: boolean;
		remainingGoals: number;
	} | null>(null);

	const handleSignOut = async () => {
		await logout();
	};

	// 目標制限情報を取得する関数
	const fetchGoalLimits = useCallback(async () => {
		try {
			const supabase = createClient();
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (user) {
				const limits = await getUserGoalLimits(user.id);
				setGoalLimits(limits);
			}
		} catch (_error) {}
	}, []);

	// 初期読み込み時に制限情報を取得
	useEffect(() => {
		fetchGoalLimits();
	}, [fetchGoalLimits]);

	// プラン情報が変更された場合に再取得
	useEffect(() => {
		fetchGoalLimits();
	}, [fetchGoalLimits]);

	// プランラベルの算出：goalLimitsの結果を優先して使用
	const planLabel = goalLimits
		? goalLimits.isPaid
			? (plan?.name ?? "有料プラン")
			: "無料プラン"
		: (plan?.name ?? "無料プラン");
	const isPaid = goalLimits ? goalLimits.isPaid : plan !== null;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" className="flex items-center gap-2 p-0">
					<Avatar className="h-8 w-8">
						<AvatarImage
							src={account.avatar_url || "https://placehold.co/400x400"}
							alt={account.email || ""}
						/>
						<AvatarFallback>
							{account.email?.charAt(0).toUpperCase()}
						</AvatarFallback>
					</Avatar>
					<Badge
						variant={isPaid ? "default" : "secondary"}
						className="flex items-center gap-1"
					>
						{isPaid && <Crown className="w-3 h-3" />}
						{planLabel}
					</Badge>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-56" align="end" forceMount>
				<DropdownMenuLabel className="font-normal">
					<div className="flex flex-col space-y-1">
						<p className="text-sm font-medium leading-none">
							{account.full_name || account.email}
						</p>
						<p className="text-xs leading-none text-muted-foreground">
							{account.email}
						</p>
					</div>
				</DropdownMenuLabel>

				{/* プラン情報の詳細表示 */}
				<DropdownMenuLabel className="font-normal">
					<div className="space-y-2 pt-2">
						<div className="flex items-center justify-between text-xs">
							<span className="text-muted-foreground">プラン</span>
							<Badge
								variant={isPaid ? "default" : "secondary"}
								className="text-xs"
							>
								{isPaid && <Crown className="w-3 h-3 mr-1" />}
								{planLabel}
							</Badge>
						</div>

						{goalLimits && (
							<div className="flex items-center justify-between text-xs">
								<span className="text-muted-foreground flex items-center gap-1">
									<Target className="w-3 h-3" />
									目標
								</span>
								<span className="font-medium">
									{goalLimits.currentCount} / {goalLimits.maxGoals}
								</span>
							</div>
						)}

						{!isPaid && (
							<div className="text-xs text-muted-foreground">
								有料プランで目標10個まで設定可能
							</div>
						)}
					</div>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem onClick={() => router.push("/profile")}>
						<UserRound className="w-4 h-4" />
						プロフィール
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => router.push("/settings")}>
						<Settings className="w-4 h-4" />
						設定
					</DropdownMenuItem>
					{!isPaid && (
						<DropdownMenuItem onClick={() => router.push("/pricing")}>
							<Crown className="w-4 h-4 text-yellow-500" />
							<span className="text-yellow-600 font-medium">
								有料プランにアップグレード
							</span>
						</DropdownMenuItem>
					)}
					<DropdownMenuItem onClick={() => router.push("/inquiry")}>
						<Mail className="w-4 h-4" />
						お問い合わせ
					</DropdownMenuItem>
					{isAdmin && !pathname?.startsWith("/admin") && (
						<DropdownMenuItem onClick={() => router.push("/admin")}>
							<Shield className="w-4 h-4" />
							管理者画面へ
						</DropdownMenuItem>
					)}
					{isAdmin && pathname?.startsWith("/admin") && (
						<DropdownMenuItem onClick={() => router.push("/dashboard")}>
							<Home className="w-4 h-4" />
							アプリへ
						</DropdownMenuItem>
					)}
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={handleSignOut}>
					<LogOut className="w-4 h-4 text-destructive" />
					<span className="text-destructive">ログアウト</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
