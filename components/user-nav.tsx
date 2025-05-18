"use client";

import { logout } from "@/app/_actions/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import type { Database } from "@/types/database.types";
import { Home, LogOut, Settings, Shield, UserRound, Mail } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

// Plan type
type Plan = Database["public"]["Tables"]["plans"]["Row"];

// Type for data fetched from the accounts table
type Account = Database["public"]["Tables"]["accounts"]["Row"];

export function UserNav({
	isAdmin,
	account,
	plan,
}: { isAdmin: boolean; account: Account; plan: Plan | null }) {
	const router = useRouter();
	const pathname = usePathname();
	const handleSignOut = async () => {
		await logout();
	};

	// プランラベルの算出
	const planLabel = plan?.name ?? "無料プラン";

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" className="flex items-center gap-2">
					<Avatar className="h-8 w-8">
						<AvatarImage
							src={account.avatar_url || "https://placehold.co/400x400"}
							alt={account.email || ""}
						/>
						<AvatarFallback>
							{account.email?.charAt(0).toUpperCase()}
						</AvatarFallback>
					</Avatar>
					<Badge variant="secondary">{planLabel}</Badge>
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
