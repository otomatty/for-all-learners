"use client";

import { useId } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface NotificationSettingsProps {
	notifications: { [key: string]: boolean };
	onChange: (notifications: { [key: string]: boolean }) => void;
}

export default function NotificationSettings({
	notifications,
	onChange,
}: NotificationSettingsProps) {
	const emailId = useId();
	const pushId = useId();

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<Label htmlFor={emailId}>メール通知</Label>
				<Switch
					id={emailId}
					checked={notifications.email ?? false}
					onCheckedChange={(checked) =>
						onChange({ ...notifications, email: checked })
					}
				/>
			</div>
			<div className="flex items-center justify-between">
				<Label htmlFor={pushId}>プッシュ通知</Label>
				<Switch
					id={pushId}
					checked={notifications.push ?? false}
					onCheckedChange={(checked) =>
						onChange({ ...notifications, push: checked })
					}
				/>
			</div>
		</div>
	);
}
