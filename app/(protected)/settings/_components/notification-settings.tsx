"use client";

import React from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface NotificationSettingsProps {
	notifications: { [key: string]: boolean };
	onChange: (notifications: { [key: string]: boolean }) => void;
}

export default function NotificationSettings({
	notifications,
	onChange,
}: NotificationSettingsProps) {
	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<Label htmlFor="email-notifications">メール通知</Label>
				<Switch
					id="email-notifications"
					checked={notifications.email ?? false}
					onCheckedChange={(checked) =>
						onChange({ ...notifications, email: checked })
					}
				/>
			</div>
			<div className="flex items-center justify-between">
				<Label htmlFor="push-notifications">プッシュ通知</Label>
				<Switch
					id="push-notifications"
					checked={notifications.push ?? false}
					onCheckedChange={(checked) =>
						onChange({ ...notifications, push: checked })
					}
				/>
			</div>
		</div>
	);
}
