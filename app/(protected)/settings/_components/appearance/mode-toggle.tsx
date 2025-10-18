"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface ModeToggleProps {
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
}

export default function ModeToggle({
	checked,
	onCheckedChange,
}: ModeToggleProps) {
	return (
		<div className="flex items-center justify-between">
			<Label htmlFor="mode-toggle">ダークモード</Label>
			<Switch
				id="mode-toggle"
				checked={checked}
				onCheckedChange={onCheckedChange}
			/>
		</div>
	);
}
