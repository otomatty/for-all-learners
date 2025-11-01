"use client";

import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

interface TimezoneSelectorProps {
	value: string;
	onChange: (value: string) => void;
}

const timezones = [
	{ value: "UTC", label: "UTC" },
	{ value: "Asia/Tokyo", label: "Asia/Tokyo" },
	{ value: "Europe/London", label: "Europe/London" },
	{ value: "Europe/Paris", label: "Europe/Paris" },
	{ value: "America/New_York", label: "America/New_York" },
	{ value: "America/Los_Angeles", label: "America/Los_Angeles" },
	{ value: "Australia/Sydney", label: "Australia/Sydney" },
];

export default function TimezoneSelector({
	value,
	onChange,
}: TimezoneSelectorProps) {
	return (
		<div className="space-y-2">
			<Label htmlFor="timezone-selector">タイムゾーン</Label>
			<Select value={value} onValueChange={onChange}>
				<SelectTrigger className="w-full">
					<SelectValue placeholder="タイムゾーンを選択" />
				</SelectTrigger>
				<SelectContent>
					<SelectGroup>
						<SelectLabel>タイムゾーン</SelectLabel>
						{timezones.map((tz) => (
							<SelectItem key={tz.value} value={tz.value}>
								{tz.label}
							</SelectItem>
						))}
					</SelectGroup>
				</SelectContent>
			</Select>
		</div>
	);
}
