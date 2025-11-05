"use client";

import { CheckCircle2, Key, Shield, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SignatureStats {
	totalPlugins: number;
	signedPlugins: number;
	unsignedPlugins: number;
	ed25519Plugins: number;
	rsaPlugins: number;
}

interface SignatureStatsCardsProps {
	stats: SignatureStats;
}

export function SignatureStatsCards({ stats }: SignatureStatsCardsProps) {
	const signedPercentage =
		stats.totalPlugins > 0
			? Math.round((stats.signedPlugins / stats.totalPlugins) * 100)
			: 0;

	return (
		<div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-5">
			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium">総プラグイン数</CardTitle>
					<Shield className="h-4 w-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold">{stats.totalPlugins}</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium">署名済み</CardTitle>
					<CheckCircle2 className="h-4 w-4 text-green-600" />
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold">{stats.signedPlugins}</div>
					<p className="text-xs text-muted-foreground">
						{signedPercentage}% が署名済み
					</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium">未署名</CardTitle>
					<XCircle className="h-4 w-4 text-red-600" />
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold">{stats.unsignedPlugins}</div>
					<p className="text-xs text-muted-foreground">
						{stats.totalPlugins > 0
							? Math.round((stats.unsignedPlugins / stats.totalPlugins) * 100)
							: 0}
						% が未署名
					</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium">Ed25519</CardTitle>
					<Key className="h-4 w-4 text-blue-600" />
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold">{stats.ed25519Plugins}</div>
					<p className="text-xs text-muted-foreground">Ed25519署名</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium">RSA</CardTitle>
					<Key className="h-4 w-4 text-purple-600" />
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold">{stats.rsaPlugins}</div>
					<p className="text-xs text-muted-foreground">RSA署名</p>
				</CardContent>
			</Card>
		</div>
	);
}
