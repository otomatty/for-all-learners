"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
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
import type { User } from "@supabase/supabase-js";

export function UserNav() {
	const router = useRouter();
	const supabase = createClient();
	const [user, setUser] = useState<User | null>(null);

	useEffect(() => {
		const getUser = async () => {
			const { data } = await supabase.auth.getUser();
			if (data?.user) {
				setUser(data.user);
			}
		};

		getUser();
	}, [supabase]);

	const handleSignOut = async () => {
		await supabase.auth.signOut();
		router.push("/");
	};

	if (!user) {
		return null;
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" className="relative h-8 w-8 rounded-full">
					<Avatar className="h-8 w-8">
						<AvatarImage
							src={user.user_metadata?.avatar_url || "/placeholder.svg"}
							alt={user.email}
						/>
						<AvatarFallback>
							{user.email?.charAt(0).toUpperCase()}
						</AvatarFallback>
					</Avatar>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-56" align="end" forceMount>
				<DropdownMenuLabel className="font-normal">
					<div className="flex flex-col space-y-1">
						<p className="text-sm font-medium leading-none">
							{user.user_metadata?.full_name || user.email}
						</p>
						<p className="text-xs leading-none text-muted-foreground">
							{user.email}
						</p>
					</div>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem onClick={() => router.push("/settings")}>
						設定
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={handleSignOut}>ログアウト</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
