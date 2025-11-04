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

interface LocaleSelectorProps {
	value: string;
	onChange: (value: string) => void;
}

const locales = [
	{ value: "en", label: "English" },
	{ value: "ja", label: "日本語" },
];

export default function LocaleSelector({
	value,
	onChange,
}: LocaleSelectorProps) {
	return (
		<div className="space-y-2">
			<Label htmlFor="locale-selector">言語</Label>
			<Select value={value} onValueChange={onChange}>
				<SelectTrigger className="w-full">
					<SelectValue placeholder="言語を選択" />
				</SelectTrigger>
				<SelectContent>
					<SelectGroup>
						<SelectLabel>言語</SelectLabel>
						{locales.map((locale) => (
							<SelectItem key={locale.value} value={locale.value}>
								{locale.label}
							</SelectItem>
						))}
					</SelectGroup>
				</SelectContent>
			</Select>
		</div>
	);
}
