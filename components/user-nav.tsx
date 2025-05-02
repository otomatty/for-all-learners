"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
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
import { LogOut, Settings, UserRound, Shield, Home } from "lucide-react";

// Type for data fetched from the accounts table
type Account = Database["public"]["Tables"]["accounts"]["Row"];

export function UserNav({ isAdmin }: { isAdmin: boolean }) {
	const router = useRouter();
	const pathname = usePathname();
	const supabase = createClient();
	const [account, setAccount] = useState<Account | null>(null);

	useEffect(() => {
		const fetchUserAndAccount = async () => {
			const { data: authData, error: authError } =
				await supabase.auth.getUser();
			if (authError || !authData?.user) {
				console.error("[UserNav][AuthError]", authError);
				return;
			}
			const userId = authData.user.id;
			const { data: accountData, error: accountError } = await supabase
				.from("accounts")
				.select("*")
				.eq("id", userId)
				.single();
			if (accountError) {
				console.error("[UserNav][AccountFetchError]", accountError);
				return;
			}
			setAccount(accountData);
		};

		fetchUserAndAccount();
	}, [supabase]);

	const handleSignOut = async () => {
		await supabase.auth.signOut();
		router.push("/");
	};

	if (!account) {
		return null;
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" className="relative h-8 w-8 rounded-full">
					<Avatar className="h-8 w-8">
						<AvatarImage
							src={account.avatar_url || "https://placehold.co/400x400"}
							alt={account.email || ""}
						/>
						<AvatarFallback>
							{account.email?.charAt(0).toUpperCase()}
						</AvatarFallback>
					</Avatar>
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
					<DropdownMenuItem onClick={() => router.push("/profiles")}>
						<UserRound className="w-4 h-4 mr-2" />
						プロフィール
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => router.push("/settings")}>
						<Settings className="w-4 h-4 mr-2" />
						設定
					</DropdownMenuItem>
					{isAdmin && !pathname?.startsWith("/admin") && (
						<DropdownMenuItem onClick={() => router.push("/admin")}>
							<Shield className="w-4 h-4 mr-2" />
							管理者画面へ
						</DropdownMenuItem>
					)}
					{isAdmin && pathname?.startsWith("/admin") && (
						<DropdownMenuItem onClick={() => router.push("/")}>
							<Home className="w-4 h-4 mr-2" />
							アプリへ
						</DropdownMenuItem>
					)}
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					onClick={handleSignOut}
					className="text-red-500 hover:bg-red-500 hover:text-white"
				>
					<LogOut className="w-4 h-4 mr-2" />
					ログアウト
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
