"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";
import { Button } from "@/components/ui/button";

export interface BackLinkProps {
	/** テキストリンクとして表示するタイトル */
	title: string;
	/** ナビゲート先のパス。未指定ならブラウザバック */
	path?: string;
	/** 任意のクラス名を追加可能 */
	className?: string;
}

/**
 * 指定されたページに戻るか、pathがない場合直前のページに戻るリンクコンポーネント
 */
export function BackLink({ title, path, className = "" }: BackLinkProps) {
	const router = useRouter();
	const handleClick = React.useCallback(() => {
		if (path) {
			router.push(path);
		} else {
			router.back();
		}
	}, [path, router]);

	const content = (
		<>
			<ArrowLeft className="w-4 h-4 mr-1 transition-transform duration-200 hover:-translate-x-1" />
			{title}
		</>
	);

	if (path) {
		return (
			<div className="mb-6">
				<Button
					asChild
					variant="ghost"
					className={`inline-flex items-center ${className}`}
				>
					<Link href={path}>{content}</Link>
				</Button>
			</div>
		);
	}

	return (
		<div className="mb-6">
			<Button
				variant="ghost"
				onClick={handleClick}
				className={`inline-flex items-center ${className}`}
			>
				{content}
			</Button>
		</div>
	);
}
