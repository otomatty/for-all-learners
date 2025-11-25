"use client";

import { useQuery } from "@tanstack/react-query";
import { ActiveUsersCard } from "@/app/admin/_components/ActiveUsersCard";
import { NewUsersCard } from "@/app/admin/_components/NewUsersCard";
import { SupabaseStatusCard } from "@/app/admin/_components/SupabaseStatusCard";
import { VercelStatusCard } from "@/app/admin/_components/VercelStatusCard";
import type { AccountWithAuth } from "./UsersTable";
import { UsersTable } from "./UsersTable";

interface UsersResponse {
	users: AccountWithAuth[];
}

export function UsersPageClient() {
	const { data, isLoading, isError, error } = useQuery<UsersResponse, Error>({
		queryKey: ["admin", "users"],
		queryFn: async () => {
			const response = await fetch("/api/admin/users");
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "ユーザーの取得に失敗しました");
			}
			return response.json();
		},
	});

	if (isLoading) {
		return (
			<div>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
					<ActiveUsersCard />
					<NewUsersCard />
					<SupabaseStatusCard />
					<VercelStatusCard />
				</div>
				<div className="text-center py-10">読み込み中...</div>
			</div>
		);
	}

	if (isError) {
		return (
			<div>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
					<ActiveUsersCard />
					<NewUsersCard />
					<SupabaseStatusCard />
					<VercelStatusCard />
				</div>
				<div className="text-center py-10 text-destructive">
					{error?.message || "ユーザーの取得に失敗しました"}
				</div>
			</div>
		);
	}

	const users = data?.users || [];

	return (
		<div>
			{/* Metrics Cards */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
				<ActiveUsersCard />
				<NewUsersCard />
				<SupabaseStatusCard />
				<VercelStatusCard />
			</div>

			{/* Users Table */}
			<UsersTable users={users} />
		</div>
	);
}
