import { type VariantProps, cva } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const labelBadgeVariants = cva(
	"ml-1.5 inline-flex items-center rounded-sm border px-1.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
	{
		variants: {
			variant: {
				required: "border-transparent bg-destructive text-white",
				optional: "border-transparent bg-muted text-muted-foreground",
			},
		},
	},
);

export interface LabelBadgeProps
	extends React.HTMLAttributes<HTMLSpanElement>,
		VariantProps<typeof labelBadgeVariants> {}

function LabelBadge({ className, variant, ...props }: LabelBadgeProps) {
	return (
		<span
			className={cn(labelBadgeVariants({ variant }), className)}
			{...props}
		/>
	);
}

export { LabelBadge, labelBadgeVariants };
