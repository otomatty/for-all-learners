"use client";

import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import React from "react";

interface ItemsPerPageSelectorProps {
	value: number;
	onChange: (value: number) => void;
}

const options = [10, 20, 50, 100];

export default function ItemsPerPageSelector({
	value,
	onChange,
}: ItemsPerPageSelectorProps) {
	return (
		<Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
			<SelectTrigger className="w-full">
				<SelectValue placeholder="件数を選択" />
			</SelectTrigger>
			<SelectContent>
				<SelectGroup>
					<SelectLabel>表示件数</SelectLabel>
					{options.map((opt) => (
						<SelectItem key={opt} value={String(opt)}>
							{opt} 件
						</SelectItem>
					))}
				</SelectGroup>
			</SelectContent>
		</Select>
	);
}
