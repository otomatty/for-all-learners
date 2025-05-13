"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { Database } from "@/types/database.types";
import Link from "next/link";

// Account row base type matching selected fields (omit created_at/updated_at)
type AccountRowBase = Omit<
	Database["public"]["Tables"]["accounts"]["Row"],
	"created_at" | "updated_at"
>;

// Extended user type including auth metadata
export type AccountWithAuth = AccountRowBase & {
	registered_at: string | null;
	last_sign_in_at: string | null;
};

interface UsersTableProps {
	users: AccountWithAuth[];
}

// Map gender codes to Japanese labels
const genderMap: Record<string, string> = {
	male: "男性",
	female: "女性",
	other: "その他",
	prefer_not_to_say: "回答しない",
};

// Get display label for gender
const getGenderLabel = (gender: string | null) => {
	if (!gender) return "-";
	return genderMap[gender] ?? "-";
};

// Calculate age from birthdate
const calcAge = (birthdate: string | null) => {
	if (!birthdate) return "-";
	const bd = new Date(birthdate);
	const now = new Date();
	let age = now.getFullYear() - bd.getFullYear();
	const m = now.getMonth() - bd.getMonth();
	if (m < 0 || (m === 0 && now.getDate() < bd.getDate())) {
		age--;
	}
	return `${age}歳`;
};

// Format ISO date string to YYYY年MM月DD日
const formatDate = (dateStr: string | null) => {
	if (!dateStr) return "-";
	const d = new Date(dateStr);
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}年${m}月${day}日`;
};

// Calculate relative time for last login
const relativeTime = (dateStr: string | null) => {
	if (!dateStr) return "-";
	const then = new Date(dateStr).getTime();
	const diffMs = Date.now() - then;
	const diffMin = Math.floor(diffMs / 1000 / 60);
	if (diffMin < 1) return "たった今";
	if (diffMin < 60) return `${diffMin}分前`;
	const diffH = Math.floor(diffMin / 60);
	if (diffH < 24) return `${diffH}時間前`;
	const diffD = Math.floor(diffH / 24);
	return `${diffD}日前`;
};

export function UsersTable({ users }: UsersTableProps) {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>
						<input type="checkbox" />
					</TableHead>
					<TableHead>ユーザー</TableHead>
					<TableHead>メール</TableHead>
					<TableHead>性別</TableHead>
					<TableHead>年齢</TableHead>
					<TableHead>登録日</TableHead>
					<TableHead>最終ログイン</TableHead>
					<TableHead>操作</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{users.map((user) => (
					<TableRow key={user.id}>
						<TableCell>
							<input type="checkbox" />
						</TableCell>
						<TableCell className="flex items-center space-x-2">
							<Avatar>
								{user.avatar_url ? (
									<AvatarImage
										src={user.avatar_url}
										alt={user.full_name ?? ""}
									/>
								) : null}
								<AvatarFallback>
									{user.full_name?.[0] ?? user.email?.[0] ?? "?"}
								</AvatarFallback>
							</Avatar>
							<Link
								href={`/admin/users/${user.id}`}
								className="text-blue-600 hover:underline"
							>
								{user.full_name ?? user.email}
							</Link>
						</TableCell>
						<TableCell>{user.email}</TableCell>
						<TableCell>{getGenderLabel(user.gender)}</TableCell>
						<TableCell>{calcAge(user.birthdate)}</TableCell>
						<TableCell>{formatDate(user.registered_at)}</TableCell>
						<TableCell>{relativeTime(user.last_sign_in_at)}</TableCell>
						<TableCell>
							<button type="button" className="text-blue-600 hover:underline">
								編集
							</button>
							<button
								type="button"
								className="text-red-600 hover:underline ml-2"
							>
								削除
							</button>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
