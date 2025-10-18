"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

interface GyazoSyncSettingsProps {
	initialEnabled: boolean;
	onEnabledChange?: (enabled: boolean) => void;
}

// クライアント側で使用するため、NEXT_PUBLIC_ プレフィックスの env を参照
const GYAZO_CLIENT_ID = process.env.NEXT_PUBLIC_GYAZO_CLIENT_ID;
const GYAZO_REDIRECT_URI = process.env.NEXT_PUBLIC_GYAZO_REDIRECT_URI;

export default function GyazoSyncSettings({
	initialEnabled,
	onEnabledChange,
}: GyazoSyncSettingsProps) {
	const [enabled, setEnabled] = useState<boolean>(initialEnabled);

	const handleConnect = () => {
		if (!GYAZO_CLIENT_ID || !GYAZO_REDIRECT_URI) {
			console.error(
				"Missing NEXT_PUBLIC_GYAZO_CLIENT_ID or NEXT_PUBLIC_GYAZO_REDIRECT_URI",
			);
			return;
		}
		const params = new URLSearchParams({
			client_id: GYAZO_CLIENT_ID,
			redirect_uri: GYAZO_REDIRECT_URI,
			response_type: "code",
		});
		window.location.href = `https://gyazo.com/oauth/authorize?${params.toString()}`;
	};

	const handleDisconnect = async () => {
		try {
			await fetch("/api/gyazo/disconnect", { method: "POST" });
			setEnabled(false);
			onEnabledChange?.(false);
		} catch (err) {
			console.error(err);
		}
	};

	const toggleEnabled = (value: boolean) => {
		setEnabled(value);
		onEnabledChange?.(value);
	};

	return (
		<div className="space-y-2">
			<div className="flex items-center">
				<Switch checked={enabled} onCheckedChange={toggleEnabled} />
				<span className="ml-2 text-sm">
					{enabled ? "Gyazo連携有効" : "Gyazo連携無効"}
				</span>
			</div>
			<div>
				{enabled ? (
					<Button variant="destructive" onClick={handleDisconnect}>
						連携解除
					</Button>
				) : (
					<Button onClick={handleConnect}>連携を開始</Button>
				)}
			</div>
		</div>
	);
}
