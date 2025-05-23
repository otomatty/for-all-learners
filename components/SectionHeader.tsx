import React from "react";

interface SectionHeaderProps {
	label: string;
	title: string;
	description: string;
}

export function SectionHeader({
	label,
	title,
	description,
}: SectionHeaderProps) {
	return (
		<div className="flex flex-col items-center justify-center space-y-4 text-center">
			<div className="space-y-2">
				<div className="inline-block rounded-lg bg-primary px-3 py-1 text-sm text-primary-foreground">
					{label}
				</div>
				<h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
					{title}
				</h2>
				<p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
					{description}
				</p>
			</div>
		</div>
	);
}
