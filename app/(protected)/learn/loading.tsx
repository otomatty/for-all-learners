"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Container } from "@/components/container";
import {
	Card,
	CardHeader,
	CardContent,
	CardFooter,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const TIPS = [
	"単語帳は一度に10枚ずつ進めると定着率UP！",
	"復習は24時間以内が効率的よ。",
	"有料プランなら事前に問題を生成できます！",
];

export default function Loading() {
	const [tipIndex, setTipIndex] = useState(0);
	useEffect(() => {
		const id = setInterval(
			() => setTipIndex((i) => (i + 1) % TIPS.length),
			5000,
		);
		return () => clearInterval(id);
	}, []);

	return (
		<Container className="py-16 flex flex-col items-center space-y-12">
			{/* Loading placeholder */}
			<div className="flex flex-col items-center space-y-4">
				<Skeleton className="h-24 w-24 rounded-full animate-pulse" />
				<p className="text-2xl font-semibold">学習コンテンツを生成中…</p>
			</div>

			{/* Tips section */}
			<Card className="w-full max-w-lg mx-auto">
				<CardHeader>
					<CardTitle>TIP</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-center text-lg text-muted-foreground">
						{TIPS[tipIndex]}
					</p>
				</CardContent>
			</Card>

			{/* Upgrade prompt section */}
			<Card className="w-full max-w-lg mx-auto bg-blue-50 border border-blue-200">
				<CardHeader>
					<CardTitle>有料プランを検討しませんか？</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2">
					<p className="text-sm">• 問題を事前に生成</p>
					<p className="text-sm">• 無制限の学習</p>
					<p className="text-sm">• 追加の復習モード</p>
				</CardContent>
				<CardFooter className="justify-center">
					<Link href="/pricing">
						<Button size="lg">プランを確認</Button>
					</Link>
				</CardFooter>
			</Card>
		</Container>
	);
}
