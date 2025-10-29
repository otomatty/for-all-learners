"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TypeFilterProps {
	value: "all" | "card" | "page";
	onChange: (value: "all" | "card" | "page") => void;
}

export function TypeFilter({ value, onChange }: TypeFilterProps) {
	const handleChange = (newValue: string) => {
		if (newValue === "all" || newValue === "card" || newValue === "page") {
			onChange(newValue);
		}
	};

	return (
		<Tabs value={value} onValueChange={handleChange} className="w-auto">
			<TabsList>
				<TabsTrigger value="all">すべて</TabsTrigger>
				<TabsTrigger value="card">カード</TabsTrigger>
				<TabsTrigger value="page">ページ</TabsTrigger>
			</TabsList>
		</Tabs>
	);
}
