"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
		<span className="inline-flex items-center text-sm text-blue-600 hover:underline">
			<span className="mr-1">←</span>
			{title}
		</span>
	);

	if (path) {
		return (
			<Link href={path} className={className}>
				{content}
			</Link>
		);
	}

	return (
		<button type="button" onClick={handleClick} className={className}>
			{content}
		</button>
	);
}
