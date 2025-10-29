"use client";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

interface SortSelectProps {
	value: "relevance" | "updated" | "created";
	onChange: (value: "relevance" | "updated" | "created") => void;
}

export function SortSelect({ value, onChange }: SortSelectProps) {
	const handleChange = (newValue: string) => {
		if (
			newValue === "relevance" ||
			newValue === "updated" ||
			newValue === "created"
		) {
			onChange(newValue);
		}
	};

	return (
		<Select value={value} onValueChange={handleChange}>
			<SelectTrigger className="w-[180px]">
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="relevance">関連度順</SelectItem>
				<SelectItem value="updated">更新日順</SelectItem>
				<SelectItem value="created">作成日順</SelectItem>
			</SelectContent>
		</Select>
	);
}
