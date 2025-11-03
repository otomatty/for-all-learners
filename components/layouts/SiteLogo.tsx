"use client";

import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface LogoProps {
	version?: string;
	/** ロゴのリンク先 */
	href?: string;
}

export function Logo({ version, href = "/" }: LogoProps) {
	const { resolvedTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	// マウントされるまではデフォルトのロゴを表示するか、何も表示しない
	// ここではハイドレーションエラーを避けるため、マウント後に正しいロゴを決定します
	if (!mounted) {
		// フォールバックとして一時的にデフォルトのロゴを表示 (または null を返す)
		// 既存の動作に近いのはダークロゴをデフォルトとすること
		return (
			<Link href={href} className="flex items-center space-x-2">
				<Image
					src={"/images/fal-logo-light.svg"} // デフォルトのロゴ
					alt="For All Learners"
					width={72}
					height={64}
				/>
				{version && (
					<span className="text-xs text-muted-foreground select-none">v{version}</span>
				)}
			</Link>
		);
	}

	const logoSrc =
		resolvedTheme === "dark"
			? "/images/fal-logo-dark.svg"
			: "/images/fal-logo-light.svg";

	return (
		<Link href={href} className="flex items-center space-x-2">
			<Image src={logoSrc} alt="For All Learners" width={72} height={64} />
			{version && (
				<span className="text-xs text-muted-foreground select-none">v{version}</span>
			)}
		</Link>
	);
}
