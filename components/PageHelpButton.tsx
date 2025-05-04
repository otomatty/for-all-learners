"use client";

import { usePathname } from "next/navigation";
import { ResponsiveDialog } from "@/components/responsive-dialog";
import { pageHelpConfig, type PageHelpConfig } from "@/lib/pageHelpConfig";

export function PageHelpButton() {
	const pathname = usePathname();
	// 動的ルート含め、セグメントごとにマッチング
	const matchedRoute = Object.keys(pageHelpConfig).find((route) => {
		// パスを / で分割して空文字を除去
		const routeParts = route.split("/").filter(Boolean);
		const pathParts = pathname.split("/").filter(Boolean);
		if (routeParts.length !== pathParts.length) return false;
		// 各セグメントを比較: [param] はワイルドカード扱い
		return routeParts.every((rp, idx) =>
			rp.startsWith("[") && rp.endsWith("]") ? true : rp === pathParts[idx],
		);
	});
	const config = matchedRoute ? pageHelpConfig[matchedRoute] : undefined;

	if (!config) return null;

	return (
		<ResponsiveDialog
			triggerButtonProps={{ variant: "outline", size: "sm" }}
			triggerText="ヘルプ"
			dialogTitle="操作ガイド"
		>
			<div className="space-y-4">
				{config.mode === "video" ? (
					<>
						<iframe
							title="ヘルプ動画"
							width="100%"
							height="600"
							src={`https://www.youtube.com/embed/${config.videoId}?autoplay=1&mute=1`}
							allow="autoplay; encrypted-media; gyroscope; accelerometer"
							allowFullScreen
							className="rounded-md"
						/>
						<p className="mt-2 text-sm text-center text-gray-400">
							※音声はデフォルトでオフになっています。必要に応じてオンにしてください。
						</p>
					</>
				) : (
					<ol className="list-decimal pl-4 space-y-2">
						{config.steps.map((step) => (
							<li key={step}>{step}</li>
						))}
					</ol>
				)}
			</div>
		</ResponsiveDialog>
	);
}
