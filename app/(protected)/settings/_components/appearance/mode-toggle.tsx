"use client";

import { useId } from "react";
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
	const id = useId();

	return (
		<div className="flex items-center justify-between">
			<Label htmlFor={id}>ダークモード</Label>
			<Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
		</div>
	);
}
